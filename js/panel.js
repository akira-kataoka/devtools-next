// DevTools パネル本体。inspectedWindow から URL を取って sid を引く。
import {
  isSalesforceHost, toApiHost, getSessionId, parseOrgIdFromSid,
  runSoql, sfFetch, recordsToCsv, to18CharId,
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

// op ごとに必要な input の表示制御 (apiObj / apiId)
// 注意: init() が bindEvents 経由で updateApiInputVisibility() を呼ぶため、
//       const は init 呼出より上で初期化される必要がある (v1.98.0 で TDZ バグ修正)
const API_OP_INPUTS = {
  describe: { obj: true, id: false },
  describeGlobal: { obj: false, id: false },
  get: { obj: true, id: true },
  getByExtId: { obj: true, id: true },
  create: { obj: true, id: false },
  update: { obj: true, id: true },
  upsert: { obj: true, id: true },
  delete: { obj: true, id: true },
  query: { obj: false, id: false },
  "tooling-query": { obj: false, id: false },
  search: { obj: false, id: false },
  composite: { obj: false, id: false },
  "composite-tree": { obj: true, id: false },
  batch: { obj: false, id: false },
  limits: { obj: false, id: false },
  versions: { obj: false, id: false },
  userinfo: { obj: false, id: false },
  "event-log-file": { obj: false, id: true },
};

// モジュールスクリプトの defer 性質に対応 (popup.js と同じ防御)
// 重要: init() を queueMicrotask で遅延させ、モジュール body 全 const 初期化完了後に走らせる
// (v1.99.0: 旧 v1.98.0 では API_OP_INPUTS のみ移動修正、本変更で他の全 const も TDZ 安全に)
// v2.77.0: 「初期化中のまま」報告対応 — モジュール評価到達と各段階を orgInfo に即記録
console.log("[DevToolsNext] panel.js module loaded (v2.77.0)");
// モジュール評価が走ったことを示すため、orgInfo を即時書き換え (queueMicrotask 前)
try {
  const _oi = document.getElementById("orgInfo");
  if (_oi) _oi.textContent = "⏳ JS 評価済み (init 待機中)";
} catch (_) {}
// catch ハンドラは escape() に依存しない安全実装 (escape 関数定義より前で評価される可能性を排除)
function _panelInitFailed(e) {
  console.error("[DevToolsNext] panel init failed:", e);
  const orgInfo = document.getElementById("orgInfo");
  if (orgInfo) {
    const msg = (e && e.message) || String(e);
    const stk = (e && e.stack) || String(e);
    // textContent 使用 (escape 関数依存を回避してエラーパス自身でエラー発生を防ぐ)
    orgInfo.textContent = "❌ 初期化失敗: " + msg;
    orgInfo.title = stk;
    orgInfo.classList.add("init-fail");
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => queueMicrotask(() => init().catch(_panelInitFailed)));
} else {
  queueMicrotask(() => init().catch(_panelInitFailed));
}

async function init() {
  // v2.76.0: init 進行状況を orgInfo に逐次表示 (ユーザー報告「未接続のまま」のリグレッション切り分け用)
  const orgInfo = document.getElementById("orgInfo");
  const setStep = (msg) => { if (orgInfo) orgInfo.textContent = msg; };
  try {
    setStep("⏳ 初期化中… (nav 構築)");
    console.log("[DevToolsNext] init: bindNav");
    bindNav();
    setStep("⏳ 初期化中… (event 登録)");
    console.log("[DevToolsNext] init: bindEvents");
    bindEvents();
    setStep("⏳ 初期化中… (セッション取得)");
    console.log("[DevToolsNext] init: reconnect");
    await reconnect();
    console.log("[DevToolsNext] init: post-reconnect (saved queries / pickers)");
    loadSavedQueries();
    loadSavedApex();
    initHeader();
    attachAllPickers();
    setupDesignPicker();
    // 検索系入力欄に ✕ クリア共通化
    ["inspectFilter", "exFieldFilter", "csFilter", "exObj", "descObj", "apiObj", "inspectRef"].forEach(attachClearButton);
    console.log("[DevToolsNext] init: complete");
  } catch (e) {
    console.error("[DevToolsNext] init error:", e);
    if (orgInfo) orgInfo.innerHTML = `<span class="pill err" title="${escape((e && e.stack) || String(e))}">初期化失敗: ${escape((e && e.message) || String(e))}</span>`;
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
// 連続クリックで stack されないよう既存 toast を replace
// opts.kind = "ok" | "err" | "warn" でカラーリング (default: accent)
function panelToast(msg, opts = {}) {
  document.querySelectorAll(".panel-toast").forEach((t) => t.remove());
  const el = document.createElement("div");
  el.className = "panel-toast" + (opts.kind ? " " + opts.kind : "");
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), opts.duration || 1800);
}

// 共通: ファイル名用タイムスタンプ生成 YYYYMMDD-HHmm
function tsForFilename() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// textarea で Tab キーを 2 spaces に変換 (focus 移動を防ぐ)
// 修飾キー時はブラウザ標準挙動に委譲:
//   - Shift+Tab: 逆方向 focus 移動 (アクセシビリティ標準)
//   - Ctrl/Cmd+Tab: ブラウザのタブ切替
//   - Alt+Tab (Win) / Option+Tab (Mac): OS のウィンドウ切替 / Mac の特殊文字入力
function enableTabToSpaces(el) {
  if (!el || el.dataset.tabHandled === "true") return;
  el.dataset.tabHandled = "true";
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    // IME 入力中 (日本語変換中) は Tab を奪わない: ブラウザの IME 確定キーとして使用させる
    if (e.isComposing || e.keyCode === 229) return;
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
      orgKey: state.orgId, // Org 別の recent items 管理
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
  // ブランドをクリックでデフォルトビュー (SOQL) に戻る
  const brand = hdr.querySelector(".brand");
  if (brand && brand.dataset.brandClick !== "true") {
    brand.dataset.brandClick = "true";
    brand.style.cursor = "pointer";
    brand.title = "クリックで SOQL クエリ画面に戻ります";
    brand.addEventListener("click", () => switchToView("soql"));
  }
  // 既存に version badge が無ければ追加
  if (!document.getElementById("verBadge")) {
    const v = chrome.runtime.getManifest().version;
    const badge = document.createElement("span");
    badge.id = "verBadge";
    badge.className = "org";
    badge.title = `現在のバージョン v${v} (VERSION.txt 30秒ポーリングで自動更新)`;
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
  // v2.80.0: 「最近開いたビュー」のサイドバー表示を撤去 (ユーザー要望: サイドバーが下まで見えない / 機能群を分かりやすく整理)
  // 履歴自体はストレージに保存し続けるが、サイドバーには展開しない (将来ホームに移動する余地は残す)
  try {
    const { [RECENT_VIEWS_KEY]: list = [] } = await chrome.storage.local.get(RECENT_VIEWS_KEY);
    const filtered = list.filter((v) => v.view !== viewName);
    filtered.unshift({ view: viewName, label, ts: Date.now() });
    await chrome.storage.local.set({ [RECENT_VIEWS_KEY]: filtered.slice(0, 7) });
  } catch {}
}

// v2.80.0: サイドバーへの注入を停止 (関数は呼び出し側互換のため残す)
async function renderRecentNav() {
  // 既存の「最近開いたビュー」DOM があれば撤去 (古いキャッシュ対応)
  const existing = document.getElementById("nav-recent-section");
  if (existing) existing.remove();
}

function switchToView(v) {
  // ビュー切替時は前ビューの toast を残さない (画面外に残り続ける問題の予防)
  document.querySelectorAll(".panel-toast").forEach((t) => t.remove());
  // v2.71.0: aria-current="page" を切替してスクリーンリーダーに現在ビューを通知
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.remove("active");
    b.removeAttribute("aria-current");
  });
  const matched = document.querySelectorAll('.nav-btn[data-view="' + v + '"]');
  matched.forEach((b) => {
    b.classList.add("active");
    b.setAttribute("aria-current", "page");
    // フラッシュアニメ: 既存クラスをトグルしてリトリガ
    b.classList.remove("flash");
    void b.offsetWidth; // reflow で animation 再起動
    b.classList.add("flash");
  });
  document.querySelectorAll(".view").forEach((p) => {
    const hidden = p.dataset.view !== v;
    p.classList.toggle("hidden", hidden);
    // v2.71.0: aria-hidden で非表示ビューをスクリーンリーダーからも除外
    if (hidden) p.setAttribute("aria-hidden", "true");
    else p.removeAttribute("aria-hidden");
  });
  // ビュー切替時にメイン領域のスクロール位置を最上部にリセット (前ビューでスクロールしていた状態が残る UX 問題を解消)
  const mainEl = document.querySelector(".main");
  if (mainEl) mainEl.scrollTop = 0;
  // ラベルを記録 (recent ボタンからの遷移時は元のメインボタンを基準に)
  const btn = document.querySelector('.nav-btn[data-view="' + v + '"]:not(.recent)');
  if (btn) {
    const label = btn.textContent.trim();
    pushRecentView(v, label);
    // document.title を動的更新 (ブラウザタブで現在のビュー名が見える)
    document.title = `${label} - DevToolsNext`;
  }
}

function bindNav() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchToView(btn.dataset.view));
  });
  // v2.71.0: 起動時の既存 .active なナビボタンに aria-current="page" を付与
  // (HTML の初期 active 状態には aria-current が無いため、a11y のために初期化時に同期させる)
  document.querySelectorAll(".nav-btn.active").forEach((b) => b.setAttribute("aria-current", "page"));
  // 同様に初期 hidden な .view にも aria-hidden を付与
  document.querySelectorAll(".view.hidden").forEach((p) => p.setAttribute("aria-hidden", "true"));
  renderRecentNav();
  // サイドメニュー折りたたみトグル (v2.5.0)
  const sideToggle = document.getElementById("btnSideToggle");
  const side = document.querySelector(".cols .side");
  if (sideToggle && side) {
    // 起動時に保存状態を復元
    chrome.storage.local.get("sideCollapsed").then((d) => {
      if (d && d.sideCollapsed) side.classList.add("collapsed");
    }).catch(() => {});
    sideToggle.addEventListener("click", () => {
      const collapsed = side.classList.toggle("collapsed");
      chrome.storage.local.set({ sideCollapsed: collapsed });
      panelToast(collapsed ? "◀ サイドメニューを折りたたみました" : "▶ サイドメニューを展開しました", { kind: "ok" });
    });
  }
}

function bindEvents() {
  // v2.77.0: ホームダッシュボードのカード (data-go="<view>") からビュー遷移
  document.querySelectorAll("[data-go]").forEach((el) => {
    el.addEventListener("click", () => {
      const v = el.getAttribute("data-go");
      if (v) switchToView(v);
    });
  });
  const btnRecon = document.getElementById("btnReconnect");
  if (btnRecon) btnRecon.addEventListener("click", reconnect);
  const apiVerEl = document.getElementById("apiVer");
  if (apiVerEl) apiVerEl.addEventListener("change", (e) => {
    state.apiVersion = e.target.value;
  });

  // グローバルキーボードショートカット (Inspector Reloaded 風)
  // Ctrl+Alt+I → Inspector ビュー / Ctrl+Alt+Q → SOQL / Ctrl+Alt+A → Apex / Ctrl+Alt+L → Limits
  document.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey && e.altKey)) return;
    const t = e.target;
    const tag = (t && t.tagName || "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    // contenteditable 要素も入力フィールド扱い (Mermaid Live Editor 風コードエディタ等)
    if (t && t.isContentEditable) return;
    const map = { "i": "inspector", "q": "soql", "a": "apex", "l": "limits", "r": "rest", "d": "design" };
    const labelMap = {
      "inspector": "🔍 レコード Inspector", "soql": "🔎 SOQL クエリ", "apex": "🟧 Apex 実行",
      "limits": "📊 Limits ダッシュボード", "rest": "🌐 REST 探索", "design": "📋 設計書ジェネレータ",
    };
    const view = map[e.key.toLowerCase()];
    if (view) {
      e.preventDefault();
      switchToView(view);
      panelToast(`⌨ ${labelMap[view] || view} ビューに切り替えました`, { kind: "ok" });
    }
  });

  // SOQL
  document.getElementById("btnRunSoql").addEventListener("click", doSoql);
  document.getElementById("btnExportCsv").addEventListener("click", exportCsv);
  const btnCopyCsv = document.getElementById("btnCopyCsv");
  if (btnCopyCsv) btnCopyCsv.addEventListener("click", copyCsvToClipboard);
  document.getElementById("btnSaveSoql").addEventListener("click", saveCurrentQuery);
  document.getElementById("btnLoadSoql").addEventListener("click", loadSelectedQuery);
  document.getElementById("soqlText").addEventListener("keydown", (e) => {
    if (e.isComposing || e.keyCode === 229) return; // IME 確定中はスキップ
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
  document.getElementById("btnApexCopy").addEventListener("click", async () => {
    const txt = document.getElementById("apexResult").textContent || "";
    if (!txt) { panelToast("📭 コピーする結果がありません", { kind: "warn" }); return; }
    try {
      await navigator.clipboard.writeText(txt);
      panelToast(`📋 Apex の実行結果をコピーしました (${txt.length.toLocaleString()} 文字)`, { kind: "ok" });
    } catch (e) {
      panelToast("❌ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" });
    }
  });
  document.getElementById("btnRestCopy").addEventListener("click", async () => {
    const txt = document.getElementById("restResult").textContent || "";
    if (!txt) { panelToast("📭 コピーする結果がありません", { kind: "warn" }); return; }
    try {
      await navigator.clipboard.writeText(txt);
      panelToast(`📋 REST のレスポンスをコピーしました (${txt.length.toLocaleString()} 文字)`, { kind: "ok" });
    } catch (e) {
      panelToast("❌ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" });
    }
  });
  enableTabToSpaces(document.getElementById("apexCode"));
  enableTabToSpaces(document.getElementById("soqlText"));
  document.getElementById("apexCode").addEventListener("keydown", (e) => {
    if (e.isComposing || e.keyCode === 229) return; // IME 確定中はスキップ
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
  document.getElementById("btnInspect").addEventListener("click", () => doInspect());
  document.getElementById("btnInspectFromTab").addEventListener("click", inspectFromTab);
  document.getElementById("btnInspectPasteId").addEventListener("click", async () => {
    try {
      const txt = (await navigator.clipboard.readText() || "").trim();
      // ID 部分のみ抽出 (URL からの貼付けにも対応: 末尾の 15/18 桁を拾う)
      const m = txt.match(/([a-zA-Z0-9]{15,18})(?:[^a-zA-Z0-9].*)?$/);
      if (!m) { panelToast("⚠ クリップボードに有効な ID が見つかりません", { kind: "warn" }); return; }
      // 15桁 ID は 18桁に展開 (REST API は両方受け入れるが 18桁の方が安全)
      const id = m[1].length === 15 ? to18CharId(m[1]) : m[1];
      document.getElementById("inspectRef").value = id;
      const expanded = m[1].length === 15 ? ` (15→18 展開)` : "";
      panelToast(`📋 ID を貼付けました: ${id}${expanded}`, { kind: "ok" });
      doInspect();
    } catch (e) {
      panelToast("❌ クリップボードからの読み取りに失敗しました: " + (e.message || e), { kind: "err" });
    }
  });
  const btnBack = document.getElementById("btnInspectBack");
  if (btnBack) btnBack.addEventListener("click", inspectGoBack);
  document.getElementById("btnInspectOpenInOrg").addEventListener("click", openInspectedInOrg);
  document.getElementById("btnInspectExportJson").addEventListener("click", () => exportInspect("json"));
  document.getElementById("btnInspectExportCsv").addEventListener("click", () => exportInspect("csv"));
  const btnCopyJson = document.getElementById("btnInspectCopyJson");
  if (btnCopyJson) btnCopyJson.addEventListener("click", async () => {
    if (!inspectState.record) { panelToast("⚠ レコードがまだ取得されていません", { kind: "warn" }); return; }
    try {
      await navigator.clipboard.writeText(JSON.stringify(inspectState.record, null, 2));
      panelToast(`📋 ${inspectState.obj}:${inspectState.id} の JSON をコピーしました`, { kind: "ok" });
    } catch (e) { panelToast("⚠ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" }); }
  });
  document.getElementById("inspectFilter").addEventListener("input", renderInspectorFields);
  document.getElementById("inspectShowNull").addEventListener("change", renderInspectorFields);
  document.getElementById("inspectShowSystem").addEventListener("change", renderInspectorFields);
  document.getElementById("inspectRef").addEventListener("keydown", (e) => {
    if (e.isComposing || e.keyCode === 229) return; // IME 確定中はスキップ
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
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter") exLoadFields();
  });

  // API URL ビルダー
  document.getElementById("btnApiBuild").addEventListener("click", apiBuildUrl);
  document.getElementById("btnApiCopy").addEventListener("click", apiCopyUrl);
  document.getElementById("btnApiCurlCopy").addEventListener("click", apiCopyCurl);
  document.getElementById("btnApiOpen").addEventListener("click", apiOpenInBrowser);
  document.getElementById("apiOp").addEventListener("change", apiBuildUrl);
  updateApiInputVisibility(); // 初期描画時にも反映

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
  // v2.75.0: ChangeSet ロードボタンを実行中無効化 (Tooling SOQL は時間がかかる場合あり、二重実行防止)
  const unlock = lockBtn("btnCsLoad");
  try {
    if (mode === "builder") {
      // 何もしない (既存状態維持)
    } else if (mode === "outboundList") {
      await csListOutbound();
    } else if (mode === "inboundList") {
      await csListInbound();
    } else if (mode === "deployStatus") {
      await csListDeployStatus();
    }
  } finally {
    unlock();
  }
}

async function csListOutbound() {
  if (!state.sid) { document.getElementById("csListArea").innerHTML = `<div class="meta" style="padding:8px">Salesforce 未接続です。先に「再接続」をクリックしてください</div>`; return; }
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
  // 列名業務化
  const csStatusMap = { "New": "未送信", "Uploading": "送信中", "Uploaded": "送信済", "Failed": "失敗" };
  const records = (r.data.records || []).map((rec) => ({
    "Id": rec.Id,
    "変更セット名": rec.Name,
    "説明": rec.Description || "",
    "ステータス": csStatusMap[rec.Status] || rec.Status || "",
    "送信先組織": rec.SourceOrganization || "",
    "ロック": rec.IsLocked ? "○ ロック中" : "",
    "更新日": rec.LastModifiedDate,
  }));
  document.getElementById("csListArea").innerHTML = recordsTable(records);
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
  // 列名業務化
  const csStatusMap = { "New": "新規", "Validated": "検証済", "Deployed": "デプロイ完了", "Failed": "失敗" };
  const records = (r.data.records || []).map((rec) => ({
    "Id": rec.Id,
    "変更セット名": rec.Name,
    "説明": rec.Description || "",
    "ステータス": csStatusMap[rec.Status] || rec.Status || "",
    "送信元組織": rec.SourceOrganization || "",
    "更新日": rec.LastModifiedDate,
  }));
  document.getElementById("csListArea").innerHTML = recordsTable(records);
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
  // 列名業務化 + ステータス絵文字
  const deployStatusMap = { "Pending": "⏳ 待機中", "InProgress": "🔄 実行中", "Succeeded": "✓ 成功", "SucceededPartial": "△ 部分成功", "Failed": "✗ 失敗", "Canceling": "⏸ 取消中", "Canceled": "⏹ 取消済" };
  const records = (r.data.records || []).map((rec) => ({
    "Id": rec.Id,
    "ステータス": deployStatusMap[rec.Status] || rec.Status || "",
    "コンポーネント": `${rec.NumberComponentsDeployed || 0} / ${rec.NumberComponentsTotal || 0}${rec.NumberComponentErrors ? ` (✗ ${rec.NumberComponentErrors})` : ""}`,
    "テスト": `${rec.NumberTestsCompleted || 0} / ${rec.NumberTestsTotal || 0}${rec.NumberTestErrors ? ` (✗ ${rec.NumberTestErrors})` : ""}`,
    "検証のみ": rec.CheckOnly ? "○" : "",
    "テスト実行": rec.RunTestsEnabled ? "○" : "",
    "実行者": rec.CreatedBy ? rec.CreatedBy.Name : "",
    "開始日時": rec.CreatedDate,
    "完了日時": rec.CompletedDate || "(未完了)",
  }));
  document.getElementById("csListArea").innerHTML = recordsTable(records);
}

async function csListCandidates() {
  if (!state.sid) { document.getElementById("csCandidates").innerHTML = `<div class="meta">Salesforce 未接続です</div>`; return; }
  const type = document.getElementById("csType").value;
  const root = document.getElementById("csCandidates");
  root.innerHTML = `<div class="meta">⏳ 候補を取得しています…</div>`;

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
        panelToast(`➖ 除外: ${c.type}:${c.name}`, { kind: "warn" });
      } else {
        csState.selected.push({ ...c });
        panelToast(`➕ 追加: ${c.type}:${c.name}`, { kind: "ok" });
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
  panelToast("📋 package.xml をコピーしました", { kind: "ok" });
}

function csDownloadXml() {
  const t = document.getElementById("csXml").textContent;
  if (!t) { panelToast("📭 package.xml がまだ生成されていません。先に「package.xml 生成」ボタンをクリックしてください", { kind: "warn" }); return; }
  const blob = new Blob([t], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "package.xml"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  document.getElementById("csMeta").innerHTML += ` <span class="pill ok">package.xml ダウンロード</span>`;
  const sz = t.length;
  const label = sz < 1024 ? `${sz} B` : `${(sz / 1024).toFixed(1)} KB`;
  panelToast(`📥 package.xml ダウンロード (${label})`, { kind: "ok" });
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
  a.href = url; a.download = `sfdx-bundle-${tsForFilename()}.md`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  document.getElementById("csMeta").innerHTML += ` <span class="pill ok">SFDX バンドル (.md) ダウンロード</span>`;
  const sz = bundle.length;
  const label = sz < 1024 ? `${sz} B` : `${(sz / 1024).toFixed(1)} KB`;
  panelToast(`📥 SFDX バンドル (.md) ダウンロード (${label})`, { kind: "ok" });
}

// ====== データエクスポート ======
const exState = { obj: null, fields: [], selected: new Set() };

async function exLoadFields() {
  if (!state.sid) { document.getElementById("exMeta").innerHTML = `<span class="pill err">Salesforce 未接続</span>`; return; }
  const obj = document.getElementById("exObj").value.trim();
  if (!obj) {
    document.getElementById("exMeta").innerHTML = `<span class="pill warn">対象オブジェクトの API 名を入力してください</span>`;
    return;
  }
  const exMetaEl = document.getElementById("exMeta");
  // v2.74.0: lockBtn ヘルパー化で二重クリック防止 + try/finally で確実に解除
  const unlock = lockBtn("btnExLoadFields");
  exMetaEl.textContent = "⏳ describe 情報を取得しています…";
  exMetaEl.classList.add("loading-pulse");

  const r = await sfFetch({ host: state.host, sid: state.sid, path: `/services/data/v${state.apiVersion}/sobjects/${encodeURIComponent(obj)}/describe` });
  if (!r.ok) {
    unlock();
    exMetaEl.classList.remove("loading-pulse");
    exMetaEl.innerHTML = `<span class="pill err">describe の取得に失敗しました (HTTP ${r.status})</span> ${escape(JSON.stringify(r.data).substring(0, 200))}`;
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

  exMetaEl.classList.remove("loading-pulse");
  exMetaEl.innerHTML = `<span class="pill ok">${escape(obj)}</span> <span class="pill">${exState.fields.length} 項目</span> 標準フィールドを ${exState.selected.size} 件選択中`;
  exRenderFieldList();
  exBuildSoql();
  unlock();
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
  const runBtn = document.getElementById("btnExRun");
  const myId = ++exPreviewRunId;
  meta.textContent = `⏳ プレビュー (先頭 200 件) を取得しています… #${myId}`;
  if (runBtn) { runBtn.disabled = true; runBtn.style.opacity = "0.6"; }
  const t0 = performance.now();
  const previewSoql = soql.replace(/LIMIT\s+\d+/i, "LIMIT 200");
  const r = await runSoql({ host: state.host, sid: state.sid, soql: previewSoql, apiVersion: state.apiVersion, tooling });
  const dt = Math.round(performance.now() - t0);
  if (myId !== exPreviewRunId) { console.log(`[DevToolsNext] discard stale Export preview #${myId}`); return; }
  if (runBtn) { runBtn.disabled = false; runBtn.style.opacity = ""; }
  if (!r.ok) {
    displayApiError(meta, r.status, r.data, "データエクスポート プレビュー");
    preview.innerHTML = `<pre class="code">${escape(JSON.stringify(r.data, null, 2))}</pre>`;
    return;
  }
  const recs = (r.data.records || []);
  meta.innerHTML = `<span class="pill ok">プレビュー ${recs.length} 件</span> ${dt}ms (実行時は最大 ${parseInt(document.getElementById("exLimit").value, 10) || 2000} 件まで取得します)`;
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
    btnExDlExcel: { running: "⏸ 取消 (Excel)", idle: "Excel (.xml) ダウンロード" },
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
  if (!soql) {
    panelToast("⚠ SOQL が空です。先にフィールドを選択してください", { kind: "warn" });
    return;
  }
  // 選択フィールドが 0 件なら警告して中断
  if (!exState.selected || exState.selected.size === 0) {
    panelToast("⚠ 出力フィールドを 1 つ以上選択してください", { kind: "warn" });
    return;
  }
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
  a.download = `${exState.obj}_${tsForFilename()}.${ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  progress.innerHTML = `<span class="pill ok">${all.length} 件 ${fmt.toUpperCase()} ダウンロード完了</span>`;
}

function exToCsv(fields, records) {
  // 全列を必ずダブルクォートで囲む (Limits CSV と統一、ロケール差/区切り混在対応)
  const escAll = (v) => {
    if (v == null) return `""`;
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [fields.map(escAll).join(",")];
  for (const r of records) {
    lines.push(fields.map((h) => escAll(r[h])).join(","));
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
  describe: "指定オブジェクトのフィールド・リレーション・レコードタイプ情報を取得します。設計書ジェネレータの主要データソースとして利用されます。業務用途: 新規開発前の項目仕様確認 / 監査時の項目台帳作成。",
  describeGlobal: "テナント全体の SObject 一覧を取得します。業務用途: 組織内に存在するオブジェクト総覧の確認 / カスタムオブジェクトの棚卸し。",
  get: "単一レコードを取得します (任意フィールドのみ取得したい場合は ?fields=API名1,API名2 を付与可能)。業務用途: レコード ID から内容確認 / Inspector の代替。",
  getByExtId: "外部 ID で単一レコードを取得します (例: Email/foo@bar.com)。業務用途: 内部 ID を知らずに外部システムの ID でレコード参照 / データ連携テスト。",
  create: "POST で新規レコードを作成します。Body は JSON 形式 { API名: 値 }。業務用途: テストデータ投入 / 一括投入のサンプルリクエスト確認。",
  update: "PATCH で既存レコードを更新します。Body は JSON 形式。業務用途: 単発の値修正 / 項目バリデーション挙動確認。",
  upsert: "PATCH with 外部 ID 値で upsert します (該当レコードがなければ作成、あれば更新)。業務用途: データ連携の冪等性確保 / 重複登録防止。",
  delete: "DELETE で物理削除します (Recycle Bin に入りますが IsDeleted フラグは立ちません)。業務用途: テストデータ削除 / 不要レコードの即時削除。",
  query: "SOQL クエリを実行します。業務用途: 任意条件のレコード取得 / 件数集計 / 関連項目の確認。",
  "tooling-query": "Tooling API で ApexClass / Flow / FieldDefinition 等のメタデータを問合せます。業務用途: メタデータ棚卸 / 開発状況の集計 / 設計書生成用データ収集。",
  search: "SOSL (横断検索) を実行します。業務用途: 複数オブジェクト横断のテキスト検索 / グローバル検索の挙動確認。",
  composite: "複数 REST 呼び出しを 1 リクエストにまとめます (dependsOn でチェーン可)。業務用途: API コール数削減 / トランザクション的に関連処理を実行。",
  "composite-tree": "親子レコードをまとめて作成します (例: Account + 配下 Contact を 1 リクエストで)。業務用途: 取引先と関連連絡先の一括投入。",
  batch: "独立した複数操作を一括実行します (依存無し、最大 25 件)。業務用途: 関連のない複数 GET/POST をまとめて発行。",
  limits: "API コール上限・データ容量・ストレージ等の現在の使用率を取得します。業務用途: 月初の Limits 確認 / 一括処理前のチェック。",
  versions: "利用可能な API バージョン一覧を取得します。業務用途: クライアントが利用すべきバージョンの確認。",
  userinfo: "現在のセッションのユーザ情報 (user_id / organization_id / urls 等) を取得します。業務用途: セッション動作確認 / SSO 動作テスト。",
  "event-log-file": "EventLogFile (監査ログ) の一覧を取得します。LogDate / EventType / LogFile (バイナリ) を持ちます。業務用途: 監査ログのダウンロード / セキュリティ監視。",
};

function updateApiInputVisibility() {
  const op = document.getElementById("apiOp").value;
  const cfg = API_OP_INPUTS[op] || { obj: true, id: true };
  const apiObj = document.getElementById("apiObj");
  const apiId = document.getElementById("apiId");
  if (apiObj) apiObj.style.display = cfg.obj ? "" : "none";
  if (apiId) apiId.style.display = cfg.id ? "" : "none";
}

function apiBuildUrl() {
  if (!state.apiHost) {
    document.getElementById("apiBuildMeta").innerHTML = `<span class="pill warn">SF に接続後に生成可能</span>`;
  }
  updateApiInputVisibility();
  const op = document.getElementById("apiOp").value;
  const objName = document.getElementById("apiObj").value.trim();
  const id = document.getElementById("apiId").value.trim();
  const apiVer = state.apiVersion || "62.0";
  const host = state.apiHost || "<your-instance>.my.salesforce.com";

  let path = "", method = "GET", body = null, note = "";
  switch (op) {
    case "describe":
      if (!objName) note = "⚠ オブジェクトの API 名を入力してください";
      path = `/services/data/v${apiVer}/sobjects/${objName || "<Object>"}/describe`;
      break;
    case "describeGlobal":
      path = `/services/data/v${apiVer}/sobjects/`;
      break;
    case "get":
      if (!objName || !id) note = "⚠ オブジェクト API 名とレコード ID の両方を入力してください";
      path = `/services/data/v${apiVer}/sobjects/${objName || "<Object>"}/${id || "<Id>"}`;
      break;
    case "getByExtId":
      if (!objName || !id) note = "⚠ オブジェクト API 名と『<外部ID項目名>/<値>』形式の指定を入力してください (例: Email/foo@bar.com、Account__c/MyExtKey-123)";
      else if (!/^[A-Za-z0-9_]+\/.+/.test(id)) note = "⚠ 形式エラーです: 「外部 ID 項目名 / 値」 をスラッシュ区切りで入力してください (例: Email/foo@bar.com)";
      path = `/services/data/v${apiVer}/sobjects/${objName || "<Object>"}/${id || "<ExtIdField>/<value>"}`;
      break;
    case "create":
      method = "POST"; body = `{\n  "Name": "サンプル取引先",\n  "Description": "DevToolsNext から作成したテストレコード"\n}`;
      path = `/services/data/v${apiVer}/sobjects/${objName || "<Object>"}/`;
      break;
    case "update":
      method = "PATCH"; body = `{\n  "FieldName__c": "新しい値",\n  "Description": "更新コメント"\n}`;
      path = `/services/data/v${apiVer}/sobjects/${objName || "<Object>"}/${id || "<Id>"}`;
      break;
    case "upsert":
      method = "PATCH"; body = `{\n  "Name": "サンプル",\n  "Description": "upsert で作成または更新されるレコード"\n}`;
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
    curl = `# ⚠ 注意: 以下の curl コマンドには Salesforce セッション ID (sid) を含めるため、外部共有時はマスクしてください\n# 環境変数 SID にはポップアップ > セッション情報 > コピー で取得した値を設定してください\nexport SID="${state.sid.substring(0, 20)}..."   # 実際は完全な sid を使用してください\n\n${curl}`;
  }

  document.getElementById("apiBuildUrl").textContent = fullUrl;
  document.getElementById("apiBuildCurl").textContent = curl;
  document.getElementById("apiBuildHelp").innerHTML =
    `<h3>${escape(op)} (${method})</h3>` +
    `<p>${escape(API_HELP[op] || "")}</p>` +
    (note ? `<blockquote>${escape(note)}</blockquote>` : "") +
    (body ? `<p><b>サンプル body:</b></p><pre><code>${escape(body)}</code></pre>` : "");
  document.getElementById("apiBuildMeta").innerHTML = `<span class="pill ok">${method}</span> ${escape(op)} ${state.sid ? "" : `<span class="pill warn">Salesforce 未接続: ホスト名はプレースホルダーです</span>`}`;
}

async function apiCopyUrl() {
  const t = document.getElementById("apiBuildUrl").textContent;
  if (t) { await navigator.clipboard.writeText(t); panelToast("📋 URL をコピーしました", { kind: "ok" }); }
}
async function apiCopyCurl() {
  const t = document.getElementById("apiBuildCurl").textContent;
  if (t) { await navigator.clipboard.writeText(t); panelToast("📋 curl コマンドをコピーしました", { kind: "ok" }); }
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
const inspectHistory = []; // 過去訪問した {obj, id} を最大 20 件保持
function updateInspectBackButton() {
  const cnt = inspectHistory.length;
  const btn0 = document.getElementById("btnInspectBack");
  if (btn0) {
    btn0.title = cnt > 0
      ? `一つ前のレコードに戻ります (履歴 ${cnt} 件)`
      : "履歴がまだありません (一度別レコードを取得すると有効化されます)";
  }
  const btn = document.getElementById("btnInspectBack");
  if (btn) btn.disabled = inspectHistory.length === 0;
}
function inspectGoBack() {
  if (!inspectHistory.length) return;
  const prev = inspectHistory.pop();
  if (prev) {
    document.getElementById("inspectRef").value = `${prev.obj}:${prev.id}`;
    panelToast(`⏪ 前のレコード (${prev.obj}:${prev.id}) に戻りました`, { kind: "ok" });
    doInspect({ skipHistory: true, restoreScrollTop: prev.scrollTop || 0 });
  }
  updateInspectBackButton();
}
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
  // Lightning Setup: /lightning/setup/<feature>/page?address=%2F<Id>
  // または query string や fragment 内に 15/18桁 ID
  try {
    const u = new URL(href);
    // ?address=%2F<Id>... 形式 (encoded slash)
    const addr = u.searchParams.get("address");
    if (addr) {
      const am = addr.match(/([a-zA-Z0-9]{15,18})/);
      if (am) {
        document.getElementById("inspectRef").value = am[1];
        doInspect();
        return;
      }
    }
    // pathname に ID
    m = u.pathname.match(/\/([a-zA-Z0-9]{15,18})(?:\/|$)/);
    if (m) {
      document.getElementById("inspectRef").value = m[1];
      doInspect();
      return;
    }
    // fragment 内に ID (Classic 旧 URL: #/sObject/<Id>/view 等)
    const frag = u.hash || "";
    const fm = frag.match(/([a-zA-Z0-9]{15,18})/);
    if (fm) {
      document.getElementById("inspectRef").value = fm[1];
      doInspect();
      return;
    }
  } catch {}
  document.getElementById("inspectMeta").innerHTML = `<span class="pill warn">タブからレコードIDを抽出できません</span> URL: ${escape(href.substring(0, 100))}<br/>💡 レコード詳細画面で再試行 (Setup ページからは抽出できないことがあります)`;
}

let inspectRunId = 0;
async function doInspect(opts = {}) {
  if (!state.sid) { document.getElementById("inspectMeta").innerHTML = `<span class="pill err">Salesforce 未接続</span>`; return; }
  const raw = document.getElementById("inspectRef").value.trim();
  if (!raw) return;
  // 現在のレコードを履歴に push してから新規取得 (戻るボタン用)
  if (!opts.skipHistory && inspectState.obj && inspectState.id) {
    // 同一レコードの再 inspect は履歴に積まない (重複防止)
    const last = inspectHistory[inspectHistory.length - 1];
    const sameAsLast = last && last.obj === inspectState.obj && last.id === inspectState.id;
    // 新規 raw が現在表示中と同じならスキップ
    const movingToCurrent = raw && (raw === inspectState.id || raw === `${inspectState.obj}:${inspectState.id}`);
    if (!sameAsLast && !movingToCurrent) {
      const curResult = document.getElementById("inspectResult");
      const scrollTop = curResult ? curResult.scrollTop : 0;
      inspectHistory.push({ obj: inspectState.obj, id: inspectState.id, scrollTop });
      if (inspectHistory.length > 20) inspectHistory.shift();
      updateInspectBackButton();
    }
  }
  const myId = ++inspectRunId;
  const meta = document.getElementById("inspectMeta");
  const runBtn = document.getElementById("btnInspect");
  meta.textContent = `⏳ レコードを取得しています… #${myId}`;
  meta.classList.add("loading-pulse");
  if (runBtn) { runBtn.disabled = true; runBtn.style.opacity = "0.6"; }

  let objName = null, id = null;
  if (raw.includes(":")) {
    [objName, id] = raw.split(":").map((s) => s.trim());
  } else {
    id = raw;
  }
  if (!/^[a-zA-Z0-9]{15,18}$/.test(id)) {
    meta.classList.remove("loading-pulse");
    if (runBtn) { runBtn.disabled = false; runBtn.style.opacity = ""; }
    meta.innerHTML = `<span class="pill err">有効な Salesforce ID ではありません (15 桁または 18 桁の英数字を入力してください)</span>`;
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
      meta.classList.remove("loading-pulse");
      if (runBtn) { runBtn.disabled = false; runBtn.style.opacity = ""; }
      meta.innerHTML = `<span class="pill err">Key Prefix '${escape(prefix)}' のオブジェクトが見つかりませんでした</span>。『&lt;Object&gt;:&lt;Id&gt;』形式 (例: Account:001...) で指定してください`;
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

  if (!descR.ok) { meta.classList.remove("loading-pulse"); if (runBtn) { runBtn.disabled = false; runBtn.style.opacity = ""; } displayApiError(meta, descR.status, descR.data, `Inspector describe(${objName})`); return; }
  if (!recR.ok) {
    meta.classList.remove("loading-pulse");
    if (runBtn) { runBtn.disabled = false; runBtn.style.opacity = ""; }
    const hint = recR.status === 404
      ? `見つかりません (削除済 / 別組織の Id / 権限不足の可能性があります)`
      : recR.status === 403
      ? `アクセス権限が不足しています (オブジェクト・レコードの共有設定をご確認ください)`
      : `HTTP ${recR.status}`;
    meta.innerHTML = `<span class="pill err">レコードの取得に失敗しました: ${escape(hint)}</span> ` +
      `<span class="meta">describe (${escape(objName)}) は成功しましたが、レコード本体のみ失敗しました</span>`;
    return;
  }
  meta.classList.remove("loading-pulse");
  if (runBtn) { runBtn.disabled = false; runBtn.style.opacity = ""; }
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
    `<span class="pill" title="describe の全項目数">${fieldCount.toLocaleString()} 項目</span> ` +
    `<span class="pill" title="null/空白/false を除いた値があるフィールド数">値あり ${filledCount.toLocaleString()}</span> ${dt}ms`;

  renderInspectorFields();
  if (opts.restoreScrollTop) {
    const r = document.getElementById("inspectResult");
    if (r) r.scrollTop = opts.restoreScrollTop;
  }
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
  html.push(`<div class="field-row field-row-header">
    <div>API 名</div><div>型</div><div>値</div><div style="text-align:right">属性フラグ</div>
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
      valHtml = `<div class="fval null" title="値が設定されていません (null)">(空)</div>`;
    } else if (typeof v === "boolean") {
      valHtml = `<div class="fval bool-${v ? "true" : "false"}" title="raw 値: ${v}">${v ? "✓ はい (true)" : "✗ いいえ (false)"}</div>`;
    } else if ((f.type === "int" || f.type === "double" || f.type === "currency" || f.type === "percent") && typeof v === "number") {
      // 3桁区切り + 通貨/パーセントなどのヒント
      const formatted = v.toLocaleString("ja-JP");
      const unit = f.type === "currency" ? " ¥" : (f.type === "percent" ? " %" : "");
      valHtml = `<div class="fval" title="raw 値: ${escape(String(v))}">${escape(formatted)}${escape(unit)}</div>`;
    } else if ((f.type === "date" || f.type === "datetime") && typeof v === "string") {
      // ISO 文字列を読みやすく整形 (date: YYYY-MM-DD, datetime: YYYY-MM-DD HH:mm)
      let display = v;
      const m = v.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/);
      if (m) {
        display = f.type === "datetime" && m[2] ? `${m[1]} ${m[2]}` : m[1];
      }
      valHtml = `<div class="fval" title="ISO raw 値: ${escape(v)}">${escape(display)}</div>`;
      // 参照先オブジェクト名を describe から取得 (KeyPrefix 逆引きに頼らない確実な方法)
      const refObj = (f.referenceTo || [])[0] || "";
      const refLabel = refObj ? `<span class="ref-target-label">→ ${escape(refObj)}</span>` : "";
      valHtml = `<div class="fval ref" data-id="${escape(v)}" data-ref-obj="${escape(refObj)}" title="クリックで ${escape(refObj || "参照先")} のレコードを Inspector で開きます">${escape(v)}${refLabel}</div>`;
    } else if (typeof v === "object") {
      valHtml = `<div class="fval">${escape(JSON.stringify(v))}</div>`;
    } else {
      valHtml = `<div class="fval">${escape(String(v))}</div>`;
    }

    const flags = [];
    if (f.unique) flags.push(`<span class="badge-unique" title="一意 (Unique) 制約あり">U</span>`);
    if (!f.nillable && !f.defaultedOnCreate && f.createable) flags.push(`<span class="badge-required" title="必須項目 (入力必須)">必</span>`);
    if (f.type === "reference") flags.push(`<span class="badge-ref" title="参照項目 (他オブジェクトへの Lookup または Master-Detail)">→</span>`);
    if (f.calculated) flags.push(`<span style="color:var(--fg-dim);font-size:9px" title="計算項目 (formula)">f(x)</span>`);

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

  // 絞込み中の場合は冒頭にヒット件数を表示
  const filterVal = document.getElementById("inspectFilter").value;
  if (filterVal && shown > 0) {
    html.splice(1, 0, `<div class="meta" style="padding:4px 8px;color:var(--accent)">🔍 絞込み「${escape(filterVal)}」: ${shown} 件ヒット (全 ${fields.length} 項目中)</div>`);
  }

  if (!shown) {
    const hints = [];
    if (!document.getElementById("inspectShowNull").checked) hints.push("「空値も表示します」をチェックすると null フィールドも表示されます");
    if (!document.getElementById("inspectShowSystem").checked) hints.push("「システム項目を表示します」で CreatedById / SystemModstamp も確認できます");
    const filter = document.getElementById("inspectFilter").value;
    if (filter) hints.push(`絞込み "${escape(filter)}" を ✕ でクリアすると全件表示されます`);
    html.push(`<div class="meta" style="padding:16px;text-align:center;line-height:1.7">` +
      `<div style="font-size:13px;color:var(--accent);margin-bottom:8px">📭 該当するフィールドはありません</div>` +
      hints.map((h) => `<div>💡 ${h}</div>`).join("") +
      `</div>`);
  }
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
  if (!inspectState.record) { panelToast("📭 まだレコードが未取得です", { kind: "warn" }); return; }
  let body, mime, ext;
  if (fmt === "json") {
    body = JSON.stringify(inspectState.record, null, 2);
    mime = "application/json;charset=utf-8"; ext = "json";
  } else {
    // describe.fields の順を維持しつつ単一レコード CSV (recordsToCsv 経由でネスト平坦化 + datetime 整形を享受)
    const fields = (inspectState.describe.fields || []).map((f) => f.name);
    const ordered = {};
    for (const n of fields) ordered[n] = inspectState.record[n];
    body = "﻿" + recordsToCsv([ordered]);
    mime = "text/csv;charset=utf-8"; ext = "csv";
  }
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${inspectState.obj}_${inspectState.id}.${ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  const sz = body.length;
  const label = sz < 1024 ? `${sz} B` : `${(sz / 1024).toFixed(1)} KB`;
  panelToast(`📥 ${inspectState.obj}:${inspectState.id} を ${ext.toUpperCase()} ダウンロード (${label})`, { kind: "ok" });
}

// ====== Limits ダッシュボード (置換実装) ======
let lastLimitsData = null;

// 共通: ボタンの実行中ロック (二重クリック防止). 戻り値は解除関数
function lockBtn(id) {
  const b = document.getElementById(id);
  if (!b) return () => {};
  b.disabled = true; b.style.opacity = "0.6";
  return () => { b.disabled = false; b.style.opacity = ""; };
}

async function doLimits() {
  if (!state.sid) return;
  const unlock = lockBtn("btnLimits");
  const r = await sfFetch({ host: state.host, sid: state.sid, path: `/services/data/v${state.apiVersion}/limits` });
  unlock();
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
    sumEl.innerHTML = critical.map((r) => {
      const status = r.pct >= 90 ? "🚨 危険水準" : "⚠ 注意水準";
      return `
      <div class="limit-card ${r.pct >= 90 ? "critical" : "warn"}" title="${escape(r.name)}: 使用 ${r.used.toLocaleString()} / 上限 ${r.max.toLocaleString()} (${r.pct}%)">
        <div class="title">${escape(r.name)}</div>
        <div class="val">${r.pct}%</div>
        <div class="sub">${r.used.toLocaleString()} / ${r.max.toLocaleString()} <span style="opacity:0.7">(${status})</span></div>
      </div>`;
    }).join("");
  } else {
    sumEl.innerHTML = `<div class="limit-card"><div class="title">健全</div><div class="val" style="color:var(--ok)">✓ 問題なし</div><div class="sub">使用率 70% を超える項目はありません</div></div>`;
  }

  // 一覧
  const root = document.getElementById("limitsResult");
  const html = [`<div class="limit-row header">
    <div>項目 (Limit 名)</div><div>使用</div><div>残り</div><div>上限</div><div>使用率バー</div><div>%</div>
  </div>`];
  for (const r of rows) {
    const cls = r.pct >= 90 ? "critical" : (r.pct >= 70 ? "warn" : (r.pct >= 50 ? "mid" : "low"));
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
  if (!lastLimitsData) { panelToast("📭 Limits 情報が未取得です。先に「取得」ボタンをクリックしてください", { kind: "warn" }); return; }
  // すべての列をダブルクォートで包む (Excel/Numbers/Google Sheets でロケール差や %/カンマ含む値を安全に)
  // 使用率は数値 (0-100) で出力 → Excel で数値ソート/フィルタ/条件付き書式が機能する
  const lines = [`"項目","使用","残量","上限","使用率(%)"`];
  Object.entries(lastLimitsData).forEach(([k, v]) => {
    const max = (v && v.Max != null) ? v.Max : 0;
    const rem = (v && v.Remaining != null) ? v.Remaining : 0;
    const used = max - rem;
    const pct = max > 0 ? Math.round((used / max) * 100) : 0;
    const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
    lines.push([k, used, rem, max, pct].map(esc).join(","));
  });
  const csv = "﻿" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `limits-${tsForFilename()}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  const sz = csv.length;
  const label = sz < 1024 ? `${sz} B` : `${(sz / 1024).toFixed(1)} KB`;
  panelToast(`📥 Limits CSV ダウンロード (${lines.length - 1} 項目 / ${label})`, { kind: "ok" });
}

// ====== 設計書ジェネレータ ======
let lastDesign = null;
let designRunId = 0;

async function doGenerateDesign() {
  if (!state.sid) { document.getElementById("designMeta").innerHTML = `<span class="pill err">Salesforce 未接続</span> Salesforce タブで再接続してください`; return; }
  const unlock = lockBtn("btnDesignGen");
  const type = document.getElementById("designType").value;
  const obj = document.getElementById("designObj").value.trim();
  const format = document.getElementById("designFormat").value;
  const meta = document.getElementById("designMeta");
  const preview = document.getElementById("designPreview");
  const source = document.getElementById("designSource");

  const myId = ++designRunId;
  meta.textContent = `⏳ 設計書を生成しています… #${myId}`;
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
      preview.innerHTML = `<h2>${escape(result.title)}</h2><p>Excel 形式 (SpreadsheetML XML / .xml) を生成しました。</p><p><b>ダウンロード</b> ボタンで保存 → ダブルクリックで Excel が直接開きます。<br/>Excel で開いた後、より高機能な <b>.xlsx</b> 形式で再保存するとブック保護等が使えます。</p><pre><code>${escape(result.source.substring(0, 800))}…</code></pre>`;
    } else {
      preview.innerHTML = `<pre><code>${escape(result.source)}</code></pre>`;
    }
    // 設計書プレビューにトップへ戻るボタン (スクロールが深いときの戻り易さ)
    if (!preview.querySelector(".design-top-btn")) {
      const topBtn = document.createElement("button");
      topBtn.className = "design-top-btn";
      topBtn.textContent = "▲ 先頭へ戻る";
      topBtn.title = "クリックでプレビューの先頭までスクロールします";
      topBtn.addEventListener("click", () => preview.scrollTo({ top: 0, behavior: "smooth" }));
      preview.appendChild(topBtn);
    }
    // ER 図 (Mermaid) の場合は Live Editor ボタンを追加
    if (result.type === "erDiagram" && result.sections && result.sections[0] && result.sections[0].mermaid) {
      const mermaidText = result.sections[0].mermaid;
      const liveBtn = document.createElement("button");
      liveBtn.className = "primary";
      liveBtn.style.marginTop = "8px";
      liveBtn.textContent = "🔗 Mermaid Live Editor で可視化";
      liveBtn.title = "新しいタブで mermaid.live を開き、ER 図を可視化します";
      liveBtn.addEventListener("click", () => {
        // mermaid.live は #pako: base64 で URL に埋め込めるが、軽量のため #base64: 形式で
        try {
          const state = { code: mermaidText, mermaid: { theme: "dark" }, autoSync: true, updateDiagram: true };
          const enc = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
          chrome.tabs.create({ url: `https://mermaid.live/edit#base64:${enc}` });
        } catch (e) {
          chrome.tabs.create({ url: "https://mermaid.live/" });
          panelToast("Mermaid Live Editor を新しいタブで開きました。コードを貼り付けてください", { kind: "warn" });
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
      meta.innerHTML = `<span class="pill err">生成に失敗しました</span> ${escape(msg)} (${dt}ms)`;
    }
    preview.innerHTML = "";
    source.textContent = "";
  } finally {
    unlock();
  }
}

async function copyDesignSource() {
  if (!lastDesign) { panelToast("📭 まだ設計書が未生成です", { kind: "warn" }); return; }
  try {
    const src = lastDesign.source || "";
    await navigator.clipboard.writeText(src);
    // サイズ表示 (B/KB/MB)
    const sz = src.length;
    let label;
    if (sz < 1024) label = `${sz} B`;
    else if (sz < 1048576) label = `${(sz / 1024).toFixed(1)} KB`;
    else label = `${(sz / 1048576).toFixed(1)} MB`;
    panelToast(`📋 設計書ソースをコピー (${label})`, { kind: "ok" });
  } catch (e) {
    panelToast("⚠ クリップボードへのコピーに失敗しました: " + String(e), { kind: "err" });
  }
}

function downloadDesignSource() {
  if (!lastDesign) { panelToast("📭 まだ設計書が未生成です", { kind: "warn" }); return; }
  const fmt = lastDesign.format || "markdown";
  // v2.80.0: Excel 形式は SpreadsheetML XML (Excel 2003 XML) のため、拡張子を .xls → .xml に変更。
  // .xls だと Excel が「ファイル形式と拡張子が一致しません」警告を出していた事象を解消。
  // Excel は .xml を「XML Spreadsheet」として自動認識し、警告なしで開く。
  const extMap = { markdown: "md", html: "html", csv: "csv", tsv: "tsv", excel: "xml", xls: "xml" };
  const mimeMap = {
    markdown: "text/markdown;charset=utf-8",
    html: "text/html;charset=utf-8",
    csv: "text/csv;charset=utf-8",
    tsv: "text/tab-separated-values;charset=utf-8",
    // SpreadsheetML XML の正式 MIME。Excel が直接開ける
    excel: "application/xml;charset=utf-8",
    xls: "application/xml;charset=utf-8",
  };
  const ext = extMap[fmt] || "txt";
  const mime = mimeMap[fmt] || "text/plain;charset=utf-8";
  const safeName = (lastDesign.title || "design").replace(/[\\/?*[\]:"<>|]/g, "_").substring(0, 80);
  const ts = tsForFilename();

  // CSV/TSV/HTML は UTF-8 BOM を付ける (Excel が文字化けしないように)
  // Excel SpreadsheetML XML は宣言で encoding を指定済なので BOM 不要 (むしろ XML パーサが壊れる可能性)
  let body = lastDesign.source;
  if (fmt === "csv" || fmt === "tsv" || fmt === "html") {
    body = "﻿" + body;
  }
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}_${ts}.${ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  // ダウンロード完了 toast (サイズ + 形式)
  const sz = body.length;
  let label;
  if (sz < 1024) label = `${sz} B`;
  else if (sz < 1048576) label = `${(sz / 1024).toFixed(1)} KB`;
  else label = `${(sz / 1048576).toFixed(1)} MB`;
  panelToast(`📥 設計書ダウンロード: ${ext.toUpperCase()} ${label}`, { kind: "ok" });
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
  const unlock = lockBtn("btnReconnect");
  document.getElementById("orgInfo").innerHTML = `<span class="meta">⏳ セッションを再取得しています…</span>`;
  const host = await getInspectedHost();
  if (!host || !isSalesforceHost(host)) {
    document.getElementById("orgInfo").innerHTML = `<span class="pill warn">Salesforce のタブではありません</span>`;
    unlock();
    return;
  }
  state.host = host;
  state.apiHost = toApiHost(host);
  const session = await getSessionId(host);
  if (!session) {
    document.getElementById("orgInfo").innerHTML = `<span class="pill err">sid Cookie の取得に失敗しました</span>`;
    unlock();
    return;
  }
  const prevOrgId = state.orgId;
  state.sid = session.sid;
  state.orgId = parseOrgIdFromSid(state.sid);
  // Org が変わった場合は Picker キャッシュを無効化 + Inspector 履歴クリア
  if (prevOrgId && prevOrgId !== state.orgId) {
    invalidatePickerCache(`Org change ${prevOrgId} → ${state.orgId}`);
    inspectHistory.length = 0;
    updateInspectBackButton();
    console.log("[DevToolsNext] Inspector history cleared (Org change)");
  }
  // sandbox / developer / production の判定 + 色付きバッジ
  const h = state.apiHost || "";
  let envLabel = "PROD", envClass = "env-prod";
  if (/\.sandbox\./.test(h)) { envLabel = "SBX"; envClass = "env-sbx"; }
  else if (/\.develop\./.test(h) || /\.scratch\./.test(h)) { envLabel = "DEV"; envClass = "env-dev"; }
  document.getElementById("orgInfo").innerHTML =
    `<span class="env-badge ${envClass}" title="${envLabel === "SBX" ? "Sandbox" : envLabel === "DEV" ? "Developer/Scratch" : "Production (本番)"}">${envLabel}</span> ` +
    `Org: ${escape(state.orgId)} @ ${escape(state.apiHost)}`;
  unlock();
  // v2.6.0: 接続成功後に sObject 一覧を datalist に流し込み (オブジェクト入力欄の補完用)
  refreshSObjectDatalist();
}

// v2.6.0: 全オブジェクト入力欄 (#exObj, #apiObj, #descObj, #designObj) で list="dl-sobjects" を参照
// describe global の結果をキャッシュして option を生成、再接続時のみ更新
let _datalistObjsCached = null;
async function refreshSObjectDatalist() {
  if (!state.sid || !state.host) return;
  const dl = document.getElementById("dl-sobjects");
  if (!dl) return;
  try {
    if (!_datalistObjsCached) {
      const r = await sfFetch({ host: state.host, sid: state.sid,
        path: `/services/data/v${state.apiVersion}/sobjects/` });
      if (!r.ok || !r.data || !Array.isArray(r.data.sobjects)) return;
      _datalistObjsCached = r.data.sobjects
        .filter((s) => s.queryable)
        .map((s) => ({ name: s.name, label: s.label }));
    }
    // option 形式: value=API 名 / label="API 名 — ラベル" でラベルも補完候補に表示
    dl.innerHTML = _datalistObjsCached
      .map((s) => `<option value="${escape(s.name)}" label="${escape(s.label || s.name)}">`)
      .join("");
  } catch (e) { console.warn("[DevToolsNext] datalist refresh failed:", e); }
}

// レースガード: 連続実行された時、古いリクエストの結果を捨てる
let soqlRunId = 0;
async function doSoql() {
  if (!state.sid) return;
  const myId = ++soqlRunId;
  const soql = document.getElementById("soqlText").value.trim();
  const tooling = document.getElementById("useTooling").checked;
  const meta = document.getElementById("soqlMeta");
  const runBtn = document.getElementById("btnRunSoql");
  if (!soql) {
    meta.innerHTML = `<span class="pill warn">⚠ SOQL クエリを入力してください</span>`;
    return;
  }
  meta.textContent = `⏳ SOQL を実行しています… #${myId}`;
  meta.classList.add("loading-pulse");
  // 実行中はボタン無効化 (二重クリック防止)
  if (runBtn) { runBtn.disabled = true; runBtn.style.opacity = "0.6"; }
  const t0 = performance.now();
  const r = await runSoql({ host: state.host, sid: state.sid, soql, apiVersion: state.apiVersion, tooling });
  const dt = Math.round(performance.now() - t0);
  if (myId !== soqlRunId) {
    // 古いリクエスト → UI 更新せず破棄
    console.log(`[DevToolsNext] discard stale SOQL result #${myId} (latest=${soqlRunId})`);
    return;
  }
  if (runBtn) { runBtn.disabled = false; runBtn.style.opacity = ""; }
  if (!r.ok) {
    displayApiError(meta, r.status, r.data, "SOQL 実行");
    document.getElementById("soqlResult").innerHTML = `<pre class="code">${escape(JSON.stringify(r.data, null, 2))}</pre>`;
    state.lastRecords = null;
    return;
  }
  const recs = (r.data && r.data.records) || [];
  state.lastRecords = recs;
  meta.classList.remove("loading-pulse");
  meta.innerHTML = `<span class="pill ok">取得 ${recs.length} 件</span> <span class="pill" title="クエリにヒットした総件数">合計 ${r.data.totalSize ?? recs.length} 件</span> ${dt}ms${tooling ? ' <span class="pill warn" title="Tooling API で実行">Tooling</span>' : ""}`;
  document.getElementById("soqlResult").innerHTML = recordsTable(recs);
}

// 結果テーブルが列ソート中なら、その並びを state.lastRecords に反映してから返す
function getOrderedRecordsForExport() {
  const recs = state.lastRecords || [];
  if (!recs.length) return recs;
  const sortedTh = document.querySelector("#soqlResult th.sortable[data-sort-dir]");
  if (!sortedTh) return recs;
  const dir = sortedTh.dataset.sortDir === "desc" ? -1 : 1;
  const col = sortedTh.dataset.col;
  if (!col) return recs;
  const sorted = recs.slice().sort((a, b) => {
    const av = a[col] == null ? "" : String(a[col]);
    const bv = b[col] == null ? "" : String(b[col]);
    const an = parseFloat(av), bn = parseFloat(bv);
    if (!isNaN(an) && !isNaN(bn) && /^-?\d+(\.\d+)?$/.test(av.trim()) && /^-?\d+(\.\d+)?$/.test(bv.trim())) {
      return (an - bn) * dir;
    }
    return av.localeCompare(bv, "ja") * dir;
  });
  return sorted;
}

function exportCsv() {
  if (!state.lastRecords || !state.lastRecords.length) { panelToast("📭 エクスポート対象がありません", { kind: "warn" }); return; }
  const ordered = getOrderedRecordsForExport();
  const csv = recordsToCsv(ordered);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `soql-${tsForFilename()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  const sortedTh = document.querySelector("#soqlResult th.sortable[data-sort-dir]");
  if (sortedTh) panelToast(`📥 CSV ${ordered.length} 行 (${sortedTh.dataset.col} ${sortedTh.dataset.sortDir} ソート反映)`, { kind: "ok" });
}

async function copyCsvToClipboard() {
  if (!state.lastRecords || !state.lastRecords.length) { panelToast("📭 コピー対象がありません", { kind: "warn" }); return; }
  try {
    const ordered = getOrderedRecordsForExport();
    const csv = recordsToCsv(ordered);
    await navigator.clipboard.writeText(csv);
    const sortedTh = document.querySelector("#soqlResult th.sortable[data-sort-dir]");
    const hint = sortedTh ? ` (${sortedTh.dataset.col} ${sortedTh.dataset.sortDir} ソート反映)` : "";
    panelToast(`📋 CSV ${ordered.length} 行をクリップボードへ${hint}`, { kind: "ok" });
  } catch (e) {
    panelToast("❌ コピー失敗: " + (e.message || e), { kind: "err" });
  }
}

async function doDescribe() {
  if (!state.sid) return;
  const obj = document.getElementById("descObj").value.trim();
  const runBtn = document.getElementById("btnDescribe");
  if (!obj) {
    document.getElementById("describeResult").innerHTML = `<div class="meta" style="padding:8px"><span class="pill warn">⚠ オブジェクトの API 名を入力してください</span></div>`;
    return;
  }
  if (runBtn) { runBtn.disabled = true; runBtn.style.opacity = "0.6"; }
  const r = await sfFetch({
    host: state.host, sid: state.sid,
    path: `/services/data/v${state.apiVersion}/sobjects/${encodeURIComponent(obj)}/describe`,
  });
  if (runBtn) { runBtn.disabled = false; runBtn.style.opacity = ""; }
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
  meta.textContent = `📡 送信中… #${myId}`;
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
  const unlock = lockBtn("btnMetadata");
  const type = document.getElementById("mdType").value;
  const path = `/services/data/v${state.apiVersion}/tooling/query/?q=` +
    encodeURIComponent(`SELECT Id, Name, NamespacePrefix, ManageableState, CreatedDate, LastModifiedDate FROM ${type} ORDER BY LastModifiedDate DESC LIMIT 200`);
  const r = await sfFetch({ host: state.host, sid: state.sid, path });
  unlock();
  if (!r.ok) {
    const elem = document.getElementById("metadataResult");
    const m = document.createElement("div");
    displayApiError(m, r.status, r.data, `Metadata ${type}`);
    elem.innerHTML = ""; elem.appendChild(m);
    return;
  }
  // 列名を業務用語に変換
  const stateMap = { "unmanaged": "未管理", "installedEditable": "インストール済 (編集可)", "installedReadOnly": "インストール済 (読取専用)", "deprecated": "非推奨", "deleted": "削除済" };
  const records = (r.data.records || []).map((rec) => ({
    "Id": rec.Id,
    "API 名": rec.Name,
    "ネームスペース": rec.NamespacePrefix || "(なし)",
    "管理状態": stateMap[rec.ManageableState] || rec.ManageableState || "",
    "作成日": rec.CreatedDate,
    "更新日": rec.LastModifiedDate,
  }));
  document.getElementById("metadataResult").innerHTML = recordsTable(records);
}

async function doFetchLogs() {
  if (!state.sid) return;
  const unlock = lockBtn("btnFetchLogs");
  const q = `SELECT Id, LogUser.Name, Status, Application, Operation, LogLength, DurationMilliseconds, StartTime FROM ApexLog ORDER BY StartTime DESC LIMIT 20`;
  const r = await runSoql({ host: state.host, sid: state.sid, soql: q, apiVersion: state.apiVersion, tooling: true });
  unlock();
  if (!r.ok) {
    const elem = document.getElementById("logsResult");
    const m = document.createElement("div");
    displayApiError(m, r.status, r.data, "Apex ログ取得");
    elem.innerHTML = ""; elem.appendChild(m);
    return;
  }
  // ApexLog の列名を業務用語に変換
  const statusMap = { "Success": "✓ 成功", "Error": "✗ エラー", "Warning": "⚠ 警告" };
  const records = (r.data.records || []).map((rec) => ({
    "Id": rec.Id,
    "実行ユーザ": rec.LogUser ? rec.LogUser.Name : "",
    "ステータス": statusMap[rec.Status] || rec.Status || "",
    "アプリ": rec.Application || "",
    "操作": rec.Operation || "",
    "ログサイズ": rec.LogLength != null ? rec.LogLength.toLocaleString() + " バイト" : "",
    "実行時間": rec.DurationMilliseconds != null ? rec.DurationMilliseconds + " ms" : "",
    "開始日時": rec.StartTime,
  }));
  document.getElementById("logsResult").innerHTML = recordsTable(records);
}

async function doEnableDebug() {
  if (!state.sid) return;
  // ユーザー自身の TraceFlag を 60 分有効化（最低限の実装）
  const userId = state.orgId; // フォールバック。実際は userinfo を引きたいが今は orgId 表示用なので注意
  alert("DebugLevel / TraceFlag の作成はサンプル実装です。Setup → Debug Logs から手動で設定することもできます。");
}

// (旧 doLimits は新ダッシュボード版に置換済 — 下部参照)

function recordsTable(records) {
  if (!records || !records.length) return `<div class="meta" style="padding:16px;text-align:center;font-size:12px">📭 該当するデータはありません</div>`;
  const cols = new Set();
  records.forEach((r) => Object.keys(r).forEach((k) => k !== "attributes" && cols.add(k)));
  const headers = Array.from(cols);
  const head = `<tr>${headers.map((h) => `<th class="sortable" data-col="${escape(h)}" title="クリックで ${escape(h)} 列をソート">${escape(h)}</th>`).join("")}</tr>`;
  // SF ID 形式判定 (15/18桁 英数字、ただし純数値や URL は除外)
  const isLikelyId = (v) => /^[a-zA-Z0-9]{15,18}$/.test(v) && /[a-zA-Z]/.test(v) && /\d/.test(v);
  const rows = records.map((r) =>
    `<tr>${headers.map((h) => {
      const raw = r[h];
      const val = stringify(raw);
      const idCell = isLikelyId(val);
      const isNested = raw && typeof raw === "object" && raw.attributes;
      const classes = "cell-copyable" + (idCell ? " cell-id" : "") + (isNested ? " cell-nested" : "");
      // ネストセルは tooltip に整形 JSON プレビュー (max 280 文字)
      let tip;
      if (idCell) tip = "クリックで Inspector に表示します  /  ダブルクリックでクリップボードにコピーします";
      else if (isNested) {
        const pretty = JSON.stringify(raw, null, 2);
        const preview = pretty.length > 280 ? pretty.substring(0, 280) + "\n…(以降省略)" : pretty;
        tip = `ダブルクリックで raw JSON をコピーできます:\n${preview}`;
      } else {
        // 通常セル: 長文 (80 文字超) なら値の先頭 280 文字を tooltip に表示
        if (val && val.length > 80) {
          const preview = val.length > 280 ? val.substring(0, 280) + "\n…(以降省略)" : val;
          tip = `ダブルクリックで全文をコピーできます:\n${preview}`;
        } else {
          tip = "ダブルクリックでコピーできます";
        }
      }
      // ネストセルは raw JSON を data-raw-value に格納 → dblclick で原データをコピー
      const dataAttrs = (idCell ? ` data-record-id="${escape(val)}"` : "")
        + (isNested ? ` data-raw-value="${escape(JSON.stringify(raw))}"` : "");
      // 長文セルは truncate + 視覚的な切詰インジケータ「…」付き表示 (CSS max-width で省略)
      const cellContent = (val && val.length > 120) ? escape(val.substring(0, 120)) + '<span style="opacity:0.5">…</span>' : escape(val);
      return `<td title="${escape(tip)}" class="${classes}"${dataAttrs}>${cellContent}</td>`;
    }).join("")}</tr>`
  ).join("");
  // 結果を遅延でセル dblclick + th click ソートリスナーをバインド
  setTimeout(() => {
    document.querySelectorAll("td.cell-copyable:not([data-copy-bound])").forEach((td) => {
      td.dataset.copyBound = "true";
      td.addEventListener("dblclick", () => {
        // ネストセルは raw JSON 優先 (平坦化表示の「Name [Id]」より原データが有用)
        const txt = td.dataset.rawValue || td.textContent;
        navigator.clipboard.writeText(txt).then(() => panelToast(`📋 クリップボードにコピーしました: ${txt.substring(0, 40)}${txt.length > 40 ? "…" : ""}`, { kind: "ok" }));
      });
    });
    // ID セルを single-click で Inspector ジャンプ (dblclick と競合しないよう遅延判定)
    document.querySelectorAll("td.cell-id:not([data-id-bound])").forEach((td) => {
      td.dataset.idBound = "true";
      let clickTimer = null;
      td.addEventListener("click", (e) => {
        // dblclick との競合を避けるため 220ms 待機
        if (clickTimer) return;
        clickTimer = setTimeout(() => {
          clickTimer = null;
          const id = td.dataset.recordId;
          if (!id) return;
          document.getElementById("inspectRef").value = id;
          switchToView("inspector");
          doInspect();
          panelToast(`🔍 ${id} を Inspector で開きます`, { kind: "ok" });
        }, 220);
      });
      td.addEventListener("dblclick", () => {
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
      });
    });
    document.querySelectorAll("th.sortable:not([data-sort-bound])").forEach((th) => {
      th.dataset.sortBound = "true";
      th.addEventListener("click", () => sortTableByTh(th));
    });
  }, 0);
  return `<table>${head}${rows}</table>`;
}

// th クリックで in-place ソート (asc → desc → unsort トグル)
function sortTableByTh(th) {
  const table = th.closest("table");
  if (!table) return;
  const idx = Array.prototype.indexOf.call(th.parentElement.children, th);
  const tbody = table.tBodies[0] || table;
  // 既存の同一 th sort 状態をトグル
  const cur = th.dataset.sortDir || "";
  const next = cur === "asc" ? "desc" : (cur === "desc" ? "" : "asc");
  table.querySelectorAll("th.sortable").forEach((other) => { delete other.dataset.sortDir; });
  if (next) th.dataset.sortDir = next;
  // 元の順序を保存 (初回 sort 時のみ)
  if (!tbody.dataset.originalOrder) {
    tbody.dataset.originalOrder = "true";
    Array.from(tbody.rows).forEach((tr, i) => { tr.dataset.origIdx = String(i); });
  }
  const rows = Array.from(tbody.querySelectorAll("tr")).filter((tr) => tr.cells.length > idx && !tr.querySelector("th"));
  if (!next) {
    // 元順に戻す
    rows.sort((a, b) => (parseInt(a.dataset.origIdx, 10) || 0) - (parseInt(b.dataset.origIdx, 10) || 0));
  } else {
    const dir = next === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const av = a.cells[idx] ? a.cells[idx].textContent : "";
      const bv = b.cells[idx] ? b.cells[idx].textContent : "";
      // 数値判定
      const an = parseFloat(av), bn = parseFloat(bv);
      if (!isNaN(an) && !isNaN(bn) && /^-?\d+(\.\d+)?$/.test(av.trim()) && /^-?\d+(\.\d+)?$/.test(bv.trim())) {
        return (an - bn) * dir;
      }
      return av.localeCompare(bv, "ja") * dir;
    });
  }
  rows.forEach((r) => tbody.appendChild(r));
}
function stringify(v) {
  if (v == null) return "";
  if (typeof v === "object") {
    // SF ネストリレーション (例 Account.Owner) は { attributes:{...}, Name:"...", ... } で来る
    // attributes を除いた表示可能項目を Name / Subject / Id 優先で平坦化
    if (v.attributes && typeof v.attributes === "object") {
      const fields = Object.keys(v).filter((k) => k !== "attributes");
      // 子レコード集合 (totalSize/done/records) の場合は件数表示
      if (v.records && Array.isArray(v.records)) {
        return `[${v.records.length} 件のサブクエリ]`;
      }
      // 代表項目: Name / Subject / Title / DeveloperName / Id の順に優先
      const prefer = ["Name", "Subject", "Title", "DeveloperName", "MasterLabel", "FullName"];
      for (const p of prefer) {
        if (fields.includes(p) && v[p] != null) {
          // Id も併記 (短縮)
          const id = fields.includes("Id") && v.Id ? ` [${String(v.Id).substring(0, 18)}]` : "";
          return `${stringify(v[p])}${id}`;
        }
      }
      // 該当なしなら最初の非 attributes キーを使う
      if (fields.length) return `${fields[0]}=${stringify(v[fields[0]])}`;
      return "{}";
    }
    return JSON.stringify(v);
  }
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
      text: "セッションの有効期限が切れています。Salesforce へログインし直し、ポップアップの ⟳ ボタンで再接続してください (Lightning ドメインの sid は REST から使えない場合があります)。",
      links: [
        { label: "🔧 セッション設定を開く", path: "/lightning/setup/SecuritySession/home" },
        { label: "📜 ログイン履歴を確認する", action: "navView", view: "login" },
      ],
    };
  } else if (status === 403) {
    hint = {
      text: "現在のユーザに権限がありません。プロファイル / 権限セットまたは OWD (組織既定の共有設定) で対象オブジェクトのアクセス権をご確認ください。",
      links: [
        { label: "👤 プロファイル一覧を開く", path: "/lightning/setup/EnhancedProfiles/home" },
        { label: "🔑 権限セット一覧を開く", path: "/lightning/setup/PermSets/home" },
        { label: "🔓 共有設定 (OWD) を開く", path: "/lightning/setup/SecuritySharing/home" },
      ],
    };
  } else if (status === 404) {
    hint = {
      text: "指定された名前 / Id が見つかりません。タイプミスがないかを確認するか、🔍 候補リストから選択してください。",
      links: [
        { label: "📋 オブジェクトマネージャを開く", path: "/lightning/setup/ObjectManager/home" },
      ],
    };
  } else if (status === 400) {
    hint = {
      text: "リクエストの内容が不正です。SOQL の構文・項目名・参照可能性をご確認ください (Describe ビューから対象オブジェクトの項目を確認できます)。",
      links: [
        { label: "📖 Describe ビューで項目を確認する", action: "navView", view: "describe" },
      ],
    };
  } else if (status === 429) {
    hint = {
      text: "API コール数の上限に達しました。Limits ビューから現在の使用状況をご確認ください。",
      links: [
        { label: "📊 Limits ダッシュボードで使用状況を確認する", action: "navView", view: "limits" },
      ],
    };
  } else if (status === 500 || status === 503) {
    hint = {
      text: "Salesforce サーバ側で問題が発生しています。しばらくお待ちいただいた後、再度お試しください。",
      links: [
        { label: "🌐 Salesforce Trust (障害情報) を確認する", url: "https://status.salesforce.com/" },
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
  const runBtn = document.getElementById("btnRunApex");
  if (!code.trim()) {
    meta.innerHTML = `<span class="pill warn">⚠ Apex コードを入力してください</span>`;
    return;
  }
  const myId = ++apexRunId;
  meta.innerHTML = `<span class="pill" style="background:var(--bg3)">⚡ 匿名 Apex を実行しています… #${myId}</span>`;
  out.textContent = "";
  // 実行中はボタンを無効化 (二重クリック防止)
  if (runBtn) { runBtn.disabled = true; runBtn.style.opacity = "0.6"; }

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
    if (runBtn) { runBtn.disabled = false; runBtn.style.opacity = ""; }
    return;
  }

  const d = r.data || {};
  const compiled = d.compiled === true;
  const success = d.success === true;
  const statusClass = success ? "ok" : (compiled ? "warn" : "err");
  const statusLabel = success ? "✓ 成功 (Success)" : (compiled ? "⚠ 実行時エラー (Runtime Error)" : "❌ コンパイルエラー (Compile Error)");
  let summary = `<span class="pill ${statusClass}">${statusLabel}</span> ${dt}ms`;
  if (d.line >= 0 && d.column >= 0 && !success) {
    summary += ` <span class="pill warn">エラー位置: ${d.line} 行目 / ${d.column} 列目</span>`;
  }
  if (d.compileProblem) summary += `<br/><b>コンパイルエラー内容:</b> ${escape(d.compileProblem)}`;
  if (d.exceptionMessage) summary += `<br/><b>例外メッセージ:</b> ${escape(d.exceptionMessage)}`;
  if (d.exceptionStackTrace) summary += `<br/><span class="meta">スタックトレース: ${escape(d.exceptionStackTrace)}</span>`;
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
      } else {
        // Debug Log 取得失敗時 (削除済 / 権限不足 / Trace flag 未設定) は分かりやすく
        const hint = logFetch.status === 404
          ? "ログが削除済か期限切れの可能性があります"
          : logFetch.status === 403
          ? "Apex ログの参照権限が不足しています (Setup → ユーザ → 権限セットをご確認ください)"
          : `HTTP ${logFetch.status}`;
        logBody = `⚠ Debug ログの取得に失敗しました: ${hint}\n` +
          `Trace Flag が未設定の可能性があります。Setup → Debug Logs から対象ユーザを追加してください。\n` +
          `(Apex の実行自体は上記の通り成功していますが、ログ本文の取得は別 API のため失敗することがあります)`;
      }
    }
  }
  out.textContent = (success ? "(コンパイル・実行に成功しました)\n\n" : "") + logBody;
  // Apex 結果の行数/文字数を meta に追記 (debug log の規模感を可視化)
  // ヘッダーのみ (success="(コンパイル & 実行 OK)\n\n") の場合はスキップ
  const txt = logBody;
  if (txt && txt.length > 0) {
    const lines = (txt.match(/\n/g) || []).length + 1;
    const sizeBytes = txt.length;
    const sizeKb = sizeBytes / 1024;
    let sizeLabel, pillClass;
    if (sizeBytes < 1024) { sizeLabel = `${sizeBytes} B`; pillClass = ""; }
    else if (sizeKb < 1024) { sizeLabel = `${sizeKb.toFixed(1)} KB`; pillClass = sizeKb >= 500 ? "warn" : ""; }
    else { sizeLabel = `${(sizeKb / 1024).toFixed(1)} MB`; pillClass = "err"; }
    const cur = meta.innerHTML;
    meta.innerHTML = `${cur} <span class="pill ${pillClass}" title="Debug ログのサイズ${sizeBytes > 1048576 ? ' (1 MB 超のため、スクロールが重くなる可能性があります)' : ''}">${lines.toLocaleString()} 行 / ${sizeLabel}</span>`;
  }
  // v2.77.0: runBtn は 2618 行で同関数スコープに既に const 宣言済み。再宣言で SyntaxError が出ていたため削除し既存変数を再利用
  // 実行中フラグを解除 (ボタン再有効化)
  if (runBtn) { runBtn.disabled = false; runBtn.style.opacity = ""; }
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
  const unlock = lockBtn("btnFetchLogin");
  const limit = parseInt(document.getElementById("loginLimit").value, 10) || 50;
  const statusFilter = document.getElementById("loginStatus").value;
  const meta = document.getElementById("loginMeta");
  meta.textContent = "⏳ ログイン履歴を取得しています…";
  meta.classList.add("loading-pulse");

  let where = "";
  if (statusFilter === "Success") where = "WHERE Status = 'Success' ";
  else if (statusFilter === "Failed") where = "WHERE Status != 'Success' ";

  const soql = `SELECT Id, UserId, LoginTime, LoginType, Application, Status, ApiType, ApiVersion, ClientVersion, Browser, Platform, SourceIp ${where}ORDER BY LoginTime DESC LIMIT ${limit}`;

  const t0 = performance.now();
  const r = await runSoql({ host: state.host, sid: state.sid, soql, apiVersion: state.apiVersion });
  const dt = Math.round(performance.now() - t0);

  if (!r.ok) {
    unlock();
    displayApiError(meta, r.status, r.data, "ログイン履歴の取得");
    document.getElementById("loginResult").innerHTML = `<pre class="code">${escape(JSON.stringify(r.data, null, 2))}</pre>`;
    state.lastLoginRecords = null;
    return;
  }
  unlock();
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
  meta.classList.remove("loading-pulse");
  meta.innerHTML = `<span class="pill ok">${recs.length} 件</span> ` +
    `<span class="pill ok">Success ${successCount}</span> ` +
    `<span class="pill err">失敗 ${failedCount} 件</span> / ${dt}ms`;
  document.getElementById("loginResult").innerHTML = loginHistoryTable(rows);
}

function loginHistoryTable(rows) {
  if (!rows.length) return `<div class="meta" style="padding:8px">📭 該当するログイン履歴はありません</div>`;
  // 列名を業務用語に変換するマッピング (内部キーは SF フィールド名のまま)
  const colLabels = {
    LoginTime: "ログイン日時",
    LoginType: "ログイン種別",
    Application: "アプリ",
    Status: "ステータス",
    ApiType: "API 種別",
    ApiVersion: "API バージョン",
    ClientVersion: "クライアントバージョン",
    Browser: "ブラウザ",
    Platform: "OS / プラットフォーム",
    SourceIp: "送信元 IP アドレス",
    UserId: "ユーザ ID",
  };
  const headers = Object.keys(colLabels);
  const head = `<tr>${headers.map((h) => `<th title="${escape(h)} (Salesforce API 名)">${escape(colLabels[h])}</th>`).join("")}</tr>`;
  const body = rows.map((r) => {
    const statusOk = (r.Status || "").startsWith("Success");
    const statusLabel = statusOk ? `✓ ${escape(r.Status)}` : `✗ ${escape(r.Status)}`;
    const statusCell = `<span class="pill ${statusOk ? "ok" : "err"}">${statusLabel}</span>`;
    // ログイン日時を YYYY-MM-DD HH:mm に整形
    let timeDisplay = stringify(r.LoginTime);
    const m = String(r.LoginTime || "").match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    if (m) timeDisplay = `${m[1]} ${m[2]}`;
    return `<tr>${headers.map((h) => {
      if (h === "Status") return `<td>${statusCell}</td>`;
      if (h === "LoginTime") return `<td>${escape(timeDisplay)}</td>`;
      return `<td>${escape(stringify(r[h]))}</td>`;
    }).join("")}</tr>`;
  }).join("");
  return `<table>${head}${body}</table>`;
}

function exportLoginCsv() {
  if (!state.lastLoginRecords || !state.lastLoginRecords.length) { panelToast("📭 ログイン履歴が未取得です。先に「取得」ボタンをクリックしてください", { kind: "warn" }); return; }
  // LoginTime を YYYY-MM-DD HH:mm 整形 (Excel で読みやすく)
  const formatted = state.lastLoginRecords.map((r) => {
    const out = { ...r };
    if (out.LoginTime && typeof out.LoginTime === "string") {
      const m = out.LoginTime.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
      if (m) out.LoginTime = `${m[1]} ${m[2]}`;
    }
    return out;
  });
  const csv = recordsToCsv(formatted);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `login-history-${tsForFilename()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  const sz = csv.length;
  const label = sz < 1024 ? `${sz} B` : `${(sz / 1024).toFixed(1)} KB`;
  panelToast(`📥 ログイン履歴 CSV をダウンロードしました (${state.lastLoginRecords.length} 件 / ${label})`, { kind: "ok" });
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
