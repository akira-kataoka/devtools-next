// Salesforce REST/Tooling API クライアント。chrome.cookies で sid を取得し、Authorization: Bearer で叩く。
// background.js / popup.js / devtools panel から共通利用するため module で公開。
//
// v3.354.0 Phase 444: ファイルレベル documentation (コード意図 documentation 第 4 弾 / 第 2 ファイル目、Phase 443 design-docs.js に続く)
// ─────────────────────────────────────────
// 【公開 export 14 件】(Grep で実装と整合性検証済 — Phase 443 hallucination 教訓)
//   定数 2: SF_DOMAINS (6 ドメイン、line 9) / KEY_PREFIX_MAP (Key Prefix → API Name、line 240)
//   タブ判定 2: getActiveSfTab (3 段階フォールバック、line 22) / isSalesforceHost (endsWith 厳格判定、line 43)
//   ホスト正規化 1: toApiHost (Lightning → my.salesforce.com、line 52)
//   認証 2: getSessionId (chrome.cookies で sid 取得、line 68) / parseOrgIdFromSid (sid 先頭 15 文字、line 134)
//   API 呼出 5: sfFetch (汎用 REST/Tooling、Bearer 認証、line 142) / runSoql (SOQL 実行、line 171) /
//               getUserInfo (UserInfo API、line 179) / getCurrentUserDetails (UserInfo+User SOQL 合成、Phase 553) / getLimits (Limits API)
//   ID 変換 1: to18CharId (15→18 文字 ID 変換、line 222) / lookupPrefix (3 文字 prefix→object、line 252)
//   CSV 出力 1: recordsToCsv (SOQL 結果 → CSV、line 262)
//
// 【認証方式】Cookies permission + Bearer token (Cookie sid を Authorization header で再送、Phase 423 SECURITY.md 9 permissions で documentation)
//
// 【default API version】v62.0 (Winter '26、Phase 408 で documentation、panel.js / popup.js state.apiVersion と cross reference)
//
// 【SF_DOMAINS 6 vs host_permissions 9 vs content_scripts matches 7 の差】Phase 426/427 で SECURITY.md に documentation
//   ・SF_DOMAINS 6 = isSalesforceHost 厳格判定 (sid 取得・API 呼出の対象)
//   ・host_permissions 9 = content_script 注入用寛容判定 (salesforce-setup / -experience / cloudforce / sandbox.my も対象)
//   ・content_scripts matches 7 = 9 から cloudforce/sandbox.my を除外 (最小化)
//
// 【統一エラー format】sfFetch / runSoql は status / body を例外 message に含める (panel.js displayApiError 正規表現 `/HTTP \d{3}/` 互換)

// v3.464.0 Phase 554: SOQL 文字列リテラルエスケープを sf-format-helpers に集約 (escHtml 集約 Phase 552 と同じ DRY 方針)
// v3.475.0 Phase 565: ISO datetime → "YYYY-MM-DD HH:mm" 整形も集約 (formatSfDateTime)
// v3.513.0 Phase 603: safe JSON.parse も集約
import { escapeSoqlLiteral, formatSfDateTime, safeJsonParse, csvEscapeCell } from "./sf-format-helpers.js";

// v3.336.0 Phase 426: SF_DOMAINS は isSalesforceHost 判定用 6 ドメイン (endsWith マッチ)。
//                     manifest.json host_permissions 9 ドメイン (Phase 424 で documentation) との差は意図的:
//                     ・SF_DOMAINS は「SF 組織として認識する」厳格判定 — sid 取得・API 呼出の対象
//                     ・host_permissions は「content_script を注入する」寛容判定 — salesforce-setup / -experience も対象
//                     my.salesforce.com で sandbox.my.salesforce.com も endsWith マッチで判定される
export const SF_DOMAINS = [
  "salesforce.com",
  "force.com",
  "lightning.force.com",
  "my.salesforce.com",
  "cloudforce.com",
  "visualforce.com",
];

/**
 * 現在のアクティブタブから Salesforce ホストを推定する。
 * アクティブタブが SF でない場合は、現在のウィンドウ → 全ウィンドウの順で SF タブを探す。
 */
export async function getActiveSfTab() {
  const tryQueries = [
    { active: true, currentWindow: true },
    { currentWindow: true },
    {},
  ];
  for (const q of tryQueries) {
    const tabs = await chrome.tabs.query(q);
    for (const tab of tabs) {
      if (!tab || !tab.url) continue;
      try {
        const u = new URL(tab.url);
        if (isSalesforceHost(u.hostname)) {
          return { tab, url: u };
        }
      } catch {}
    }
  }
  return null;
}

export function isSalesforceHost(host) {
  return SF_DOMAINS.some((d) => host.endsWith(d));
}

/**
 * Lightning UI ドメインを REST API 用ホストに正規化する。
 * 例: foo.lightning.force.com → foo.my.salesforce.com
 * 既存の my.salesforce.com / *.salesforce.com / sandbox はそのまま。
 */
export function toApiHost(host) {
  if (host.endsWith(".lightning.force.com")) {
    return host.replace(/\.lightning\.force\.com$/, ".my.salesforce.com");
  }
  if (host.endsWith(".develop.lightning.force.com")) {
    return host.replace(/\.develop\.lightning\.force\.com$/, ".develop.my.salesforce.com");
  }
  return host;
}

/**
 * 与えられた host の sid Cookie を取得する。
 * - **my.salesforce.com 側を最優先** (こちらが REST API で 401 にならない API session)
 * - Lightning ドメイン (.lightning.force.com) の sid は Lightning UI 用で、REST に使うと 401 になるケースがある
 * - 同じ sid 名で複数 (path 違い、domain 違い) ある場合は、最長 domain を採用
 */
export async function getSessionId(host) {
  const apiHost = toApiHost(host);
  // 重要: my.salesforce.com を先に試す (REST 認可される側)
  const tryUrls = [
    `https://${apiHost}/`,    // ← API 用 sid (優先)
    `https://${host}/`,        // ← Lightning sid (フォールバック)
  ];

  // 1. URL ベース取得 (推奨)
  for (const url of tryUrls) {
    try {
      const cookies = await chrome.cookies.getAll({ url, name: "sid" });
      if (cookies && cookies.length) {
        // domain が my.salesforce.com 系のものを最優先 → 次にサブドメインが長いもの
        cookies.sort((a, b) => {
          const am = (a.domain || "").includes("my.salesforce.com") ? 1 : 0;
          const bm = (b.domain || "").includes("my.salesforce.com") ? 1 : 0;
          if (am !== bm) return bm - am;
          return (b.domain || "").length - (a.domain || "").length;
        });
        const pick = cookies[0];
        return { sid: pick.value, host: new URL(url).hostname, cookieDomain: pick.domain, via: "url:" + new URL(url).hostname };
      }
    } catch {}
  }

  // 2. ドメインベース取得 (フォールバック)
  for (const h of [apiHost, host]) {
    try {
      const cookies = await chrome.cookies.getAll({ name: "sid", domain: h });
      if (cookies && cookies.length) {
        cookies.sort((a, b) => (b.domain || "").length - (a.domain || "").length);
        const pick = cookies[0];
        return { sid: pick.value, host: h, cookieDomain: pick.domain, via: "domain" };
      }
    } catch {}
  }

  // 3. 親ドメインフォールバック (salesforce.com 全域)
  try {
    const cookies = await chrome.cookies.getAll({ name: "sid" });
    if (cookies && cookies.length) {
      // 起点ホストにマッチするもの + my.salesforce.com 優先
      const matched = cookies.filter((c) => {
        const d = (c.domain || "").replace(/^\./, "");
        return host.endsWith(d) || apiHost.endsWith(d);
      });
      const list = matched.length ? matched : cookies;
      list.sort((a, b) => {
        const am = (a.domain || "").includes("my.salesforce.com") ? 1 : 0;
        const bm = (b.domain || "").includes("my.salesforce.com") ? 1 : 0;
        if (am !== bm) return bm - am;
        return (b.domain || "").length - (a.domain || "").length;
      });
      const pick = list[0];
      return { sid: pick.value, host: pick.domain.replace(/^\./, ""), cookieDomain: pick.domain, via: "any" };
    }
  } catch {}

  return null;
}

/**
 * sid から OrgId(15桁) / UserId(15桁) を抽出する。sid フォーマット: "<OrgId15>!<UserSessionToken>"
 * UserId は別途 /services/oauth2/userinfo で取得する想定。ここでは OrgId のみ。
 */
export function parseOrgIdFromSid(sid) {
  if (!sid) return null;
  const idx = sid.indexOf("!");
  if (idx < 0) return null;
  return sid.substring(0, idx);
}

/** Bearer 付き fetch */
export async function sfFetch({ host, sid, path, method = "GET", body = null, headers = {} }) {
  const apiHost = toApiHost(host);
  const url = path.startsWith("http") ? path : `https://${apiHost}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${sid}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    },
    body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  // v3.513.0 Phase 603: safeJsonParse に集約。空文字は null、parse 失敗は raw text を保持 (HTML エラー page 等を caller に見せるため)
  const data = text ? safeJsonParse(text, text) : null;
  // 401 INVALID_SESSION_ID は親切メッセージにラップ
  if (res.status === 401) {
    return {
      ok: false, status: 401, data,
      raw: text,
      sessionInvalid: true,
      hint: "Salesforce にもう一度ログインし直し、popup の ⟳ ボタンで再取得してください。Lightning タブで開いている場合、my.salesforce.com の sid と Lightning の sid が別物で REST に使えないことがあります。",
    };
  }
  return { ok: res.ok, status: res.status, data, raw: text };
}

/** SOQL 実行。tooling=true で Tooling API を使う */
export async function runSoql({ host, sid, soql, apiVersion = "62.0", tooling = false }) {
  const base = tooling ? `/services/data/v${apiVersion}/tooling/query/` : `/services/data/v${apiVersion}/query/`;
  const url = `${base}?q=${encodeURIComponent(soql)}`;
  return sfFetch({ host, sid, path: url });
}

/** userinfo: Lightning sid Cookie は OAuth トークンではないため /oauth2/userinfo は 403 になりがち。
 *  代替として Chatter /users/me を試し、それも失敗したら最後に oauth2/userinfo にフォールバックする。 */
export async function getUserInfo({ host, sid, apiVersion = "62.0" }) {
  // 1st: Chatter REST (sid Cookie ベースでも認証通る)
  const r1 = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/chatter/users/me` });
  if (r1.ok && r1.data && r1.data.id) {
    // displayName が null の場合に firstName/lastName から組み立てる時、undefined を含まないようガード
    const fn = r1.data.firstName || "";
    const ln = r1.data.lastName || "";
    const fallbackName = (fn + " " + ln).trim();
    return {
      ok: true, status: 200,
      data: {
        user_id: r1.data.id,
        preferred_username: r1.data.username || "",
        email: r1.data.email || "",
        name: r1.data.displayName || fallbackName || r1.data.username || r1.data.id,
        organization_id: r1.data.companyName || "",
        via: "chatter",
      },
    };
  }
  // 2nd: OAuth userinfo (Connected App の access_token なら成功)
  const r2 = await sfFetch({ host, sid, path: `/services/oauth2/userinfo` });
  if (r2.ok && r2.data) {
    return { ok: true, status: 200, data: { ...r2.data, via: "oauth2" } };
  }
  // 3rd: 完全失敗時は 2 つのエラー情報をマージして返す
  return {
    ok: false,
    status: r1.status,
    data: r1.data,
    error: `ユーザ情報を取得できませんでした (chatter HTTP ${r1.status} / oauth2 HTTP ${r2.status})`,
  };
}

/**
 * v3.463.0 Phase 553: 現在ログイン中ユーザーの「詳細」を取得する。
 * getUserInfo (Chatter /users/me) で user_id を確定 → User SObject を SOQL で引いて
 * プロファイル / ロール / 最終ログイン / タイムゾーン等のリッチな属性を付与する。
 *
 * ヘッダーのリアルタイム表示用。SOQL が失敗 (権限不足等) しても userInfo だけで
 * 表示できるよう、userRecord は null 許容で返す (degrade gracefully)。
 *
 * @returns {{ ok: boolean, status: number, userInfo: object|null, userRecord: object|null, error?: string }}
 */
export async function getCurrentUserDetails({ host, sid, apiVersion = "62.0" }) {
  const ui = await getUserInfo({ host, sid, apiVersion });
  if (!ui.ok || !ui.data || !ui.data.user_id) {
    return { ok: false, status: ui.status, userInfo: ui.data || null, userRecord: null, error: ui.error };
  }
  const uid = escapeSoqlLiteral(ui.data.user_id); // SOQL インジェクション防御 (Id は本来英数字のみだが正準エスケープで統一)
  const soql =
    "SELECT Id, Name, Username, Email, Alias, IsActive, LastLoginDate, " +
    "TimeZoneSidKey, LanguageLocaleKey, UserType, Profile.Name, UserRole.Name " +
    `FROM User WHERE Id = '${uid}'`;
  let userRecord = null;
  try {
    const r = await runSoql({ host, sid, soql, apiVersion });
    if (r.ok && r.data && Array.isArray(r.data.records) && r.data.records.length) {
      userRecord = r.data.records[0];
    }
  } catch (_) { /* SOQL 失敗は userInfo のみで継続 */ }
  return { ok: true, status: 200, userInfo: ui.data, userRecord };
}

/** /limits */
export async function getLimits({ host, sid, apiVersion = "62.0" }) {
  return sfFetch({ host, sid, path: `/services/data/v${apiVersion}/limits` });
}

/**
 * Salesforce 15→18桁 ID 変換。
 * 末尾 3 文字を 5 ビットチャンクの大文字判定から導出する標準アルゴリズム。
 */
export function to18CharId(id15) {
  if (!id15 || id15.length !== 15) return null;
  const suffix = [];
  for (let i = 0; i < 3; i++) {
    let bits = 0;
    for (let j = 0; j < 5; j++) {
      const c = id15.charAt(i * 5 + j);
      if (c >= "A" && c <= "Z") bits |= (1 << j);
    }
    suffix.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ012345".charAt(bits));
  }
  return id15 + suffix.join("");
}

/**
 * 先頭 3 文字 (Key Prefix) から代表 Object 名を引く簡易マップ。
 * よく使う標準オブジェクト中心。カスタムは "Unknown (Custom?)" として返す。
 */
export const KEY_PREFIX_MAP = {
  "001": "Account", "003": "Contact", "005": "User", "006": "Opportunity",
  "00D": "Organization", "00E": "UserRole", "00G": "Group", "00I": "Partner",
  "00P": "Attachment", "00Q": "Lead", "00T": "Task", "00U": "Event",
  "00X": "EmailTemplate", "00e": "PermissionSetGroup", "0PS": "PermissionSet",
  "012": "RecordType", "017": "History", "01p": "ApexClass", "01q": "ApexTrigger",
  "068": "ContentDocumentLink", "069": "ContentDocument", "06A": "ContentVersion",
  "0D5": "FeedItem", "0DM": "Group", "0EP": "Site", "0H4": "Network",
  "500": "Case", "701": "Campaign", "800": "Contract", "801": "Order",
  "802": "Order Item",  "a00": "Custom Object (a*)", "ka0": "Knowledge Article",
};

export function lookupPrefix(idStr) {
  if (!idStr) return null;
  const prefix = idStr.substring(0, 3);
  return KEY_PREFIX_MAP[prefix] || "Custom or Unknown";
}

/** CSV エクスポート（SOQL 結果 records 配列を想定）
 *  全列をダブルクォートで囲む統一フォーマット (Limits/Export/Design 各 CSV と整合)
 *  v1.93.0+: ネストリレーション (attributes 持ち) を平坦化 (Name [Id] 形式)、
 *           datetime ISO 文字列を YYYY-MM-DD HH:mm に整形 (Excel で日時認識可能)
 *  v3.474.0 Phase 564: opts.excelBom=true で UTF-8 BOM (﻿) を先頭付与。
 *                      Excel が UTF-8 を Shift_JIS として誤認して日本語が文字化け
 *                      する問題対策。default false で後方互換 (既存テスト不変)。
 *                      panel.js では 4 箇所中 1 箇所だけ手書きで BOM 結合していたが、
 *                      他 3 箇所は文字化けしていた → このオプションで統一する。
 *  @param {Array} records - SOQL 結果の records 配列
 *  @param {object} [opts]
 *  @param {boolean} [opts.excelBom=false] - true で UTF-8 BOM を先頭に付与 */
export function recordsToCsv(records, opts = {}) {
  if (!records || !records.length) return "";
  const bom = opts.excelBom ? "﻿" : "";
  const cols = new Set();
  records.forEach((r) => Object.keys(r).forEach((k) => k !== "attributes" && cols.add(k)));
  const headers = Array.from(cols);
  // ネストオブジェクト平坦化 (panel.js stringify と同パターン)
  const flatten = (v) => {
    if (v == null) return "";
    if (typeof v !== "object") return String(v);
    if (v.attributes && typeof v.attributes === "object") {
      const fields = Object.keys(v).filter((k) => k !== "attributes");
      if (v.records && Array.isArray(v.records)) return `[${v.records.length} 件のサブクエリ]`;
      const prefer = ["Name", "Subject", "Title", "DeveloperName", "MasterLabel", "FullName"];
      for (const p of prefer) {
        if (fields.includes(p) && v[p] != null) {
          const id = fields.includes("Id") && v.Id ? ` [${String(v.Id).substring(0, 18)}]` : "";
          return `${flatten(v[p])}${id}`;
        }
      }
      if (fields.length) return `${fields[0]}=${flatten(v[fields[0]])}`;
      return "{}";
    }
    return JSON.stringify(v);
  };
  // v3.475.0 Phase 565: ISO datetime 整形を formatSfDateTime (pure) に集約 (5 箇所重複→1 箇所)
  //   旧 isoRe (正則 + dateOnly): date-only は match しないため formatSfDateTime が元文字列を返す挙動と等価
  const formatValue = (v) => typeof v === "string" ? formatSfDateTime(v) : flatten(v);
  // v3.514.0 Phase 604: 全列クォートを csvEscapeCell({alwaysQuote:true}) に集約 (panel.js/design-docs.js と共通化)
  const escAll = (v) => csvEscapeCell(formatValue(v), { alwaysQuote: true });
  const lines = [headers.map((h) => csvEscapeCell(h, { alwaysQuote: true })).join(",")];
  for (const r of records) {
    lines.push(headers.map((h) => escAll(r[h])).join(","));
  }
  return bom + lines.join("\n");
}
