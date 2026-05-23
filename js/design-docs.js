// 設計書ジェネレータ。Salesforce のメタデータを REST/Tooling API から集めて
// Markdown / HTML / CSV / TSV / Mermaid で出力する。
//
// v3.353.0 Phase 443: ファイルレベル documentation (コード意図 documentation 第 4 弾)
// ─────────────────────────────────────────
// 【提供する設計書数】21 種類 (Phase 90-93 で 22 種実装 → Phase 240 で orgSnapshot 統合 → Phase 318 で 21 種確定)
//   実装一覧は line 181-201 の switch (type) case 文を出典とする (21 case = 21 種類):
//   Object 系 5: objectDef / fieldSetList / recordTypeList / customSettingList / validationRuleList
//   セキュリティ系 7: profileList / permsetList / profileDetail / fieldPermMatrix / objectPermMatrix / flsReport / accessControl
//   自動化系 6: flowList / flowDetail / apexClassList / apexTriggerList / apexDetail / lwcDetail
//   UI/UX 系 1: appList
//   設計図系 1: erDiagram (Mermaid)
//   統合系 1: orgSnapshot (組織全体スナップショット、Phase 240 で追加)
//
// 【出力形式】Markdown / HTML (panel/tool 表示) / CSV (Excel) / TSV (clipboard) / Mermaid (erDiagram) — formatOutput() で変換 (line 2630)
//
// 【統一表紙】各設計書冒頭に「タイトル/対象/組織/作成者/日時/Ver/改訂」 (Phase 90-93 で導入、プロジェクト成果物品質)
//
// 【統一エラー format】HTTP ステータス必須 (`HTTP NNN ctx: body`) — panel.js displayApiError の `/HTTP \d{3}/` 正規表現互換
//
// 【設計書一覧の出典】generateDesign() の switch (type) 分岐 (line 181-201) — case 数 = 21 種類確定

import { sfFetch, runSoql } from "./sf-api.js";

/**
 * 各設計書タイプの定義。
 * fetch: { host, sid, apiVersion, obj? } を受け取り { title, rows[], note? } を返す。
 * rows: ヘッダ配列 + データ行 (オブジェクト配列)。
 */

// 統一エラー: HTTP ステータスを必ず先頭に付ける形式で投げる
// panel.js の displayApiError 互換正規表現 (/HTTP \d{3}/) に必ずマッチさせる
function apiError(ctx, response) {
  const status = response && response.status != null ? response.status : "?";
  const data = response && response.data ? response.data : null;
  // SF エラー配列 [{errorCode, message}] を最優先 (人間可読)
  let body = "";
  if (Array.isArray(data) && data[0] && (data[0].errorCode || data[0].message)) {
    body = `${data[0].errorCode || ""} ${data[0].message || ""}`.trim();
  } else if (data && typeof data === "object" && (data.error || data.message)) {
    body = data.error_description || data.error || data.message;
  } else if (data) {
    // フォールバック: JSON 全体を 240 文字で切る + 切れた目印
    const full = typeof data === "string" ? data : JSON.stringify(data);
    body = full.length > 240 ? full.substring(0, 240) + "…(切詰)" : full;
  }
  return new Error(`HTTP ${status} ${ctx}: ${body}`);
}

// 統一: 入力必須チェック
function requireInput(value, hint) {
  if (!value || !String(value).trim()) {
    throw new Error(`${hint} を入力してください`);
  }
}

// 数値を 3 桁区切りで整形 ("12345" → "12,345")。null/undefined は空文字に
export function fmtNum(n) {
  if (n == null || n === "") return "";
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return String(n);
  return num.toLocaleString("ja-JP");
}

// バイト数を人間可読サイズに整形 (1023 → "1,023 B" / 12345 → "12.1 KB" / 1234567 → "1.18 MB")
export function fmtBytes(n) {
  if (n == null || n === "") return "";
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return String(n);
  if (v < 1024) return `${fmtNum(v)} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  if (v < 1024 * 1024 * 1024) return `${(v / 1024 / 1024).toFixed(2)} MB`;
  return `${(v / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// 長文文字列を指定文字数で切り詰める ("ABC...XYZ" → "ABC... [+N 文字省略]")
// 設計書の「説明」など長文セルで一目可読性を上げるため
export function fmtTrunc(s, max = 200) {
  if (s == null) return "";
  const str = String(s);
  if (str.length <= max) return str;
  return str.substring(0, max) + ` … [+${fmtNum(str.length - max)} 文字省略]`;
}

// パーセント表示 (0.123 → "12.3%" / 0.456 → "45.6%")。null/undefined は空文字
export function fmtPercent(ratio, decimals = 1) {
  if (ratio == null || ratio === "") return "";
  const v = typeof ratio === "number" ? ratio : Number(ratio);
  if (!Number.isFinite(v)) return String(ratio);
  return `${(v * 100).toFixed(decimals)}%`;
}

// v2.98.0: Salesforce フィールドタイプを日本語に変換 (ProfileReader 風表示)
// reference は参照先オブジェクト名 (referenceTo[0]) を引数で渡す
export const FIELD_TYPE_JA = {
  "string": "文字列",
  "textarea": "テキストエリア",
  "boolean": "チェックボックス",
  "id": "ID",
  "reference": "参照関係",
  "currency": "通貨",
  "double": "数値",
  "int": "数値 (整数)",
  "long": "数値 (整数)",
  "percent": "パーセント",
  "date": "日付",
  "datetime": "日時",
  "time": "時刻",
  "email": "メール",
  "phone": "電話",
  "url": "URL",
  "picklist": "選択リスト",
  "multipicklist": "選択リスト (複数選択)",
  "combobox": "コンボボックス",
  "address": "住所",
  "encryptedstring": "暗号化テキスト",
  "base64": "Base64",
  "anyType": "任意型",
  "complexvalue": "複合値",
  "location": "地理位置情報",
  "calculated": "数式",
  "junctionidlist": "ジャンクション ID リスト",
};
export function fieldTypeJa(type, referenceTo) {
  if (!type) return "";
  if (type === "reference" && referenceTo) {
    return `参照関係(${referenceTo})`;
  }
  // Salesforce Name 複合項目の特殊ケース (label が "名前" の string 型)
  return FIELD_TYPE_JA[type] || type;
}

// v2.98.0: 設計書の表紙セクション共通生成 (プロジェクト成果物品質)
// 全設計書冒頭に挿入する標準セクション
// v3.37.0: 設計書生成中の組織コンテキスト (orgId / envLabel) — 21 builder への引数追加を避けるため module-level に保持 (Phase 318-319 で実装数 21 を確認、Phase 363 でコメント表記訂正)
let _designCtx = { orgId: null, envLabel: null };

function makeCoverSection(opts) {
  // opts: { docTitle, target, orgHost, userName, version, revision, docId, classification }
  // v3.28.0: 業務文書として管理しやすいよう、文書管理 ID・機密区分・利用目的・配布対象を追加
  // v3.37.0: 対象組織 表示を改善 — ホスト名 + 環境バッジ + 組織 ID を分けて記載 (_designCtx から自動取得)
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  // ホスト名から組織識別子 (myDomain 部分) を抽出
  const orgPrefix = String(opts.orgHost || "").split(".")[0].replace(/[^a-zA-Z0-9-]/g, "").slice(0, 12) || "ORG";
  const docId = opts.docId || `DOC-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${orgPrefix}`;
  // 環境ラベルから業務日本語表記を導出 (opts > _designCtx の順で取得)
  const envLabel = opts.envLabel || _designCtx.envLabel;
  const orgId = opts.orgId || _designCtx.orgId;
  const envJa = envLabel === "SBX" ? "Sandbox (検証/開発)"
             : envLabel === "DEV" ? "Developer / Scratch (学習・検証)"
             : envLabel === "PROD" ? "⚠ Production (本番)"
             : "(環境不明)";
  // 対象組織を ホスト + 環境 + 組織 ID で構成
  const orgInfo = opts.orgHost ? `${opts.orgHost} / 環境: ${envJa}${orgId ? ` / 組織 ID: ${orgId}` : ""}` : "(未接続)";
  return {
    heading: "📄 表紙",
    kvRows: [
      ["文書管理 ID", docId],
      ["設計書名", opts.docTitle || ""],
      ["対象", opts.target || ""],
      ["対象組織", orgInfo],
      ["機密区分", opts.classification || "社内限定 (Confidential)"],
      ["作成者", opts.userName || "(SOAP 認証ユーザ)"],
      ["作成日時", dateStr],
      ["拡張機能 Ver", opts.version || "DevToolsNext v3.37+"],
      ["改訂履歴", opts.revision || `初版 / ${dateStr} 自動生成`],
      ["注意事項", "本設計書は組織内のメタデータをそのまま反映しています。配布前に機密項目 (個人情報・契約金額等) が含まれていないかご確認ください。"],
    ],
  };
}

export async function generateDesign({ type, host, sid, apiVersion, obj, format, onProgress, orgId, envLabel, erDepth, erMdOnly }) {
  let result;
  const progress = onProgress || (() => {});
  // v3.37.0: 設計書表紙の「対象組織」表示改善のため orgId / envLabel を module-level _designCtx に保持
  _designCtx = { orgId: orgId || null, envLabel: envLabel || null };
  // v3.142.0 Phase 232: ER 図用の追加オプション (深さ / Master-Detail フィルタ)
  const ctx = { host, sid, apiVersion, obj, progress, erDepth: erDepth || 1, erMdOnly: !!erMdOnly };
  switch (type) {
    case "objectDef":          result = await buildObjectDef(ctx); break;
    case "profileList":        result = await buildProfileList(ctx); break;
    case "permsetList":        result = await buildPermSetList(ctx); break;
    case "apexClassList":      result = await buildApexClassList(ctx); break;
    case "apexTriggerList":    result = await buildApexTriggerList(ctx); break;
    case "flowList":           result = await buildFlowList(ctx); break;
    case "validationRuleList": result = await buildValidationRuleList(ctx); break;
    case "recordTypeList":     result = await buildRecordTypeList(ctx); break;
    case "fieldSetList":       result = await buildFieldSetList(ctx); break;
    case "customSettingList":  result = await buildCustomSettingList(ctx); break;
    case "erDiagram":          result = await buildErDiagram(ctx); break;
    case "fieldPermMatrix":    result = await buildFieldPermMatrix(ctx); break;
    case "objectPermMatrix":   result = await buildObjectPermMatrix(ctx); break;
    case "profileDetail":      result = await buildProfileDetail(ctx); break;
    case "flsReport":          result = await buildFlsReport(ctx); break;
    case "appList":            result = await buildAppList(ctx); break;
    case "accessControl":      result = await buildAccessControl(ctx); break;
    case "flowDetail":         result = await buildFlowDetail(ctx); break;
    case "apexDetail":         result = await buildApexDetail(ctx); break;
    case "lwcDetail":          result = await buildLwcDetail(ctx); break;
    case "orgSnapshot":        result = await buildOrgSnapshot(ctx); break;
    default: throw new Error("未対応の設計書タイプです: " + type);
  }
  result.format = format;
  result.source = formatOutput(result, format);
  return result;
}

// ============ オブジェクト定義書 ============
async function buildObjectDef({ host, sid, apiVersion, obj }) {
  requireInput(obj, "オブジェクト API 名 (例: Account)");
  const r = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/sobjects/${encodeURIComponent(obj)}/describe` });
  if (!r.ok) throw apiError(`オブジェクト '${obj}' の describe 取得に失敗しました`, r);
  const d = r.data;
  const fields = d.fields || [];

  // フィールド表 (業務テンプレ準拠: v2.11.0 で 「作成可」「更新可」「暗号化」「ヘルプテキスト」を追加分離)
  // v2.80.0: 「桁/精度」が意味不明とのフィードバックを受け、「文字数」「数値桁数」「小数桁」の 3 列に分離
  const headers = [
    "No", "API 名", "表示名", "データ型", "文字数", "数値桁数", "小数桁",
    "必須", "一意", "外部ID", "計算項目",
    "作成可", "更新可", "暗号化", "参照先", "選択リスト値", "既定値", "ヘルプテキスト", "説明",
  ];
  // 文字列系の型は length (文字数) を、数値系の型は precision (全桁数) と scale (小数桁) を使う
  const isStringLike = (t) => ["string", "textarea", "email", "phone", "url"].includes(t);
  const isNumericLike = (t) => ["currency", "double", "percent", "int", "long"].includes(t);
  const rows = fields.map((f, i) => ({
    "No": i + 1,
    "API 名": f.name,
    "表示名": f.label,
    // v2.98.0: データ型を日本語化 (参照関係(対象オブジェクト) / チェックボックス / 文字列 等)
    "データ型": fieldTypeJa(f.type, (f.referenceTo || [])[0]),
    "文字数": isStringLike(f.type) && f.length ? `${fmtNum(f.length)} 文字` : "",
    "数値桁数": isNumericLike(f.type) && f.precision != null ? `${fmtNum(f.precision)} 桁` : "",
    "小数桁": isNumericLike(f.type) && f.scale != null ? `${fmtNum(f.scale)} 桁` : "",
    "必須": !f.nillable && !f.defaultedOnCreate && f.createable ? "○" : "",
    "一意": f.unique ? "○" : "",
    "外部ID": f.externalId ? "○" : "",
    "計算項目": f.calculated ? "○" : "",
    "作成可": f.createable ? "○" : "",
    "更新可": f.updateable ? "○" : "",
    "暗号化": f.encrypted ? "○" : "",
    "参照先": (f.referenceTo || []).join(", "),
    "選択リスト値": (f.picklistValues || []).slice(0, 30).map((p) => p.value + (p.active ? "" : "(無効)")).join(" / "),
    "既定値": f.defaultValue != null ? String(f.defaultValue) : "",
    "ヘルプテキスト": fmtTrunc(f.inlineHelpText || "", 150),
    "説明": fmtTrunc(f.description || "", 200),
  }));

  // メタ情報
  const meta = [
    ["API 名", d.name],
    ["ラベル", d.label],
    ["カスタム", d.custom ? "○ カスタム" : "− 標準"],
    ["キー Prefix", d.keyPrefix || ""],
    ["項目数", String(fields.length)],
    ["レコードタイプ", String((d.recordTypeInfos || []).filter((r) => !r.master).length)],
    ["子リレーション数", String((d.childRelationships || []).length)],
    ["共有モデル", d.customSetting ? "Custom Setting" : "Standard"],
    ["作成可", d.createable ? "○" : ""],
    ["更新可", d.updateable ? "○" : ""],
    ["削除可", d.deletable ? "○" : ""],
    ["検索可", d.queryable ? "○" : ""],
    ["FLS必須", d.feedEnabled ? "Feed有効" : ""],
  ];

  // 子リレーション
  const childRels = (d.childRelationships || []).map((c, i) => ({
    "No": i + 1,
    "子オブジェクト": c.childSObject,
    "リレーション項目": c.field,
    "リレーション名": c.relationshipName || "",
    "カスケード削除": c.cascadeDelete ? "○" : "",
    "再ペアレント": c.deprecatedAndHidden ? "(廃止)" : "",
  }));

  // レコードタイプ
  const rts = (d.recordTypeInfos || []).filter((r) => !r.master).map((r, i) => ({
    "No": i + 1,
    "API 名": r.developerName,
    "ラベル": r.name,
    "ID": r.recordTypeId,
    "有効": r.available ? "○" : "",
    "デフォルト": r.defaultRecordTypeMapping ? "○" : "",
  }));

  // v2.98.0: 表紙セクション追加 (プロジェクト成果物品質)
  const cover = makeCoverSection({
    docTitle: "オブジェクト定義書",
    target: `${d.label} (${d.name})`,
    orgHost: host,
    revision: "初版",
  });

  // v3.36.0: 凡例セクション追加 (業務担当者向け項目型の説明)
  const objLegend = [
    ["カスタム", "Salesforce 標準でない、自組織で追加した項目 (○ 表示)"],
    ["必須", "保存時に値が必須の項目 (○) — null 不可制約"],
    ["参照先", "参照型 (reference) の場合、関連する親オブジェクト名"],
    ["FLS R/W", "プロファイル/権限セットで参照可能/編集可能を制御 (詳細は FLS レポート参照)"],
    ["子リレーション", "本オブジェクトを親とする子リレーション関係 (削除時の影響範囲)"],
    ["レコードタイプ", "同一オブジェクトを業務別に使い分ける単位 (詳細はレコードタイプ一覧参照)"],
  ];

  // v3.141.0 Phase 231 (Team D): 項目集計サマリ追加 (型別件数 / 必須 / 参照 / 計算 / 暗号化 / カスタム vs 標準)
  const typeBreakdown = {};
  fields.forEach((f) => {
    const t = f.type || "(不明)";
    typeBreakdown[t] = (typeBreakdown[t] || 0) + 1;
  });
  const requiredCount = fields.filter((f) => !f.nillable && !f.defaultedOnCreate && f.createable).length;
  const refCount = fields.filter((f) => f.type === "reference").length;
  const calcCount = fields.filter((f) => f.calculated).length;
  const encryptedCount = fields.filter((f) => f.encrypted).length;
  const customCount = fields.filter((f) => f.custom).length;
  const standardCount = fields.length - customCount;
  const externalIdCount = fields.filter((f) => f.externalId).length;
  const uniqueCount = fields.filter((f) => f.unique).length;
  const picklistCount = fields.filter((f) => f.type === "picklist" || f.type === "multipicklist").length;
  // 参照先別の集計 (どのオブジェクトをどのくらい参照しているか)
  const refTargetMap = {};
  fields.filter((f) => f.type === "reference").forEach((f) => {
    (f.referenceTo || []).forEach((to) => {
      refTargetMap[to] = (refTargetMap[to] || 0) + 1;
    });
  });
  const refTargetBreakdown = Object.entries(refTargetMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([obj, cnt]) => `${obj} (${cnt})`).join(", ");
  const typeBreakdownRows = Object.entries(typeBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([t, cnt], i) => ({
      "No": i + 1,
      "データ型 (原文)": t,
      "データ型 (日本語)": fieldTypeJa(t, null),
      "件数": fmtNum(cnt),
      "割合": fmtPercent(cnt / Math.max(fields.length, 1)),
    }));
  // 集計サマリ kvRows
  const summaryKv = [
    ["全項目数", `${fmtNum(fields.length)} 件`],
    ["標準項目", `${fmtNum(standardCount)} 件 (${fmtPercent(standardCount / Math.max(fields.length, 1))})`],
    ["カスタム項目", `${fmtNum(customCount)} 件 (${fmtPercent(customCount / Math.max(fields.length, 1))})`],
    ["必須項目", `${fmtNum(requiredCount)} 件 (${fmtPercent(requiredCount / Math.max(fields.length, 1))})`],
    ["参照型 (reference)", `${fmtNum(refCount)} 件${refTargetBreakdown ? ` — 参照先内訳 Top10: ${refTargetBreakdown}` : ""}`],
    ["計算項目 (formula)", `${fmtNum(calcCount)} 件 (${fmtPercent(calcCount / Math.max(fields.length, 1))})`],
    ["選択リスト系", `${fmtNum(picklistCount)} 件 (picklist + multipicklist)`],
    ["暗号化項目", `${fmtNum(encryptedCount)} 件${encryptedCount > 0 ? " — Shield Platform Encryption 利用" : ""}`],
    ["外部 ID 項目", `${fmtNum(externalIdCount)} 件${externalIdCount > 0 ? " — 外部システム連携キー" : ""}`],
    ["一意 (unique) 項目", `${fmtNum(uniqueCount)} 件`],
  ];

  return {
    title: `オブジェクト定義書: ${d.label} (${d.name})`,
    type: "objectDef",
    sections: [
      cover,
      { heading: "0. 凡例", kvRows: objLegend },
      { heading: "1. オブジェクト概要", kvRows: meta },
      // v3.141.0 Phase 231: 項目集計サマリを項目定義の前に挿入 (全体俯瞰用)
      { heading: "2. 項目集計サマリ", kvRows: summaryKv },
      { heading: "3. 項目タイプ別件数", headers: Object.keys(typeBreakdownRows[0] || {}), rows: typeBreakdownRows },
      { heading: "4. 項目定義", headers, rows },
      ...(childRels.length ? [{ heading: "5. 子リレーション", headers: Object.keys(childRels[0] || {}), rows: childRels }] : []),
      ...(rts.length ? [{ heading: "6. レコードタイプ", headers: Object.keys(rts[0] || {}), rows: rts }] : []),
    ],
    note: `項目数 ${fmtNum(rows.length)} (標準 ${fmtNum(standardCount)} / カスタム ${fmtNum(customCount)}) / 必須 ${fmtNum(requiredCount)} 件 / 参照 ${fmtNum(refCount)} 件 / 計算 ${fmtNum(calcCount)} 件 / 子リレーション ${fmtNum(childRels.length)} / レコードタイプ ${fmtNum(rts.length)}。**業務担当者向け**: 「項目定義」シートが入力画面の項目一覧と一致します。「2. 項目集計サマリ」「3. 項目タイプ別件数」(Phase 231 追加) で全体構造を即把握 — オブジェクトの拡張度 (カスタム項目割合) / 業務複雑度 (必須項目数 / 計算項目数) / 連携密度 (参照型数) の指標として活用できます。Excel で「4. 項目定義」を「カスタム=○」絞り込みで自組織独自項目のみ抽出可能。`,
  };
}

// ============ プロファイル一覧 ============
// v3.135.0 Phase 225 (Team D): 「割当ユーザー数」「アクティブ割当数」追加 (棚卸し用)
async function buildProfileList({ host, sid, apiVersion }) {
  const r = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT Id, Name, UserLicense.Name, UserType, CreatedDate, LastModifiedDate, Description FROM Profile ORDER BY Name LIMIT 200`,
  });
  if (!r.ok) throw apiError("プロファイルの取得に失敗しました", r);
  // UserType の業務用語マップ
  const userTypeMap = {
    "Standard": "標準ユーザ (Standard)",
    "PowerPartner": "パワーパートナー (PowerPartner)",
    "PowerCustomerSuccess": "顧客ポータルユーザ (PowerCustomerSuccess)",
    "CustomerSuccess": "顧客ポータルユーザ (CustomerSuccess)",
    "Guest": "ゲスト (Guest)",
    "CSPLitePortal": "サービスクラウドポータル (CSPLitePortal)",
    "CspLitePortal": "サービスクラウドポータル (CspLitePortal)",
    "SelfService": "セルフサービス (SelfService)",
  };
  const records = r.data.records || [];

  // Phase 225: 各プロファイルの割当ユーザー数を集計 (全 / アクティブ)
  // SOQL: SELECT ProfileId, COUNT(Id), SUM(CASE WHEN IsActive THEN 1 ELSE 0) — SOQL に CASE 無いので 2 クエリで取得
  const profileCounts = new Map(); // ProfileId → {total, active}
  try {
    const allR = await runSoql({
      host, sid, apiVersion,
      soql: `SELECT ProfileId, COUNT(Id) cnt FROM User GROUP BY ProfileId`,
    });
    if (allR.ok) {
      for (const rec of (allR.data.records || [])) {
        if (rec.ProfileId) profileCounts.set(rec.ProfileId, { total: Number(rec.cnt) || 0, active: 0 });
      }
    }
    const actR = await runSoql({
      host, sid, apiVersion,
      soql: `SELECT ProfileId, COUNT(Id) cnt FROM User WHERE IsActive = true GROUP BY ProfileId`,
    });
    if (actR.ok) {
      for (const rec of (actR.data.records || [])) {
        if (rec.ProfileId) {
          const existing = profileCounts.get(rec.ProfileId) || { total: 0, active: 0 };
          existing.active = Number(rec.cnt) || 0;
          profileCounts.set(rec.ProfileId, existing);
        }
      }
    }
  } catch (e) { console.warn("[buildProfileList] user count fetch failed:", e); }

  const headers = ["No", "プロファイル名", "ライセンス", "ユーザ種別", "割当全ユーザー", "アクティブ", "未使用", "説明", "作成日", "更新日"];
  const rows = records.map((p, i) => {
    const cnt = profileCounts.get(p.Id) || { total: 0, active: 0 };
    const isUnused = cnt.active === 0;
    return {
      "No": i + 1,
      "プロファイル名": p.Name,
      "ライセンス": p.UserLicense ? p.UserLicense.Name : "(なし)",
      "ユーザ種別": userTypeMap[p.UserType] || p.UserType || "",
      "割当全ユーザー": fmtNum(cnt.total),
      "アクティブ": fmtNum(cnt.active),
      "未使用": isUnused && cnt.total === 0 ? "○ 完全未使用" : (isUnused ? "△ 全員無効" : ""),
      "説明": fmtTrunc(p.Description || "", 200),
      "作成日": fmtDate(p.CreatedDate),
      "更新日": fmtDate(p.LastModifiedDate),
    };
  });
  const legend = [
    ["プロファイルとは", "ユーザ作成時に必須となる権限の母体。ユーザ毎にちょうど 1 つ割当てる (権限セットと違い複数割当不可)"],
    ["ライセンス", "プロファイルが紐づく UserLicense。Salesforce / Salesforce Platform / Customer Community 等が代表"],
    ["ユーザ種別", "標準 = 内部ユーザ、Power〇〇 / Customer〇〇 = 外部 (Experience Cloud / コミュニティ) ユーザ"],
    // v3.258.0 Phase 348 (Team D): 凡例に Phase 225 新規列の説明を補完
    ["割当全ユーザー", "そのプロファイルに紐づく User レコード総数 (有効/無効すべて)。0 件は未使用プロファイル"],
    ["アクティブ", "上記のうち IsActive=true (ログイン可能) のユーザー数。年次セキュリティ監査・棚卸しの主指標"],
    ["未使用", "○ 完全未使用 = 一度も割当履歴なし (即削除候補) / △ 全員無効 = 割当履歴ありだが現在は全員無効 (監査対象)"],
    ["設計指針", "近年は『最小プロファイル + 権限セットで加算』が推奨 (Spring '26 でプロファイル機能の一部廃止予定)"],
  ];
  // v2.73.0: note サマリ - ライセンス別件数 + 内部/外部ユーザ別件数
  const licCounts = {};
  records.forEach((p) => {
    const k = p.UserLicense ? p.UserLicense.Name : "(なし)";
    licCounts[k] = (licCounts[k] || 0) + 1;
  });
  const licBreakdown = Object.keys(licCounts).sort()
    .map((k) => `${k} ${fmtNum(licCounts[k])} 件`).join(" / ");
  const externalTypes = new Set(["PowerPartner", "PowerCustomerSuccess", "CustomerSuccess", "Guest", "CSPLitePortal", "CspLitePortal", "SelfService"]);
  const externalCount = records.filter((p) => externalTypes.has(p.UserType)).length;
  const internalCount = records.length - externalCount;
  return {
    title: "プロファイル一覧",
    type: "profileList",
    sections: [
      makeCoverSection({ docTitle: "プロファイル一覧", target: "組織全体 (全プロファイル)", orgHost: host, revision: "初版" }),
      { heading: "0. 凡例", kvRows: legend },
      { heading: "1. プロファイル", headers, rows },
    ],
    note: (() => {
      const unusedFull = records.filter((p) => { const c = profileCounts.get(p.Id) || { total: 0, active: 0 }; return c.total === 0; }).length;
      const unusedActive = records.filter((p) => { const c = profileCounts.get(p.Id) || { total: 0, active: 0 }; return c.total > 0 && c.active === 0; }).length;
      const totalActive = Array.from(profileCounts.values()).reduce((s, c) => s + c.active, 0);
      return `合計 ${fmtNum(records.length)} 件 / 内部ユーザ向け ${fmtNum(internalCount)} 件 / 外部 ${fmtNum(externalCount)} 件 / ライセンス別: ${licBreakdown} / 全アクティブユーザー ${fmtNum(totalActive)} 名 / **完全未使用 ${fmtNum(unusedFull)} 件** / 全員無効 ${fmtNum(unusedActive)} 件。**業務担当者向け**: 「未使用」列が「○ 完全未使用」のプロファイルは即削除候補、「△ 全員無効」は割当履歴あり (誰かいたが今は無効) のため監査対象。新規ユーザー作成時の参考、年次セキュリティ監査時の権限主体洗い出しに活用してください。詳細権限は「プロファイル/権限セット 詳細レポート」で確認可能。`;
    })(),
  };
}

// ============ 権限セット一覧 ============
// v3.135.0 Phase 225 (Team D): 「割当ユーザー数」「割当グループ数」追加 (棚卸し用)
async function buildPermSetList({ host, sid, apiVersion }) {
  const r = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT Id, Name, Label, License.Name, IsCustom, NamespacePrefix, Description, LastModifiedDate FROM PermissionSet WHERE IsOwnedByProfile=false ORDER BY Name LIMIT 500`,
  });
  if (!r.ok) throw apiError("権限セットの取得に失敗しました", r);
  const records = r.data.records || [];

  // Phase 225: PermissionSet 別の割当ユーザー数 (PermissionSetAssignment 経由)
  const psAssignCounts = new Map(); // PermissionSetId → user count (直接割当)
  try {
    const aR = await runSoql({
      host, sid, apiVersion,
      soql: `SELECT PermissionSetId, COUNT(Id) cnt FROM PermissionSetAssignment WHERE PermissionSetId != null GROUP BY PermissionSetId LIMIT 500`,
    });
    if (aR.ok) {
      for (const rec of (aR.data.records || [])) {
        if (rec.PermissionSetId) psAssignCounts.set(rec.PermissionSetId, Number(rec.cnt) || 0);
      }
    }
  } catch (e) { console.warn("[buildPermSetList] PSA count failed:", e); }

  const headers = ["No", "API 名", "ラベル (画面表示名)", "ライセンス", "ネームスペース", "種別", "割当ユーザー数", "説明", "更新日"];
  const rows = records.map((p, i) => ({
    "No": i + 1,
    "API 名": p.Name,
    "ラベル (画面表示名)": p.Label,
    "ライセンス": p.License ? p.License.Name : "(なし: 機能限定)",
    "ネームスペース": p.NamespacePrefix || "(なし: カスタム)",
    "種別": p.IsCustom ? "カスタム" : "標準/パッケージ",
    "割当ユーザー数": fmtNum(psAssignCounts.get(p.Id) || 0),
    "説明": fmtTrunc(p.Description || "", 200),
    "更新日": fmtDate(p.LastModifiedDate),
  }));
  const legend = [
    ["権限セットとは", "プロファイルとは別に、特定機能 (例: レポート作成・データエクスポート) をユーザに『加算』する仕組み。複数割当可"],
    ["ライセンス", "(なし) = 機能限定 / Salesforce 等 = そのライセンスに紐づくユーザにのみ割当可能"],
    ["ネームスペース", "(なし) = 自組織のカスタム / 値あり = AppExchange パッケージや管理パッケージ由来"],
    ["種別", "カスタム = 管理者が作成・編集可、標準/パッケージ = Salesforce 標準またはパッケージ提供で編集制限あり"],
    // v3.258.0 Phase 348 (Team D): 凡例に Phase 225 新規列の説明を補完
    ["割当ユーザー数", "PermissionSetAssignment を経由した直接割当のユーザー数。0 件は未割当 (削除候補または PermissionSetGroup 経由のみで運用中)"],
    ["除外条件", "IsOwnedByProfile=false (プロファイルに付随する内部 PermissionSet は本一覧から除外)"],
  ];
  // v2.73.0: note サマリ - カスタム/標準別 + ライセンス別 + ネームスペース (組織独自/パッケージ) 別件数
  const customCount = records.filter((p) => p.IsCustom).length;
  const packagedCount = records.length - customCount;
  const localCount = records.filter((p) => !p.NamespacePrefix).length;
  const externalNsCount = records.length - localCount;
  const psLicCounts = {};
  records.forEach((p) => {
    const k = p.License ? p.License.Name : "(なし: 機能限定)";
    psLicCounts[k] = (psLicCounts[k] || 0) + 1;
  });
  const psLicBreakdown = Object.keys(psLicCounts).sort()
    .map((k) => `${k} ${fmtNum(psLicCounts[k])} 件`).join(" / ");
  return {
    title: "権限セット一覧",
    type: "permsetList",
    sections: [
      makeCoverSection({ docTitle: "権限セット一覧", target: "組織全体 (全 PermissionSet)", orgHost: host, revision: "初版" }),
      { heading: "0. 凡例", kvRows: legend },
      { heading: "1. PermissionSet", headers, rows },
    ],
    note: (() => {
      const unusedPS = records.filter((p) => (psAssignCounts.get(p.Id) || 0) === 0).length;
      const totalAssign = Array.from(psAssignCounts.values()).reduce((s, c) => s + c, 0);
      return `合計 ${fmtNum(records.length)} 件 (プロファイル付随を除外) / カスタム ${fmtNum(customCount)} 件・標準/パッケージ ${fmtNum(packagedCount)} 件 / 自組織 ${fmtNum(localCount)} 件・パッケージ由来 ${fmtNum(externalNsCount)} 件 / ライセンス別: ${psLicBreakdown} / 全割当数 ${fmtNum(totalAssign)} / **未割当 ${fmtNum(unusedPS)} 件** (棚卸し候補)。**業務担当者向け**: 「割当ユーザー数」が 0 の PermissionSet は削除候補。役割ベースのアクセス管理 (RBAC) 設計時の参考、組織再編時の権限再設計、未使用権限セット棚卸しに活用してください。**注**: PermissionSetGroup 経由の間接割当は本数値に含まれません (PermissionSetGroupComponent を別途確認)。`;
    })(),
  };
}

// ============ ApexClass 一覧 ============
async function buildApexClassList({ host, sid, apiVersion }) {
  const r = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, Name, ApiVersion, Status, NamespacePrefix, LengthWithoutComments, CreatedDate, LastModifiedDate FROM ApexClass WHERE ManageableState='unmanaged' OR ManageableState='installedEditable' ORDER BY Name LIMIT 500`,
  });
  if (!r.ok) throw apiError("Apex クラス一覧の取得に失敗しました", r);
  // v2.14.0: ステータス + 列名を業務用語化
  const statusLabel = (s) => ({ "Active": "○ 有効", "Inactive": "− 無効", "Deleted": "✗ 削除済" }[s] || s);
  const records = r.data.records || [];
  // コード行数の合計を算出 (組織全体のサイズ把握用)
  const totalLength = records.reduce((sum, p) => sum + (Number(p.LengthWithoutComments) || 0), 0);
  const headers = ["No", "クラス名", "ネームスペース", "API バージョン", "ステータス", "コードサイズ (コメント除く)", "作成日", "更新日"];
  const rows = records.map((p, i) => ({
    "No": i + 1,
    "クラス名": p.Name,
    "ネームスペース": p.NamespacePrefix || "(なし)",
    "API バージョン": p.ApiVersion != null ? `v${p.ApiVersion}` : "",
    "ステータス": statusLabel(p.Status),
    "コードサイズ (コメント除く)": p.LengthWithoutComments != null ? fmtBytes(p.LengthWithoutComments) : "",
    "作成日": fmtDate(p.CreatedDate),
    "更新日": fmtDate(p.LastModifiedDate),
  }));
  // v2.73.0: ステータス別件数 + ネームスペース別件数も集計
  const activeCount = records.filter((p) => p.Status === "Active").length;
  const inactiveCount = records.filter((p) => p.Status === "Inactive").length;
  const deletedCount = records.filter((p) => p.Status === "Deleted").length;
  const acLocalCount = records.filter((p) => !p.NamespacePrefix).length;
  const acExtCount = records.length - acLocalCount;
  // v2.74.0: 凡例セクション追加 (業務担当向けに用語解説)
  const acLegend = [
    ["Apex クラスとは", "Salesforce のサーバーサイド処理を記述する Java 風プログラム。トリガ・REST/SOAP サービス・テストクラス・コントローラ等の母体"],
    ["unmanaged", "自組織で作成・編集可能なカスタム Apex"],
    ["installedEditable", "AppExchange パッケージ由来だが組織側で編集可能なもの"],
    ["installed (本一覧から除外)", "ロック済の管理パッケージ Apex (Salesforce 標準 + LMA 管理対象)。閲覧のみ可能"],
    ["コードサイズ (Apex Limit)", "コメント除外行数の合計バイト数。組織全体で 6 MB が上限 (Salesforce 公式制限)"],
    ["ステータス", "○ 有効 (実行可能) / − 無効 (コンパイル不可・実行されない) / ✗ 削除済 (UI に表示なし)"],
    ["API バージョン", "実装時に指定した Salesforce API バージョン。新機能利用には新しいバージョンが必要"],
  ];
  return {
    title: "Apex クラス一覧",
    type: "apexClassList",
    sections: [
      makeCoverSection({ docTitle: "Apex クラス一覧", target: "組織全体 (全 ApexClass)", orgHost: host, revision: "初版" }),
      { heading: "0. 凡例", kvRows: acLegend },
      { heading: "1. Apex クラス", headers, rows },
    ],
    note: `合計 ${fmtNum(records.length)} 件 (unmanaged + installedEditable のみ) / 有効 ${fmtNum(activeCount)} 件・無効 ${fmtNum(inactiveCount)} 件・削除済 ${fmtNum(deletedCount)} 件 / ネームスペース: 自組織 ${fmtNum(acLocalCount)} 件・パッケージ由来 ${fmtNum(acExtCount)} 件 / 総コードサイズ: ${fmtBytes(totalLength)} (Apex Limit 6 MB に対する使用率: 約 ${fmtPercent(totalLength / (6 * 1024 * 1024))})。**業務担当者向け**: 本一覧は組織のカスタム Apex コード資産です。**Apex Limit 使用率が 80% を超えたら**未使用クラス整理を検討してください。バージョンアップ前の互換性チェック、保守引継ぎ、外部ベンダ実装の棚卸しに活用できます。`,
  };
}

// ============ ApexTrigger 一覧 ============
async function buildApexTriggerList({ host, sid, apiVersion }) {
  const r = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, Name, TableEnumOrId, UsageBeforeInsert, UsageAfterInsert, UsageBeforeUpdate, UsageAfterUpdate, UsageBeforeDelete, UsageAfterDelete, UsageAfterUndelete, Status, LengthWithoutComments, LastModifiedDate FROM ApexTrigger ORDER BY TableEnumOrId, Name LIMIT 500`,
  });
  if (!r.ok) throw apiError("Apex トリガ一覧の取得に失敗しました", r);
  const statusLabel = (s) => ({ "Active": "○ 有効", "Inactive": "− 無効", "Deleted": "✗ 削除済" }[s] || s);
  const records = r.data.records || [];
  const headers = ["No", "トリガ名", "対象オブジェクト", "BI", "AI", "BU", "AU", "BD", "AD", "AUD", "ステータス", "コードサイズ", "更新日"];
  const rows = records.map((p, i) => ({
    "No": i + 1,
    "トリガ名": p.Name,
    "対象オブジェクト": p.TableEnumOrId,
    "BI": p.UsageBeforeInsert ? "○" : "",
    "AI": p.UsageAfterInsert ? "○" : "",
    "BU": p.UsageBeforeUpdate ? "○" : "",
    "AU": p.UsageAfterUpdate ? "○" : "",
    "BD": p.UsageBeforeDelete ? "○" : "",
    "AD": p.UsageAfterDelete ? "○" : "",
    "AUD": p.UsageAfterUndelete ? "○" : "",
    "ステータス": statusLabel(p.Status),
    "コードサイズ": p.LengthWithoutComments != null ? fmtBytes(p.LengthWithoutComments) : "",
    "更新日": fmtDate(p.LastModifiedDate),
  }));
  // v2.72.0: note サマリ - 有効/無効/削除済 別件数 + イベント別発火件数 + 対象オブジェクト数 + 総コードサイズ
  const activeCount = records.filter((p) => p.Status === "Active").length;
  const inactiveCount = records.filter((p) => p.Status === "Inactive").length;
  const deletedCount = records.filter((p) => p.Status === "Deleted").length;
  const objCount = new Set(records.map((p) => p.TableEnumOrId)).size;
  const totalSize = records.reduce((sum, p) => sum + (Number(p.LengthWithoutComments) || 0), 0);
  const evt = (key) => records.filter((p) => p[key]).length;
  const evtSummary = [
    `BI ${fmtNum(evt("UsageBeforeInsert"))}`, `AI ${fmtNum(evt("UsageAfterInsert"))}`,
    `BU ${fmtNum(evt("UsageBeforeUpdate"))}`, `AU ${fmtNum(evt("UsageAfterUpdate"))}`,
    `BD ${fmtNum(evt("UsageBeforeDelete"))}`, `AD ${fmtNum(evt("UsageAfterDelete"))}`,
    `AUD ${fmtNum(evt("UsageAfterUndelete"))}`,
  ].join(" / ");
  // v2.14.0: 凡例セクションを別途追加 (業務担当向け)
  const legendHeaders = ["略号", "意味"];
  const legendRows = [
    { "略号": "BI", "意味": "Before Insert (挿入前)" },
    { "略号": "AI", "意味": "After Insert (挿入後)" },
    { "略号": "BU", "意味": "Before Update (更新前)" },
    { "略号": "AU", "意味": "After Update (更新後)" },
    { "略号": "BD", "意味": "Before Delete (削除前)" },
    { "略号": "AD", "意味": "After Delete (削除後)" },
    { "略号": "AUD", "意味": "After Undelete (復元後)" },
  ];
  return {
    title: "Apex トリガ一覧",
    type: "apexTriggerList",
    sections: [
      makeCoverSection({ docTitle: "Apex トリガ一覧", target: "組織全体 (全 ApexTrigger)", orgHost: host, revision: "初版" }),
      { heading: "0. 凡例 / トリガイベント略号", headers: legendHeaders, rows: legendRows },
      { heading: "1. Apex トリガ一覧", headers, rows },
    ],
    note: `合計 ${fmtNum(records.length)} 件 / 対象オブジェクト ${fmtNum(objCount)} 種類 / 有効 ${fmtNum(activeCount)} 件・無効 ${fmtNum(inactiveCount)} 件・削除済 ${fmtNum(deletedCount)} 件 / 総コードサイズ: ${fmtBytes(totalSize)} / イベント発火: ${evtSummary}。**業務担当者向け**: Apex トリガはレコード保存時 (before/after insert/update/delete) に自動実行されるサーバー側ロジックです。データ整合性に直結するため、データ移行時の停止判断、Bulk API 制限の影響範囲、業務イベント (受注確定/承認等) との関連把握にご活用ください。`,
  };
}

// ============ Flow 一覧 ============
async function buildFlowList({ host, sid, apiVersion }) {
  const r = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, MasterLabel, DeveloperName, ProcessType, IsActive, VersionNumber, Description, LastModifiedDate FROM FlowDefinitionView WHERE IsActive=true ORDER BY MasterLabel LIMIT 500`,
  });
  // v2.14.0: ProcessType を業務用語の日本語+原文併記
  const processTypeLabel = (t) => {
    const m = {
      "AutoLaunchedFlow": "自動起動フロー (Autolaunched)",
      "Flow": "画面フロー (Screen)",
      "Workflow": "ワークフロー (Workflow Rule)",
      "CustomEvent": "カスタムイベントトリガ",
      "InvocableProcess": "プロセスビルダー (Invocable Process)",
      "LoginFlow": "ログインフロー",
      "ContactRequestFlow": "問い合わせリクエストフロー",
      "FieldServiceMobile": "Field Service モバイル",
      "FieldServiceWeb": "Field Service Web",
      "Survey": "アンケート (Survey)",
      "ActionPlan": "アクションプラン",
      "CheckoutFlow": "チェックアウトフロー",
    };
    return t ? (m[t] || t) : "";
  };
  if (!r.ok) {
    // FlowDefinitionView が無い org 向けに Flow へフォールバック
    const r2 = await runSoql({
      host, sid, apiVersion, tooling: true,
      soql: `SELECT Id, MasterLabel, ProcessType, Status, VersionNumber, Definition.DeveloperName FROM Flow WHERE Status='Active' ORDER BY MasterLabel LIMIT 500`,
    });
    if (!r2.ok) throw apiError("フロー一覧の取得に失敗しました (フォールバック)", r2);
    const r2records = r2.data.records || [];
    const headers = ["No", "ラベル", "API 名", "種別", "状態", "バージョン"];
    const rows = r2records.map((f, i) => ({
      "No": i + 1, "ラベル": f.MasterLabel, "API 名": f.Definition ? f.Definition.DeveloperName : "",
      "種別": processTypeLabel(f.ProcessType),
      "状態": f.Status === "Active" ? "○ アクティブ" : (f.Status === "Draft" ? "下書き" : (f.Status === "Obsolete" ? "廃止" : (f.Status || ""))),
      "バージョン": f.VersionNumber != null ? `v${f.VersionNumber}` : "",
    }));
    // v2.72.0: フォールバック側にも種別サマリを追加
    const r2types = {};
    r2records.forEach((f) => {
      const key = f.ProcessType || "(未分類)";
      r2types[key] = (r2types[key] || 0) + 1;
    });
    const r2breakdown = Object.keys(r2types).sort().map((t) => `${processTypeLabel(t)} ${fmtNum(r2types[t])} 件`).join(" / ");
    return { title: "フロー一覧 (アクティブのみ)", type: "flowList", sections: [{ heading: "フロー", headers, rows }], note: `合計 ${fmtNum(rows.length)} 件 / 種別内訳: ${r2breakdown}。**業務担当者向け**: フロー (Flow) は管理者がノーコードで構築できる業務プロセス自動化機能です。種別と状態は業務用語で表記しています。組織内の自動化資産棚卸し、業務プロセス可視化、運用引継ぎ、改修計画の優先度判断にご活用ください。各フローの詳細は「フロー設計図」を選択してください。` };
  }
  const records = r.data.records || [];
  const headers = ["No", "ラベル", "API 名", "種別", "アクティブ", "バージョン", "説明", "更新日"];
  const rows = records.map((f, i) => ({
    "No": i + 1,
    "ラベル": f.MasterLabel,
    "API 名": f.DeveloperName,
    "種別": processTypeLabel(f.ProcessType),
    "アクティブ": f.IsActive ? "○ 稼働中" : "− 停止",
    "バージョン": f.VersionNumber != null ? `v${f.VersionNumber}` : "",
    "説明": fmtTrunc(f.Description || "", 200),
    "更新日": fmtDate(f.LastModifiedDate),
  }));
  // v2.72.0: note サマリ - 種別別件数を集計 (Process Builder 廃止予告とセットで業務影響把握)
  const typeBuckets = {};
  records.forEach((f) => {
    const key = f.ProcessType || "(未分類)";
    typeBuckets[key] = (typeBuckets[key] || 0) + 1;
  });
  const typeBreakdown = Object.keys(typeBuckets).sort()
    .map((t) => `${processTypeLabel(t)} ${fmtNum(typeBuckets[t])} 件`)
    .join(" / ");
  const wfCount = typeBuckets["Workflow"] || 0;
  const pbCount = typeBuckets["InvocableProcess"] || 0;
  const legacyNote = (wfCount || pbCount)
    ? ` / ⚠ 廃止予定: Workflow ${fmtNum(wfCount)} 件・Process Builder ${fmtNum(pbCount)} 件 (フロー移行推奨)`
    : "";
  // v3.36.0: 凡例セクション追加 (フロー種別の業務担当者向け解説)
  const flowListLegend = [
    ["Flow (Screen Flow)", "ユーザーが画面操作で起動するフロー (Lightning ページ・ボタン・モバイル等から呼出)"],
    ["Auto-Launched Flow", "他システム/Apex から自動起動 (画面なし、レコードトリガ含む)"],
    ["Record-Triggered Flow", "レコード保存時に自動実行 (insert/update/delete)、Workflow Rule / トリガ代替"],
    ["Schedule-Triggered Flow", "スケジュール起動 (バッチ処理代替)"],
    ["Workflow Rule", "**廃止予定** (項目自動更新・メール送信主用途。フローへ移行要)"],
    ["Process Builder", "**廃止予定** (旧プロセスビルダ、フローへ移行要)"],
    ["アクティブ", "○=稼働中 / −=停止 (旧版含む)"],
  ];
  return {
    title: "フロー一覧 (アクティブのみ)",
    type: "flowList",
    sections: [
      makeCoverSection({ docTitle: "フロー一覧 (アクティブのみ)", target: "組織全体 (全アクティブ Flow)", orgHost: host, revision: "初版" }),
      { heading: "0. 凡例", kvRows: flowListLegend },
      { heading: "1. フロー", headers, rows },
    ],
    note: `合計 ${fmtNum(records.length)} 件 / 種別内訳: ${typeBreakdown}${legacyNote}。**業務担当者向け**: 本一覧はアクティブな自動化資産 (Flow + 既存 Workflow Rule / Process Builder) を網羅します。**Process Builder は Salesforce 公式アナウンスにより段階的に廃止予定**のため、移行計画の対象洗い出し資料として優先活用してください。Workflow Rule は項目自動更新・メール送信が主用途のため、Flow への置換時の影響範囲確認にも有用です。`,
  };
}

// ============ 入力規則一覧 ============
async function buildValidationRuleList({ host, sid, apiVersion, obj }) {
  const where = obj ? `WHERE EntityDefinition.QualifiedApiName='${obj.replace(/'/g, "\\'")}'` : "";
  const r = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, ValidationName, Active, Description, ErrorDisplayField, ErrorMessage, EntityDefinition.QualifiedApiName, LastModifiedDate FROM ValidationRule ${where} ORDER BY EntityDefinition.QualifiedApiName, ValidationName LIMIT 500`,
  });
  if (!r.ok) throw apiError("入力規則の取得に失敗しました", r);
  const headers = ["No", "オブジェクト", "ルール名 (API)", "有効", "エラー表示位置", "エラーメッセージ", "説明 (開発者向け)", "更新日"];
  const records = r.data.records || [];
  const rows = records.map((v, i) => ({
    "No": i + 1,
    "オブジェクト": v.EntityDefinition ? v.EntityDefinition.QualifiedApiName : "",
    "ルール名 (API)": v.ValidationName,
    "有効": v.Active ? "○ 有効" : "− 無効",
    "エラー表示位置": v.ErrorDisplayField ? `項目: ${v.ErrorDisplayField}` : "ページ上部 (全体)",
    "エラーメッセージ": fmtTrunc(v.ErrorMessage || "", 300),
    "説明 (開発者向け)": fmtTrunc(v.Description || "", 200),
    "更新日": fmtDate(v.LastModifiedDate),
  }));
  const legend = [
    ["有効", "○ 有効 = ルール適用中、− 無効 = 一時的に停止 (テスト中等)"],
    ["エラー表示位置", "項目: <API名> = その項目の直下に赤字で表示、ページ上部 = 画面トップに警告として表示"],
    ["エラーメッセージ", "保存時に検証失敗した場合にユーザーへ表示される文言。多言語化したい場合は \\$Label を使用"],
    ["説明", "Setup 画面の開発者向けメモ。ユーザーには表示されない"],
  ];
  // v2.71.0: note サマリで有効/無効件数 + 表示位置内訳を集計
  const activeCount = records.filter((v) => v.Active).length;
  const inactiveCount = records.length - activeCount;
  const fieldLevelCount = records.filter((v) => v.ErrorDisplayField).length;
  const pageLevelCount = records.length - fieldLevelCount;
  const activeRate = records.length > 0 ? activeCount / records.length : 0;
  return {
    title: obj ? `入力規則一覧: ${obj}` : "入力規則一覧 (全オブジェクト)",
    type: "validationRuleList",
    sections: [
      makeCoverSection({ docTitle: "入力規則一覧", target: obj || "組織全体 (全オブジェクト)", orgHost: host, revision: "初版" }),
      { heading: "0. 凡例", kvRows: legend },
      { heading: "1. ValidationRule", headers, rows },
    ],
    note: `合計 ${fmtNum(rows.length)} 件 / 有効 ${fmtNum(activeCount)} 件 (${fmtPercent(activeRate)}) / 無効 ${fmtNum(inactiveCount)} 件 / 表示位置: 項目直下 ${fmtNum(fieldLevelCount)} 件・ページ上部 ${fmtNum(pageLevelCount)} 件。**業務担当者向け**: 入力規則はレコード保存時のチェックロジックです (誤入力防止)。データ移行で大量更新する際に一時無効化が必要なルールの洗い出し、業務ルール変更時の影響範囲確認、Excel 等の外部一括投入時の検討資料にご活用ください。無効ルールも本一覧に含まれます (Setup では既定で非表示)。`,
  };
}

// ============ レコードタイプ一覧 ============
async function buildRecordTypeList({ host, sid, apiVersion, obj }) {
  const where = obj ? `WHERE SobjectType='${obj.replace(/'/g, "\\'")}'` : "";
  const r = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT Id, Name, DeveloperName, SobjectType, IsActive, Description, BusinessProcessId FROM RecordType ${where} ORDER BY SobjectType, DeveloperName LIMIT 500`,
  });
  if (!r.ok) throw apiError("レコードタイプの取得に失敗しました", r);
  const headers = ["No", "オブジェクト", "API 名 (DeveloperName)", "ラベル (画面表示名)", "有効", "営業プロセス連携", "説明 (開発者向け)"];
  const records = r.data.records || [];
  const rows = records.map((rt, i) => ({
    "No": i + 1,
    "オブジェクト": rt.SobjectType,
    "API 名 (DeveloperName)": rt.DeveloperName,
    "ラベル (画面表示名)": rt.Name,
    "有効": rt.IsActive ? "○ 有効" : "− 無効",
    "営業プロセス連携": rt.BusinessProcessId ? `あり (${rt.BusinessProcessId.substring(0, 15)})` : "なし",
    "説明 (開発者向け)": fmtTrunc(rt.Description || "", 200),
  }));
  const legend = [
    ["レコードタイプとは", "同じオブジェクト内で異なるピックリスト値・ページレイアウト・営業プロセスを使い分ける仕組み"],
    ["有効", "○ 有効 = プロファイル/権限セットで割当可能、− 無効 = 既存レコードは保持されるが新規作成不可"],
    ["営業プロセス連携", "Opportunity / Lead / Case / Solution で利用される BusinessProcess (フェーズ/ステータス段階) との紐付け"],
    ["割当て", "実際の利用可否はプロファイル/権限セットの『レコードタイプの割り当て』で決定 (本一覧はメタ定義のみ)"],
  ];
  // v2.71.0: note サマリでオブジェクト別件数 + 有効/無効 + BusinessProcess 連携率を集計
  const activeCount = records.filter((rt) => rt.IsActive).length;
  const inactiveCount = records.length - activeCount;
  const bpLinked = records.filter((rt) => rt.BusinessProcessId).length;
  const objCount = new Set(records.map((rt) => rt.SobjectType)).size;
  const activeRate = records.length > 0 ? activeCount / records.length : 0;
  return {
    title: obj ? `レコードタイプ一覧: ${obj}` : "レコードタイプ一覧 (全オブジェクト)",
    type: "recordTypeList",
    sections: [
      makeCoverSection({ docTitle: "レコードタイプ一覧", target: obj || "組織全体 (全オブジェクト)", orgHost: host, revision: "初版" }),
      { heading: "0. 凡例", kvRows: legend },
      { heading: "1. RecordType", headers, rows },
    ],
    note: `合計 ${fmtNum(rows.length)} 件 / 対象オブジェクト ${fmtNum(objCount)} 種類 / 有効 ${fmtNum(activeCount)} 件 (${fmtPercent(activeRate)}) / 無効 ${fmtNum(inactiveCount)} 件 / 営業プロセス連携あり ${fmtNum(bpLinked)} 件。**業務担当者向け**: レコードタイプは「同じオブジェクトを業務別に使い分け」るための仕組み (例: Account を「個人」「法人」に分ける)。ページレイアウト切替、ピックリスト値切替、業務プロセス (営業ステージ) 切替の前提資料となります。新業務プロセス導入や組織再編時の見直し対象洗い出しに活用できます。無効レコードタイプも含みます。`,
  };
}

// ============ FieldSet 一覧 ============
// v3.135.0 Phase 225 (Team D): 「中身項目リスト」と「含む項目数」を追加 (ユーザー要望「設計書を業務品質まで」)
async function buildFieldSetList({ host, sid, apiVersion, obj }) {
  requireInput(obj, "オブジェクト API 名 (例: Account)");
  // 1. describe API から fieldSets を取得 — 各 FieldSet の displayedFields (画面表示項目) を含む
  const r = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/sobjects/${encodeURIComponent(obj)}/describe` });
  if (!r.ok) throw apiError(`オブジェクト '${obj}' の describe 取得に失敗しました`, r);
  const describeSets = Array.isArray(r.data.fieldSets) ? r.data.fieldSets : [];
  // FieldSet name → displayedFields のマップを作る (Phase 225 強化点)
  const setFieldsMap = new Map();
  for (const fs of describeSets) {
    const name = fs.name || "";
    const displayed = Array.isArray(fs.displayedFields) ? fs.displayedFields : [];
    setFieldsMap.set(name, displayed);
  }

  // 2. Tooling API から FieldSet メタ (Label / Description / ネームスペース) を取得
  const tr = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, DeveloperName, MasterLabel, Description, NamespacePrefix, EntityDefinition.QualifiedApiName FROM FieldSet WHERE EntityDefinition.QualifiedApiName='${obj.replace(/'/g, "\\'")}' ORDER BY DeveloperName LIMIT 200`,
  });
  if (!tr.ok) throw apiError("フィールドセットの取得に失敗しました", tr);
  const records = tr.data.records || [];

  // 3. 一覧表: API 名 / ラベル / ネームスペース / 含む項目数 / 必須項目数 / 説明
  const headers = ["No", "API 名", "ラベル", "ネームスペース", "含む項目数", "必須項目数", "説明"];
  const rows = records.map((fs, i) => {
    // describe の fieldSets は ネームスペース付き名前で索引される場合あり (Namespace__Name)
    const ns = fs.NamespacePrefix || "";
    const lookupName = ns ? `${ns}__${fs.DeveloperName}` : fs.DeveloperName;
    const fields = setFieldsMap.get(lookupName) || setFieldsMap.get(fs.DeveloperName) || [];
    const requiredCount = fields.filter((f) => f.required || f.dbRequired).length;
    return {
      "No": i + 1,
      "API 名": fs.DeveloperName,
      "ラベル": fs.MasterLabel || "",
      "ネームスペース": ns || "(なし)",
      "含む項目数": fmtNum(fields.length),
      "必須項目数": fmtNum(requiredCount),
      "説明": fmtTrunc(fs.Description || "", 150),
    };
  });

  // 4. 中身項目リスト (各 FieldSet 別) — 1 シートで全 FieldSet × 全項目を縦持ち
  const detailHeaders = ["No", "FieldSet", "順序", "項目 API 名", "ラベル", "型", "必須", "DB必須"];
  const detailRows = [];
  let cnt = 0;
  for (const fs of records) {
    const ns = fs.NamespacePrefix || "";
    const lookupName = ns ? `${ns}__${fs.DeveloperName}` : fs.DeveloperName;
    const fields = setFieldsMap.get(lookupName) || setFieldsMap.get(fs.DeveloperName) || [];
    fields.forEach((f, idx) => {
      cnt++;
      detailRows.push({
        "No": cnt,
        "FieldSet": fs.DeveloperName,
        "順序": idx + 1,
        "項目 API 名": f.field || f.name || "",
        "ラベル": f.label || "",
        "型": f.type ? fieldTypeJa(f.type, (f.referenceTo || [])[0]) : "",
        "必須": f.required ? "○" : "",
        "DB必須": f.dbRequired ? "○" : "",
      });
    });
  }

  // 5. 凡例セクション
  const fsLegend = [
    ["フィールドセットとは", "オブジェクト内の複数項目を 1 つの名前付きセットにまとめる仕組み。LWC/VF/Apex から動的に「表示すべき項目」を取得できる"],
    ["主な用途 (LWC)", "lightning-record-edit-form の field-set 指定や、テーブルの動的列構築で使う。管理者が画面を変更してもコードは変更不要"],
    ["主な用途 (Visualforce)", "<apex:repeat> や <apex:pageBlockTable> で動的にフィールドを描画する際のループソース"],
    ["含む項目数", "描画時に表示される displayedFields の件数 (describe API より取得)"],
    ["必須項目数", "FieldSet 内で「必須」フラグ付きの項目数 (UI 入力必須)"],
    ["DB必須", "オブジェクト定義側で必須 (nillable=false) の項目"],
    ["管理画面", "Setup → オブジェクト → フィールドセット で作成・並び替えが可能"],
    ["注意点", "削除時は依存する LWC/VF/Apex のコンパイルエラーになる可能性あり"],
  ];

  // 6. サマリ (note 用)
  const totalFieldsCount = detailRows.length;
  const emptyFsCount = records.filter((fs) => {
    const ns = fs.NamespacePrefix || "";
    const lookupName = ns ? `${ns}__${fs.DeveloperName}` : fs.DeveloperName;
    const fields = setFieldsMap.get(lookupName) || setFieldsMap.get(fs.DeveloperName) || [];
    return fields.length === 0;
  }).length;
  const nsCount = new Set(records.map((fs) => fs.NamespacePrefix || "(自組織)")).size;

  const sections = [
    makeCoverSection({ docTitle: "フィールドセット一覧", target: obj, orgHost: host, revision: "初版" }),
    { heading: "0. 凡例", kvRows: fsLegend },
    { heading: "1. FieldSet (一覧)", headers, rows },
  ];
  // 中身項目リストを別シート (Excel ではシート別に分かれる)
  if (detailRows.length) {
    sections.push({ heading: "2. FieldSet 別 含まれる項目", headers: detailHeaders, rows: detailRows });
  } else if (records.length) {
    sections.push({ heading: "2. FieldSet 別 含まれる項目", kvRows: [["注意", "describe API から含まれる項目を取得できませんでした。Setup → オブジェクト → フィールドセット で確認してください。"]] });
  }

  return {
    title: `フィールドセット一覧: ${obj}`,
    type: "fieldSetList",
    sections,
    note: `合計 ${fmtNum(records.length)} 件 / 全項目数 ${fmtNum(totalFieldsCount)} 件${emptyFsCount ? ` / 空 FieldSet ${fmtNum(emptyFsCount)} 件 (要見直し候補)` : ""} / ネームスペース ${fmtNum(nsCount)} 種類。**業務担当者向け**: FieldSet は管理者が画面表示項目を後から変更できる仕組みです。シート「2. FieldSet 別 含まれる項目」で各 FieldSet がどの項目を持つか確認可能。**棚卸し用途**: 空 FieldSet (0 項目) は LWC/VF 側で参照されていれば不要、参照無しなら削除候補。**削除前注意**: LWC/Visualforce 画面から参照されている場合、削除すると画面エラーになります。Setup > オブジェクトマネージャ > 該当オブジェクト > フィールドセット で使用箇所を必ず確認してください。`,
  };
}

// ============ カスタム設定一覧 ============
// v3.136.0 Phase 226 (Team D): 各カスタム設定の「レコード件数」を追加 (ユーザー要望「業務品質まで強化」)
async function buildCustomSettingList({ host, sid, apiVersion, progress = () => {} }) {
  progress("カスタム設定メタデータを取得中...");
  const r = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, DeveloperName, MasterLabel, CustomSettingsType, Description, NamespacePrefix FROM CustomObject WHERE CustomSettingsType != null ORDER BY DeveloperName LIMIT 500`,
  });
  if (!r.ok) throw apiError("カスタム設定の取得に失敗しました", r);
  const typeMap = {
    "List": "List 型 (組織共通の定数表)",
    "Hierarchy": "Hierarchy 型 (組織/プロファイル/ユーザ毎に上書き可)",
  };
  const records = r.data.records || [];

  // Phase 226: 各カスタム設定のレコード件数を COUNT() で取得
  // 大量の COUNT クエリを直列で投げる (1 件あたり ~100ms 程度、500 件で 50 秒最悪)
  // 業務利用上 200 件程度想定、進捗表示で許容
  progress(`各カスタム設定のレコード件数を取得中... (${records.length} 件)`);
  const recordCounts = new Map(); // DeveloperName(+ns) → record count
  const errors = new Map();        // DeveloperName → error msg
  for (let i = 0; i < records.length; i++) {
    const c = records[i];
    const apiName = (c.NamespacePrefix ? c.NamespacePrefix + "__" : "") + c.DeveloperName + "__c";
    progress(`レコード件数を取得中 (${i + 1}/${records.length}): ${apiName}`);
    try {
      const cr = await runSoql({
        host, sid, apiVersion,
        soql: `SELECT COUNT() FROM ${apiName}`,
      });
      if (cr.ok) {
        recordCounts.set(apiName, cr.data.totalSize != null ? cr.data.totalSize : 0);
      } else {
        errors.set(apiName, `HTTP ${cr.status}`);
        recordCounts.set(apiName, null); // 取得失敗
      }
    } catch (e) {
      errors.set(apiName, e.message || String(e));
      recordCounts.set(apiName, null);
    }
  }

  const headers = ["No", "API 名", "ラベル", "種別", "ネームスペース", "レコード件数", "状態", "説明"];
  const rows = records.map((c, i) => {
    const apiName = (c.NamespacePrefix ? c.NamespacePrefix + "__" : "") + c.DeveloperName + "__c";
    const cnt = recordCounts.get(apiName);
    const stateLabel = cnt == null
      ? "✗ 取得失敗"
      : cnt === 0
        ? "△ 空 (未使用候補)"
        : "○ 利用中";
    return {
      "No": i + 1,
      "API 名": apiName,
      "ラベル": c.MasterLabel,
      "種別": typeMap[c.CustomSettingsType] || c.CustomSettingsType,
      "ネームスペース": c.NamespacePrefix || "(なし: カスタム)",
      "レコード件数": cnt == null ? "—" : fmtNum(cnt),
      "状態": stateLabel,
      "説明": fmtTrunc(c.Description || "", 200),
    };
  });
  const legend = [
    ["カスタム設定とは", "Apex/フロー/数式から高速にアクセスできるキー値ストア。標準オブジェクトより SOQL Limit を消費しない"],
    ["List 型", "組織全体で共通の定数表 (例: 国コード、税率テーブル)。レコードに『Name』だけがキー"],
    ["Hierarchy 型", "組織 → プロファイル → ユーザの順で上書き可能。ユーザ毎に異なる値を返したい時に使用 (例: API キー)"],
    ["レコード件数", "各カスタム設定オブジェクトに登録されているレコード数 (COUNT() で取得)。0 件は未使用候補"],
    ["状態", "○ 利用中 = レコードあり / △ 空 = レコード 0 件 (削除候補) / ✗ 取得失敗 = SOQL 権限不足の可能性"],
    ["カスタムメタデータとの違い", "カスタム設定はレコード=データ、カスタムメタデータはレコード=メタ定義 (デプロイ可能)。新規実装は CustomMetadata 推奨"],
  ];
  // サマリ集計
  const listCount = records.filter((c) => c.CustomSettingsType === "List").length;
  const hierarchyCount = records.filter((c) => c.CustomSettingsType === "Hierarchy").length;
  const emptyCount = Array.from(recordCounts.values()).filter((v) => v === 0).length;
  const failedCount = Array.from(recordCounts.values()).filter((v) => v == null).length;
  const totalRecords = Array.from(recordCounts.values()).filter((v) => v != null).reduce((s, v) => s + v, 0);
  return {
    title: "カスタム設定一覧 (レコード件数付き)",
    type: "customSettingList",
    sections: [
      makeCoverSection({ docTitle: "カスタム設定一覧", target: "組織全体 (全 CustomSetting)", orgHost: host, revision: "初版" }),
      { heading: "0. 凡例", kvRows: legend },
      { heading: "1. CustomSetting", headers, rows },
    ],
    note: `合計 ${fmtNum(rows.length)} 件 / List 型 ${fmtNum(listCount)} 件 / Hierarchy 型 ${fmtNum(hierarchyCount)} 件 / 全レコード数 ${fmtNum(totalRecords)} 件 / **空 (0 件) ${fmtNum(emptyCount)} 件 (削除候補)** / 取得失敗 ${fmtNum(failedCount)} 件。**業務担当者向け**: 「状態」列で △ 空 のカスタム設定は実利用されていない可能性が高く、削除候補です。**Salesforce は新規実装にカスタムメタデータ型を推奨** (デプロイ可能・キャッシュ可能のため)。本一覧は既存資産確認・移行計画作成・棚卸し用途にご活用ください。Hierarchy 型はユーザー別/プロファイル別の上書き値があるため、ユーザー個別設定の洗い出しに有用です。`,
  };
}

// ============ ER 図 (Mermaid) ============
// v3.142.0 Phase 232 (Team D): 2-hop オプション / Master-Detail のみフィルタ追加
async function buildErDiagram({ host, sid, apiVersion, obj, progress = () => {}, erDepth = 1, erMdOnly = false }) {
  requireInput(obj, "基点となるオブジェクト API 名 (例: Account)");
  const depth = Math.max(1, Math.min(2, erDepth || 1)); // 1 or 2 のみ
  const mdOnly = !!erMdOnly;

  // Mermaid ER 図用エスケープヘルパー
  const mid = (s) => String(s || "").replace(/[^A-Za-z0-9_]/g, "_"); // 識別子: 英数字+_
  const mlabel = (s) => String(s || "")
    .replace(/\\/g, "").replace(/"/g, "'").replace(/\r?\n/g, " ").replace(/[\x00-\x1F]/g, "");

  const lines = ["erDiagram"];
  const seen = new Set();
  const fetchedDescribes = new Map(); // name → describe data

  // 1 オブジェクトの describe を取得 (キャッシュ付き)
  const fetchDescribe = async (name) => {
    if (fetchedDescribes.has(name)) return fetchedDescribes.get(name);
    const r = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/sobjects/${encodeURIComponent(name)}/describe` });
    if (!r.ok) {
      // 個別失敗は警告ログだけ残して空 describe で続行 (2-hop での権限差・存在差対応)
      console.warn(`[ER 図] ${name} の describe 取得失敗 (HTTP ${r.status})`);
      fetchedDescribes.set(name, null);
      return null;
    }
    fetchedDescribes.set(name, r.data);
    return r.data;
  };

  // 起点 (起点だけ詳細項目を出す)
  progress(`describe 取得中: ${obj}`);
  const rootData = await fetchDescribe(obj);
  if (!rootData) throw new Error(`HTTP 404 起点オブジェクト '${obj}' の describe 取得に失敗しました`);
  seen.add(rootData.name);

  // 集計用カウンタ (起点とその先で別集計)
  let parentMD = 0, parentLookup = 0, childMD = 0, childLookup = 0;
  let childTotalCnt = 0, childTruncated = false;
  let hop2MD = 0, hop2Lookup = 0;

  // 1 オブジェクトの参照関係を Mermaid に追加 (起点もしくは hop2 用)
  // isRoot=true なら 親/子 両方 / 起点項目を出力、isRoot=false なら必要な関係のみ
  const addRelations = async (name, isRoot) => {
    const d = await fetchDescribe(name);
    if (!d) return [];
    const newlyReachable = []; // 次 hop の候補
    // 親方向 (この obj が子側) — reference 項目で参照先を辿る
    const refs = (d.fields || []).filter((f) => f.type === "reference" && (f.referenceTo || []).length);
    refs.forEach((f) => {
      (f.referenceTo || []).forEach((to) => {
        const isMD = f.relationshipName && !f.nillable && (f.cascadeDelete || f.writeRequiresMasterRead);
        if (mdOnly && !isMD) return; // MD-only フィルタ
        const arrow = isMD ? `}|--||` : `}o--||`;
        const kind = isMD ? "MD" : "Lookup";
        const hopLabel = isRoot ? kind : `${kind}・2hop`;
        lines.push(`    ${mid(name)} ${arrow} ${mid(to)} : "${mlabel(f.name)} (${hopLabel})"`);
        if (!seen.has(to)) newlyReachable.push(to);
        seen.add(to);
        if (isRoot) {
          if (isMD) parentMD++; else parentLookup++;
        } else {
          if (isMD) hop2MD++; else hop2Lookup++;
        }
      });
    });
    // 子方向 (childRelationships) — 起点のみ表示 (2-hop で全子参照を辿るとグラフ爆発)
    if (isRoot) {
      const allChildren = (d.childRelationships || []).filter((c) => c.childSObject);
      childTotalCnt = allChildren.length;
      if (childTotalCnt > 30) childTruncated = true;
      allChildren.slice(0, 30).forEach((c) => {
        const isMD = !!c.cascadeDelete;
        if (mdOnly && !isMD) return;
        const arrow = isMD ? `||--|{` : `||--o{`;
        const kind = isMD ? "MD" : "Lookup";
        lines.push(`    ${mid(name)} ${arrow} ${mid(c.childSObject)} : "${mlabel(c.field)} (${kind})"`);
        if (!seen.has(c.childSObject)) newlyReachable.push(c.childSObject);
        seen.add(c.childSObject);
        if (isMD) childMD++; else childLookup++;
      });
    }
    return newlyReachable;
  };

  // 起点処理 → 1-hop で見つかった他オブジェクトを記録
  const hop1Reachable = await addRelations(rootData.name, true);

  // depth=2 なら、1-hop で到達したオブジェクトの 親方向だけ追加 (子方向は爆発するので除外)
  if (depth >= 2 && hop1Reachable.length > 0) {
    // 最大 15 オブジェクトに制限 (API コール数と Mermaid 可読性を考慮)
    const targets = hop1Reachable.slice(0, 15);
    for (const t of targets) {
      progress(`2-hop describe 取得中: ${t}`);
      await addRelations(t, false);
    }
  }

  // 各エンティティに API 名表示用の空ブロック (起点は項目ヘッダー、その他は空)
  Array.from(seen).forEach((name) => {
    lines.push(`    ${mid(name)} {`);
    if (name === rootData.name) {
      (rootData.fields || []).slice(0, 8).forEach((f) => {
        lines.push(`        ${sanitizeType(f.type)} ${mid(f.name)} "${mlabel(f.label)}"`);
      });
    }
    lines.push(`    }`);
  });

  const mermaid = lines.join("\n");
  const parentTotal = parentMD + parentLookup;
  const childRendered = childMD + childLookup;
  const hop2Total = hop2MD + hop2Lookup;
  const truncMsg = childTruncated ? ` (うち ${fmtNum(childTotalCnt - 30)} 件は表示省略・childRelationships 上限 30 件)` : "";
  const filterMsg = mdOnly ? " / **Master-Detail のみフィルタ ON**" : "";
  const erLegend = [
    ["||--o{", "Lookup (任意参照) — 親なしでも子だけ存在可。例: Account ⇔ Case"],
    ["||--|{", "Master-Detail (必須参照・カスケード削除) — 親削除時に子も自動削除。例: Order ⇔ OrderItem"],
    ["親方向参照", "本オブジェクトが「子」側になる参照 (上位のレコード)"],
    ["子方向参照", "本オブジェクトが「親」側になる参照 (下位のレコード、削除時影響あり)"],
    ["depth=1 (1-hop)", "起点オブジェクトから直接参照される 1 階層のみを表示"],
    ["depth=2 (2-hop)", "1-hop の親側オブジェクトの「親方向参照」もたどる (子方向は爆発するため除外、最大 15 オブジェクト)"],
    ["MD only", "Master-Detail 関係のみ表示し Lookup を隠すフィルタ (削除影響範囲の把握に便利)"],
    ["可視化方法", "https://mermaid.live に貼り付けると視覚的な ER 図が描画されます"],
  ];
  const titleSuffix = `${depth}-hop${mdOnly ? " / MD only" : ""}`;
  return {
    title: `ER 図: ${rootData.label} (${rootData.name}) を起点とした ${titleSuffix}`,
    type: "erDiagram",
    sections: [
      makeCoverSection({ docTitle: "ER 図", target: `${rootData.label} (${rootData.name}) を起点とした ${titleSuffix}`, orgHost: host, revision: "初版" }),
      { heading: "0. 凡例", kvRows: erLegend },
      { heading: "1. ER 図 (Mermaid)", mermaid },
    ],
    note: `関連エンティティ ${fmtNum(seen.size - 1)} 件 / 親方向参照 ${fmtNum(parentTotal)} 件 (MD ${fmtNum(parentMD)} + Lookup ${fmtNum(parentLookup)}) / 子方向参照 ${fmtNum(childRendered)} 件 (MD ${fmtNum(childMD)} + Lookup ${fmtNum(childLookup)})${truncMsg}${depth >= 2 ? ` / 2-hop 親方向参照 ${fmtNum(hop2Total)} 件 (MD ${fmtNum(hop2MD)} + Lookup ${fmtNum(hop2Lookup)})` : ""}${filterMsg}。**業務担当者向け**: 本図はデータ連携の依存関係を示します。**Master-Detail (必須参照・カスケード削除)** = 親レコード削除時に子も自動削除される強い結合。**Lookup (任意参照)** = 親なしでも子だけ存在可能な弱い結合。要件定義書や移行計画でデータ削除順序の検討にご活用ください。**Phase 232**: 2-hop オプションと MD のみフィルタを追加 — depth=2 でデータ削除影響範囲を 2 階層先まで可視化、MD only でカスケード削除の伝播経路を強調表示。**可視化**: https://mermaid.live に貼り付け。`,
  };
}

function sanitizeType(t) {
  return (t || "string").replace(/[^A-Za-z0-9_]/g, "_");
}

// =============================================================================
// プロファイル / 権限セット 詳細レポート (Salesforce Profile Reader 互換)
// =============================================================================
// 引数 obj には Profile 名 or PermissionSet API 名 を入れる。
// 「<プロファイル名>」または「@<PermissionSet API名>」(@ プレフィックスで権限セット)
async function buildProfileDetail({ host, sid, apiVersion, obj, progress = () => {} }) {
  requireInput(obj, "プロファイル名 (例: 営業ユーザー) または『@PermSet_API名』形式");
  progress("対象 PermissionSet を検索中...");

  const isPermSet = obj.startsWith("@");
  const lookupName = isPermSet ? obj.substring(1) : obj;

  // 1. 対象 PermissionSet を特定 (Profile は IsOwnedByProfile=true の PermissionSet として存在)
  let psSoql;
  if (isPermSet) {
    psSoql = `SELECT Id, Name, Label, IsOwnedByProfile, License.Name, Description FROM PermissionSet WHERE Name='${lookupName.replace(/'/g, "\\'")}' AND IsOwnedByProfile=false LIMIT 1`;
  } else {
    psSoql = `SELECT Id, Name, Label, IsOwnedByProfile, Profile.Name, Profile.UserLicense.Name, Profile.UserType, Profile.Description FROM PermissionSet WHERE IsOwnedByProfile=true AND Profile.Name='${lookupName.replace(/'/g, "\\'")}' LIMIT 1`;
  }
  const psR = await runSoql({ host, sid, apiVersion, soql: psSoql });
  if (!psR.ok) throw apiError("権限セットの取得に失敗しました", psR);
  const ps = (psR.data.records || [])[0];
  if (!ps) throw new Error(`HTTP 404 ${isPermSet ? "権限セット" : "プロファイル"} '${lookupName}' が見つかりません`);
  const psId = ps.Id;
  const targetType = ps.IsOwnedByProfile ? "プロファイル" : "権限セット";
  const targetName = ps.IsOwnedByProfile ? (ps.Profile ? ps.Profile.Name : ps.Name) : (ps.Label || ps.Name);

  // 2. PermissionSet 全フィールド (System 権限) を describe で取得し、ON のものを抽出
  const sysR = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/sobjects/PermissionSet/${psId}` });
  const systemPerms = [];
  if (sysR.ok && sysR.data) {
    for (const [k, v] of Object.entries(sysR.data)) {
      if (k.startsWith("Permissions") && v === true) {
        systemPerms.push({ "権限名": k.replace(/^Permissions/, ""), "ON/OFF": "ON" });
      }
    }
  }

  // 3. ObjectPermissions
  const opR = await fetchAllPaged({ host, sid, apiVersion,
    soql: `SELECT SObjectType, PermissionsRead, PermissionsCreate, PermissionsEdit, PermissionsDelete, PermissionsViewAllRecords, PermissionsModifyAllRecords FROM ObjectPermissions WHERE ParentId='${psId}' ORDER BY SObjectType`,
  });
  const objHeaders = ["オブジェクト", "Read", "Create", "Edit", "Delete", "ViewAll", "ModifyAll"];
  const objRows = (opR.records || []).map((r) => ({
    "オブジェクト": r.SObjectType,
    "Read": r.PermissionsRead ? "○" : "",
    "Create": r.PermissionsCreate ? "○" : "",
    "Edit": r.PermissionsEdit ? "○" : "",
    "Delete": r.PermissionsDelete ? "○" : "",
    "ViewAll": r.PermissionsViewAllRecords ? "○" : "",
    "ModifyAll": r.PermissionsModifyAllRecords ? "○" : "",
  }));

  // 4. FieldPermissions (FLS) — このプロファイル/権限セットの全フィールド
  const fpR = await fetchAllPaged({ host, sid, apiVersion,
    soql: `SELECT SObjectType, Field, PermissionsRead, PermissionsEdit FROM FieldPermissions WHERE ParentId='${psId}' ORDER BY SObjectType, Field`,
  });
  const fldHeaders = ["オブジェクト", "フィールド API 名", "Read", "Edit", "アクセス"];
  const fldRows = (fpR.records || []).map((r) => ({
    "オブジェクト": r.SObjectType,
    "フィールド API 名": (r.Field || "").replace(/^[^.]+\./, ""),
    "Read": r.PermissionsRead ? "○" : "",
    "Edit": r.PermissionsEdit ? "○" : "",
    "アクセス": r.PermissionsEdit ? "RW (Read + Edit)" : (r.PermissionsRead ? "R (Read のみ)" : "アクセス無し"),
  }));

  // 5. Apex クラスアクセス / VF ページアクセス (SetupEntityAccess)
  const seaR = await fetchAllPaged({ host, sid, apiVersion,
    soql: `SELECT SetupEntityType, SetupEntityId FROM SetupEntityAccess WHERE ParentId='${psId}'`,
  });
  // SetupEntityId は ApexClass / ApexPage / TabSet / NamedCredential など。名前解決のため別途引く
  const apexIds = [];
  const vfIds = [];
  const otherEntities = [];
  for (const r of (seaR.records || [])) {
    if (r.SetupEntityType === "ApexClass") apexIds.push(r.SetupEntityId);
    else if (r.SetupEntityType === "ApexPage") vfIds.push(r.SetupEntityId);
    else otherEntities.push({ "種別": r.SetupEntityType, "Id": r.SetupEntityId });
  }
  let apexRows = []; let vfRows = [];
  if (apexIds.length) {
    const ids = apexIds.map((i) => `'${i}'`).join(",");
    const rr = await runSoql({ host, sid, apiVersion, tooling: true,
      soql: `SELECT Id, Name, NamespacePrefix FROM ApexClass WHERE Id IN (${ids}) ORDER BY Name`,
    });
    if (rr.ok) apexRows = (rr.data.records || []).map((r, i) => ({ "No": i + 1, "クラス名": r.Name, "Namespace": r.NamespacePrefix || "" }));
  }
  if (vfIds.length) {
    const ids = vfIds.map((i) => `'${i}'`).join(",");
    const rr = await runSoql({ host, sid, apiVersion,
      soql: `SELECT Id, Name, NamespacePrefix FROM ApexPage WHERE Id IN (${ids}) ORDER BY Name`,
    });
    if (rr.ok) vfRows = (rr.data.records || []).map((r, i) => ({ "No": i + 1, "VF Page": r.Name, "Namespace": r.NamespacePrefix || "" }));
  }

  // 6. Tab 設定 (PermissionSetTabSetting)
  const tabR = await runSoql({ host, sid, apiVersion,
    soql: `SELECT Name, Visibility FROM PermissionSetTabSetting WHERE ParentId='${psId}' ORDER BY Name`,
  });
  const tabRows = ((tabR.ok && tabR.data.records) || []).map((t, i) => ({
    "No": i + 1, "タブ": t.Name, "可視性": t.Visibility,
  }));

  // 7. レコードタイプ可視性 (PermissionSet → assignedRecordTypes 系は API 限定的なので RecordTypeVisibility を試行)
  let rtRows = [];
  try {
    const rtR = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/tooling/query/?q=` +
      encodeURIComponent(`SELECT Id, RecordTypeId, RecordType.DeveloperName, RecordType.SobjectType, Visible, IsDefault FROM PermissionSetRecordTypeVisibility WHERE ParentId='${psId}' ORDER BY RecordType.SobjectType, RecordType.DeveloperName`) });
    if (rtR.ok) {
      rtRows = (rtR.data.records || []).map((rt, i) => ({
        "No": i + 1,
        "オブジェクト": rt.RecordType ? rt.RecordType.SobjectType : "",
        "RecordType": rt.RecordType ? rt.RecordType.DeveloperName : "",
        "Visible": rt.Visible ? "○" : "",
        "Default": rt.IsDefault ? "○" : "",
      }));
    }
  } catch {}

  // 8. ApplicationVisibility (PermissionSet → Application 可視性) — Tooling 経由
  let appRows = [];
  try {
    const appR = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/tooling/query/?q=` +
      encodeURIComponent(`SELECT Application, Visible, IsDefault FROM PermissionSetApplicationVisibility WHERE ParentId='${psId}' ORDER BY Application`) });
    if (appR.ok) {
      appRows = (appR.data.records || []).map((a, i) => ({
        "No": i + 1, "アプリケーション": a.Application, "Visible": a.Visible ? "○" : "", "Default": a.IsDefault ? "○" : "",
      }));
    }
  } catch {}

  // === サマリ ===
  const summary = [
    ["種別", targetType],
    ["名前", targetName],
    ["ラベル", ps.Label || ""],
    ["ライセンス", isPermSet ? (ps.License ? ps.License.Name : "") : (ps.Profile && ps.Profile.UserLicense ? ps.Profile.UserLicense.Name : "")],
    ["UserType", (!isPermSet && ps.Profile && ps.Profile.UserType) || ""],
    ["説明", isPermSet ? (ps.Description || "") : (ps.Profile && ps.Profile.Description || "")],
    ["PermissionSet Id", psId],
    ["生成日時", new Date().toLocaleString("ja-JP")],
    ["集計件数 Object 権限", fmtNum(objRows.length) + " 件"],
    ["集計件数 Field 権限 (FLS)", fmtNum(fldRows.length) + " 件"],
    ["集計件数 System 権限 ON", fmtNum(systemPerms.length) + " 件"],
    ["集計件数 Apex Class アクセス", fmtNum(apexRows.length) + " 件"],
    ["集計件数 VF Page アクセス", fmtNum(vfRows.length) + " 件"],
    ["集計件数 Tab 設定", fmtNum(tabRows.length) + " 件"],
    ["集計件数 RecordType 可視性", fmtNum(rtRows.length) + " 件"],
    ["集計件数 App 可視性", fmtNum(appRows.length) + " 件"],
  ];

  // v3.36.0: 凡例セクション追加 (業務担当者向け権限略号の説明)
  const profDetailLegend = [
    ["Object 権限 C/R/E/D", "Create / Read / Edit / Delete — 標準 CRUD 権限"],
    ["Object 権限 V/M", "ViewAllRecords / ModifyAllRecords — 全レコード参照/編集 (高権限・要監査)"],
    ["FLS R/E", "Read=参照可能 / Edit=編集可能 (項目レベルセキュリティ)"],
    ["System 権限", "ApiEnabled / EditPublicReports 等の組織横断機能アクセス権"],
    ["Tab 設定", "DefaultOn=デフォルト表示 / DefaultOff=非表示既定 / Hidden=完全非表示"],
    ["App 可視性", "Lightning/Classic アプリの利用可否"],
  ];
  const sections = [];
  sections.push(makeCoverSection({ docTitle: `${targetType}詳細レポート`, target: targetName, orgHost: host, revision: "初版" }));
  sections.push({ heading: "0. 凡例", kvRows: profDetailLegend });
  sections.push({ heading: "1.サマリ", kvRows: summary });
  if (objRows.length) sections.push({ heading: "2.Object 権限", headers: objHeaders, rows: objRows });
  if (fldRows.length) sections.push({ heading: "3.項目レベルセキュリティ (FLS)", headers: fldHeaders, rows: fldRows });
  if (systemPerms.length) sections.push({ heading: "4.System 権限 (ON のみ)", headers: ["権限名", "ON/OFF"], rows: systemPerms });
  if (apexRows.length) sections.push({ heading: "5.Apex Class アクセス", headers: Object.keys(apexRows[0]), rows: apexRows });
  if (vfRows.length) sections.push({ heading: "6.VF Page アクセス", headers: Object.keys(vfRows[0]), rows: vfRows });
  if (tabRows.length) sections.push({ heading: "7.Tab 設定", headers: Object.keys(tabRows[0]), rows: tabRows });
  if (rtRows.length) sections.push({ heading: "8.RecordType 可視性", headers: Object.keys(rtRows[0]), rows: rtRows });
  if (appRows.length) sections.push({ heading: "9.App 可視性", headers: Object.keys(appRows[0]), rows: appRows });

  return {
    title: `${targetType}詳細レポート: ${targetName}`,
    type: "profileDetail",
    sections,
    note: `**業務担当者向け**: Excel 形式での出力を推奨します (各章が別シートに分かれます)。プロファイル名指定なら '営業ユーザー'、権限セットなら '@MyPermSet_API名' のように @ を先頭に付けてください。**用途**: 年次セキュリティ監査・新規ユーザー権限設計・ロール変更時の影響範囲確認 等。各章 (1.オブジェクト権限 / 2.FLS / 3.Apex 4.VF 5.タブ 6.SOQL 7.外部参照 8.IP 9.App 可視性) を分けて承認回付できます。`,
  };
}

// =============================================================================
// FLS レポート (1オブジェクト × 全 Profile/PermSet)。fieldPermMatrix と似るが、
// フィールド毎に「Read 可能なロール一覧」「Edit 可能なロール一覧」を縦持ちで出す書き方
// =============================================================================
async function buildFlsReport({ host, sid, apiVersion, obj, progress = () => {} }) {
  requireInput(obj, "オブジェクト API 名 (例: Account)");
  progress("describe 取得中...");
  const dr = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/sobjects/${encodeURIComponent(obj)}/describe` });
  if (!dr.ok) throw apiError(`オブジェクト '${obj}' の describe 取得に失敗しました`, dr);
  progress("FieldPermissions 取得中...");
  // v2.98.0: タイプを日本語化、reference は参照先 (referenceTo[0]) を含める
  const allFields = (dr.data.fields || [])
    .filter((f) => !f.calculated && f.type !== "id")
    .map((f) => ({
      name: f.name,
      label: f.label,
      type: f.type,
      typeJa: fieldTypeJa(f.type, (f.referenceTo || [])[0]),
      required: !f.nillable && !f.defaultedOnCreate && f.createable,
    }));

  const fpR = await fetchAllPaged({ host, sid, apiVersion,
    soql: `SELECT Field, PermissionsRead, PermissionsEdit, Parent.Name, Parent.IsOwnedByProfile, Parent.Profile.Name, Parent.Label FROM FieldPermissions WHERE SobjectType='${obj.replace(/'/g, "\\'")}'`,
  });

  // v2.89.0: profileReader 互換のマトリクス形式 (項目 × プロファイル/権限セット)
  // 行 = 項目、列 = 各プロファイル + 各権限セット、セル = RW / R / -- 表示
  // 元実装は「件数 + 内訳文字列」だったが、ユーザー要望「権限セット・プロファイル × 項目への権限で表現」に対応
  const profileSet = new Set(); // プロファイル名のセット
  const permsetSet = new Set(); // 権限セット名のセット
  const grid = new Map(); // fieldName -> { [parentLabel]: "RW"|"R"|"--" }
  for (const rec of (fpR.records || [])) {
    if (!rec.Parent) continue;
    const isP = !!rec.Parent.IsOwnedByProfile;
    // プロファイル名は Parent.Profile.Name (PermissionSet で IsOwnedByProfile=true の場合) を優先
    const rawName = isP ? ((rec.Parent.Profile && rec.Parent.Profile.Name) || rec.Parent.Name) : (rec.Parent.Label || rec.Parent.Name);
    const col = (isP ? "👤 " : "🔑 ") + rawName;
    if (isP) profileSet.add(col); else permsetSet.add(col);
    const fld = (rec.Field || "").replace(/^[^.]+\./, "");
    if (!grid.has(fld)) grid.set(fld, {});
    const cell = rec.PermissionsEdit ? "RW" : (rec.PermissionsRead ? "R" : "--");
    grid.get(fld)[col] = cell;
  }
  // 列順: プロファイル (ソート) → 権限セット (ソート)
  const profileCols = Array.from(profileSet).sort();
  const permsetCols = Array.from(permsetSet).sort();
  const allCols = [...profileCols, ...permsetCols];

  const headers = ["No", "項目 API 名", "ラベル", "タイプ", "必須", ...allCols];
  const rows = allFields.map((f, i) => {
    const g = grid.get(f.name) || {};
    const row = {
      "No": i + 1,
      "項目 API 名": f.name,
      "ラベル": f.label,
      "タイプ": f.typeJa, // v2.98.0: 日本語化 (参照関係(Contact) / チェックボックス / 文字列 / 選択リスト 等)
      "必須": f.required ? "○" : "",
    };
    // 各列のセルを設定。レコードが無い場合は "--" (アクセス無し)
    for (const col of allCols) row[col] = g[col] || "--";
    return row;
  });

  // サマリ集計 (note 用): 編集可 (RW あり) / 参照のみ (R のみ) / アクセス無し (-- のみ)
  let editAnyCount = 0, readOnlyCount = 0, noAccessCount = 0;
  for (const row of rows) {
    const cellVals = allCols.map((c) => row[c]);
    if (cellVals.includes("RW")) editAnyCount++;
    else if (cellVals.includes("R")) readOnlyCount++;
    else noAccessCount++;
  }

  // 凡例セクションを業務向けに拡充
  const legend = [
    ["FLS とは", "項目レベルセキュリティ。ユーザがレコード内の個別項目を『編集できる/参照のみ/見えない』を制御する仕組み"],
    ["👤 列", "プロファイル (ユーザに 1 つ適用される基礎権限)"],
    ["🔑 列", "権限セット (複数加算可・カスタム拡張)"],
    ["RW", "Read+Write — 値を画面・API で書き換え可能"],
    ["R", "Read のみ — 読み取り専用表示 / 書き換え不可"],
    ["--", "アクセス無し — 画面で項目が非表示 / API でも参照不可"],
    ["必須", "○ = 入力必須項目。FLS で参照のみでも保存時に値が必要"],
    ["除外項目", "計算項目 (formula) と Id 項目は FLS 制御対象外のため一覧から除外"],
    ["列順", "プロファイル → 権限セットの順。同種内はアルファベット順"],
    ["Excel 使い方", "B2 セルでウィンドウ枠固定 → 左 5 列 (No / 項目 / ラベル / 型 / 必須) と先頭行を固定して全列を横スクロール可"],
  ];

  // v2.98.0: 表紙セクションを冒頭に追加 (プロジェクト成果物レベル)
  const cover = makeCoverSection({
    docTitle: "項目レベルセキュリティ (FLS) レポート",
    target: `${obj} (${dr.data.label || obj})`,
    orgHost: host,
    revision: "初版",
  });

  return {
    title: `項目レベルセキュリティ (FLS) レポート: ${obj} (権限セット × プロファイル マトリクス)`,
    type: "flsReport",
    sections: [
      cover,
      { heading: "0. 凡例", kvRows: legend },
      { heading: "1. FLS マトリクス (項目 × 権限主体)", headers, rows },
    ],
    note: `対象 ${fmtNum(rows.length)} 項目 / 列 ${fmtNum(allCols.length)} (プロファイル ${fmtNum(profileCols.length)} + 権限セット ${fmtNum(permsetCols.length)}) / 編集可 (RW あり) ${fmtNum(editAnyCount)} 項目 (${fmtPercent(editAnyCount / Math.max(rows.length, 1))}) / 参照のみ ${fmtNum(readOnlyCount)} 項目 (${fmtPercent(readOnlyCount / Math.max(rows.length, 1))}) / アクセス無し ${fmtNum(noAccessCount)} 項目 (${fmtPercent(noAccessCount / Math.max(rows.length, 1))})。**業務担当者向け**: 項目レベルセキュリティ (FLS) は「誰がどの項目を見られる/編集できるか」を制御する仕組みです。本マトリクスは項目 × 権限主体 (プロファイル/権限セット) で参照可・編集可・アクセス無しを一目把握可能。**用途**: 機微情報 (個人情報/契約金額/評価) の参照権限棚卸し、年次セキュリティ監査、新規ユーザー権限申請時の影響範囲確認、ProfileReader 等の他ツールとの比較資料 (同等フォーマット採用)。**Excel 推奨**: ウィンドウ枠固定 (B2) で左 5 列 + 先頭行を固定。`,
  };
}

// ============ アプリケーション一覧 ============
async function buildAppList({ host, sid, apiVersion }) {
  // UI 種別マップ
  const uiTypeMap = {
    "Aloha": "Aloha (Classic UI)",
    "Lightning": "Lightning Experience",
  };
  // ナビ種別マップ
  const navTypeMap = {
    "Standard": "標準ナビ (タブのみ)",
    "Console": "コンソール (タブ + サブタブ + ホバー)",
  };
  // AppMenuItem 種別マップ
  const menuTypeMap = {
    "TabSet": "タブセット (Salesforce アプリ)",
    "Connected": "Connected App (外部アプリ連携)",
    "ServiceProvider": "Service Provider (SAML 等)",
    "Network": "Experience Cloud サイト",
  };

  // Tooling: CustomApplication (Lightning + Classic) + AppDefinition (Lightning Apps の正規)
  const r = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, DeveloperName, MasterLabel, NamespacePrefix, UiType, NavType, ProfileId, Description FROM AppDefinition ORDER BY MasterLabel LIMIT 500`,
  });
  if (!r.ok) throw apiError("アプリケーション定義の取得に失敗しました", r);
  const appRecords = r.data.records || [];
  const headers = ["No", "API 名", "ラベル", "ネームスペース", "UI 種別", "ナビゲーション", "説明"];
  const rows = appRecords.map((a, i) => ({
    "No": i + 1,
    "API 名": a.DeveloperName,
    "ラベル": a.MasterLabel,
    "ネームスペース": a.NamespacePrefix || "(なし: カスタム)",
    "UI 種別": uiTypeMap[a.UiType] || a.UiType || "",
    "ナビゲーション": navTypeMap[a.NavType] || a.NavType || "",
    "説明": a.Description || "",
  }));

  // AppMenuItem (ユーザーに見えるアプリ)
  const m = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT Id, ApplicationId, Label, Name, Type, IsVisible, IsAccessible, SortOrder FROM AppMenuItem ORDER BY SortOrder NULLS LAST, Label LIMIT 200`,
  });
  const menuHeaders = ["No", "ラベル", "API 名", "種別", "App Launcher 表示", "アクセス可", "並び順"];
  const menuRecords = m.ok ? (m.data.records || []) : [];
  const menuRows = menuRecords.map((x, i) => ({
    "No": i + 1,
    "ラベル": x.Label || "",
    "API 名": x.Name || "",
    "種別": menuTypeMap[x.Type] || x.Type || "",
    "App Launcher 表示": x.IsVisible ? "○ 表示" : "− 非表示",
    "アクセス可": x.IsAccessible ? "○" : "−",
    "並び順": x.SortOrder == null ? "" : fmtNum(x.SortOrder),
  }));

  // v3.136.0 Phase 226 (Team D): プロファイル別の AppMenuItem 表示制御を AppMenuItemPicker から取得
  // 各 Profile (= PermissionSet IsOwnedByProfile=true) が「どのアプリを表示できるか」を確認
  // AppMenuItem (Lightning Apps) の Profile 毎の上書き設定は AppDefinition + Profile の組合せで決まる
  // ここでは Profile 数 × アプリ数の概要を提供
  let appProfileRows = [];
  try {
    const profR = await runSoql({
      host, sid, apiVersion,
      soql: `SELECT Id, Name FROM Profile ORDER BY Name LIMIT 200`,
    });
    // PermissionSetApplicationVisibility (Tooling) — プロファイル/権限セット別の App 可視性
    const psavR = await sfFetch({
      host, sid,
      path: `/services/data/v${apiVersion}/tooling/query/?q=` + encodeURIComponent(
        `SELECT Parent.Id, Parent.Label, Parent.Profile.Name, Parent.IsOwnedByProfile, Application, Visible, IsDefault FROM PermissionSetApplicationVisibility ORDER BY Parent.Profile.Name, Application LIMIT 5000`
      ),
    });
    if (psavR.ok) {
      // App ごとの「可視 Profile / 不可視 Profile」を集計
      const appVisMap = new Map(); // Application(API名) → { visibleProfiles: Set, hiddenProfiles: Set, defaultApp: Set }
      for (const rec of (psavR.data.records || [])) {
        if (!rec.Parent || !rec.Parent.IsOwnedByProfile) continue;
        const profName = rec.Parent.Profile ? rec.Parent.Profile.Name : "?";
        const appName = rec.Application;
        if (!appVisMap.has(appName)) appVisMap.set(appName, { visible: new Set(), hidden: new Set(), defaultIn: new Set() });
        const entry = appVisMap.get(appName);
        if (rec.Visible) entry.visible.add(profName); else entry.hidden.add(profName);
        if (rec.IsDefault) entry.defaultIn.add(profName);
      }
      // appRecords 順に並べる
      appProfileRows = appRecords
        .filter((a) => appVisMap.has(a.DeveloperName) || appVisMap.has(a.NamespacePrefix ? `${a.NamespacePrefix}__${a.DeveloperName}` : a.DeveloperName))
        .map((a, i) => {
          const key = appVisMap.has(a.DeveloperName) ? a.DeveloperName : `${a.NamespacePrefix}__${a.DeveloperName}`;
          const entry = appVisMap.get(key) || { visible: new Set(), hidden: new Set(), defaultIn: new Set() };
          const visList = Array.from(entry.visible).sort().slice(0, 10).join(", ") + (entry.visible.size > 10 ? ` ...(他 ${entry.visible.size - 10})` : "");
          const hidList = Array.from(entry.hidden).sort().slice(0, 5).join(", ") + (entry.hidden.size > 5 ? ` ...(他 ${entry.hidden.size - 5})` : "");
          const defList = Array.from(entry.defaultIn).sort().join(", ");
          return {
            "No": i + 1,
            "アプリ API 名": a.DeveloperName,
            "ラベル": a.MasterLabel,
            "可視 Profile 数": fmtNum(entry.visible.size),
            "可視 Profile (先頭10)": visList || "(無し)",
            "デフォルト指定 Profile": defList || "(無し)",
            "非可視 Profile 数": fmtNum(entry.hidden.size),
          };
        });
    }
  } catch (e) { console.warn("[buildAppList] Profile 別取得失敗:", e); }
  const appProfileHeaders = ["No", "アプリ API 名", "ラベル", "可視 Profile 数", "可視 Profile (先頭10)", "デフォルト指定 Profile", "非可視 Profile 数"];

  const legend = [
    ["アプリケーションとは", "Salesforce で機能をまとめた『画面パッケージ』。タブ構成・ユーティリティバー・ナビ種別等を定義"],
    ["AppDefinition", "全アプリのメタデータ。Classic / Lightning / 管理パッケージ提供分を含む"],
    ["AppMenuItem", "App Launcher (9 つの点アイコン) にユーザが見るリスト。並び順や表示/非表示を制御"],
    ["UI 種別", "Aloha = Classic UI、Lightning = Lightning Experience"],
    ["ナビゲーション", "標準ナビ = 通常のタブ表示、コンソール = サブタブ・ホバーで複数レコード並行操作"],
  ];

  return {
    title: "アプリケーション一覧 (Lightning + Classic + Profile 別可視性)",
    type: "appList",
    sections: [
      makeCoverSection({ docTitle: "アプリケーション一覧", target: "組織全体 (Lightning + Classic)", orgHost: host, revision: "初版" }),
      { heading: "0. 凡例", kvRows: legend },
      { heading: "1. AppDefinition (組織内全アプリ)", headers, rows },
      ...(menuRows.length ? [{ heading: "2. AppMenuItem (App Launcher 表示順)", headers: menuHeaders, rows: menuRows }] : []),
      ...(appProfileRows.length ? [{ heading: "3. Profile 別 アプリ可視性 (Phase 226 追加)", headers: appProfileHeaders, rows: appProfileRows }] : []),
    ],
    note: (() => {
      // v2.72.0: note サマリ拡充 - UI 種別 (Aloha/Lightning) と AppMenuItem 表示/非表示 + 種別別件数
      const lightning = appRecords.filter((a) => a.UiType === "Lightning").length;
      const aloha = appRecords.filter((a) => a.UiType === "Aloha").length;
      const otherUi = appRecords.length - lightning - aloha;
      const visibleMenu = menuRecords.filter((x) => x.IsVisible).length;
      const hiddenMenu = menuRecords.length - visibleMenu;
      const menuTypes = {};
      menuRecords.forEach((x) => {
        const k = x.Type || "(未分類)";
        menuTypes[k] = (menuTypes[k] || 0) + 1;
      });
      const menuTypeBreakdown = Object.keys(menuTypes).sort()
        .map((t) => `${menuTypeMap[t] || t} ${fmtNum(menuTypes[t])} 件`)
        .join(" / ");
      const menuSummary = menuRecords.length
        ? ` / AppMenuItem 種別内訳: ${menuTypeBreakdown} (表示 ${fmtNum(visibleMenu)} / 非表示 ${fmtNum(hiddenMenu)})`
        : "";
      return `AppDefinition ${fmtNum(appRecords.length)} 件 (Lightning ${fmtNum(lightning)} / Classic ${fmtNum(aloha)}${otherUi ? ` / その他 ${fmtNum(otherUi)}` : ""}) / AppMenuItem ${fmtNum(menuRecords.length)} 件${menuSummary}。**業務担当者向け**: アプリは Salesforce 上の業務領域 (営業/サービス/マーケ等) を分けるための枠組みです。App Launcher (Salesforce 右上の点 9 個メニュー) に表示される項目と一致します。Lightning と Classic の併存状況、Classic 廃止検討、業務領域ごとのアクセス権設計、不要アプリ整理に活用できます。「並び順」はプロファイル単位で別途上書き可能のため、プロファイル詳細レポートと合わせて確認してください。`;
    })(),
  };
}

// ============ アクセスコントロール定義書 (OWD / 共有設定 / Role hierarchy) ============
async function buildAccessControl({ host, sid, apiVersion }) {
  // v2.12.0: 業務向けに OWD 値を日本語+原文併記、凡例セクション追加
  const owdLabel = (v) => {
    const m = {
      "Private": "Private (非公開)",
      "Read": "Public Read (参照のみ全員可)",
      "ReadWrite": "Public Read/Write (全員参照/編集可)",
      "ReadWriteTransfer": "Public Read/Write/Transfer (リード等)",
      "FullAccess": "Public Full Access (キャンペーン等)",
      "ControlledByParent": "Controlled By Parent (親に従属)",
    };
    return v ? (m[v] || v) : "";
  };
  // 1. EntityDefinition: 各オブジェクトの InternalSharingModel / ExternalSharingModel
  const owdR = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT QualifiedApiName, Label, InternalSharingModel, ExternalSharingModel, IsCustomizable FROM EntityDefinition WHERE InternalSharingModel != null ORDER BY QualifiedApiName LIMIT 500`,
  });
  const owdHeaders = ["No", "API 名", "オブジェクト名", "内部共有 (OWD)", "外部共有 (OWD)", "カスタマイズ可否"];
  const owdRows = owdR.ok ? (owdR.data.records || []).map((e, i) => ({
    "No": i + 1,
    "API 名": e.QualifiedApiName,
    "オブジェクト名": e.Label,
    "内部共有 (OWD)": owdLabel(e.InternalSharingModel),
    "外部共有 (OWD)": owdLabel(e.ExternalSharingModel),
    "カスタマイズ可否": e.IsCustomizable ? "可" : "不可",
  })) : [];

  // 2. UserRole (ロール階層)
  const roleR = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT Id, Name, DeveloperName, ParentRoleId, OpportunityAccessForAccountOwner, CaseAccessForAccountOwner, ContactAccessForAccountOwner FROM UserRole ORDER BY Name LIMIT 500`,
  });
  const roleHeaders = ["No", "ロール名", "API 名", "親ロール Id", "商談アクセス (取引先所有者)", "ケースアクセス (取引先所有者)", "取引先責任者アクセス (取引先所有者)"];
  const accessLabel = (v) => {
    const m = {
      "None": "アクセス権なし",
      "Read": "参照のみ",
      "Edit": "参照・編集可",
      "ControlledByParent": "親に従属",
    };
    return v ? (m[v] || v) : "";
  };
  const roleRows = roleR.ok ? (roleR.data.records || []).map((r, i) => ({
    "No": i + 1,
    "ロール名": r.Name,
    "API 名": r.DeveloperName,
    "親ロール Id": r.ParentRoleId || "",
    "商談アクセス (取引先所有者)": accessLabel(r.OpportunityAccessForAccountOwner),
    "ケースアクセス (取引先所有者)": accessLabel(r.CaseAccessForAccountOwner),
    "取引先責任者アクセス (取引先所有者)": accessLabel(r.ContactAccessForAccountOwner),
  })) : [];

  // 3. 共有ルール (SharingRules はオブジェクト別だが、Tooling では SharingRules は metadata 経由のみ。Tooling/EntityDefinition から代用)
  // ここでは MA(MA= Manual Sharing 等) のあるオブジェクトを並べる
  const sharingObjs = owdRows.filter((r) => r["内部共有 (OWD)"] !== "ReadWrite" && r["内部共有 (OWD)"] !== "Read");
  const sharingHeaders = ["No", "オブジェクト", "内部 OWD", "外部 OWD", "備考"];
  const sharingRows = sharingObjs.map((r, i) => ({
    "No": i + 1,
    "オブジェクト": r["オブジェクト名"] || r["API 名"],
    "内部 OWD": r["内部共有 (OWD)"],
    "外部 OWD": r["外部共有 (OWD)"],
    "備考": (r["内部共有 (OWD)"] === "Private" ? "Private のため共有ルール推奨" :
             r["内部共有 (OWD)"] === "ControlledByParent" ? "親レコードに従属" : ""),
  }));

  // v3.136.0 Phase 226 (Team D): 4. Group / Queue (Public Group + Queue + Personal Group)
  // Salesforce では Group オブジェクトに 5 種類が混在:
  //   - Regular (Public Group), Queue, Role, RoleAndSubordinates, AllCustomerPortal 等
  // Type 別に分類し、所属メンバー件数も集計
  const groupTypeMap = {
    "Regular": "Public Group (パブリックグループ)",
    "Queue": "Queue (キュー)",
    "Role": "Role (ロール経由)",
    "RoleAndSubordinates": "Role + 部下 (階層下)",
    "RoleAndSubordinatesInternal": "Role + 部下 (内部のみ)",
    "AllCustomerPortal": "全カスタマーポータルユーザー",
    "PRMOrganization": "PRM 組織",
    "Manager": "マネージャ",
    "ManagerAndSubordinatesInternal": "マネージャ + 部下 (内部)",
    "Organization": "組織全体",
    "Territory": "Territory",
    "TerritoryAndSubordinates": "Territory + 部下",
  };
  let groupRows = [], queueRows = [];
  try {
    const grpR = await runSoql({
      host, sid, apiVersion,
      soql: `SELECT Id, Name, DeveloperName, Type, RelatedId, OwnerId, Email FROM Group ORDER BY Type, Name LIMIT 500`,
    });
    if (grpR.ok) {
      const allGroups = (grpR.data.records || []);
      // Public Group (Regular) — 業務的に最も重要
      groupRows = allGroups.filter((g) => g.Type === "Regular").map((g, i) => ({
        "No": i + 1,
        "Group 名 (Label)": g.Name,
        "API 名 (DeveloperName)": g.DeveloperName || "",
        "Email": g.Email || "",
        "Group Id": g.Id,
      }));
      // Queue — 業務 (Case / Lead) で頻繁に使用
      queueRows = allGroups.filter((g) => g.Type === "Queue").map((g, i) => ({
        "No": i + 1,
        "Queue 名 (Label)": g.Name,
        "API 名 (DeveloperName)": g.DeveloperName || "",
        "Email": g.Email || "",
        "Queue Id": g.Id,
      }));
    }
  } catch (e) { console.warn("[accessControl] Group fetch failed:", e); }

  // 5. Group 構成メンバー (GroupMember から派生、各 Group のメンバー数を集計)
  let memberCountMap = new Map();
  try {
    const memR = await runSoql({
      host, sid, apiVersion,
      soql: `SELECT GroupId, COUNT(Id) cnt FROM GroupMember GROUP BY GroupId LIMIT 5000`,
    });
    if (memR.ok) {
      for (const rec of (memR.data.records || [])) {
        if (rec.GroupId) memberCountMap.set(rec.GroupId, Number(rec.cnt) || 0);
      }
    }
  } catch (e) { console.warn("[accessControl] GroupMember count failed:", e); }
  // Public Group / Queue 行に メンバー数を追記
  groupRows.forEach((r) => { r["メンバー数"] = fmtNum(memberCountMap.get(r["Group Id"]) || 0); });
  queueRows.forEach((r) => { r["メンバー数"] = fmtNum(memberCountMap.get(r["Queue Id"]) || 0); });
  const groupHeaders = ["No", "Group 名 (Label)", "API 名 (DeveloperName)", "Email", "メンバー数", "Group Id"];
  const queueHeaders = ["No", "Queue 名 (Label)", "API 名 (DeveloperName)", "Email", "メンバー数", "Queue Id"];

  // 凡例 (v2.12.0: 業務担当者の理解のための略語/値の説明)
  const legendHeaders = ["項目", "意味"];
  const legendRows = [
    { "項目": "OWD", "意味": "Organization-Wide Defaults (組織共通の既定共有設定)" },
    { "項目": "Private (非公開)", "意味": "レコード所有者と上位ロールのみアクセス可" },
    { "項目": "Public Read (参照のみ)", "意味": "全ユーザが参照可能、編集は所有者のみ" },
    { "項目": "Public Read/Write", "意味": "全ユーザが参照・編集可能" },
    { "項目": "Controlled By Parent", "意味": "親レコードのアクセス権限に従う (例: 取引先責任者)" },
    { "項目": "Sharing Rules", "意味": "OWD で制限したレコードを追加共有する補完ルール (本設計書では Metadata API 必須のため未取得)" },
    { "項目": "Public Group", "意味": "ユーザー・ロール・他グループを束ねる任意グループ。共有ルール / 一括メール / フォルダ共有等で使用" },
    { "項目": "Queue", "意味": "Case / Lead / カスタムオブジェクトのレコード一時受け皿。担当者が引き取るまでキュー所有 (Phase 226 追加)" },
    { "項目": "PermSet 上乗せ", "意味": "プロファイル + Permission Set の合算で実効権限が決まる" },
  ];

  const sections = [
    makeCoverSection({ docTitle: "アクセスコントロール定義書", target: "組織全体 (OWD / 共有設定 / ロール階層 / Group・Queue)", orgHost: host, revision: "初版" }),
    { heading: "0. 凡例 / 略語の説明", headers: legendHeaders, rows: legendRows },
    { heading: "1. 組織共通の既定共有設定 (OWD)", headers: owdHeaders, rows: owdRows },
    { heading: "2. 共有設計上の注意 (非公開 / 親従属)", headers: sharingHeaders, rows: sharingRows },
    { heading: "3. ロール階層 (UserRole)", headers: roleHeaders, rows: roleRows },
  ];
  if (groupRows.length) sections.push({ heading: "4. Public Group (パブリックグループ)", headers: groupHeaders, rows: groupRows });
  if (queueRows.length) sections.push({ heading: "5. Queue (キュー)", headers: queueHeaders, rows: queueRows });

  return {
    title: "アクセスコントロール定義書 (Group / Queue 含む)",
    type: "accessControl",
    sections,
    note: `OWD ${fmtNum(owdRows.length)} 件 / ロール ${fmtNum(roleRows.length)} 件 / Public Group ${fmtNum(groupRows.length)} 件 / Queue ${fmtNum(queueRows.length)} 件。**業務担当者向け**: 本設計書はレコードレベルアクセス制御 (誰がどのレコードを見られるか) の基盤を示します。**OWD** = 全レコードの初期共有レベル / **ロール階層** = 上司は部下のレコードを参照可能 / **Public Group** = 共有ルール対象を柔軟に組合せ / **Queue** = Case/Lead の担当未定レコードの受け皿 (担当が拾うまで Queue が所有)。年次セキュリティ監査、組織再編時の権限見直し、機微情報 (人事/契約) 取扱範囲の確認に活用してください。共有ルール詳細 (CriteriaBasedSharingRule 等) は Metadata API で別途取得が必要です。`,
  };
}

// ============ フロー設計図 (1 Flow 詳細) ============
async function buildFlowDetail({ host, sid, apiVersion, obj }) {
  requireInput(obj, "Flow の DeveloperName (例: My_Flow)");

  // Active version を引く
  const r = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, MasterLabel, ProcessType, Status, VersionNumber, Description, Metadata FROM Flow WHERE Definition.DeveloperName='${obj.replace(/'/g, "\\'")}' AND Status='Active' ORDER BY VersionNumber DESC LIMIT 1`,
  });
  if (!r.ok) throw apiError("フロー (アクティブ) の取得に失敗しました", r);
  let flow = (r.data.records || [])[0];
  if (!flow) {
    // Active が無ければ最新を引く
    const r2 = await runSoql({
      host, sid, apiVersion, tooling: true,
      soql: `SELECT Id, MasterLabel, ProcessType, Status, VersionNumber, Description, Metadata FROM Flow WHERE Definition.DeveloperName='${obj.replace(/'/g, "\\'")}' ORDER BY VersionNumber DESC LIMIT 1`,
    });
    if (!r2.ok) throw apiError("フロー (最新版) の取得に失敗しました", r2);
    if (!(r2.data.records || []).length) throw new Error(`HTTP 404 Flow '${obj}' が見つかりません`);
    flow = r2.data.records[0];
  }

  const meta = flow.Metadata || {};
  // ProcessType を日本語+原文に
  const processTypeMap = {
    "AutoLaunchedFlow": "自動起動フロー (Autolaunched)",
    "Flow": "画面フロー (Screen)",
    "Workflow": "ワークフロー (Workflow Rule)",
    "InvocableProcess": "プロセスビルダー (Invocable Process)",
    "LoginFlow": "ログインフロー",
    "Survey": "アンケート (Survey)",
    "ActionPlan": "アクションプラン",
  };
  const statusMap = { "Active": "○ アクティブ", "Draft": "下書き", "Obsolete": "廃止", "InvalidDraft": "無効な下書き" };
  const summary = [
    ["フロー API 名", obj],
    ["ラベル (画面表示)", flow.MasterLabel],
    ["種別 (ProcessType)", processTypeMap[flow.ProcessType] || flow.ProcessType],
    ["状態 (Status)", statusMap[flow.Status] || flow.Status],
    ["バージョン", flow.VersionNumber],
    ["説明", flow.Description || ""],
  ];

  // 凡例 (要素種別の業務向け説明)
  const legend = [
    ["変数 (variables)", "フロー実行中に値を保持する箱。Input/Output 指定で外部から値を受け渡し可能"],
    ["定数 (constants)", "実行中に変化しない固定値。料率や閾値などのマジックナンバー定義に"],
    ["計算式 (formulas)", "他要素を組み合わせて値を算出する式。SUM/IF/CASE 等の関数が使用可"],
    ["分岐 (decisions)", "If/Then 条件で実行経路を分岐させる要素。複数アウトカム可"],
    ["代入 (assignments)", "変数やレコード項目に値を設定/加減算する要素"],
    ["レコード作成/更新/取得/削除", "標準/カスタムオブジェクトに対する CRUD 操作要素"],
    ["画面 (screens)", "Screen Flow でユーザに入力させる画面定義。コンポーネント (Input/Display) の集合"],
    ["ループ (loops)", "コレクション (List) を順に処理するループ要素"],
    ["サブフロー (subflows)", "別フローを呼び出して結果を取得する要素 (フロー再利用)"],
    ["アクション呼び出し (actionCalls)", "メール送信・Apex 呼び出し・Quick Action 等の外部アクション"],
  ];

  const sections = [
    { heading: "0. 凡例 (フロー要素の意味)", kvRows: legend },
    { heading: "1. サマリ", kvRows: summary },
  ];

  // 各要素を整理 (Salesforce Flow metadata の代表要素のみ)
  const collect = (arr, headers, mapFn, title) => {
    if (!arr || !arr.length) return;
    sections.push({
      heading: title,
      headers,
      rows: arr.map((x, i) => ({ "No": i + 1, ...mapFn(x) })),
    });
  };

  collect(meta.variables, ["No", "API 名", "データ型", "コレクション", "入力", "出力"],
    (v) => ({ "API 名": v.name, "データ型": v.dataType, "コレクション": v.isCollection ? "○" : "", "入力": v.isInput ? "○" : "", "出力": v.isOutput ? "○" : "" }),
    "2. 変数 (variables)");

  collect(meta.constants, ["No", "API 名", "データ型", "値"],
    (c) => ({ "API 名": c.name, "データ型": c.dataType, "値": c.value && c.value.stringValue || "" }),
    "3. 定数 (constants)");

  collect(meta.formulas, ["No", "API 名", "データ型", "計算式"],
    (f) => ({ "API 名": f.name, "データ型": f.dataType, "計算式": f.expression }),
    "4. 計算式 (formulas)");

  collect(meta.decisions, ["No", "API 名", "ラベル", "既定経路ラベル"],
    (d) => ({ "API 名": d.name, "ラベル": d.label, "既定経路ラベル": d.defaultConnectorLabel || "" }),
    "5. 分岐 (decisions)");

  collect(meta.assignments, ["No", "API 名", "ラベル", "代入項目数"],
    (a) => ({ "API 名": a.name, "ラベル": a.label || "", "代入項目数": (a.assignmentItems || []).length }),
    "6. 代入 (assignments)");

  collect(meta.recordCreates, ["No", "API 名", "ラベル", "対象オブジェクト"],
    (x) => ({ "API 名": x.name, "ラベル": x.label || "", "対象オブジェクト": x.object }),
    "7. レコード作成 (recordCreates)");

  collect(meta.recordUpdates, ["No", "API 名", "ラベル", "対象オブジェクト"],
    (x) => ({ "API 名": x.name, "ラベル": x.label || "", "対象オブジェクト": x.object }),
    "8. レコード更新 (recordUpdates)");

  collect(meta.recordLookups, ["No", "API 名", "ラベル", "対象オブジェクト", "先頭 1 件のみ"],
    (x) => ({ "API 名": x.name, "ラベル": x.label || "", "対象オブジェクト": x.object, "先頭 1 件のみ": x.getFirstRecordOnly ? "○" : "" }),
    "9. レコード取得 (recordLookups)");

  collect(meta.recordDeletes, ["No", "API 名", "ラベル", "対象オブジェクト"],
    (x) => ({ "API 名": x.name, "ラベル": x.label || "", "対象オブジェクト": x.object }),
    "10. レコード削除 (recordDeletes)");

  collect(meta.screens, ["No", "API 名", "ラベル", "画面項目数"],
    (x) => ({ "API 名": x.name, "ラベル": x.label || "", "画面項目数": (x.fields || []).length }),
    "11. 画面 (screens)");

  collect(meta.loops, ["No", "API 名", "ラベル", "対象コレクション"],
    (x) => ({ "API 名": x.name, "ラベル": x.label || "", "対象コレクション": x.collectionReference || "" }),
    "12. ループ (loops)");

  collect(meta.subflows, ["No", "API 名", "ラベル", "呼び出し先フロー"],
    (x) => ({ "API 名": x.name, "ラベル": x.label || "", "呼び出し先フロー": x.flowName }),
    "13. サブフロー (subflows)");

  collect(meta.actionCalls, ["No", "API 名", "ラベル", "アクション名", "アクション種別"],
    (x) => ({ "API 名": x.name, "ラベル": x.label || "", "アクション名": x.actionName, "アクション種別": x.actionType }),
    "14. アクション呼び出し (actionCalls)");

  // 要素種別ごとの件数集計を note に追加 (フロー全体の規模感を一目で把握)
  const counts = [
    ["変数", (meta.variables || []).length],
    ["定数", (meta.constants || []).length],
    ["計算式", (meta.formulas || []).length],
    ["分岐", (meta.decisions || []).length],
    ["代入", (meta.assignments || []).length],
    ["レコード作成", (meta.recordCreates || []).length],
    ["レコード更新", (meta.recordUpdates || []).length],
    ["レコード取得", (meta.recordLookups || []).length],
    ["レコード削除", (meta.recordDeletes || []).length],
    ["画面", (meta.screens || []).length],
    ["ループ", (meta.loops || []).length],
    ["サブフロー", (meta.subflows || []).length],
    ["アクション", (meta.actionCalls || []).length],
  ].filter(([_, n]) => n > 0).map(([label, n]) => `${label} ${fmtNum(n)} 件`).join(" / ");
  const totalElements = (meta.variables || []).length + (meta.constants || []).length + (meta.formulas || []).length
    + (meta.decisions || []).length + (meta.assignments || []).length
    + (meta.recordCreates || []).length + (meta.recordUpdates || []).length + (meta.recordLookups || []).length + (meta.recordDeletes || []).length
    + (meta.screens || []).length + (meta.loops || []).length + (meta.subflows || []).length + (meta.actionCalls || []).length;

  sections.unshift(makeCoverSection({ docTitle: "フロー設計図", target: `${flow.MasterLabel} (${obj}) v${flow.VersionNumber}`, orgHost: host, revision: "初版" }));
  return {
    title: `フロー設計図: ${flow.MasterLabel} (${obj}) v${flow.VersionNumber}`,
    type: "flowDetail",
    sections,
    note: `要素総数: ${fmtNum(totalElements)} 件${counts ? ` (内訳: ${counts})` : ""} / 要素 0 件のセクションは省略 / Status=Draft の場合は最新の保存版を表示。**業務担当者向け**: 本設計図はフロー (画面/レコードトリガ/スケジュール) の処理ステップを可視化します。要件変更時の影響分析・障害切分・新人引継ぎ資料としてご活用ください。「割当 (assignment)」「決定 (decision)」「ループ」等は要件定義書の業務フロー図と対応付けて読むと理解しやすくなります。`,
  };
}

// ============ Apex 設計図 (1 クラス詳細) ============
async function buildApexDetail({ host, sid, apiVersion, obj }) {
  requireInput(obj, "Apex クラス名 (例: AccountController)");
  const r = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, Name, ApiVersion, Status, NamespacePrefix, LengthWithoutComments, IsValid, Body, SymbolTable FROM ApexClass WHERE Name='${obj.replace(/'/g, "\\'")}' LIMIT 1`,
  });
  if (!r.ok) throw apiError(`Apex クラス (${obj}) の取得に失敗しました`, r);
  if (!r.data.records || !r.data.records[0]) throw new Error(`HTTP 404 Apex クラス '${obj}' が見つかりません`);
  const c = r.data.records[0];

  // 可視性の業務向け説明
  const visibilityMap = {
    "public": "public (組織内公開)",
    "private": "private (クラス内のみ)",
    "global": "global (パッケージ外公開)",
    "protected": "protected (継承先のみ)",
  };
  // ステータス日本語化
  const statusMap = { "Active": "○ 有効", "Inactive": "− 無効", "Deleted": "✗ 削除済" };

  const summary = [
    ["クラス名", c.Name],
    ["API バージョン", c.ApiVersion != null ? `v${c.ApiVersion}` : ""],
    ["ステータス", statusMap[c.Status] || c.Status],
    ["ネームスペース", c.NamespacePrefix || "(なし: 自組織のカスタム)"],
    ["コードサイズ (コメント除く)", c.LengthWithoutComments != null ? fmtBytes(c.LengthWithoutComments) : ""],
    ["コンパイル状態", c.IsValid ? "○ 正常 (IsValid=true)" : "✗ 再保存が必要 (IsValid=false)"],
  ];
  // SymbolTable があればメソッド可視性集計を summary に追加
  if (c.SymbolTable) {
    const methods = c.SymbolTable.methods || [];
    const props = c.SymbolTable.properties || [];
    const innerCls = c.SymbolTable.innerClasses || [];
    if (methods.length) {
      const visCount = (v) => methods.filter((m) => (m.visibility || "").toLowerCase() === v).length;
      summary.push(["メソッド構成", `合計 ${fmtNum(methods.length)} 件 (global ${fmtNum(visCount("global"))} / public ${fmtNum(visCount("public"))} / private ${fmtNum(visCount("private"))} / protected ${fmtNum(visCount("protected"))})`]);
    }
    if (props.length) summary.push(["プロパティ数", fmtNum(props.length) + " 件"]);
    if (innerCls.length) summary.push(["内部クラス数", fmtNum(innerCls.length) + " 件"]);
  }

  // 凡例: Apex 用語の業務向け説明
  const legend = [
    ["Apex とは", "Salesforce 専用のサーバサイド言語 (Java 風)。トリガ・コントローラ・バッチ等で利用"],
    ["メソッド", "クラスが提供する処理 (関数)。可視性・戻り型・引数で外部から呼ばれる API を定義"],
    ["プロパティ", "クラスが保持する値 (getter/setter 付き)。VF/LWC からバインドされる"],
    ["インスタンス変数", "クラス内の変数。プロパティと違い getter/setter なし"],
    ["内部クラス", "ファイル内に定義された子クラス (DTO / Wrapper 用途で多用)"],
    ["可視性", "public = 組織内全公開、private = クラス内のみ、global = 管理パッケージ外公開、protected = 継承先のみ"],
    ["static 修飾子", "○ = インスタンス化不要でクラス名直接呼び出し可。ユーティリティメソッドに多い"],
    ["アノテーション", "@AuraEnabled (LWC 連携), @InvocableMethod (Flow 連携), @future (非同期), @TestVisible (テスト用) 等"],
    ["SymbolTable", "Salesforce が静的解析した構造情報。IsValid=false の場合は取得不可"],
  ];

  const sections = [
    { heading: "0. 凡例 (Apex 用語の意味)", kvRows: legend },
    { heading: "1. サマリ", kvRows: summary },
  ];

  // SymbolTable からメソッド / プロパティ / 内部クラスを抽出
  const sym = c.SymbolTable;
  if (sym) {
    const methods = sym.methods || [];
    if (methods.length) {
      sections.push({
        heading: "2. メソッド一覧",
        headers: ["No", "メソッド名", "可視性", "戻り型", "引数", "static", "アノテーション"],
        rows: methods.map((m, i) => ({
          "No": i + 1,
          "メソッド名": m.name,
          "可視性": visibilityMap[m.visibility] || m.visibility || "",
          "戻り型": m.returnType || "void",
          "引数": (m.parameters || []).map((p) => `${p.type || ""} ${p.name || ""}`).join(", "),
          "static": (m.modifiers || []).includes("static") ? "○" : "",
          "アノテーション": (m.annotations || []).map((a) => `@${a.name}`).join(", "),
        })),
      });
    }
    const props = sym.properties || [];
    if (props.length) {
      sections.push({
        heading: "3. プロパティ",
        headers: ["No", "プロパティ名", "型", "可視性"],
        rows: props.map((p, i) => ({
          "No": i + 1,
          "プロパティ名": p.name,
          "型": p.type,
          "可視性": visibilityMap[p.visibility] || p.visibility || "",
        })),
      });
    }
    const variables = sym.variables || [];
    if (variables.length) {
      sections.push({
        heading: "4. インスタンス変数",
        headers: ["No", "変数名", "型", "可視性"],
        rows: variables.map((v, i) => ({
          "No": i + 1,
          "変数名": v.name,
          "型": v.type,
          "可視性": visibilityMap[v.visibility] || v.visibility || "",
        })),
      });
    }
    const innerClasses = sym.innerClasses || [];
    if (innerClasses.length) {
      sections.push({
        heading: "5. 内部クラス",
        headers: ["No", "内部クラス名", "メソッド数", "プロパティ数"],
        rows: innerClasses.map((ic, i) => ({
          "No": i + 1,
          "内部クラス名": ic.name,
          "メソッド数": (ic.methods || []).length,
          "プロパティ数": (ic.properties || []).length,
        })),
      });
    }
    const externalRefs = sym.externalReferences || [];
    if (externalRefs.length) {
      sections.push({
        heading: "6. 外部参照 (依存クラス)",
        headers: ["No", "参照クラス/型", "ネームスペース"],
        rows: externalRefs.map((er, i) => ({
          "No": i + 1,
          "参照クラス/型": er.name,
          "ネームスペース": er.namespace || "(自組織)",
        })),
      });
    }
  } else {
    sections.push({ heading: "2. 解析失敗", kvRows: [["SymbolTable", "(未取得 — コンパイルエラー (IsValid=false) の可能性。Apex クラスを再保存してから再実行してください)"]] });
  }

  // ApexTrigger 参照 (このクラスを呼び出すトリガ)
  const trR = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Name, TableEnumOrId FROM ApexTrigger WHERE Body LIKE '%${obj.replace(/'/g, "\\'")}%' ORDER BY Name LIMIT 50`,
  });
  if (trR.ok && trR.data.records && trR.data.records.length) {
    sections.push({
      heading: "7. このクラスを参照するトリガ (本文一致検索)",
      headers: ["No", "トリガ名", "対象オブジェクト"],
      rows: trR.data.records.map((t, i) => ({ "No": i + 1, "トリガ名": t.Name, "対象オブジェクト": t.TableEnumOrId })),
    });
  }

  sections.unshift(makeCoverSection({ docTitle: "Apex 設計図", target: c.Name, orgHost: host, revision: "初版" }));
  return {
    title: `Apex 設計図: ${c.Name}`,
    type: "apexDetail",
    sections,
    note: `SymbolTable はコンパイルが成功している場合のみ取得可能 / IsValid=false なら Setup > Apex クラスから再保存後に再実行 / 「7. 参照トリガ」はクラス名を本文に含むトリガを最大 50 件まで列挙。**業務担当者向け**: 本設計図はカスタムコード (Apex クラス) の構造と依存関係を示します。Salesforce バージョンアップ前の互換性チェック・保守引継ぎ資料・コードレビュー記録としてご活用ください。コードレビュー担当者は「メソッド」「内部クラス」「参照」を見れば概要を把握できます。`,
  };
}

// ============ LWC 設計図 (1 LightningComponentBundle 詳細) ============
async function buildLwcDetail({ host, sid, apiVersion, obj }) {
  requireInput(obj, "LWC コンポーネントの DeveloperName (例: myComponent)");

  const bR = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, DeveloperName, MasterLabel, ApiVersion, Description, NamespacePrefix, IsExposed, TargetConfigs FROM LightningComponentBundle WHERE DeveloperName='${obj.replace(/'/g, "\\'")}' LIMIT 1`,
  });
  if (!bR.ok) throw apiError(`LWC コンポーネント (${obj}) の取得に失敗しました`, bR);
  if (!bR.data.records || !bR.data.records[0]) throw new Error(`HTTP 404 LWC コンポーネント '${obj}' が見つかりません`);
  const b = bR.data.records[0];

  // 形式の業務向け説明マップ
  const formatMap = {
    html: "html (テンプレート)",
    js: "js (コントローラ)",
    xml: "xml (メタデータ / 公開設定)",
    css: "css (スタイル)",
    svg: "svg (App Builder 用アイコン)",
    json: "json (静的データ / Jest 設定)",
  };

  const summary = [
    ["コンポーネント名 (API)", b.DeveloperName],
    ["ラベル (画面表示名)", b.MasterLabel],
    ["API バージョン", b.ApiVersion],
    ["ネームスペース", b.NamespacePrefix || "(なし: 標準パッケージ外)"],
    ["App Builder に公開", b.IsExposed ? "○ 公開 (画面に配置可能)" : "− 非公開 (子コンポーネント専用)"],
    ["説明", b.Description || ""],
  ];

  // LightningComponentResource (バンドル内の各ファイル)
  const rR = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, FilePath, Format, Source FROM LightningComponentResource WHERE LightningComponentBundleId='${b.Id}' ORDER BY FilePath LIMIT 100`,
  });
  // バンドル内ファイルを優先順 (html → js → xml → css → svg → json → 他) でソートして可読性向上
  const resources = rR.ok ? (rR.data.records || []) : [];
  const fmtOrder = { "html": 1, "js": 2, "xml": 3, "css": 4, "svg": 5, "json": 6 };
  resources.sort((a, b) => {
    const ao = fmtOrder[(a.Format || "").toLowerCase()] || 99;
    const bo = fmtOrder[(b.Format || "").toLowerCase()] || 99;
    if (ao !== bo) return ao - bo;
    return (a.FilePath || "").localeCompare(b.FilePath || "");
  });
  const fileHeaders = ["No", "ファイル名", "形式", "文字数", "サイズ", "先頭 80 文字 (プレビュー)"];
  const fileRows = resources.map((res, i) => {
    const filename = (res.FilePath || "").split("/").pop();
    const src = res.Source || "";
    const fmt = (res.Format || "").toLowerCase();
    return {
      "No": i + 1,
      "ファイル名": filename,
      "形式": formatMap[fmt] || res.Format || "",
      "文字数": fmtNum(src.length),
      "サイズ": fmtBytes(new Blob([src]).size),
      "先頭 80 文字 (プレビュー)": src.substring(0, 80).replace(/\n/g, " "),
    };
  });
  // バンドル総サイズ
  const totalBundleBytes = resources.reduce((sum, res) => sum + new Blob([res.Source || ""]).size, 0);
  const totalBundleChars = resources.reduce((sum, res) => sum + (res.Source || "").length, 0);

  // js-meta.xml の TargetConfigs パース (簡易)
  const targetSheet = [];
  if (b.TargetConfigs) {
    targetSheet.push(["TargetConfigs (XML)", b.TargetConfigs.substring(0, 500)]);
  }

  const legend = [
    ["LWC とは", "Lightning Web Component。Salesforce 標準の Web Components ベース UI フレームワーク"],
    ["公開フラグ", "App Builder に公開: ○ = Lightning ページ等に配置可能、− = 親コンポーネントから呼び出し専用"],
    ["バンドル構成", "1 つのコンポーネントは html (テンプレート) + js (コントローラ) + js-meta.xml (公開設定) を中心に複数ファイルで構成"],
    ["TargetConfigs", "どの画面 (RecordPage / HomePage / AppPage / Community 等) で利用可能かを定義する XML"],
  ];

  const sections = [
    makeCoverSection({ docTitle: "LWC 設計図", target: `${b.MasterLabel} (${b.DeveloperName})`, orgHost: host, revision: "初版" }),
    { heading: "0. 凡例", kvRows: legend },
    { heading: "1. サマリ", kvRows: summary },
    { heading: "2. バンドル内ファイル", headers: fileHeaders, rows: fileRows },
  ];
  if (targetSheet.length) sections.push({ heading: "3. TargetConfigs (公開設定 XML)", kvRows: targetSheet });

  return {
    title: `LWC 設計図: ${b.MasterLabel} (${b.DeveloperName})`,
    type: "lwcDetail",
    sections,
    note: `バンドル内ファイル ${fmtNum(fileRows.length)} 件 / 総サイズ ${fmtBytes(totalBundleBytes)} (${fmtNum(totalBundleChars)} 文字) / 「App Builder に公開」が ○ の場合は管理者が Lightning ページに配置可能。**業務担当者向け**: LWC は画面パーツ (Lightning Web Component) です。Lightning ページ・コミュニティで利用可能な画面部品としての設計記録、改修時の影響範囲確認、保守引継ぎ資料としてご活用ください。「TargetConfigs」シートは管理者が配置できる対象 (RecordPage / HomePage / AppPage 等) を示します。`,
  };
}

// 共通: nextRecordsUrl を辿って 50,000 件まで集める
async function fetchAllPaged({ host, sid, apiVersion, soql, tooling = false }) {
  const base = tooling ? `/services/data/v${apiVersion}/tooling/query/` : `/services/data/v${apiVersion}/query/`;
  let nextPath = `${base}?q=${encodeURIComponent(soql)}`;
  let records = [];
  while (nextPath) {
    const r = await sfFetch({ host, sid, path: nextPath });
    if (!r.ok) return { ok: false, status: r.status, data: r.data, records };
    records = records.concat((r.data && r.data.records) || []);
    nextPath = r.data && r.data.nextRecordsUrl ? r.data.nextRecordsUrl : null;
    if (records.length > 50000) break;
  }
  return { ok: true, records };
}

// ============ フィールド権限マトリクス (Profile/PermissionSet × Field) ============
async function buildFieldPermMatrix({ host, sid, apiVersion, obj, progress = () => {} }) {
  requireInput(obj, "オブジェクト API 名 (例: Account)");
  progress("describe 取得中...");
  // 1. オブジェクトの全 fields を describe で取得 (順序維持用)
  const dr = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/sobjects/${encodeURIComponent(obj)}/describe` });
  if (!dr.ok) throw apiError(`オブジェクト '${obj}' の describe 取得に失敗しました`, dr);
  const allFields = (dr.data.fields || [])
    .filter((f) => !f.calculated && f.type !== "id") // 計算項目と Id は権限対象外
    .map((f) => ({ name: f.name, label: f.label, type: f.type, required: !f.nillable && !f.defaultedOnCreate && f.createable }));

  // 2. FieldPermissions を SOQL で取得。SObjectType フィルタで該当オブジェクトのみ。
  //    Parent は PermissionSet を経由する (Profile も IsOwnedByProfile=true の PermissionSet として存在)
  let allRecs = [];
  let nextPath = `/services/data/v${apiVersion}/query/?q=` + encodeURIComponent(
    `SELECT Field, PermissionsRead, PermissionsEdit, Parent.Name, Parent.IsOwnedByProfile, Parent.Profile.Name, Parent.Label ` +
    `FROM FieldPermissions WHERE SobjectType='${obj.replace(/'/g, "\\'")}' LIMIT 10000`
  );
  const startedAt = performance.now();
  while (nextPath) {
    // ETA 計算: ページ size から大体の総件数を推測する (typically 2000/page)
    let etaLabel = "";
    if (allRecs.length > 0) {
      const elapsed = performance.now() - startedAt;
      const msPerRec = elapsed / allRecs.length;
      // ページが続く間は最低 +2000 件はあると仮定し概算
      const estRemaining = nextPath ? Math.max(2000, Math.round(allRecs.length * 0.3)) : 0;
      const etaSec = Math.round((estRemaining * msPerRec) / 1000);
      if (etaSec > 1) etaLabel = ` / ETA 約 ${etaSec < 60 ? etaSec + "秒" : Math.floor(etaSec/60) + "分" + (etaSec%60) + "秒"}`;
    }
    progress(`FieldPermissions 取得中... (${allRecs.length} 件${etaLabel})`);
    const r = await sfFetch({ host, sid, path: nextPath });
    if (!r.ok) throw apiError(`項目権限 (${obj}) の取得に失敗しました`, r);
    allRecs = allRecs.concat(r.data.records || []);
    nextPath = r.data && r.data.nextRecordsUrl ? r.data.nextRecordsUrl : null;
    if (allRecs.length > 50000) break; // 安全弁
  }
  progress(`集計中... ${allRecs.length} 件のレコードをピボット`);

  // 3. ピボット用に Parent (= 列見出し) を集計
  const parents = new Map(); // key: parentKey, value: { label, isProfile }
  for (const rec of allRecs) {
    if (!rec.Parent) continue;
    const isProfile = !!rec.Parent.IsOwnedByProfile;
    const label = isProfile
      ? (rec.Parent.Profile && rec.Parent.Profile.Name) || rec.Parent.Name
      : (rec.Parent.Label || rec.Parent.Name);
    const key = (isProfile ? "P|" : "S|") + label;
    if (!parents.has(key)) parents.set(key, { label, isProfile, key });
  }
  // 列順: プロファイル先、権限セット後、名前昇順
  const cols = Array.from(parents.values()).sort((a, b) => {
    if (a.isProfile !== b.isProfile) return a.isProfile ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  // 4. セル値マップ (fieldName → parentKey → "RW"|"R-"|"--")
  const cellMap = new Map();
  for (const rec of allRecs) {
    const fld = (rec.Field || "").replace(/^[^.]+\./, ""); // "Account.Name" → "Name"
    const isProfile = !!(rec.Parent && rec.Parent.IsOwnedByProfile);
    const label = isProfile
      ? (rec.Parent.Profile && rec.Parent.Profile.Name) || rec.Parent.Name
      : (rec.Parent.Label || rec.Parent.Name);
    const key = (isProfile ? "P|" : "S|") + label;
    const r = !!rec.PermissionsRead;
    const w = !!rec.PermissionsEdit;
    const v = w ? "RW" : (r ? "R-" : "--");
    if (!cellMap.has(fld)) cellMap.set(fld, new Map());
    cellMap.get(fld).set(key, v);
  }

  // 5. 行データ生成 (allFields 順、describe にあって FieldPermissions に無い欄は空)
  const headers = ["No", "API 名", "ラベル", "型", "必須", ...cols.map((c) => (c.isProfile ? "👤 " : "🔑 ") + c.label)];
  const rows = allFields.map((f, i) => {
    const row = {
      "No": i + 1,
      "API 名": f.name,
      "ラベル": f.label,
      "型": f.type,
      "必須": f.required ? "○" : "",
    };
    const fc = cellMap.get(f.name) || new Map();
    for (const c of cols) {
      row[(c.isProfile ? "👤 " : "🔑 ") + c.label] = fc.get(c.key) || "--";
    }
    return row;
  });

  // 6. 凡例 (業務担当者向け)
  const legend = [
    ["フィールド権限とは", "ユーザがレコードに含まれる個別項目を『参照可/編集可/不可』のいずれにできるかの設定 (FLS = Field Level Security)"],
    ["RW", "参照 + 編集 可能 (PermissionsRead=true かつ PermissionsEdit=true)"],
    ["R-", "参照のみ (PermissionsRead=true / PermissionsEdit=false) — 読み取り専用"],
    ["--", "アクセス不可 (FieldPermissions レコード無し or PermissionsRead=false)"],
    ["👤 列", "プロファイル単位の権限 (ユーザ毎にちょうど 1 つ適用)"],
    ["🔑 列", "権限セット単位の権限 (複数加算可能 / 個別ユーザに付与)"],
    ["必須列", "○ = 入力必須項目 (nillable=false かつ defaultedOnCreate=false かつ createable=true)。必須項目は権限に関わらず保存時に値必須"],
    ["除外", "計算項目 (formula) と Id 項目は権限制御対象外のため一覧から除外"],
  ];

  // 権限付与率 (RW 比率): 全 (フィールド × parent) セル中、RW または R- (= 何らかのアクセス) の比率
  const totalCells = allFields.length * cols.length;
  const grantedCells = allRecs.filter((rec) => rec.PermissionsRead).length;
  const rwCells = allRecs.filter((rec) => rec.PermissionsEdit).length;
  const grantRate = totalCells > 0 ? grantedCells / totalCells : 0;
  const rwRate = totalCells > 0 ? rwCells / totalCells : 0;

  return {
    title: `フィールド権限マトリクス: ${obj}`,
    type: "fieldPermMatrix",
    sections: [
      makeCoverSection({ docTitle: "フィールド権限マトリクス", target: obj, orgHost: host, revision: "初版" }),
      { heading: "凡例", kvRows: legend },
      { heading: "サマリ", kvRows: [
        ["対象オブジェクト", obj],
        ["対象フィールド数", fmtNum(allFields.length) + " 項目"],
        ["プロファイル数", fmtNum(cols.filter((c) => c.isProfile).length) + " 件"],
        ["権限セット数", fmtNum(cols.filter((c) => !c.isProfile).length) + " 件"],
        ["FieldPermissions レコード数", fmtNum(allRecs.length) + " 件"],
        ["参照可率 (R 以上)", fmtPercent(grantRate) + ` (${fmtNum(grantedCells)} / ${fmtNum(totalCells)} セル)`],
        ["編集可率 (RW)", fmtPercent(rwRate) + ` (${fmtNum(rwCells)} / ${fmtNum(totalCells)} セル)`],
      ]},
      { heading: "マトリクス", headers, rows },
    ],
    note: `**業務担当者向け**: Excel 形式での出力を推奨します。横列が多いため Excel の「ウィンドウ枠の固定 (B2 セル)」で左 4 列と先頭行を固定すると見やすくなります。**用途**: 項目レベルセキュリティ (FLS) の年次監査、機微情報の参照権限棚卸し、新規ユーザー権限申請時の影響範囲確認 等。プロファイル/権限セット × 項目の参照可・編集可をマトリクスで一目把握できます。`,
  };
}

// ============ オブジェクト権限マトリクス (Profile/PermissionSet × Object) ============
async function buildObjectPermMatrix({ host, sid, apiVersion, progress = () => {} }) {
  // ObjectPermissions: PermissionsRead/Create/Edit/Delete/ViewAllRecords/ModifyAllRecords × Parent (PermissionSet)
  let allRecs = [];
  let nextPath = `/services/data/v${apiVersion}/query/?q=` + encodeURIComponent(
    `SELECT SObjectType, PermissionsRead, PermissionsCreate, PermissionsEdit, PermissionsDelete, ` +
    `PermissionsViewAllRecords, PermissionsModifyAllRecords, ` +
    `Parent.Name, Parent.IsOwnedByProfile, Parent.Profile.Name, Parent.Label ` +
    `FROM ObjectPermissions LIMIT 10000`
  );
  while (nextPath) {
    progress(`ObjectPermissions 取得中... (${allRecs.length} 件)`);
    const r = await sfFetch({ host, sid, path: nextPath });
    if (!r.ok) throw apiError("オブジェクト権限の取得に失敗しました", r);
    allRecs = allRecs.concat(r.data.records || []);
    nextPath = r.data && r.data.nextRecordsUrl ? r.data.nextRecordsUrl : null;
    if (allRecs.length > 50000) break;
  }
  progress(`集計中... ${allRecs.length} 件をピボット`);

  const parents = new Map();
  const objects = new Set();
  for (const rec of allRecs) {
    if (!rec.Parent) continue;
    const isProfile = !!rec.Parent.IsOwnedByProfile;
    const label = isProfile
      ? (rec.Parent.Profile && rec.Parent.Profile.Name) || rec.Parent.Name
      : (rec.Parent.Label || rec.Parent.Name);
    const key = (isProfile ? "P|" : "S|") + label;
    if (!parents.has(key)) parents.set(key, { label, isProfile, key });
    objects.add(rec.SObjectType);
  }
  const cols = Array.from(parents.values()).sort((a, b) => {
    if (a.isProfile !== b.isProfile) return a.isProfile ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  const cellMap = new Map(); // obj -> parentKey -> "CRUD..." 文字列
  for (const rec of allRecs) {
    if (!rec.Parent) continue;
    const isProfile = !!rec.Parent.IsOwnedByProfile;
    const label = isProfile
      ? (rec.Parent.Profile && rec.Parent.Profile.Name) || rec.Parent.Name
      : (rec.Parent.Label || rec.Parent.Name);
    const key = (isProfile ? "P|" : "S|") + label;
    const c = rec.PermissionsCreate ? "C" : "-";
    const r = rec.PermissionsRead ? "R" : "-";
    const u = rec.PermissionsEdit ? "U" : "-";
    const d = rec.PermissionsDelete ? "D" : "-";
    const va = rec.PermissionsViewAllRecords ? "V" : "-";
    const ma = rec.PermissionsModifyAllRecords ? "M" : "-";
    if (!cellMap.has(rec.SObjectType)) cellMap.set(rec.SObjectType, new Map());
    cellMap.get(rec.SObjectType).set(key, `${c}${r}${u}${d}${va}${ma}`);
  }

  const objList = Array.from(objects).sort();
  const headers = ["No", "オブジェクト", ...cols.map((c) => (c.isProfile ? "👤 " : "🔑 ") + c.label)];
  const rows = objList.map((o, i) => {
    const row = { "No": i + 1, "オブジェクト": o };
    const fc = cellMap.get(o) || new Map();
    for (const c of cols) {
      row[(c.isProfile ? "👤 " : "🔑 ") + c.label] = fc.get(c.key) || "------";
    }
    return row;
  });

  return {
    title: "オブジェクト権限マトリクス",
    type: "objectPermMatrix",
    sections: [
      makeCoverSection({ docTitle: "オブジェクト権限マトリクス", target: "組織全体 (全オブジェクト × プロファイル/権限セット)", orgHost: host, revision: "初版" }),
      { heading: "0. 凡例", kvRows: [
        ["オブジェクト権限とは", "ユーザがオブジェクト全体に対して『作成/参照/更新/削除/全件参照/全件修正』をどこまで許可されているかの設定"],
        ["セル形式", "6 文字で表現。順に C=作成 / R=参照 / U=更新 / D=削除 / V=全件参照 / M=全件修正"],
        ["CRUDVM", "全権限あり (システム管理者相当)"],
        ["CRUD--", "通常の CRUD のみ (他人レコードは共有設定に従う)"],
        ["-R----", "参照のみ (読み取り専用)"],
        ["------", "権限なし (アクセス不可)"],
        ["V (ViewAll)", "共有設定を無視して全件参照可。データレポート/監査用途のプロファイルで利用"],
        ["M (ModifyAll)", "共有設定を無視して全件修正/削除可。誤付与はリスク大、システム管理者相当の権限"],
        ["👤 列", "プロファイル単位 (ユーザに 1 つ適用)"],
        ["🔑 列", "権限セット単位 (複数加算可)"],
      ]},
      { heading: "1. サマリ", kvRows: (() => {
        const viewAllCount = allRecs.filter((rec) => rec.PermissionsViewAllRecords).length;
        const modifyAllCount = allRecs.filter((rec) => rec.PermissionsModifyAllRecords).length;
        return [
          ["対象オブジェクト数", fmtNum(objList.length) + " 件"],
          ["プロファイル数", fmtNum(cols.filter((c) => c.isProfile).length) + " 件"],
          ["権限セット数", fmtNum(cols.filter((c) => !c.isProfile).length) + " 件"],
          ["ObjectPermissions レコード数", fmtNum(allRecs.length) + " 件"],
          ["V (ViewAllRecords) 付与数", fmtNum(viewAllCount) + " 件 (監査時に要確認の高権限)"],
          ["M (ModifyAllRecords) 付与数", fmtNum(modifyAllCount) + " 件 (誤付与リスク大、システム管理者相当)"],
        ];
      })()},
      { heading: "2. マトリクス", headers, rows },
    ],
    note: "**業務担当者向け**: Excel で開き B2 セルでウィンドウ枠固定すると左 2 列と先頭行が常時可視で見やすくなります。**用途**: オブジェクト権限 (CRUD + ViewAll/ModifyAll) の年次監査、内部統制 (J-SOX) 監査対応、新規プロファイル/権限セット設計時のリファレンス、組織再編時の権限再評価。**V (ViewAllRecords) / M (ModifyAllRecords) は高権限**のため、システム管理者・特権ユーザーのみ付与されているか必ず確認してください。",
  };
}
// =============================================================================
// v3.150.0 Phase 240 (Team D): 組織全体スナップショット (orgSnapshot)
// 複数の管理メタデータ (Organization / ライセンス / ユーザ集計 / Profile / PermSet / Group) を
// 1 つの設計書に統合。1 クリックで「組織監査資料一式」を生成可能。
// =============================================================================
async function buildOrgSnapshot({ host, sid, apiVersion, progress = () => {} }) {
  progress("組織情報を取得中...");
  // 1. Organization
  const orgR = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT Id, Name, OrganizationType, InstanceName, IsSandbox, LanguageLocaleKey, TimeZoneSidKey, DefaultCurrencyIsoCode, FiscalYearStartMonth, CreatedDate, NamespacePrefix, TrialExpirationDate FROM Organization LIMIT 1`,
  });
  if (!orgR.ok) throw apiError("組織情報の取得に失敗しました", orgR);
  const org = ((orgR.data || {}).records || [])[0] || {};

  // 2. UserLicense
  progress("ライセンス情報を取得中...");
  const licR = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT Name, MasterLabel, TotalLicenses, UsedLicenses, Status FROM UserLicense WHERE Status = 'Active' ORDER BY UsedLicenses DESC LIMIT 100`,
  });

  // 3. ユーザ集計
  progress("ユーザ集計を取得中...");
  const userAggR = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT IsActive, COUNT(Id) cnt FROM User GROUP BY IsActive`,
  });
  let activeUsers = 0, inactiveUsers = 0;
  for (const r of ((userAggR.data || {}).records || [])) {
    if (r.IsActive) activeUsers = Number(r.cnt) || 0;
    else inactiveUsers = Number(r.cnt) || 0;
  }
  const frozenR = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT COUNT(Id) cnt FROM UserLogin WHERE IsFrozen = true`,
  });
  const frozenUsers = frozenR.ok ? Number(((frozenR.data || {}).records || [])[0]?.cnt) || 0 : 0;

  // 4. Profile (ユーザー割当数も)
  progress("プロファイル情報を取得中...");
  const profR = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT Id, Name, UserLicense.Name, UserType FROM Profile ORDER BY Name LIMIT 200`,
  });
  const profAggR = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT ProfileId, COUNT(Id) cnt FROM User WHERE IsActive = true GROUP BY ProfileId`,
  });
  const profCnts = new Map();
  for (const r of ((profAggR.data || {}).records || [])) {
    if (r.ProfileId) profCnts.set(r.ProfileId, Number(r.cnt) || 0);
  }

  // 5. PermissionSet (割当数)
  progress("権限セット情報を取得中...");
  const psR = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT Id, Name, Label, License.Name, IsCustom FROM PermissionSet WHERE IsOwnedByProfile = false ORDER BY Name LIMIT 500`,
  });
  const psAggR = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT PermissionSetId, COUNT(Id) cnt FROM PermissionSetAssignment WHERE PermissionSetId != null GROUP BY PermissionSetId LIMIT 500`,
  });
  const psCnts = new Map();
  for (const r of ((psAggR.data || {}).records || [])) {
    if (r.PermissionSetId) psCnts.set(r.PermissionSetId, Number(r.cnt) || 0);
  }

  // 6. Public Group + Queue
  progress("Group / Queue 情報を取得中...");
  const grpR = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT Id, Name, DeveloperName, Type, Email FROM Group WHERE Type IN ('Regular', 'Queue') ORDER BY Type, Name LIMIT 500`,
  });
  const groupRecs = grpR.ok ? ((grpR.data || {}).records || []) : [];

  // 7. インストールパッケージ
  progress("インストールパッケージ情報を取得中...");
  const pkgR = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, SubscriberPackage.Name, SubscriberPackage.NamespacePrefix, SubscriberPackageVersion.MajorVersion, SubscriberPackageVersion.MinorVersion FROM InstalledSubscriberPackage ORDER BY SubscriberPackage.Name LIMIT 200`,
  });
  const pkgRecs = pkgR.ok ? ((pkgR.data || {}).records || []) : [];

  // === 章構成 ===
  const editionMap = {
    "Developer Edition": "Developer (開発者・無料)", "Enterprise Edition": "Enterprise (大規模企業向け)",
    "Unlimited Edition": "Unlimited (上位)", "Performance Edition": "Performance",
    "Professional Edition": "Professional (中小規模)", "Group Edition": "Group (小規模)",
    "Essentials Edition": "Essentials (Starter)", "Trial Edition": "Trial (試用)",
  };
  const monthMap = { 1: "1月", 2: "2月", 3: "3月", 4: "4月 (日本会計年度)", 5: "5月", 6: "6月", 7: "7月", 8: "8月", 9: "9月", 10: "10月", 11: "11月", 12: "12月" };

  const orgKv = [
    ["組織名", org.Name || ""],
    ["組織 ID", org.Id || ""],
    ["エディション", editionMap[org.OrganizationType] || (org.OrganizationType || "")],
    ["環境種別", org.IsSandbox ? "⚠ Sandbox (検証/開発)" : "🚨 Production (本番)"],
    ["インスタンス", org.InstanceName || ""],
    ["ネームスペース", org.NamespacePrefix || "(なし)"],
    ["言語 / タイムゾーン", `${org.LanguageLocaleKey || ""} / ${org.TimeZoneSidKey || ""}`],
    ["既定通貨", org.DefaultCurrencyIsoCode || ""],
    ["会計年度開始月", monthMap[org.FiscalYearStartMonth] || ""],
    ["組織作成日", org.CreatedDate ? fmtDate(org.CreatedDate) : ""],
    ["Trial 期限", org.TrialExpirationDate || "(該当なし)"],
  ];

  const licHeaders = ["No", "ライセンス", "API 名", "総数", "使用中", "残り", "使用率"];
  const licRows = ((licR.data || {}).records || []).map((r, i) => {
    const total = Number(r.TotalLicenses) || 0;
    const used = Number(r.UsedLicenses) || 0;
    return {
      "No": i + 1,
      "ライセンス": r.MasterLabel || r.Name,
      "API 名": r.Name,
      "総数": fmtNum(total),
      "使用中": fmtNum(used),
      "残り": fmtNum(total - used),
      "使用率": total > 0 ? fmtPercent(used / total) : "—",
    };
  });

  const userKv = [
    ["総ユーザー数", fmtNum(activeUsers + inactiveUsers)],
    ["アクティブ", fmtNum(activeUsers)],
    ["非アクティブ", fmtNum(inactiveUsers)],
    ["凍結中 (UserLogin.IsFrozen)", fmtNum(frozenUsers)],
  ];

  const profHeaders = ["No", "プロファイル名", "ライセンス", "ユーザ種別", "割当アクティブ数"];
  const profRecs = (profR.data || {}).records || [];
  const profRows = profRecs.map((p, i) => ({
    "No": i + 1,
    "プロファイル名": p.Name,
    "ライセンス": p.UserLicense ? p.UserLicense.Name : "(なし)",
    "ユーザ種別": p.UserType || "",
    "割当アクティブ数": fmtNum(profCnts.get(p.Id) || 0),
  }));

  const psHeaders = ["No", "API 名", "ラベル", "ライセンス", "種別", "割当数"];
  const psRecs = (psR.data || {}).records || [];
  const psRows = psRecs.map((p, i) => ({
    "No": i + 1,
    "API 名": p.Name,
    "ラベル": p.Label || "",
    "ライセンス": p.License ? p.License.Name : "(なし)",
    "種別": p.IsCustom ? "カスタム" : "標準/パッケージ",
    "割当数": fmtNum(psCnts.get(p.Id) || 0),
  }));

  const grpHeaders = ["No", "種別", "Name", "DeveloperName", "Email"];
  const grpTypeMap = { "Regular": "Public Group", "Queue": "Queue" };
  const grpRows = groupRecs.map((g, i) => ({
    "No": i + 1,
    "種別": grpTypeMap[g.Type] || g.Type,
    "Name": g.Name,
    "DeveloperName": g.DeveloperName || "",
    "Email": g.Email || "",
  }));

  const pkgHeaders = ["No", "パッケージ名", "ネームスペース", "バージョン"];
  const pkgRows = pkgRecs.map((p, i) => {
    const pkg = p.SubscriberPackage || {};
    const ver = p.SubscriberPackageVersion || {};
    return {
      "No": i + 1,
      "パッケージ名": pkg.Name || "",
      "ネームスペース": pkg.NamespacePrefix || "(なし)",
      "バージョン": [ver.MajorVersion, ver.MinorVersion].filter((n) => n != null).join("."),
    };
  });

  const sections = [
    makeCoverSection({ docTitle: "組織全体スナップショット", target: `${org.Name || ""} (${org.IsSandbox ? "Sandbox" : "Production"})`, orgHost: host, revision: "初版" }),
    { heading: "0. 概要", kvRows: [
      ["本資料の目的", "組織監査・年次レポート・組織移管時の引継ぎ資料として、組織の主要メタデータを 1 つの設計書に集約"],
      ["含まれる情報", "組織情報 / ライセンス使用状況 / ユーザー集計 / プロファイル一覧 / 権限セット一覧 / Public Group・Queue / インストールパッケージ"],
      ["想定読者", "システム管理者 / Salesforce 担当者 / 監査担当者 / コンサルタント"],
    ]},
    { heading: "1. 組織情報", kvRows: orgKv },
    { heading: "2. ライセンス使用状況", headers: licHeaders, rows: licRows },
    { heading: "3. ユーザ集計", kvRows: userKv },
    { heading: "4. プロファイル一覧", headers: profHeaders, rows: profRows },
    { heading: "5. 権限セット一覧", headers: psHeaders, rows: psRows },
    { heading: "6. Public Group / Queue", headers: grpHeaders, rows: grpRows },
    { heading: "7. インストールパッケージ", headers: pkgHeaders, rows: pkgRows },
  ];

  return {
    title: `組織全体スナップショット: ${org.Name || ""}`,
    type: "orgSnapshot",
    sections,
    note: `組織 ${org.Name || ""} (${org.IsSandbox ? "Sandbox" : "Production"}) の主要メタデータ 7 章構成スナップショット。ライセンス ${fmtNum(licRows.length)} 種類 / アクティブユーザー ${fmtNum(activeUsers)} 名 / プロファイル ${fmtNum(profRows.length)} / 権限セット ${fmtNum(psRows.length)} / Group ${fmtNum(grpRows.length)} / パッケージ ${fmtNum(pkgRows.length)}。**業務担当者向け**: 年次監査資料・組織移管引継ぎ・経営報告・コンサル提案前の現状把握等に 1 クリック生成で活用できます。各章の詳細は個別設計書 (プロファイル詳細レポート / FLS マトリクス 等) を組み合わせてください。`,
  };
}

function fmtDate(s) {
  if (!s) return "";
  return s.replace("T", " ").replace(/\.\d+\+\d+$/, "").replace(/\+\d+$/, "");
}

// =================== 出力フォーマッタ ===================

export function formatOutput(result, format) {
  const fmt = (format || "markdown").toLowerCase();
  if (result.type === "erDiagram" && result.sections[0].mermaid) {
    const m = result.sections[0].mermaid;
    if (fmt === "html") {
      return `<h1>${esc(result.title)}</h1>\n<pre><code>${esc(m)}</code></pre>\n<p>${esc(result.note || "")}</p>`;
    }
    if (fmt === "markdown") {
      return `# ${result.title}\n\n\`\`\`mermaid\n${m}\n\`\`\`\n\n${result.note || ""}\n`;
    }
    if (fmt === "json") {
      return JSON.stringify({ title: result.title, type: result.type, note: result.note || "", mermaid: m }, null, 2);
    }
    // CSV/TSV はそのままテキスト
    return m;
  }
  if (fmt === "markdown") return toMarkdown(result);
  if (fmt === "html") return toHtml(result);
  if (fmt === "csv") return toCsv(result, ",");
  if (fmt === "tsv") return toCsv(result, "\t");
  if (fmt === "excel" || fmt === "xls") return toExcelXml(result);
  // v3.161.0 Phase 251: JSON 形式出力 — API 連携・別ツール取り込み・自動処理向け
  if (fmt === "json") return toJson(result);
  return toMarkdown(result);
}

// v3.161.0 Phase 251: 設計書を JSON で出力 (sections / kvRows / rows をそのまま保持)
function toJson(result) {
  return JSON.stringify({
    title: result.title,
    type: result.type,
    note: result.note || "",
    generatedAt: new Date().toISOString(),
    sections: result.sections.map((s) => {
      const out = { heading: s.heading || "" };
      if (s.kvRows) out.kvRows = s.kvRows;
      if (s.headers && s.rows) {
        out.headers = s.headers;
        // rows 内の __html セルは raw 値のみ抽出 (HTML マークアップ除外)
        out.rows = s.rows.map((r) => {
          const cleaned = {};
          for (const k of Object.keys(r)) {
            const v = r[k];
            if (v && typeof v === "object" && v.__html) {
              // 「<button data-api-name="X">👥 使用者を見る</button>」等 — 純粋なテキスト抽出
              cleaned[k] = String(v.__html).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
            } else {
              cleaned[k] = v;
            }
          }
          return cleaned;
        });
      }
      if (s.mermaid) out.mermaid = s.mermaid;
      return out;
    }),
  }, null, 2);
}

// Excel 2003 SpreadsheetML XML 出力。各 section を別シートで出す。
// 拡張子は .xls だが中身は XML。Excel が直接開き、保存時に .xlsx 化を促す。
function toExcelXml(result) {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Font ss:FontName="Yu Gothic UI" ss:Size="10"/></Style>
  <Style ss:ID="title"><Font ss:FontName="Yu Gothic UI" ss:Size="14" ss:Bold="1" ss:Color="#1B96FF"/></Style>
  <Style ss:ID="note"><Font ss:FontName="Yu Gothic UI" ss:Size="9" ss:Italic="1" ss:Color="#666666"/></Style>
  <Style ss:ID="header">
    <Font ss:FontName="Yu Gothic UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
    <Interior ss:Color="#0C66E4" ss:Pattern="Solid"/>
    <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    </Borders>
  </Style>
  <Style ss:ID="cell">
    <Alignment ss:Vertical="Top" ss:WrapText="1"/>
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/>
    </Borders>
  </Style>
  <Style ss:ID="cellAlt" ss:Parent="cell">
    <Interior ss:Color="#F4F8FE" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="key" ss:Parent="cell"><Font ss:Bold="1"/></Style>
 </Styles>`;

  const parts = [header];
  const sheets = [];

  // 概要シート: 1枚目に必ず置く
  const summary = [];
  summary.push(['title', result.title]);
  if (result.note) summary.push(['note', result.note]);
  summary.push(['note', `生成日時: ${new Date().toLocaleString("ja-JP")}`]);
  sheets.push({
    name: "概要",
    type: "summary",
    rows: summary,
  });

  // 各 section をシート化
  result.sections.forEach((s, idx) => {
    let name = (s.heading || `Sheet${idx + 1}`).replace(/[\\/?*[\]:]/g, "_").substring(0, 31);
    // 重複回避
    const existing = sheets.filter((x) => x.name === name).length;
    if (existing) name = (name + "_" + (existing + 1)).substring(0, 31);
    sheets.push({ name, type: s.kvRows ? "kv" : "table", section: s });
  });

  // ER 図の mermaid テキストはシートに 1 列で
  if (result.type === "erDiagram" && result.sections[0].mermaid) {
    sheets.push({ name: "Mermaid", type: "raw", raw: result.sections[0].mermaid });
  }

  for (const sh of sheets) {
    parts.push(`<Worksheet ss:Name="${xmlAttr(sh.name)}">`);
    if (sh.type === "summary") {
      parts.push(`<Table>`);
      parts.push(`<Column ss:Width="600"/>`);
      sh.rows.forEach((r) => {
        const [style, text] = r;
        parts.push(`<Row><Cell ss:StyleID="${style}"><Data ss:Type="String">${xmlText(text)}</Data></Cell></Row>`);
      });
      parts.push(`</Table>`);
    } else if (sh.type === "raw") {
      parts.push(`<Table>`);
      sh.raw.split("\n").forEach((line) => {
        parts.push(`<Row><Cell><Data ss:Type="String">${xmlText(line)}</Data></Cell></Row>`);
      });
      parts.push(`</Table>`);
    } else if (sh.type === "kv") {
      parts.push(`<Table>`);
      parts.push(`<Column ss:Width="160"/><Column ss:Width="500"/>`);
      parts.push(`<Row><Cell ss:StyleID="header"><Data ss:Type="String">項目</Data></Cell><Cell ss:StyleID="header"><Data ss:Type="String">値</Data></Cell></Row>`);
      (sh.section.kvRows || []).forEach((kv, i) => {
        const cs = i % 2 ? "cellAlt" : "cell";
        parts.push(`<Row><Cell ss:StyleID="key"><Data ss:Type="String">${xmlText(kv[0])}</Data></Cell><Cell ss:StyleID="${cs}"><Data ss:Type="String">${xmlText(formatExcelValue(kv[1]))}</Data></Cell></Row>`);
      });
      parts.push(`</Table>`);
    } else if (sh.type === "table") {
      const headers = sh.section.headers || [];
      const rows = sh.section.rows || [];
      parts.push(`<Table>`);
      // 1列目 (通常 "No" や API 名) は 80、それ以外は 180 をデフォルト幅に
      headers.forEach((h, hi) => {
        const w = hi === 0 ? 60 : (String(h).length > 20 ? 220 : 180);
        parts.push(`<Column ss:Width="${w}"/>`);
      });
      // header row (freeze pane 用に行ID 1)
      parts.push(`<Row ss:Height="22">` + headers.map((h) =>
        `<Cell ss:StyleID="header"><Data ss:Type="String">${xmlText(h)}</Data></Cell>`
      ).join("") + `</Row>`);
      rows.forEach((r, i) => {
        const cs = i % 2 ? "cellAlt" : "cell";
        parts.push(`<Row>` + headers.map((h) => {
          const v = r[h];
          const isNum = typeof v === "number" && Number.isFinite(v);
          const type = isNum ? "Number" : "String";
          const text = isNum ? String(v) : xmlText(formatExcelValue(v));
          return `<Cell ss:StyleID="${cs}"><Data ss:Type="${type}">${text}</Data></Cell>`;
        }).join("") + `</Row>`);
      });
      parts.push(`</Table>`);
      // ヘッダ行固定
      parts.push(`<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
  <FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane>
  </WorksheetOptions>`);
    }
    parts.push(`</Worksheet>`);
  }

  parts.push(`</Workbook>`);
  return parts.join("\n");
}

// v1.96.0+: Excel 出力でもネスト平坦化 + datetime 整形 (csvCell/recordsToCsv と同パターン)
// v1.97.0+: Excel セル文字数上限 (32,767) を超える長文を末尾切詰 + 警告マーカー
const EXCEL_CELL_LIMIT = 32767;
function formatExcelValue(v) {
  let s;
  if (v == null) s = "";
  else if (typeof v === "object") {
    if (v.attributes && typeof v.attributes === "object") {
      const fields = Object.keys(v).filter((k) => k !== "attributes");
      if (v.records && Array.isArray(v.records)) s = `[${v.records.length} 件のサブクエリ]`;
      else {
        let label = null;
        const prefer = ["Name", "Subject", "Title", "DeveloperName", "MasterLabel", "FullName"];
        for (const p of prefer) {
          if (fields.includes(p) && v[p] != null) {
            const id = fields.includes("Id") && v.Id ? ` [${String(v.Id).substring(0, 18)}]` : "";
            label = `${formatExcelValue(v[p])}${id}`;
            break;
          }
        }
        if (!label) label = fields.length ? `${fields[0]}=${formatExcelValue(v[fields[0]])}` : "{}";
        s = label;
      }
    } else {
      s = JSON.stringify(v);
    }
  } else {
    s = String(v);
    const m = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/);
    if (m) s = `${m[1]} ${m[2]}`;
  }
  // Excel セル上限 32,767 文字。超えるとファイル破損の原因になるため末尾切詰
  if (s.length > EXCEL_CELL_LIMIT) {
    s = s.substring(0, EXCEL_CELL_LIMIT - 16) + " …(Excel 上限切詰)";
  }
  return s;
}
export function xmlText(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/\r?\n/g, "&#10;")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}
export function xmlAttr(s) { return xmlText(s); }

function toMarkdown(result) {
  const lines = [`# ${result.title}`, ""];
  if (result.note) lines.push(`> ${result.note}`, "");
  for (const s of result.sections) {
    if (s.heading) lines.push(`## ${s.heading}`, "");
    if (s.kvRows) {
      lines.push("| 項目 | 値 |", "|---|---|");
      for (const [k, v] of s.kvRows) lines.push(`| ${md(k)} | ${md(v)} |`);
      lines.push("");
    } else if (s.headers && s.rows) {
      lines.push("| " + s.headers.map(md).join(" | ") + " |");
      lines.push("|" + s.headers.map(() => "---").join("|") + "|");
      for (const r of s.rows) lines.push("| " + s.headers.map((h) => md(r[h])).join(" | ") + " |");
      lines.push("");
    }
  }
  return lines.join("\n");
}

export function md(v) {
  if (v == null) return "";
  return String(v).replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

function toHtml(result) {
  const parts = [`<h1>${esc(result.title)}</h1>`];
  if (result.note) {
    // v3.34.0: note 内の **bold** マークダウンを <strong> に変換 (業務担当者向け note で多用される強調)
    const noteHtml = esc(result.note).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    parts.push(`<blockquote>${noteHtml}</blockquote>`);
  }
  for (const s of result.sections) {
    // v3.33.0: 凡例セクションには .design-legend クラスを付けて CSS で視覚的に区別
    const isLegend = s.heading && /^(\d+\.\s*)?凡例/.test(s.heading);
    const sectionClass = isLegend ? ' class="design-legend"' : "";
    if (s.heading) {
      // v3.39.0: 番号付き heading (例: "1. オブジェクト概要") の先頭番号を <span class="design-chap-no"> で囲み CSS で chip 化
      const numMatch = !isLegend && s.heading.match(/^(\d+)\.\s*(.+)$/);
      const headingHtml = numMatch
        ? `<span class="design-chap-no">${numMatch[1]}</span>${esc(numMatch[2])}`
        : esc(s.heading);
      parts.push(`<h2${sectionClass}>${headingHtml}</h2>`);
    }
    if (s.kvRows) {
      parts.push(`<table${sectionClass}><thead><tr><th>項目</th><th>値</th></tr></thead><tbody>`);
      for (const [k, v] of s.kvRows) parts.push(`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`);
      parts.push("</tbody></table>");
    } else if (s.headers && s.rows) {
      parts.push(`<table${sectionClass}><thead><tr>` + s.headers.map((h) => `<th>${esc(h)}</th>`).join("") + "</tr></thead><tbody>");
      for (const r of s.rows) {
        parts.push("<tr>" + s.headers.map((h) => `<td>${esc(r[h])}</td>`).join("") + "</tr>");
      }
      parts.push("</tbody></table>");
    }
  }
  return parts.join("\n");
}

function toCsv(result, sep) {
  const lines = [];
  lines.push(`# ${result.title}`);
  if (result.note) lines.push(`# ${result.note}`);
  for (const s of result.sections) {
    if (s.heading) { lines.push(""); lines.push(`# ${s.heading}`); }
    if (s.kvRows) {
      lines.push(["項目", "値"].map(csvCell).join(sep));
      for (const [k, v] of s.kvRows) lines.push([k, v].map(csvCell).join(sep));
    } else if (s.headers && s.rows) {
      lines.push(s.headers.map(csvCell).join(sep));
      for (const r of s.rows) lines.push(s.headers.map((h) => csvCell(r[h])).join(sep));
    }
  }
  return lines.join("\n");
}
function csvCell(v) {
  if (v == null) return "";
  // v1.95.0+: recordsToCsv と同じ整形 (ネスト attributes 持ち object → Name [Id]、ISO datetime → YYYY-MM-DD HH:mm)
  let s;
  if (typeof v === "object") {
    if (v.attributes && typeof v.attributes === "object") {
      const fields = Object.keys(v).filter((k) => k !== "attributes");
      if (v.records && Array.isArray(v.records)) s = `[${v.records.length} 件のサブクエリ]`;
      else {
        const prefer = ["Name", "Subject", "Title", "DeveloperName", "MasterLabel", "FullName"];
        let label = null;
        for (const p of prefer) {
          if (fields.includes(p) && v[p] != null) {
            const id = fields.includes("Id") && v.Id ? ` [${String(v.Id).substring(0, 18)}]` : "";
            label = `${csvCell(v[p])}${id}`;
            break;
          }
        }
        if (!label) label = fields.length ? `${fields[0]}=${csvCell(v[fields[0]])}` : "{}";
        s = label;
      }
    } else {
      s = JSON.stringify(v);
    }
  } else {
    s = String(v);
    // ISO datetime → 整形 (date のみは維持)
    const m = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/);
    if (m) s = `${m[1]} ${m[2]}`;
  }
  // CSV クォート (区切り文字や改行を含む場合)
  if (/[",\n\t]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Markdown を簡易 HTML にレンダリング (プレビュー用)。完全な仕様ではなく headings/table/code/list/blockquote/hr/inline-code/bold/italic だけ対応
export function markdownToHtml(md) {
  if (!md) return "";
  const lines = md.split(/\r?\n/);
  const out = [];
  let inCode = false; let codeLang = "";
  let tableBuf = null;
  let listBuf = null;

  const flushTable = () => {
    if (!tableBuf) return;
    const [h, sep, ...rows] = tableBuf;
    const heads = splitMd(h);
    // ヘッダ th に title 属性 (列名を tooltip 表示) を付与 — 長い見出しが省略されても hover で読める
    out.push("<table><thead><tr>" + heads.map((c) => {
      const plain = c.replace(/[*`_]/g, "").trim();
      return `<th title="${esc(plain)}">${inline(c)}</th>`;
    }).join("") + "</tr></thead><tbody>");
    for (const r of rows) {
      const cells = splitMd(r);
      out.push("<tr>" + cells.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>");
    }
    out.push("</tbody></table>");
    tableBuf = null;
  };
  const flushList = () => {
    if (!listBuf) return;
    out.push("<ul>" + listBuf.map((i) => `<li>${inline(i)}</li>`).join("") + "</ul>");
    listBuf = null;
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      flushTable(); flushList();
      if (inCode) { out.push("</code></pre>"); inCode = false; }
      else { codeLang = line.slice(3).trim(); out.push(`<pre><code class="lang-${esc(codeLang)}">`); inCode = true; }
      continue;
    }
    if (inCode) { out.push(esc(line)); continue; }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      if (!tableBuf) tableBuf = [];
      tableBuf.push(line);
      continue;
    } else if (tableBuf) flushTable();

    if (/^\s*[-*]\s+/.test(line)) {
      if (!listBuf) listBuf = [];
      listBuf.push(line.replace(/^\s*[-*]\s+/, ""));
      continue;
    } else if (listBuf) flushList();

    let m;
    if ((m = line.match(/^###\s+(.*)$/))) out.push(`<h3>${inline(m[1])}</h3>`);
    else if ((m = line.match(/^##\s+(.*)$/))) out.push(`<h2>${inline(m[1])}</h2>`);
    else if ((m = line.match(/^#\s+(.*)$/))) out.push(`<h1>${inline(m[1])}</h1>`);
    else if ((m = line.match(/^>\s?(.*)$/))) out.push(`<blockquote>${inline(m[1])}</blockquote>`);
    else if (/^---+$/.test(line)) out.push(`<hr/>`);
    else if (line.trim() === "") out.push("");
    else out.push(`<p>${inline(line)}</p>`);
  }
  flushTable(); flushList();
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

// Markdown テーブル行 ("| a | b | c |") を セル配列 ["a", "b", "c"] に分解。
// 注意: セル値内に `|` リテラルがある場合 (例: "ApexClass|ApexTrigger") は分割される。
// 設計書ジェネレータの列値には `|` を含めない実装ポリシー (csvCell で `,` 区切りに置換済) のため現状は問題なし。
export function splitMd(line) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((s) => s.trim().replace(/^---+$/, ""));
}

// XSS 対策: esc() で HTML エンティティを先にエスケープしてから、安全な範囲のみ Markdown 記法を許可
// (code/bold/italic のみ。link [text](url) や img ![](url) は意図的に未サポート — 設計書本文に URL 埋め込みする経路がないため)
export function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
