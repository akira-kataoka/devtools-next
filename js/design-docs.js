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
    throw new Error(`入力必須: ${hint}`);
  }
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
    default: throw new Error("unknown design type: " + type);
  }
  result.format = format;
  result.source = formatOutput(result, format);
  return result;
}

// ============ オブジェクト定義書 ============
async function buildObjectDef({ host, sid, apiVersion, obj }) {
  requireInput(obj, "オブジェクト API 名 (例: Account)");
  const r = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/sobjects/${encodeURIComponent(obj)}/describe` });
  if (!r.ok) throw apiError(`describe(${obj})`, r);
  const d = r.data;
  const fields = d.fields || [];

  // フィールド表 (業務テンプレ準拠: v2.11.0 で 「作成可」「更新可」「暗号化」「ヘルプテキスト」を追加分離)
  const headers = [
    "No", "API名", "表示名", "データ型", "桁/精度", "必須", "一意", "外部ID", "計算項目",
    "作成可", "更新可", "暗号化", "参照先", "選択リスト値", "既定値", "ヘルプテキスト", "説明",
  ];
  const rows = fields.map((f, i) => ({
    "No": i + 1,
    "API名": f.name,
    "表示名": f.label,
    "データ型": f.type,
    "桁/精度": f.type === "string" || f.type === "textarea" || f.type === "email" || f.type === "phone" || f.type === "url"
      ? String(f.length || "")
      : (f.precision != null && f.scale != null ? `${f.precision},${f.scale}` : ""),
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
    "ヘルプテキスト": f.inlineHelpText || "",
    "説明": f.description || "",
  }));

  // メタ情報
  const meta = [
    ["API名", d.name],
    ["ラベル", d.label],
    ["カスタム", d.custom ? "Yes" : "No"],
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
    "API名": r.developerName,
    "ラベル": r.name,
    "ID": r.recordTypeId,
    "有効": r.available ? "○" : "",
    "デフォルト": r.defaultRecordTypeMapping ? "○" : "",
  }));

  return {
    title: `オブジェクト定義書: ${d.label} (${d.name})`,
    type: "objectDef",
    sections: [
      { heading: "1. オブジェクト概要", kvRows: meta },
      { heading: "2. 項目定義", headers, rows },
      ...(childRels.length ? [{ heading: "3. 子リレーション", headers: Object.keys(childRels[0] || {}), rows: childRels }] : []),
      ...(rts.length ? [{ heading: "4. レコードタイプ", headers: Object.keys(rts[0] || {}), rows: rts }] : []),
    ],
    note: `生成元: /services/data/v${apiVersion}/sobjects/${d.name}/describe`,
  };
}

// ============ プロファイル一覧 ============
async function buildProfileList({ host, sid, apiVersion }) {
  const r = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT Id, Name, UserLicense.Name, UserType, CreatedDate, LastModifiedDate, Description FROM Profile ORDER BY Name LIMIT 200`,
  });
  if (!r.ok) throw apiError("Profile 取得", r);
  const headers = ["No", "プロファイル名", "ライセンス", "UserType", "説明", "更新日"];
  const rows = (r.data.records || []).map((p, i) => ({
    "No": i + 1,
    "プロファイル名": p.Name,
    "ライセンス": p.UserLicense ? p.UserLicense.Name : "",
    "UserType": p.UserType || "",
    "説明": p.Description || "",
    "更新日": fmtDate(p.LastModifiedDate),
  }));
  return {
    title: "プロファイル一覧",
    type: "profileList",
    sections: [{ heading: "プロファイル", headers, rows }],
    note: `合計 ${rows.length} 件`,
  };
}

// ============ 権限セット一覧 ============
async function buildPermSetList({ host, sid, apiVersion }) {
  const r = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT Id, Name, Label, License.Name, IsCustom, NamespacePrefix, Description, LastModifiedDate FROM PermissionSet WHERE IsOwnedByProfile=false ORDER BY Name LIMIT 500`,
  });
  if (!r.ok) throw apiError("PermissionSet 取得", r);
  const headers = ["No", "API名", "ラベル", "ライセンス", "Namespace", "カスタム", "説明", "更新日"];
  const rows = (r.data.records || []).map((p, i) => ({
    "No": i + 1,
    "API名": p.Name,
    "ラベル": p.Label,
    "ライセンス": p.License ? p.License.Name : "",
    "Namespace": p.NamespacePrefix || "",
    "カスタム": p.IsCustom ? "○" : "",
    "説明": p.Description || "",
    "更新日": fmtDate(p.LastModifiedDate),
  }));
  return {
    title: "権限セット一覧",
    type: "permsetList",
    sections: [{ heading: "PermissionSet", headers, rows }],
    note: `合計 ${rows.length} 件 (プロファイル付随を除く)`,
  };
}

// ============ ApexClass 一覧 ============
async function buildApexClassList({ host, sid, apiVersion }) {
  const r = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, Name, ApiVersion, Status, NamespacePrefix, LengthWithoutComments, CreatedDate, LastModifiedDate FROM ApexClass WHERE ManageableState='unmanaged' OR ManageableState='installedEditable' ORDER BY Name LIMIT 500`,
  });
  if (!r.ok) throw apiError("ApexClass 取得", r);
  // v2.14.0: ステータス + 列名を業務用語化
  const statusLabel = (s) => ({ "Active": "有効", "Inactive": "無効", "Deleted": "削除済" }[s] || s);
  const headers = ["No", "クラス名", "ネームスペース", "API バージョン", "ステータス", "コード行数 (コメント除く)", "更新日"];
  const rows = (r.data.records || []).map((p, i) => ({
    "No": i + 1,
    "クラス名": p.Name,
    "ネームスペース": p.NamespacePrefix || "(なし)",
    "API バージョン": p.ApiVersion,
    "ステータス": statusLabel(p.Status),
    "コード行数 (コメント除く)": p.LengthWithoutComments,
    "更新日": fmtDate(p.LastModifiedDate),
  }));
  return {
    title: "Apex クラス一覧",
    type: "apexClassList",
    sections: [{ heading: "Apex クラス", headers, rows }],
    note: `合計 ${rows.length} 件 (unmanaged + installedEditable) / コード行数はトリガ Apex Limit (組織あたり 6MB) 試算の目安`,
  };
}

// ============ ApexTrigger 一覧 ============
async function buildApexTriggerList({ host, sid, apiVersion }) {
  const r = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, Name, TableEnumOrId, UsageBeforeInsert, UsageAfterInsert, UsageBeforeUpdate, UsageAfterUpdate, UsageBeforeDelete, UsageAfterDelete, UsageAfterUndelete, Status, LastModifiedDate FROM ApexTrigger ORDER BY TableEnumOrId, Name LIMIT 500`,
  });
  if (!r.ok) throw apiError("ApexTrigger 取得", r);
  const headers = ["No", "トリガ名", "対象オブジェクト", "BI", "AI", "BU", "AU", "BD", "AD", "AUD", "ステータス", "更新日"];
  const rows = (r.data.records || []).map((p, i) => ({
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
    "ステータス": p.Status,
    "更新日": fmtDate(p.LastModifiedDate),
  }));
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
      { heading: "0. 凡例 / トリガイベント略号", headers: legendHeaders, rows: legendRows },
      { heading: "1. Apex トリガ一覧", headers, rows },
    ],
    note: `合計 ${rows.length} 件 / Before/After × Insert/Update/Delete/Undelete の発火タイミング表`,
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
    if (!r2.ok) throw apiError("Flow 取得 (fallback)", r2);
    const headers = ["No", "ラベル", "API 名", "種別", "状態", "バージョン"];
    const rows = (r2.data.records || []).map((f, i) => ({
      "No": i + 1, "ラベル": f.MasterLabel, "API 名": f.Definition ? f.Definition.DeveloperName : "",
      "種別": processTypeLabel(f.ProcessType), "状態": f.Status === "Active" ? "アクティブ" : (f.Status || ""), "バージョン": f.VersionNumber,
    }));
    return { title: "フロー一覧 (アクティブのみ)", type: "flowList", sections: [{ heading: "フロー", headers, rows }], note: `合計 ${rows.length} 件 / 種別と状態は業務用語表記` };
  }
  const headers = ["No", "ラベル", "API 名", "種別", "アクティブ", "バージョン", "説明", "更新日"];
  const rows = (r.data.records || []).map((f, i) => ({
    "No": i + 1,
    "ラベル": f.MasterLabel,
    "API 名": f.DeveloperName,
    "種別": processTypeLabel(f.ProcessType),
    "アクティブ": f.IsActive ? "○" : "",
    "バージョン": f.VersionNumber,
    "説明": f.Description || "",
    "更新日": fmtDate(f.LastModifiedDate),
  }));
  return { title: "フロー一覧 (アクティブのみ)", type: "flowList", sections: [{ heading: "フロー", headers, rows }], note: `合計 ${rows.length} 件 / 種別は業務用語+原文併記、Process Builder は段階的廃止 (Salesforce 公式アナウンス)` };
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
  const rows = (r.data.records || []).map((v, i) => ({
    "No": i + 1,
    "オブジェクト": v.EntityDefinition ? v.EntityDefinition.QualifiedApiName : "",
    "ルール名 (API)": v.ValidationName,
    "有効": v.Active ? "○ 有効" : "− 無効",
    "エラー表示位置": v.ErrorDisplayField ? `項目: ${v.ErrorDisplayField}` : "ページ上部 (全体)",
    "エラーメッセージ": v.ErrorMessage || "",
    "説明 (開発者向け)": v.Description || "",
    "更新日": fmtDate(v.LastModifiedDate),
  }));
  const legend = [
    ["有効", "○ 有効 = ルール適用中、− 無効 = 一時的に停止 (テスト中等)"],
    ["エラー表示位置", "項目: <API名> = その項目の直下に赤字で表示、ページ上部 = 画面トップに警告として表示"],
    ["エラーメッセージ", "保存時に検証失敗した場合にユーザーへ表示される文言。多言語化したい場合は \\$Label を使用"],
    ["説明", "Setup 画面の開発者向けメモ。ユーザーには表示されない"],
  ];
  return {
    title: obj ? `入力規則一覧: ${obj}` : "入力規則一覧 (全オブジェクト)",
    type: "validationRuleList",
    sections: [
      { heading: "0. 凡例", kvRows: legend },
      { heading: "1. ValidationRule", headers, rows },
    ],
    note: `合計 ${rows.length} 件 / 無効ルールも本一覧には含まれます (Setup では既定で非表示)`,
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
  const headers = ["No", "オブジェクト", "API名 (DeveloperName)", "ラベル (画面表示名)", "有効", "営業プロセス連携", "説明 (開発者向け)"];
  const rows = (r.data.records || []).map((rt, i) => ({
    "No": i + 1,
    "オブジェクト": rt.SobjectType,
    "API名 (DeveloperName)": rt.DeveloperName,
    "ラベル (画面表示名)": rt.Name,
    "有効": rt.IsActive ? "○ 有効" : "− 無効",
    "営業プロセス連携": rt.BusinessProcessId ? `あり (${rt.BusinessProcessId.substring(0, 15)})` : "なし",
    "説明 (開発者向け)": rt.Description || "",
  }));
  const legend = [
    ["レコードタイプとは", "同じオブジェクト内で異なるピックリスト値・ページレイアウト・営業プロセスを使い分ける仕組み"],
    ["有効", "○ 有効 = プロファイル/権限セットで割当可能、− 無効 = 既存レコードは保持されるが新規作成不可"],
    ["営業プロセス連携", "Opportunity / Lead / Case / Solution で利用される BusinessProcess (フェーズ/ステータス段階) との紐付け"],
    ["割当て", "実際の利用可否はプロファイル/権限セットの『レコードタイプの割り当て』で決定 (本一覧はメタ定義のみ)"],
  ];
  return {
    title: obj ? `レコードタイプ一覧: ${obj}` : "レコードタイプ一覧 (全オブジェクト)",
    type: "recordTypeList",
    sections: [
      { heading: "0. 凡例", kvRows: legend },
      { heading: "1. RecordType", headers, rows },
    ],
    note: `合計 ${rows.length} 件 / 無効レコードタイプも本一覧には含まれます`,
  };
}

// ============ FieldSet 一覧 ============
async function buildFieldSetList({ host, sid, apiVersion, obj }) {
  requireInput(obj, "オブジェクト API 名 (例: Account)");
  const r = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/sobjects/${encodeURIComponent(obj)}/describe` });
  if (!r.ok) throw apiError(`describe(${obj})`, r);
  const sets = (r.data.namedLayoutInfos || r.data.fieldSets) ? (r.data.fieldSets || []) : [];
  // describe レスポンスに FieldSet は無いため、Tooling FieldSet を引く
  const tr = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, DeveloperName, MasterLabel, Description, EntityDefinition.QualifiedApiName FROM FieldSet WHERE EntityDefinition.QualifiedApiName='${obj.replace(/'/g, "\\'")}' ORDER BY DeveloperName LIMIT 200`,
  });
  if (!tr.ok) throw apiError("FieldSet 取得", tr);
  const headers = ["No", "API名", "ラベル", "説明"];
  const rows = (tr.data.records || []).map((fs, i) => ({
    "No": i + 1,
    "API名": fs.DeveloperName,
    "ラベル": fs.MasterLabel,
    "説明": fs.Description || "",
  }));
  return {
    title: `フィールドセット一覧: ${obj}`,
    type: "fieldSetList",
    sections: [{ heading: "FieldSet", headers, rows }],
    note: `合計 ${rows.length} 件`,
  };
}

// ============ カスタム設定一覧 ============
async function buildCustomSettingList({ host, sid, apiVersion }) {
  const r = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, DeveloperName, MasterLabel, CustomSettingsType, Description FROM CustomObject WHERE CustomSettingsType != null ORDER BY DeveloperName LIMIT 500`,
  });
  if (!r.ok) throw apiError("CustomSetting 取得", r);
  const headers = ["No", "API名", "ラベル", "種別", "説明"];
  const rows = (r.data.records || []).map((c, i) => ({
    "No": i + 1,
    "API名": c.DeveloperName + "__c",
    "ラベル": c.MasterLabel,
    "種別": c.CustomSettingsType, // 'List' or 'Hierarchy'
    "説明": c.Description || "",
  }));
  return {
    title: "カスタム設定一覧",
    type: "customSettingList",
    sections: [{ heading: "CustomSetting", headers, rows }],
    note: `合計 ${rows.length} 件`,
  };
}

// ============ ER 図 (Mermaid) ============
async function buildErDiagram({ host, sid, apiVersion, obj }) {
  requireInput(obj, "基点オブジェクト API 名 (例: Account)");
  // 起点 + 直接の参照先を 1 hop 取る
  const r = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/sobjects/${encodeURIComponent(obj)}/describe` });
  if (!r.ok) throw apiError(`describe(${obj})`, r);
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
    });
  });
  // 子方向 (childRelationships) — cascadeDelete = true なら Master-Detail
  (d.childRelationships || []).slice(0, 30).forEach((c) => {
    if (!c.childSObject) return;
    const isMD = !!c.cascadeDelete;
    const arrow = isMD ? `||--|{` : `||--o{`;
    const kind = isMD ? "MD" : "Lookup";
    lines.push(`    ${mid(d.name)} ${arrow} ${mid(c.childSObject)} : "${mlabel(c.field)} (${kind})"`);
    seen.add(c.childSObject);
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

  return {
    title: `ER 図: ${d.label} (${d.name}) を起点とした 1-hop`,
    type: "erDiagram",
    sections: [{ heading: "ER 図 (Mermaid)", mermaid }],
    note: "Mermaid Live Editor (https://mermaid.live) に貼ると可視化されます。線種: ||--o{ = Lookup (任意参照) / ||--|{ = Master-Detail (必須参照・カスケード削除)。",
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
  requireInput(obj, "プロファイル名 (例: 営業ユーザー) または '@PermSet_API名'");
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
  if (!psR.ok) throw apiError("PermissionSet 取得", psR);
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
    ["集計件数 Object 権限", String(objRows.length)],
    ["集計件数 Field 権限 (FLS)", String(fldRows.length)],
    ["集計件数 System 権限 ON", String(systemPerms.length)],
    ["集計件数 Apex Class アクセス", String(apexRows.length)],
    ["集計件数 VF Page アクセス", String(vfRows.length)],
    ["集計件数 Tab 設定", String(tabRows.length)],
    ["集計件数 RecordType 可視性", String(rtRows.length)],
    ["集計件数 App 可視性", String(appRows.length)],
  ];

  const sections = [];
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
    note: `Excel 形式推奨 (各章が別シート)。プロファイル名指定なら '営業ユーザー'、権限セットなら '@MyPermSet_API名' のように @ を先頭に付けてください。`,
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
  if (!dr.ok) throw apiError(`describe(${obj})`, dr);
  progress("FieldPermissions 取得中...");
  const allFields = (dr.data.fields || [])
    .filter((f) => !f.calculated && f.type !== "id")
    .map((f) => ({ name: f.name, label: f.label, type: f.type, required: !f.nillable && !f.defaultedOnCreate && f.createable }));

  const fpR = await fetchAllPaged({ host, sid, apiVersion,
    soql: `SELECT Field, PermissionsRead, PermissionsEdit, Parent.Name, Parent.IsOwnedByProfile, Parent.Profile.Name, Parent.Label FROM FieldPermissions WHERE SobjectType='${obj.replace(/'/g, "\\'")}'`,
  });

  // フィールドごとに Profile/PermSet 一覧を集計
  const map = new Map(); // field -> { read: [], edit: [], noAccess: [] }
  for (const rec of (fpR.records || [])) {
    if (!rec.Parent) continue;
    const isP = !!rec.Parent.IsOwnedByProfile;
    const name = (isP ? "👤 " : "🔑 ") + (isP ? ((rec.Parent.Profile && rec.Parent.Profile.Name) || rec.Parent.Name) : (rec.Parent.Label || rec.Parent.Name));
    const fld = (rec.Field || "").replace(/^[^.]+\./, "");
    if (!map.has(fld)) map.set(fld, { read: [], edit: [], noAccess: [] });
    const m = map.get(fld);
    if (rec.PermissionsEdit) m.edit.push(name);
    else if (rec.PermissionsRead) m.read.push(name);
    else m.noAccess.push(name);
  }

  const headers = ["No", "API 名", "ラベル", "型", "必須", "編集可 (Edit)", "参照のみ (Read)", "アクセス無し (--)"];
  const rows = allFields.map((f, i) => {
    const m = map.get(f.name) || { read: [], edit: [], noAccess: [] };
    return {
      "No": i + 1,
      "API 名": f.name,
      "ラベル": f.label,
      "型": f.type,
      "必須": f.required ? "○" : "",
      "編集可 (Edit)": m.edit.sort().join("\n"),
      "参照のみ (Read)": m.read.sort().join("\n"),
      "アクセス無し (--)": m.noAccess.sort().join("\n"),
    };
  });

  return {
    title: `項目レベルセキュリティ (FLS) レポート: ${obj}`,
    type: "flsReport",
    sections: [
      { heading: "凡例", kvRows: [
        ["👤 名前", "プロファイル"],
        ["🔑 名前", "権限セット"],
        ["Edit", "編集可 (PermissionsEdit=true)"],
        ["Read", "参照可だが編集不可 (PermissionsRead=true, PermissionsEdit=false)"],
        ["--", "アクセスなし"],
      ]},
      { heading: "FLS 一覧", headers, rows },
    ],
    note: "Excel 形式推奨 (セルの折り返し有効)。Profile Reader 互換書式。",
  };
}

// ============ アプリケーション一覧 ============
async function buildAppList({ host, sid, apiVersion }) {
  // Tooling: CustomApplication (Lightning + Classic) + AppDefinition (Lightning Apps の正規)
  const r = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, DeveloperName, MasterLabel, NamespacePrefix, UiType, NavType, ProfileId, Description FROM AppDefinition ORDER BY MasterLabel LIMIT 500`,
  });
  if (!r.ok) throw apiError("AppDefinition 取得", r);
  const headers = ["No", "API 名", "ラベル", "Namespace", "UI種別", "ナビ", "説明"];
  const rows = (r.data.records || []).map((a, i) => ({
    "No": i + 1,
    "API 名": a.DeveloperName,
    "ラベル": a.MasterLabel,
    "Namespace": a.NamespacePrefix || "",
    "UI種別": a.UiType || "",
    "ナビ": a.NavType || "",
    "説明": a.Description || "",
  }));

  // AppMenuItem (ユーザーに見えるアプリ)
  const m = await runSoql({
    host, sid, apiVersion,
    soql: `SELECT Id, ApplicationId, Label, Name, Type, IsVisible, IsAccessible, SortOrder FROM AppMenuItem ORDER BY SortOrder NULLS LAST, Label LIMIT 200`,
  });
  const menuHeaders = ["No", "ラベル", "Name", "Type", "可視", "アクセス可", "Order"];
  const menuRows = m.ok ? (m.data.records || []).map((x, i) => ({
    "No": i + 1, "ラベル": x.Label || "", "Name": x.Name || "",
    "Type": x.Type || "", "可視": x.IsVisible ? "○" : "", "アクセス可": x.IsAccessible ? "○" : "",
    "Order": x.SortOrder == null ? "" : x.SortOrder,
  })) : [];

  return {
    title: "アプリケーション一覧 (Lightning Apps)",
    type: "appList",
    sections: [
      { heading: "AppDefinition (Lightning + Classic)", headers, rows },
      ...(menuRows.length ? [{ heading: "AppMenuItem (ユーザー表示順)", headers: menuHeaders, rows: menuRows }] : []),
    ],
    note: `合計 ${rows.length} アプリ`,
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
      { heading: "0. 凡例 / 略語の説明", headers: legendHeaders, rows: legendRows },
      { heading: "1. 組織共通の既定共有設定 (OWD)", headers: owdHeaders, rows: owdRows },
      { heading: "2. 共有設計上の注意 (非公開 / 親従属)", headers: sharingHeaders, rows: sharingRows },
      { heading: "3. ロール階層 (UserRole)", headers: roleHeaders, rows: roleRows },
    ],
    note: `OWD ${owdRows.length} 件 / ロール ${roleRows.length} 件。共有ルールの詳細は Metadata API (SharingRules) からのみ取得可能なため、本書では取得していません。`,
  };
}

// ============ フロー設計図 (1 Flow 詳細) ============
async function buildFlowDetail({ host, sid, apiVersion, obj }) {
  requireInput(obj, "Flow DeveloperName (例: My_Flow)");

  // Active version を引く
  const r = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, MasterLabel, ProcessType, Status, VersionNumber, Description, Metadata FROM Flow WHERE Definition.DeveloperName='${obj.replace(/'/g, "\\'")}' AND Status='Active' ORDER BY VersionNumber DESC LIMIT 1`,
  });
  if (!r.ok) throw apiError("Flow 取得 (Active)", r);
  let flow = (r.data.records || [])[0];
  if (!flow) {
    // Active が無ければ最新を引く
    const r2 = await runSoql({
      host, sid, apiVersion, tooling: true,
      soql: `SELECT Id, MasterLabel, ProcessType, Status, VersionNumber, Description, Metadata FROM Flow WHERE Definition.DeveloperName='${obj.replace(/'/g, "\\'")}' ORDER BY VersionNumber DESC LIMIT 1`,
    });
    if (!r2.ok) throw apiError("Flow 取得 (latest fallback)", r2);
    if (!(r2.data.records || []).length) throw new Error(`HTTP 404 Flow '${obj}' が見つかりません`);
    flow = r2.data.records[0];
  }

  const meta = flow.Metadata || {};
  const summary = [
    ["Flow API 名", obj],
    ["ラベル", flow.MasterLabel],
    ["ProcessType", flow.ProcessType],
    ["Status", flow.Status],
    ["Version", flow.VersionNumber],
    ["Description", flow.Description || ""],
  ];

  const sections = [{ heading: "1. サマリ", kvRows: summary }];

  // 各要素を整理 (Salesforce Flow metadata の代表要素のみ)
  const collect = (arr, headers, mapFn, title) => {
    if (!arr || !arr.length) return;
    sections.push({
      heading: title,
      headers,
      rows: arr.map((x, i) => ({ "No": i + 1, ...mapFn(x) })),
    });
  };

  collect(meta.variables, ["No", "name", "dataType", "isCollection", "isInput", "isOutput"],
    (v) => ({ name: v.name, dataType: v.dataType, isCollection: v.isCollection ? "○" : "", isInput: v.isInput ? "○" : "", isOutput: v.isOutput ? "○" : "" }),
    "2. 変数 (variables)");

  collect(meta.constants, ["No", "name", "dataType", "value"],
    (c) => ({ name: c.name, dataType: c.dataType, value: c.value && c.value.stringValue || "" }),
    "3. 定数 (constants)");

  collect(meta.formulas, ["No", "name", "dataType", "expression"],
    (f) => ({ name: f.name, dataType: f.dataType, expression: f.expression }),
    "4. 計算式 (formulas)");

  collect(meta.decisions, ["No", "name", "label", "defaultConnectorLabel"],
    (d) => ({ name: d.name, label: d.label, defaultConnectorLabel: d.defaultConnectorLabel || "" }),
    "5. 分岐 (decisions)");

  collect(meta.assignments, ["No", "name", "label", "assignmentItemsCount"],
    (a) => ({ name: a.name, label: a.label || "", assignmentItemsCount: (a.assignmentItems || []).length }),
    "6. 代入 (assignments)");

  collect(meta.recordCreates, ["No", "name", "label", "object"],
    (x) => ({ name: x.name, label: x.label || "", object: x.object }),
    "7. レコード作成 (recordCreates)");

  collect(meta.recordUpdates, ["No", "name", "label", "object"],
    (x) => ({ name: x.name, label: x.label || "", object: x.object }),
    "8. レコード更新 (recordUpdates)");

  collect(meta.recordLookups, ["No", "name", "label", "object", "getFirstRecordOnly"],
    (x) => ({ name: x.name, label: x.label || "", object: x.object, getFirstRecordOnly: x.getFirstRecordOnly ? "○" : "" }),
    "9. レコード取得 (recordLookups)");

  collect(meta.recordDeletes, ["No", "name", "label", "object"],
    (x) => ({ name: x.name, label: x.label || "", object: x.object }),
    "10. レコード削除 (recordDeletes)");

  collect(meta.screens, ["No", "name", "label", "fieldCount"],
    (x) => ({ name: x.name, label: x.label || "", fieldCount: (x.fields || []).length }),
    "11. 画面 (screens)");

  collect(meta.loops, ["No", "name", "label", "collectionReference"],
    (x) => ({ name: x.name, label: x.label || "", collectionReference: x.collectionReference || "" }),
    "12. ループ (loops)");

  collect(meta.subflows, ["No", "name", "label", "flowName"],
    (x) => ({ name: x.name, label: x.label || "", flowName: x.flowName }),
    "13. サブフロー (subflows)");

  collect(meta.actionCalls, ["No", "name", "label", "actionName", "actionType"],
    (x) => ({ name: x.name, label: x.label || "", actionName: x.actionName, actionType: x.actionType }),
    "14. アクション呼び出し (actionCalls)");

  return {
    title: `フロー設計図: ${flow.MasterLabel} (${obj}) v${flow.VersionNumber}`,
    type: "flowDetail",
    sections,
    note: `Salesforce Flow metadata から各要素を抽出。要素 0 件のセクションは省略。`,
  };
}

// ============ Apex 設計図 (1 クラス詳細) ============
async function buildApexDetail({ host, sid, apiVersion, obj }) {
  requireInput(obj, "Apex クラス名 (例: AccountController)");
  const r = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Id, Name, ApiVersion, Status, NamespacePrefix, LengthWithoutComments, IsValid, Body, SymbolTable FROM ApexClass WHERE Name='${obj.replace(/'/g, "\\'")}' LIMIT 1`,
  });
  if (!r.ok) throw apiError(`ApexClass(${obj})`, r);
  if (!r.data.records || !r.data.records[0]) throw new Error(`HTTP 404 ApexClass '${obj}' が見つかりません`);
  const c = r.data.records[0];

  const summary = [
    ["クラス名", c.Name],
    ["API Version", c.ApiVersion],
    ["Status", c.Status],
    ["Namespace", c.NamespacePrefix || ""],
    ["LengthWithoutComments", String(c.LengthWithoutComments)],
    ["IsValid", c.IsValid ? "○" : "✗"],
  ];

  const sections = [{ heading: "1. サマリ", kvRows: summary }];

  // SymbolTable からメソッド / プロパティ / 内部クラスを抽出
  const sym = c.SymbolTable;
  if (sym) {
    const methods = sym.methods || [];
    if (methods.length) {
      sections.push({
        heading: "2. メソッド一覧",
        headers: ["No", "名前", "可視性", "戻り型", "引数", "static", "annotations"],
        rows: methods.map((m, i) => ({
          "No": i + 1,
          "名前": m.name,
          "可視性": m.visibility || "",
          "戻り型": m.returnType || "void",
          "引数": (m.parameters || []).map((p) => `${p.type || ""} ${p.name || ""}`).join(", "),
          "static": (m.modifiers || []).includes("static") ? "○" : "",
          "annotations": (m.annotations || []).map((a) => a.name).join(", "),
        })),
      });
    }
    const props = sym.properties || [];
    if (props.length) {
      sections.push({
        heading: "3. プロパティ",
        headers: ["No", "名前", "型", "可視性"],
        rows: props.map((p, i) => ({
          "No": i + 1, "名前": p.name, "型": p.type, "可視性": p.visibility || "",
        })),
      });
    }
    const variables = sym.variables || [];
    if (variables.length) {
      sections.push({
        heading: "4. インスタンス変数",
        headers: ["No", "名前", "型", "可視性"],
        rows: variables.map((v, i) => ({
          "No": i + 1, "名前": v.name, "型": v.type, "可視性": v.visibility || "",
        })),
      });
    }
    const innerClasses = sym.innerClasses || [];
    if (innerClasses.length) {
      sections.push({
        heading: "5. 内部クラス",
        headers: ["No", "名前", "メソッド数", "プロパティ数"],
        rows: innerClasses.map((ic, i) => ({
          "No": i + 1, "名前": ic.name,
          "メソッド数": (ic.methods || []).length,
          "プロパティ数": (ic.properties || []).length,
        })),
      });
    }
    const externalRefs = sym.externalReferences || [];
    if (externalRefs.length) {
      sections.push({
        heading: "6. 外部参照",
        headers: ["No", "名前", "Namespace"],
        rows: externalRefs.map((er, i) => ({
          "No": i + 1, "名前": er.name, "Namespace": er.namespace || "",
        })),
      });
    }
  } else {
    sections.push({ heading: "2. 解析失敗", kvRows: [["SymbolTable", "(未取得 — IsValid=false の可能性)"]] });
  }

  // ApexTrigger 参照 (このクラスを呼び出すトリガ)
  const trR = await runSoql({
    host, sid, apiVersion, tooling: true,
    soql: `SELECT Name, TableEnumOrId FROM ApexTrigger WHERE Body LIKE '%${obj.replace(/'/g, "\\'")}%' ORDER BY Name LIMIT 50`,
  });
  if (trR.ok && trR.data.records && trR.data.records.length) {
    sections.push({
      heading: "7. このクラスを参照するトリガ (Body一致)",
      headers: ["No", "トリガ名", "対象オブジェクト"],
      rows: trR.data.records.map((t, i) => ({ "No": i + 1, "トリガ名": t.Name, "対象オブジェクト": t.TableEnumOrId })),
    });
  }

  return {
    title: `Apex 設計図: ${c.Name}`,
    type: "apexDetail",
    sections,
    note: `SymbolTable はコンパイルが成功している場合のみ取得可。IsValid=false なら再保存後に再試行を。`,
  };
}

// ============ LWC 設計図 (1 LightningComponentBundle 詳細) ============
async function buildLwcDetail({ host, sid, apiVersion, obj }) {
  requireInput(obj, "LWC バンドル DeveloperName");

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
  const resources = rR.ok ? (rR.data.records || []) : [];
  const fileHeaders = ["No", "ファイル名", "形式", "サイズ", "先頭 80 文字 (プレビュー)"];
  const fileRows = resources.map((res, i) => {
    const filename = (res.FilePath || "").split("/").pop();
    const src = res.Source || "";
    const fmt = (res.Format || "").toLowerCase();
    return {
      "No": i + 1,
      "ファイル名": filename,
      "形式": formatMap[fmt] || res.Format || "",
      "サイズ": src.length.toLocaleString() + " 文字",
      "先頭 80 文字 (プレビュー)": src.substring(0, 80).replace(/\n/g, " "),
    };
  });

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
    { heading: "0. 凡例", kvRows: legend },
    { heading: "1. サマリ", kvRows: summary },
    { heading: "2. バンドル内ファイル", headers: fileHeaders, rows: fileRows },
  ];
  if (targetSheet.length) sections.push({ heading: "3. TargetConfigs (公開設定 XML)", kvRows: targetSheet });

  return {
    title: `LWC 設計図: ${b.MasterLabel} (${b.DeveloperName})`,
    type: "lwcDetail",
    sections,
    note: `バンドル内ファイル ${fileRows.length} 件 / 「App Builder に公開」が ○ の場合は管理者が Lightning ページに配置可能です`,
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
  if (!dr.ok) throw apiError(`describe(${obj})`, dr);
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
    if (!r.ok) throw apiError(`FieldPermissions(${obj})`, r);
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
  const headers = ["No", "API名", "ラベル", "型", "必須", ...cols.map((c) => (c.isProfile ? "👤 " : "🔑 ") + c.label)];
  const rows = allFields.map((f, i) => {
    const row = {
      "No": i + 1,
      "API名": f.name,
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

  // 6. 凡例
  const legend = [
    ["記号", "意味"],
    ["RW", "Read + Edit 可"],
    ["R-", "Read のみ"],
    ["--", "アクセス無し (PermissionsRead=false / レコード無し)"],
    ["👤", "プロファイル"],
    ["🔑", "権限セット"],
  ];

  return {
    title: `フィールド権限マトリクス: ${obj}`,
    type: "fieldPermMatrix",
    sections: [
      { heading: "凡例", kvRows: legend },
      { heading: "サマリ", kvRows: [
        ["対象オブジェクト", obj],
        ["対象フィールド数", String(allFields.length)],
        ["プロファイル数", String(cols.filter((c) => c.isProfile).length)],
        ["権限セット数", String(cols.filter((c) => !c.isProfile).length)],
        ["FieldPermissions レコード数", String(allRecs.length)],
      ]},
      { heading: "マトリクス", headers, rows },
    ],
    note: `Excel 形式推奨。横列が多いので Excel の「ウィンドウ枠の固定 (B2)」で 左 4列と先頭行を固定すると見やすい。`,
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
    if (!r.ok) throw apiError("ObjectPermissions 取得", r);
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
      { heading: "凡例", kvRows: [
        ["記号", "意味 (順: Create/Read/Update/Delete/ViewAll/ModifyAll)"],
        ["CRUDVM", "全権限あり (Create + Read + Update + Delete + ViewAll + ModifyAll)"],
        ["-R----", "読取のみ"],
        ["------", "権限なし"],
        ["👤", "プロファイル"],
        ["🔑", "権限セット"],
      ]},
      { heading: "サマリ", kvRows: [
        ["対象オブジェクト数", String(objList.length)],
        ["プロファイル数", String(cols.filter((c) => c.isProfile).length)],
        ["権限セット数", String(cols.filter((c) => !c.isProfile).length)],
        ["ObjectPermissions レコード数", String(allRecs.length)],
      ]},
      { heading: "マトリクス", headers, rows },
    ],
    note: "セル形式: [C][R][U][D][V][M]  C=Create R=Read U=Edit D=Delete V=ViewAllRecords M=ModifyAllRecords。各位置に文字があれば true、ハイフンなら false。",
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
    out.push("<table><thead><tr>" + heads.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>");
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

function splitMd(line) {
  // | a | b | c | → ["a", "b", "c"]  (両端の | を取り除いて split)
  return line.trim().replace(/^\||\|$/g, "").split("|").map((s) => s.trim().replace(/^---+$/, ""));
}

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
