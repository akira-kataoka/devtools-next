// 設計書ジェネレータ。Salesforce のメタデータを REST/Tooling API から集めて
// Markdown / HTML / CSV / TSV / Mermaid で出力する。

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
function fmtNum(n) {
  if (n == null || n === "") return "";
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return String(n);
  return num.toLocaleString("ja-JP");
}

// バイト数を人間可読サイズに整形 (1023 → "1,023 B" / 12345 → "12.1 KB" / 1234567 → "1.18 MB")
function fmtBytes(n) {
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
function fmtTrunc(s, max = 200) {
  if (s == null) return "";
  const str = String(s);
  if (str.length <= max) return str;
  return str.substring(0, max) + ` … [+${fmtNum(str.length - max)} 文字省略]`;
}

// パーセント表示 (0.123 → "12.3%" / 0.456 → "45.6%")。null/undefined は空文字
function fmtPercent(ratio, decimals = 1) {
  if (ratio == null || ratio === "") return "";
  const v = typeof ratio === "number" ? ratio : Number(ratio);
  if (!Number.isFinite(v)) return String(ratio);
  return `${(v * 100).toFixed(decimals)}%`;
}

// v2.98.0: Salesforce フィールドタイプを日本語に変換 (ProfileReader 風表示)
// reference は参照先オブジェクト名 (referenceTo[0]) を引数で渡す
const FIELD_TYPE_JA = {
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
function fieldTypeJa(type, referenceTo) {
  if (!type) return "";
  if (type === "reference" && referenceTo) {
    return `参照関係(${referenceTo})`;
  }
  // Salesforce Name 複合項目の特殊ケース (label が "名前" の string 型)
  return FIELD_TYPE_JA[type] || type;
}

// v2.98.0: 設計書の表紙セクション共通生成 (プロジェクト成果物品質)
// 全設計書冒頭に挿入する標準セクション
function makeCoverSection(opts) {
  // opts: { docTitle, target, orgHost, userName, version, revision }
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return {
    heading: "📄 表紙",
    kvRows: [
      ["設計書", opts.docTitle || ""],
      ["対象", opts.target || ""],
      ["対象組織", opts.orgHost || ""],
      ["作成者", opts.userName || "(SOAP 認証ユーザ)"],
      ["作成日時", dateStr],
      ["拡張機能 Ver", opts.version || "DevToolsNext v2.98+"],
      ["改訂履歴", opts.revision || `初版 / ${dateStr} 自動生成`],
    ],
  };
}

export async function generateDesign({ type, host, sid, apiVersion, obj, format, onProgress }) {
  let result;
  const progress = onProgress || (() => {});
  const ctx = { host, sid, apiVersion, obj, progress };
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

  return {
    title: `オブジェクト定義書: ${d.label} (${d.name})`,
    type: "objectDef",
    sections: [
      cover,
      { heading: "1. オブジェクト概要", kvRows: meta },
      { heading: "2. 項目定義", headers, rows },
      ...(childRels.length ? [{ heading: "3. 子リレーション", headers: Object.keys(childRels[0] || {}), rows: childRels }] : []),
      ...(rts.length ? [{ heading: "4. レコードタイプ", headers: Object.keys(rts[0] || {}), rows: rts }] : []),
    ],
    note: `項目数 ${fmtNum(rows.length)} / 子リレーション ${fmtNum(childRels.length)} / レコードタイプ ${fmtNum(rts.length)} — 業務担当者向け: 「項目定義」シートが入力画面の項目一覧と一致します。「2. 項目定義」を Excel でフィルタ → 「カスタム=○」絞り込みで自組織独自項目のみ抽出できます。新規実装時はこのシートをレビュー対象資料として活用してください。`,
  };
}

// ============ プロファイル一覧 ============
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
  const headers = ["No", "プロファイル名", "ライセンス", "ユーザ種別", "説明", "作成日", "更新日"];
  const rows = records.map((p, i) => ({
    "No": i + 1,
    "プロファイル名": p.Name,
    "ライセンス": p.UserLicense ? p.UserLicense.Name : "(なし)",
    "ユーザ種別": userTypeMap[p.UserType] || p.UserType || "",
    "説明": fmtTrunc(p.Description || "", 200),
    "作成日": fmtDate(p.CreatedDate),
    "更新日": fmtDate(p.LastModifiedDate),
  }));
  const legend = [
    ["プロファイルとは", "ユーザ作成時に必須となる権限の母体。ユーザ毎にちょうど 1 つ割当てる (権限セットと違い複数割当不可)"],
    ["ライセンス", "プロファイルが紐づく UserLicense。Salesforce / Salesforce Platform / Customer Community 等が代表"],
    ["ユーザ種別", "標準 = 内部ユーザ、Power〇〇 / Customer〇〇 = 外部 (Experience Cloud / コミュニティ) ユーザ"],
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
    note: `合計 ${fmtNum(records.length)} 件 / 内部ユーザ向け ${fmtNum(internalCount)} 件 / 外部 (コミュニティ/Experience Cloud) ユーザ向け ${fmtNum(externalCount)} 件 / ライセンス別: ${licBreakdown}。**業務担当者向け**: 本一覧は組織で利用中の全プロファイルです。新規ユーザー作成時の参考、未使用プロファイル整理 (棚卸し)、年次セキュリティ監査時の権限主体洗い出し等にご活用ください。詳細権限を確認するには「プロファイル/権限セット 詳細レポート」を選択してください。`,
  };
}

// ============ 権限セット一覧 ============
async function buildPermSetList({ host, sid, apiVersion }) {
  const r = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT Id, Name, Label, License.Name, IsCustom, NamespacePrefix, Description, LastModifiedDate FROM PermissionSet WHERE IsOwnedByProfile=false ORDER BY Name LIMIT 500`,
  });
  if (!r.ok) throw apiError("権限セットの取得に失敗しました", r);
  const records = r.data.records || [];
  const headers = ["No", "API 名", "ラベル (画面表示名)", "ライセンス", "ネームスペース", "種別", "説明", "更新日"];
  const rows = records.map((p, i) => ({
    "No": i + 1,
    "API 名": p.Name,
    "ラベル (画面表示名)": p.Label,
    "ライセンス": p.License ? p.License.Name : "(なし: 機能限定)",
    "ネームスペース": p.NamespacePrefix || "(なし: カスタム)",
    "種別": p.IsCustom ? "カスタム" : "標準/パッケージ",
    "説明": fmtTrunc(p.Description || "", 200),
    "更新日": fmtDate(p.LastModifiedDate),
  }));
  const legend = [
    ["権限セットとは", "プロファイルとは別に、特定機能 (例: レポート作成・データエクスポート) をユーザに『加算』する仕組み。複数割当可"],
    ["ライセンス", "(なし) = 機能限定 / Salesforce 等 = そのライセンスに紐づくユーザにのみ割当可能"],
    ["ネームスペース", "(なし) = 自組織のカスタム / 値あり = AppExchange パッケージや管理パッケージ由来"],
    ["種別", "カスタム = 管理者が作成・編集可、標準/パッケージ = Salesforce 標準またはパッケージ提供で編集制限あり"],
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
    note: `合計 ${fmtNum(records.length)} 件 (プロファイル付随を除外) / カスタム ${fmtNum(customCount)} 件・標準/パッケージ ${fmtNum(packagedCount)} 件 / 自組織 ${fmtNum(localCount)} 件・パッケージ由来 ${fmtNum(externalNsCount)} 件 / ライセンス別: ${psLicBreakdown}。**業務担当者向け**: 権限セットはプロファイルに加えて付与する追加権限の単位です。役割ベースのアクセス管理 (RBAC) 設計時の参考、組織再編時の権限再設計、未使用権限セット棚卸し等にご活用ください。権限セットグループの中身は別途確認が必要です。`,
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
  return {
    title: "フロー一覧 (アクティブのみ)",
    type: "flowList",
    sections: [
      makeCoverSection({ docTitle: "フロー一覧 (アクティブのみ)", target: "組織全体 (全アクティブ Flow)", orgHost: host, revision: "初版" }),
      { heading: "フロー", headers, rows },
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
async function buildFieldSetList({ host, sid, apiVersion, obj }) {
  requireInput(obj, "オブジェクト API 名 (例: Account)");
  const r = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/sobjects/${encodeURIComponent(obj)}/describe` });
  if (!r.ok) throw apiError(`オブジェクト '${obj}' の describe 取得に失敗しました`, r);
  const sets = (r.data.namedLayoutInfos || r.data.fieldSets) ? (r.data.fieldSets || []) : [];
  // describe レスポンスに FieldSet は無いため、Tooling FieldSet を引く
  const tr = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, DeveloperName, MasterLabel, Description, EntityDefinition.QualifiedApiName FROM FieldSet WHERE EntityDefinition.QualifiedApiName='${obj.replace(/'/g, "\\'")}' ORDER BY DeveloperName LIMIT 200`,
  });
  if (!tr.ok) throw apiError("フィールドセットの取得に失敗しました", tr);
  const headers = ["No", "API 名", "ラベル", "説明"];
  const records = tr.data.records || [];
  const rows = records.map((fs, i) => ({
    "No": i + 1,
    "API 名": fs.DeveloperName,
    "ラベル": fs.MasterLabel,
    "説明": fmtTrunc(fs.Description || "", 200),
  }));
  // v2.74.0: 凡例セクション追加 (FieldSet の使い方を業務担当向けに解説)
  const fsLegend = [
    ["フィールドセットとは", "オブジェクト内の複数項目を 1 つの名前付きセットにまとめる仕組み。LWC/VF/Apex から動的に「表示すべき項目」を取得できる"],
    ["主な用途 (LWC)", "lightning-record-edit-form の field-set 指定や、テーブルの動的列構築で使う。管理者が画面を変更してもコードは変更不要"],
    ["主な用途 (Visualforce)", "<apex:repeat> や <apex:pageBlockTable> で動的にフィールドを描画する際のループソース"],
    ["管理画面", "Setup → オブジェクト → フィールドセット で作成・並び替えが可能。プロジェクトでは『画面 = FieldSet 1 件』で管理することが多い"],
    ["注意点", "削除時は依存する LWC/VF/Apex のコンパイルエラーになる可能性あり。事前に Setup の 『どこで使用されているか』 を確認すること"],
  ];
  // ネームスペース有無で組織側 / パッケージ由来を判別 (FieldSet テーブルには直接 NamespacePrefix が無いため API 名から推測しない方針 - 集計のみ件数)
  return {
    title: `フィールドセット一覧: ${obj}`,
    type: "fieldSetList",
    sections: [
      makeCoverSection({ docTitle: "フィールドセット一覧", target: obj, orgHost: host, revision: "初版" }),
      { heading: "0. 凡例", kvRows: fsLegend },
      { heading: "1. FieldSet", headers, rows },
    ],
    note: `合計 ${fmtNum(records.length)} 件。**業務担当者向け**: FieldSet (フィールドセット) は管理者が画面に表示する項目を後から変更できる仕組みです。開発者が予め FieldSet を組み込んだ画面・帳票を、管理者が項目追加・並び替え・削除できます。**削除前注意**: LWC/Visualforce 画面から参照されている場合、削除すると画面エラーになります。Setup > オブジェクトマネージャ > 該当オブジェクト > フィールドセット で使用箇所を必ず確認してください。`,
  };
}

// ============ カスタム設定一覧 ============
async function buildCustomSettingList({ host, sid, apiVersion }) {
  const r = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, DeveloperName, MasterLabel, CustomSettingsType, Description FROM CustomObject WHERE CustomSettingsType != null ORDER BY DeveloperName LIMIT 500`,
  });
  if (!r.ok) throw apiError("カスタム設定の取得に失敗しました", r);
  const typeMap = {
    "List": "List 型 (組織共通の定数表)",
    "Hierarchy": "Hierarchy 型 (組織/プロファイル/ユーザ毎に上書き可)",
  };
  const records = r.data.records || [];
  const headers = ["No", "API 名", "ラベル", "種別", "説明"];
  const rows = records.map((c, i) => ({
    "No": i + 1,
    "API 名": c.DeveloperName + "__c",
    "ラベル": c.MasterLabel,
    "種別": typeMap[c.CustomSettingsType] || c.CustomSettingsType,
    "説明": fmtTrunc(c.Description || "", 200),
  }));
  const legend = [
    ["カスタム設定とは", "Apex/フロー/数式から高速にアクセスできるキー値ストア。標準オブジェクトより SOQL Limit を消費しない"],
    ["List 型", "組織全体で共通の定数表 (例: 国コード、税率テーブル)。レコードに『Name』だけがキー"],
    ["Hierarchy 型", "組織 → プロファイル → ユーザの順で上書き可能。ユーザ毎に異なる値を返したい時に使用 (例: API キー)"],
    ["カスタムメタデータとの違い", "カスタム設定はレコード=データ、カスタムメタデータはレコード=メタ定義 (デプロイ可能)。新規実装は CustomMetadata 推奨"],
  ];
  // v2.71.0: note サマリで List 型 / Hierarchy 型 別件数を集計
  const listCount = records.filter((c) => c.CustomSettingsType === "List").length;
  const hierarchyCount = records.filter((c) => c.CustomSettingsType === "Hierarchy").length;
  return {
    title: "カスタム設定一覧",
    type: "customSettingList",
    sections: [
      makeCoverSection({ docTitle: "カスタム設定一覧", target: "組織全体 (全 CustomSetting)", orgHost: host, revision: "初版" }),
      { heading: "0. 凡例", kvRows: legend },
      { heading: "1. CustomSetting", headers, rows },
    ],
    note: `合計 ${fmtNum(rows.length)} 件 / List 型 ${fmtNum(listCount)} 件 / Hierarchy 型 ${fmtNum(hierarchyCount)} 件。**業務担当者向け**: カスタム設定は組織共通のマスタ値 (税率、定数、フラグ等) を保持する仕組みです。**Salesforce は新規実装にカスタムメタデータ型を推奨** (デプロイ可能・キャッシュ可能のため)。本一覧は既存資産確認・移行計画作成に使ってください。Hierarchy 型はユーザー別/プロファイル別の上書き値があるため、ユーザー個別設定の洗い出しに有用です。`,
  };
}

// ============ ER 図 (Mermaid) ============
async function buildErDiagram({ host, sid, apiVersion, obj }) {
  requireInput(obj, "基点となるオブジェクト API 名 (例: Account)");
  // 起点 + 直接の参照先を 1 hop 取る
  const r = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/sobjects/${encodeURIComponent(obj)}/describe` });
  if (!r.ok) throw apiError(`オブジェクト '${obj}' の describe 取得に失敗しました`, r);
  const d = r.data;
  const lines = ["erDiagram"];
  const seen = new Set([d.name]);

  // Mermaid ER 図用エスケープヘルパー
  const mid = (s) => String(s || "").replace(/[^A-Za-z0-9_]/g, "_"); // 識別子: 英数字+_
  const mlabel = (s) => String(s || "")
    .replace(/\\/g, "")          // backslash 除去
    .replace(/"/g, "'")          // " → ' (mermaid label は " で囲むため)
    .replace(/\r?\n/g, " ")      // 改行 → 空白
    .replace(/[\x00-\x1F]/g, ""); // 制御文字除去

  // v2.13.0: Master-Detail と Lookup で線種を区別
  // Mermaid 記法:
  //   親 ||--o{ 子  → Lookup (1 対 0..多、子は親を持たなくても OK)
  //   親 ||--|{ 子  → Master-Detail (1 対 1..多、子は親必須・カスケード削除)
  // v2.71.0: 親/子 別 + MD/Lookup 別の件数集計 (note サマリ用)
  let parentMD = 0, parentLookup = 0, childMD = 0, childLookup = 0;
  let childTotal = 0, childTruncated = false;
  // 親方向 (この obj が子側、reference 項目で親を参照)
  const refs = (d.fields || []).filter((f) => f.type === "reference" && (f.referenceTo || []).length);
  refs.forEach((f) => {
    (f.referenceTo || []).forEach((to) => {
      // f.nillable=false かつ writeRequiresMasterRead が true なら Master-Detail
      const isMD = f.relationshipName && !f.nillable && (f.cascadeDelete || f.writeRequiresMasterRead);
      const arrow = isMD ? `}|--||` : `}o--||`;
      const kind = isMD ? "MD" : "Lookup";
      lines.push(`    ${mid(d.name)} ${arrow} ${mid(to)} : "${mlabel(f.name)} (${kind})"`);
      seen.add(to);
      if (isMD) parentMD++; else parentLookup++;
    });
  });
  // 子方向 (childRelationships) — cascadeDelete = true なら Master-Detail
  const allChildren = (d.childRelationships || []).filter((c) => c.childSObject);
  childTotal = allChildren.length;
  if (childTotal > 30) childTruncated = true;
  allChildren.slice(0, 30).forEach((c) => {
    const isMD = !!c.cascadeDelete;
    const arrow = isMD ? `||--|{` : `||--o{`;
    const kind = isMD ? "MD" : "Lookup";
    lines.push(`    ${mid(d.name)} ${arrow} ${mid(c.childSObject)} : "${mlabel(c.field)} (${kind})"`);
    seen.add(c.childSObject);
    if (isMD) childMD++; else childLookup++;
  });

  // 各エンティティに API 名表示用の空ブロック
  Array.from(seen).forEach((name) => {
    lines.push(`    ${mid(name)} {`);
    if (name === d.name) {
      (d.fields || []).slice(0, 8).forEach((f) => {
        lines.push(`        ${sanitizeType(f.type)} ${mid(f.name)} "${mlabel(f.label)}"`);
      });
    }
    lines.push(`    }`);
  });

  const mermaid = lines.join("\n");

  // v2.71.0: note サマリに参照件数 (親方向/子方向 × MD/Lookup) を集計
  const parentTotal = parentMD + parentLookup;
  const childRendered = childMD + childLookup;
  const truncMsg = childTruncated ? ` (うち ${fmtNum(childTotal - 30)} 件は表示省略・childRelationships 上限 30 件)` : "";
  return {
    title: `ER 図: ${d.label} (${d.name}) を起点とした 1-hop`,
    type: "erDiagram",
    sections: [
      makeCoverSection({ docTitle: "ER 図", target: `${d.label} (${d.name}) を起点とした 1-hop`, orgHost: host, revision: "初版" }),
      { heading: "ER 図 (Mermaid)", mermaid },
    ],
    note: `関連エンティティ ${fmtNum(seen.size - 1)} 件 / 親方向参照 ${fmtNum(parentTotal)} 件 (MD ${fmtNum(parentMD)} + Lookup ${fmtNum(parentLookup)}) / 子方向参照 ${fmtNum(childRendered)} 件 (MD ${fmtNum(childMD)} + Lookup ${fmtNum(childLookup)})${truncMsg}。**業務担当者向け**: 本図はデータ連携の依存関係を示します。**Master-Detail (必須参照・カスケード削除)** = 親レコード削除時に子も自動削除される強い結合。**Lookup (任意参照)** = 親なしでも子だけ存在可能な弱い結合。要件定義書や移行計画でデータ削除順序の検討にご活用ください。**可視化**: https://mermaid.live に貼り付け。`,
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

  const sections = [];
  sections.push(makeCoverSection({ docTitle: `${targetType}詳細レポート`, target: targetName, orgHost: host, revision: "初版" }));
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
    note: `対象 ${fmtNum(rows.length)} 項目 / 列 ${fmtNum(allCols.length)} (プロファイル ${fmtNum(profileCols.length)} + 権限セット ${fmtNum(permsetCols.length)}) / 編集可 (RW あり) ${fmtNum(editAnyCount)} 項目 (${fmtPercent(editAnyCount / Math.max(rows.length, 1))}) / 参照のみ ${fmtNum(readOnlyCount)} 項目 (${fmtPercent(readOnlyCount / Math.max(rows.length, 1))}) / アクセス無し ${fmtNum(noAccessCount)} 項目 (${fmtPercent(noAccessCount / Math.max(rows.length, 1))}) / **Excel 推奨**: ウィンドウ枠固定 (B2) で左 5 列 + 先頭行を固定`,
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

  const legend = [
    ["アプリケーションとは", "Salesforce で機能をまとめた『画面パッケージ』。タブ構成・ユーティリティバー・ナビ種別等を定義"],
    ["AppDefinition", "全アプリのメタデータ。Classic / Lightning / 管理パッケージ提供分を含む"],
    ["AppMenuItem", "App Launcher (9 つの点アイコン) にユーザが見るリスト。並び順や表示/非表示を制御"],
    ["UI 種別", "Aloha = Classic UI、Lightning = Lightning Experience"],
    ["ナビゲーション", "標準ナビ = 通常のタブ表示、コンソール = サブタブ・ホバーで複数レコード並行操作"],
  ];

  return {
    title: "アプリケーション一覧 (Lightning + Classic)",
    type: "appList",
    sections: [
      makeCoverSection({ docTitle: "アプリケーション一覧", target: "組織全体 (Lightning + Classic)", orgHost: host, revision: "初版" }),
      { heading: "0. 凡例", kvRows: legend },
      { heading: "1. AppDefinition (組織内全アプリ)", headers, rows },
      ...(menuRows.length ? [{ heading: "2. AppMenuItem (App Launcher 表示順)", headers: menuHeaders, rows: menuRows }] : []),
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
    "オブジェクト": r["オブジェクト"],
    "内部 OWD": r["内部共有 (OWD)"],
    "外部 OWD": r["外部共有 (OWD)"],
    "備考": (r["内部共有 (OWD)"] === "Private" ? "Private のため共有ルール推奨" :
             r["内部共有 (OWD)"] === "ControlledByParent" ? "親レコードに従属" : ""),
  }));

  // 凡例 (v2.12.0: 業務担当者の理解のための略語/値の説明)
  const legendHeaders = ["項目", "意味"];
  const legendRows = [
    { "項目": "OWD", "意味": "Organization-Wide Defaults (組織共通の既定共有設定)" },
    { "項目": "Private (非公開)", "意味": "レコード所有者と上位ロールのみアクセス可" },
    { "項目": "Public Read (参照のみ)", "意味": "全ユーザが参照可能、編集は所有者のみ" },
    { "項目": "Public Read/Write", "意味": "全ユーザが参照・編集可能" },
    { "項目": "Controlled By Parent", "意味": "親レコードのアクセス権限に従う (例: 取引先責任者)" },
    { "項目": "Sharing Rules", "意味": "OWD で制限したレコードを追加共有する補完ルール (本設計書では Metadata API 必須のため未取得)" },
    { "項目": "PermSet 上乗せ", "意味": "プロファイル + Permission Set の合算で実効権限が決まる" },
  ];

  return {
    title: "アクセスコントロール定義書",
    type: "accessControl",
    sections: [
      makeCoverSection({ docTitle: "アクセスコントロール定義書", target: "組織全体 (OWD / 共有設定 / ロール階層)", orgHost: host, revision: "初版" }),
      { heading: "0. 凡例 / 略語の説明", headers: legendHeaders, rows: legendRows },
      { heading: "1. 組織共通の既定共有設定 (OWD)", headers: owdHeaders, rows: owdRows },
      { heading: "2. 共有設計上の注意 (非公開 / 親従属)", headers: sharingHeaders, rows: sharingRows },
      { heading: "3. ロール階層 (UserRole)", headers: roleHeaders, rows: roleRows },
    ],
    note: `OWD ${fmtNum(owdRows.length)} 件 / ロール ${fmtNum(roleRows.length)} 件。**業務担当者向け**: 本設計書はレコードレベルアクセス制御 (誰がどのレコードを見られるか) の基盤を示します。**OWD (組織共通の既定共有設定)** = 全レコードの初期共有レベル / **ロール階層** = 上司は部下のレコードを参照可能。年次セキュリティ監査、組織再編時の権限見直し、機微情報 (人事/契約) 取扱範囲の確認に活用してください。共有ルール詳細は Metadata API (SharingRules) で別途取得が必要です。`,
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
    // CSV/TSV はそのままテキスト
    return m;
  }
  if (fmt === "markdown") return toMarkdown(result);
  if (fmt === "html") return toHtml(result);
  if (fmt === "csv") return toCsv(result, ",");
  if (fmt === "tsv") return toCsv(result, "\t");
  if (fmt === "excel" || fmt === "xls") return toExcelXml(result);
  return toMarkdown(result);
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
function xmlText(s) {
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
function xmlAttr(s) { return xmlText(s); }

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

function md(v) {
  if (v == null) return "";
  return String(v).replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

function toHtml(result) {
  const parts = [`<h1>${esc(result.title)}</h1>`];
  if (result.note) parts.push(`<blockquote>${esc(result.note)}</blockquote>`);
  for (const s of result.sections) {
    if (s.heading) parts.push(`<h2>${esc(s.heading)}</h2>`);
    if (s.kvRows) {
      parts.push("<table><thead><tr><th>項目</th><th>値</th></tr></thead><tbody>");
      for (const [k, v] of s.kvRows) parts.push(`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`);
      parts.push("</tbody></table>");
    } else if (s.headers && s.rows) {
      parts.push("<table><thead><tr>" + s.headers.map((h) => `<th>${esc(h)}</th>`).join("") + "</tr></thead><tbody>");
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
function esc(s) {
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
function splitMd(line) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((s) => s.trim().replace(/^---+$/, ""));
}

// XSS 対策: esc() で HTML エンティティを先にエスケープしてから、安全な範囲のみ Markdown 記法を許可
// (code/bold/italic のみ。link [text](url) や img ![](url) は意図的に未サポート — 設計書本文に URL 埋め込みする経路がないため)
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
