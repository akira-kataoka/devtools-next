// DevTools パネル本体。inspectedWindow から URL を取って sid を引く。
import {
  isSalesforceHost, toApiHost, getSessionId, parseOrgIdFromSid,
  runSoql, sfFetch, recordsToCsv,
} from "./sf-api.js";
import { generateDesign, markdownToHtml } from "./design-docs.js";
import { showPicker, invalidatePickerCache } from "./picker.js";

const state = {
  host: null,
  apiHost: null,
  sid: null,
  orgId: null,
  apiVersion: "62.0",
  lastRecords: null,
  lastLoginRecords: null,
};

// モジュールスクリプトの defer 性質に対応 (popup.js と同じ防御)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init().catch((e) => console.error("[DevToolsNext] panel init failed:", e));
}

async function init() {
  try {
    bindNav();
    bindEvents();
    await reconnect();
    loadSavedQueries();
    loadSavedApex();
    initHeader();
    attachAllPickers();
    setupDesignPicker();
    // 検索系入力欄に ✕ クリア共通化
    ["inspectFilter", "exFieldFilter", "csFilter", "exObj", "descObj", "apiObj", "inspectRef"].forEach(attachClearButton);
  } catch (e) {
    console.error("[DevToolsNext] init error:", e);
    const orgInfo = document.getElementById("orgInfo");
    if (orgInfo) orgInfo.textContent = "初期化失敗: " + (e && e.message || e);
  }
}

// 設計書タイプによって Picker の種類を切り替える + 入力不要タイプでは Picker トリガを隠す
function setupDesignPicker() {
  const sel = document.getElementById("designType");
  const input = document.getElementById("designObj");
  if (!sel || !input) return;
  const NO_INPUT_TYPES = new Set([
    "profileList", "permsetList", "apexClassList", "apexTriggerList",
    "flowList", "customSettingList", "appList", "accessControl",
  ]);
  const refresh = () => {
    const existing = input.nextElementSibling;
    if (existing && existing.classList && existing.classList.contains("picker-trigger")) existing.remove();
    input.dataset.pickerAttached = "false";

    const type = sel.value;
    let kind = "sobject";
    let placeholder = "オブジェクト API 名 (例: Account)";
    if (type === "profileDetail") { kind = "profileOrPermset"; placeholder = "プロファイル名 または @PermSet名"; }
    else if (type === "flowDetail") { kind = "flow"; placeholder = "Flow DeveloperName"; }
    else if (type === "apexDetail") { kind = "apexClass"; placeholder = "Apex クラス名"; }
    else if (type === "lwcDetail") { kind = "lwc"; placeholder = "LWC バンドル DeveloperName"; }
    else if (NO_INPUT_TYPES.has(type)) {
      placeholder = "(入力不要 — 全件取得します)";
    }
    input.placeholder = placeholder;
    if (NO_INPUT_TYPES.has(type)) {
      // 入力不要なら disable + Picker トリガも追加しない
      input.disabled = true;
      input.value = "";
      input.style.opacity = "0.5";
    } else {
      input.disabled = false;
      input.style.opacity = "1";
      attachPicker("designObj", kind, { title: "候補から選択" });
    }
  };
  sel.addEventListener("change", refresh);
  refresh();
}

// 入力欄に ✕ クリアボタンを後付けで追加する共通ヘルパー
function attachClearButton(inputId) {
  const input = document.getElementById(inputId);
  if (!input || input.dataset.clearAttached === "true") return;
  input.dataset.clearAttached = "true";
  // input を wrap で囲んで relative にする
  const wrap = document.createElement("span");
  wrap.className = "input-clear-wrap";
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "input-clear-btn";
  btn.textContent = "✕";
  btn.title = "クリア";
  btn.setAttribute("aria-label", "入力をクリア");
  btn.addEventListener("click", () => {
    input.value = "";
    input.focus();
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  wrap.appendChild(btn);
}

// 共通 toast (panel/tool 環境用、popup の toast と同じスタイル)
function panelToast(msg, opts = {}) {
  const el = document.createElement("div");
  el.className = "panel-toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), opts.duration || 1800);
}

// textarea で Tab キーを 2 spaces に変換 (focus 移動を防ぐ)
function enableTabToSpaces(el) {
  if (!el || el.dataset.tabHandled === "true") return;
  el.dataset.tabHandled = "true";
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const start = el.selectionStart, end = el.selectionEnd;
    const indent = "  ";
    el.value = el.value.substring(0, start) + indent + el.value.substring(end);
    el.selectionStart = el.selectionEnd = start + indent.length;
  });
}

// ====== 共通 Picker ヘルパー: 既存テキスト入力の隣に Picker ボタンを差し込む ======
function attachPicker(inputId, kind, opts = {}) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.dataset.pickerAttached === "true") return; // 二重防止
  input.dataset.pickerAttached = "true";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "picker-trigger";
  btn.textContent = opts.label || "🔍";
  btn.title = opts.title || "候補から選ぶ";
  btn.addEventListener("click", async () => {
    if (!state.sid) {
      input.placeholder = "先に SF に接続してください";
      return;
    }
    const val = await showPicker({
      kind,
      host: state.host, sid: state.sid, apiVersion: state.apiVersion,
      parentObject: opts.parentObjectFn ? opts.parentObjectFn() : undefined,
    });
    if (val != null) {
      input.value = val;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      if (opts.onPick) opts.onPick(val);
    }
  });
  input.insertAdjacentElement("afterend", btn);
}

function attachAllPickers() {
  attachPicker("descObj", "sobject", { title: "オブジェクトを選択" });
  attachPicker("exObj", "sobject", { title: "オブジェクトを選択", onPick: () => exLoadFields() });
  attachPicker("apiObj", "sobject", { title: "オブジェクトを選択" });
  attachPicker("designObj", "sobject", { title: "オブジェクト/Profile/PermSet を選択 (種類に応じ切替)", onPick: (v) => {
    // 設計書タイプによっては Profile/PermSet を選ばせる方が良い → 一旦 sobject 固定だが将来切替
  }});
}

// ヘッダの version badge / アップデート確認 / 再接続を popup と同等にする
function initHeader() {
  const hdr = document.querySelector("header.hdr");
  if (!hdr) return;
  // 既存に version badge が無ければ追加
  if (!document.getElementById("verBadge")) {
    const v = chrome.runtime.getManifest().version;
    const badge = document.createElement("span");
    badge.id = "verBadge";
    badge.className = "org";
    badge.title = "現在のバージョン (VERSION.txt 監視で自動更新)";
    badge.style.cssText = "background:rgba(27,150,255,0.15);color:#1b96ff;font-weight:700";
    badge.textContent = "v" + v;
    // brand の隣に挿入
    const brand = hdr.querySelector(".brand");
    if (brand && brand.nextSibling) hdr.insertBefore(badge, brand.nextSibling);
    else hdr.appendChild(badge);
  }
  // アップデート確認ボタン
  if (!document.getElementById("btnPanelCheckUpdate")) {
    const btn = document.createElement("button");
    btn.id = "btnPanelCheckUpdate";
    btn.title = "VERSION.txt を即時チェック (自動アップデート)";
    btn.textContent = "⬆";
    btn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "sfdt:checkUpdate" }, (res) => {
        const oi = document.getElementById("orgInfo");
        if (oi) oi.textContent = (res && res.ok) ? `アップデート確認 v${res.version} (新版があれば自動 reload)` : "アップデート確認失敗";
      });
    });
    // 再接続ボタンの前に挿入
    const recon = document.getElementById("btnReconnect");
    if (recon) hdr.insertBefore(btn, recon);
    else hdr.appendChild(btn);
  }
}

const RECENT_VIEWS_KEY = "sfdtRecentViews";
async function pushRecentView(viewName, label) {
  try {
    const { [RECENT_VIEWS_KEY]: list = [] } = await chrome.storage.local.get(RECENT_VIEWS_KEY);
    const filtered = list.filter((v) => v.view !== viewName);
    filtered.unshift({ view: viewName, label, ts: Date.now() });
    await chrome.storage.local.set({ [RECENT_VIEWS_KEY]: filtered.slice(0, 7) });
    renderRecentNav();
  } catch {}
}

async function renderRecentNav() {
  try {
    const { [RECENT_VIEWS_KEY]: list = [] } = await chrome.storage.local.get(RECENT_VIEWS_KEY);
    let area = document.getElementById("nav-recent-section");
    const nav = document.querySelector(".side .nav");
    if (!nav) return;
    if (!area) {
      area = document.createElement("div");
      area.id = "nav-recent-section";
      // ナビの一番上に挿入
      nav.insertBefore(area, nav.firstChild);
    }
    if (!list.length) { area.innerHTML = ""; return; }
    area.innerHTML = `<div class="nav-sep">⏱ 最近開いたビュー</div>` +
      list.map((r) =>
        `<button class="nav-btn recent" data-view="${escape(r.view)}" title="${escape(new Date(r.ts).toLocaleString())}">↻ ${escape(r.label)}</button>`
      ).join("");
    // 動的に追加したボタンにもクリックハンドラ
    area.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchToView(btn.dataset.view));
    });
  } catch {}
}

function switchToView(v) {
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
  const matched = document.querySelectorAll('.nav-btn[data-view="' + v + '"]');
  matched.forEach((b) => {
    b.classList.add("active");
    // フラッシュアニメ: 既存クラスをトグルしてリトリガ
    b.classList.remove("flash");
    void b.offsetWidth; // reflow で animation 再起動
    b.classList.add("flash");
  });
  document.querySelectorAll(".view").forEach((p) => {
    p.classList.toggle("hidden", p.dataset.view !== v);
  });
  // ラベルを記録 (recent ボタンからの遷移時は元のメインボタンを基準に)
  const btn = document.querySelector('.nav-btn[data-view="' + v + '"]:not(.recent)');
  if (btn) pushRecentView(v, btn.textContent.trim());
}

function bindNav() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchToView(btn.dataset.view));
  });
  renderRecentNav();
}

function bindEvents() {
  document.getElementById("btnReconnect").addEventListener("click", reconnect);
  document.getElementById("apiVer").addEventListener("change", (e) => {
    state.apiVersion = e.target.value;
  });

  // SOQL
  document.getElementById("btnRunSoql").addEventListener("click", doSoql);
  document.getElementById("btnExportCsv").addEventListener("click", exportCsv);
  document.getElementById("btnSaveSoql").addEventListener("click", saveCurrentQuery);
  document.getElementById("btnLoadSoql").addEventListener("click", loadSelectedQuery);
  document.getElementById("soqlText").addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") doSoql();
  });

  // Describe
  document.getElementById("btnDescribe").addEventListener("click", doDescribe);
  // REST
  document.getElementById("btnRest").addEventListener("click", doRest);
  // Metadata
  document.getElementById("btnMetadata").addEventListener("click", doMetadataList);
  // Logs
  document.getElementById("btnFetchLogs").addEventListener("click", doFetchLogs);
  document.getElementById("btnEnableDebug").addEventListener("click", doEnableDebug);
  // Limits
  document.getElementById("btnLimits").addEventListener("click", doLimits);
  // Apex
  document.getElementById("btnRunApex").addEventListener("click", doRunApex);
  document.getElementById("btnSaveApex").addEventListener("click", saveCurrentApex);
  document.getElementById("btnLoadApex").addEventListener("click", loadSelectedApex);
  enableTabToSpaces(document.getElementById("apexCode"));
  enableTabToSpaces(document.getElementById("soqlText"));
  document.getElementById("apexCode").addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") doRunApex();
  });
  // LoginHistory
  document.getElementById("btnFetchLogin").addEventListener("click", doFetchLoginHistory);
  document.getElementById("btnLoginCsv").addEventListener("click", exportLoginCsv);
  // 設計書
  document.getElementById("btnDesignGen").addEventListener("click", doGenerateDesign);
  document.getElementById("btnDesignCopy").addEventListener("click", copyDesignSource);
  document.getElementById("btnDesignDownload").addEventListener("click", downloadDesignSource);

  // Inspector
  document.getElementById("btnInspect").addEventListener("click", doInspect);
  document.getElementById("btnInspectFromTab").addEventListener("click", inspectFromTab);
  document.getElementById("btnInspectOpenInOrg").addEventListener("click", openInspectedInOrg);
  document.getElementById("btnInspectExportJson").addEventListener("click", () => exportInspect("json"));
  document.getElementById("btnInspectExportCsv").addEventListener("click", () => exportInspect("csv"));
  document.getElementById("inspectFilter").addEventListener("input", renderInspectorFields);
  document.getElementById("inspectShowNull").addEventListener("change", renderInspectorFields);
  document.getElementById("inspectShowSystem").addEventListener("change", renderInspectorFields);
  document.getElementById("inspectRef").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doInspect();
  });

  // Limits
  document.getElementById("btnLimitsCsv").addEventListener("click", exportLimitsCsv);
  document.getElementById("limitsSort").addEventListener("change", renderLimitsList);
  document.getElementById("limitsOnlyUsed").addEventListener("change", renderLimitsList);

  // データエクスポート
  document.getElementById("btnExLoadFields").addEventListener("click", exLoadFields);
  document.getElementById("btnExSelectAll").addEventListener("click", () => exSelectFields(true, false));
  document.getElementById("btnExSelectNone").addEventListener("click", () => exSelectFields(false, false));
  document.getElementById("btnExSelectStandard").addEventListener("click", () => exSelectFields(true, true));
  document.getElementById("btnExBuild").addEventListener("click", exBuildSoql);
  document.getElementById("btnExRun").addEventListener("click", exRunPreview);
  document.getElementById("btnExDlCsv").addEventListener("click", () => exDownloadAll("csv"));
  document.getElementById("btnExDlExcel").addEventListener("click", () => exDownloadAll("excel"));
  document.getElementById("btnExDlJson").addEventListener("click", () => exDownloadAll("json"));
  document.getElementById("exFieldFilter").addEventListener("input", exRenderFieldList);
  document.getElementById("exObj").addEventListener("keydown", (e) => {
    if (e.key === "Enter") exLoadFields();
  });

  // API URL ビルダー
  document.getElementById("btnApiBuild").addEventListener("click", apiBuildUrl);
  document.getElementById("btnApiCopy").addEventListener("click", apiCopyUrl);
  document.getElementById("btnApiCurlCopy").addEventListener("click", apiCopyCurl);
  document.getElementById("btnApiOpen").addEventListener("click", apiOpenInBrowser);
  document.getElementById("apiOp").addEventListener("change", apiBuildUrl);

  // 変更セット / package.xml
  document.getElementById("btnCsLoad").addEventListener("click", csOnModeChange);
  document.getElementById("btnCsListType").addEventListener("click", csListCandidates);
  document.getElementById("btnCsClear").addEventListener("click", csClearSelection);
  document.getElementById("btnCsBuildXml").addEventListener("click", csBuildPackageXml);
  document.getElementById("btnCsCopyXml").addEventListener("click", csCopyXml);
  document.getElementById("btnCsDlXml").addEventListener("click", csDownloadXml);
  document.getElementById("btnCsDlBundle").addEventListener("click", csDownloadSfdxBundle);
  document.getElementById("csFilter").addEventListener("input", csRenderCandidates);
  document.getElementById("csMode").addEventListener("change", csOnModeChange);
}

// ====== 変更セット / package.xml ======
const csState = {
  candidates: [], // {type, name, label, fullName?}
  selected: [],   // 同
};

async function csOnModeChange() {
  const mode = document.getElementById("csMode").value;
  document.getElementById("csBuilderArea").classList.toggle("hidden", mode !== "builder");
  document.getElementById("csListArea").classList.toggle("hidden", mode === "builder");
  if (mode === "builder") {
    // 何もしない (既存状態維持)
  } else if (mode === "outboundList") {
    await csListOutbound();
  } else if (mode === "inboundList") {
    await csListInbound();
  } else if (mode === "deployStatus") {
    await csListDeployStatus();
  }
}

async function csListOutbound() {
  if (!state.sid) { document.getElementById("csListArea").innerHTML = `<div class="meta" style="padding:8px">未接続</div>`; return; }
  // 送信変更セット: OutboundChangeSet オブジェクトは Tooling 経由
  const r = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion, tooling: true,
    soql: `SELECT Id, Name, Description, Status, SourceOrganization, IsLocked, LastModifiedDate FROM OutboundChangeSet ORDER BY LastModifiedDate DESC LIMIT 200`,
  });
  if (!r.ok) {
    document.getElementById("csListArea").innerHTML = `<pre class="code">${escape(JSON.stringify(r.data, null, 2))}</pre>` +
      `<div class="meta">⚠ OutboundChangeSet オブジェクトはこの組織で API 公開されていない可能性があります。Setup → Deploy → 送信変更セット の UI を直接利用してください。</div>`;
    return;
  }
  document.getElementById("csListArea").innerHTML = recordsTable(r.data.records || []);
}

async function csListInbound() {
  if (!state.sid) return;
  const r = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion, tooling: true,
    soql: `SELECT Id, Name, Description, Status, SourceOrganization, LastModifiedDate FROM InboundChangeSet ORDER BY LastModifiedDate DESC LIMIT 200`,
  });
  if (!r.ok) {
    document.getElementById("csListArea").innerHTML = `<pre class="code">${escape(JSON.stringify(r.data, null, 2))}</pre>` +
      `<div class="meta">⚠ InboundChangeSet オブジェクトはこの組織で API 公開されていない可能性があります。</div>`;
    return;
  }
  document.getElementById("csListArea").innerHTML = recordsTable(r.data.records || []);
}

async function csListDeployStatus() {
  if (!state.sid) return;
  const r = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion, tooling: true,
    soql: `SELECT Id, Status, NumberComponentsDeployed, NumberComponentsTotal, NumberComponentErrors, NumberTestsCompleted, NumberTestsTotal, NumberTestErrors, CheckOnly, RunTestsEnabled, CompletedDate, CreatedDate, CreatedBy.Name FROM DeployRequest ORDER BY CreatedDate DESC LIMIT 10`,
  });
  if (!r.ok) {
    document.getElementById("csListArea").innerHTML = `<pre class="code">${escape(JSON.stringify(r.data, null, 2))}</pre>`;
    return;
  }
  document.getElementById("csListArea").innerHTML = recordsTable(r.data.records || []);
}

async function csListCandidates() {
  if (!state.sid) { document.getElementById("csCandidates").innerHTML = `<div class="meta">未接続</div>`; return; }
  const type = document.getElementById("csType").value;
  const root = document.getElementById("csCandidates");
  root.innerHTML = `<div class="meta">取得中…</div>`;

  // メタデータ型 → SOQL/エンドポイント のマッピング
  let soql = null, tooling = true, mapFn = (r) => ({ name: r.Name, label: r.Name });
  switch (type) {
    case "ApexClass":
      soql = `SELECT Id, Name, NamespacePrefix, ApiVersion, Status FROM ApexClass WHERE ManageableState='unmanaged' OR ManageableState='installedEditable' ORDER BY Name LIMIT 1000`;
      mapFn = (r) => ({ name: r.Name, label: `v${r.ApiVersion} ${r.NamespacePrefix || ""}` });
      break;
    case "ApexTrigger":
      soql = `SELECT Id, Name, TableEnumOrId, ApiVersion, Status FROM ApexTrigger ORDER BY Name LIMIT 1000`;
      mapFn = (r) => ({ name: r.Name, label: `on ${r.TableEnumOrId}` });
      break;
    case "ApexPage":
      soql = `SELECT Id, Name, MasterLabel, ApiVersion FROM ApexPage ORDER BY Name LIMIT 1000`;
      mapFn = (r) => ({ name: r.Name, label: r.MasterLabel || "" });
      break;
    case "ApexComponent":
      soql = `SELECT Id, Name, MasterLabel, ApiVersion FROM ApexComponent ORDER BY Name LIMIT 1000`;
      mapFn = (r) => ({ name: r.Name, label: r.MasterLabel || "" });
      break;
    case "Flow":
      // FlowDefinition.DeveloperName を使う (Active が無い場合も含めて出す)
      soql = `SELECT Id, DeveloperName, MasterLabel, ActiveVersion.VersionNumber FROM FlowDefinition ORDER BY DeveloperName LIMIT 500`;
      mapFn = (r) => ({ name: r.DeveloperName, label: r.MasterLabel || "" });
      break;
    case "CustomObject":
      soql = `SELECT Id, DeveloperName, MasterLabel, NamespacePrefix FROM CustomObject ORDER BY DeveloperName LIMIT 500`;
      mapFn = (r) => ({ name: (r.NamespacePrefix ? r.NamespacePrefix + "__" : "") + r.DeveloperName + "__c", label: r.MasterLabel || "" });
      break;
    case "CustomField":
      // EntityDefinition + FieldDefinition は重いので限定オブジェクト指定推奨。ここはざっくり 500 件
      soql = `SELECT Id, DeveloperName, EntityDefinition.QualifiedApiName, Label FROM CustomField WHERE ManageableState='unmanaged' OR ManageableState='installedEditable' ORDER BY EntityDefinition.QualifiedApiName, DeveloperName LIMIT 500`;
      mapFn = (r) => ({
        name: `${r.EntityDefinition ? r.EntityDefinition.QualifiedApiName : "?"}.${r.DeveloperName}__c`,
        label: r.Label || "",
      });
      break;
    case "ValidationRule":
      soql = `SELECT Id, ValidationName, EntityDefinition.QualifiedApiName, Active FROM ValidationRule ORDER BY EntityDefinition.QualifiedApiName, ValidationName LIMIT 500`;
      mapFn = (r) => ({
        name: `${r.EntityDefinition ? r.EntityDefinition.QualifiedApiName : "?"}.${r.ValidationName}`,
        label: r.Active ? "有効" : "無効",
      });
      break;
    case "RecordType":
      tooling = false;
      soql = `SELECT Id, DeveloperName, Name, SobjectType, IsActive FROM RecordType ORDER BY SobjectType, DeveloperName LIMIT 500`;
      mapFn = (r) => ({ name: `${r.SobjectType}.${r.DeveloperName}`, label: r.Name });
      break;
    case "ListView":
      tooling = false;
      soql = `SELECT Id, DeveloperName, Name, SobjectType FROM ListView ORDER BY SobjectType, DeveloperName LIMIT 500`;
      mapFn = (r) => ({ name: `${r.SobjectType}.${r.DeveloperName}`, label: r.Name });
      break;
    case "WebLink":
      soql = `SELECT Id, Name, MasterLabel, EntityDefinition.QualifiedApiName FROM WebLink ORDER BY EntityDefinition.QualifiedApiName, Name LIMIT 500`;
      mapFn = (r) => ({ name: `${r.EntityDefinition ? r.EntityDefinition.QualifiedApiName : "?"}.${r.Name}`, label: r.MasterLabel || "" });
      break;
    case "Profile":
      tooling = false;
      soql = `SELECT Id, Name FROM Profile ORDER BY Name LIMIT 500`;
      mapFn = (r) => ({ name: r.Name, label: "" });
      break;
    case "PermissionSet":
      tooling = false;
      soql = `SELECT Id, Name, Label FROM PermissionSet WHERE IsOwnedByProfile=false ORDER BY Name LIMIT 500`;
      mapFn = (r) => ({ name: r.Name, label: r.Label || "" });
      break;
    case "PermissionSetGroup":
      tooling = false;
      soql = `SELECT Id, DeveloperName, MasterLabel FROM PermissionSetGroup ORDER BY DeveloperName LIMIT 500`;
      mapFn = (r) => ({ name: r.DeveloperName, label: r.MasterLabel || "" });
      break;
    case "StaticResource":
      soql = `SELECT Id, Name, ContentType, BodyLength FROM StaticResource ORDER BY Name LIMIT 500`;
      mapFn = (r) => ({ name: r.Name, label: `${r.ContentType || ""} ${Math.round((r.BodyLength || 0) / 1024)}KB` });
      break;
    case "LightningComponentBundle":
      soql = `SELECT Id, DeveloperName, MasterLabel, IsExposed FROM LightningComponentBundle ORDER BY DeveloperName LIMIT 500`;
      mapFn = (r) => ({ name: r.DeveloperName, label: r.MasterLabel + (r.IsExposed ? " (公開)" : "") });
      break;
    case "AuraDefinitionBundle":
      soql = `SELECT Id, DeveloperName, MasterLabel FROM AuraDefinitionBundle ORDER BY DeveloperName LIMIT 500`;
      mapFn = (r) => ({ name: r.DeveloperName, label: r.MasterLabel || "" });
      break;
    case "CustomTab":
      soql = `SELECT Id, Name FROM CustomTab ORDER BY Name LIMIT 500`;
      mapFn = (r) => ({ name: r.Name, label: "" });
      break;
    case "CustomApplication":
      soql = `SELECT Id, DeveloperName, MasterLabel FROM CustomApplication ORDER BY DeveloperName LIMIT 500`;
      mapFn = (r) => ({ name: r.DeveloperName, label: r.MasterLabel || "" });
      break;
    case "EmailTemplate":
      tooling = false;
      soql = `SELECT Id, Name, DeveloperName, Folder.DeveloperName FROM EmailTemplate ORDER BY DeveloperName LIMIT 500`;
      mapFn = (r) => ({ name: `${r.Folder ? r.Folder.DeveloperName : "unfiled"}/${r.DeveloperName}`, label: r.Name });
      break;
    case "Layout":
      soql = `SELECT Id, Name, EntityDefinition.QualifiedApiName FROM Layout ORDER BY EntityDefinition.QualifiedApiName, Name LIMIT 500`;
      mapFn = (r) => ({ name: `${r.EntityDefinition ? r.EntityDefinition.QualifiedApiName : "?"}-${r.Name}`, label: r.Name });
      break;
    case "QuickAction":
      soql = `SELECT Id, DeveloperName, MasterLabel, SobjectType FROM QuickActionDefinition ORDER BY DeveloperName LIMIT 500`;
      mapFn = (r) => ({ name: r.SobjectType ? `${r.SobjectType}.${r.DeveloperName}` : r.DeveloperName, label: r.MasterLabel || "" });
      break;
    case "Report":
      tooling = false;
      soql = `SELECT Id, Name, DeveloperName, FolderName FROM Report ORDER BY DeveloperName LIMIT 500`;
      mapFn = (r) => ({ name: r.DeveloperName, label: r.Name });
      break;
    case "Dashboard":
      tooling = false;
      soql = `SELECT Id, Title, DeveloperName, FolderName FROM Dashboard ORDER BY DeveloperName LIMIT 500`;
      mapFn = (r) => ({ name: r.DeveloperName, label: r.Title });
      break;
    case "GlobalValueSet":
      soql = `SELECT Id, DeveloperName, MasterLabel FROM GlobalValueSet ORDER BY DeveloperName LIMIT 500`;
      mapFn = (r) => ({ name: r.DeveloperName, label: r.MasterLabel || "" });
      break;
    case "CustomMetadata":
      soql = `SELECT Id, DeveloperName, MasterLabel, NamespacePrefix FROM CustomObject WHERE CustomSettingsType=null ORDER BY DeveloperName LIMIT 500`;
      mapFn = (r) => ({ name: (r.NamespacePrefix ? r.NamespacePrefix + "__" : "") + r.DeveloperName + "__mdt", label: r.MasterLabel || "" });
      break;
    default:
      root.innerHTML = `<div class="meta">未対応: ${escape(type)}</div>`;
      return;
  }

  const r = await runSoql({ host: state.host, sid: state.sid, soql, apiVersion: state.apiVersion, tooling });
  if (!r.ok) {
    root.innerHTML = `<div class="meta"><span class="pill err">HTTP ${r.status}</span> ${escape(formatError(r.data))}</div>`;
    return;
  }
  csState.candidates = (r.data.records || []).map((rec) => {
    const m = mapFn(rec);
    return { type, name: m.name, label: m.label };
  });
  csRenderCandidates();
}

function csRenderCandidates() {
  const root = document.getElementById("csCandidates");
  const filter = (document.getElementById("csFilter").value || "").toLowerCase();
  root.innerHTML = "";
  const selectedNames = new Set(csState.selected.map((s) => s.type + ":" + s.name));
  let shown = 0;
  for (const c of csState.candidates) {
    if (filter && !((c.name + " " + c.label).toLowerCase().includes(filter))) continue;
    shown++;
    const el = document.createElement("div");
    el.className = "changeset-list-item";
    const key = c.type + ":" + c.name;
    if (selectedNames.has(key)) el.classList.add("selected");
    el.innerHTML = `
      <span class="cs-type-badge">${escape(c.type)}</span>
      <span class="cs-name">${escape(c.name)}</span>
      <span class="cs-meta">${escape(c.label || "")}</span>
    `;
    el.addEventListener("click", () => {
      if (selectedNames.has(key)) {
        csState.selected = csState.selected.filter((s) => !(s.type === c.type && s.name === c.name));
        panelToast(`➖ 除外: ${c.type}:${c.name}`);
      } else {
        csState.selected.push({ ...c });
        panelToast(`➕ 追加: ${c.type}:${c.name}`);
      }
      csRenderCandidates();
      csRenderSelected();
    });
    root.appendChild(el);
  }
  if (!shown) root.innerHTML = `<div class="meta" style="padding:8px">該当なし (候補をロードしてください)</div>`;
}

function csRenderSelected() {
  const root = document.getElementById("csSelectedList");
  document.getElementById("csSelectedCount").textContent = csState.selected.length;
  if (!csState.selected.length) {
    root.innerHTML = `<div class="meta" style="padding:8px">未選択 (左から追加)</div>`;
    return;
  }
  root.innerHTML = "";
  csState.selected.forEach((s, idx) => {
    const el = document.createElement("div");
    el.className = "changeset-list-item";
    el.innerHTML = `
      <span class="cs-type-badge">${escape(s.type)}</span>
      <span class="cs-name">${escape(s.name)}</span>
      <span class="cs-meta">${escape(s.label || "")}</span>
      <span class="cs-remove" data-idx="${idx}">削除</span>
    `;
    el.querySelector(".cs-remove").addEventListener("click", () => {
      csState.selected.splice(idx, 1);
      csRenderCandidates();
      csRenderSelected();
    });
    root.appendChild(el);
  });
}

function csClearSelection() {
  csState.selected = [];
  csRenderCandidates();
  csRenderSelected();
  document.getElementById("csXml").textContent = "";
  document.getElementById("csMeta").textContent = "";
}

function csBuildPackageXml() {
  if (!csState.selected.length) {
    document.getElementById("csMeta").innerHTML = `<span class="pill warn">選択メンバーが 0 件</span>`;
    return;
  }
  const apiVer = document.getElementById("csApiVer").value.trim() || "62.0";

  // type 別にグループ化
  const byType = {};
  for (const s of csState.selected) {
    if (!byType[s.type]) byType[s.type] = new Set();
    byType[s.type].add(s.name);
  }

  const lines = [`<?xml version="1.0" encoding="UTF-8"?>`, `<Package xmlns="http://soap.sforce.com/2006/04/metadata">`];
  Object.keys(byType).sort().forEach((type) => {
    lines.push(`    <types>`);
    Array.from(byType[type]).sort().forEach((name) => {
      lines.push(`        <members>${xmlEsc(name)}</members>`);
    });
    lines.push(`        <name>${xmlEsc(type)}</name>`);
    lines.push(`    </types>`);
  });
  lines.push(`    <version>${xmlEsc(apiVer)}</version>`);
  lines.push(`</Package>`);

  const xml = lines.join("\n");
  document.getElementById("csXml").textContent = xml;
  document.getElementById("csMeta").innerHTML = `<span class="pill ok">${csState.selected.length} メンバー / ${Object.keys(byType).length} 型</span> v${apiVer}`;
}

function xmlEsc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function csCopyXml() {
  const t = document.getElementById("csXml").textContent;
  if (!t) return;
  await navigator.clipboard.writeText(t);
  panelToast("📋 package.xml をコピーしました");
}

function csDownloadXml() {
  const t = document.getElementById("csXml").textContent;
  if (!t) return;
  const blob = new Blob([t], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "package.xml"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  document.getElementById("csMeta").innerHTML += ` <span class="pill ok">package.xml ダウンロード</span>`;
}

// SFDX バンドル: package.xml + sf cli 用 README + retrieve.bat/.sh + project の最小セット (テキスト形式の tar-like manifest)
async function csDownloadSfdxBundle() {
  const xml = document.getElementById("csXml").textContent;
  if (!xml) { csBuildPackageXml(); }
  const finalXml = document.getElementById("csXml").textContent;
  if (!finalXml) return;
  const apiVer = document.getElementById("csApiVer").value.trim() || "62.0";

  // 単一の README 形式の bundle テキストを作って、複数ファイルをまとめて 1 ファイル化
  // (Compression Streams API での zip 化は複雑なので、SFDX 利用想定の手順 + 全テキスト) を 1 つの .md で配布
  const sfdxProject = JSON.stringify({
    packageDirectories: [{ path: "force-app", default: true }],
    namespace: "",
    sfdcLoginUrl: `https://${state.apiHost || "<your-instance>.my.salesforce.com"}`,
    sourceApiVersion: apiVer,
  }, null, 2);

  const bundle = `# DevToolsNext が生成した SFDX バンドル

このバンドルには 3 ファイルが含まれます。コピペで手元の作業ディレクトリに作成してください。

## 1. package.xml (manifest)

\`\`\`xml
${finalXml}
\`\`\`

## 2. sfdx-project.json (SFDX プロジェクト定義)

\`\`\`json
${sfdxProject}
\`\`\`

## 3. retrieve.sh / retrieve.ps1 (取得スクリプト)

\`\`\`bash
#!/bin/bash
# 上記の package.xml と sfdx-project.json をカレントディレクトリに置いて実行
sf project retrieve start --manifest package.xml --target-org <username-or-alias>
\`\`\`

\`\`\`powershell
# Windows PowerShell 版
sf project retrieve start --manifest package.xml --target-org <username-or-alias>
\`\`\`

## デプロイ (取得後にメタデータを取り出し、別 org に配置)

\`\`\`bash
sf project deploy start --source-dir force-app --target-org <destination-alias>
\`\`\`

## デプロイ検証のみ (本番に投入前)
\`\`\`bash
sf project deploy validate --source-dir force-app --target-org production --test-level RunLocalTests
\`\`\`
`;

  const blob = new Blob([bundle], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `sfdx-bundle-${new Date().toISOString().substring(0, 10)}.md`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  document.getElementById("csMeta").innerHTML += ` <span class="pill ok">SFDX バンドル (.md) ダウンロード</span>`;
}

// ====== データエクスポート ======
const exState = { obj: null, fields: [], selected: new Set() };

async function exLoadFields() {
  if (!state.sid) { document.getElementById("exMeta").innerHTML = `<span class="pill err">未接続</span>`; return; }
  const obj = document.getElementById("exObj").value.trim();
  if (!obj) return;
  document.getElementById("exMeta").textContent = "describe 取得中…";

  const r = await sfFetch({ host: state.host, sid: state.sid, path: `/services/data/v${state.apiVersion}/sobjects/${encodeURIComponent(obj)}/describe` });
  if (!r.ok) {
    document.getElementById("exMeta").innerHTML = `<span class="pill err">describe 失敗 HTTP ${r.status}</span> ${escape(JSON.stringify(r.data).substring(0, 200))}`;
    return;
  }
  // queryable で createable/updateable/calculated 等の判別はメモ。SOQL select 対象は describe.fields の中で
  // 基本的に複合項目 (Name 等の compoundFieldName が無いもの) を選べばよい。
  exState.obj = obj;
  exState.fields = (r.data.fields || []).filter((f) => !f.deprecatedAndHidden);
  // 標準セレクション: 一般的な代表項目 (Id, Name, 主要ラベル系)
  exState.selected = new Set();
  for (const f of exState.fields) {
    if (["Id", "Name"].includes(f.name)) exState.selected.add(f.name);
  }
  // Name が無い場合の代替
  if (exState.selected.size === 0 && exState.fields[0]) exState.selected.add(exState.fields[0].name);

  document.getElementById("exMeta").innerHTML = `<span class="pill ok">${escape(obj)}</span> <span class="pill">${exState.fields.length} 項目</span> 標準フィールドを ${exState.selected.size} 件選択中`;
  exRenderFieldList();
  exBuildSoql();
}

function exRenderFieldList() {
  const root = document.getElementById("exFieldList");
  const filter = (document.getElementById("exFieldFilter").value || "").toLowerCase();
  root.innerHTML = "";
  for (const f of exState.fields) {
    if (filter) {
      const hay = (f.name + " " + (f.label || "") + " " + f.type).toLowerCase();
      if (!hay.includes(filter)) continue;
    }
    const el = document.createElement("label");
    el.className = "export-field-item";
    const id = "ex_fld_" + f.name;
    el.innerHTML = `
      <input type="checkbox" id="${id}" ${exState.selected.has(f.name) ? "checked" : ""} />
      <span class="fld-name">${escape(f.name)}</span>
      <span style="color:var(--fg-dim);font-size:9px">${escape(f.label || "")}</span>
      <span class="fld-type">${escape(f.type)}${f.length ? "/" + f.length : ""}</span>
    `;
    el.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) exState.selected.add(f.name);
      else exState.selected.delete(f.name);
      exBuildSoql();
    });
    root.appendChild(el);
  }
}

function exSelectFields(select, standardOnly) {
  if (!exState.fields.length) return;
  if (!select) { exState.selected.clear(); }
  else {
    for (const f of exState.fields) {
      if (standardOnly && f.custom) continue;
      exState.selected.add(f.name);
    }
  }
  exRenderFieldList();
  exBuildSoql();
}

function exBuildSoql() {
  if (!exState.obj || !exState.selected.size) {
    document.getElementById("exSoql").value = "";
    return;
  }
  const fields = exState.fields.filter((f) => exState.selected.has(f.name)).map((f) => f.name);
  const where = document.getElementById("exWhere").value.trim();
  const order = document.getElementById("exOrder").value.trim();
  const limit = parseInt(document.getElementById("exLimit").value, 10) || 2000;
  let soql = `SELECT ${fields.join(", ")} FROM ${exState.obj}`;
  if (where) soql += ` WHERE ${where}`;
  if (order) soql += ` ORDER BY ${order}`;
  soql += ` LIMIT ${Math.min(limit, 50000)}`;
  document.getElementById("exSoql").value = soql;
}

let exPreviewRunId = 0;
async function exRunPreview() {
  if (!state.sid) return;
  exBuildSoql();
  const soql = document.getElementById("exSoql").value;
  if (!soql) return;
  const tooling = document.getElementById("exTooling").checked;
  const preview = document.getElementById("exPreview");
  const meta = document.getElementById("exMeta");
  const myId = ++exPreviewRunId;
  meta.textContent = `実行中 (プレビュー先頭 200 件)… #${myId}`;
  const t0 = performance.now();
  const previewSoql = soql.replace(/LIMIT\s+\d+/i, "LIMIT 200");
  const r = await runSoql({ host: state.host, sid: state.sid, soql: previewSoql, apiVersion: state.apiVersion, tooling });
  const dt = Math.round(performance.now() - t0);
  if (myId !== exPreviewRunId) { console.log(`[DevToolsNext] discard stale Export preview #${myId}`); return; }
  if (!r.ok) {
    displayApiError(meta, r.status, r.data, "データエクスポート プレビュー");
    preview.innerHTML = `<pre class="code">${escape(JSON.stringify(r.data, null, 2))}</pre>`;
    return;
  }
  const recs = (r.data.records || []);
  meta.innerHTML = `<span class="pill ok">プレビュー ${recs.length} 件</span> ${dt}ms (実行時は最大 ${parseInt(document.getElementById("exLimit").value, 10) || 2000} 件)`;
  preview.innerHTML = recordsTable(recs);
}

let exDownloadCancelFlag = false;
let exDownloadActive = false;
function cancelExDownload() {
  if (exDownloadActive) {
    exDownloadCancelFlag = true;
    const progress = document.getElementById("exProgress");
    if (progress) progress.innerHTML = `<span class="pill warn">⏸ キャンセル中...</span>`;
  }
}

// Export ボタン文言を動的変更 (走行中は ⏸ 取消)
function setExportButtonsLabel(running) {
  const map = {
    btnExDlCsv: { running: "⏸ 取消 (CSV)", idle: "CSV ダウンロード" },
    btnExDlExcel: { running: "⏸ 取消 (Excel)", idle: "Excel (.xls) ダウンロード" },
    btnExDlJson: { running: "⏸ 取消 (JSON)", idle: "JSON ダウンロード" },
  };
  for (const [id, labels] of Object.entries(map)) {
    const b = document.getElementById(id);
    if (b) {
      b.textContent = running ? labels.running : labels.idle;
      b.classList.toggle("dl-running", !!running);
    }
  }
}

async function exDownloadAll(fmt) {
  if (!state.sid) return;
  if (exDownloadActive) {
    // 走行中なら 2 度目の押下でキャンセル
    cancelExDownload();
    return;
  }
  exBuildSoql();
  const soql = document.getElementById("exSoql").value;
  if (!soql) return;
  const tooling = document.getElementById("exTooling").checked;
  const limit = parseInt(document.getElementById("exLimit").value, 10) || 2000;
  const cap = Math.min(limit, 50000);

  const progress = document.getElementById("exProgress");
  let all = [];
  const t0 = performance.now();
  exDownloadCancelFlag = false;
  exDownloadActive = true;
  setExportButtonsLabel(true);
  progress.innerHTML = `<span class="pill">0 件取得…</span> <span class="meta">もう一度 ダウンロード を押すとキャンセル</span>`;

  const base = tooling ? `/services/data/v${state.apiVersion}/tooling/query/` : `/services/data/v${state.apiVersion}/query/`;
  let nextPath = `${base}?q=${encodeURIComponent(soql)}`;
  while (nextPath && all.length < cap) {
    if (exDownloadCancelFlag) {
      exDownloadActive = false;
      setExportButtonsLabel(false);
      progress.innerHTML = `<span class="pill warn">⏸ キャンセル済</span> ${all.length} 件取得した時点で停止`;
      return;
    }
    const r = await sfFetch({ host: state.host, sid: state.sid, path: nextPath });
    if (!r.ok) {
      exDownloadActive = false;
      setExportButtonsLabel(false);
      displayApiError(progress, r.status, r.data, "Export");
      return;
    }
    all = all.concat((r.data && r.data.records) || []);
    const pct = Math.min(100, Math.round((all.length / cap) * 100));
    // ETA 計算: 経過時間 / 取得済件数 = 1 件あたり時間 → 残件数 × それ
    const elapsedMs = performance.now() - t0;
    let etaHtml = "";
    if (all.length > 0 && all.length < cap && elapsedMs > 1000) {
      const remaining = Math.max(0, cap - all.length);
      const msPerRec = elapsedMs / all.length;
      const etaSec = Math.round((remaining * msPerRec) / 1000);
      const etaLabel = etaSec < 60 ? `約 ${etaSec}秒` : `約 ${Math.floor(etaSec/60)}分${etaSec%60}秒`;
      etaHtml = ` <span class="pill" title="残り時間の概算">⏱ ETA ${etaLabel}</span>`;
    }
    progress.innerHTML = `<span class="pill">${all.length} / ${cap} 件 (${pct}%)</span>${etaHtml}` +
      `<span class="dl-bar"><span class="dl-bar-fill" style="width:${pct}%"></span></span>` +
      `<span class="meta">もう一度 ダウンロード を押すとキャンセル</span>`;
    nextPath = r.data && r.data.nextRecordsUrl ? r.data.nextRecordsUrl : null;
  }
  if (all.length > cap) all = all.slice(0, cap);
  exDownloadActive = false;
  setExportButtonsLabel(false);
  const dt = Math.round(performance.now() - t0);
  progress.innerHTML = `<span class="pill ok">${all.length} 件取得完了</span> ${dt}ms / 出力中…`;

  // 出力
  const fields = exState.fields.filter((f) => exState.selected.has(f.name)).map((f) => f.name);
  let body, mime, ext;
  if (fmt === "json") {
    body = JSON.stringify(all, null, 2);
    mime = "application/json;charset=utf-8"; ext = "json";
  } else if (fmt === "excel") {
    body = exToExcelXml(exState.obj, fields, all);
    mime = "application/vnd.ms-excel;charset=utf-8"; ext = "xls";
  } else {
    body = exToCsv(fields, all);
    mime = "text/csv;charset=utf-8"; ext = "csv";
  }
  if (fmt === "csv" || fmt === "excel") body = "﻿" + body;
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${exState.obj}_${new Date().toISOString().substring(0, 10)}.${ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  progress.innerHTML = `<span class="pill ok">${all.length} 件 ${fmt.toUpperCase()} ダウンロード完了</span>`;
}

function exToCsv(fields, records) {
  const lines = [fields.join(",")];
  for (const r of records) {
    lines.push(fields.map((h) => {
      const v = r[h];
      if (v == null) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","));
  }
  return lines.join("\n");
}

function exToExcelXml(objName, fields, records) {
  const xmlText = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;")
    .replace(/\r?\n/g, "&#10;").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  const parts = [`<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0C66E4" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="${xmlText(objName.substring(0, 31))}">
  <Table>`];
  fields.forEach(() => parts.push(`<Column ss:Width="120"/>`));
  parts.push(`<Row>${fields.map((h) => `<Cell ss:StyleID="header"><Data ss:Type="String">${xmlText(h)}</Data></Cell>`).join("")}</Row>`);
  for (const r of records) {
    parts.push(`<Row>${fields.map((h) => {
      const v = r[h];
      const isNum = typeof v === "number" && Number.isFinite(v);
      const type = isNum ? "Number" : "String";
      const text = v == null ? "" : (isNum ? String(v) : xmlText(typeof v === "object" ? JSON.stringify(v) : String(v)));
      return `<Cell><Data ss:Type="${type}">${text}</Data></Cell>`;
    }).join("")}</Row>`);
  }
  parts.push(`</Table></Worksheet></Workbook>`);
  return parts.join("\n");
}

// ====== API URL ビルダー ======
const API_HELP = {
  describe: "指定オブジェクトのフィールド・リレーション・レコードタイプを返す。設計書ジェネレータの主要データソース。",
  describeGlobal: "テナント全体の SObject 一覧を返す。",
  get: "単一レコード取得 (任意フィールドのみ取りたい場合は ?fields=... を付ける)。",
  getByExtId: "外部 ID で取得。?externalIdField=<項目名> 形式の固定パス。",
  create: "POST でレコード作成。ボディは JSON { 項目: 値 }。",
  update: "PATCH でレコード更新。ボディは JSON。",
  upsert: "PATCH with extId 値。なければ作成、あれば更新。",
  delete: "DELETE で物理削除。IsDeleted フラグは立たない。",
  query: "SOQL クエリ実行。",
  "tooling-query": "Tooling API (ApexClass / Flow / FieldDefinition 等のメタデータ問合せ)。",
  search: "SOSL (横断検索)。",
  composite: "複数 REST 呼び出しを 1 リクエストにまとめる。dependsOn でチェーン可。",
  "composite-tree": "親子レコードのまとめ作成 (Account + 配下 Contact 等を 1 リクエスト)。",
  batch: "独立した複数操作の一括実行 (依存無し)。25 件上限。",
  limits: "API コール上限・データ容量・ストレージ等の使用率取得。",
  versions: "利用可能 API バージョン一覧。",
  userinfo: "現在のセッションのユーザー情報 (user_id, organization_id, urls など)。",
  "event-log-file": "EventLogFile の一覧。LogDate, EventType, LogFile (バイナリ) を持つ。",
};

function apiBuildUrl() {
  if (!state.apiHost) {
    document.getElementById("apiBuildMeta").innerHTML = `<span class="pill warn">SF に接続後に生成可能</span>`;
  }
  const op = document.getElementById("apiOp").value;
  const objName = document.getElementById("apiObj").value.trim();
  const id = document.getElementById("apiId").value.trim();
  const apiVer = state.apiVersion || "62.0";
  const host = state.apiHost || "<your-instance>.my.salesforce.com";

  let path = "", method = "GET", body = null, note = "";
  switch (op) {
    case "describe":
      if (!objName) note = "⚠ オブジェクト API 名 が必要です";
      path = `/services/data/v${apiVer}/sobjects/${objName || "<Object>"}/describe`;
      break;
    case "describeGlobal":
      path = `/services/data/v${apiVer}/sobjects/`;
      break;
    case "get":
      if (!objName || !id) note = "⚠ Object と Id が必要です";
      path = `/services/data/v${apiVer}/sobjects/${objName || "<Object>"}/${id || "<Id>"}`;
      break;
    case "getByExtId":
      if (!objName || !id) note = "⚠ Object と '<外部ID項目名>/<値>' が必要です (例: Email/foo@bar.com)";
      path = `/services/data/v${apiVer}/sobjects/${objName || "<Object>"}/${id || "<ExtIdField>/<value>"}`;
      break;
    case "create":
      method = "POST"; body = `{"Name": "サンプル"}`;
      path = `/services/data/v${apiVer}/sobjects/${objName || "<Object>"}/`;
      break;
    case "update":
      method = "PATCH"; body = `{"FieldName__c": "新しい値"}`;
      path = `/services/data/v${apiVer}/sobjects/${objName || "<Object>"}/${id || "<Id>"}`;
      break;
    case "upsert":
      method = "PATCH"; body = `{"Name": "サンプル"}`;
      path = `/services/data/v${apiVer}/sobjects/${objName || "<Object>"}/${id || "<ExtIdField>/<value>"}`;
      break;
    case "delete":
      method = "DELETE";
      path = `/services/data/v${apiVer}/sobjects/${objName || "<Object>"}/${id || "<Id>"}`;
      break;
    case "query":
      path = `/services/data/v${apiVer}/query/?q=${encodeURIComponent("SELECT Id, Name FROM " + (objName || "Account") + " LIMIT 10")}`;
      break;
    case "tooling-query":
      path = `/services/data/v${apiVer}/tooling/query/?q=${encodeURIComponent("SELECT Id, Name FROM " + (objName || "ApexClass") + " LIMIT 10")}`;
      break;
    case "search":
      path = `/services/data/v${apiVer}/search/?q=${encodeURIComponent("FIND {" + (objName || "test") + "} IN ALL FIELDS RETURNING Account(Id, Name), Contact(Id, Name)")}`;
      break;
    case "composite":
      method = "POST";
      body = JSON.stringify({
        allOrNone: true,
        compositeRequest: [
          { method: "POST", url: `/services/data/v${apiVer}/sobjects/Account/`, referenceId: "newAccount", body: { Name: "サンプル" } },
          { method: "POST", url: `/services/data/v${apiVer}/sobjects/Contact/`, referenceId: "newContact", body: { LastName: "山田", AccountId: "@{newAccount.id}" } },
        ],
      }, null, 2);
      path = `/services/data/v${apiVer}/composite`;
      break;
    case "composite-tree":
      method = "POST";
      body = JSON.stringify({
        records: [
          {
            attributes: { type: "Account", referenceId: "Acct1" },
            Name: "サンプル", Contacts: { records: [{ attributes: { type: "Contact", referenceId: "C1" }, LastName: "山田" }] },
          },
        ],
      }, null, 2);
      path = `/services/data/v${apiVer}/composite/tree/${objName || "Account"}`;
      break;
    case "batch":
      method = "POST";
      body = JSON.stringify({
        batchRequests: [
          { method: "GET", url: `v${apiVer}/limits` },
          { method: "GET", url: `v${apiVer}/sobjects/${objName || "Account"}/describe` },
        ],
      }, null, 2);
      path = `/services/data/v${apiVer}/composite/batch`;
      break;
    case "limits":          path = `/services/data/v${apiVer}/limits`; break;
    case "versions":        path = `/services/data`; break;
    case "userinfo":        path = `/services/oauth2/userinfo`; break;
    case "event-log-file":  path = `/services/data/v${apiVer}/query/?q=${encodeURIComponent("SELECT Id, EventType, LogDate, LogFileLength FROM EventLogFile ORDER BY LogDate DESC LIMIT 10")}`; break;
  }

  const fullUrl = `https://${host}${path}`;
  const sidPlaceholder = state.sid ? "$SID" : "<your-sid>";

  let curl = `curl -X ${method} \\
  -H "Authorization: Bearer ${sidPlaceholder}" \\
  -H "Accept: application/json"`;
  if (body) {
    curl += ` \\
  -H "Content-Type: application/json" \\
  -d '${body.replace(/'/g, "'\\''")}'`;
  }
  curl += ` \\
  "${fullUrl}"`;

  if (state.sid) {
    curl = `# 環境変数 SID は popup → セッション → copy で取得した値\nexport SID="${state.sid.substring(0, 20)}..."   # 実際は完全な sid を使用\n\n${curl}`;
  }

  document.getElementById("apiBuildUrl").textContent = fullUrl;
  document.getElementById("apiBuildCurl").textContent = curl;
  document.getElementById("apiBuildHelp").innerHTML =
    `<h3>${escape(op)} (${method})</h3>` +
    `<p>${escape(API_HELP[op] || "")}</p>` +
    (note ? `<blockquote>${escape(note)}</blockquote>` : "") +
    (body ? `<p><b>サンプル body:</b></p><pre><code>${escape(body)}</code></pre>` : "");
  document.getElementById("apiBuildMeta").innerHTML = `<span class="pill ok">${method}</span> ${escape(op)} ${state.sid ? "" : `<span class="pill warn">未接続: ホストはプレースホルダー</span>`}`;
}

async function apiCopyUrl() {
  const t = document.getElementById("apiBuildUrl").textContent;
  if (t) { await navigator.clipboard.writeText(t); panelToast("📋 URL をコピーしました"); }
}
async function apiCopyCurl() {
  const t = document.getElementById("apiBuildCurl").textContent;
  if (t) { await navigator.clipboard.writeText(t); panelToast("📋 curl コマンドをコピーしました"); }
}
function apiOpenInBrowser() {
  const url = document.getElementById("apiBuildUrl").textContent;
  if (!url) return;
  // ブラウザは sid を URL に乗せられないので、新規タブで開いてもログイン UI に飛ぶだけ。
  // ここでは Lightning ドメイン側で /one/one.app からの相対呼び出しに置換するのは複雑なので、Service URL を Workbench 風に表示するだけ。
  chrome.tabs.create({ url });
}

// ====== レコード Inspector ======
const inspectState = { obj: null, id: null, describe: null, record: null };
const SYSTEM_FIELDS = new Set([
  "Id", "IsDeleted", "CreatedById", "CreatedDate", "LastModifiedById", "LastModifiedDate",
  "SystemModstamp", "LastActivityDate", "LastViewedDate", "LastReferencedDate",
  "OwnerId", "MayEdit", "IsLocked", "ConnectionReceivedId", "ConnectionSentId"
]);

async function inspectFromTab() {
  const href = await getInspectedHref();
  if (!href) {
    document.getElementById("inspectMeta").innerHTML = `<span class="pill warn">SF タブが見つかりません</span> Salesforce のレコード詳細ページを開いてから再試行してください`;
    return;
  }
  // Lightning: /lightning/r/<Object>/<Id>/view or /lightning/r/<Object>/<Id>/edit
  let m = href.match(/\/lightning\/r\/([^/]+)\/([a-zA-Z0-9]{15,18})/);
  if (m) {
    document.getElementById("inspectRef").value = `${m[1]}:${m[2]}`;
    doInspect();
    return;
  }
  // Classic: /<Id> ベース
  try {
    const u = new URL(href);
    m = u.pathname.match(/\/([a-zA-Z0-9]{15,18})(?:\/|$)/);
    if (m) {
      document.getElementById("inspectRef").value = m[1];
      doInspect();
      return;
    }
  } catch {}
  document.getElementById("inspectMeta").innerHTML = `<span class="pill warn">タブからレコードIDを抽出できません</span> URL: ${escape(href.substring(0, 100))}`;
}

let inspectRunId = 0;
async function doInspect() {
  if (!state.sid) { document.getElementById("inspectMeta").innerHTML = `<span class="pill err">未接続</span>`; return; }
  const raw = document.getElementById("inspectRef").value.trim();
  if (!raw) return;
  const myId = ++inspectRunId;
  const meta = document.getElementById("inspectMeta");
  meta.textContent = `取得中… #${myId}`;

  let objName = null, id = null;
  if (raw.includes(":")) {
    [objName, id] = raw.split(":").map((s) => s.trim());
  } else {
    id = raw;
  }
  if (!/^[a-zA-Z0-9]{15,18}$/.test(id)) {
    meta.innerHTML = `<span class="pill err">有効な ID ではありません</span>`;
    return;
  }

  // オブジェクト名が指定されていない場合は KeyPrefix で逆引き
  if (!objName) {
    const prefix = id.substring(0, 3);
    const r = await sfFetch({ host: state.host, sid: state.sid,
      path: `/services/data/v${state.apiVersion}/tooling/query/?q=` +
        encodeURIComponent(`SELECT QualifiedApiName FROM EntityDefinition WHERE KeyPrefix='${prefix}' LIMIT 1`),
    });
    if (r.ok && r.data && r.data.records && r.data.records[0]) {
      objName = r.data.records[0].QualifiedApiName;
    }
    if (!objName) {
      meta.innerHTML = `<span class="pill err">KeyPrefix='${escape(prefix)}' のオブジェクトが見つかりません</span>。'<Object>:<Id>' 形式で指定してください`;
      return;
    }
  }

  // describe + retrieve を並行
  const t0 = performance.now();
  const [descR, recR] = await Promise.all([
    sfFetch({ host: state.host, sid: state.sid, path: `/services/data/v${state.apiVersion}/sobjects/${encodeURIComponent(objName)}/describe` }),
    sfFetch({ host: state.host, sid: state.sid, path: `/services/data/v${state.apiVersion}/sobjects/${encodeURIComponent(objName)}/${encodeURIComponent(id)}` }),
  ]);
  const dt = Math.round(performance.now() - t0);
  if (myId !== inspectRunId) {
    console.log(`[DevToolsNext] discard stale Inspect result #${myId}`);
    return;
  }

  if (!descR.ok) { displayApiError(meta, descR.status, descR.data, `Inspector describe(${objName})`); return; }
  if (!recR.ok) {
    meta.innerHTML = `<span class="pill err">レコード取得失敗 HTTP ${recR.status}</span> ${escape(JSON.stringify(recR.data).substring(0, 200))}`;
    return;
  }
  inspectState.obj = objName;
  inspectState.id = id;
  inspectState.describe = descR.data;
  inspectState.record = recR.data;

  const fieldCount = (descR.data.fields || []).length;
  const filledCount = (descR.data.fields || []).filter((f) => {
    const v = recR.data[f.name];
    return v !== null && v !== undefined && v !== "" && v !== false;
  }).length;
  meta.innerHTML = `<span class="pill ok">${escape(objName)}</span> <span class="pill">${escape(id)}</span> ` +
    `<span class="pill">${fieldCount} 項目 / 値あり ${filledCount}</span> ${dt}ms`;

  renderInspectorFields();
}

function renderInspectorFields() {
  if (!inspectState.describe || !inspectState.record) return;
  const root = document.getElementById("inspectResult");
  const filter = (document.getElementById("inspectFilter").value || "").toLowerCase();
  const showNull = document.getElementById("inspectShowNull").checked;
  const showSystem = document.getElementById("inspectShowSystem").checked;

  const fields = inspectState.describe.fields || [];
  const rec = inspectState.record;

  // header
  const html = [];
  html.push(`<div class="field-row" style="background:#112042;font-weight:700;color:var(--accent)">
    <div>API 名</div><div>型</div><div>値</div><div style="text-align:right">フラグ</div>
  </div>`);

  let shown = 0;
  for (const f of fields) {
    if (!showSystem && SYSTEM_FIELDS.has(f.name)) continue;
    const v = rec[f.name];
    const isNull = v === null || v === undefined || v === "";
    if (!showNull && isNull) continue;

    if (filter) {
      const hay = (f.name + " " + (f.label || "") + " " + stringify(v)).toLowerCase();
      if (!hay.includes(filter)) continue;
    }

    shown++;
    let valHtml;
    if (isNull) {
      valHtml = `<div class="fval null">(null)</div>`;
    } else if (typeof v === "boolean") {
      valHtml = `<div class="fval bool-${v ? "true" : "false"}">${v ? "✓ true" : "✗ false"}</div>`;
    } else if (f.type === "reference" && typeof v === "string") {
      // 参照先オブジェクト名を describe から取得 (KeyPrefix 逆引きに頼らない確実な方法)
      const refObj = (f.referenceTo || [])[0] || "";
      valHtml = `<div class="fval ref" data-id="${escape(v)}" data-ref-obj="${escape(refObj)}" title="クリックで ${escape(refObj || "参照先")} レコードを開く">${escape(v)}</div>`;
    } else if (typeof v === "object") {
      valHtml = `<div class="fval">${escape(JSON.stringify(v))}</div>`;
    } else {
      valHtml = `<div class="fval">${escape(String(v))}</div>`;
    }

    const flags = [];
    if (f.unique) flags.push(`<span class="badge-unique">U</span>`);
    if (!f.nillable && !f.defaultedOnCreate && f.createable) flags.push(`<span class="badge-required">必</span>`);
    if (f.type === "reference") flags.push(`<span class="badge-ref">→</span>`);
    if (f.calculated) flags.push(`<span style="color:var(--fg-dim);font-size:9px">f(x)</span>`);

    html.push(`<div class="field-row">
      <div>
        <div class="fname">${escape(f.name)}</div>
        <div class="ftype">${escape(f.label || "")}</div>
      </div>
      <div class="ftype">${escape(f.type)}${f.length ? "/" + f.length : ""}</div>
      ${valHtml}
      <div class="fmeta">${flags.join(" ")}</div>
    </div>`);
  }

  if (!shown) html.push(`<div class="meta" style="padding:12px;text-align:center">該当フィールドなし (フィルタ条件を変更してください)</div>`);
  root.innerHTML = html.join("");

  // reference クリックハンドラ — describe で取得した参照先オブジェクト名を確実に使う
  root.querySelectorAll(".fval.ref").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.id;
      const refObj = el.dataset.refObj || "";
      // refObj が分かっていれば <Object>:<Id> 形式で確実に渡す。空の場合は ID 単独 → doInspect が KeyPrefix 逆引き
      document.getElementById("inspectRef").value = refObj ? `${refObj}:${id}` : id;
      doInspect();
    });
  });
}

function openInspectedInOrg() {
  if (!inspectState.id || !state.host) return;
  const lhost = state.host.endsWith(".lightning.force.com") ? state.host : state.host.replace(/\.my\.salesforce\.com$/, ".lightning.force.com");
  chrome.tabs.create({ url: `https://${lhost}/lightning/r/${inspectState.obj}/${inspectState.id}/view` });
}

function exportInspect(fmt) {
  if (!inspectState.record) return;
  let body, mime, ext;
  if (fmt === "json") {
    body = JSON.stringify(inspectState.record, null, 2);
    mime = "application/json;charset=utf-8"; ext = "json";
  } else {
    const fields = (inspectState.describe.fields || []).map((f) => f.name);
    const headers = fields.join(",");
    const values = fields.map((n) => {
      const v = inspectState.record[n];
      if (v == null) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",");
    body = "﻿" + headers + "\n" + values;
    mime = "text/csv;charset=utf-8"; ext = "csv";
  }
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${inspectState.obj}_${inspectState.id}.${ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ====== Limits ダッシュボード (置換実装) ======
let lastLimitsData = null;

async function doLimits() {
  if (!state.sid) return;
  const r = await sfFetch({ host: state.host, sid: state.sid, path: `/services/data/v${state.apiVersion}/limits` });
  if (!r.ok) {
    document.getElementById("limitsResult").innerHTML = `<pre class="code">${escape(JSON.stringify(r.data, null, 2))}</pre>`;
    document.getElementById("limitsSummary").innerHTML = "";
    return;
  }
  lastLimitsData = r.data;
  renderLimitsList();
}

function renderLimitsList() {
  if (!lastLimitsData) return;
  const sort = document.getElementById("limitsSort").value;
  const onlyUsed = document.getElementById("limitsOnlyUsed").checked;

  let rows = Object.entries(lastLimitsData).map(([k, v]) => {
    const max = (v && v.Max != null) ? v.Max : 0;
    const remaining = (v && v.Remaining != null) ? v.Remaining : 0;
    const used = max - remaining;
    const pct = max > 0 ? Math.round((used / max) * 100) : 0;
    return { name: k, max, remaining, used, pct };
  });
  if (onlyUsed) rows = rows.filter((r) => r.used > 0);
  if (sort === "pct") rows.sort((a, b) => b.pct - a.pct);
  else if (sort === "used") rows.sort((a, b) => b.used - a.used);
  else rows.sort((a, b) => a.name.localeCompare(b.name));

  // サマリカード (危険な 5 件)
  const critical = rows.filter((r) => r.pct >= 70).slice(0, 5);
  const sumEl = document.getElementById("limitsSummary");
  if (critical.length) {
    sumEl.innerHTML = critical.map((r) => `
      <div class="limit-card ${r.pct >= 90 ? "critical" : "warn"}">
        <div class="title">${escape(r.name)}</div>
        <div class="val">${r.pct}%</div>
        <div class="sub">${r.used.toLocaleString()} / ${r.max.toLocaleString()}</div>
      </div>
    `).join("");
  } else {
    sumEl.innerHTML = `<div class="limit-card"><div class="title">健全</div><div class="val" style="color:var(--ok)">✓ OK</div><div class="sub">使用率 70%超の項目なし</div></div>`;
  }

  // 一覧
  const root = document.getElementById("limitsResult");
  const html = [`<div class="limit-row header">
    <div>項目</div><div>使用</div><div>残量</div><div>上限</div><div>使用率</div><div>%</div>
  </div>`];
  for (const r of rows) {
    const cls = r.pct >= 90 ? "critical" : (r.pct >= 70 ? "warn" : "");
    html.push(`<div class="limit-row">
      <div class="limit-name">${escape(r.name)}</div>
      <div>${r.used.toLocaleString()}</div>
      <div>${r.remaining.toLocaleString()}</div>
      <div>${r.max.toLocaleString()}</div>
      <div class="limit-bar-wrap"><div class="limit-bar ${cls}" style="width:${Math.min(r.pct, 100)}%"></div></div>
      <div class="limit-pct ${cls}">${r.pct}%</div>
    </div>`);
  }
  root.innerHTML = html.join("");
}

function exportLimitsCsv() {
  if (!lastLimitsData) return;
  // すべての列をダブルクォートで包む (Excel/Numbers/Google Sheets でロケール差や %/カンマ含む値を安全に)
  const lines = [`"項目","使用","残量","上限","使用率"`];
  Object.entries(lastLimitsData).forEach(([k, v]) => {
    const max = (v && v.Max != null) ? v.Max : 0;
    const rem = (v && v.Remaining != null) ? v.Remaining : 0;
    const used = max - rem;
    const pct = max > 0 ? Math.round((used / max) * 100) : 0;
    const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
    lines.push([k, used, rem, max, `${pct}%`].map(esc).join(","));
  });
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `limits-${Date.now()}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ====== 設計書ジェネレータ ======
let lastDesign = null;
let designRunId = 0;

async function doGenerateDesign() {
  if (!state.sid) { document.getElementById("designMeta").innerHTML = `<span class="pill err">未接続</span> Salesforce タブで再接続してください`; return; }
  const type = document.getElementById("designType").value;
  const obj = document.getElementById("designObj").value.trim();
  const format = document.getElementById("designFormat").value;
  const meta = document.getElementById("designMeta");
  const preview = document.getElementById("designPreview");
  const source = document.getElementById("designSource");

  const myId = ++designRunId;
  meta.textContent = `生成中… #${myId}`;
  preview.innerHTML = "";
  source.textContent = "";

  const t0 = performance.now();
  try {
    // 進捗コールバック: design-docs.js から呼ばれる (古い実行の進捗は無視)
    const onProgress = (msg) => {
      if (myId !== designRunId) return;
      meta.innerHTML = `<span class="pill warn">⏳ 生成中… #${myId}</span> <span class="meta">${escape(msg)}</span>`;
    };
    const result = await generateDesign({ type, host: state.host, sid: state.sid, apiVersion: state.apiVersion, obj, format, onProgress });
    if (myId !== designRunId) { console.log(`[DevToolsNext] discard stale Design result #${myId}`); return; }
    const dt = Math.round(performance.now() - t0);
    lastDesign = result;
    const totalRows = result.sections.reduce((n, s) => n + ((s.rows && s.rows.length) || (s.kvRows && s.kvRows.length) || 0), 0);
    // 0 件結果の統一表示
    if (totalRows === 0) {
      meta.innerHTML = `<span class="pill warn">結果 0 件</span> <span class="meta">${escape(result.title)}: 該当データなし</span> ${dt}ms / 形式=${format}`;
    } else {
      meta.innerHTML = `<span class="pill ok">${result.title}</span> <span class="pill">${result.sections.length} シート / ${totalRows} 行</span> ${dt}ms / 形式=${format}`;
      // ダウンロードボタンを目立たせる (生成成功時)
      const dlBtn = document.getElementById("btnDesignDownload");
      if (dlBtn) {
        dlBtn.classList.add("ready-pulse");
        setTimeout(() => dlBtn.classList.remove("ready-pulse"), 3000);
      }
    }
    source.textContent = result.source;

    // プレビュー
    if (format === "markdown") {
      preview.innerHTML = markdownToHtml(result.source);
    } else if (format === "html") {
      preview.innerHTML = result.source;
    } else if (format === "excel" || format === "xls") {
      preview.innerHTML = `<h2>${escape(result.title)}</h2><p>Excel 形式 (SpreadsheetML XML / .xls) を生成しました。</p><p><b>ダウンロード</b> ボタンで保存 → ダブルクリックで Excel が直接開きます。<br/>Excel が「保存形式を選ぶ」と聞いてきたら <b>.xlsx</b> を選んで再保存してください。</p><pre><code>${escape(result.source.substring(0, 800))}…</code></pre>`;
    } else {
      preview.innerHTML = `<pre><code>${escape(result.source)}</code></pre>`;
    }
    // ER 図 (Mermaid) の場合は Live Editor ボタンを追加
    if (result.type === "erDiagram" && result.sections && result.sections[0] && result.sections[0].mermaid) {
      const mermaidText = result.sections[0].mermaid;
      const liveBtn = document.createElement("button");
      liveBtn.className = "primary";
      liveBtn.style.marginTop = "8px";
      liveBtn.textContent = "🔗 Mermaid Live Editor で可視化";
      liveBtn.title = "別タブで mermaid.live を開いて図を表示";
      liveBtn.addEventListener("click", () => {
        // mermaid.live は #pako: base64 で URL に埋め込めるが、軽量のため #base64: 形式で
        try {
          const state = { code: mermaidText, mermaid: { theme: "dark" }, autoSync: true, updateDiagram: true };
          const enc = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
          chrome.tabs.create({ url: `https://mermaid.live/edit#base64:${enc}` });
        } catch (e) {
          chrome.tabs.create({ url: "https://mermaid.live/" });
          panelToast("Mermaid Live Editor を開きました (コードをペーストしてください)");
        }
      });
      preview.appendChild(liveBtn);
    }
  } catch (e) {
    const dt = Math.round(performance.now() - t0);
    const msg = String(e && e.message || e);
    // セッション期限切れを検出して親切メッセージ
    if (/HTTP 401|INVALID_SESSION_ID|sessionInvalid|Session expired/i.test(msg)) {
      meta.innerHTML = `<span class="pill err">⚠ セッション期限切れ (HTTP 401)</span> ` +
        `Salesforce に再ログインしてから popup の ⟳ ボタン (再接続) を押してください。<br/>` +
        `<span class="meta">詳細: ${escape(msg.substring(0, 200))}</span>`;
    } else if (/HTTP 403|FORBIDDEN/i.test(msg)) {
      meta.innerHTML = `<span class="pill err">⚠ アクセス権限不足 (HTTP 403)</span> ` +
        `現在のユーザーが対象オブジェクト/メタデータを読む権限を持っていません。<br/>` +
        `<span class="meta">詳細: ${escape(msg.substring(0, 200))}</span>`;
    } else if (/HTTP 404|NOT_FOUND/i.test(msg)) {
      meta.innerHTML = `<span class="pill err">⚠ 見つかりません (HTTP 404)</span> ` +
        `入力した名前 (${escape(obj || "(空)")}) が存在するか確認してください。<br/>` +
        `<span class="meta">詳細: ${escape(msg.substring(0, 200))}</span>`;
    } else if (/HTTP 400|MALFORMED_QUERY|INVALID_QUERY_LOCATOR|INVALID_TYPE/i.test(msg)) {
      meta.innerHTML = `<span class="pill err">⚠ クエリ不正 (HTTP 400)</span> ` +
        `この組織で対応していないオブジェクトの可能性。設計書タイプを確認してください。<br/>` +
        `<span class="meta">詳細: ${escape(msg.substring(0, 200))}</span>`;
    } else if (/が見つかりません|を入力してください/.test(msg)) {
      meta.innerHTML = `<span class="pill warn">入力が必要</span> ${escape(msg)}`;
    } else {
      meta.innerHTML = `<span class="pill err">失敗</span> ${escape(msg)} (${dt}ms)`;
    }
    preview.innerHTML = "";
    source.textContent = "";
  }
}

async function copyDesignSource() {
  if (!lastDesign) return;
  try {
    await navigator.clipboard.writeText(lastDesign.source || "");
    panelToast("📋 設計書ソースをコピーしました");
  } catch (e) {
    panelToast("⚠ コピー失敗: " + String(e));
  }
}

function downloadDesignSource() {
  if (!lastDesign) return;
  const fmt = lastDesign.format || "markdown";
  const extMap = { markdown: "md", html: "html", csv: "csv", tsv: "tsv", excel: "xls", xls: "xls" };
  const mimeMap = {
    markdown: "text/markdown;charset=utf-8",
    html: "text/html;charset=utf-8",
    csv: "text/csv;charset=utf-8",
    tsv: "text/tab-separated-values;charset=utf-8",
    excel: "application/vnd.ms-excel;charset=utf-8",
    xls: "application/vnd.ms-excel;charset=utf-8",
  };
  const ext = extMap[fmt] || "txt";
  const mime = mimeMap[fmt] || "text/plain;charset=utf-8";
  const safeName = (lastDesign.title || "design").replace(/[\\/?*[\]:"<>|]/g, "_").substring(0, 80);
  const ts = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);

  // Excel/HTML/CSV は UTF-8 BOM を付ける (Excel が文字化けしないように)
  let body = lastDesign.source;
  if (fmt === "csv" || fmt === "tsv" || fmt === "excel" || fmt === "xls" || fmt === "html") {
    body = "﻿" + body;
  }
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}_${ts}.${ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function getInspectedHost() {
  // DevTools パネル環境 (F12) では inspectedWindow.eval
  if (typeof chrome.devtools !== "undefined" && chrome.devtools.inspectedWindow) {
    return new Promise((resolve) => {
      chrome.devtools.inspectedWindow.eval("location.hostname", (hostname) => resolve(hostname || null));
    });
  }
  // 全画面タブ (tool.html) 環境では chrome.tabs.query で SF タブを探す
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.url) continue;
      try {
        const u = new URL(tab.url);
        if (isSalesforceHost(u.hostname)) return u.hostname;
      } catch {}
    }
  } catch {}
  return null;
}

async function getInspectedHref() {
  if (typeof chrome.devtools !== "undefined" && chrome.devtools.inspectedWindow) {
    return new Promise((resolve) => {
      chrome.devtools.inspectedWindow.eval("location.href", (href) => resolve(href || null));
    });
  }
  // 全画面タブ環境: 最も最近 active だった SF タブの URL
  try {
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
      if (!tab.url) continue;
      try { const u = new URL(tab.url); if (isSalesforceHost(u.hostname)) return tab.url; } catch {}
    }
    const all = await chrome.tabs.query({});
    for (const tab of all) {
      if (!tab.url) continue;
      try { const u = new URL(tab.url); if (isSalesforceHost(u.hostname)) return tab.url; } catch {}
    }
  } catch {}
  return null;
}

async function reconnect() {
  const host = await getInspectedHost();
  if (!host || !isSalesforceHost(host)) {
    document.getElementById("orgInfo").textContent = "非Salesforceタブ";
    return;
  }
  state.host = host;
  state.apiHost = toApiHost(host);
  const session = await getSessionId(host);
  if (!session) {
    document.getElementById("orgInfo").textContent = "sid 取得失敗";
    return;
  }
  const prevOrgId = state.orgId;
  state.sid = session.sid;
  state.orgId = parseOrgIdFromSid(state.sid);
  // Org が変わった場合は Picker キャッシュを無効化
  if (prevOrgId && prevOrgId !== state.orgId) {
    invalidatePickerCache(`Org change ${prevOrgId} → ${state.orgId}`);
  }
  document.getElementById("orgInfo").textContent = `Org: ${state.orgId} @ ${state.apiHost}`;
}

// レースガード: 連続実行された時、古いリクエストの結果を捨てる
let soqlRunId = 0;
async function doSoql() {
  if (!state.sid) return;
  const myId = ++soqlRunId;
  const soql = document.getElementById("soqlText").value.trim();
  const tooling = document.getElementById("useTooling").checked;
  const meta = document.getElementById("soqlMeta");
  meta.textContent = `実行中… #${myId}`;
  const t0 = performance.now();
  const r = await runSoql({ host: state.host, sid: state.sid, soql, apiVersion: state.apiVersion, tooling });
  const dt = Math.round(performance.now() - t0);
  if (myId !== soqlRunId) {
    // 古いリクエスト → UI 更新せず破棄
    console.log(`[DevToolsNext] discard stale SOQL result #${myId} (latest=${soqlRunId})`);
    return;
  }
  if (!r.ok) {
    displayApiError(meta, r.status, r.data, "SOQL 実行");
    document.getElementById("soqlResult").innerHTML = `<pre class="code">${escape(JSON.stringify(r.data, null, 2))}</pre>`;
    state.lastRecords = null;
    return;
  }
  const recs = (r.data && r.data.records) || [];
  state.lastRecords = recs;
  meta.innerHTML = `<span class="pill ok">${recs.length} 件</span> total=${r.data.totalSize ?? recs.length} / ${dt}ms${tooling ? ' <span class="pill warn">Tooling</span>' : ""}`;
  document.getElementById("soqlResult").innerHTML = recordsTable(recs);
}

function exportCsv() {
  if (!state.lastRecords || !state.lastRecords.length) return;
  const csv = recordsToCsv(state.lastRecords);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `soql-${Date.now()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function doDescribe() {
  if (!state.sid) return;
  const obj = document.getElementById("descObj").value.trim();
  if (!obj) return;
  const r = await sfFetch({
    host: state.host, sid: state.sid,
    path: `/services/data/v${state.apiVersion}/sobjects/${encodeURIComponent(obj)}/describe`,
  });
  if (!r.ok) {
    let errArea = document.getElementById("describeResult");
    const errMeta = document.createElement("div");
    displayApiError(errMeta, r.status, r.data, `describe(${obj})`);
    errArea.innerHTML = "";
    errArea.appendChild(errMeta);
    return;
  }
  const fields = (r.data && r.data.fields) || [];
  document.getElementById("describeResult").innerHTML = recordsTable(
    fields.map((f) => ({
      name: f.name, label: f.label, type: f.type,
      length: f.length, required: !f.nillable && !f.defaultedOnCreate,
      unique: f.unique, picklist: (f.picklistValues || []).length || "",
      referenceTo: (f.referenceTo || []).join(","),
    }))
  );
}

let restRunId = 0;
async function doRest() {
  if (!state.sid) return;
  const method = document.getElementById("restMethod").value;
  const path = document.getElementById("restPath").value.trim();
  const body = document.getElementById("restBody").value.trim();
  const meta = document.getElementById("restMeta");
  if (!path) return;
  const myId = ++restRunId;
  meta.textContent = `送信中… #${myId}`;
  const t0 = performance.now();
  const r = await sfFetch({ host: state.host, sid: state.sid, path, method, body: body || null });
  const dt = Math.round(performance.now() - t0);
  if (myId !== restRunId) { console.log(`[DevToolsNext] discard stale REST result #${myId}`); return; }
  if (!r.ok) {
    displayApiError(meta, r.status, r.data, `REST ${method}`);
  } else {
    meta.innerHTML = `<span class="pill ok">HTTP ${r.status}</span> ${dt}ms`;
  }
  document.getElementById("restResult").textContent = JSON.stringify(r.data, null, 2);
}

async function doMetadataList() {
  if (!state.sid) return;
  const type = document.getElementById("mdType").value;
  const path = `/services/data/v${state.apiVersion}/tooling/query/?q=` +
    encodeURIComponent(`SELECT Id, Name, NamespacePrefix, ManageableState, CreatedDate, LastModifiedDate FROM ${type} ORDER BY LastModifiedDate DESC LIMIT 200`);
  const r = await sfFetch({ host: state.host, sid: state.sid, path });
  if (!r.ok) {
    const elem = document.getElementById("metadataResult");
    const m = document.createElement("div");
    displayApiError(m, r.status, r.data, `Metadata ${type}`);
    elem.innerHTML = ""; elem.appendChild(m);
    return;
  }
  document.getElementById("metadataResult").innerHTML = recordsTable(r.data.records || []);
}

async function doFetchLogs() {
  if (!state.sid) return;
  const q = `SELECT Id, LogUser.Name, Status, Application, Operation, LogLength, DurationMilliseconds, StartTime FROM ApexLog ORDER BY StartTime DESC LIMIT 20`;
  const r = await runSoql({ host: state.host, sid: state.sid, soql: q, apiVersion: state.apiVersion, tooling: true });
  if (!r.ok) {
    const elem = document.getElementById("logsResult");
    const m = document.createElement("div");
    displayApiError(m, r.status, r.data, "ApexLog 取得");
    elem.innerHTML = ""; elem.appendChild(m);
    return;
  }
  document.getElementById("logsResult").innerHTML = recordsTable(r.data.records || []);
}

async function doEnableDebug() {
  if (!state.sid) return;
  // ユーザー自身の TraceFlag を 60 分有効化（最低限の実装）
  const userId = state.orgId; // フォールバック。実際は userinfo を引きたいが今は orgId 表示用なので注意
  alert("DebugLevel/TraceFlag の作成はサンプル実装です。Setup → Debug Logs で手動設定もできます。");
}

// (旧 doLimits は新ダッシュボード版に置換済 — 下部参照)

function recordsTable(records) {
  if (!records || !records.length) return `<div class="meta" style="padding:8px">該当なし</div>`;
  const cols = new Set();
  records.forEach((r) => Object.keys(r).forEach((k) => k !== "attributes" && cols.add(k)));
  const headers = Array.from(cols);
  const head = `<tr>${headers.map((h) => `<th>${escape(h)}</th>`).join("")}</tr>`;
  const rows = records.map((r) =>
    `<tr>${headers.map((h) => `<td>${escape(stringify(r[h]))}</td>`).join("")}</tr>`
  ).join("");
  return `<table>${head}${rows}</table>`;
}
function stringify(v) {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function formatError(d) {
  if (Array.isArray(d) && d[0]) return `${d[0].errorCode || ""} ${d[0].message || ""}`.trim();
  if (d && d.error) return d.error_description || d.error;
  return JSON.stringify(d);
}

/**
 * 共通エラー表示ヘルパー: HTTP ステータスと SF エラーレスポンスを「何が起きた + どう直す」形式で表示
 * @param {Element} elem - innerHTML を書き込む要素
 * @param {number} status - HTTP status
 * @param {*} data - SF レスポンスボディ
 * @param {string} ctx - 任意の文脈 (例: "describe", "SOQL 実行")
 */
function displayApiError(elem, status, data, ctx = "") {
  if (!elem) return;
  const detail = formatError(data);
  // hint: { text, links: [{label, path}] } 形式で「対処方法 + Setup へのショートカット」
  let hint = null;
  if (status === 401) {
    hint = {
      text: "Salesforce にログインし直してから popup の ⟳ で再接続してください。Lightning ドメインの sid は REST に使えないことがあります。",
      links: [
        { label: "セッション管理を開く", path: "/lightning/setup/SecuritySession/home" },
        { label: "Login History", action: "navView", view: "login" },
      ],
    };
  } else if (status === 403) {
    hint = {
      text: "現在のユーザーに権限がありません。プロファイル/権限セット または OWD で対象オブジェクトのアクセスを確認してください。",
      links: [
        { label: "プロファイル一覧", path: "/lightning/setup/EnhancedProfiles/home" },
        { label: "権限セット一覧", path: "/lightning/setup/PermSets/home" },
        { label: "OWD 設定", path: "/lightning/setup/SecuritySharing/home" },
      ],
    };
  } else if (status === 404) {
    hint = {
      text: "指定した名前 / Id が存在しません。タイプミスがないか、🔍 候補リストから選択してください。",
      links: [
        { label: "オブジェクトマネージャ", path: "/lightning/setup/ObjectManager/home" },
      ],
    };
  } else if (status === 400) {
    hint = {
      text: "リクエストが不正です。SOQL の構文、フィールド名、参照可能性を確認してください。Describe ビューで対象オブジェクトの項目を確認可能。",
      links: [
        { label: "Describe ビューを開く", action: "navView", view: "describe" },
      ],
    };
  } else if (status === 429) {
    hint = {
      text: "API 上限に達しました。Limits ビューで現状を確認してください。",
      links: [
        { label: "Limits ダッシュボード", action: "navView", view: "limits" },
      ],
    };
  } else if (status === 500 || status === 503) {
    hint = {
      text: "Salesforce サーバ側の問題です。少し待って再試行してください。",
      links: [
        { label: "Status Trust ページ (外部)", url: "https://status.salesforce.com/" },
      ],
    };
  }

  // hint をクリック可能な HTML に変換
  let hintHtml = "";
  if (hint) {
    const linkButtons = (hint.links || []).map((l, i) => {
      return `<a class="hint-link" data-i="${i}" href="#">${escape(l.label)} →</a>`;
    }).join(" ");
    hintHtml = `<br/><span class="meta" style="color:var(--accent)">💡 ${escape(hint.text)}</span>` +
      (linkButtons ? `<br/><span class="hint-actions">${linkButtons}</span>` : "");
  }
  elem.innerHTML =
    `<span class="pill err">⚠ HTTP ${status}${ctx ? " (" + escape(ctx) + ")" : ""}</span> ` +
    `<span class="meta">${escape(detail).substring(0, 300)}</span>` +
    hintHtml;

  // hint links のクリックハンドラを後付け
  if (hint && hint.links) {
    elem.querySelectorAll(".hint-link").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const idx = parseInt(a.dataset.i, 10);
        const link = hint.links[idx];
        if (!link) return;
        if (link.action === "navView" && link.view) {
          // 内部ビュー切替
          if (typeof switchToView === "function") switchToView(link.view);
        } else if (link.url) {
          chrome.tabs.create({ url: link.url });
        } else if (link.path && state.host) {
          const lhost = state.host.endsWith(".lightning.force.com") ? state.host : state.host.replace(/\.my\.salesforce\.com$/, ".lightning.force.com");
          chrome.tabs.create({ url: `https://${lhost}${link.path}` });
        }
      });
    });
  }
}

// ====== Apex 実行 (Tooling executeAnonymous) ======
let apexRunId = 0;
async function doRunApex() {
  if (!state.sid) return;
  const code = document.getElementById("apexCode").value;
  const fetchLog = document.getElementById("apexFetchLog").checked;
  const meta = document.getElementById("apexMeta");
  const out = document.getElementById("apexResult");
  if (!code.trim()) return;
  const myId = ++apexRunId;
  meta.textContent = `実行中… #${myId}`;
  out.textContent = "";

  const t0 = performance.now();
  // Tooling: GET /tooling/executeAnonymous/?anonymousBody=...
  // Salesforce Tooling REST API は executeAnonymous を GET で受け付ける
  const r = await sfFetch({
    host: state.host, sid: state.sid,
    path: `/services/data/v${state.apiVersion}/tooling/executeAnonymous/?anonymousBody=${encodeURIComponent(code)}`,
    method: "GET",
  });
  const dt = Math.round(performance.now() - t0);
  if (myId !== apexRunId) { console.log(`[DevToolsNext] discard stale Apex result #${myId}`); return; }

  if (!r.ok) {
    displayApiError(meta, r.status, r.data, "Apex 実行");
    out.textContent = JSON.stringify(r.data, null, 2);
    return;
  }

  const d = r.data || {};
  const compiled = d.compiled === true;
  const success = d.success === true;
  const statusClass = success ? "ok" : (compiled ? "warn" : "err");
  const statusLabel = success ? "Success" : (compiled ? "Runtime Error" : "Compile Error");
  let summary = `<span class="pill ${statusClass}">${statusLabel}</span> ${dt}ms`;
  if (d.line >= 0 && d.column >= 0 && !success) {
    summary += ` <span class="pill warn">line ${d.line}:${d.column}</span>`;
  }
  if (d.compileProblem) summary += `<br/>Compile: ${escape(d.compileProblem)}`;
  if (d.exceptionMessage) summary += `<br/>Exception: ${escape(d.exceptionMessage)}`;
  if (d.exceptionStackTrace) summary += `<br/><span class="meta">${escape(d.exceptionStackTrace)}</span>`;
  meta.innerHTML = summary;

  // Debug Log 取得 (実行直後の自分の最新 ApexLog 1件)
  let logBody = "";
  if (fetchLog) {
    const logRow = await runSoql({
      host: state.host, sid: state.sid, apiVersion: state.apiVersion, tooling: true,
      soql: `SELECT Id FROM ApexLog ORDER BY StartTime DESC LIMIT 1`,
    });
    if (logRow.ok && logRow.data && logRow.data.records && logRow.data.records[0]) {
      const logId = logRow.data.records[0].Id;
      const logFetch = await sfFetch({
        host: state.host, sid: state.sid,
        path: `/services/data/v${state.apiVersion}/tooling/sobjects/ApexLog/${logId}/Body/`,
        method: "GET",
      });
      if (logFetch.ok) {
        logBody = typeof logFetch.data === "string" ? logFetch.data : (logFetch.raw || JSON.stringify(logFetch.data));
      }
    }
  }
  out.textContent = (success ? "(コンパイル & 実行 OK)\n\n" : "") + logBody;
}

async function loadSavedApex() {
  const { savedApex = {} } = await chrome.storage.local.get("savedApex");
  const sel = document.getElementById("apexSaved");
  sel.innerHTML = "";
  Object.keys(savedApex).forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
}
async function saveCurrentApex() {
  const name = document.getElementById("apexSavedName").value.trim();
  if (!name) return;
  const text = document.getElementById("apexCode").value;
  const { savedApex = {} } = await chrome.storage.local.get("savedApex");
  savedApex[name] = text;
  await chrome.storage.local.set({ savedApex });
  loadSavedApex();
}
async function loadSelectedApex() {
  const name = document.getElementById("apexSaved").value;
  if (!name) return;
  const { savedApex = {} } = await chrome.storage.local.get("savedApex");
  if (savedApex[name]) document.getElementById("apexCode").value = savedApex[name];
}

// ====== LoginHistory ビュー ======
async function doFetchLoginHistory() {
  if (!state.sid) return;
  const limit = parseInt(document.getElementById("loginLimit").value, 10) || 50;
  const statusFilter = document.getElementById("loginStatus").value;
  const meta = document.getElementById("loginMeta");
  meta.textContent = "取得中…";

  let where = "";
  if (statusFilter === "Success") where = "WHERE Status = 'Success' ";
  else if (statusFilter === "Failed") where = "WHERE Status != 'Success' ";

  const soql = `SELECT Id, UserId, LoginTime, LoginType, Application, Status, ApiType, ApiVersion, ClientVersion, Browser, Platform, SourceIp ${where}ORDER BY LoginTime DESC LIMIT ${limit}`;

  const t0 = performance.now();
  const r = await runSoql({ host: state.host, sid: state.sid, soql, apiVersion: state.apiVersion });
  const dt = Math.round(performance.now() - t0);

  if (!r.ok) {
    displayApiError(meta, r.status, r.data, "Login History 取得");
    document.getElementById("loginResult").innerHTML = `<pre class="code">${escape(JSON.stringify(r.data, null, 2))}</pre>`;
    state.lastLoginRecords = null;
    return;
  }
  const recs = (r.data && r.data.records) || [];
  state.lastLoginRecords = recs;

  // reference_sf_auth_records.md の列順で整形: LoginType / Application / Status / ApiType / ApiVersion / ClientVersion
  const rows = recs.map((rec) => ({
    LoginTime: rec.LoginTime ? rec.LoginTime.replace("T", " ").replace(/\.\d+\+/, "+").replace(/\+0000$/, "Z") : "",
    LoginType: rec.LoginType || "",
    Application: rec.Application || "N/A",
    Status: rec.Status || "",
    ApiType: rec.ApiType || "",
    ApiVersion: rec.ApiVersion || "",
    ClientVersion: rec.ClientVersion || "",
    Browser: rec.Browser || "",
    Platform: rec.Platform || "",
    SourceIp: rec.SourceIp || "",
    UserId: rec.UserId || "",
  }));

  const successCount = recs.filter((r) => r.Status === "Success").length;
  const failedCount = recs.length - successCount;
  meta.innerHTML = `<span class="pill ok">${recs.length} 件</span> ` +
    `<span class="pill ok">Success ${successCount}</span> ` +
    `<span class="pill err">Failed ${failedCount}</span> / ${dt}ms`;
  document.getElementById("loginResult").innerHTML = loginHistoryTable(rows);
}

function loginHistoryTable(rows) {
  if (!rows.length) return `<div class="meta" style="padding:8px">該当なし</div>`;
  const headers = ["LoginTime", "LoginType", "Application", "Status", "ApiType", "ApiVersion", "ClientVersion", "Browser", "Platform", "SourceIp", "UserId"];
  const head = `<tr>${headers.map((h) => `<th>${escape(h)}</th>`).join("")}</tr>`;
  const body = rows.map((r) => {
    const statusOk = (r.Status || "").startsWith("Success");
    const statusCell = `<span class="pill ${statusOk ? "ok" : "err"}">${escape(r.Status)}</span>`;
    return `<tr>${headers.map((h) =>
      h === "Status" ? `<td>${statusCell}</td>` : `<td>${escape(stringify(r[h]))}</td>`
    ).join("")}</tr>`;
  }).join("");
  return `<table>${head}${body}</table>`;
}

function exportLoginCsv() {
  if (!state.lastLoginRecords || !state.lastLoginRecords.length) return;
  const csv = recordsToCsv(state.lastLoginRecords);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `login-history-${Date.now()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ====== saved queries (chrome.storage.local) ======
async function loadSavedQueries() {
  const { savedQueries = {} } = await chrome.storage.local.get("savedQueries");
  const sel = document.getElementById("soqlSaved");
  sel.innerHTML = "";
  Object.keys(savedQueries).forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
}
async function saveCurrentQuery() {
  const name = document.getElementById("soqlSavedName").value.trim();
  if (!name) return;
  const text = document.getElementById("soqlText").value;
  const { savedQueries = {} } = await chrome.storage.local.get("savedQueries");
  savedQueries[name] = text;
  await chrome.storage.local.set({ savedQueries });
  loadSavedQueries();
}
async function loadSelectedQuery() {
  const name = document.getElementById("soqlSaved").value;
  if (!name) return;
  const { savedQueries = {} } = await chrome.storage.local.get("savedQueries");
  if (savedQueries[name]) document.getElementById("soqlText").value = savedQueries[name];
}
