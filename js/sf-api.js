// Salesforce REST/Tooling API クライアント。chrome.cookies で sid を取得し、Authorization: Bearer で叩く。
// background.js / popup.js / devtools panel から共通利用するため module で公開。

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
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
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
    error: `userinfo unavailable: chatter=${r1.status}, oauth2=${r2.status}`,
  };
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
 *           datetime ISO 文字列を YYYY-MM-DD HH:mm に整形 (Excel で日時認識可能) */
export function recordsToCsv(records) {
  if (!records || !records.length) return "";
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
  // datetime ISO → YYYY-MM-DD HH:mm 整形 (文字列のみ対象、type は判定できないので regex)
  const isoRe = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;
  const dateOnlyRe = /^\d{4}-\d{2}-\d{2}$/;
  const formatValue = (v) => {
    const s = flatten(v);
    if (typeof v === "string") {
      const m = v.match(isoRe);
      if (m) return `${m[1]} ${m[2]}`;
      if (dateOnlyRe.test(v)) return v; // date 型はそのまま
    }
    return s;
  };
  // 全列クォート: null/数値/オブジェクト も全部 "..." で囲む
  const escAll = (v) => {
    const s = formatValue(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(",")];
  for (const r of records) {
    lines.push(headers.map((h) => escAll(r[h])).join(","));
  }
  return lines.join("\n");
}
