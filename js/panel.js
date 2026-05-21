// DevTools パネル本体。inspectedWindow から URL を取って sid を引く。
import {
  isSalesforceHost, toApiHost, getSessionId, parseOrgIdFromSid,
  runSoql, sfFetch, getLimits, recordsToCsv, to18CharId, getUserInfo,
} from "./sf-api.js";
import { generateDesign, markdownToHtml } from "./design-docs.js";
import { showPicker, invalidatePickerCache } from "./picker.js";

const state = {
  host: null,
  apiHost: null,
  sid: null,
  orgId: null,
  // v3.315.0 Phase 405: userId / isProd / envLabel / lastDescribe を初期定義に追加 (元は動的代入のみで type-discoverable 性が低かった、code reader が把握しやすいよう明示化)
  userId: null,         // Phase 161 で動的代入
  isProd: false,        // Phase 289/382 で env 判定後に代入
  envLabel: null,       // Phase 289/382 で env 判定後に代入
  lastDescribe: null,   // Phase 275 で動的代入 (設計書 MD コピー用)
  // v3.318.0 Phase 408: SF API バージョン default = v62.0 (Winter '26 対応、2026 年 1 月時点)
  // ユーザーが ⚙️ 設定で変更可能 (info-apiver select)。SF は年 3 回 (Winter/Spring/Summer) リリースで API バージョン上がる
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
console.log("[DevToolsNext] panel.js module loaded");
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
    loadSharedSoqlHistory();
    loadInspectHistory();
    loadApexHistory();
    loadRestHistory();
    loadMdType();
    loadSoqlTooling();
    loadApexFetchLog();
    loadSoqlDraft();
    loadApexDraft();
    loadRestBodyDraft();
    // v3.134.0 Phase 223 (Team H): 最近使ったオブジェクト / レコード ID をロード
    await loadRecentObjects();
    refreshRecordIdDatalist();
    // v3.46.0: chrome.storage.local 変更を監視して、別画面/mini-panel での履歴更新を即時反映
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes[SHARED_SOQL_HISTORY_KEY]) {
          renderSharedSoqlHistory(changes[SHARED_SOQL_HISTORY_KEY].newValue || []);
        }
        if (area === "local" && changes[APEX_HISTORY_KEY]) {
          renderApexHistory(changes[APEX_HISTORY_KEY].newValue || []);
        }
        if (area === "local" && changes[REST_HISTORY_KEY]) {
          renderRestHistory(changes[REST_HISTORY_KEY].newValue || []);
        }
      });
    }
    initHeader();
    attachAllPickers();
    setupDesignPicker();
    setupDesignTypeFilter();
    // v3.158.0 Phase 248: 設計書「直前生成」chip をロード
    renderDesignLastChip();
    // 検索系入力欄に ✕ クリア共通化
    // v3.89.0: csFilter は Phase 179 で削除 (変更セット view は v2.88.0 以降 HTML 非実装)
    ["inspectFilter", "exFieldFilter", "exObj", "descObj", "apiObj", "inspectRef"].forEach(attachClearButton);
    // v3.143.0 Phase 233: URL クエリ ?view=xxx で起動時に該当ビューを開く (popup の admin/search 直接導線)
    // sfdtLastView より優先 (明示的なナビ指定)
    let initialViewFromQuery = null;
    let initialObjFromQuery = null;
    try {
      const params = new URLSearchParams(window.location.search);
      const v = params.get("view");
      if (v && document.querySelector(`.view[data-view="${v}"]`)) {
        initialViewFromQuery = v;
      }
      // v3.186.0 Phase 276: ?obj=<API名> 対応 — describe ビュー起動時にオブジェクト名を自動入力 + 接続済みなら自動実行
      const objParam = params.get("obj");
      if (objParam) initialObjFromQuery = objParam;
      // v3.188.0 Phase 278: ?id=<recordId> 対応 — inspector ビュー起動時にレコード ID を自動入力 + 接続済みなら自動取得
      var initialIdFromQuery = params.get("id");
      window._sfdtInitialIdFromQuery = initialIdFromQuery || null;
      // v3.189.0 Phase 279: ?q=<SOQL> 対応 — soql ビュー起動時にクエリを自動投入 + 接続済みなら自動実行
      var initialQFromQuery = params.get("q");
      window._sfdtInitialQFromQuery = initialQFromQuery || null;
      // v3.191.0 Phase 281: ?kw=<検索ワード>&scope=<standard|extended|all> 対応 — search ビュー起動時に検索を自動実行
      window._sfdtInitialKwFromQuery = params.get("kw") || null;
      window._sfdtInitialScopeFromQuery = params.get("scope") || null;
      // v3.193.0 Phase 283: ?type=<メタデータ型> 対応 — metadata ビュー起動時に型を選択 + 自動実行
      window._sfdtInitialTypeFromQuery = params.get("type") || null;
      // v3.194.0 Phase 284: ?target=&format= 対応 — design ビュー起動時に種類/対象/形式を投入 + 自動生成
      window._sfdtInitialTargetFromQuery = params.get("target") || null;
      window._sfdtInitialFormatFromQuery = params.get("format") || null;
      // v3.195.0 Phase 285: ?method=&path=&body= 対応 — rest ビュー起動時に投入 + GET なら自動実行
      window._sfdtInitialMethodFromQuery = params.get("method") || null;
      window._sfdtInitialPathFromQuery = params.get("path") || null;
      window._sfdtInitialBodyFromQuery = params.get("body") || null;
      // v3.205.0 Phase 295: ?code= 対応 — apex ビュー起動時にコード投入 (auto-fire 無効、ユーザー確認後手動実行)
      window._sfdtInitialCodeFromQuery = params.get("code") || null;
      // v3.207.0 Phase 297: ?limit=&status= 対応 — login ビュー起動時に件数/ステータス投入 + 自動取得
      window._sfdtInitialLimitFromQuery = params.get("limit") || null;
      window._sfdtInitialStatusFromQuery = params.get("status") || null;
      // v3.237.0 Phase 327: ?period= 対応 (1/7/30) — login ビューの期間フィルタも URL クエリ共有
      window._sfdtInitialPeriodFromQuery = params.get("period") || null;
      // v3.208.0 Phase 298: ?op=&apiObj=&apiId= 対応 — apiurl ビュー起動時に投入 + URL ビルド自動実行
      window._sfdtInitialOpFromQuery = params.get("op") || null;
      window._sfdtInitialApiObjFromQuery = params.get("apiObj") || null;
      window._sfdtInitialApiIdFromQuery = params.get("apiId") || null;
    } catch {}
    // v2.93.0: リフレッシュ時の直前 view 復元 (ユーザー要望「リフレッシュしても前のページ状態を残して」)
    try {
      if (initialViewFromQuery) {
        switchToView(initialViewFromQuery);
      } else {
        const { sfdtLastView } = await chrome.storage.local.get("sfdtLastView");
        if (sfdtLastView && sfdtLastView !== "home" && document.querySelector(`.view[data-view="${sfdtLastView}"]`)) {
          switchToView(sfdtLastView);
        }
      }
    } catch {}
    // v3.186.0 Phase 276: ?obj= が指定されかつ describe view なら、入力欄に投入 + 接続済みなら自動実行
    if (initialObjFromQuery && initialViewFromQuery === "describe") {
      const descInp = document.getElementById("descObj");
      if (descInp) {
        descInp.value = initialObjFromQuery;
        // 接続後 describe 実行 (sid を待つ)
        const tryRun = () => {
          if (state.sid) {
            try { doDescribe(); } catch {}
            return true;
          }
          return false;
        };
        if (!tryRun()) {
          // sid 未取得 — 接続完了後リトライ (最大 5 秒)
          let waited = 0;
          const iv = setInterval(() => {
            waited += 250;
            if (tryRun() || waited >= 5000) clearInterval(iv);
          }, 250);
        }
      }
    }
    // v3.208.0 Phase 298: ?op=&apiObj=&apiId= が指定されかつ apiurl view なら投入 + URL ビルド自動実行 (実行はしない、安全)
    if (initialViewFromQuery === "apiurl" && (window._sfdtInitialOpFromQuery || window._sfdtInitialApiObjFromQuery || window._sfdtInitialApiIdFromQuery)) {
      const opSel = document.getElementById("apiOp");
      const apiObjInp = document.getElementById("apiObj");
      const apiIdInp = document.getElementById("apiId");
      if (opSel && window._sfdtInitialOpFromQuery) {
        const op = String(window._sfdtInitialOpFromQuery);
        if (Array.from(opSel.options).some((o) => o.value === op)) opSel.value = op;
      }
      if (apiObjInp && window._sfdtInitialApiObjFromQuery) apiObjInp.value = String(window._sfdtInitialApiObjFromQuery);
      if (apiIdInp && window._sfdtInitialApiIdFromQuery) apiIdInp.value = String(window._sfdtInitialApiIdFromQuery);
      // URL ビルドのみ自動実行 (▶ 実行は手動)
      try { const btn = document.getElementById("btnApiBuild"); if (btn) btn.click(); } catch {}
    }
    // v3.207.0 Phase 297: ?limit=&status= が指定されかつ login view なら投入 + 自動取得
    // v3.237.0 Phase 327: ?period= も対応
    if (initialViewFromQuery === "login" && (window._sfdtInitialLimitFromQuery || window._sfdtInitialStatusFromQuery || window._sfdtInitialPeriodFromQuery)) {
      const limitSel = document.getElementById("loginLimit");
      const statusSel = document.getElementById("loginStatus");
      const periodSel = document.getElementById("loginPeriod");
      if (limitSel && window._sfdtInitialLimitFromQuery) {
        const l = String(window._sfdtInitialLimitFromQuery);
        if (Array.from(limitSel.options).some((o) => o.value === l)) limitSel.value = l;
      }
      if (statusSel && window._sfdtInitialStatusFromQuery) {
        const s = String(window._sfdtInitialStatusFromQuery);
        if (Array.from(statusSel.options).some((o) => o.value === s)) statusSel.value = s;
      }
      if (periodSel && window._sfdtInitialPeriodFromQuery) {
        const p = String(window._sfdtInitialPeriodFromQuery);
        if (Array.from(periodSel.options).some((o) => o.value === p)) periodSel.value = p;
      }
      const tryRun = () => {
        if (state.sid) {
          try { const btn = document.getElementById("btnFetchLogin"); if (btn) btn.click(); } catch {}
          return true;
        }
        return false;
      };
      if (!tryRun()) {
        let waited = 0;
        const iv = setInterval(() => {
          waited += 250;
          if (tryRun() || waited >= 5000) clearInterval(iv);
        }, 250);
      }
    }
    // v3.205.0 Phase 295: ?code= が指定されかつ apex view なら投入のみ (auto-fire 無効 — 匿名 Apex は破壊的なのでユーザー確認必須)
    if (initialViewFromQuery === "apex" && window._sfdtInitialCodeFromQuery) {
      const codeVal = String(window._sfdtInitialCodeFromQuery);
      const ta = document.getElementById("apexCode");
      if (ta && codeVal) {
        ta.value = codeVal;
        // auto-fire しない。ユーザーが ▶ 実行 ボタンを手動で押す必要がある (PROD なら更に confirm が出る Phase 289)
        // meta に注意メッセージ表示
        const meta = document.getElementById("apexMeta");
        if (meta) meta.innerHTML = `<span class="pill warn">⚠ URL リンクから Apex コードを投入しました。内容を確認のうえ「▶ 実行」を押してください</span>`;
      }
    }
    // v3.195.0 Phase 285: ?method=&path=&body= が指定されかつ rest view なら投入 + GET なら自動実行 (POST/PATCH/DELETE は安全のため自動実行しない)
    if (initialViewFromQuery === "rest" && (window._sfdtInitialMethodFromQuery || window._sfdtInitialPathFromQuery || window._sfdtInitialBodyFromQuery)) {
      const restMethodSel = document.getElementById("restMethod");
      const restPathInp = document.getElementById("restPath");
      const restBodyTa = document.getElementById("restBody");
      const methodVal = (window._sfdtInitialMethodFromQuery || "GET").toUpperCase();
      if (restMethodSel && Array.from(restMethodSel.options).some((o) => o.text === methodVal)) restMethodSel.value = methodVal;
      if (restPathInp && window._sfdtInitialPathFromQuery) restPathInp.value = String(window._sfdtInitialPathFromQuery);
      if (restBodyTa && window._sfdtInitialBodyFromQuery) restBodyTa.value = String(window._sfdtInitialBodyFromQuery);
      // GET のみ自動実行 (POST/PATCH/DELETE は破壊的なので投入のみで停止)
      if (methodVal === "GET") {
        const tryRun = () => {
          if (state.sid) {
            try { const btn = document.getElementById("btnRest"); if (btn) btn.click(); } catch {}
            return true;
          }
          return false;
        };
        if (!tryRun()) {
          let waited = 0;
          const iv = setInterval(() => {
            waited += 250;
            if (tryRun() || waited >= 5000) clearInterval(iv);
          }, 250);
        }
      }
    }
    // v3.194.0 Phase 284: ?type=&target=&format= が指定されかつ design view なら、各 input を投入 + 接続済みなら自動生成
    if (initialViewFromQuery === "design" && (window._sfdtInitialTypeFromQuery || window._sfdtInitialTargetFromQuery || window._sfdtInitialFormatFromQuery)) {
      const typeSel = document.getElementById("designType");
      const objInp = document.getElementById("designObj");
      const fmtSel = document.getElementById("designFormat");
      if (typeSel && window._sfdtInitialTypeFromQuery) {
        const t = String(window._sfdtInitialTypeFromQuery);
        if (Array.from(typeSel.options).some((o) => o.value === t)) typeSel.value = t;
      }
      if (objInp && window._sfdtInitialTargetFromQuery) objInp.value = String(window._sfdtInitialTargetFromQuery);
      if (fmtSel && window._sfdtInitialFormatFromQuery) {
        const f = String(window._sfdtInitialFormatFromQuery);
        if (Array.from(fmtSel.options).some((o) => o.value === f)) fmtSel.value = f;
      }
      // 接続済みなら自動生成
      const tryRun = () => {
        if (state.sid) {
          try { const btn = document.getElementById("btnDesignGen"); if (btn) btn.click(); } catch {}
          return true;
        }
        return false;
      };
      if (!tryRun()) {
        let waited = 0;
        const iv = setInterval(() => {
          waited += 250;
          if (tryRun() || waited >= 5000) clearInterval(iv);
        }, 250);
      }
    }
    // v3.193.0 Phase 283: ?type= が指定されかつ metadata view なら、型を選択 + 接続済みなら自動実行
    if (window._sfdtInitialTypeFromQuery && initialViewFromQuery === "metadata") {
      const typeVal = String(window._sfdtInitialTypeFromQuery);
      const sel = document.getElementById("mdType");
      if (sel && Array.from(sel.options).some((o) => o.value === typeVal || o.text === typeVal)) {
        sel.value = typeVal;
        const tryRun = () => {
          if (state.sid) {
            try { const btn = document.getElementById("btnMetadata"); if (btn) btn.click(); } catch {}
            return true;
          }
          return false;
        };
        if (!tryRun()) {
          let waited = 0;
          const iv = setInterval(() => {
            waited += 250;
            if (tryRun() || waited >= 5000) clearInterval(iv);
          }, 250);
        }
      }
    }
    // v3.191.0 Phase 281: ?kw= が指定されかつ search view なら、検索ワード入力 + 接続済みなら自動実行
    if (window._sfdtInitialKwFromQuery && initialViewFromQuery === "search") {
      const kwVal = String(window._sfdtInitialKwFromQuery);
      const kwInp = document.getElementById("searchQuery");
      const scopeSel = document.getElementById("searchScope");
      if (kwInp && kwVal) {
        kwInp.value = kwVal;
        const scopeVal = window._sfdtInitialScopeFromQuery;
        if (scopeSel && scopeVal && Array.from(scopeSel.options).some((o) => o.value === scopeVal)) {
          scopeSel.value = scopeVal;
        }
        const tryRun = () => {
          if (state.sid) {
            try { doGlobalSearch(); } catch {}
            return true;
          }
          return false;
        };
        if (!tryRun()) {
          let waited = 0;
          const iv = setInterval(() => {
            waited += 250;
            if (tryRun() || waited >= 5000) clearInterval(iv);
          }, 250);
        }
      }
    }
    // v3.189.0 Phase 279: ?q= が指定されかつ soql view なら、SOQL を投入 + 接続済みなら自動実行
    if (window._sfdtInitialQFromQuery && initialViewFromQuery === "soql") {
      const qVal = String(window._sfdtInitialQFromQuery);
      const ta = document.getElementById("soqlText");
      if (ta && qVal) {
        ta.value = qVal;
        const tryRun = () => {
          if (state.sid) {
            try { doSoql(); } catch {}
            return true;
          }
          return false;
        };
        if (!tryRun()) {
          let waited = 0;
          const iv = setInterval(() => {
            waited += 250;
            if (tryRun() || waited >= 5000) clearInterval(iv);
          }, 250);
        }
      }
    }
    // v3.188.0 Phase 278: ?id= が指定されかつ inspector view なら、レコード ID 入力欄に投入 + 接続済みなら自動取得
    if (window._sfdtInitialIdFromQuery && initialViewFromQuery === "inspector") {
      const idVal = String(window._sfdtInitialIdFromQuery).trim();
      const refInp = document.getElementById("inspectRef");
      if (refInp && idVal) {
        // ?obj= も併用された場合は「オブジェクト名:ID」形式にする (Inspector の入力規約)
        refInp.value = initialObjFromQuery ? `${initialObjFromQuery}:${idVal}` : idVal;
        const tryRun = () => {
          if (state.sid) {
            try { doInspect(); } catch {}
            return true;
          }
          return false;
        };
        if (!tryRun()) {
          let waited = 0;
          const iv = setInterval(() => {
            waited += 250;
            if (tryRun() || waited >= 5000) clearInterval(iv);
          }, 250);
        }
      }
    }
    // v2.93.0: レコード詳細をデフォルト表示時、現在ページのレコード ID を自動入力 (ユーザー要望「現在のレコードをデフォルト表示」)
    try {
      const inspectRefEl = document.getElementById("inspectRef");
      if (inspectRefEl && !inspectRefEl.value && typeof chrome.devtools !== "undefined" && chrome.devtools.inspectedWindow) {
        chrome.devtools.inspectedWindow.eval("location.href", (href) => {
          if (!href) return;
          const m = href.match(/\/lightning\/r\/([^/]+)\/([a-zA-Z0-9]{15,18})/);
          if (m) inspectRefEl.value = m[2];
          else {
            const m2 = href.match(/\/([a-zA-Z0-9]{15,18})(?:[/?]|$)/);
            if (m2) inspectRefEl.value = m2[1];
          }
        });
      }
    } catch {}
    console.log("[DevToolsNext] init: complete");
  } catch (e) {
    console.error("[DevToolsNext] init error:", e);
    if (orgInfo) orgInfo.innerHTML = `<span class="pill err" title="${escape((e && e.stack) || String(e))}">初期化失敗: ${escape((e && e.message) || String(e))}</span>`;
  }
}

// v3.53.0: 設計書 21 種を絞り込む検索ボックス (Phase 240 で orgSnapshot 追加、Phase 318 で 21 種に修正)
// v3.158.0 Phase 248: 設計書「直前生成」chip を designMeta 上部に表示し、ワンクリックで再生成
// v3.169.0 Phase 259: 過去 5 件履歴に拡張 (sfdtRecentDesigns、最新を sfdtLastDesign に維持)
async function renderDesignLastChip() {
  try {
    const data = await chrome.storage.local.get(["sfdtLastDesign", "sfdtRecentDesigns"]);
    const row = document.getElementById("designLastChipRow");
    if (!row) return;
    // 過去 5 件履歴を優先、なければ単体 sfdtLastDesign をフォールバック (旧互換)
    let recent = Array.isArray(data.sfdtRecentDesigns) ? data.sfdtRecentDesigns : [];
    if (!recent.length && data.sfdtLastDesign && data.sfdtLastDesign.type) {
      recent = [data.sfdtLastDesign];
    }
    if (!recent.length) { row.innerHTML = ""; return; }
    const sel = document.getElementById("designType");
    const typeLabelOf = (typeKey) => {
      if (!sel) return typeKey;
      const opt = Array.from(sel.options).find((o) => o.value === typeKey);
      return opt ? opt.textContent.replace(/^[★⭐]\s*/, "") : typeKey;
    };
    const elapsedLabelOf = (ts) => {
      if (!ts) return "";
      const min = Math.round((Date.now() - ts) / 60000);
      return min < 60 ? ` (${min}分前)` : ` (${Math.floor(min / 60)}h前)`;
    };
    // 最大 5 件を chip でレンダリング
    const chipsHtml = recent.slice(0, 5).map((d, i) => {
      const typeLabel = typeLabelOf(d.type);
      const objPart = d.obj ? ` / 対象: ${escape(d.obj)}` : "";
      const fmtPart = d.format ? ` / ${escape(d.format)}` : "";
      const isFirst = i === 0;
      const cls = isFirst ? "design-last-chip" : "design-last-chip design-recent-chip";
      const titleAttr = isFirst ? "直前生成と同じ条件で 1 クリック再生成" : "過去履歴: クリックで同条件再生成";
      return `<button class="${cls}" data-idx="${i}" data-type="${escape(d.type)}" data-obj="${escape(d.obj || "")}" data-format="${escape(d.format || "")}" title="${escape(titleAttr)}">
        ${isFirst ? "🔄" : "📜"} ${escape(typeLabel)}${objPart}${fmtPart}${elapsedLabelOf(d.ts)}
      </button>`;
    }).join("");
    row.innerHTML = chipsHtml + `<button id="btnDesignReRunClear" class="design-last-chip-clear" title="生成履歴を全削除します (機密配慮)">✕</button>`;
    // 各 chip のクリックハンドラ
    row.querySelectorAll(".design-last-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (sel) sel.value = btn.dataset.type;
        if (sel) sel.dispatchEvent(new Event("change", { bubbles: true }));
        const objEl = document.getElementById("designObj");
        const fmtEl = document.getElementById("designFormat");
        if (objEl) objEl.value = btn.dataset.obj || "";
        if (fmtEl && btn.dataset.format) fmtEl.value = btn.dataset.format;
        doGenerateDesign();
      });
    });
    const clearBtn = document.getElementById("btnDesignReRunClear");
    if (clearBtn) clearBtn.addEventListener("click", async () => {
      try {
        await chrome.storage.local.remove(["sfdtLastDesign", "sfdtRecentDesigns"]);
        row.innerHTML = "";
        panelToast("✓ 設計書生成履歴 (過去 5 件) を削除しました", { kind: "ok" });
      } catch (e) { console.warn("[design] history clear failed", e); }
    });
  } catch (e) { console.warn("[design] last chip render failed", e); }
}

function setupDesignTypeFilter() {
  const filter = document.getElementById("designTypeFilter");
  const sel = document.getElementById("designType");
  if (!filter || !sel) return;
  // v3.236.0 Phase 326: 起動時に optgroup 構造ごと保持して絞込み後も復元可能に
  // Phase 318 で optgroup 5 カテゴリ化したが、旧フィルタはフラット化していたため optgroup が消えてしまっていた
  const groupStructure = []; // [{label, options: [{value, text}]}]
  Array.from(sel.children).forEach((child) => {
    if (child.tagName === "OPTGROUP") {
      const opts = Array.from(child.children).map((o) => ({ value: o.value, text: o.textContent }));
      groupStructure.push({ label: child.label, options: opts });
    } else if (child.tagName === "OPTION") {
      // optgroup 外の option (今は存在しないが念のため null グループ扱い)
      groupStructure.push({ label: null, options: [{ value: child.value, text: child.textContent }] });
    }
  });
  // 全件のフラット集計 (検索カウント用)
  const totalCount = groupStructure.reduce((acc, g) => acc + g.options.length, 0);

  const refresh = () => {
    const q = (filter.value || "").toLowerCase().trim();
    const current = sel.value;
    sel.innerHTML = "";
    let matchedCount = 0;
    groupStructure.forEach((g) => {
      const matched = q ? g.options.filter((o) => o.text.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)) : g.options;
      if (!matched.length) return;
      matchedCount += matched.length;
      if (g.label) {
        const og = document.createElement("optgroup");
        og.label = g.label;
        matched.forEach((o) => {
          const opt = document.createElement("option");
          opt.value = o.value;
          opt.textContent = o.text;
          og.appendChild(opt);
        });
        sel.appendChild(og);
      } else {
        matched.forEach((o) => {
          const opt = document.createElement("option");
          opt.value = o.value;
          opt.textContent = o.text;
          sel.appendChild(opt);
        });
      }
    });
    // 元の選択を可能なら復元、無理なら先頭を選択
    const allValues = Array.from(sel.querySelectorAll("option")).map((o) => o.value);
    if (allValues.includes(current)) {
      sel.value = current;
    } else if (allValues.length) {
      sel.value = allValues[0];
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    filter.title = `${totalCount} 種類中 ${matchedCount} 件マッチ`;
  };
  filter.addEventListener("input", refresh);
  filter.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { filter.value = ""; refresh(); }
  });
}

// 設計書タイプによって Picker の種類を切り替える + 入力不要タイプでは Picker トリガを隠す
function setupDesignPicker() {
  const sel = document.getElementById("designType");
  const input = document.getElementById("designObj");
  if (!sel || !input) return;
  const NO_INPUT_TYPES = new Set([
    "profileList", "permsetList", "apexClassList", "apexTriggerList",
    "flowList", "customSettingList", "appList", "accessControl",
    "orgSnapshot", // v3.150.0 Phase 240: 組織全体スナップショットは対象不要
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
    // v3.42.0: 「対象」入力要否を pill で視覚化
    const hint = document.getElementById("designObjHint");
    if (hint) {
      const OPTIONAL_TYPES = new Set(["validationRuleList", "recordTypeList", "fieldSetList"]);
      if (NO_INPUT_TYPES.has(type)) {
        hint.textContent = "対象: 不要";
        hint.className = "pill ok";
        hint.title = "この種類は組織全体を対象とするため「対象」入力は不要です";
      } else if (OPTIONAL_TYPES.has(type)) {
        hint.textContent = "対象: 任意";
        hint.className = "pill";
        hint.title = "「対象」を入力すると特定オブジェクトに絞り込めます。空欄なら全オブジェクト横断";
      } else {
        hint.textContent = "対象: 必須";
        hint.className = "pill warn";
        hint.title = "この種類は「対象」入力が必須です (オブジェクト API 名 / プロファイル名 / Flow / Apex / LWC 等)";
      }
    }
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
    // v3.74.0: type 別履歴チップを表示
    renderDesignObjHistory(type);
    // v3.142.0 Phase 232: ER 図オプション (erDepth/erMdOnly) は erDiagram 選択時のみ表示
    const erOpts = document.getElementById("erOptions");
    if (erOpts) erOpts.style.display = (type === "erDiagram") ? "inline-flex" : "none";
  };
  sel.addEventListener("change", refresh);
  refresh();
}

// v3.64.0: Apex コード整形ヘルパー — { } ベースのインデント (2 スペース) + コメント/文字列保護
// Apex キーワード自体の大文字化はしない (camelCase 慣習を尊重: String / Integer / if / else)
function formatApex(input) {
  if (!input) return "";
  // 1. 文字列リテラル ('...') と複数行コメント (/* ... */) と行コメント (// ...) を退避
  const placeholders = [];
  let working = input
    // 複数行コメント /* */
    .replace(/\/\*[\s\S]*?\*\//g, (m) => { placeholders.push(m); return `\x01CMT${placeholders.length - 1}\x01`; })
    // 行コメント //
    .replace(/\/\/[^\n]*/g, (m) => { placeholders.push(m); return `\x01CMT${placeholders.length - 1}\x01`; })
    // 文字列リテラル ('...' with '\'' or '' escape)
    .replace(/'(?:[^'\\]|\\.|'')*'/g, (m) => { placeholders.push(m); return `\x01STR${placeholders.length - 1}\x01`; });
  // 2. 改行整形 — {  の後と } の前に改行
  working = working
    .replace(/\{\s*/g, "{\n")
    .replace(/\s*\}/g, "\n}")
    .replace(/;\s*(?!\s*\n)/g, ";\n"); // セミコロン後に改行
  // 3. 行ごとにインデント計算
  const lines = working.split(/\n/);
  let depth = 0;
  const formatted = lines.map((rawLine) => {
    const line = rawLine.trim();
    if (!line) return "";
    // 行末が } のみなら先に depth を下げてからインデント計算
    const startsWithCloseBrace = /^[\}\)]/.test(line);
    const indentDepth = Math.max(0, depth - (startsWithCloseBrace ? 1 : 0));
    const indent = "  ".repeat(indentDepth);
    // この行で開き / 閉じカウント
    const opens = (line.match(/[\{\(]/g) || []).length;
    const closes = (line.match(/[\}\)]/g) || []).length;
    depth = Math.max(0, depth + opens - closes);
    return indent + line;
  });
  working = formatted.filter((l) => l !== undefined).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  // 4. プレースホルダ復元
  working = working
    .replace(/\x01STR(\d+)\x01/g, (_, i) => placeholders[+i])
    .replace(/\x01CMT(\d+)\x01/g, (_, i) => placeholders[+i]);
  return working;
}

// v3.74.0: 設計書「対象」入力履歴 — type 別に直近 5 件まで chrome.storage 永続化
const DESIGN_OBJ_HIST_KEY = "sfdtDesignObjHist";
async function pushDesignObjHistory(type, obj) {
  const norm = String(obj || "").trim();
  if (!norm || !type) return;
  try {
    const data = await chrome.storage.local.get(DESIGN_OBJ_HIST_KEY);
    const map = (data[DESIGN_OBJ_HIST_KEY] && typeof data[DESIGN_OBJ_HIST_KEY] === "object") ? data[DESIGN_OBJ_HIST_KEY] : {};
    const list = Array.isArray(map[type]) ? map[type] : [];
    map[type] = [norm, ...list.filter((v) => v !== norm)].slice(0, 5);
    await chrome.storage.local.set({ [DESIGN_OBJ_HIST_KEY]: map });
    renderDesignObjHistory(type);
  } catch {}
}
async function renderDesignObjHistory(type) {
  const row = document.getElementById("designObjHistRow");
  if (!row) return;
  if (!type) { row.innerHTML = ""; return; }
  try {
    const data = await chrome.storage.local.get(DESIGN_OBJ_HIST_KEY);
    const map = (data[DESIGN_OBJ_HIST_KEY] && typeof data[DESIGN_OBJ_HIST_KEY] === "object") ? data[DESIGN_OBJ_HIST_KEY] : {};
    const list = Array.isArray(map[type]) ? map[type] : [];
    if (!list.length) { row.innerHTML = ""; return; }
    row.innerHTML = `<span class="design-obj-hist-label">${escape(type)} の最近の対象:</span>` + list.map((v) => {
      return `<button class="design-obj-hist-chip" data-obj="${escape(v)}" title="クリックで「${escape(v)}」を designObj に投入して ▶ 生成">${escape(v)}</button>`;
    }).join("");
    row.querySelectorAll(".design-obj-hist-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const obj = btn.dataset.obj;
        const input = document.getElementById("designObj");
        if (input) input.value = obj;
        const genBtn = document.getElementById("btnDesignGen");
        if (genBtn) genBtn.click();
      });
    });
  } catch {}
}

// v3.63.0: SOQL 整形ヘルパー — キーワード大文字化 + 主節改行
// シンプル実装: 文字列リテラル ('...') は退避してから加工、最後に復元
function formatSoql(input) {
  if (!input) return "";
  // 1. 文字列リテラルを退避 (バックスラッシュエスケープ '\'' は連続文字として扱う)
  const placeholders = [];
  let working = input.replace(/'((?:[^'\\]|\\.|'')*)'/g, (m) => {
    placeholders.push(m);
    return `\x00LITERAL${placeholders.length - 1}\x00`;
  });
  // 2. キーワード大文字化 (単語境界判定で識別子は影響受けない)
  const KEYWORDS = [
    "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "NOT IN", "LIKE", "NULL",
    "ORDER BY", "GROUP BY", "HAVING", "LIMIT", "OFFSET", "FOR VIEW", "FOR UPDATE", "FOR REFERENCE",
    "ASC", "DESC", "NULLS FIRST", "NULLS LAST",
    "TYPEOF", "WHEN", "THEN", "ELSE", "END",
    "USING SCOPE", "WITH", "WITH SECURITY_ENFORCED",
    "TRUE", "FALSE",
    // 日付リテラル
    "TODAY", "YESTERDAY", "TOMORROW", "LAST_WEEK", "THIS_WEEK", "NEXT_WEEK",
    "LAST_MONTH", "THIS_MONTH", "NEXT_MONTH", "LAST_QUARTER", "THIS_QUARTER", "NEXT_QUARTER",
    "LAST_YEAR", "THIS_YEAR", "NEXT_YEAR", "LAST_FISCAL_QUARTER", "THIS_FISCAL_QUARTER",
    "LAST_FISCAL_YEAR", "THIS_FISCAL_YEAR", "NEXT_FISCAL_YEAR",
    "LAST_N_DAYS", "NEXT_N_DAYS", "LAST_N_WEEKS", "NEXT_N_WEEKS",
    "LAST_N_MONTHS", "NEXT_N_MONTHS", "LAST_N_QUARTERS", "NEXT_N_QUARTERS",
    "LAST_N_YEARS", "NEXT_N_YEARS",
  ];
  // 長いキーワードから先に置換 (例: ORDER BY は ORDER より先)
  const sortedKeywords = [...KEYWORDS].sort((a, b) => b.length - a.length);
  sortedKeywords.forEach((kw) => {
    const re = new RegExp(`\\b${kw.replace(/\s+/g, "\\s+")}\\b`, "gi");
    working = working.replace(re, kw);
  });
  // 3. 主節 (SELECT/FROM/WHERE/ORDER BY/GROUP BY/HAVING/LIMIT/OFFSET) の前に改行
  const MAJOR_CLAUSES = ["FROM", "WHERE", "ORDER BY", "GROUP BY", "HAVING", "LIMIT", "OFFSET"];
  MAJOR_CLAUSES.forEach((kw) => {
    const re = new RegExp(`\\s*\\b${kw.replace(/\s+/g, "\\s+")}\\b`, "g");
    working = working.replace(re, `\n${kw}`);
  });
  // 4. 連続空白を 1 つにまとめる (改行は維持)
  working = working.split(/\n/).map((line) => line.replace(/[ \t]+/g, " ").trim()).join("\n").trim();
  // 5. プレースホルダ復元
  working = working.replace(/\x00LITERAL(\d+)\x00/g, (_, i) => placeholders[+i]);
  return working;
}

// v3.51.0: textarea にカーソル位置インジケータ (L:行 C:列) を装着
// エラーメッセージの「3 行 5 列目」と照合しやすくする (Apex/REST/SOQL エディタ向け)
function attachCursorPositionIndicator(textareaId) {
  const ta = document.getElementById(textareaId);
  if (!ta || ta.dataset.cursorPosAttached === "true") return;
  ta.dataset.cursorPosAttached = "true";
  // wrap で囲んで relative にして badge を絶対配置
  const wrap = document.createElement("span");
  wrap.className = "cursor-pos-wrap";
  ta.parentNode.insertBefore(wrap, ta);
  wrap.appendChild(ta);
  const badge = document.createElement("span");
  badge.className = "cursor-pos-badge";
  badge.textContent = "L:1 C:1";
  badge.title = "現在のカーソル位置 (行:列) — エラーメッセージの行/列番号と照合できます";
  wrap.appendChild(badge);
  const update = () => {
    const value = ta.value;
    const pos = ta.selectionStart || 0;
    const before = value.substring(0, pos);
    const line = (before.match(/\n/g) || []).length + 1;
    const lastNl = before.lastIndexOf("\n");
    const col = pos - (lastNl + 1) + 1;
    const totalLines = (value.match(/\n/g) || []).length + 1;
    badge.textContent = `L:${line}/${totalLines} C:${col}`;
  };
  ["input", "click", "keyup", "select", "focus"].forEach((ev) => ta.addEventListener(ev, update));
  update();
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
  // v3.38.0: HTML 側で <span id="versionBadge"> を持つようになったため、まずそれを更新。無ければ verBadge を動的生成 (後方互換)
  const v = chrome.runtime.getManifest().version;
  const versionBadge = document.getElementById("versionBadge");
  if (versionBadge) {
    versionBadge.textContent = "v" + v;
    versionBadge.title = `現在の拡張バージョン v${v} (popup の ⬆ アップデートボタンで最新版に更新可能)`;
    versionBadge.style.cssText = "background:rgba(27,150,255,0.15);color:#1b96ff;font-weight:700;cursor:help";
  } else if (!document.getElementById("verBadge")) {
    const badge = document.createElement("span");
    badge.id = "verBadge";
    badge.className = "org";
    badge.title = `現在のバージョン v${v} (VERSION.txt 30秒ポーリングで自動更新)`;
    badge.style.cssText = "background:rgba(27,150,255,0.15);color:#1b96ff;font-weight:700";
    badge.textContent = "v" + v;
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
  // v2.93.0: リフレッシュしても直前の view を復元するため最終 view を保存
  try { chrome.storage.local.set({ sfdtLastView: v }); } catch {}

  // v2.90.0: 開いた瞬間に自動取得 (ユーザー要望: 「使用状況とかは開いたらすぐ取得してほしい」)
  // 入力不要で実行可能なビュー (limits / login / logs / metadata) は switchToView 時に自動実行
  // 接続済みの時のみ、かつまだ未取得の時のみ (再表示時の重複コール防止)
  if (state.sid) {
    try {
      if (v === "limits") {
        const result = document.getElementById("limitsResult");
        if (result && !result.innerHTML.trim()) doLimits();
      } else if (v === "login") {
        const result = document.getElementById("loginResult");
        if (result && !result.innerHTML.trim()) doFetchLoginHistory();
      } else if (v === "logs") {
        const result = document.getElementById("logsResult");
        if (result && !result.innerHTML.trim()) doFetchLogs();
      } else if (v === "metadata") {
        const result = document.getElementById("metadataResult");
        if (result && !result.innerHTML.trim()) doMetadataList();
      } else if (v === "admin") {
        // v3.131.0 Phase 220: ユーザー要望「取得ボタンを押さなくても取得してほしい」
        // admin ビューに切り替えた瞬間、未取得なら 6 カード自動一括取得
        const result = document.getElementById("adminLicensesResult");
        // empty-state テキストが残っている = まだ取得していない、と判定
        if (result && result.querySelector(".empty-state")) {
          setTimeout(() => doAdminLoadAll(), 100); // 描画後に開始
        }
      } else if (v === "search") {
        // v3.137.0 Phase 227: グローバル検索ビューに来たら、searchQuery にフォーカス
        setTimeout(() => {
          const q = document.getElementById("searchQuery");
          if (q && !q.value) q.focus();
        }, 80);
        // v3.149.0 Phase 239: 検索履歴を表示 (chrome.storage から非同期ロード)
        loadSearchHistory().then((list) => renderSearchHistory(list));
      }
    } catch (e) { console.warn("[DevToolsNext] auto-fetch on view switch failed:", e); }
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

  // v2.82.0: 開発者モード サイドメニュー強化 (4 チーム工夫)
  // Team B - カテゴリ折りたたみトグル + 状態の chrome.storage 永続化
  const NAV_COLLAPSED_KEY = "sfdtNavCollapsedCats";
  chrome.storage.local.get(NAV_COLLAPSED_KEY).then(({ [NAV_COLLAPSED_KEY]: collapsed = [] }) => {
    collapsed.forEach((cat) => {
      const sep = document.querySelector(`.nav-sep[data-cat="${cat}"]`);
      const grp = document.querySelector(`.nav-group[data-cat="${cat}"]`);
      if (sep) sep.setAttribute("aria-expanded", "false");
      if (grp) grp.classList.add("collapsed");
    });
  }).catch(() => {});
  document.querySelectorAll(".nav-sep[data-cat]").forEach((sep) => {
    sep.addEventListener("click", async () => {
      const cat = sep.dataset.cat;
      const grp = document.querySelector(`.nav-group[data-cat="${cat}"]`);
      const isOpen = sep.getAttribute("aria-expanded") !== "false";
      sep.setAttribute("aria-expanded", isOpen ? "false" : "true");
      if (grp) grp.classList.toggle("collapsed", isOpen);
      try {
        const { [NAV_COLLAPSED_KEY]: list = [] } = await chrome.storage.local.get(NAV_COLLAPSED_KEY);
        const next = isOpen ? [...new Set([...list, cat])] : list.filter((c) => c !== cat);
        await chrome.storage.local.set({ [NAV_COLLAPSED_KEY]: next });
      } catch {}
    });
  });

  // Team D - 機能フィルタ検索 (入力で nav-btn と nav-sep を絞り込み表示)
  const navSearch = document.getElementById("navSearch");
  if (navSearch) {
    navSearch.addEventListener("input", () => {
      const q = navSearch.value.trim().toLowerCase();
      // 各カテゴリでヒット件数をカウントして、ヒットがあるカテゴリヘッダのみ表示
      const catHits = new Map();
      document.querySelectorAll(".nav-btn").forEach((btn) => {
        if (btn.classList.contains("nav-home")) return; // ホームは常時表示
        const txt = btn.textContent.trim().toLowerCase();
        const hit = !q || txt.includes(q);
        btn.classList.toggle("search-hidden", !hit);
        if (hit && btn.dataset.cat) catHits.set(btn.dataset.cat, (catHits.get(btn.dataset.cat) || 0) + 1);
      });
      document.querySelectorAll(".nav-sep[data-cat]").forEach((sep) => {
        const hasHit = !q || (catHits.get(sep.dataset.cat) || 0) > 0;
        sep.classList.toggle("search-hidden", !hasHit);
      });
      document.querySelectorAll(".nav-group[data-cat]").forEach((grp) => {
        const hasHit = !q || (catHits.get(grp.dataset.cat) || 0) > 0;
        grp.classList.toggle("search-hidden", !hasHit);
        // 検索中は collapsed を一時無視して開く
        if (q) grp.classList.remove("collapsed");
      });
    });
    // Esc でクリア
    navSearch.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { navSearch.value = ""; navSearch.dispatchEvent(new Event("input")); navSearch.blur(); }
    });
  }
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
  // v2.84.0: API URL ビルダー / REST 探索の使い方ガイドの「例チップ」クリックで入力欄を埋める
  // v3.89.0: Phase 179 で data-quickset (変更セットクイックスタート) のハンドラを削除 — 変更セット view は v2.88.0 以降 HTML から撤去済で到達不能だった
  document.querySelectorAll(".api-example-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      // API URL ビルダー用
      if (chip.dataset.op) {
        const opSel = document.getElementById("apiOp");
        const objIn = document.getElementById("apiObj");
        if (opSel) opSel.value = chip.dataset.op;
        if (objIn) objIn.value = chip.dataset.obj || "";
        const buildBtn = document.getElementById("btnApiBuild");
        if (buildBtn) buildBtn.click();
      }
      // REST 探索用
      if (chip.dataset.restMethod) {
        const m = document.getElementById("restMethod");
        const p = document.getElementById("restPath");
        if (m) m.value = chip.dataset.restMethod;
        if (p) p.value = chip.dataset.restPath || "";
        panelToast(`📋 例を入力欄に設定しました。「送信」ボタンをクリックして実行してください`, { kind: "ok" });
      }
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

  // v2.90.0: 全 addEventListener を null セーフ化 (ユーザー報告「初期化失敗 Cannot read properties of null」の根本対応)
  // 旧コードは直接 document.getElementById(...).addEventListener(...) を呼んでおり、HTML 要素が無い時に init 全体が止まっていた
  const $on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };

  // SOQL
  $on("btnRunSoql", "click", doSoql);
  $on("btnBulkInsert", "click", openBulkInsertDialog);
  // v3.70.0: SOQL テンプレート挿入 — Apex 同様、よく使う 6 種を 1 クリックで textarea へ
  $on("soqlTemplate", "change", (e) => {
    const key = e.target.value;
    if (!key) return;
    const TEMPLATES = {
      recent_accounts: `SELECT Id, Name, Industry, Type, CreatedDate, CreatedBy.Name\nFROM Account\nORDER BY CreatedDate DESC\nLIMIT 10`,
      my_open_cases: `SELECT Id, CaseNumber, Subject, Status, Priority, CreatedDate, Account.Name\nFROM Case\nWHERE OwnerId = '${state.userId || "REPLACE_USER_ID"}' AND IsClosed = false\nORDER BY Priority ASC, CreatedDate DESC\nLIMIT 50`,
      // v3.247.0 Phase 337: 営業向け業務シナリオ — 自分が担当の Open Lead (Phase 336 mini-panel と整合)
      my_open_leads: `// 🎯 自分が担当の Open Lead (リード追跡)\nSELECT Id, Name, Company, Status, Email, Phone, Industry, CreatedDate\nFROM Lead\nWHERE OwnerId = '${state.userId || "REPLACE_USER_ID"}' AND IsConverted = false\nORDER BY CreatedDate DESC\nLIMIT 50`,
      // v3.254.0 Phase 344: 営業マネージャ向け失注分析 — 過去 30 日に Closed Lost した Opportunity (Phase 343 mini-panel と整合)
      closed_lost_recent: `// 📭 過去 30 日に失注した Opportunity (営業マネージャ向け敗因傾向分析)\nSELECT Id, Name, StageName, Amount, CloseDate, Account.Name, Owner.Name, NextStep\nFROM Opportunity\nWHERE StageName = 'Closed Lost' AND CloseDate = LAST_N_DAYS:30\nORDER BY CloseDate DESC, Amount DESC NULLS LAST\nLIMIT 50`,
      active_users: `SELECT Id, Name, Username, Email, Profile.Name, UserRole.Name, IsActive\nFROM User\nWHERE IsActive = true\nORDER BY Name\nLIMIT 100`,
      apex_classes: `// Tooling API: 左の「Tooling API を使用」にチェックしてから実行\nSELECT Id, Name, NamespacePrefix, ApiVersion, Status, LengthWithoutComments, LastModifiedDate, LastModifiedBy.Name\nFROM ApexClass\nORDER BY LastModifiedDate DESC\nLIMIT 50`,
      custom_fields: `// Tooling API: 左の「Tooling API を使用」にチェックしてから実行\nSELECT Id, DeveloperName, EntityDefinition.QualifiedApiName, DataType, Length, LastModifiedDate\nFROM CustomField\nWHERE EntityDefinition.QualifiedApiName = 'Account'\nORDER BY DeveloperName\nLIMIT 100`,
      last_modified: `SELECT Id, Name, LastModifiedDate, LastModifiedBy.Name\nFROM Account\nWHERE LastModifiedDate = LAST_N_DAYS:7\nORDER BY LastModifiedDate DESC\nLIMIT 50`,
      // v3.117.0 Phase 207: 設定変更履歴 (Setup Audit Trail) — 標準 API、保持期間 180 日 (Field Audit Trail 未購入の場合)
      setup_audit_trail: `// Setup Audit Trail (設定変更履歴) — 保持期間 180 日 / Field Audit Trail を購入していない場合\nSELECT Id, Action, Section, Display, CreatedBy.Name, CreatedDate, DelegateUser\nFROM SetupAuditTrail\nORDER BY CreatedDate DESC\nLIMIT 200`,
      // v3.119.0 Phase 209: 業務監査系テンプレート 5 種追加 (棚卸し / ガバナンス / 不正検知用)
      top_account_owners: `// 取引先所有者ランキング — 誰が最も多く取引先を所有しているか (組織健全性チェック)\nSELECT OwnerId, Owner.Name, COUNT(Id) AccountCount\nFROM Account\nGROUP BY OwnerId, Owner.Name\nORDER BY COUNT(Id) DESC\nLIMIT 20`,
      inactive_users_with_records: `// 棚卸し: 非アクティブだが取引先を所有しているユーザー — 所有者移管が必要なレコード抽出\nSELECT OwnerId, Owner.Name, Owner.IsActive, COUNT(Id) AccountCount\nFROM Account\nWHERE Owner.IsActive = false\nGROUP BY OwnerId, Owner.Name, Owner.IsActive\nORDER BY COUNT(Id) DESC\nLIMIT 50`,
      my_permission_sets: `// 自分の権限セット割当一覧 — どの権限を持っているか確認 (ガバナンス監査)\nSELECT Id, PermissionSet.Name, PermissionSet.Label, PermissionSet.Description, AssigneeId, Assignee.Name, ExpirationDate\nFROM PermissionSetAssignment\nWHERE AssigneeId = '${state.userId || "REPLACE_USER_ID"}'\nORDER BY PermissionSet.Label`,
      large_attachments: `// 大型添付ファイル上位 50 件 — ストレージ容量圧迫の原因特定 (Files Storage 削減用)\nSELECT Id, Title, FileExtension, ContentSize, CreatedBy.Name, CreatedDate, FirstPublishLocationId\nFROM ContentVersion\nWHERE IsLatest = true\nORDER BY ContentSize DESC\nLIMIT 50`,
      stale_open_cases: `// 長期未対応 Case — 30 日以上更新がない未クローズ Case (SLA 違反候補)\nSELECT Id, CaseNumber, Subject, Status, Priority, Owner.Name, CreatedDate, LastModifiedDate, Account.Name\nFROM Case\nWHERE IsClosed = false AND LastModifiedDate < LAST_N_DAYS:30\nORDER BY LastModifiedDate ASC\nLIMIT 100`,
      // v3.121.0 Phase 211: ユーザー管理 / ライセンス管理 / パッケージ管理 SOQL テンプレ 5 種追加
      user_license_usage: `// 📊 ライセンス使用状況 (Salesforce / Salesforce Platform / Identity 等) — 残席数と使用率\nSELECT Name, TotalLicenses, UsedLicenses, Status, MasterLabel\nFROM UserLicense\nWHERE Status = 'Active'\nORDER BY UsedLicenses DESC`,
      permset_license_usage: `// 🔑 権限セットライセンス使用状況 (Sales Cloud User / Service Cloud User 等)\nSELECT MasterLabel, DeveloperName, TotalLicenses, UsedLicenses, ExpirationDate, Status\nFROM PermissionSetLicense\nWHERE Status = 'Active'\nORDER BY UsedLicenses DESC`,
      frozen_users: `// ❄️ 凍結ユーザー一覧 (Setup → User Login で IsFrozen = true のレコード)\nSELECT Id, UserId, User.Name, User.Username, User.Email, User.Profile.Name, User.IsActive, IsFrozen\nFROM UserLogin\nWHERE IsFrozen = true\nORDER BY User.Name`,
      mfa_status: `// 🛡️ MFA (多要素認証) 設定状況 — TwoFactorMethodsInfo で各ユーザーの MFA 設定方法\nSELECT UserId, User.Name, User.Username, User.Profile.Name, MethodDefinition, HasUserVerifiedEmailAddress, HasUserVerifiedMobileNumber\nFROM TwoFactorMethodsInfo\nORDER BY User.Name\nLIMIT 200`,
      installed_packages: `// 🔌 インストールパッケージ一覧 (Tooling API) — 左の「Tooling API を使用」にチェック\nSELECT Id, SubscriberPackage.Name, SubscriberPackage.NamespacePrefix, SubscriberPackageVersion.Name, SubscriberPackageVersion.MajorVersion, SubscriberPackageVersion.MinorVersion, SubscriberPackageVersion.PatchVersion, SubscriberPackageVersion.IsBeta\nFROM InstalledSubscriberPackage\nORDER BY SubscriberPackage.Name`,
      // v3.147.0 Phase 237: ストレージ削減・アクセス制御系 SOQL テンプレ 5 種追加
      large_content_versions: `// 📁 大型 ContentVersion (50 MB 超) Top 50 — ストレージ削減候補抽出 (admin「📁 ストレージ詳細」連携)\nSELECT Id, Title, FileExtension, ContentSize, CreatedBy.Name, CreatedDate, FirstPublishLocationId, ContentDocumentId\nFROM ContentVersion\nWHERE IsLatest = true AND ContentSize > 52428800\nORDER BY ContentSize DESC\nLIMIT 50`,
      old_attachments: `// 🗑️ 古い Attachment (365 日未更新) Top 200 — 旧形式の添付棚卸し\n// 注: Attachment は ContentDocument 統合移行中、新規実装は ContentDocument 推奨\nSELECT Id, Name, BodyLength, ParentId, ContentType, CreatedBy.Name, CreatedDate, LastModifiedDate\nFROM Attachment\nWHERE LastModifiedDate < LAST_N_DAYS:365\nORDER BY BodyLength DESC\nLIMIT 200`,
      public_groups: `// 👥 Public Group (パブリックグループ) 一覧 — 共有ルール・フォルダ共有等の対象\n// Type=Regular がパブリックグループ (Queue は別 Type)\nSELECT Id, Name, DeveloperName, Type, RelatedId, OwnerId, Email\nFROM Group\nWHERE Type = 'Regular'\nORDER BY Name\nLIMIT 200`,
      queues: `// 📋 Queue (キュー) 一覧 — Case / Lead / カスタムオブジェクトの受け皿、担当未定レコードの初期所有者\nSELECT Id, Name, DeveloperName, Type, Email, OwnerId\nFROM Group\nWHERE Type = 'Queue'\nORDER BY Name\nLIMIT 200`,
      group_members_summary: `// 🧑‍🤝‍🧑 Group / Queue メンバー集計 — 各 Group のメンバー数 (Public Group や Queue の規模把握)\nSELECT GroupId, Group.Name, Group.Type, COUNT(Id) memberCount\nFROM GroupMember\nGROUP BY GroupId, Group.Name, Group.Type\nORDER BY COUNT(Id) DESC\nLIMIT 200`,
      // v3.234.0 Phase 324: 営業向け業務シナリオ — 今月クローズ予定 Opportunity
      closing_this_month: `// 📅 今月クローズ予定の Opportunity (営業向け業務分析)\n// 業務シナリオ: 月次見込み確認、月末追い込み案件の特定、営業ダッシュボード\nSELECT Id, Name, StageName, Amount, CloseDate, Account.Name, Owner.Name\nFROM Opportunity\nWHERE CloseDate = THIS_MONTH AND IsClosed = false\nORDER BY CloseDate ASC, Amount DESC NULLS LAST\nLIMIT 50`,
      // v3.218.0 Phase 308: 棚卸し・引継ぎ向け 3 種追加
      recent_modified_flows: `// 🔄 最近 30 日に更新された Active Flow (引継ぎ向け / 影響範囲調査)\n// 業務シナリオ: フロー変更履歴の追跡、担当者引き継ぎ時の重要 Flow 把握\nSELECT Id, MasterLabel, ProcessType, Status, VersionNumber, LastModifiedDate, LastModifiedBy.Name\nFROM FlowDefinitionView\nWHERE LastModifiedDate = LAST_N_DAYS:30 AND IsActive = true\nORDER BY LastModifiedDate DESC\nLIMIT 50`,
      email_templates: `// ✉️ EmailTemplate 一覧 — メールテンプレート棚卸し (Lightning / Classic 両方)\n// 業務シナリオ: 不要 EmailTemplate の整理、配信内容の確認、フォルダ別管理\nSELECT Id, Name, DeveloperName, FolderId, IsActive, TemplateStyle, TemplateType, LastUsedDate, CreatedBy.Name\nFROM EmailTemplate\nORDER BY LastUsedDate DESC NULLS LAST, Name\nLIMIT 100`,
      dashboards: `// 📊 Dashboard 一覧 — レポート/ダッシュボード棚卸し\n// 業務シナリオ: 利用されていないダッシュボードの整理、ユーザ別 Running User 監査\nSELECT Id, Title, DeveloperName, FolderId, FolderName, RunningUserId, RunningUser.Name, BackgroundEndColor, CreatedDate, LastModifiedDate\nFROM Dashboard\nORDER BY LastModifiedDate DESC\nLIMIT 100`,
    };
    const code = TEMPLATES[key];
    if (!code) return;
    const ta = document.getElementById("soqlText");
    if (ta) {
      ta.value = code;
      ta.focus();
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    }
    // Tooling API 系テンプレートは自動でチェック ON
    const toolingCb = document.getElementById("useTooling");
    if (toolingCb) {
      if (key === "apex_classes" || key === "custom_fields") toolingCb.checked = true;
      else toolingCb.checked = false;
      // v3.79.0: テンプレート起因の auto-toggle も永続化対象 (次回も同じ状態で起動)
      saveSoqlTooling(toolingCb.checked);
    }
    e.target.value = "";
    // v3.71.0: user_id 自動補完の状態を toast で明示 (v3.119.0 Phase 209: my_permission_sets も同パターン対応)
    const needsUserId = (key === "my_open_cases" || key === "my_permission_sets");
    if (needsUserId && !state.userId) {
      panelToast(`📝 SOQL サンプルを挿入しました。⚠ ユーザー ID 未取得のため "REPLACE_USER_ID" を実 ID に書き換えてください`, { kind: "warn" });
    } else if (needsUserId && state.userId) {
      panelToast(`📝 SOQL サンプルを挿入しました (✓ あなたのユーザー ID ${state.userId} を自動補完)`, { kind: "ok" });
    } else {
      panelToast(`📝 SOQL サンプルを挿入しました (元クエリは上書きされました)`, { kind: "ok" });
    }
  });
  // v3.63.0: SOQL 整形ボタン — 主節を大文字化 + 改行で揃え、業務文書として読みやすく
  $on("btnSoqlFormat", "click", () => {
    const ta = document.getElementById("soqlText");
    if (!ta) return;
    const original = ta.value;
    if (!original.trim()) {
      panelToast("📭 整形する SOQL がありません (まずクエリを入力してください)", { kind: "warn" });
      ta.focus();
      return;
    }
    const formatted = formatSoql(original);
    if (formatted === original) {
      panelToast("✓ 既に整形済みです (変更なし)", { kind: "ok" });
      return;
    }
    ta.value = formatted;
    panelToast(`🎨 SOQL を整形しました (${original.length} 文字 → ${formatted.length} 文字)`, { kind: "ok" });
  });
  $on("btnExportCsv", "click", exportCsv);
  $on("btnSoqlEvidence", "click", captureSoqlEvidence);
  $on("btnInspectEvidence", "click", captureInspectorEvidence);
  $on("btnLimitsEvidence", "click", captureLimitsEvidence);
  $on("btnLoginEvidence", "click", captureLoginHistoryEvidence);
  $on("btnApexEvidence", "click", captureApexEvidence);
  $on("btnMetadataEvidence", "click", captureMetadataEvidence);
  $on("btnCopyCsv", "click", copyCsvToClipboard);
  $on("btnSaveSoql", "click", saveCurrentQuery);
  $on("btnLoadSoql", "click", loadSelectedQuery);
  // v2.87.0: SOQL オートコンプリート初期化 (Phase 78)
  setupSoqlAutocomplete();
  // v3.51.0: SOQL / Apex textarea にカーソル位置インジケータ (L:行 C:列) を装着
  attachCursorPositionIndicator("soqlText");
  attachCursorPositionIndicator("apexCode");
  attachCursorPositionIndicator("restBody");
  $on("soqlText", "keydown", (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") doSoql();
  });

  // Describe / REST / Metadata / Logs / Limits
  $on("btnDescribe", "click", doDescribe);
  // v3.185.0 Phase 275: 設計書 MD コピー (タイトル + 統計サマリ + 項目表)
  $on("btnDescribeCopyMd", "click", copyDescribeAsMd);
  // v3.192.0 Phase 282: 🔗 リンクコピー (URL クエリ共有パターン横展開)
  $on("btnDescribeCopyLink", "click", async () => {
    const obj = (document.getElementById("descObj").value || "").trim();
    if (!obj) { panelToast("⚠ オブジェクト API 名を入力してください", { kind: "warn" }); return; }
    try {
      const url = chrome.runtime.getURL(`html/tool.html?view=describe&obj=${encodeURIComponent(obj)}`);
      await navigator.clipboard.writeText(url);
      panelToast(`🔗 ${obj} 構造リンクをコピーしました`, { kind: "ok" });
    } catch (e) { panelToast("❌ リンクコピー失敗: " + (e.message || e), { kind: "err" }); }
  });
  $on("btnSoqlCopyLink", "click", async () => {
    const q = (document.getElementById("soqlText").value || "").trim();
    if (!q) { panelToast("⚠ SOQL を入力してください", { kind: "warn" }); return; }
    try {
      const url = chrome.runtime.getURL(`html/tool.html?view=soql&q=${encodeURIComponent(q)}`);
      await navigator.clipboard.writeText(url);
      panelToast(`🔗 SOQL 実行リンクをコピーしました (${q.length} 文字)`, { kind: "ok" });
    } catch (e) { panelToast("❌ リンクコピー失敗: " + (e.message || e), { kind: "err" }); }
  });
  $on("btnInspectCopyLink", "click", async () => {
    if (!inspectState.id) { panelToast("⚠ Inspector でレコードを開いてから実行してください", { kind: "warn" }); return; }
    try {
      const qp = new URLSearchParams({ view: "inspector", id: inspectState.id });
      if (inspectState.obj) qp.set("obj", inspectState.obj);
      const url = chrome.runtime.getURL(`html/tool.html?${qp.toString()}`);
      await navigator.clipboard.writeText(url);
      panelToast(`🔗 ${inspectState.obj || "?"}:${inspectState.id} の Inspector リンクをコピー`, { kind: "ok" });
    } catch (e) { panelToast("❌ リンクコピー失敗: " + (e.message || e), { kind: "err" }); }
  });
  // v3.208.0 Phase 298: API URL ビルダー 🔗 リンク (?view=apiurl&op=&apiObj=&apiId=)
  $on("btnApiUrlCopyLink", "click", async () => {
    const op = (document.getElementById("apiOp").value || "");
    const apiObj = (document.getElementById("apiObj").value || "").trim();
    const apiId = (document.getElementById("apiId").value || "").trim();
    if (!op) { panelToast("⚠ 操作種別を選択してください", { kind: "warn" }); return; }
    try {
      const qp = new URLSearchParams({ view: "apiurl", op });
      if (apiObj) qp.set("apiObj", apiObj);
      if (apiId) qp.set("apiId", apiId);
      const url = chrome.runtime.getURL(`html/tool.html?${qp.toString()}`);
      await navigator.clipboard.writeText(url);
      panelToast(`🔗 API URL ビルダーリンクをコピー (${op}${apiObj ? ` / ${apiObj}` : ""})`, { kind: "ok" });
    } catch (e) { panelToast("❌ リンクコピー失敗: " + (e.message || e), { kind: "err" }); }
  });
  // v3.207.0 Phase 297: ログイン履歴 🔗 リンク (?view=login&limit=&status=&period=)
  $on("btnLoginCopyLink", "click", async () => {
    const limit = (document.getElementById("loginLimit").value || "50");
    const status = (document.getElementById("loginStatus").value || "");
    const periodEl = document.getElementById("loginPeriod");
    const period = periodEl ? (periodEl.value || "") : "";
    try {
      const qp = new URLSearchParams({ view: "login", limit });
      if (status) qp.set("status", status);
      if (period) qp.set("period", period);
      const url = chrome.runtime.getURL(`html/tool.html?${qp.toString()}`);
      await navigator.clipboard.writeText(url);
      panelToast(`🔗 ログイン履歴リンクをコピー (limit=${limit}${status ? ` / ${status}` : ""}${period ? ` / 直近 ${period} 日` : ""})`, { kind: "ok" });
    } catch (e) { panelToast("❌ リンクコピー失敗: " + (e.message || e), { kind: "err" }); }
  });
  // v3.205.0 Phase 295: Apex 🔗 リンク (?view=apex&code=) — auto-fire 無効、投入のみで停止
  $on("btnApexCopyLink", "click", async () => {
    const code = (document.getElementById("apexCode").value || "").trim();
    if (!code) { panelToast("⚠ Apex コードを入力してください", { kind: "warn" }); return; }
    try {
      const url = chrome.runtime.getURL(`html/tool.html?view=apex&code=${encodeURIComponent(code)}`);
      await navigator.clipboard.writeText(url);
      panelToast(`🔗 Apex リンクをコピー (${code.length} 文字、リンク先で手動実行)`, { kind: "ok" });
    } catch (e) { panelToast("❌ リンクコピー失敗: " + (e.message || e), { kind: "err" }); }
  });
  // v3.195.0 Phase 285: REST API 🔗 リンク (?view=rest&method=&path=&body=)
  $on("btnRestCopyLink", "click", async () => {
    const method = (document.getElementById("restMethod").value || "GET").trim();
    const path = (document.getElementById("restPath").value || "").trim();
    const body = (document.getElementById("restBody").value || "").trim();
    if (!path) { panelToast("⚠ REST API パスを入力してください", { kind: "warn" }); return; }
    try {
      const qp = new URLSearchParams({ view: "rest", method, path });
      if (body) qp.set("body", body);
      const url = chrome.runtime.getURL(`html/tool.html?${qp.toString()}`);
      await navigator.clipboard.writeText(url);
      panelToast(`🔗 REST リンクをコピー (${method} ${path.length > 40 ? path.substring(0, 40) + "…" : path})`, { kind: "ok" });
    } catch (e) { panelToast("❌ リンクコピー失敗: " + (e.message || e), { kind: "err" }); }
  });
  // v3.194.0 Phase 284: 設計書 🔗 リンク (?view=design&type=&target=&format=)
  $on("btnDesignCopyLink", "click", async () => {
    const typeSel = document.getElementById("designType");
    const objInp = document.getElementById("designObj");
    const fmtSel = document.getElementById("designFormat");
    const type = typeSel ? typeSel.value : "";
    const target = objInp ? (objInp.value || "").trim() : "";
    const format = fmtSel ? fmtSel.value : "";
    if (!type) { panelToast("⚠ 設計書の種類を選択してください", { kind: "warn" }); return; }
    try {
      const qp = new URLSearchParams({ view: "design", type });
      if (target) qp.set("target", target);
      if (format) qp.set("format", format);
      const url = chrome.runtime.getURL(`html/tool.html?${qp.toString()}`);
      await navigator.clipboard.writeText(url);
      panelToast(`🔗 設計書リンクをコピー (${type}${target ? ` / ${target}` : ""})`, { kind: "ok" });
    } catch (e) { panelToast("❌ リンクコピー失敗: " + (e.message || e), { kind: "err" }); }
  });
  // v3.193.0 Phase 283: メタデータ一覧 🔗 リンク (?view=metadata&type=)
  $on("btnMetadataCopyLink", "click", async () => {
    const sel = document.getElementById("mdType");
    const type = sel ? sel.value : "";
    if (!type) { panelToast("⚠ メタデータ型を選択してください", { kind: "warn" }); return; }
    try {
      const url = chrome.runtime.getURL(`html/tool.html?view=metadata&type=${encodeURIComponent(type)}`);
      await navigator.clipboard.writeText(url);
      panelToast(`🔗 ${type} メタデータリンクをコピーしました`, { kind: "ok" });
    } catch (e) { panelToast("❌ リンクコピー失敗: " + (e.message || e), { kind: "err" }); }
  });
  $on("btnRest", "click", doRest);
  // v3.125.0 Phase 215: REST クイック実行 (Method+Path 自動セット + 即実行、ユーザー要望「ボタン実行で SF に投げる」)
  $on("restTemplate", "change", (e) => {
    const key = e.target.value;
    if (!key) return;
    const apiVer = state.apiVersion || "62.0";
    const REST_QUICK = {
      limits: { method: "GET", path: `/services/data/v${apiVer}/limits` },
      userinfo: { method: "GET", path: `/services/data/v${apiVer}/chatter/users/me` },
      org: { method: "GET", path: `/services/data/v${apiVer}/sobjects/Organization` },
      sobjects: { method: "GET", path: `/services/data/v${apiVer}/sobjects` },
      installed_packages: { method: "GET", path: `/services/data/v${apiVer}/tooling/sobjects/InstalledSubscriberPackage` },
      async_jobs: { method: "GET", path: `/services/data/v${apiVer}/tooling/sobjects/AsyncApexJob` },
      bulk_jobs: { method: "GET", path: `/services/data/v${apiVer}/jobs/ingest` },
      versions: { method: "GET", path: `/services/data` },
      // v3.215.0 Phase 305: 追加 3 種
      recent: { method: "GET", path: `/services/data/v${apiVer}/recent` },
      theme: { method: "GET", path: `/services/data/v${apiVer}/theme` },
      actions: { method: "GET", path: `/services/data/v${apiVer}/actions` },
    };
    const tpl = REST_QUICK[key];
    if (!tpl) return;
    const m = document.getElementById("restMethod");
    const p = document.getElementById("restPath");
    const b = document.getElementById("restBody");
    if (m) m.value = tpl.method;
    if (p) p.value = tpl.path;
    if (b) b.value = ""; // GET なので body クリア
    e.target.value = "";
    panelToast(`📡 REST クイック実行: ${tpl.method} ${tpl.path}`, { kind: "ok" });
    // 即実行
    doRest();
  });
  $on("btnMetadata", "click", doMetadataList);
  // v3.78.0: メタデータ型を変えた瞬間に永続化 (一覧取得を押さなくても次回起動時に復元される)
  $on("mdType", "change", (e) => { saveMdType(e.target.value); });
  // v3.79.0: Tooling API チェック状態を変えた瞬間に永続化 (10 種達成)
  $on("useTooling", "change", (e) => { saveSoqlTooling(e.target.checked); });
  // v3.80.0: Apex Debug ログ取得チェック状態を変えた瞬間に永続化 (11 種)
  $on("apexFetchLog", "change", (e) => { saveApexFetchLog(e.target.checked); });
  $on("btnFetchLogs", "click", doFetchLogs);
  $on("btnEnableDebug", "click", doEnableDebug);
  $on("btnLimits", "click", doLimits);

  // Apex
  $on("btnRunApex", "click", doRunApex);
  // v3.64.0: Apex コード整形ボタン
  $on("btnApexFormat", "click", () => {
    const ta = document.getElementById("apexCode");
    if (!ta) return;
    const original = ta.value;
    if (!original.trim()) {
      panelToast("📭 整形する Apex コードがありません (まずコードを入力してください)", { kind: "warn" });
      ta.focus();
      return;
    }
    const formatted = formatApex(original);
    if (formatted === original) {
      panelToast("✓ 既に整形済みです (変更なし)", { kind: "ok" });
      return;
    }
    ta.value = formatted;
    panelToast(`🎨 Apex を整形しました (${original.length} 文字 → ${formatted.length} 文字)`, { kind: "ok" });
  });
  $on("btnSaveApex", "click", saveCurrentApex);
  // v3.69.0: Apex テンプレート挿入 — よく使う 6 種の業務 Apex を 1 クリックで textarea へ
  $on("apexTemplate", "change", (e) => {
    const key = e.target.value;
    if (!key) return;
    const TEMPLATES = {
      userinfo: `// 👤 現在ユーザー情報を表示\nSystem.debug('Name: ' + UserInfo.getName());\nSystem.debug('Email: ' + UserInfo.getUserEmail());\nSystem.debug('Profile Id: ' + UserInfo.getProfileId());\nSystem.debug('User Id: ' + UserInfo.getUserId());\nSystem.debug('Organization Id: ' + UserInfo.getOrganizationId());`,
      limits: `// 📊 ガバナ制限の使用状況を確認 (匿名 Apex 自体の使用量)\nSystem.debug('SOQL queries: ' + Limits.getQueries() + ' / ' + Limits.getLimitQueries());\nSystem.debug('DML statements: ' + Limits.getDmlStatements() + ' / ' + Limits.getLimitDmlStatements());\nSystem.debug('CPU time (ms): ' + Limits.getCpuTime() + ' / ' + Limits.getLimitCpuTime());\nSystem.debug('Heap size: ' + Limits.getHeapSize() + ' / ' + Limits.getLimitHeapSize());`,
      latest_account: `// 🏢 最新の取引先 1 件を取得\nAccount a = [\n  SELECT Id, Name, Industry, CreatedDate\n  FROM Account\n  ORDER BY CreatedDate DESC\n  LIMIT 1\n];\nSystem.debug('Latest Account: ' + JSON.serializePretty(a));`,
      delete_test: `// 🗑️ Test% 取引先を削除 (要注意: 本番では実行前に必ず確認)\nList<Account> testAccts = [SELECT Id FROM Account WHERE Name LIKE 'Test%' LIMIT 200];\nSystem.debug('削除対象: ' + testAccts.size() + ' 件');\nif (!testAccts.isEmpty()) {\n  DELETE testAccts;\n  System.debug('削除完了');\n}`,
      batch_run: `// 🔄 バッチ実行のサンプル (MyBatchClass は事前にデプロイ済みであること)\n// Id jobId = Database.executeBatch(new MyBatchClass(), 200);\n// System.debug('バッチジョブ ID: ' + jobId);\n\n// 代替: AsyncApexJob から最近のジョブを確認\nList<AsyncApexJob> jobs = [\n  SELECT Id, ApexClass.Name, Status, JobItemsProcessed, TotalJobItems, CreatedDate\n  FROM AsyncApexJob\n  WHERE JobType = 'BatchApex'\n  ORDER BY CreatedDate DESC\n  LIMIT 5\n];\nfor (AsyncApexJob j : jobs) {\n  System.debug(j.ApexClass.Name + ' | ' + j.Status + ' | ' + j.JobItemsProcessed + '/' + j.TotalJobItems);\n}`,
      schedule_check: `// ⏰ スケジュール済みジョブを確認\nList<CronTrigger> jobs = [\n  SELECT Id, CronJobDetail.Name, State, NextFireTime, PreviousFireTime, TimesTriggered\n  FROM CronTrigger\n  ORDER BY NextFireTime ASC NULLS LAST\n];\nSystem.debug('スケジュール済みジョブ: ' + jobs.size() + ' 件');\nfor (CronTrigger j : jobs) {\n  System.debug(j.CronJobDetail.Name + ' | ' + j.State + ' | 次回: ' + j.NextFireTime + ' | 累計: ' + j.TimesTriggered);\n}`,
      // v3.120.0 Phase 210: 業務監査・運用系 Apex テンプレ 5 種追加 (現 6 → 11 種)
      schema_count: `// 📐 SObject 数・カスタムオブジェクト数を把握 (組織複雑度の指標)\nMap<String, Schema.SObjectType> all = Schema.getGlobalDescribe();\nInteger totalObjs = all.size();\nInteger customObjs = 0;\nfor (String n : all.keySet()) { if (n.endsWith('__c')) customObjs++; }\nSystem.debug('全 SObject 数: ' + totalObjs);\nSystem.debug('カスタムオブジェクト数: ' + customObjs);\nSystem.debug('標準オブジェクト数: ' + (totalObjs - customObjs));`,
      org_info: `// 🏢 組織情報サマリ (Edition / 言語 / タイムゾーン / 通貨)\nOrganization org = [\n  SELECT Id, Name, OrganizationType, InstanceName, LanguageLocaleKey,\n         TimeZoneSidKey, DefaultCurrencyIsoCode, IsSandbox, FiscalYearStartMonth\n  FROM Organization\n  LIMIT 1\n];\nSystem.debug('組織名: ' + org.Name);\nSystem.debug('Edition: ' + org.OrganizationType + (org.IsSandbox ? ' (Sandbox)' : ' (Production)'));\nSystem.debug('Instance: ' + org.InstanceName);\nSystem.debug('言語/タイムゾーン: ' + org.LanguageLocaleKey + ' / ' + org.TimeZoneSidKey);\nSystem.debug('通貨: ' + org.DefaultCurrencyIsoCode);\nSystem.debug('会計年度開始月: ' + org.FiscalYearStartMonth);`,
      profile_summary: `// 👥 プロファイル一覧 (アクティブユーザー数付き、ガバナンス監査)\nList<AggregateResult> ar = [\n  SELECT Profile.Name profile, COUNT(Id) cnt\n  FROM User\n  WHERE IsActive = true\n  GROUP BY Profile.Name\n  ORDER BY COUNT(Id) DESC\n];\nSystem.debug('アクティブユーザーのプロファイル分布 (' + ar.size() + ' 種類):');\nfor (AggregateResult a : ar) {\n  System.debug('  ' + a.get('profile') + ': ' + a.get('cnt') + ' 名');\n}`,
      apex_governor_test: `// 🧪 Apex ガバナ制限 (同期) の実態確認 — このコードで実際に何が消費されるか可視化\nLong t0 = System.currentTimeMillis();\n// 軽量な SOQL を 3 回実行 (例)\nfor (Integer i = 0; i < 3; i++) {\n  Integer c = [SELECT COUNT() FROM Account LIMIT 100];\n}\nSystem.debug('=== このトランザクションのガバナ消費 ===');\nSystem.debug('SOQL queries: ' + Limits.getQueries() + ' / ' + Limits.getLimitQueries() + ' (100)');\nSystem.debug('SOQL rows: ' + Limits.getQueryRows() + ' / ' + Limits.getLimitQueryRows() + ' (50,000)');\nSystem.debug('DML statements: ' + Limits.getDmlStatements() + ' / ' + Limits.getLimitDmlStatements() + ' (150)');\nSystem.debug('CPU time (ms): ' + Limits.getCpuTime() + ' / ' + Limits.getLimitCpuTime() + ' (10,000)');\nSystem.debug('Heap size: ' + Limits.getHeapSize() + ' / ' + Limits.getLimitHeapSize() + ' (6 MB)');\nSystem.debug('実行時間 (ms): ' + (System.currentTimeMillis() - t0));`,
      abort_all_jobs: `// 🛑 全 CronTrigger をキャンセル (要注意: スケジュール済みジョブが全停止)\nList<CronTrigger> jobs = [SELECT Id, CronJobDetail.Name, State FROM CronTrigger WHERE State NOT IN ('COMPLETE', 'ERROR', 'DELETED')];\nSystem.debug('停止対象ジョブ: ' + jobs.size() + ' 件');\nfor (CronTrigger j : jobs) {\n  System.debug('  ' + j.CronJobDetail.Name + ' (' + j.State + ')');\n}\n// 実行する場合は次のコメントを外す (取消不可!)\n// for (CronTrigger j : jobs) { System.abortJob(j.Id); }\n// System.debug('全ジョブを停止しました');`,
      // v3.121.0 Phase 211: ユーザー管理一括操作 Apex テンプレ 3 種追加 (要 ユーザー Id リスト)
      bulk_freeze_users: `// ❄️ ユーザー一括凍結 (UserLogin.IsFrozen = true) — ログインのみ禁止、ライセンスは保持\n// 業務シナリオ: 退職予定者の一時凍結、休職対応、不正アクセス疑い時の緊急ロック\nList<Id> userIds = new List<Id>{\n  '0051x00000abcd1AAA', // ← 凍結したいユーザー Id を列挙\n  '0051x00000abcd2AAB'\n};\nList<UserLogin> logins = [SELECT Id, UserId, IsFrozen FROM UserLogin WHERE UserId IN :userIds];\nfor (UserLogin l : logins) { l.IsFrozen = true; }\nSystem.debug('凍結対象: ' + logins.size() + ' 件');\n// 実行する場合は次のコメントを外す\n// UPDATE logins;\n// System.debug('凍結完了');`,
      bulk_unfreeze_users: `// 🔓 ユーザー一括凍結解除 (UserLogin.IsFrozen = false)\n// 業務シナリオ: 復職対応、誤凍結の解除\nList<Id> userIds = new List<Id>{\n  '0051x00000abcd1AAA',\n  '0051x00000abcd2AAB'\n};\nList<UserLogin> logins = [SELECT Id, UserId, IsFrozen FROM UserLogin WHERE UserId IN :userIds];\nfor (UserLogin l : logins) { l.IsFrozen = false; }\nSystem.debug('解除対象: ' + logins.size() + ' 件');\n// 実行する場合は次のコメントを外す\n// UPDATE logins;\n// System.debug('解除完了');`,
      bulk_deactivate_users: `// 🚫 ユーザー一括無効化 (IsActive = false) — ライセンス開放、ログイン履歴維持\n// 業務シナリオ: 退職者一括処理、長期休職、組織再編\n// ⚠ 注意: 無効化したユーザーが Approver 等になっている場合は事前に別ユーザーへの移管が必要\nList<Id> userIds = new List<Id>{\n  '0051x00000abcd1AAA',\n  '0051x00000abcd2AAB'\n};\nList<User> users = [SELECT Id, Name, IsActive FROM User WHERE Id IN :userIds AND IsActive = true];\nfor (User u : users) { u.IsActive = false; }\nSystem.debug('無効化対象: ' + users.size() + ' 件');\nfor (User u : users) { System.debug('  ' + u.Name); }\n// 実行する場合は次のコメントを外す\n// UPDATE users;\n// System.debug('無効化完了');`,
      // v3.146.0 Phase 236: ストレージ削減系 Apex テンプレ 3 種追加 (Phase 235 admin ストレージ詳細と連携)
      large_files_cleanup: `// 📁 大型 ContentVersion (50 MB 超) の削除候補抽出 — admin 「📁 ストレージ詳細」と連携\n// 業務シナリオ: ストレージ容量逼迫時の即時削減、不要な大型動画/ZIP の特定\nList<ContentDocument> bigDocs = new List<ContentDocument>();\nList<ContentVersion> bigVers = [\n  SELECT Id, ContentDocumentId, Title, FileExtension, ContentSize, CreatedDate, CreatedBy.Name\n  FROM ContentVersion\n  WHERE IsLatest = true AND ContentSize > 52428800 // 50 MB\n  ORDER BY ContentSize DESC\n  LIMIT 50\n];\nSystem.debug('=== 50 MB 超のファイル: ' + bigVers.size() + ' 件 ===');\nLong totalBytes = 0;\nfor (ContentVersion cv : bigVers) {\n  totalBytes += cv.ContentSize;\n  System.debug('  ' + cv.Title + ' (' + cv.FileExtension + ', ' + (cv.ContentSize / 1024 / 1024) + ' MB, ' + cv.CreatedBy.Name + ', ' + cv.CreatedDate.format('yyyy-MM-dd') + ')');\n}\nSystem.debug('合計サイズ: ' + (totalBytes / 1024 / 1024 / 1024) + ' GB');\n// 実行する場合 (ContentDocument を削除すると関連 ContentVersion も連動削除):\n// Set<Id> docIds = new Set<Id>();\n// for (ContentVersion cv : bigVers) docIds.add(cv.ContentDocumentId);\n// List<ContentDocument> docsToDel = [SELECT Id FROM ContentDocument WHERE Id IN :docIds];\n// DELETE docsToDel;\n// System.debug('削除完了: ' + docsToDel.size() + ' 件');`,
      old_attachment_cleanup: `// 🗑️ 古い Attachment (旧形式の添付) 削除候補抽出 — 365 日以上更新なし\n// 業務シナリオ: 旧 Attachment から ContentDocument 移行後の残骸クリーンアップ\n// ⚠ Attachment は Salesforce が ContentDocument に統合移行中、新規実装には ContentDocument 推奨\nList<Attachment> oldAtts = [\n  SELECT Id, Name, BodyLength, ParentId, CreatedDate, CreatedBy.Name\n  FROM Attachment\n  WHERE LastModifiedDate < LAST_N_DAYS:365\n  ORDER BY BodyLength DESC\n  LIMIT 200\n];\nSystem.debug('=== 365 日以上未更新の Attachment: ' + oldAtts.size() + ' 件 ===');\nLong totalBytes = 0;\nfor (Attachment a : oldAtts) {\n  totalBytes += a.BodyLength;\n  System.debug('  ' + a.Name + ' (' + (a.BodyLength / 1024) + ' KB, parent=' + a.ParentId + ', ' + a.CreatedBy.Name + ')');\n}\nSystem.debug('合計サイズ: ' + (totalBytes / 1024 / 1024) + ' MB');\n// 実行する場合は次のコメントを外す:\n// DELETE oldAtts;\n// System.debug('削除完了');`,
      empty_records_cleanup: `// 🧹 空の Account (取引先) 削除候補抽出 — 関連レコード 0 件 + 過去 1 年活動なし\n// 業務シナリオ: ダミーデータ・テストデータ・ゴミデータの一掃 (本番組織での実行は要慎重)\n// ⚠ 関連レコード判定が緩い (Contact / Opportunity / Case のみ)、他オブジェクトとの関連は別途確認\nList<Account> emptyAccts = [\n  SELECT Id, Name, CreatedDate, LastActivityDate,\n         (SELECT Id FROM Contacts LIMIT 1),\n         (SELECT Id FROM Opportunities LIMIT 1),\n         (SELECT Id FROM Cases LIMIT 1)\n  FROM Account\n  WHERE LastActivityDate < LAST_N_DAYS:365 OR LastActivityDate = null\n  ORDER BY CreatedDate ASC\n  LIMIT 200\n];\nList<Account> trulyEmpty = new List<Account>();\nfor (Account a : emptyAccts) {\n  if (a.Contacts.isEmpty() && a.Opportunities.isEmpty() && a.Cases.isEmpty()) {\n    trulyEmpty.add(a);\n  }\n}\nSystem.debug('=== 完全に空の Account: ' + trulyEmpty.size() + ' / 抽出 ' + emptyAccts.size() + ' 件 ===');\nfor (Account a : trulyEmpty.subList(0, Math.min(20, trulyEmpty.size()))) {\n  System.debug('  ' + a.Name + ' (作成: ' + a.CreatedDate.format('yyyy-MM-dd') + ')');\n}\n// 実行する場合は次のコメントを外す (関連レコード 0 件のみ削除):\n// DELETE trulyEmpty;\n// System.debug('削除完了: ' + trulyEmpty.size() + ' 件');`,
      // v3.217.0 Phase 307: 監査・運用系 Apex テンプレ 3 種追加
      count_record_types: `// 📋 RecordType 数の SObject 別集計 (組織複雑度監査)\n// 業務シナリオ: 多すぎる RecordType の整理、業務プロセス棚卸\nList<AggregateResult> ar = [\n  SELECT SobjectType obj, COUNT(Id) cnt\n  FROM RecordType\n  WHERE IsActive = true\n  GROUP BY SobjectType\n  ORDER BY COUNT(Id) DESC\n];\nSystem.debug('=== Active RecordType の SObject 別集計 (' + ar.size() + ' SObject) ===');\nInteger total = 0;\nfor (AggregateResult a : ar) {\n  Integer c = (Integer) a.get('cnt');\n  total += c;\n  System.debug('  ' + a.get('obj') + ': ' + c + ' 種');\n}\nSystem.debug('合計 Active RecordType: ' + total + ' 種');`,
      list_named_credentials: `// 🔌 NamedCredential 一覧 (外部 API 連携監査)\n// 業務シナリオ: 外部システム連携先の棚卸、未使用 NamedCredential の特定\nList<NamedCredential> ncs = [\n  SELECT Id, MasterLabel, DeveloperName, Endpoint, PrincipalType, AuthProviderId, CreatedDate, LastModifiedDate\n  FROM NamedCredential\n  ORDER BY MasterLabel\n];\nSystem.debug('=== NamedCredential 一覧 (' + ncs.size() + ' 件) ===');\nfor (NamedCredential nc : ncs) {\n  System.debug('  ' + nc.MasterLabel + ' (API: ' + nc.DeveloperName + ')');\n  System.debug('    Endpoint: ' + nc.Endpoint);\n  System.debug('    PrincipalType: ' + nc.PrincipalType);\n  System.debug('    AuthProvider: ' + nc.AuthProviderId);\n  System.debug('    最終更新: ' + nc.LastModifiedDate.format('yyyy-MM-dd'));\n}`,
      recent_login_failures: `// 🚨 過去 24h の失敗ログイン集計 (セキュリティ監査)\n// 業務シナリオ: ブルートフォース検知、誤入力パスワードの追跡、アカウントロック調査\nList<AggregateResult> ar = [\n  SELECT UserId user_id, Username uname, COUNT(Id) cnt, MAX(LoginTime) last_attempt, SourceIp ip\n  FROM LoginHistory\n  WHERE Status != 'Success' AND LoginTime > :Datetime.now().addHours(-24)\n  GROUP BY UserId, Username, SourceIp\n  HAVING COUNT(Id) >= 1\n  ORDER BY COUNT(Id) DESC\n  LIMIT 50\n];\nSystem.debug('=== 過去 24h 失敗ログイン集計 (Top 50) ===');\nfor (AggregateResult a : ar) {\n  System.debug('  ' + a.get('uname') + ' / IP=' + a.get('ip') + ': ' + a.get('cnt') + ' 回 (最終: ' + a.get('last_attempt') + ')');\n}\nSystem.debug('合計: ' + ar.size() + ' 件のユーザー/IP 組合せに失敗ログイン記録あり');`,
    };
    const code = TEMPLATES[key];
    if (!code) return;
    const ta = document.getElementById("apexCode");
    if (ta) {
      ta.value = code;
      ta.focus();
      ta.dispatchEvent(new Event("input", { bubbles: true })); // カーソル位置インジケータ等を更新
    }
    e.target.value = ""; // 選択をリセットして「再選択時も発火」できるように
    const label = e.target.options[e.target.selectedIndex]?.textContent || key;
    panelToast(`📝 サンプルを挿入しました (元コードは上書きされました)`, { kind: "ok" });
  });
  $on("btnLoadApex", "click", loadSelectedApex);
  $on("btnApexCopy", "click", async () => {
    const resultEl = document.getElementById("apexResult");
    const txt = (resultEl && resultEl.textContent) || "";
    if (!txt) { panelToast("📭 コピーする結果がありません", { kind: "warn" }); return; }
    try {
      await navigator.clipboard.writeText(txt);
      panelToast(`📋 Apex の実行結果をコピーしました (${txt.length.toLocaleString()} 文字)`, { kind: "ok" });
    } catch (e) { panelToast("❌ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" }); }
  });
  // v3.172.0 Phase 262: Apex コード + 実行結果を Markdown 形式でコピー (REST Phase 261 と整合)
  $on("btnApexCopyMd", "click", async () => {
    const resultEl = document.getElementById("apexResult");
    const codeEl = document.getElementById("apexCode");
    const result = (resultEl && resultEl.textContent) || "";
    const code = (codeEl && codeEl.value) || "";
    if (!result.trim() && !code.trim()) { panelToast("📭 コピーする内容がありません (Apex コードまたは実行結果が必要)", { kind: "warn" }); return; }
    const parts = [];
    parts.push("## 匿名 Apex 実行");
    parts.push("");
    if (code.trim()) {
      parts.push("### コード");
      parts.push("");
      parts.push("```apex");
      parts.push(code.trim());
      parts.push("```");
      parts.push("");
    }
    if (result.trim()) {
      parts.push("### 実行結果 / Debug ログ");
      parts.push("");
      parts.push("```");
      parts.push(result.trim());
      parts.push("```");
    }
    const md = parts.join("\n");
    try {
      await navigator.clipboard.writeText(md);
      panelToast(`📝 Apex を Markdown 形式でコピーしました (${md.length.toLocaleString()} 文字、code + result セクション付き)`, { kind: "ok" });
    } catch (e) { panelToast("❌ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" }); }
  });
  // v3.62.0: Apex Debug ログから「エラーのみ」抽出するトグルボタン
  // パターン: USER_DEBUG ERROR / FATAL_ERROR / EXCEPTION_THROWN / LIMIT_USAGE / SYSTEM.EXCEPTION
  // 状態: aria-pressed=false (全表示) / true (エラーのみ)、フルログは _apexFullLog にバックアップ
  let _apexFullLog = null;
  $on("btnApexErrorsOnly", "click", () => {
    const resultEl = document.getElementById("apexResult");
    if (!resultEl) return;
    const btn = document.getElementById("btnApexErrorsOnly");
    const pressed = btn.getAttribute("aria-pressed") === "true";
    if (pressed) {
      // 復元
      if (_apexFullLog != null) resultEl.textContent = _apexFullLog;
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = "⚠ エラーのみ";
      panelToast("📜 全ログ表示に戻しました", { kind: "ok" });
      return;
    }
    const full = resultEl.textContent || "";
    if (!full.trim()) { panelToast("📭 抽出する Apex ログがありません (まず Apex を実行してください)", { kind: "warn" }); return; }
    _apexFullLog = full;
    const lines = full.split(/\r?\n/);
    const ERR_RE = /USER_DEBUG.*\|\s*ERROR\b|FATAL_ERROR|EXCEPTION_THROWN|LIMIT_USAGE_FOR_NS|SYSTEM\.EXCEPTION|System\.LimitException|FAILURE|\bWARN\b|\bERROR\b/i;
    const matched = lines.filter((l) => ERR_RE.test(l));
    if (!matched.length) {
      panelToast("✓ エラー/警告行はありません (すべて正常実行)", { kind: "ok" });
      return;
    }
    resultEl.textContent = `===== ⚠ エラー/警告行のみ (${matched.length} / ${lines.length} 行) =====\n` + matched.join("\n") +
      `\n\n===== 「⚠ エラーのみ」ボタンを再クリックで全ログ表示に戻る =====`;
    btn.setAttribute("aria-pressed", "true");
    btn.textContent = "📜 全ログ表示";
    panelToast(`⚠ エラー/警告 ${matched.length} 行を抽出しました (元 ${lines.length} 行)`, { kind: "ok" });
  });
  // v3.157.0 Phase 247: Apex Debug ログから USER_DEBUG 行のみを抽出するトグル (System.debug() 出力だけ)
  $on("btnApexDebugOnly", "click", () => {
    const resultEl = document.getElementById("apexResult");
    if (!resultEl) return;
    const btn = document.getElementById("btnApexDebugOnly");
    const pressed = btn.getAttribute("aria-pressed") === "true";
    if (pressed) {
      // 復元: _apexFullLog (エラーフィルタと共有のバックアップ) があれば使用
      if (_apexFullLog != null) resultEl.textContent = _apexFullLog;
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = "💬 DEBUG のみ";
      panelToast("📜 全ログ表示に戻しました", { kind: "ok" });
      return;
    }
    const full = resultEl.textContent || "";
    if (!full.trim()) { panelToast("📭 抽出する Apex ログがありません (まず Apex を実行してください)", { kind: "warn" }); return; }
    // エラーフィルタが ON ならいったん復元してから USER_DEBUG に切替
    const errBtn = document.getElementById("btnApexErrorsOnly");
    if (errBtn && errBtn.getAttribute("aria-pressed") === "true") {
      if (_apexFullLog != null) resultEl.textContent = _apexFullLog;
      errBtn.setAttribute("aria-pressed", "false");
      errBtn.textContent = "⚠ エラーのみ";
    } else {
      _apexFullLog = full;
    }
    const fullNow = resultEl.textContent || "";
    const lines = fullNow.split(/\r?\n/);
    const DBG_RE = /USER_DEBUG/;
    const matched = lines.filter((l) => DBG_RE.test(l));
    if (!matched.length) {
      panelToast("📭 USER_DEBUG 行が見つかりませんでした (System.debug() を Apex コード内で呼び出してください)", { kind: "warn" });
      return;
    }
    resultEl.textContent = `===== 💬 USER_DEBUG 行のみ (${matched.length} / ${lines.length} 行) =====\n` + matched.join("\n") +
      `\n\n===== 「💬 DEBUG のみ」ボタンを再クリックで全ログ表示に戻る =====`;
    btn.setAttribute("aria-pressed", "true");
    btn.textContent = "📜 全ログ表示";
    panelToast(`💬 USER_DEBUG ${matched.length} 行を抽出しました (元 ${lines.length} 行)`, { kind: "ok" });
  });
  // v3.164.0 Phase 254: Apex Debug ログから「リミット消費」行のみを抽出 (LIMIT_USAGE / cumulative_limit_usage / SOQL queries / CPU time / Heap / DML / Email)
  $on("btnApexLimitsOnly", "click", () => {
    const resultEl = document.getElementById("apexResult");
    if (!resultEl) return;
    const btn = document.getElementById("btnApexLimitsOnly");
    const pressed = btn.getAttribute("aria-pressed") === "true";
    if (pressed) {
      if (_apexFullLog != null) resultEl.textContent = _apexFullLog;
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = "📊 リミット消費";
      panelToast("📜 全ログ表示に戻しました", { kind: "ok" });
      return;
    }
    const full = resultEl.textContent || "";
    if (!full.trim()) { panelToast("📭 抽出する Apex ログがありません (まず Apex を実行してください)", { kind: "warn" }); return; }
    // 他フィルタ ON なら復元してから処理
    ["btnApexErrorsOnly", "btnApexDebugOnly"].forEach((id) => {
      const b = document.getElementById(id);
      if (b && b.getAttribute("aria-pressed") === "true") {
        if (_apexFullLog != null) resultEl.textContent = _apexFullLog;
        b.setAttribute("aria-pressed", "false");
        b.textContent = id === "btnApexErrorsOnly" ? "⚠ エラーのみ" : "💬 DEBUG のみ";
      }
    });
    if (_apexFullLog == null) _apexFullLog = full;
    const fullNow = resultEl.textContent || "";
    const lines = fullNow.split(/\r?\n/);
    // リミット消費行のパターン:
    // - LIMIT_USAGE_FOR_NS|(default)|... (ガバナ消費サマリ)
    // - Number of SOQL queries: 5 out of 100
    // - Maximum CPU time: 2345 out of 10000
    // - Maximum heap size: 1234 out of 6000000
    // - Number of DML statements: 0 out of 150
    // - Number of Email Invocations: 0 out of 10
    // - cumulative_limit_usage (匿名 Apex 末尾の集計)
    const LIM_RE = /LIMIT_USAGE_FOR_NS|cumulative_limit_usage|Number of (SOQL queries|DML statements|DML rows|query rows|Future calls|Mobile Apex push calls|Email Invocations|Aggregate queries|SOSL queries|callouts|chained Apex jobs)|Maximum (CPU time|heap size|stack depth)|Number of (Async)? ?Apex |LIMIT_USAGE_FOR|^[\s|]*\* /i;
    const matched = lines.filter((l) => LIM_RE.test(l));
    if (!matched.length) {
      panelToast("📭 リミット消費行が見つかりませんでした (まず Apex を実行 + Debug ログを有効化してください)", { kind: "warn" });
      return;
    }
    resultEl.textContent = `===== 📊 リミット消費 (${matched.length} / ${lines.length} 行) =====\n` + matched.join("\n") +
      `\n\n===== 「📊 リミット消費」ボタンを再クリックで全ログ表示に戻る =====\n💡 ヒント: 「Number of SOQL queries: 5 out of 100」のような行で消費率を確認 — 80% 超は要最適化検討`;
    btn.setAttribute("aria-pressed", "true");
    btn.textContent = "📜 全ログ表示";
    panelToast(`📊 リミット消費 ${matched.length} 行を抽出しました (元 ${lines.length} 行)`, { kind: "ok" });
  });
  $on("btnRestCopy", "click", async () => {
    const resultEl = document.getElementById("restResult");
    const txt = (resultEl && resultEl.textContent) || "";
    if (!txt) { panelToast("📭 コピーする結果がありません", { kind: "warn" }); return; }
    try {
      await navigator.clipboard.writeText(txt);
      panelToast(`📋 REST のレスポンスをコピーしました (${txt.length.toLocaleString()} 文字)`, { kind: "ok" });
    } catch (e) { panelToast("❌ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" }); }
  });
  // v3.171.0 Phase 261: REST レスポンスを Markdown コードブロック形式でコピー
  $on("btnRestCopyMd", "click", async () => {
    const resultEl = document.getElementById("restResult");
    const txt = (resultEl && resultEl.textContent) || "";
    if (!txt.trim()) { panelToast("📭 コピーする結果がありません", { kind: "warn" }); return; }
    // メソッド + パスをコンテキストとして含める
    const method = (document.getElementById("restMethod") || {}).value || "?";
    const path = (document.getElementById("restPath") || {}).value || "";
    // JSON 判定 (先頭が { or [ かどうか)
    const lang = /^\s*[{\[]/.test(txt) ? "json" : "text";
    const header = path ? `## REST ${method} ${path}\n\n` : "";
    const md = `${header}\`\`\`${lang}\n${txt}\n\`\`\``;
    try {
      await navigator.clipboard.writeText(md);
      panelToast(`📝 Markdown 形式でコピーしました (${md.length.toLocaleString()} 文字、\`\`\`${lang}\`\`\` ブロック付き)`, { kind: "ok" });
    } catch (e) { panelToast("❌ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" }); }
  });
  const apexCodeEl = document.getElementById("apexCode");
  if (apexCodeEl) enableTabToSpaces(apexCodeEl);
  // v3.82.0: Apex textarea の入力中 draft 自動保存 (Phase 171 SOQL と同パターン)
  if (apexCodeEl) apexCodeEl.addEventListener("input", () => scheduleSaveApexDraft(apexCodeEl.value));
  const soqlTextEl = document.getElementById("soqlText");
  if (soqlTextEl) enableTabToSpaces(soqlTextEl);
  // v3.81.0: SOQL textarea の入力中 draft 自動保存 (300ms debounce)
  if (soqlTextEl) soqlTextEl.addEventListener("input", () => scheduleSaveSoqlDraft(soqlTextEl.value));
  // v3.83.0: REST API body textarea の入力中 draft 自動保存 (3 連 textarea 完全救済)
  const restBodyEl = document.getElementById("restBody");
  if (restBodyEl) restBodyEl.addEventListener("input", () => scheduleSaveRestBodyDraft(restBodyEl.value));
  $on("apexCode", "keydown", (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") doRunApex();
  });
  // LoginHistory
  $on("btnFetchLogin", "click", doFetchLoginHistory);
  $on("btnLoginCsv", "click", exportLoginCsv);
  // v3.175.0 Phase 265: ログイン履歴 Markdown コピー (Markdown 機能 8 箇所目)
  $on("btnLoginCopyMd", "click", copyLoginHistoryMd);
  // v3.177.0 Phase 267: Apex Debug ログ一覧 Markdown コピー (Markdown 機能 10 箇所目 🎊)
  $on("btnLogsCopyMd", "click", () => copyResultTableAsMd("logsResult", "Apex Debug ログ一覧"));
  // v3.176.0 Phase 266: メタデータ一覧 Markdown コピー (Markdown 機能 9 箇所目)
  $on("btnMetadataCopyMd", "click", async () => {
    const resultEl = document.getElementById("metadataResult");
    const table = resultEl ? resultEl.querySelector("table") : null;
    if (!table) {
      panelToast("📭 メタデータ一覧が未取得です。先に「一覧取得」を押してください", { kind: "warn" });
      return;
    }
    // 既存テーブルから直接 thead/tbody を Markdown 化 (recordsTable() の動的テーブル構造に依存)
    const ths = Array.from(table.querySelectorAll("thead th"));
    const headers = ths.map((th) => th.textContent.trim()).filter((h) => h && !["", "選択"].includes(h));
    // ID 列を除外 (Markdown では冗長)
    const trs = Array.from(table.querySelectorAll("tbody tr"));
    const lines = [];
    const mdType = (document.getElementById("mdType") || {}).value || "metadata";
    lines.push(`## メタデータ一覧: ${mdType}`);
    lines.push("");
    lines.push(`_取得日時: ${new Date().toLocaleString("ja-JP")} / 件数: ${trs.length}_`);
    lines.push("");
    lines.push("| " + headers.map((h) => h.replace(/\|/g, "\\|")).join(" | ") + " |");
    lines.push("|" + headers.map(() => "---").join("|") + "|");
    for (const tr of trs) {
      const tds = Array.from(tr.querySelectorAll("td"));
      // header と同数のセルを取り出し、各セルのテキスト
      const cells = tds.slice(0, headers.length + 2); // 先頭にチェックボックス列があるかもしれない
      // ヘッダー数だけ末尾から取り出す (チェックボックス列除外)
      const adjusted = cells.length > headers.length ? cells.slice(cells.length - headers.length) : cells;
      const row = adjusted.slice(0, headers.length).map((td) => (td.textContent || "").trim().replace(/\|/g, "\\|").replace(/\r?\n/g, " "));
      while (row.length < headers.length) row.push("");
      lines.push("| " + row.join(" | ") + " |");
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      panelToast(`📝 メタデータ一覧 Markdown をコピーしました (${trs.length} 件)`, { kind: "ok" });
    } catch (e) {
      panelToast("❌ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" });
    }
  });

  // v3.137.0 Phase 227 (Team G2): グローバル検索 (SOSL)
  $on("btnSearch", "click", doGlobalSearch);
  $on("searchQuery", "keydown", (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doGlobalSearch(); }
  });

  // v3.138.0 Phase 228 (Team U2): レコード抽出モード切替タブ (SOQL ⇄ 項目選択)
  document.querySelectorAll(".extract-mode-tab[data-go]").forEach((b) => {
    b.addEventListener("click", () => {
      const target = b.dataset.go;
      if (target) switchToView(target);
    });
  });

  // v3.129.0 Phase 219 (Team U): ユーザー・ライセンス管理ダッシュボード
  $on("btnAdminOrgInfo", "click", doAdminOrgInfo);
  $on("btnAdminLicenses", "click", doAdminLicenses);
  $on("btnAdminPermSetLicenses", "click", doAdminPermSetLicenses);
  $on("btnAdminUserStats", "click", doAdminUserStats);
  $on("btnAdminFrozen", "click", doAdminFrozen);
  $on("btnAdminMfa", "click", doAdminMfa);
  $on("btnAdminPackages", "click", doAdminPackages);
  $on("btnAdminLoadAll", "click", doAdminLoadAll);
  $on("btnAdminExportCsv", "click", adminExportCsv);
  // 凍結ユーザー解除アクションは結果テーブル内 .admin-action-unfreeze からデリゲート
  document.addEventListener("click", (e) => {
    const unfreeze = e.target.closest && e.target.closest(".admin-action-unfreeze");
    if (unfreeze) {
      const userId = unfreeze.dataset.userId;
      const userName = unfreeze.dataset.userName || "";
      doAdminUnfreezeUser(userId, userName);
      return;
    }
    const mfaMissing = e.target.closest && e.target.closest(".admin-action-mfa-missing");
    if (mfaMissing) { doAdminListMfaMissing(); return; }
    const licenseAlert = e.target.closest && e.target.closest(".admin-action-license-detail");
    if (licenseAlert) {
      const apiName = licenseAlert.dataset.apiName;
      doAdminShowLicenseUsers(apiName);
      return;
    }
    // v3.139.0 Phase 229: 代理ログイン (Login as User) — admin の凍結 / MFA 未設定者 / ライセンス使用者 リストから直接実行
    const loginAs = e.target.closest && e.target.closest(".admin-action-login-as");
    if (loginAs) {
      const userId = loginAs.dataset.userId;
      const userName = loginAs.dataset.userName || "";
      adminLoginAsUser(userId, userName);
      return;
    }
    // v3.140.0 Phase 230: 未活動ユーザー抽出 (admin ユーザー集計カード内ボタン)
    const inactive = e.target.closest && e.target.closest(".admin-action-inactive-users");
    if (inactive) {
      const days = parseInt(inactive.dataset.days || "30", 10);
      doAdminListInactiveUsers(days);
      return;
    }
    // v3.168.0 Phase 258: admin カード別 CSV エクスポート
    const csvBtn = e.target.closest && e.target.closest(".admin-card-csv");
    if (csvBtn) {
      adminExportCardCsv(csvBtn.dataset.card);
      return;
    }
    // v3.145.0 Phase 235: ストレージ大量消費オブジェクト抽出
    const storage = e.target.closest && e.target.closest(".admin-action-storage-detail");
    if (storage) {
      doAdminStorageDetail();
      return;
    }
  });
  // 設計書
  $on("btnDesignGen", "click", doGenerateDesign);
  $on("btnDesignCopy", "click", copyDesignSource);
  $on("btnDesignDownload", "click", downloadDesignSource);
  // v3.29.0: 現在 SF タブのオブジェクト名を designObj に自動補完
  $on("btnDesignFromTab", "click", async () => {
    const href = await getInspectedHref();
    if (!href) { panelToast("⚠ SF タブが見つかりません。Salesforce のレコード詳細ページを開いてから再試行してください", { kind: "warn" }); return; }
    const m = href.match(/\/lightning\/r\/([^/]+)\//) || href.match(/\/lightning\/o\/([^/]+)\//);
    if (!m) { panelToast("⚠ 現在タブからオブジェクト名を取得できませんでした。Lightning レコード/タブのページで再試行してください", { kind: "warn" }); return; }
    const objEl = document.getElementById("designObj");
    if (objEl) { objEl.value = m[1]; objEl.focus(); }
    panelToast(`📍 対象を「${m[1]}」に設定しました`, { kind: "ok" });
  });

  // Inspector
  $on("btnInspect", "click", () => doInspect());
  $on("btnInspectFromTab", "click", inspectFromTab);
  $on("btnInspectPasteId", "click", async () => {
    try {
      const txt = (await navigator.clipboard.readText() || "").trim();
      const m = txt.match(/([a-zA-Z0-9]{15,18})(?:[^a-zA-Z0-9].*)?$/);
      if (!m) { panelToast("⚠ クリップボードに有効な ID が見つかりません", { kind: "warn" }); return; }
      const id = m[1].length === 15 ? to18CharId(m[1]) : m[1];
      const refEl = document.getElementById("inspectRef");
      if (refEl) refEl.value = id;
      const expanded = m[1].length === 15 ? ` (15→18 展開)` : "";
      panelToast(`📋 ID を貼付けました: ${id}${expanded}`, { kind: "ok" });
      doInspect();
    } catch (e) { panelToast("❌ クリップボードからの読み取りに失敗しました: " + (e.message || e), { kind: "err" }); }
  });
  $on("btnInspectBack", "click", inspectGoBack);
  $on("btnInspectOpenInOrg", "click", openInspectedInOrg);
  // v3.156.0 Phase 246: Inspector で表示中のレコード ID を 1 クリックでコピー (mini-panel と整合)
  $on("btnInspectCopyId", "click", async () => {
    if (!inspectState.id) {
      panelToast("⚠ Inspector でレコードを開いてから実行してください", { kind: "warn" });
      return;
    }
    try {
      await navigator.clipboard.writeText(inspectState.id);
      const obj = inspectState.obj || "?";
      panelToast(`📋 レコード ID をコピーしました: ${obj}:${inspectState.id}`, { kind: "ok" });
    } catch (e) {
      panelToast("❌ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" });
    }
  });
  // v3.179.0 Phase 269: Inspector レコードの全項目を Markdown 表形式でコピー
  $on("btnInspectCopyFullMd", "click", async () => {
    if (!inspectState.record || !inspectState.describe) {
      panelToast("⚠ Inspector でレコードを開いてから実行してください", { kind: "warn" });
      return;
    }
    const rec = inspectState.record;
    const fields = (inspectState.describe.fields || []);
    const obj = inspectState.obj || "Record";
    const id = inspectState.id || "";
    const displayName = rec.Name || rec.Subject || rec.Title || rec.CaseNumber || obj;
    const lhost = state.host && state.host.endsWith(".lightning.force.com")
      ? state.host
      : (state.host || "").replace(/\.my\.salesforce\.com$/, ".lightning.force.com");
    const url = `https://${lhost}/lightning/r/${obj}/${id}/view`;
    const lines = [];
    lines.push(`## ${escape(displayName)} — ${escape(obj)}`);
    lines.push("");
    lines.push(`[Salesforce で開く](${url}) | Id: \`${escape(id)}\``);
    lines.push("");
    lines.push(`_取得日時: ${new Date().toLocaleString("ja-JP")}_`);
    lines.push("");
    lines.push("| 項目 | 表示名 | 値 |");
    lines.push("|---|---|---|");
    // 値が null/空白でない項目のみ (Markdown 簡潔化)
    const mdEsc = (v) => String(v == null ? "" : v).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
    const showAll = false; // null 値は除外 (簡潔化)
    let displayed = 0;
    for (const f of fields) {
      const v = rec[f.name];
      if (!showAll && (v === null || v === undefined || v === "")) continue;
      // ネスト object (リレーション) は平坦化
      let display;
      if (v && typeof v === "object") {
        if (v.attributes) {
          const pref = ["Name", "Subject", "Title", "DeveloperName", "MasterLabel"].find((p) => v[p]);
          display = pref ? `${v[pref]}${v.Id ? ` [${String(v.Id).substring(0, 18)}]` : ""}` : JSON.stringify(v);
        } else {
          display = JSON.stringify(v);
        }
      } else if (typeof v === "string") {
        const m = v.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
        display = m ? `${m[1]} ${m[2]}` : v;
      } else {
        display = String(v);
      }
      lines.push(`| ${mdEsc(f.name)} | ${mdEsc(f.label || "")} | ${mdEsc(display)} |`);
      displayed++;
    }
    lines.push("");
    lines.push(`_表示項目: ${displayed} / 全 ${fields.length} 件 (値が空の項目は除外)_`);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      panelToast(`📝 全項目 Markdown をコピーしました (${displayed} 項目)`, { kind: "ok" });
    } catch (e) {
      panelToast("❌ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" });
    }
  });
  // v3.165.0 Phase 255: 「[Name](URL) 形式の Markdown リンク」をコピー
  $on("btnInspectCopyMd", "click", async () => {
    if (!inspectState.id) {
      panelToast("⚠ Inspector でレコードを開いてから実行してください", { kind: "warn" });
      return;
    }
    const obj = inspectState.obj || "Record";
    const id = inspectState.id;
    // 表示名は Name / Subject / Title / CaseNumber 等のフォールバック
    const rec = inspectState.record || {};
    const displayName = rec.Name || rec.Subject || rec.Title || rec.CaseNumber || rec.DeveloperName || id;
    // Salesforce Lightning URL を組み立て (apiHost は my.salesforce.com 形式なので lightning.force.com に変換)
    const lhost = state.host && state.host.endsWith(".lightning.force.com")
      ? state.host
      : (state.host || "").replace(/\.my\.salesforce\.com$/, ".lightning.force.com");
    const url = `https://${lhost}/lightning/r/${obj}/${id}/view`;
    // Markdown リンク + 補足情報 (Object 種別 + 短縮 ID 18桁)
    const md = `[${displayName}](${url}) — ${obj} \`${id}\``;
    try {
      await navigator.clipboard.writeText(md);
      panelToast(`📝 Markdown リンクをコピーしました: ${displayName}`, { kind: "ok" });
    } catch (e) {
      panelToast("❌ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" });
    }
  });
  // v3.66.0: 現在 Inspector で開いているレコードを SOQL ビューに展開
  $on("btnInspectToSoql", "click", () => {
    if (!inspectState.obj || !inspectState.id) {
      panelToast("⚠ Inspector でレコードを開いてから実行してください", { kind: "warn" });
      return;
    }
    // describe.fields から主要な項目 (Id / Name / メイン Lookup) を選択して SOQL を構築
    const describe = inspectState.describe || {};
    const fields = describe.fields || [];
    // 表示対象 (queryable + 主要な型) を選ぶ。多すぎるとパフォーマンス低下するため Id / Name / 上位 8 項目に絞る
    const PREFERRED_TYPES = new Set(["id", "string", "reference", "picklist", "boolean", "date", "datetime", "currency", "double", "int"]);
    const picked = [];
    for (const f of fields) {
      if (picked.length >= 10) break;
      if (f.name === "Id" || f.name === "Name") { picked.push(f.name); continue; }
      if (f.custom) continue; // カスタム項目は後でまとめて (順序維持)
      if (!PREFERRED_TYPES.has(f.type)) continue;
      if (/Address$/.test(f.name)) continue; // BillingAddress 等の compound field は SOQL で取得できない
      picked.push(f.name);
    }
    // 重複除去 + Id 必須
    const cols = ["Id", ...picked.filter((c) => c !== "Id")];
    const uniqueCols = Array.from(new Set(cols)).slice(0, 10);
    const soql = `SELECT ${uniqueCols.join(", ")}\nFROM ${inspectState.obj}\nWHERE Id = '${inspectState.id}'\nLIMIT 1`;
    const ta = document.getElementById("soqlText");
    if (ta) ta.value = soql;
    switchToView("soql");
    panelToast(`🔎 SOQL を生成しました (${inspectState.obj} ${uniqueCols.length} 項目)。Ctrl+Enter で実行`, { kind: "ok" });
  });
  // v3.152.0 Phase 242: 関連レコード横断 SOQL (子オブジェクト Top 5 をサブクエリで一括取得)
  $on("btnInspectRelatedSoql", "click", () => {
    if (!inspectState.obj || !inspectState.id) {
      panelToast("⚠ Inspector でレコードを開いてから実行してください", { kind: "warn" });
      return;
    }
    const describe = inspectState.describe || {};
    const allChildren = (describe.childRelationships || []).filter((c) => c.childSObject && c.relationshipName);
    if (!allChildren.length) {
      panelToast(`📭 ${inspectState.obj} に子オブジェクトが見つかりませんでした`, { kind: "warn" });
      return;
    }
    // 主要な子オブジェクトを優先 (標準業務オブジェクト + cascadeDelete=true / 名前で判別)
    const PREFERRED_CHILD = ["Contact", "Opportunity", "Case", "Task", "Event", "Note", "Attachment", "ContentDocumentLink", "OpportunityLineItem", "Order", "Asset", "Lead"];
    const sorted = allChildren.slice().sort((a, b) => {
      const aP = PREFERRED_CHILD.indexOf(a.childSObject);
      const bP = PREFERRED_CHILD.indexOf(b.childSObject);
      if (aP !== -1 && bP === -1) return -1;
      if (bP !== -1 && aP === -1) return 1;
      if (aP !== -1 && bP !== -1) return aP - bP;
      // 標準名前判定 (cascadeDelete もしくはアルファベット順)
      if (a.cascadeDelete !== b.cascadeDelete) return a.cascadeDelete ? -1 : 1;
      return a.childSObject.localeCompare(b.childSObject);
    });
    // Top 5 のみ採用 (1 クエリにサブクエリ多すぎるとパフォーマンス低下 + 出力過多)
    const picked = sorted.slice(0, 5);
    // 各 子オブジェクトの SOQL サブクエリ部分を組み立て (主要項目のみ)
    const COMMON_FIELDS = {
      Contact: ["Id", "Name", "Email", "Phone", "Title"],
      Opportunity: ["Id", "Name", "StageName", "Amount", "CloseDate"],
      Case: ["Id", "CaseNumber", "Subject", "Status", "Priority"],
      Task: ["Id", "Subject", "Status", "ActivityDate", "Priority"],
      Event: ["Id", "Subject", "ActivityDate", "DurationInMinutes"],
      Note: ["Id", "Title", "Body"],
      Attachment: ["Id", "Name", "BodyLength", "ContentType"],
      ContentDocumentLink: ["Id", "ContentDocumentId", "LinkedEntityId"],
      OpportunityLineItem: ["Id", "Product2Id", "Quantity", "UnitPrice"],
      Order: ["Id", "OrderNumber", "Status", "TotalAmount"],
      Asset: ["Id", "Name", "Status", "InstallDate"],
      Lead: ["Id", "Name", "Email", "Status"],
    };
    const subqueries = picked.map((c) => {
      const fields = COMMON_FIELDS[c.childSObject] || ["Id", "Name"];
      return `    (SELECT ${fields.join(", ")} FROM ${c.relationshipName} LIMIT 10)`;
    });
    // 親オブジェクトの主要項目
    const parentFields = ["Id", "Name"].filter((f) => (describe.fields || []).some((df) => df.name === f));
    if (!parentFields.includes("Id")) parentFields.unshift("Id");
    const soql = `SELECT ${parentFields.join(", ")},\n${subqueries.join(",\n")}\nFROM ${inspectState.obj}\nWHERE Id = '${inspectState.id}'\nLIMIT 1`;
    const ta = document.getElementById("soqlText");
    if (ta) ta.value = soql;
    switchToView("soql");
    panelToast(`🔗 関連レコード SOQL を生成しました (${inspectState.obj} + ${picked.length} 子オブジェクト)。Ctrl+Enter で実行`, { kind: "ok" });
  });
  $on("btnInspectExportJson", "click", () => exportInspect("json"));
  $on("btnInspectExportCsv", "click", () => exportInspect("csv"));
  $on("btnInspectCopyJson", "click", async () => {
    if (!inspectState.record) { panelToast("⚠ レコードがまだ取得されていません", { kind: "warn" }); return; }
    try {
      await navigator.clipboard.writeText(JSON.stringify(inspectState.record, null, 2));
      panelToast(`📋 ${inspectState.obj}:${inspectState.id} の JSON をコピーしました`, { kind: "ok" });
    } catch (e) { panelToast("⚠ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" }); }
  });
  $on("inspectFilter", "input", renderInspectorFields);
  $on("inspectShowNull", "change", renderInspectorFields);
  $on("inspectShowSystem", "change", renderInspectorFields);
  $on("inspectRef", "keydown", (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter") doInspect();
  });

  // Limits
  $on("btnLimitsCsv", "click", exportLimitsCsv);
  // v3.174.0 Phase 264: Limits を Markdown テーブル形式でコピー
  $on("btnLimitsCopyMd", "click", copyLimitsMd);
  $on("limitsSort", "change", renderLimitsList);
  $on("limitsOnlyUsed", "change", renderLimitsList);
  // v3.54.0: Limits 検索フィルタ — input でリアルタイム絞込み、Esc でクリア
  $on("limitsFilter", "input", renderLimitsList);
  $on("limitsFilter", "keydown", (e) => {
    if (e.key === "Escape") { e.target.value = ""; renderLimitsList(); }
  });

  // データエクスポート
  $on("btnExLoadFields", "click", exLoadFields);
  $on("btnExSelectAll", "click", () => exSelectFields(true, false));
  $on("btnExSelectNone", "click", () => exSelectFields(false, false));
  $on("btnExSelectStandard", "click", () => exSelectFields(true, true));
  $on("btnExBuild", "click", exBuildSoql);
  // v3.129.0 Phase 219: DataExport の組立 SOQL を 📥 レコードエクスポート (SOQL タブ) に転送 — 重複機能整理の第 1 弾、ユーザー要望「重複機能は統合」
  $on("btnExToSoql", "click", () => {
    exBuildSoql(); // 念のため最新の SOQL を生成
    const exSoql = document.getElementById("exSoql");
    const soqlText = document.getElementById("soqlText");
    const src = exSoql ? exSoql.value.trim() : "";
    if (!src) {
      panelToast("⚠ 先にフィールドを選択して「SOQL 組立」を実行してください", { kind: "warn" });
      return;
    }
    if (soqlText) {
      soqlText.value = src;
      soqlText.dispatchEvent(new Event("input", { bubbles: true })); // カーソル位置インジケータ等の追従
    }
    // Tooling API 状態も連動
    const exTooling = document.getElementById("exTooling");
    const useTooling = document.getElementById("useTooling");
    if (exTooling && useTooling) useTooling.checked = exTooling.checked;
    switchToView("soql");
    panelToast(`📤 SOQL タブへ転送しました (${src.length.toLocaleString()} 文字)。編集して「▶ 実行」してください`, { kind: "ok" });
  });
  $on("btnExRun", "click", exRunPreview);
  $on("btnExDlCsv", "click", () => exDownloadAll("csv"));
  $on("btnExDlExcel", "click", () => exDownloadAll("excel"));
  $on("btnExDlJson", "click", () => exDownloadAll("json"));
  $on("exFieldFilter", "input", exRenderFieldList);
  $on("exObj", "keydown", (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter") exLoadFields();
  });
  // v3.111.0 Phase 201: オブジェクト確定時 (datalist 候補選択 / blur) に項目自動読込 (ユーザー要望)
  $on("exObj", "change", () => {
    const v = document.getElementById("exObj").value.trim();
    if (v) exLoadFields();
  });

  // API URL ビルダー + v2.96.0 「▶ 実行」ボタン
  $on("btnApiBuild", "click", apiBuildUrl);
  $on("btnApiRun", "click", apiRunRequest);
  $on("btnApiCopy", "click", apiCopyUrl);
  $on("btnApiCurlCopy", "click", apiCopyCurl);
  $on("btnApiOpen", "click", apiOpenInBrowser);
  $on("apiOp", "change", apiBuildUrl);
  updateApiInputVisibility();

  // v3.89.0: Phase 179 で「変更セット / package.xml」関連の 9 $on バインディングを撤去 (v2.88.0 で HTML から view 削除済、null セーフで残骸が残っていた)
}


// ====== データエクスポート ======
const exState = { obj: null, fields: [], selected: new Set() };

async function exLoadFields() {
  if (!state.sid) { document.getElementById("exMeta").innerHTML = `<span class="pill err">Salesforce 未接続</span>`; return; }
  const obj = document.getElementById("exObj").value.trim();
  if (!obj) {
    // v3.49.0: 早期バリデーション + 入力欄にフォーカス戻し
    document.getElementById("exMeta").innerHTML = `<span class="pill warn">⚠ 入力が必要</span> 対象オブジェクトの API 名を入力してください (例: <code>Account</code> / <code>Contact</code> / <code>Opportunity</code>)`;
    const inp = document.getElementById("exObj");
    if (inp) inp.focus();
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
  // v3.257.0 Phase 347 (Team H): エクスポートのフィールド読込成功時、対象オブジェクトを最近使った候補に push
  if (/^[A-Za-z][A-Za-z0-9_]*$/.test(obj)) pushRecentObject(obj);
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
  // v3.49.0: 早期バリデーション — フィールド読込前 / フィールド未選択時の即フィードバック
  if (!exState.obj) {
    document.getElementById("exMeta").innerHTML = `<span class="pill warn">⚠ 入力が必要</span> 先に対象オブジェクトを入力して<strong>「フィールド読込」</strong>を押してください (例: <code>Account</code>)`;
    const inp = document.getElementById("exObj");
    if (inp) inp.focus();
    return;
  }
  if (!exState.selected || exState.selected.size === 0) {
    document.getElementById("exMeta").innerHTML = `<span class="pill warn">⚠ 入力が必要</span> エクスポートするフィールドを 1 つ以上チェックしてください (「全選択」「標準のみ」ボタンが便利です)`;
    return;
  }
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

// v2.96.0: 生成された API リクエスト情報を保持 (URL 生成 / 実行 で共有)
let _lastApiBuild = null;

async function apiRunRequest() {
  if (!state.sid) {
    document.getElementById("apiRunMeta").innerHTML = `<span class="pill warn">Salesforce に未接続です</span>`;
    return;
  }
  // まず URL を生成
  apiBuildUrl();
  if (!_lastApiBuild || !_lastApiBuild.path) {
    document.getElementById("apiRunMeta").innerHTML = `<span class="pill warn">URL が生成されていません。入力を確認してください</span>`;
    return;
  }
  const { path, method, body } = _lastApiBuild;
  const unlock = lockBtn("btnApiRun");
  const meta = document.getElementById("apiRunMeta");
  const label = document.getElementById("apiRunLabel");
  const out = document.getElementById("apiRunResult");
  if (label) label.style.display = "";
  if (out) out.style.display = "";
  meta.innerHTML = `<span class="pill">⏳ ${escape(method)} ${escape(path)} を実行しています…</span>`;
  out.textContent = "";
  const t0 = performance.now();
  let r;
  try {
    r = await sfFetch({
      host: state.host, sid: state.sid, path,
      method, body: body || undefined,
    });
  } catch (e) {
    unlock();
    meta.innerHTML = `<span class="pill err">❌ 実行エラー: ${escape(e.message || String(e))}</span>`;
    return;
  }
  const dt = Math.round(performance.now() - t0);
  unlock();
  const statusCls = r.ok ? "ok" : "err";
  const statusIcon = r.ok ? "✓" : "❌";
  const formatted = (typeof r.data === "object") ? JSON.stringify(r.data, null, 2) : String(r.data || "");
  out.textContent = formatted;
  // v3.257.0 Phase 347 (Team H): API URL ビルダー 実行成功時、apiObj / apiId を最近使った候補に push
  if (r.ok) {
    const apiObjV = (document.getElementById("apiObj").value || "").trim();
    const apiIdV = (document.getElementById("apiId").value || "").trim();
    if (apiObjV && /^[A-Za-z][A-Za-z0-9_]*$/.test(apiObjV)) pushRecentObject(apiObjV);
    if (apiIdV && /^[a-zA-Z0-9]{15,18}$/.test(apiIdV)) {
      const lbl = (r.data && typeof r.data === "object" && (r.data.Name || r.data.Subject || r.data.CaseNumber || r.data.Title)) || apiObjV;
      pushRecentRecordId(apiIdV, `${apiObjV}${lbl ? ": " + lbl : ""}`);
    }
  }
  // v3.183.0 Phase 273: API URL ビルダー実行結果にサイズ表示 + 📋/📝 コピーボタン追加 (REST view と整合)
  const bodySize = formatted ? formatted.length : 0;
  const sizeLabel = bodySize < 1024 ? `${bodySize} B` : `${(bodySize / 1024).toFixed(1)} KB`;
  meta.innerHTML = `<span class="pill ${statusCls}">${statusIcon} HTTP ${r.status}</span> <span class="meta">${dt}ms / ${sizeLabel}</span> <button id="btnApiRunCopy" class="admin-row-action" style="margin-left:8px" title="実行結果 (JSON) をクリップボードにコピー">📋 結果コピー</button> <button id="btnApiRunCopyMd" class="admin-row-action" style="margin-left:4px" title="実行結果を Markdown コードブロック形式でコピー (\`\`\`json … \`\`\`) — バグ報告/Slack/Notion 向け">📝 MD コピー</button>`;
  const copyBtn = document.getElementById("btnApiRunCopy");
  if (copyBtn) copyBtn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(formatted); panelToast("📋 実行結果をコピーしました", { kind: "ok" }); }
    catch (e) { panelToast("❌ コピー失敗: " + (e.message || e), { kind: "err" }); }
  });
  const copyMdBtn = document.getElementById("btnApiRunCopyMd");
  if (copyMdBtn) copyMdBtn.addEventListener("click", async () => {
    const md = `## API URL ビルダー実行結果\n\n_実行日時: ${new Date().toLocaleString("ja-JP")} / ${method} ${path} / HTTP ${r.status} / ${dt}ms / ${sizeLabel}_\n\n\`\`\`json\n${formatted}\n\`\`\`\n`;
    try { await navigator.clipboard.writeText(md); panelToast("📝 実行結果を Markdown でコピーしました", { kind: "ok" }); }
    catch (e) { panelToast("❌ コピー失敗: " + (e.message || e), { kind: "err" }); }
  });
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
  // v2.96.0: 「▶ 実行」ボタンで使う情報を保存
  _lastApiBuild = { path, method, body };
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
// v3.75.0: Inspector 履歴も chrome.storage.local に永続化 (タブ再読込でも履歴復元)
const INSPECT_HISTORY_KEY = "sfdtInspectHistory";
let inspectHistory = []; // 過去訪問した {obj, id, scrollTop} を最大 20 件保持
async function loadInspectHistory() {
  try {
    const data = await chrome.storage.local.get(INSPECT_HISTORY_KEY);
    const arr = Array.isArray(data[INSPECT_HISTORY_KEY]) ? data[INSPECT_HISTORY_KEY] : [];
    inspectHistory = arr.filter((e) => e && typeof e.obj === "string" && typeof e.id === "string").slice(0, 20);
    updateInspectBackButton();
  } catch {}
}
async function saveInspectHistory() {
  try {
    await chrome.storage.local.set({ [INSPECT_HISTORY_KEY]: inspectHistory.slice(0, 20) });
  } catch {}
}
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
  saveInspectHistory();
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
  if (!raw) {
    // v3.48.0: 早期バリデーション + 入力欄にフォーカス戻し
    document.getElementById("inspectMeta").innerHTML = `<span class="pill warn">⚠ 入力が必要</span> レコード ID (15/18桁) または <code>オブジェクト名:ID</code> 形式で入力してください (例: <code>0011x00000abcdeAAA</code> / <code>Account:001xx000003DGbY</code>)`;
    const ref = document.getElementById("inspectRef");
    if (ref) ref.focus();
    return;
  }
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
      saveInspectHistory();
    }
  }
  const myId = ++inspectRunId;
  const meta = document.getElementById("inspectMeta");
  const runBtn = document.getElementById("btnInspect");
  meta.innerHTML = `<span class="pill loading">レコードを取得しています… #${myId}</span>`;
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
  // v3.67.0: 子リレーション セクションをレンダリング
  renderInspectorChildRelations();
  // v3.134.0 Phase 223 (Team H): 成功時のみ最近使った候補に push (オブジェクト + レコード ID)
  pushRecentObject(objName);
  const recLabel = (recR.data && (recR.data.Name || recR.data.Subject || recR.data.CaseNumber || recR.data.Title)) || objName;
  pushRecentRecordId(id, `${objName}: ${recLabel}`);

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

// v3.67.0: Inspector 子リレーション セクションのレンダリング
// describe.childRelationships からデプロイ可能な子オブジェクト一覧を表示し、
// クリックで「SELECT Id, Name FROM <Child> WHERE <FK> = '<parentId>' LIMIT 50」を SOQL に投入して切替
function renderInspectorChildRelations() {
  const wrap = document.getElementById("inspectChildRels");
  if (!wrap) return;
  const describe = inspectState.describe || {};
  const childRels = (describe.childRelationships || []).filter((c) => c.childSObject && c.field && !c.deprecatedAndHidden);
  if (!childRels.length || !inspectState.id) {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "";
  const countEl = wrap.querySelector(".child-count");
  if (countEl) countEl.textContent = `(${childRels.length} 件)`;
  const body = wrap.querySelector(".inspector-child-rels-body");
  if (!body) return;
  // 主要な標準子オブジェクトを優先表示 (ContactRoles 等の中間表より Contacts/Cases/Opportunities/Tasks/Events を上に)
  const PRIORITY_OBJS = new Set(["Contact", "Case", "Opportunity", "Task", "Event", "Note", "Attachment", "FeedItem", "AccountContactRelation"]);
  const sorted = [...childRels].sort((a, b) => {
    const pa = PRIORITY_OBJS.has(a.childSObject) ? 0 : 1;
    const pb = PRIORITY_OBJS.has(b.childSObject) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return a.childSObject.localeCompare(b.childSObject);
  });
  body.innerHTML = sorted.map((c) => {
    const label = `${escape(c.childSObject)}<span class="child-fk">.${escape(c.field)}</span>`;
    const rel = c.relationshipName ? `<span class="child-rel-name" title="サブクエリ用リレーション名: ${escape(c.relationshipName)} (例: SELECT Id, (SELECT Id FROM ${escape(c.relationshipName)}) FROM ${escape(inspectState.obj)})">${escape(c.relationshipName)}</span>` : "";
    return `<button class="child-rel-item" data-obj="${escape(c.childSObject)}" data-fk="${escape(c.field)}" title="SELECT Id, Name FROM ${escape(c.childSObject)} WHERE ${escape(c.field)} = '${escape(inspectState.id)}' LIMIT 50 を SOQL ビューに投入">${label}${rel}</button>`;
  }).join("");
  body.querySelectorAll(".child-rel-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const obj = btn.dataset.obj;
      const fk = btn.dataset.fk;
      const soql = `SELECT Id, Name\nFROM ${obj}\nWHERE ${fk} = '${inspectState.id}'\nLIMIT 50`;
      const ta = document.getElementById("soqlText");
      if (ta) ta.value = soql;
      switchToView("soql");
      panelToast(`🌳 ${obj} の子レコード SOQL を生成 (${fk} = ${inspectState.id})。Ctrl+Enter で実行`, { kind: "ok" });
    });
  });
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
    // v2.99.0: 編集可フラグ - 編集可フィールドは値セルをクリックで編集モードに
    // updateable=true かつ createable=true かつ計算項目でない場合のみ
    const isEditable = f.updateable && !f.calculated && f.type !== "reference" && f.type !== "id" && !SYSTEM_FIELDS.has(f.name);
    const editAttr = isEditable ? ` data-editable="true" data-field-name="${escape(f.name)}" data-field-type="${escape(f.type)}" title="クリックで編集 (Enter で保存 / Esc で取消)"` : "";
    const editCls = isEditable ? " editable" : "";
    if (isNull) {
      valHtml = `<div class="fval null${editCls}"${editAttr}>${isEditable ? "(空 - クリックして編集)" : "(空)"}</div>`;
    } else if (typeof v === "boolean") {
      valHtml = `<div class="fval bool-${v ? "true" : "false"}${editCls}"${editAttr}>${v ? "✓ はい (true)" : "✗ いいえ (false)"}</div>`;
    } else if ((f.type === "int" || f.type === "double" || f.type === "currency" || f.type === "percent") && typeof v === "number") {
      const formatted = v.toLocaleString("ja-JP");
      const unit = f.type === "currency" ? " ¥" : (f.type === "percent" ? " %" : "");
      valHtml = `<div class="fval${editCls}"${editAttr} data-raw="${escape(String(v))}">${escape(formatted)}${escape(unit)}</div>`;
    } else if ((f.type === "date" || f.type === "datetime") && typeof v === "string") {
      let display = v;
      const m = v.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/);
      if (m) display = f.type === "datetime" && m[2] ? `${m[1]} ${m[2]}` : m[1];
      valHtml = `<div class="fval${editCls}"${editAttr} data-raw="${escape(v)}">${escape(display)}</div>`;
    } else if (f.type === "reference" && typeof v === "string") {
      // 参照項目は編集不可。ジャンプリンクのみ
      const refObj = (f.referenceTo || [])[0] || "";
      const refLabel = refObj ? `<span class="ref-target-label">→ ${escape(refObj)}</span>` : "";
      // v3.65.0: SOQL リレーション名を併記 (例: OwnerId → "Owner.") + クリップボードコピーボタン
      // 業務担当者が SOQL で Owner.Name 形式の関連項目を取得しやすくする
      const relName = f.relationshipName || "";
      const relHint = relName ? `<span class="ref-rel-name" data-rel="${escape(relName)}" title="SOQL リレーション名: ${escape(relName)}. — クリックで「${escape(relName)}.Name」をクリップボードへコピー">${escape(relName)}.</span>` : "";
      valHtml = `<div class="fval ref" data-id="${escape(v)}" data-ref-obj="${escape(refObj)}" title="クリックで ${escape(refObj || "参照先")} のレコードを Inspector で開きます">${escape(v)}${refLabel}${relHint}</div>`;
    } else if (typeof v === "object") {
      valHtml = `<div class="fval">${escape(JSON.stringify(v))}</div>`;
    } else {
      valHtml = `<div class="fval${editCls}"${editAttr}>${escape(String(v))}</div>`;
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
    el.addEventListener("click", (e) => {
      // v3.65.0: relName chip クリック時は SOQL 用クリップボードコピー (Inspector ジャンプはしない)
      const relEl = e.target.closest(".ref-rel-name");
      if (relEl) {
        e.stopPropagation();
        const rel = relEl.dataset.rel;
        if (!rel) return;
        const snippet = `${rel}.Name`;
        navigator.clipboard.writeText(snippet).then(() => {
          panelToast(`📋 SOQL リレーション「${snippet}」をコピー (SOQL の SELECT 句に貼り付け可能)`, { kind: "ok" });
        }).catch(() => panelToast("❌ クリップボードへのコピーに失敗しました", { kind: "err" }));
        return;
      }
      const id = el.dataset.id;
      const refObj = el.dataset.refObj || "";
      document.getElementById("inspectRef").value = refObj ? `${refObj}:${id}` : id;
      doInspect();
    });
  });

  // v2.99.0: 編集可フィールドのクリックハンドラ (ユーザー要望「レコード詳細では項目も更新できるように」)
  root.querySelectorAll(".fval.editable").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (el.dataset.editing === "true") return;
      e.stopPropagation();
      enterInspectorEditMode(el);
    });
  });
}

// v2.99.0: Inspector 編集モード突入
function enterInspectorEditMode(el) {
  const fieldName = el.dataset.fieldName;
  const fieldType = el.dataset.fieldType;
  const rawVal = el.dataset.raw || el.textContent;
  el.dataset.editing = "true";
  el.dataset.original = el.innerHTML;
  // 入力タイプを決定
  let inputType = "text";
  if (fieldType === "boolean") {
    el.innerHTML = `<select class="inline-edit"><option value="true">true</option><option value="false">false</option></select>
      <button class="inline-save" title="保存 (PATCH)">✓</button><button class="inline-cancel" title="取消 (Esc)">✗</button>`;
    const sel = el.querySelector("select");
    sel.value = /yes|true|✓/.test(el.dataset.original) ? "true" : "false";
    sel.focus();
  } else {
    if (fieldType === "double" || fieldType === "int" || fieldType === "currency" || fieldType === "percent") inputType = "number";
    else if (fieldType === "date") inputType = "date";
    else if (fieldType === "datetime") inputType = "datetime-local";
    else if (fieldType === "email") inputType = "email";
    else if (fieldType === "url") inputType = "url";
    else if (fieldType === "textarea") inputType = "textarea";
    const inp = inputType === "textarea"
      ? `<textarea class="inline-edit" rows="3" style="width:60%">${escape(rawVal === "(空 - クリックして編集)" ? "" : rawVal)}</textarea>`
      : `<input class="inline-edit" type="${inputType}" value="${escape(rawVal === "(空 - クリックして編集)" ? "" : (fieldType === "datetime" ? rawVal.replace(/\..*$/, "").substring(0, 16) : rawVal))}" style="width:60%" />`;
    el.innerHTML = `${inp}<button class="inline-save" title="保存 (PATCH)">✓</button><button class="inline-cancel" title="取消 (Esc)">✗</button>`;
    const inputEl = el.querySelector(".inline-edit");
    inputEl.focus();
    if (inputEl.select) inputEl.select();
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveInspectorEdit(el); }
      else if (e.key === "Escape") { e.preventDefault(); cancelInspectorEdit(el); }
    });
  }
  el.querySelector(".inline-save").addEventListener("click", (e) => { e.stopPropagation(); saveInspectorEdit(el); });
  el.querySelector(".inline-cancel").addEventListener("click", (e) => { e.stopPropagation(); cancelInspectorEdit(el); });
}

function cancelInspectorEdit(el) {
  el.innerHTML = el.dataset.original || "";
  delete el.dataset.editing;
  delete el.dataset.original;
}

async function saveInspectorEdit(el) {
  const fieldName = el.dataset.fieldName;
  const fieldType = el.dataset.fieldType;
  const inputEl = el.querySelector(".inline-edit");
  if (!inputEl) return;
  let newVal = inputEl.value;
  // 型変換
  if (fieldType === "boolean") newVal = newVal === "true";
  else if (fieldType === "double" || fieldType === "currency" || fieldType === "percent") newVal = newVal === "" ? null : Number(newVal);
  else if (fieldType === "int") newVal = newVal === "" ? null : parseInt(newVal, 10);
  else if (newVal === "") newVal = null;

  // v3.202.0 Phase 292: PROD 環境での Inspector インライン編集前に confirm ダイアログ (5 経路目の防御)
  if (state.isProd) {
    const origVal = el.dataset.original || "";
    const displayNew = newVal === null ? "(null)" : String(newVal);
    const ok = window.confirm(
      `🚨🚨 本番組織 (PROD) でレコード編集 🚨🚨\n` +
      `対象組織: ${state.host || "?"}\n\n` +
      `${inspectState.obj || "?"}: ${inspectState.id || "?"}\n` +
      `項目: ${fieldName}\n\n` +
      `変更前: ${origVal}\n` +
      `変更後: ${displayNew}\n\n` +
      `この変更は実データに即時反映されます (PATCH)。続行しますか?\n\n` +
      `(Sandbox での事前テストを強く推奨します)`
    );
    if (!ok) {
      panelToast("⚠ PROD インライン編集をキャンセルしました", { kind: "warn" });
      return;
    }
  }

  const saveBtn = el.querySelector(".inline-save");
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "⏳"; }

  const body = JSON.stringify({ [fieldName]: newVal });
  const r = await sfFetch({
    host: state.host, sid: state.sid,
    path: `/services/data/v${state.apiVersion}/sobjects/${encodeURIComponent(inspectState.obj)}/${encodeURIComponent(inspectState.id)}`,
    method: "PATCH", body,
  });
  if (!r.ok) {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "✓"; }
    panelToast(`❌ 保存失敗 (HTTP ${r.status}): ${formatError(r.data)}`, { kind: "err" });
    return;
  }
  // 成功 → state を更新して再描画
  inspectState.record[fieldName] = newVal;
  delete el.dataset.editing;
  delete el.dataset.original;
  panelToast(`✓ ${fieldName} を更新しました`, { kind: "ok" });
  renderInspectorFields();
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

// v2.93.0 Phase 83: Limits ダッシュボード抜本改修 (ユーザー要望 5 件対応)
// 1) カラム固定スクロール時の重なり修正 (CSS z-index + 不透明背景)
// 2) ソート機能 (全列クリックでソート、向き ↑↓ 切替)
// 3) 日本語訳 (Limit 名を業務用語に)
// 4) 追加 Limit 表示 (現状は /limits API のみだが、隠れている上限を解説文で補足)
// 5) お気に入り (ピン留め) 機能で選択した Limit のみ表示する設定 (chrome.storage 永続化)

// Salesforce Limits 名 → 日本語マップ + 補足情報 (公式ドキュメント参照)
const LIMITS_JA = {
  "AnalyticsExternalDataSizeMB": { ja: "Analytics 外部データサイズ", desc: "Wave 外部データの累計サイズ (MB)" },
  "ConcurrentAsyncGetReportInstances": { ja: "並列レポートインスタンス取得", desc: "同時実行できる Analytics REST 非同期レポート数" },
  "ConcurrentEinsteinDataInsightsStoryCreation": { ja: "Einstein Discovery 同時ストーリ作成", desc: "Einstein Discovery で同時作成可能なストーリ数" },
  "ConcurrentEinsteinDiscoveryStoryCreation": { ja: "Einstein Discovery 同時作成", desc: "Einstein Discovery の同時作成数" },
  "ConcurrentSyncReportRuns": { ja: "並列同期レポート実行", desc: "同時実行できる同期 Analytics レポート数" },
  "DailyAnalyticsDataflowJobExecutions": { ja: "Analytics データフロージョブ実行 / 日", desc: "Tableau CRM データフロー実行回数の日次上限" },
  "DailyAnalyticsUploadedFilesSizeMB": { ja: "Analytics アップロードファイルサイズ / 日", desc: "Tableau CRM への日次アップロードサイズ (MB)" },
  "DailyApiRequests": { ja: "API リクエスト / 日", desc: "REST/SOAP/Bulk/Tooling 等 API コール総数の日次上限。最重要監視項目" },
  "DailyAsyncApexExecutions": { ja: "非同期 Apex 実行 / 日", desc: "@future / Queueable / Batch Apex 実行回数の日次上限" },
  "DailyAsyncApexTests": { ja: "非同期 Apex テスト / 日", desc: "並列で実行できる Apex テストメソッド数の日次上限" },
  "DailyBulkApiBatches": { ja: "Bulk API バッチ / 日", desc: "Bulk API v1 のバッチ実行回数の日次上限" },
  "DailyBulkV2QueryFileStorageMB": { ja: "Bulk API v2 クエリファイル / 日", desc: "Bulk API v2 のクエリ結果ファイル合計サイズ (MB)" },
  "DailyBulkV2QueryJobs": { ja: "Bulk API v2 クエリジョブ / 日", desc: "Bulk API v2 クエリジョブ実行回数の日次上限" },
  "DailyDeliveredPlatformEvents": { ja: "Platform Event 配信 / 日", desc: "高ボリューム Platform Event の日次配信件数上限" },
  "DailyDurableGenericStreamingApiEvents": { ja: "Durable 汎用 Streaming API イベント / 日", desc: "" },
  "DailyDurableStreamingApiEvents": { ja: "Durable Streaming API イベント / 日", desc: "PushTopic / 汎用 Streaming の永続化イベント上限" },
  "DailyEinsteinDataInsightsStoryCreation": { ja: "Einstein Discovery ストーリ作成 / 日", desc: "" },
  "DailyEinsteinDiscoveryOptimizationJobRuns": { ja: "Einstein Discovery 最適化ジョブ / 日", desc: "" },
  "DailyEinsteinDiscoveryPredictAPICalls": { ja: "Einstein Discovery 予測 API / 日", desc: "" },
  "DailyEinsteinDiscoveryPredictionsByCDC": { ja: "Einstein Discovery CDC 予測 / 日", desc: "Change Data Capture トリガで実行された予測件数" },
  "DailyEinsteinDiscoveryStoryCreation": { ja: "Einstein Discovery ストーリ作成 / 日", desc: "" },
  "DailyFunctionsApiCallLimit": { ja: "Salesforce Functions API / 日", desc: "" },
  "DailyGenericStreamingApiEvents": { ja: "汎用 Streaming API イベント / 日", desc: "" },
  "DailyScratchOrgs": { ja: "スクラッチ組織作成 / 日", desc: "DevHub からの日次スクラッチ Org 作成数上限" },
  "DailyStandardVolumePlatformEvents": { ja: "標準ボリューム Platform Event / 日", desc: "" },
  "DailyStreamingApiEvents": { ja: "Streaming API イベント / 日", desc: "" },
  "DailyWorkflowEmails": { ja: "ワークフローメール送信 / 日", desc: "Workflow Rule + Process Builder メール送信の日次上限" },
  "DataStorageMB": { ja: "データストレージ (MB)", desc: "オブジェクトレコードに使用しているストレージ容量。100% 近づいたら早期削減" },
  "DurableStreamingApiConcurrentClients": { ja: "Durable Streaming API 同時接続", desc: "" },
  "FileStorageMB": { ja: "ファイルストレージ (MB)", desc: "Salesforce Files / Attachment / Content の合計サイズ" },
  "HourlyAsyncReportRuns": { ja: "非同期レポート実行 / 時", desc: "Analytics REST の非同期レポート実行 / 時間" },
  "HourlyDashboardRefreshes": { ja: "ダッシュボード更新 / 時", desc: "" },
  "HourlyDashboardResults": { ja: "ダッシュボード結果取得 / 時", desc: "" },
  "HourlyDashboardStatuses": { ja: "ダッシュボード状態取得 / 時", desc: "" },
  "HourlyElevateAsyncReportRuns": { ja: "Elevate 非同期レポート / 時", desc: "" },
  "HourlyElevateSyncReportRuns": { ja: "Elevate 同期レポート / 時", desc: "" },
  "HourlyLongTermIdMapping": { ja: "長期 ID マッピング / 時", desc: "" },
  "HourlyManagedContentPublicRequests": { ja: "Managed Content Public リクエスト / 時", desc: "" },
  "HourlyODataCallout": { ja: "OData コールアウト / 時", desc: "" },
  "HourlyPublishedPlatformEvents": { ja: "Platform Event 発行 / 時", desc: "" },
  "HourlyPublishedStandardVolumePlatformEvents": { ja: "標準ボリューム Platform Event 発行 / 時", desc: "" },
  "HourlyShortTermIdMapping": { ja: "短期 ID マッピング / 時", desc: "" },
  "HourlySyncReportRuns": { ja: "同期レポート実行 / 時", desc: "" },
  "HourlyTimeBasedWorkflow": { ja: "時間ベースワークフロー / 時", desc: "" },
  "MassEmail": { ja: "一括メール送信 (24h)", desc: "Salesforce 標準の一括メール送信 / 24 時間" },
  "MonthlyEinsteinDiscoveryStoryCreation": { ja: "Einstein Discovery ストーリ作成 / 月", desc: "" },
  "MonthlyPlatformEventsUsageEntitlement": { ja: "Platform Event 月次使用権", desc: "Platform Event の月次配信上限" },
  "Package2VersionCreates": { ja: "2 世代パッケージバージョン作成 / 日", desc: "" },
  "Package2VersionCreatesWithoutValidation": { ja: "2 世代パッケージバージョン作成 (検証なし) / 日", desc: "" },
  "PermissionSets": { ja: "権限セット数", desc: "組織に作成された権限セット (Custom + Standard) の総数" },
  "PrivateConnectOutboundCalloutHourlyLimitMB": { ja: "Private Connect アウトバウンド / 時 (MB)", desc: "" },
  "PublishCallbacksUsageInApex": { ja: "Apex Publish Callback 使用回数", desc: "" },
  "SingleEmail": { ja: "シングルメール送信 (24h)", desc: "外部メールアドレス宛シングルメール / 24 時間 (最重要)" },
  "StreamingApiConcurrentClients": { ja: "Streaming API 同時接続", desc: "" },
};
function limitJa(name) {
  return (LIMITS_JA[name] && LIMITS_JA[name].ja) || name;
}
function limitDesc(name) {
  return (LIMITS_JA[name] && LIMITS_JA[name].desc) || "";
}

// ピン留め設定 (chrome.storage)
const LIMITS_PINNED_KEY = "sfdtLimitsPinned";
const LIMITS_SORT_KEY = "sfdtLimitsSortState";
let _limitsPinned = []; // [name, name, ...]
let _limitsSortCol = "pct"; // pct / used / remaining / max / name
let _limitsSortDir = "desc"; // asc / desc
let _limitsShowPinnedOnly = false;

async function loadLimitsSettings() {
  try {
    const r = await chrome.storage.local.get([LIMITS_PINNED_KEY, LIMITS_SORT_KEY]);
    _limitsPinned = r[LIMITS_PINNED_KEY] || [];
    const sortSt = r[LIMITS_SORT_KEY] || {};
    if (sortSt.col) _limitsSortCol = sortSt.col;
    if (sortSt.dir) _limitsSortDir = sortSt.dir;
    if (sortSt.pinnedOnly != null) _limitsShowPinnedOnly = !!sortSt.pinnedOnly;
  } catch {}
}
async function saveLimitsSettings() {
  try {
    await chrome.storage.local.set({
      [LIMITS_PINNED_KEY]: _limitsPinned,
      [LIMITS_SORT_KEY]: { col: _limitsSortCol, dir: _limitsSortDir, pinnedOnly: _limitsShowPinnedOnly },
    });
  } catch {}
}
async function toggleLimitPin(name) {
  if (_limitsPinned.includes(name)) _limitsPinned = _limitsPinned.filter((n) => n !== name);
  else _limitsPinned = [..._limitsPinned, name];
  await saveLimitsSettings();
  renderLimitsList();
}
async function toggleLimitSort(col) {
  if (_limitsSortCol === col) _limitsSortDir = _limitsSortDir === "asc" ? "desc" : "asc";
  else { _limitsSortCol = col; _limitsSortDir = (col === "name") ? "asc" : "desc"; }
  await saveLimitsSettings();
  renderLimitsList();
}
async function toggleLimitPinnedOnly() {
  _limitsShowPinnedOnly = !_limitsShowPinnedOnly;
  await saveLimitsSettings();
  renderLimitsList();
}

async function doLimits() {
  if (!state.sid) return;
  await loadLimitsSettings();
  const unlock = lockBtn("btnLimits");
  // v3.32.0: loading 表示を統一スピナーに
  const limitsResultEl = document.getElementById("limitsResult");
  if (limitsResultEl) limitsResultEl.innerHTML = `<div class="empty-state"><span class="pill loading">組織制限を取得しています…</span></div>`;
  const r = await getLimits({ host: state.host, sid: state.sid, apiVersion: state.apiVersion });
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
  const sortLegacy = document.getElementById("limitsSort"); // 旧 select (互換)
  const onlyUsed = document.getElementById("limitsOnlyUsed");
  const isOnlyUsed = onlyUsed && onlyUsed.checked;
  // v3.54.0: 制限名 検索フィルタ (英名 + 日本語名 部分一致)
  const filterEl = document.getElementById("limitsFilter");
  const filterQ = filterEl ? (filterEl.value || "").toLowerCase().trim() : "";

  let rows = Object.entries(lastLimitsData).map(([k, v]) => {
    const max = (v && v.Max != null) ? v.Max : 0;
    const remaining = (v && v.Remaining != null) ? v.Remaining : 0;
    const used = max - remaining;
    const pct = max > 0 ? Math.round((used / max) * 100) : 0;
    return { name: k, ja: limitJa(k), desc: limitDesc(k), max, remaining, used, pct, pinned: _limitsPinned.includes(k) };
  });
  if (isOnlyUsed) rows = rows.filter((r) => r.used > 0);
  if (_limitsShowPinnedOnly) rows = rows.filter((r) => r.pinned);
  if (filterQ) {
    rows = rows.filter((r) =>
      r.name.toLowerCase().includes(filterQ) ||
      (r.ja || "").toLowerCase().includes(filterQ) ||
      (r.desc || "").toLowerCase().includes(filterQ)
    );
  }

  // ソート (ピン留めは常に上位)
  const dir = _limitsSortDir === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    let av, bv;
    if (_limitsSortCol === "name") { av = a.ja; bv = b.ja; return dir * av.localeCompare(bv); }
    av = a[_limitsSortCol]; bv = b[_limitsSortCol];
    return dir * ((av || 0) - (bv || 0));
  });

  // サマリカード (危険な 5 件)
  // v3.133.0 Phase 222 (Team L): ユーザー要望「問題なし表示が縦余白を取り過ぎ」 → 1 行コンパクト化
  const critical = rows.filter((r) => r.pct >= 70).slice(0, 5);
  const sumEl = document.getElementById("limitsSummary");
  if (critical.length) {
    sumEl.innerHTML = critical.map((r) => {
      const status = r.pct >= 90 ? "🚨 危険水準" : "⚠ 注意水準";
      return `
      <div class="limit-card ${r.pct >= 90 ? "critical" : "warn"}" title="${escape(r.ja)} (${escape(r.name)}): 使用 ${r.used.toLocaleString()} / 上限 ${r.max.toLocaleString()} (${r.pct}%)">
        <div class="title">${escape(r.ja)}</div>
        <div class="val">${r.pct}%</div>
        <div class="sub">${r.used.toLocaleString()} / ${r.max.toLocaleString()} <span style="opacity:0.7">(${status})</span></div>
      </div>`;
    }).join("");
    sumEl.classList.remove("limits-summary-ok");
  } else {
    // Phase 222: 1 行ミニメッセージに圧縮 (旧 limit-card より大幅に縦余白削減)
    sumEl.innerHTML = `<span class="limits-summary-ok-line">✓ 問題なし — 使用率 70% を超える項目はありません (全 ${Object.keys(lastLimitsData).length} 項目を確認)</span>`;
    sumEl.classList.add("limits-summary-ok");
  }

  // 一覧 (列クリックでソート、★ ピン留めトグル)
  const arrow = (col) => _limitsSortCol === col ? (_limitsSortDir === "asc" ? " ▲" : " ▼") : "";
  const root = document.getElementById("limitsResult");
  // v2.93.0: ピン留めトグル、列クリックソート、日本語名+原文 tooltip、ピン留めのみ表示トグル
  // v2.96.0 バグ修正: fmtNum は design-docs.js 内のローカル関数で panel.js からは参照不可 → ReferenceError で renderLimitsList が落ちて「使用状況が取得できない」状態になっていた
  const limitFmt = (n) => Number(n || 0).toLocaleString("ja-JP");
  const html = [`<div class="limit-toolbar" style="margin-bottom:6px;font-size:11px">
    <label style="cursor:pointer"><input type="checkbox" id="chkPinnedOnly" ${_limitsShowPinnedOnly ? "checked" : ""}/> ★ ピン留めのみ表示 (${limitFmt(_limitsPinned.length)} 件)</label>
    <span style="margin-left:12px;color:var(--fg-dim)">表示: ${rows.length} / 全 ${Object.keys(lastLimitsData).length} 件</span>
  </div>`];
  html.push(`<div class="limit-row header">
    <div class="lim-col-pin" data-col="pinned" title="ピン留め">★</div>
    <div class="lim-col-name lim-sortable" data-col="name" title="クリックでソート">項目 (日本語)${arrow("name")}</div>
    <div class="lim-sortable" data-col="used" title="クリックでソート">使用${arrow("used")}</div>
    <div class="lim-sortable" data-col="remaining" title="クリックでソート">残り${arrow("remaining")}</div>
    <div class="lim-sortable" data-col="max" title="クリックでソート">上限${arrow("max")}</div>
    <div>使用率バー</div>
    <div class="lim-sortable" data-col="pct" title="クリックでソート">%${arrow("pct")}</div>
  </div>`);
  for (const r of rows) {
    const cls = r.pct >= 90 ? "critical" : (r.pct >= 70 ? "warn" : (r.pct >= 50 ? "mid" : "low"));
    const star = r.pinned ? "★" : "☆";
    const tooltipName = `${escape(r.ja)} (${escape(r.name)})${r.desc ? "\\n" + escape(r.desc) : ""}`;
    html.push(`<div class="limit-row${r.pinned ? " pinned" : ""}">
      <div class="lim-col-pin lim-pin-btn" data-pin="${escape(r.name)}" title="クリックでピン留め切替">${star}</div>
      <div class="limit-name lim-col-name" title="${tooltipName}">${escape(r.ja)}<span class="lim-en">${escape(r.name)}</span></div>
      <div>${r.used.toLocaleString()}</div>
      <div>${r.remaining.toLocaleString()}</div>
      <div>${r.max.toLocaleString()}</div>
      <div class="limit-bar-wrap"><div class="limit-bar ${cls}" style="width:${Math.min(r.pct, 100)}%"></div></div>
      <div class="limit-pct ${cls}">${r.pct}%</div>
    </div>`);
  }
  // v3.127.0 Phase 217: API で取得できない固定上限を同じ一覧に統合表示 (ユーザー要望「分けないでください」)
  // Phase 202 で details で分離していたが、ユーザー要望により API 上限と同じテーブルに混在
  const filterText = (document.getElementById("limitsFilter")?.value || "").toLowerCase();
  for (const g of HARDCODED_LIMITS_GROUPS) {
    for (const it of g.items) {
      // 検索フィルタ対応
      if (filterText) {
        const hay = (it.ja + " " + g.title + " " + it.value + " " + it.desc).toLowerCase();
        if (!hay.includes(filterText)) continue;
      }
      const tooltipName = `${escape(it.ja)} (${escape(g.title)})\\n${escape(it.desc)}`;
      html.push(`<div class="limit-row hardcoded-row" style="background:rgba(243,156,18,0.05);border-left:3px solid var(--warn);padding-left:7px;">
        <div class="lim-col-pin" title="API で取得できない固定上限 (Phase 202 起源・Phase 217 で統合)">📌</div>
        <div class="limit-name lim-col-name" title="${tooltipName}">${escape(it.ja)}<span class="lim-en" style="color:var(--warn);opacity:0.8;">${escape(g.title)}</span></div>
        <div style="color:var(--fg-dim);" title="API では取得不可">—</div>
        <div style="color:var(--fg-dim);" title="API では取得不可">—</div>
        <div style="font-size:10px;color:var(--ok);font-weight:600;">${escape(it.value)}</div>
        <div class="limit-bar-wrap" style="background:transparent;"><div style="font-size:9px;color:var(--fg-dim);padding:1px 6px;line-height:1.3;">${escape(it.desc.substring(0, 60))}${it.desc.length > 60 ? "…" : ""}</div></div>
        <div style="color:var(--fg-dim);font-size:10px;" title="固定上限のため使用率算出不可">N/A</div>
      </div>`);
    }
  }
  root.innerHTML = html.join("");
  // 列ソートクリックハンドラ
  root.querySelectorAll(".lim-sortable").forEach((el) => {
    el.addEventListener("click", () => toggleLimitSort(el.dataset.col));
  });
  // ピン留めトグル
  root.querySelectorAll(".lim-pin-btn").forEach((el) => {
    el.addEventListener("click", (e) => { e.stopPropagation(); toggleLimitPin(el.dataset.pin); });
  });
  // ピン留めのみ表示トグル
  const chkPin = document.getElementById("chkPinnedOnly");
  if (chkPin) chkPin.addEventListener("change", () => toggleLimitPinnedOnly());
}

// v3.112.0 Phase 202: /limits API では返らない Salesforce 固定上限の解説 (Apex ガバナ / Dashboard / Email / ViewState)
// v3.127.0 Phase 217: モジュールトップレベル定数化 (renderLimitsList から参照するため、ユーザー要望「分けないで」対応)
const HARDCODED_LIMITS_GROUPS = [
    {
      title: "🟧 Apex ガバナ制限 (同期トランザクション)",
      items: [
        { ja: "SOQL クエリ数", value: "100 回", desc: "1 トランザクション内で発行できる SELECT 数。SOQL for ループや Map による事前取得で削減" },
        { ja: "SOQL 取得レコード数", value: "50,000 行", desc: "全 SOQL の累計取得行数。LIMIT 句で意図的に絞る、Aggregate で件数だけ取る等で回避" },
        { ja: "DML ステートメント", value: "150 回", desc: "insert / update / delete / upsert / merge / undelete の合計回数。Bulkify (List 単位で 1 回) が原則" },
        { ja: "DML 処理レコード行数", value: "10,000 行", desc: "全 DML の累計処理行数。大量更新は Batch Apex (200/batch) や Bulk API へ" },
        { ja: "ヒープサイズ", value: "6 MB", desc: "変数・コレクション等が消費できるメモリ。大量 List はループ後 clear() で解放、SOQL も SELECT 列を最小化" },
        { ja: "CPU 時間", value: "10,000 ms (10 秒)", desc: "Apex 実行に費やせる CPU 時間。SOQL/DML 時間は含まない (待機時間扱い)" },
        { ja: "コールアウト数", value: "100 回", desc: "外部 HTTP/REST/SOAP 呼出回数の上限" },
        { ja: "コールアウト合計時間", value: "120 秒", desc: "全コールアウトの実行時間合計。タイムアウトはエンドポイント側設定にも依存" },
        { ja: "PUSH 通知メソッド数", value: "10 回", desc: "Mobile Push に送信できる回数" },
      ],
    },
    {
      title: "🟧🌙 Apex ガバナ制限 (非同期: Batch / @future / Queueable)",
      items: [
        { ja: "SOQL クエリ数", value: "200 回", desc: "非同期は同期の 2 倍。Batch の execute() ごとに上限はリセット" },
        { ja: "DML 処理レコード行数", value: "10,000 行", desc: "同期と同じ。Batch の scope (200/batch) を超えてもこの上限が優先" },
        { ja: "ヒープサイズ", value: "12 MB", desc: "同期 (6 MB) の 2 倍" },
        { ja: "CPU 時間", value: "60,000 ms (60 秒)", desc: "同期 (10 秒) の 6 倍。重い計算は非同期化で回避" },
        { ja: "Batch Apex 同時実行", value: "5 個", desc: "Holding 状態を含まずに Queued + Processing 状態の Batch ジョブ数" },
        { ja: "Queueable チェイン", value: "無制限 (Sandbox: 5 回)", desc: "本番は無制限だが、Sandbox では同期テストから 5 回まで" },
      ],
    },
    {
      title: "📊 ダッシュボード / レポート (Edition 依存)",
      items: [
        { ja: "動的ダッシュボード", value: "Enterprise: 5 / Performance/Unlimited: 10 / Developer: 3", desc: "ユーザコンテキストで動的に表示するダッシュボード数。Spring '24 で上限変更" },
        { ja: "スケジュールダッシュボード更新", value: "Enterprise/Unlimited: 200 / Performance: 200", desc: "スケジュール登録できる総数 (Lightning Experience)" },
        { ja: "ダッシュボードコンポーネント", value: "25 個 / ダッシュボード", desc: "1 ダッシュボードに配置できるコンポーネント数" },
        { ja: "ダッシュボードフィルタ", value: "3 個 / ダッシュボード", desc: "1 ダッシュボードに設定できるフィルタ数" },
        { ja: "レポート行数上限", value: "2,000 行 (Web 表示) / 5,000 行 (Lightning 詳細レポート)", desc: "エクスポート時は 100,000 行までだが Web 表示はこの上限" },
      ],
    },
    {
      title: "📧 メール / Workflow",
      items: [
        { ja: "Apex 単一メール", value: "1,000 件 / 24 時間", desc: "Apex から sendMail で外部宛に送信できる件数 (内部ユーザ宛は無制限)" },
        { ja: "Workflow / Process Builder メール", value: "ベース 5,000 件 + ユーザ単価", desc: "24 時間内の組織全体送信上限。Email Alert + Approval Process 等の合計" },
        { ja: "1 トランザクション内メール", value: "10 件 (Workflow), 1 件 (Approval/Apex)", desc: "1 つの DML の中で送信できる件数" },
        { ja: "Email-to-Case", value: "ライセンス依存", desc: "受信ドメイン × ライセンス数で計算 (Customer Service Cloud)" },
      ],
    },
    {
      title: "🌐 Visualforce / Lightning",
      items: [
        { ja: "Visualforce ViewState", value: "170 KB", desc: "1 ページの ViewState 上限。大量のコンポーネント・apex:repeat の retain は注意" },
        { ja: "Visualforce レンダリング時間", value: "120 秒", desc: "1 ページの最大レンダリング時間" },
        { ja: "Lightning Web Component イベント", value: "ライフサイクル制限", desc: "@api で渡せるプロパティは plain object 推奨 (proxy が深いと遅い)" },
      ],
    },
    {
      title: "📦 ストレージ / 容量 (Edition 依存)",
      items: [
        { ja: "データストレージ ベース", value: "Enterprise/Unlimited: 10 GB + ユーザ単価", desc: "/limits API DataStorageMB で実数値を確認できる" },
        { ja: "ファイルストレージ ベース", value: "Enterprise/Unlimited: 10 GB + ユーザ単価", desc: "/limits API FileStorageMB で実数値を確認できる" },
        { ja: "Big Object", value: "1 兆レコード (理論上)", desc: "AsyncSOQL でのみクエリ可能。実質的なハード上限は契約とアーキテクチャ" },
      ],
    },
    {
      title: "🔄 Flow / Process",
      items: [
        { ja: "アクティブなフローバージョン", value: "1 個 / フロー定義", desc: "Auto-Launched / Record-Trigger は同時に 1 バージョンのみ Active" },
        { ja: "1 トランザクション SOQL/DML", value: "Apex と合算", desc: "Flow も内部的に Apex を実行するため、Apex ガバナと共有" },
        { ja: "Flow タイムアウト", value: "Screen Flow: 通常 30 秒以内推奨", desc: "ユーザー対話型は応答性確保のため長時間処理は非同期化" },
      ],
    },
];

// v3.127.0 Phase 217: 旧 renderHardcodedLimitsSection は API 上限と同じ一覧へ統合のため deprecated (ユーザー要望「分けないで」)
// 関数定義は保持 (renderLimitsList 呼出が削除されているため未使用、Phase 218 以降で完全削除予定)
function renderHardcodedLimitsSection() {
  const groups = HARDCODED_LIMITS_GROUPS;
  let html = `<details class="hardcoded-limits" style="margin-top:12px; background:var(--bg2); border:1px solid var(--accent); border-radius:var(--r-lg); overflow:hidden;">
    <summary style="padding:10px 14px; cursor:pointer; user-select:none; background:linear-gradient(180deg, rgba(27,150,255,0.12) 0%, var(--bg2) 100%); color:var(--accent); font-weight:700; font-size:12px; display:flex; align-items:center; gap:6px;">
      <span style="font-size:14px;">📌</span>
      <span>API で取得できない固定上限 (Apex ガバナ / Dashboard / Email 等) — クリックで展開</span>
    </summary>
    <div style="padding:8px 12px 14px;">`;
  html += `<div class="meta" style="margin-bottom:8px; padding:6px 8px; background:var(--bg); border-left:3px solid var(--accent); border-radius:var(--r-sm); font-size:10px;">
    💡 これらは <code>/services/data/v62.0/limits</code> API では返らない固定値です。
    Edition (Developer / Enterprise / Performance / Unlimited) や Spring 25 リリースで変動する可能性があるため、<a href="https://developer.salesforce.com/docs/atlas.en-us.salesforce_app_limits_cheatsheet.meta/salesforce_app_limits_cheatsheet/" target="_blank" style="color:var(--accent);">公式チートシート</a> も参照してください。
  </div>`;
  for (const g of groups) {
    html += `<details style="margin:6px 0; background:#0a1224; border:1px solid var(--line); border-radius:var(--r-sm);" open>
      <summary style="padding:6px 10px; cursor:pointer; user-select:none; color:var(--fg); font-weight:600; font-size:11px;">${escape(g.title)} (${g.items.length} 項目)</summary>
      <div style="padding:4px 10px 8px;">`;
    for (const it of g.items) {
      html += `<div style="display:grid; grid-template-columns:160px 1fr; gap:8px; padding:4px 0; border-bottom:1px dashed var(--line); font-size:11px;">
        <div style="color:var(--accent); font-weight:600;">${escape(it.ja)}</div>
        <div>
          <div style="color:var(--ok); font-weight:600; font-size:11px;">${escape(it.value)}</div>
          <div style="color:var(--fg-dim); font-size:10px; margin-top:2px; line-height:1.5;">${escape(it.desc)}</div>
        </div>
      </div>`;
    }
    html += `</div></details>`;
  }
  html += `</div></details>`;
  return html;
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

// v3.174.0 Phase 264: Limits を Markdown テーブル形式でクリップボードにコピー
async function copyLimitsMd() {
  if (!lastLimitsData) { panelToast("📭 Limits 情報が未取得です。先に「取得」ボタンをクリックしてください", { kind: "warn" }); return; }
  const lines = [
    "## 組織 Limits 使用状況",
    "",
    `_取得日時: ${new Date().toLocaleString("ja-JP")}_`,
    "",
    "| 項目 | 使用 | 残量 | 上限 | 使用率 |",
    "|---|---:|---:|---:|---:|",
  ];
  // 使用率降順でソート (危険な項目を上に)
  const rows = Object.entries(lastLimitsData).map(([k, v]) => {
    const max = (v && v.Max != null) ? v.Max : 0;
    const rem = (v && v.Remaining != null) ? v.Remaining : 0;
    const used = max - rem;
    const pct = max > 0 ? Math.round((used / max) * 100) : 0;
    return { k, used, rem, max, pct };
  }).sort((a, b) => b.pct - a.pct);
  for (const r of rows) {
    // 90% 超は ⚠ 警告マーク、70% 超は 注意
    const indicator = r.pct >= 90 ? "🚨 " : r.pct >= 70 ? "⚠ " : "";
    const ja = limitJa(r.k) || r.k;
    const mdEsc = (v) => String(v).replace(/\|/g, "\\|");
    lines.push(`| ${mdEsc(indicator + ja)} | ${r.used.toLocaleString()} | ${r.rem.toLocaleString()} | ${r.max.toLocaleString()} | ${r.pct}% |`);
  }
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    panelToast(`📝 Limits Markdown テーブルをコピーしました (${rows.length} 項目)`, { kind: "ok" });
  } catch (e) {
    panelToast("❌ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" });
  }
}

// ====== 設計書ジェネレータ ======
let lastDesign = null;
let designRunId = 0;

async function doGenerateDesign() {
  if (!state.sid) { document.getElementById("designMeta").innerHTML = `<span class="pill err">Salesforce 未接続</span> Salesforce タブで再接続してください`; return; }
  const type = document.getElementById("designType").value;
  const obj = document.getElementById("designObj").value.trim();
  const format = document.getElementById("designFormat").value;
  const meta = document.getElementById("designMeta");
  const preview = document.getElementById("designPreview");
  const source = document.getElementById("designSource");

  // v3.47.0: 「対象」必須タイプで空入力なら API 呼び出し前に早期失敗 → 時間とネットワーク節約 + 業務担当者に即フィードバック
  const TYPE_REQUIRES_OBJ = new Set([
    "objectDef", "profileDetail", "flsReport", "fieldPermMatrix",
    "erDiagram", "flowDetail", "apexDetail", "lwcDetail",
  ]);
  if (TYPE_REQUIRES_OBJ.has(type) && !obj) {
    const label = {
      objectDef: "オブジェクト API 名 (例: Account)",
      profileDetail: "プロファイル名 (例: 営業ユーザー) または '@PermSet_API名'",
      flsReport: "オブジェクト API 名 (例: Account)",
      fieldPermMatrix: "オブジェクト API 名 (例: Account)",
      erDiagram: "オブジェクト API 名 (例: Account)",
      flowDetail: "Flow DeveloperName",
      apexDetail: "Apex クラス名",
      lwcDetail: "LWC バンドル DeveloperName",
    }[type] || "対象";
    meta.innerHTML = `<span class="pill warn">入力が必要</span> 設計書「${escape(type)}」は「対象」が必須です。<span class="meta">入力例: ${escape(label)}</span>`;
    const designObjEl = document.getElementById("designObj");
    if (designObjEl) designObjEl.focus();
    return;
  }

  const unlock = lockBtn("btnDesignGen");
  const myId = ++designRunId;
  meta.textContent = `⏳ 設計書を生成しています… #${myId}`;
  preview.innerHTML = "";
  source.textContent = "";

  const t0 = performance.now();
  try {
    // 進捗コールバック: design-docs.js から呼ばれる (古い実行の進捗は無視)
    const onProgress = (msg) => {
      if (myId !== designRunId) return;
      meta.innerHTML = `<span class="pill loading">生成中… #${myId}</span> <span class="meta">${escape(msg)}</span>`;
    };
    // v3.37.0: 設計書表紙「対象組織」表示改善のため orgId / envLabel を渡す
    const envLabel = /\.sandbox\./.test(state.apiHost || "") ? "SBX"
                   : (/\.develop\./.test(state.apiHost || "") || /\.scratch\./.test(state.apiHost || "")) ? "DEV"
                   : "PROD";
    // v3.142.0 Phase 232: ER 図用オプション (erDiagram 選択時のみ実効)
    const erDepth = type === "erDiagram" ? parseInt((document.getElementById("erDepth") || {}).value || "1", 10) : 1;
    const erMdOnly = type === "erDiagram" ? !!(document.getElementById("erMdOnly") || {}).checked : false;
    const result = await generateDesign({ type, host: state.host, sid: state.sid, apiVersion: state.apiVersion, obj, format, onProgress, orgId: state.orgId, envLabel, erDepth, erMdOnly });
    if (myId !== designRunId) { console.log(`[DevToolsNext] discard stale Design result #${myId}`); return; }
    // v3.134.0 Phase 223 (Team H): 設計書生成成功時、対象オブジェクト名を最近使った候補に push
    if (obj && /^[A-Za-z][A-Za-z0-9_]*$/.test(obj)) pushRecentObject(obj);
    // v3.158.0 Phase 248: 「直前生成」を chrome.storage に保存 (再生成ボタンで利用)
    // v3.169.0 Phase 259: 過去 5 件履歴 (sfdtRecentDesigns) も維持。最新を sfdtLastDesign に保持 (旧互換)
    try {
      const entry = { type, obj, format, ts: Date.now() };
      const prev = await chrome.storage.local.get("sfdtRecentDesigns");
      const list = Array.isArray(prev.sfdtRecentDesigns) ? prev.sfdtRecentDesigns : [];
      // 重複排除 (同じ type + obj + format は 1 件に、最新を先頭)
      const sig = (e) => `${e.type}|${e.obj || ""}|${e.format || ""}`;
      const next = [entry, ...list.filter((e) => sig(e) !== sig(entry))].slice(0, 5);
      await chrome.storage.local.set({ sfdtLastDesign: entry, sfdtRecentDesigns: next });
    } catch {}
    renderDesignLastChip();
    const dt = Math.round(performance.now() - t0);
    lastDesign = result;
    const totalRows = result.sections.reduce((n, s) => n + ((s.rows && s.rows.length) || (s.kvRows && s.kvRows.length) || 0), 0);
    // 0 件結果の統一表示
    if (totalRows === 0) {
      meta.innerHTML = `<span class="pill warn">結果 0 件</span> <span class="meta">${escape(result.title)}: 該当データなし</span> ${dt}ms / 形式=${format}`;
    } else {
      meta.innerHTML = `<span class="pill ok">${result.title}</span> <span class="pill">${result.sections.length} シート / ${totalRows} 行</span> ${dt}ms / 形式=${format}`;
      // v3.74.0: 生成成功時に「対象」入力を履歴に追加 (chrome.storage 永続化)
      if (obj) pushDesignObjHistory(type, obj);
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
      preview.innerHTML = `<h2>${escape(result.title)}</h2><p>Excel 形式 (SpreadsheetML XML / .xls) を生成しました。</p><p><b>ダウンロード</b> ボタンで保存 → ダブルクリックで Excel が開きます。<br/>※ 初回に Excel が「ファイル形式と拡張子が一致しません」と聞いてきたら <b>「はい (Y)」</b> をクリックしてください (中身は正しい XML スプレッドシートです)。開いた後 <b>.xlsx</b> 形式で再保存すると以降は警告なしで開けます。</p><pre><code>${escape(result.source.substring(0, 800))}…</code></pre>`;
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
  // v2.81.0 緊急 ROLLBACK: 拡張子を .xls に戻す (ユーザー報告「Excel で出力できなくなりました」)
  // v2.80.0 で .xml に変更したが、Windows が .xml を Excel で関連付けしておらず、
  // ダブルクリックで Excel が起動しなかった。Excel が「形式と拡張子が一致しない」警告を出すのは
  // SpreadsheetML XML を .xls で出す業界慣例的な仕様で、「はい」で開ける。業務利用上問題なし
  const extMap = { markdown: "md", html: "html", csv: "csv", tsv: "tsv", excel: "xls", xls: "xls", json: "json" };
  const mimeMap = {
    markdown: "text/markdown;charset=utf-8",
    html: "text/html;charset=utf-8",
    csv: "text/csv;charset=utf-8",
    tsv: "text/tab-separated-values;charset=utf-8",
    excel: "application/vnd.ms-excel;charset=utf-8",
    xls: "application/vnd.ms-excel;charset=utf-8",
    json: "application/json;charset=utf-8",
  };
  const ext = extMap[fmt] || "txt";
  const mime = mimeMap[fmt] || "text/plain;charset=utf-8";
  const safeName = (lastDesign.title || "design").replace(/[\\/?*[\]:"<>|]/g, "_").substring(0, 80);
  const ts = tsForFilename();

  // CSV/TSV/HTML は UTF-8 BOM を付ける (Excel が文字化けしないように)
  // Excel SpreadsheetML XML は宣言で encoding を指定済なので BOM 不要 (XML パーサが壊れる)
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
  // v3.199.0 Phase 289: state.isProd を保持して破壊的操作前の confirm ダイアログで参照
  state.isProd = (envLabel === "PROD");
  state.envLabel = envLabel;
  const envTitle =
    envLabel === "SBX" ? "Sandbox 環境です。本番影響なくテスト可能ですが、定期的なリフレッシュで内容が初期化される場合があります" :
    envLabel === "DEV" ? "Developer / Scratch 組織です。学習・検証用途。共有データではないため自由に操作可能" :
                         "⚠️ Production (本番組織) です。UPDATE / DELETE / 匿名 Apex の実行は実データに影響します。誤操作にご注意ください";
  document.getElementById("orgInfo").innerHTML =
    `<span class="env-badge ${envClass}" title="${envTitle}" aria-label="${envTitle}">${envLabel}</span> ` +
    `Org: ${escape(state.orgId)} @ ${escape(state.apiHost)}`;
  unlock();
  // v2.6.0: 接続成功後に sObject 一覧を datalist に流し込み (オブジェクト入力欄の補完用)
  refreshSObjectDatalist();
  // v3.71.0: 現在ユーザー ID を取得して state.userId にキャッシュ (SOQL テンプレートで使用)
  // 失敗時は state.userId = null のまま (テンプレートは REPLACE_USER_ID プレースホルダで継続動作)
  refreshCurrentUserId();
}

async function refreshCurrentUserId() {
  if (!state.sid || !state.host) return;
  try {
    const ui = await getUserInfo({ host: state.host, sid: state.sid, apiVersion: state.apiVersion });
    if (ui && ui.ok && ui.data && ui.data.user_id) {
      state.userId = ui.data.user_id;
      console.log("[DevToolsNext] state.userId cached:", state.userId);
    }
  } catch (e) { console.warn("[DevToolsNext] userId fetch failed (ignored):", e); }
}

// =====================================================================
// v2.87.0: SOQL オートコンプリート (Phase 78 / ユーザー要望対応)
// 「SOQL 書くときは途中まで書けば候補が出てくるようにしてほしい」(2026-05-20)
// 仕様:
//   - textarea#soqlText の入力イベントでカーソル直前の文脈を解析
//   - FROM ＋空白の直後 → describe global のオブジェクト候補
//   - SELECT / カンマ / WHERE / AND / OR の直後 → 現在の FROM オブジェクトの項目候補
//   - ドロップダウン (絶対位置 div) で表示、↑↓ で移動 / Enter or Tab で挿入 / Esc で閉じる
// =====================================================================
const _soqlAutocomplete = {
  fieldsCache: new Map(), // objName -> [{ name, label, type }]
  popup: null,
  selectedIdx: 0,
  candidates: [],
  wordStart: 0, // 補完対象ワードの開始位置
  active: false,
};

function setupSoqlAutocomplete() {
  const textarea = document.getElementById("soqlText");
  if (!textarea) return;
  // ポップアップ DOM を一度だけ作成
  if (!_soqlAutocomplete.popup) {
    const pop = document.createElement("div");
    pop.className = "soql-autocomplete";
    pop.style.display = "none";
    document.body.appendChild(pop);
    _soqlAutocomplete.popup = pop;
  }
  textarea.addEventListener("input", () => updateSoqlAutocomplete(textarea));
  textarea.addEventListener("keydown", (e) => onSoqlAutocompleteKey(e, textarea), true);
  textarea.addEventListener("blur", () => {
    // クリック選択を許容するため少し遅延して閉じる
    setTimeout(() => hideSoqlAutocomplete(), 150);
  });
}

function hideSoqlAutocomplete() {
  if (_soqlAutocomplete.popup) _soqlAutocomplete.popup.style.display = "none";
  _soqlAutocomplete.active = false;
}

function getFromObjectFromSoql(text) {
  // SOQL 文字列から FROM のすぐ後のオブジェクト名を抽出 (最初の 1 つだけ対応)
  const m = text.match(/\bFROM\s+([A-Za-z0-9_]+)/i);
  return m ? m[1] : null;
}

async function getObjectFields(objName) {
  if (!objName || !state.sid) return [];
  if (_soqlAutocomplete.fieldsCache.has(objName)) return _soqlAutocomplete.fieldsCache.get(objName);
  try {
    const r = await sfFetch({ host: state.host, sid: state.sid,
      path: `/services/data/v${state.apiVersion}/sobjects/${encodeURIComponent(objName)}/describe` });
    if (!r.ok || !r.data || !Array.isArray(r.data.fields)) return [];
    // v3.30.0: 参照先 (referenceTo) も取得して候補表示に活用
    const fields = r.data.fields.map((f) => ({
      name: f.name,
      label: f.label || "",
      type: f.type || "",
      referenceTo: Array.isArray(f.referenceTo) ? f.referenceTo : []
    }));
    _soqlAutocomplete.fieldsCache.set(objName, fields);
    return fields;
  } catch { return []; }
}

// v3.30.0: SOQL 候補表示のフィールド型 → アイコン マッピング
function soqlTypeIcon(t) {
  const lc = String(t || "").toLowerCase();
  if (lc === "id") return "🆔";
  if (lc === "reference") return "🔗";
  if (lc === "boolean") return "☑️";
  if (lc === "date" || lc === "datetime" || lc === "time") return "📅";
  if (lc === "currency") return "💴";
  if (lc === "percent") return "％";
  if (lc === "double" || lc === "int" || lc === "integer" || lc === "long") return "🔢";
  if (lc === "email") return "✉️";
  if (lc === "phone") return "📞";
  if (lc === "url") return "🔖";
  if (lc === "textarea") return "📝";
  if (lc === "picklist" || lc === "multipicklist") return "📋";
  if (lc === "address") return "🏠";
  if (lc === "location") return "📍";
  return "🔹";
}

async function updateSoqlAutocomplete(textarea) {
  const text = textarea.value;
  const pos = textarea.selectionStart;
  // カーソル位置の手前ワードを取得
  const before = text.substring(0, pos);
  const wordMatch = before.match(/([A-Za-z0-9_]*)$/);
  const currentWord = wordMatch ? wordMatch[1] : "";
  _soqlAutocomplete.wordStart = pos - currentWord.length;
  // 直前のキーワードを判定 (FROM / SELECT / WHERE / AND / OR / , )
  // 直前ワードの前にあるキーワード/区切り文字
  const beforeWord = before.substring(0, pos - currentWord.length).trimEnd();
  const lastKeywordMatch = beforeWord.match(/\b(FROM|SELECT|WHERE|AND|OR|ORDER\s+BY|GROUP\s+BY)\b[^A-Za-z_]*$/i)
    || beforeWord.match(/(,)\s*$/);
  const lastKw = lastKeywordMatch ? lastKeywordMatch[1].toUpperCase().replace(/\s+/g, " ") : null;

  let candidates = [];
  const q = currentWord.toLowerCase();
  if (lastKw === "FROM") {
    // オブジェクト候補
    if (_datalistObjsCached) {
      candidates = _datalistObjsCached
        .filter((s) => !q || s.name.toLowerCase().startsWith(q) || (s.label || "").toLowerCase().includes(q))
        .slice(0, 20)
        .map((s) => ({ value: s.name, label: s.label || "", type: "object" }));
    }
  } else if (lastKw === "SELECT" || lastKw === "," || lastKw === "WHERE" || lastKw === "AND" || lastKw === "OR" || lastKw === "ORDER BY" || lastKw === "GROUP BY") {
    // 項目候補 (FROM オブジェクトから)
    const objName = getFromObjectFromSoql(text);
    if (objName) {
      const fields = await getObjectFields(objName);
      candidates = fields
        .filter((f) => !q || f.name.toLowerCase().startsWith(q) || (f.label || "").toLowerCase().includes(q))
        .slice(0, 20)
        .map((f) => {
          // v3.30.0: 参照型は参照先も表示 (例: 「取引先 (reference → Account)」)
          const refSuffix = f.type === "reference" && f.referenceTo && f.referenceTo.length
            ? ` → ${f.referenceTo.slice(0, 2).join("/")}` : "";
          return { value: f.name, label: `${f.label || ""} (${f.type || ""}${refSuffix})`, type: "field", fieldType: f.type };
        });
    }
  }
  if (!candidates.length) { hideSoqlAutocomplete(); return; }
  _soqlAutocomplete.candidates = candidates;
  _soqlAutocomplete.selectedIdx = 0;
  _soqlAutocomplete.active = true;
  renderSoqlAutocomplete(textarea);
}

function renderSoqlAutocomplete(textarea) {
  const pop = _soqlAutocomplete.popup;
  if (!pop) return;
  // 位置調整: textarea の境界 + カーソル概算位置 (簡易: textarea の下に出す)
  const rect = textarea.getBoundingClientRect();
  pop.style.left = (rect.left + 8) + "px";
  pop.style.top = (rect.bottom + 2) + "px";
  pop.style.display = "block";
  pop.innerHTML = _soqlAutocomplete.candidates
    .map((c, i) => {
      // v3.30.0: field の場合は型別アイコン、object は 📦
      const icon = c.type === "object" ? "📦" : soqlTypeIcon(c.fieldType);
      return `<div class="ac-item${i === _soqlAutocomplete.selectedIdx ? " selected" : ""}" data-idx="${i}">` +
        `<span class="ac-ico">${icon}</span><span class="ac-val">${escape(c.value)}</span>` +
        (c.label ? `<span class="ac-lbl">${escape(c.label)}</span>` : "") + `</div>`;
    }).join("");
  // クリックで挿入
  pop.querySelectorAll(".ac-item").forEach((el) => {
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const idx = Number(el.dataset.idx);
      insertSoqlCandidate(textarea, _soqlAutocomplete.candidates[idx]);
    });
  });
}

function insertSoqlCandidate(textarea, cand) {
  if (!cand) return;
  const text = textarea.value;
  const pos = textarea.selectionStart;
  const before = text.substring(0, _soqlAutocomplete.wordStart);
  const after = text.substring(pos);
  const inserted = cand.value;
  textarea.value = before + inserted + after;
  const newPos = before.length + inserted.length;
  textarea.setSelectionRange(newPos, newPos);
  textarea.focus();
  hideSoqlAutocomplete();
  // 挿入後に再評価 (次の候補表示)
  setTimeout(() => updateSoqlAutocomplete(textarea), 30);
}

function onSoqlAutocompleteKey(e, textarea) {
  if (!_soqlAutocomplete.active || !_soqlAutocomplete.candidates.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    _soqlAutocomplete.selectedIdx = Math.min(_soqlAutocomplete.selectedIdx + 1, _soqlAutocomplete.candidates.length - 1);
    renderSoqlAutocomplete(textarea);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    _soqlAutocomplete.selectedIdx = Math.max(_soqlAutocomplete.selectedIdx - 1, 0);
    renderSoqlAutocomplete(textarea);
  } else if (e.key === "Enter" || e.key === "Tab") {
    e.preventDefault();
    e.stopPropagation();
    insertSoqlCandidate(textarea, _soqlAutocomplete.candidates[_soqlAutocomplete.selectedIdx]);
  } else if (e.key === "Escape") {
    e.preventDefault();
    hideSoqlAutocomplete();
  }
}

// v2.6.0: 全オブジェクト入力欄 (#exObj, #apiObj, #descObj, #designObj) で list="dl-sobjects" を参照
// describe global の結果をキャッシュして option を生成、再接続時のみ更新
let _datalistObjsCached = null;
// v3.134.0 Phase 223 (Team H): 最近使ったオブジェクト/レコード ID を chrome.storage に保存し datalist 先頭に並べる
// v3.317.0 Phase 407: 「最近使った候補」は履歴 (5 件) と異なる用途 → RECENT_MAX = 10 (datalist 上位表示用、入力補助の選択肢として多めに保持)。
//                     履歴は「実行済み記録」(5 件)、最近候補は「次に使うかもの予測候補」(10 件) で目的が異なるため別 const。
const RECENT_OBJ_KEY = "sfdtRecentObjects";
const RECENT_RECORD_ID_KEY = "sfdtRecentRecordIds";
const RECENT_MAX = 10;
let _recentObjsCache = [];
let _recentRecordIdsCache = [];
async function loadRecentObjects() {
  try {
    const d = await chrome.storage.local.get([RECENT_OBJ_KEY, RECENT_RECORD_ID_KEY]);
    _recentObjsCache = Array.isArray(d[RECENT_OBJ_KEY]) ? d[RECENT_OBJ_KEY] : [];
    _recentRecordIdsCache = Array.isArray(d[RECENT_RECORD_ID_KEY]) ? d[RECENT_RECORD_ID_KEY] : [];
  } catch {}
}
async function pushRecentObject(name) {
  if (!name || typeof name !== "string") return;
  const norm = name.trim();
  if (!norm || norm.length > 80) return;
  try {
    const d = await chrome.storage.local.get(RECENT_OBJ_KEY);
    const list = Array.isArray(d[RECENT_OBJ_KEY]) ? d[RECENT_OBJ_KEY] : [];
    const next = [norm, ...list.filter((n) => n !== norm)].slice(0, RECENT_MAX);
    await chrome.storage.local.set({ [RECENT_OBJ_KEY]: next });
    _recentObjsCache = next;
    refreshSObjectDatalist();
    refreshRecordIdDatalist();
  } catch (e) { console.warn("[recent] push obj failed", e); }
}
async function pushRecentRecordId(id, label = "") {
  if (!id || typeof id !== "string") return;
  const norm = id.trim();
  if (!/^[a-zA-Z0-9]{15,18}$/.test(norm)) return;
  try {
    const d = await chrome.storage.local.get(RECENT_RECORD_ID_KEY);
    const list = Array.isArray(d[RECENT_RECORD_ID_KEY]) ? d[RECENT_RECORD_ID_KEY] : [];
    const entry = { id: norm, label: String(label || "").substring(0, 60), ts: Date.now() };
    const next = [entry, ...list.filter((e) => e && e.id !== norm)].slice(0, RECENT_MAX);
    await chrome.storage.local.set({ [RECENT_RECORD_ID_KEY]: next });
    _recentRecordIdsCache = next;
    refreshRecordIdDatalist();
  } catch (e) { console.warn("[recent] push record id failed", e); }
}
function refreshRecordIdDatalist() {
  // record ID 入力欄 (Inspector の #inspectRef、API ビルダの #apiId 等) 用の datalist
  let dl = document.getElementById("dl-record-ids");
  if (!dl) {
    dl = document.createElement("datalist");
    dl.id = "dl-record-ids";
    document.body.appendChild(dl);
  }
  dl.innerHTML = _recentRecordIdsCache
    .map((e) => `<option value="${escape(e.id)}" label="★ ${escape(e.label || "")} (${escape(e.id)})">`)
    .join("");
  // 既存の input に list 属性を付与
  ["inspectRef", "apiId"].forEach((id) => {
    const inp = document.getElementById(id);
    if (inp && !inp.getAttribute("list")) inp.setAttribute("list", "dl-record-ids");
  });
}
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
    // v3.134.0 Phase 223: 最近使ったオブジェクトを ★ 付きで上位に表示
    // option 形式: value=API 名 / label="(ラベル)" でブラウザの datalist suggestion でも表示
    const recent = _recentObjsCache.filter((n) => !!n);
    const labelMap = new Map(_datalistObjsCached.map((s) => [s.name, s.label || s.name]));
    const recentHtml = recent
      .filter((n) => labelMap.has(n))
      .map((n) => `<option value="${escape(n)}" label="★ 最近使った: ${escape(labelMap.get(n))}">`)
      .join("");
    const allHtml = _datalistObjsCached
      .map((s) => `<option value="${escape(s.name)}" label="${escape(s.label || s.name)}">`)
      .join("");
    dl.innerHTML = recentHtml + allHtml;
  } catch (e) { console.warn("[DevToolsNext] datalist refresh failed:", e); }
}

// レースガード: 連続実行された時、古いリクエストの結果を捨てる
let soqlRunId = 0;
// v3.2.0 Phase 92: エビデンス取得機能 (テスト工程用) — Markdown レポート生成
// 各画面の現在状態 + 組織情報 + 日時 + ユーザを 1 クリックで Markdown 化
function makeEvidence({ title, sourceLabel, sourceContent, recordsLabel, records, extraMeta }) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const lines = [];
  lines.push(`# ${title || "エビデンス"}`);
  lines.push("");
  lines.push("## メタ情報");
  lines.push("");
  lines.push("| 項目 | 値 |");
  lines.push("|---|---|");
  lines.push(`| 取得日時 | ${dateStr} |`);
  lines.push(`| 組織ドメイン | ${state.host || "(未接続)"} |`);
  lines.push(`| 組織 ID | ${state.orgId || "-"} |`);
  lines.push(`| API バージョン | v${state.apiVersion || "62.0"} |`);
  lines.push(`| 拡張機能 | DevToolsNext v${chrome.runtime.getManifest().version} |`);
  if (extraMeta) {
    for (const [k, v] of Object.entries(extraMeta)) lines.push(`| ${k} | ${String(v).replace(/\|/g, "\\|")} |`);
  }
  lines.push("");
  if (sourceLabel && sourceContent) {
    lines.push(`## ${sourceLabel}`);
    lines.push("");
    lines.push("```");
    lines.push(sourceContent);
    lines.push("```");
    lines.push("");
  }
  if (recordsLabel && records && records.length) {
    lines.push(`## ${recordsLabel}`);
    lines.push("");
    lines.push(`総件数: **${records.length} 件**`);
    lines.push("");
    // Markdown テーブル化
    const cols = new Set();
    records.forEach((r) => Object.keys(r).forEach((k) => k !== "attributes" && cols.add(k)));
    const headers = Array.from(cols);
    if (headers.length) {
      lines.push("| " + headers.join(" | ") + " |");
      lines.push("|" + headers.map(() => "---").join("|") + "|");
      records.slice(0, 200).forEach((r) => {
        const row = headers.map((h) => {
          const v = r[h];
          if (v == null) return "";
          let s = typeof v === "object" ? JSON.stringify(v) : String(v);
          return s.replace(/\|/g, "\\|").replace(/\n/g, " ").substring(0, 120);
        });
        lines.push("| " + row.join(" | ") + " |");
      });
      if (records.length > 200) lines.push(`\n*(${records.length - 200} 件は省略)*`);
    }
    lines.push("");
  }
  lines.push("---");
  lines.push(`Generated by DevToolsNext at ${dateStr}`);
  return lines.join("\n");
}

function downloadEvidence(md, baseName) {
  const blob = new Blob(["﻿" + md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName || "evidence"}-${tsForFilename()}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  // v3.128.0 Phase 218: Markdown と同時に Salesforce タブの PNG スクリーンショットも保存 (ユーザー要望「エビデンス取得は画像の取得としたい」)
  captureScreenshotPng(baseName).catch((e) => console.warn("[evidence] screenshot failed (ignored):", e));
}

// v3.128.0 Phase 218: chrome.tabs.captureVisibleTab で Salesforce タブの PNG スクリーンショットを取得 → ダウンロード
async function captureScreenshotPng(baseName) {
  try {
    const res = await chrome.runtime.sendMessage({ type: "sfdt:capture" });
    if (!res || !res.ok || !res.dataUrl) {
      panelToast(`⚠ 画像エビデンス失敗: ${res?.error || "background から PNG が返りませんでした"}`, { kind: "warn" });
      return;
    }
    // dataUrl (data:image/png;base64,...) → Blob → download
    const r = await fetch(res.dataUrl);
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName || "evidence"}-${tsForFilename()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    panelToast(`📸 画像エビデンスも保存しました (Salesforce タブの可視範囲 PNG)`, { kind: "ok" });
  } catch (e) {
    panelToast(`⚠ 画像エビデンス失敗: ${String(e && e.message || e)}`, { kind: "warn" });
  }
}

function captureSoqlEvidence() {
  if (!state.lastRecords || !state.lastRecords.length) {
    panelToast("📭 エビデンス対象がありません。先に SOQL を実行してください", { kind: "warn" });
    return;
  }
  const soqlEl = document.getElementById("soqlText");
  const tooling = document.getElementById("useTooling")?.checked;
  const md = makeEvidence({
    title: "SOQL 実行エビデンス",
    sourceLabel: tooling ? "SOQL クエリ (Tooling API)" : "SOQL クエリ",
    sourceContent: soqlEl ? soqlEl.value : "",
    recordsLabel: "実行結果",
    records: state.lastRecords,
  });
  downloadEvidence(md, "soql-evidence");
  panelToast(`📸 SOQL エビデンスを Markdown でダウンロードしました (${state.lastRecords.length} 件)`, { kind: "ok" });
}

function captureLimitsEvidence() {
  if (!lastLimitsData) {
    panelToast("📭 エビデンス対象がありません。先に Limits を取得してください", { kind: "warn" });
    return;
  }
  // Limits 全件をテーブル化
  const records = Object.entries(lastLimitsData).map(([k, v]) => {
    const max = (v && v.Max != null) ? v.Max : 0;
    const remaining = (v && v.Remaining != null) ? v.Remaining : 0;
    const used = max - remaining;
    const pct = max > 0 ? Math.round((used / max) * 100) : 0;
    return {
      "Limit 名": (typeof limitJa === "function" ? limitJa(k) : k),
      "API 名": k,
      "使用": used.toLocaleString(),
      "残り": remaining.toLocaleString(),
      "上限": max.toLocaleString(),
      "使用率": `${pct}%`,
    };
  });
  const md = makeEvidence({
    title: "Limits 使用状況エビデンス",
    extraMeta: { "取得対象": "組織の全 Limits", "監視ポイント": "70% 以上は注意、90% 以上は危険" },
    recordsLabel: "Limits 一覧",
    records,
  });
  downloadEvidence(md, "limits-evidence");
  panelToast(`📸 Limits エビデンスを Markdown でダウンロードしました (${records.length} 件)`, { kind: "ok" });
}

function captureLoginHistoryEvidence() {
  if (!state.lastLoginRecords || !state.lastLoginRecords.length) {
    panelToast("📭 エビデンス対象がありません。先にログイン履歴を取得してください", { kind: "warn" });
    return;
  }
  // ログイン履歴を表示形式 (日時順) で整形
  const records = state.lastLoginRecords.map((rec) => ({
    "ログイン日時": rec.LoginTime ? rec.LoginTime.replace("T", " ").replace(/\..*$/, "") : "",
    "種別": rec.LoginType || "",
    "アプリ": rec.Application || "",
    "ステータス": rec.Status || "",
    "API 種別": rec.ApiType || "",
    "API ver": rec.ApiVersion || "",
    "クライアント": rec.ClientVersion || "",
    "ブラウザ": rec.Browser || "",
    "プラットフォーム": rec.Platform || "",
    "送信元 IP": rec.SourceIp || "",
  }));
  const successCount = state.lastLoginRecords.filter((r) => r.Status === "Success").length;
  const failedCount = state.lastLoginRecords.length - successCount;
  const md = makeEvidence({
    title: "ログイン履歴エビデンス",
    extraMeta: {
      "総件数": state.lastLoginRecords.length,
      "成功": successCount,
      "失敗": failedCount,
    },
    recordsLabel: "ログイン履歴",
    records,
  });
  downloadEvidence(md, "login-history-evidence");
  panelToast(`📸 ログイン履歴エビデンスを Markdown でダウンロードしました (${records.length} 件)`, { kind: "ok" });
}

function captureApexEvidence() {
  const code = document.getElementById("apexCode")?.value || "";
  const result = document.getElementById("apexResult")?.textContent || "";
  if (!code.trim() && !result.trim()) {
    panelToast("📭 エビデンス対象がありません。先に Apex を実行してください", { kind: "warn" });
    return;
  }
  const md = makeEvidence({
    title: "匿名 Apex 実行エビデンス",
    sourceLabel: "実行した匿名 Apex コード",
    sourceContent: code,
    extraMeta: { "実行ログサイズ": `${result.length.toLocaleString()} 文字` },
  });
  // 実行ログを追加 (records ではなく code block として)
  const md2 = md + "\n\n## 実行結果 / Debug ログ\n\n```\n" + result.substring(0, 10000) + (result.length > 10000 ? "\n…(10,000 文字以降は省略)" : "") + "\n```\n";
  downloadEvidence(md2, "apex-evidence");
  panelToast(`📸 Apex 実行エビデンスを Markdown でダウンロードしました`, { kind: "ok" });
}

function captureMetadataEvidence() {
  const result = document.getElementById("metadataResult");
  const table = result?.querySelector("table");
  if (!table) {
    panelToast("📭 エビデンス対象がありません。先にメタデータ一覧を取得してください", { kind: "warn" });
    return;
  }
  // テーブルから records に逆変換
  const headers = Array.from(table.querySelectorAll("th")).map((th) => th.textContent.trim());
  const records = Array.from(table.querySelectorAll("tbody tr, table > tr")).filter((tr) => !tr.querySelector("th")).map((tr) => {
    const cells = Array.from(tr.cells).map((td) => td.textContent.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ""; });
    return row;
  });
  const mdType = document.getElementById("mdType")?.value || "(不明)";
  const md = makeEvidence({
    title: `メタデータ一覧エビデンス (${mdType})`,
    extraMeta: { "メタデータ種別": mdType },
    recordsLabel: `${mdType} 一覧`,
    records,
  });
  downloadEvidence(md, `metadata-${mdType.toLowerCase()}-evidence`);
  panelToast(`📸 メタデータ一覧エビデンスを Markdown でダウンロードしました (${records.length} 件)`, { kind: "ok" });
}

function captureInspectorEvidence() {
  if (!inspectState.record || !inspectState.describe) {
    panelToast("📭 エビデンス対象がありません。先にレコードを取得してください", { kind: "warn" });
    return;
  }
  // レコードの全項目を「項目 / 値」の 1 件レコードに変換
  const fields = (inspectState.describe.fields || []).filter((f) => !SYSTEM_FIELDS.has(f.name));
  const records = fields.map((f) => ({
    "API 名": f.name,
    "ラベル": f.label || "",
    "型": fieldTypeJa ? fieldTypeJa(f.type, (f.referenceTo || [])[0]) : f.type,
    "値": stringify(inspectState.record[f.name]),
  }));
  const md = makeEvidence({
    title: "レコード詳細エビデンス",
    extraMeta: {
      "対象オブジェクト": inspectState.obj || "",
      "レコード ID": inspectState.id || "",
    },
    recordsLabel: "項目値",
    records,
  });
  downloadEvidence(md, `inspector-evidence-${inspectState.obj || "rec"}`);
  panelToast(`📸 Inspector エビデンスを Markdown でダウンロードしました`, { kind: "ok" });
}

async function doSoql() {
  if (!state.sid) return;
  const myId = ++soqlRunId;
  const soql = document.getElementById("soqlText").value.trim();
  const tooling = document.getElementById("useTooling").checked;
  const meta = document.getElementById("soqlMeta");
  const runBtn = document.getElementById("btnRunSoql");
  if (!soql) {
    // v3.48.0: 早期バリデーション + 入力欄にフォーカス戻し
    meta.innerHTML = `<span class="pill warn">⚠ 入力が必要</span> SOQL クエリを入力してください (例: <code>SELECT Id, Name FROM Account LIMIT 10</code>)`;
    const ta = document.getElementById("soqlText");
    if (ta) ta.focus();
    return;
  }
  meta.innerHTML = `<span class="pill loading">SOQL を実行しています… #${myId}</span>`;
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
  // v3.46.0: 共有 SOQL 履歴に push (mini-panel と同期)
  pushSharedSoqlHistory(soql);
  // v3.134.0 Phase 223 (Team H): SOQL 結果の先頭 5 件の Id を最近使った候補に保存
  captureSoqlRecentIds(recs);
  // SOQL から FROM <Object> も解析して push
  const fromMatch = soql.match(/\bFROM\s+([A-Za-z][A-Za-z0-9_]*)/i);
  if (fromMatch) pushRecentObject(fromMatch[1]);
}

// v3.46.0: 3 モード共有 SOQL 履歴 (panel + tool + mini-panel) — chrome.storage.local の sfdtRecentSoql キー
// v3.316.0 Phase 406: 履歴最大 5 件保存は 3 モード共通の magic number (panel/popup/content/design-docs すべて slice(0, 5))。
//                     panel-tool は 5 件表示、mini-panel は先頭 3 件のみ表示 (content.js renderMiniHistory)。
const SHARED_SOQL_HISTORY_KEY = "sfdtRecentSoql";
async function loadSharedSoqlHistory() {
  try {
    const data = await chrome.storage.local.get(SHARED_SOQL_HISTORY_KEY);
    const list = Array.isArray(data[SHARED_SOQL_HISTORY_KEY]) ? data[SHARED_SOQL_HISTORY_KEY] : [];
    renderSharedSoqlHistory(list);
  } catch { renderSharedSoqlHistory([]); }
}
async function pushSharedSoqlHistory(soql) {
  const norm = String(soql || "").trim();
  if (!norm) return;
  try {
    const data = await chrome.storage.local.get(SHARED_SOQL_HISTORY_KEY);
    const list = Array.isArray(data[SHARED_SOQL_HISTORY_KEY]) ? data[SHARED_SOQL_HISTORY_KEY] : [];
    const next = [norm, ...list.filter((q) => q !== norm)].slice(0, 5);
    await chrome.storage.local.set({ [SHARED_SOQL_HISTORY_KEY]: next });
    renderSharedSoqlHistory(next);
  } catch {}
}
function renderSharedSoqlHistory(list) {
  const row = document.getElementById("soqlHistRow");
  if (!row) return;
  if (!list || !list.length) { row.innerHTML = ""; return; }
  const trunc = (s, n) => (s.length > n ? s.substring(0, n) + "…" : s);
  row.innerHTML = `<span class="soql-hist-label">最近のクエリ:</span>`;
  list.forEach((soql) => {
    const chip = document.createElement("button");
    chip.className = "soql-hist-chip";
    chip.textContent = trunc(soql, 60);
    chip.title = `クリックでこの SOQL をエディタに反映して実行: ${soql}`;
    chip.addEventListener("click", () => {
      const ta = document.getElementById("soqlText");
      if (ta) { ta.value = soql; ta.focus(); }
      const btn = document.getElementById("btnRunSoql");
      if (btn) btn.click();
    });
    row.appendChild(chip);
  });
}

// v3.77.0: REST API リクエスト履歴 (panel + tool 共通) — chrome.storage.local の sfdtRecentRest キー、最大 5 件
// 保存内容: { method, path, body } — レスポンスは含めない (再現できれば十分、また個人情報を残さない)
const REST_HISTORY_KEY = "sfdtRecentRest";
async function loadRestHistory() {
  try {
    const data = await chrome.storage.local.get(REST_HISTORY_KEY);
    const list = Array.isArray(data[REST_HISTORY_KEY]) ? data[REST_HISTORY_KEY] : [];
    renderRestHistory(list);
  } catch { renderRestHistory([]); }
}
async function pushRestHistory(entry) {
  const method = String(entry && entry.method || "").trim().toUpperCase();
  const path = String(entry && entry.path || "").trim();
  const body = String(entry && entry.body || "").trim();
  if (!method || !path) return;
  try {
    const data = await chrome.storage.local.get(REST_HISTORY_KEY);
    const list = Array.isArray(data[REST_HISTORY_KEY]) ? data[REST_HISTORY_KEY] : [];
    const norm = { method, path, body };
    const isSame = (e) => e && e.method === method && e.path === path && (e.body || "") === body;
    const next = [norm, ...list.filter((e) => !isSame(e))].slice(0, 5);
    await chrome.storage.local.set({ [REST_HISTORY_KEY]: next });
    renderRestHistory(next);
  } catch {}
}
function renderRestHistory(list) {
  const row = document.getElementById("restHistRow");
  if (!row) return;
  if (!list || !list.length) { row.innerHTML = ""; return; }
  const trunc = (s, n) => (s.length > n ? s.substring(0, n) + "…" : s);
  row.innerHTML = `<span class="rest-hist-label">最近のリクエスト:</span>`;
  list.forEach((entry) => {
    const chip = document.createElement("button");
    chip.className = "rest-hist-chip";
    chip.dataset.method = entry.method || "";
    // method ごとに色分け (GET=青/POST=緑/PATCH=橙/DELETE=赤) は CSS の data-method 属性セレクタで
    chip.innerHTML = `<span class="rest-hist-method rest-method-${escape((entry.method || "GET").toLowerCase())}">${escape(entry.method || "?")}</span> ${escape(trunc(entry.path || "", 50))}`;
    const bodyPreview = entry.body ? `\nBody: ${entry.body.length > 200 ? entry.body.substring(0, 200) + "…" : entry.body}` : "";
    chip.title = `クリックで Method/Path/Body をフォームに反映 (実行はせず、確認してから「送信」を押してください):\n${entry.method} ${entry.path}${bodyPreview}`;
    chip.addEventListener("click", () => {
      const m = document.getElementById("restMethod");
      const p = document.getElementById("restPath");
      const b = document.getElementById("restBody");
      if (m) m.value = entry.method || "GET";
      if (p) p.value = entry.path || "";
      if (b) b.value = entry.body || "";
      if (p) p.focus();
      panelToast("📥 履歴の REST リクエストをフォームに反映しました (送信は「送信」ボタンで)", { kind: "ok" });
    });
    row.appendChild(chip);
  });
}

// v3.76.0: Apex 実行履歴 (panel + tool 共通) — chrome.storage.local の sfdtRecentApex キー、最大 5 件
const APEX_HISTORY_KEY = "sfdtRecentApex";
async function loadApexHistory() {
  try {
    const data = await chrome.storage.local.get(APEX_HISTORY_KEY);
    const list = Array.isArray(data[APEX_HISTORY_KEY]) ? data[APEX_HISTORY_KEY] : [];
    renderApexHistory(list);
  } catch { renderApexHistory([]); }
}
async function pushApexHistory(code) {
  const norm = String(code || "").trim();
  if (!norm) return;
  try {
    const data = await chrome.storage.local.get(APEX_HISTORY_KEY);
    const list = Array.isArray(data[APEX_HISTORY_KEY]) ? data[APEX_HISTORY_KEY] : [];
    const next = [norm, ...list.filter((c) => c !== norm)].slice(0, 5);
    await chrome.storage.local.set({ [APEX_HISTORY_KEY]: next });
    renderApexHistory(next);
  } catch {}
}
function renderApexHistory(list) {
  const row = document.getElementById("apexHistRow");
  if (!row) return;
  if (!list || !list.length) { row.innerHTML = ""; return; }
  const summarize = (code) => {
    // 1 行目をラベルに使う (空/コメントなら 2 行目以降を試行)
    const lines = code.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    const firstNonComment = lines.find((l) => !l.startsWith("//") && !l.startsWith("/*")) || lines[0] || "(空)";
    return firstNonComment.length > 50 ? firstNonComment.substring(0, 50) + "…" : firstNonComment;
  };
  row.innerHTML = `<span class="apex-hist-label">最近の Apex:</span>`;
  list.forEach((code) => {
    const chip = document.createElement("button");
    chip.className = "apex-hist-chip";
    chip.textContent = summarize(code);
    chip.title = `クリックでこの Apex をエディタに反映 (実行はせず、確認してから ▶ を押してください):\n\n${code.length > 300 ? code.substring(0, 300) + "…" : code}`;
    chip.addEventListener("click", () => {
      const ta = document.getElementById("apexCode");
      if (ta) { ta.value = code; ta.focus(); }
      panelToast("📥 履歴の Apex をエディタに反映しました (実行は ▶ ボタンで)", { kind: "ok" });
    });
    row.appendChild(chip);
  });
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

// v3.134.0 Phase 223 (Team H): SOQL 結果の Id 列で見つかった ID を最近使った候補に push する
function captureSoqlRecentIds(records) {
  if (!Array.isArray(records)) return;
  for (const rec of records.slice(0, 5)) {
    if (!rec || typeof rec !== "object") continue;
    const id = rec.Id;
    if (typeof id !== "string" || !/^[a-zA-Z0-9]{15,18}$/.test(id)) continue;
    const objName = (rec.attributes && rec.attributes.type) || "";
    const label = rec.Name || rec.Subject || rec.CaseNumber || rec.Title || "";
    pushRecentRecordId(id, `${objName}${label ? ": " + label : ""}`);
    if (objName) pushRecentObject(objName);
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
  // v3.185.0 Phase 275: 設計書 MD コピーボタンが参照する最新 describe データを state に保持
  state.lastDescribe = { obj, data: r.data };
  // v3.257.0 Phase 347 (Team H): describe 成功時、対象オブジェクト名を最近使った候補に push (datalist 上位 ★ 表示)
  if (/^[A-Za-z][A-Za-z0-9_]*$/.test(obj)) pushRecentObject(obj);
  // v3.184.0 Phase 274: 項目統計サマリ (組織監査・ガバナンス用途) + custom 列追加
  const d = r.data || {};
  const total = fields.length;
  const customCount = fields.filter((f) => f.custom).length;
  const requiredCount = fields.filter((f) => !f.nillable && !f.defaultedOnCreate && f.createable).length;
  const uniqueCount = fields.filter((f) => f.unique).length;
  const formulaCount = fields.filter((f) => f.calculated).length;
  const picklistCount = fields.filter((f) => f.type === "picklist" || f.type === "multipicklist").length;
  const lookupCount = fields.filter((f) => f.type === "reference").length;
  const summary = `<div class="describe-summary" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 4px;font-size:11px">
    <span class="pill" style="background:var(--accent);color:#fff" title="オブジェクトラベル / API 名">📋 ${escape(d.label || obj)} <span style="opacity:0.85">(${escape(d.name || obj)})</span></span>
    <span class="pill" title="全項目数">📐 全 ${total} 項目</span>
    <span class="pill" title="カスタム項目数 (__c)">🔧 カスタム ${customCount}</span>
    <span class="pill" title="必須項目数 (非 nillable かつ作成可能)">⚠ 必須 ${requiredCount}</span>
    <span class="pill" title="ユニーク制約のある項目数">🔑 ユニーク ${uniqueCount}</span>
    <span class="pill" title="数式項目数 (calculated)">∑ 数式 ${formulaCount}</span>
    <span class="pill" title="選択リスト項目数 (picklist + multipicklist)">📋 選択リスト ${picklistCount}</span>
    <span class="pill" title="参照型項目数 (reference / lookup)">🔗 参照 ${lookupCount}</span>
    ${d.createable ? `<span class="pill ok" title="作成可能">＋作成 OK</span>` : `<span class="pill warn" title="作成不可">＋作成 ×</span>`}
    ${d.updateable ? `<span class="pill ok" title="更新可能">✎更新 OK</span>` : `<span class="pill warn" title="更新不可">✎更新 ×</span>`}
    ${d.deletable ? `<span class="pill ok" title="削除可能">🗑削除 OK</span>` : `<span class="pill warn" title="削除不可">🗑削除 ×</span>`}
    ${d.queryable ? `<span class="pill ok" title="SOQL クエリ可能">🔎 query OK</span>` : ""}
    ${d.custom ? `<span class="pill" title="カスタムオブジェクト">🏷️ カスタムオブジェクト</span>` : ""}
  </div>`;
  document.getElementById("describeResult").innerHTML = summary + recordsTable(
    fields.map((f) => ({
      name: f.name, label: f.label, type: f.type,
      length: f.length, required: !f.nillable && !f.defaultedOnCreate,
      unique: f.unique, custom: f.custom ? "✓" : "",
      picklist: (f.picklistValues || []).length || "",
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
  if (!path) {
    // v3.49.0: 早期バリデーション + 入力欄にフォーカス戻し
    meta.innerHTML = `<span class="pill warn">⚠ 入力が必要</span> REST API パスを入力してください (例: <code>/services/data/v62.0/limits</code> / <code>/services/data/v62.0/sobjects/Account/describe</code>)`;
    const inp = document.getElementById("restPath");
    if (inp) inp.focus();
    return;
  }
  // v3.199.0 Phase 289 / v3.304.0 Phase 394: PROD 環境で破壊的 REST 呼び出し (POST/PATCH/DELETE) 前に confirm ダイアログ — Phase 394 で 6 経路の format 統一 (🚨🚨 sandwich style)
  if (state.isProd && ["POST", "PATCH", "DELETE"].includes(method)) {
    const ok = window.confirm(
      `🚨🚨 本番組織 (PROD) での 破壊的 REST 呼び出し (${method}) 🚨🚨\n` +
      `対象組織: ${state.host || "?"}\n\n` +
      `Method: ${method}\nPath: ${path}\n\n` +
      `実データが変更・削除される可能性があります。\n本当に実行してよろしいですか？\n\n` +
      `(Sandbox での事前テストを強く推奨します)`
    );
    if (!ok) {
      meta.innerHTML = `<span class="pill warn">⚠ PROD ${method} 実行をキャンセルしました</span>`;
      return;
    }
  }
  const myId = ++restRunId;
  meta.textContent = `📡 送信中… #${myId}`;
  const t0 = performance.now();
  const r = await sfFetch({ host: state.host, sid: state.sid, path, method, body: body || null });
  const dt = Math.round(performance.now() - t0);
  if (myId !== restRunId) { console.log(`[DevToolsNext] discard stale REST result #${myId}`); return; }
  if (!r.ok) {
    displayApiError(meta, r.status, r.data, `REST ${method}`);
  } else {
    // v3.135.0 Phase 225 (Team R): メソッド + パス + サイズも表示してレスポンス全体を即把握可能に
    const bodySize = r.raw ? r.raw.length : 0;
    const sizeLabel = bodySize < 1024 ? `${bodySize} B` : `${(bodySize / 1024).toFixed(1)} KB`;
    meta.innerHTML = `<span class="pill ok">HTTP ${r.status}</span> <span class="pill" title="HTTP メソッド">${escape(method)}</span> <span class="pill" title="リクエストパス">${escape(path.length > 60 ? path.substring(0, 60) + "…" : path)}</span> <span class="meta">${dt}ms / ${sizeLabel}</span>`;
    // v3.259.0 Phase 349 (Team R/H): REST 成功時、path から SObject 名 + レコード ID を抽出して最近使った候補に push
    // 経路パターン: /services/data/v62.0/sobjects/<Object>/<Id>?... または /sobjects/<Object>/describe
    const m = path.match(/\/sobjects\/([A-Za-z][A-Za-z0-9_]*)(?:\/([a-zA-Z0-9]{15,18}))?/);
    if (m) {
      const objName = m[1];
      const recId = m[2];
      pushRecentObject(objName);
      if (recId) {
        const lbl = (r.data && typeof r.data === "object" && (r.data.Name || r.data.Subject || r.data.CaseNumber || r.data.Title)) || objName;
        pushRecentRecordId(recId, `${objName}${lbl ? ": " + lbl : ""}`);
      }
    }
  }
  // Phase 225 改善: 空レスポンス (204 No Content / DELETE 成功) でも親切メッセージ
  const resultEl = document.getElementById("restResult");
  if (r.data == null || (typeof r.data === "string" && !r.data)) {
    resultEl.textContent = `// HTTP ${r.status} ${r.ok ? "✓ 成功" : "✗ 失敗"} — レスポンス本文なし (${method === "DELETE" ? "DELETE 成功は通常 204 No Content" : "API 仕様"})`;
  } else {
    resultEl.textContent = typeof r.data === "object" ? JSON.stringify(r.data, null, 2) : String(r.data);
  }
  // v3.77.0: 履歴に push (HTTP ステータスに関わらず — 失敗 URL の再試行も業務上有用)
  pushRestHistory({ method, path, body });
}

// v3.83.0: REST API body textarea の入力中バックアップ (14 種、3 連 textarea 完全救済)
// 業務シナリオ: POST/PATCH の JSON body を組み立て中にタブが落ちる → 復元したい
// REST 履歴 (Phase 167) は送信時のスナップショットなので、コンパイル前の draft とは別問題
const REST_BODY_DRAFT_KEY = "sfdtRestBodyDraft";
let _restBodyDraftTimer = null;
async function loadRestBodyDraft() {
  try {
    const data = await chrome.storage.local.get(REST_BODY_DRAFT_KEY);
    const saved = data[REST_BODY_DRAFT_KEY];
    if (typeof saved !== "string" || !saved.trim()) return;
    const ta = document.getElementById("restBody");
    if (!ta) return;
    if (ta.value === saved) return;
    ta.value = saved;
    panelToast("📝 編集中だった REST API ボディを復元しました", { kind: "ok" });
  } catch {}
}
function scheduleSaveRestBodyDraft(text) {
  if (_restBodyDraftTimer) clearTimeout(_restBodyDraftTimer);
  _restBodyDraftTimer = setTimeout(async () => {
    try {
      if (!text || !text.trim()) await chrome.storage.local.remove(REST_BODY_DRAFT_KEY);
      else await chrome.storage.local.set({ [REST_BODY_DRAFT_KEY]: text });
    } catch {}
  }, 300);
}

// v3.82.0: Apex コード textarea の入力中バックアップ (Phase 171 SOQL と同パターン、13 種)
// 業務シナリオ: 長い匿名 Apex (バッチ起動、Test% 削除確認等) を組み立て中にタブが落ちる → 復元したい
const APEX_DRAFT_KEY = "sfdtApexDraft";
let _apexDraftTimer = null;
async function loadApexDraft() {
  try {
    const data = await chrome.storage.local.get(APEX_DRAFT_KEY);
    const saved = data[APEX_DRAFT_KEY];
    if (typeof saved !== "string" || !saved.trim()) return;
    const ta = document.getElementById("apexCode");
    if (!ta) return;
    if (ta.value === saved) return;
    ta.value = saved;
    panelToast("📝 編集中だった匿名 Apex コードを復元しました", { kind: "ok" });
  } catch {}
}
function scheduleSaveApexDraft(text) {
  if (_apexDraftTimer) clearTimeout(_apexDraftTimer);
  _apexDraftTimer = setTimeout(async () => {
    try {
      if (!text || !text.trim()) await chrome.storage.local.remove(APEX_DRAFT_KEY);
      else await chrome.storage.local.set({ [APEX_DRAFT_KEY]: text });
    } catch {}
  }, 300);
}

// v3.81.0: SOQL クエリ textarea の入力中バックアップ (300ms debounce で chrome.storage に draft 保存) (12 種)
// 業務シナリオ: 長い SOQL を組み立て中にタブを誤って閉じる / DevTools をリロードする → 復元したい
// savedQueries (手動命名保存) や sfdtRecentSoql (実行済み履歴) ではカバーできない「未実行 draft」を救済
const SOQL_DRAFT_KEY = "sfdtSoqlDraft";
let _soqlDraftTimer = null;
async function loadSoqlDraft() {
  try {
    const data = await chrome.storage.local.get(SOQL_DRAFT_KEY);
    const saved = data[SOQL_DRAFT_KEY];
    if (typeof saved !== "string" || !saved.trim()) return;
    const ta = document.getElementById("soqlText");
    if (!ta) return;
    // HTML の初期値 (Account のサンプル) より draft を優先 — ユーザーが直前まで編集していたクエリを復元
    // 既に draft と同一なら何もしない (input イベント発火による無限ループ防止)
    if (ta.value === saved) return;
    ta.value = saved;
    // 控えめな toast — UX 上、無音で書き換わると混乱するため
    panelToast("📝 編集中だった SOQL クエリを復元しました", { kind: "ok" });
  } catch {}
}
function scheduleSaveSoqlDraft(text) {
  if (_soqlDraftTimer) clearTimeout(_soqlDraftTimer);
  _soqlDraftTimer = setTimeout(async () => {
    try {
      // 空文字 (もしくは空白のみ) なら storage からキー自体を削除 (容量節約)
      if (!text || !text.trim()) await chrome.storage.local.remove(SOQL_DRAFT_KEY);
      else await chrome.storage.local.set({ [SOQL_DRAFT_KEY]: text });
    } catch {}
  }, 300);
}

// v3.80.0: Apex Debug ログ取得チェック状態を chrome.storage に保存し、次回起動時に復元 (11 種)
// 業務担当者で Debug ログ参照権限が無い人は「毎回 OFF にする」運用が発生 → 起動時復元で 1 クリック削減
const APEX_FETCH_LOG_KEY = "sfdtApexFetchLog";
async function loadApexFetchLog() {
  try {
    const data = await chrome.storage.local.get(APEX_FETCH_LOG_KEY);
    const saved = data[APEX_FETCH_LOG_KEY];
    if (typeof saved !== "boolean") return;
    const cb = document.getElementById("apexFetchLog");
    if (cb) cb.checked = saved;
  } catch {}
}
async function saveApexFetchLog(checked) {
  try { await chrome.storage.local.set({ [APEX_FETCH_LOG_KEY]: !!checked }); } catch {}
}

// v3.79.0: SOQL Tooling API チェック状態を chrome.storage に保存し、次回起動時に復元 (10 種達成・大台)
const SOQL_TOOLING_KEY = "sfdtSoqlTooling";
async function loadSoqlTooling() {
  try {
    const data = await chrome.storage.local.get(SOQL_TOOLING_KEY);
    const saved = data[SOQL_TOOLING_KEY];
    if (typeof saved !== "boolean") return;
    const cb = document.getElementById("useTooling");
    if (cb) cb.checked = saved;
  } catch {}
}
async function saveSoqlTooling(checked) {
  try { await chrome.storage.local.set({ [SOQL_TOOLING_KEY]: !!checked }); } catch {}
}

// v3.78.0: メタデータ一覧の選択 type を chrome.storage に保存し、次回起動時に復元 (9 種達成)
const MD_TYPE_KEY = "sfdtMdType";
async function loadMdType() {
  try {
    const data = await chrome.storage.local.get(MD_TYPE_KEY);
    const saved = data[MD_TYPE_KEY];
    if (!saved || typeof saved !== "string") return;
    const sel = document.getElementById("mdType");
    if (!sel) return;
    // 保存値が <option> に存在する場合のみ復元 (将来 option が削除されてもクラッシュしない)
    const opts = Array.from(sel.options).map((o) => o.value || o.textContent);
    if (opts.includes(saved)) sel.value = saved;
  } catch {}
}
async function saveMdType(type) {
  if (!type) return;
  try { await chrome.storage.local.set({ [MD_TYPE_KEY]: type }); } catch {}
}

async function doMetadataList() {
  if (!state.sid) return;
  const unlock = lockBtn("btnMetadata");
  const type = document.getElementById("mdType").value;
  saveMdType(type);
  // v3.32.0: loading 表示を統一スピナーに
  const mdResult = document.getElementById("metadataResult");
  if (mdResult) mdResult.innerHTML = `<div class="empty-state"><span class="pill loading">${escape(type)} 一覧を取得しています…</span></div>`;
  // v2.86.0 バグ修正: Tooling API の各テーブルは持つフィールドが違うため type 別に SOQL を切り替える
  // 旧実装は `SELECT Id, Name, ... FROM ${type}` 固定だったため Flow / FlowDefinition 等で「INVALID_FIELD: Name」エラー
  // ユーザー報告「Flow のメタデータ一覧を取得しようとするとダメでした」(2026-05-20)
  // v3.129.0 Phase 219: CustomObject 等の取得失敗バグ修正
  // CustomObject (Tooling) は Name 列を持たず DeveloperName を使う → INVALID_FIELD 'Name' エラー
  // ApexClass / ApexTrigger も明示クエリで API バージョン等を取得し列を整理
  const TYPE_SOQL = {
    "Flow": "SELECT Id, MasterLabel, DeveloperName, ProcessType, Status, VersionNumber, Description, LastModifiedDate FROM Flow ORDER BY LastModifiedDate DESC LIMIT 200",
    "FlowDefinition": "SELECT Id, DeveloperName, MasterLabel, ActiveVersionId, LastModifiedDate FROM FlowDefinition ORDER BY LastModifiedDate DESC LIMIT 200",
    "LightningComponentBundle": "SELECT Id, DeveloperName, MasterLabel, IsExposed, NamespacePrefix, ApiVersion, LastModifiedDate FROM LightningComponentBundle ORDER BY LastModifiedDate DESC LIMIT 200",
    "AuraDefinitionBundle": "SELECT Id, DeveloperName, MasterLabel, ApiVersion, NamespacePrefix, ManageableState, LastModifiedDate FROM AuraDefinitionBundle ORDER BY LastModifiedDate DESC LIMIT 200",
    "ValidationRule": "SELECT Id, ValidationName, Active, EntityDefinition.QualifiedApiName, ErrorMessage, LastModifiedDate FROM ValidationRule ORDER BY LastModifiedDate DESC LIMIT 200",
    "StaticResource": "SELECT Id, Name, NamespacePrefix, ContentType, BodyLength, LastModifiedDate FROM StaticResource ORDER BY LastModifiedDate DESC LIMIT 200",
    "CustomObject": "SELECT Id, DeveloperName, NamespacePrefix, ManageableState, CreatedDate, LastModifiedDate FROM CustomObject ORDER BY DeveloperName LIMIT 500",
    "ApexClass": "SELECT Id, Name, ApiVersion, Status, NamespacePrefix, ManageableState, LengthWithoutComments, LastModifiedDate FROM ApexClass ORDER BY LastModifiedDate DESC LIMIT 500",
    "ApexTrigger": "SELECT Id, Name, TableEnumOrId, Status, NamespacePrefix, ManageableState, LastModifiedDate FROM ApexTrigger ORDER BY LastModifiedDate DESC LIMIT 500",
    // v3.219.0 Phase 309: 追加メタデータ型 (Tooling)
    "CustomField": "SELECT Id, DeveloperName, EntityDefinition.QualifiedApiName, DataType, Label, ManageableState, LastModifiedDate FROM CustomField ORDER BY EntityDefinition.QualifiedApiName, DeveloperName LIMIT 500",
  };
  // Profile / PermissionSet は通常 REST (Tooling 不要) で取れる
  const REST_TYPES = {
    "Profile": "SELECT Id, Name, UserType, UserLicense.Name, CreatedDate, LastModifiedDate FROM Profile ORDER BY Name LIMIT 200",
    "PermissionSet": "SELECT Id, Name, Label, License.Name, IsCustom, NamespacePrefix, LastModifiedDate FROM PermissionSet WHERE IsOwnedByProfile = false ORDER BY Name LIMIT 200",
    // v3.219.0 Phase 309: 追加メタデータ型 (REST、Tooling 不要)
    "EmailTemplate": "SELECT Id, Name, DeveloperName, FolderId, IsActive, TemplateStyle, TemplateType, LastUsedDate FROM EmailTemplate ORDER BY LastUsedDate DESC NULLS LAST, Name LIMIT 200",
    "Dashboard": "SELECT Id, Title, DeveloperName, FolderName, RunningUserId, RunningUser.Name, LastModifiedDate FROM Dashboard ORDER BY LastModifiedDate DESC LIMIT 200",
    "Report": "SELECT Id, Name, DeveloperName, FolderName, Format, LastRunDate, LastModifiedDate FROM Report ORDER BY LastModifiedDate DESC LIMIT 200",
    "RecordType": "SELECT Id, Name, DeveloperName, SobjectType, IsActive, BusinessProcessId, LastModifiedDate FROM RecordType ORDER BY SobjectType, Name LIMIT 200",
  };
  const isRest = !!REST_TYPES[type];
  const soql = TYPE_SOQL[type] || REST_TYPES[type] || `SELECT Id, Name, NamespacePrefix, ManageableState, CreatedDate, LastModifiedDate FROM ${type} ORDER BY LastModifiedDate DESC LIMIT 200`;
  const r = isRest
    ? await runSoql({ host: state.host, sid: state.sid, apiVersion: state.apiVersion, soql, tooling: false })
    : await runSoql({ host: state.host, sid: state.sid, apiVersion: state.apiVersion, soql, tooling: true });
  unlock();
  if (!r.ok) {
    const elem = document.getElementById("metadataResult");
    const m = document.createElement("div");
    displayApiError(m, r.status, r.data, `Metadata ${type}`);
    elem.innerHTML = ""; elem.appendChild(m);
    return;
  }
  // 列名を業務用語に変換 (type 別)
  const stateMap = { "unmanaged": "未管理", "installedEditable": "インストール済 (編集可)", "installedReadOnly": "インストール済 (読取専用)", "deprecated": "非推奨", "deleted": "削除済" };
  const records = (r.data.records || []).map((rec) => {
    // Flow / LWC / Aura 系: DeveloperName + MasterLabel
    if (type === "Flow") {
      const statusEmo = { "Active": "✓ 有効", "Draft": "下書き", "Obsolete": "廃止", "InvalidDraft": "不正な下書き" };
      return {
        "ID": rec.Id,
        "API 名": rec.DeveloperName || "",
        "ラベル": rec.MasterLabel || "",
        "種別": rec.ProcessType || "",
        "状態": statusEmo[rec.Status] || rec.Status || "",
        "バージョン": rec.VersionNumber != null ? `v${rec.VersionNumber}` : "",
        "説明": (rec.Description || "").substring(0, 100),
        "更新日": rec.LastModifiedDate,
      };
    }
    if (type === "LightningComponentBundle" || type === "AuraDefinitionBundle") {
      return {
        "ID": rec.Id,
        "API 名": rec.DeveloperName || "",
        "ラベル": rec.MasterLabel || "",
        "公開": rec.IsExposed != null ? (rec.IsExposed ? "○" : "−") : "",
        "API バージョン": rec.ApiVersion != null ? `v${rec.ApiVersion}` : "",
        "ネームスペース": rec.NamespacePrefix || "(なし)",
        "更新日": rec.LastModifiedDate,
      };
    }
    if (type === "ValidationRule") {
      return {
        "ID": rec.Id,
        "ルール名": rec.ValidationName || "",
        "有効": rec.Active ? "○ 有効" : "− 無効",
        "対象オブジェクト": rec.EntityDefinition ? rec.EntityDefinition.QualifiedApiName : "",
        "エラーメッセージ": (rec.ErrorMessage || "").substring(0, 100),
        "更新日": rec.LastModifiedDate,
      };
    }
    if (type === "Profile") {
      return {
        "ID": rec.Id,
        "プロファイル名": rec.Name,
        "ユーザ種別": rec.UserType || "",
        "ライセンス": rec.UserLicense ? rec.UserLicense.Name : "",
        "作成日": rec.CreatedDate,
        "更新日": rec.LastModifiedDate,
      };
    }
    if (type === "PermissionSet") {
      return {
        "ID": rec.Id,
        "API 名": rec.Name,
        "ラベル": rec.Label || "",
        "ライセンス": rec.License ? rec.License.Name : "",
        "種別": rec.IsCustom ? "カスタム" : "標準",
        "更新日": rec.LastModifiedDate,
      };
    }
    if (type === "StaticResource") {
      const sizeKb = rec.BodyLength ? `${(rec.BodyLength / 1024).toFixed(1)} KB` : "";
      return {
        "ID": rec.Id,
        "API 名": rec.Name,
        "Content-Type": rec.ContentType || "",
        "サイズ": sizeKb,
        "ネームスペース": rec.NamespacePrefix || "(なし)",
        "更新日": rec.LastModifiedDate,
      };
    }
    if (type === "CustomObject") {
      return {
        "ID": rec.Id,
        "API 名": rec.DeveloperName ? rec.DeveloperName + "__c" : "",
        "DeveloperName": rec.DeveloperName || "",
        "ネームスペース": rec.NamespacePrefix || "(なし)",
        "管理状態": stateMap[rec.ManageableState] || rec.ManageableState || "",
        "作成日": rec.CreatedDate,
        "更新日": rec.LastModifiedDate,
      };
    }
    if (type === "ApexClass") {
      const statusEmo = { "Active": "○ 有効", "Inactive": "− 無効", "Deleted": "✗ 削除済" };
      const sizeKb = rec.LengthWithoutComments != null ? `${(rec.LengthWithoutComments / 1024).toFixed(1)} KB` : "";
      return {
        "ID": rec.Id,
        "クラス名": rec.Name || "",
        "API バージョン": rec.ApiVersion != null ? `v${rec.ApiVersion}` : "",
        "ステータス": statusEmo[rec.Status] || rec.Status || "",
        "ネームスペース": rec.NamespacePrefix || "(なし)",
        "管理状態": stateMap[rec.ManageableState] || rec.ManageableState || "",
        "コードサイズ": sizeKb,
        "更新日": rec.LastModifiedDate,
      };
    }
    if (type === "ApexTrigger") {
      const statusEmo = { "Active": "○ 有効", "Inactive": "− 無効", "Deleted": "✗ 削除済" };
      return {
        "ID": rec.Id,
        "トリガ名": rec.Name || "",
        "対象オブジェクト": rec.TableEnumOrId || "",
        "ステータス": statusEmo[rec.Status] || rec.Status || "",
        "ネームスペース": rec.NamespacePrefix || "(なし)",
        "管理状態": stateMap[rec.ManageableState] || rec.ManageableState || "",
        "更新日": rec.LastModifiedDate,
      };
    }
    // デフォルト (未登録 type — 念のため Name 優先・無ければ DeveloperName)
    return {
      "ID": rec.Id,
      "API 名": rec.Name || rec.DeveloperName || rec.MasterLabel || "",
      "ネームスペース": rec.NamespacePrefix || "(なし)",
      "管理状態": stateMap[rec.ManageableState] || rec.ManageableState || "",
      "作成日": rec.CreatedDate,
      "更新日": rec.LastModifiedDate,
    };
  });
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
  // v3.113.0 Phase 203: SOQL 結果から Id 列を持つレコードを一括 DELETE 可能化 (Inspector 風の一括操作、ユーザー要望)
  const hasId = headers.includes("Id") && records.some((r) => /^[a-zA-Z0-9]{15,18}$/.test(String(r.Id || "")));
  // v2.97.0: 全表共通の検索フィルタ (ユーザー要望「ログイン履歴と他の表もソート・検索できるように」)
  // テーブル直上に検索 input を追加、入力で行 textContent.toLowerCase().includes(q) でフィルタ
  const tableId = "tbl_" + Math.random().toString(36).slice(2, 8);
  // v3.7.0: placeholder と件数表示をより業務利用しやすい文言に
  const deleteBtn = hasId ? `<button class="table-bulk-delete" data-target="${tableId}" title="✓ チェックした行を Salesforce から一括削除します — 削除前に件数と先頭の Id を確認するダイアログが出ます。200 件ずつ Composite API で並列送信、allOrNone=false で部分成功も記録" aria-label="選択した行を一括削除" style="background:rgba(255,107,107,0.15);color:var(--err);border:1px solid var(--err);padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;font-weight:700">🗑 選択削除 (<span class="table-selected-count" data-target="${tableId}">0</span>)</button>` : "";
  const searchInput = `<div class="table-filter-row" style="display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:11px;color:var(--fg-dim)">
    <span title="🔍 表内検索 — 全列を対象にリアルタイム絞込み、Esc でクリア、各列ヘッダのクリックでソート (昇順→降順→元順)">🔍</span>
    <input class="table-filter-input" data-target="${tableId}" placeholder="🔎 表内を絞り込む… (全列対象 / Esc でクリア / 列ヘッダクリックでソート)" title="全列を対象にリアルタイム絞込みします。Esc でクリア。列ヘッダクリックでソート (昇順→降順→元順)" style="flex:1;background:var(--bg);border:1px solid var(--line);color:var(--fg);padding:4px 8px;border-radius:4px;font-size:11px" />
    <span class="table-filter-count" data-target="${tableId}" title="表示中件数 / 全件数">${records.length} 件</span>
    <button class="table-md-copy" data-target="${tableId}" title="現在の表 (絞込み後) を Markdown テーブル形式でクリップボードへコピー — Slack / Confluence / Notion / GitHub に貼り付け可能" aria-label="表を Markdown としてコピー" style="background:var(--bg3);color:var(--fg);border:1px solid var(--line);padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer">📋 Markdown</button>
    ${deleteBtn}
  </div>`;
  const selectCol = hasId ? `<th title="チェックでこの行を選択 (一括削除対象)" style="width:28px;text-align:center;cursor:pointer"><input type="checkbox" class="table-select-all" data-target="${tableId}" title="全選択 / 全解除" /></th>` : "";
  const head = `<tr>${selectCol}${headers.map((h) => `<th class="sortable" data-col="${escape(h)}" title="クリックで ${escape(h)} 列をソート (昇順→降順→元順)">${escape(h)}</th>`).join("")}</tr>`;
  // SF ID 形式判定 (15/18桁 英数字、ただし純数値や URL は除外)
  const isLikelyId = (v) => /^[a-zA-Z0-9]{15,18}$/.test(v) && /[a-zA-Z]/.test(v) && /\d/.test(v);
  const rows = records.map((r) => {
    const rid = String(r.Id || "");
    const selectTd = hasId ? `<td style="text-align:center"><input type="checkbox" class="table-row-select" data-target="${tableId}" data-id="${escape(rid)}" ${/^[a-zA-Z0-9]{15,18}$/.test(rid) ? "" : "disabled"} /></td>` : "";
    return `<tr data-row-id="${escape(rid)}">${selectTd}${headers.map((h) => {
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
    }).join("")}</tr>`;
  }).join("");
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
    // v2.97.0: 表内検索フィルタのバインド
    document.querySelectorAll(".table-filter-input:not([data-filter-bound])").forEach((inp) => {
      inp.dataset.filterBound = "true";
      const target = inp.dataset.target;
      const countEl = document.querySelector(`.table-filter-count[data-target="${target}"]`);
      const table = inp.closest(".grid, .result, .login-as-result, [class*='grid']")?.querySelector("table")
        || inp.parentElement.parentElement.querySelector("table");
      if (!table) return;
      inp.addEventListener("input", () => {
        const q = inp.value.trim().toLowerCase();
        let visible = 0, total = 0;
        Array.from(table.tBodies[0] ? table.tBodies[0].rows : table.rows).forEach((tr) => {
          if (tr.querySelector("th")) return; // ヘッダ行スキップ
          total++;
          const hit = !q || tr.textContent.toLowerCase().includes(q);
          tr.style.display = hit ? "" : "none";
          if (hit) visible++;
        });
        if (countEl) countEl.textContent = q ? `${visible} / ${total} 件` : `${total} 件`;
      });
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { inp.value = ""; inp.dispatchEvent(new Event("input")); }
      });
    });
    // v3.61.0: 「📋 Markdown」ボタンのバインド — 現在の表 (絞込み後の表示行のみ) を Markdown テーブル形式でコピー
    document.querySelectorAll(".table-md-copy:not([data-md-bound])").forEach((btn) => {
      btn.dataset.mdBound = "true";
      const target = btn.dataset.target;
      const table = document.getElementById(target);
      if (!table) return;
      btn.addEventListener("click", async () => {
        try {
          const headerCells = Array.from(table.tHead ? table.tHead.rows[0].cells : table.rows[0].cells);
          const headerTexts = headerCells.map((th) => th.textContent.trim());
          const bodyRows = Array.from(table.tBodies[0] ? table.tBodies[0].rows : table.rows)
            .filter((tr) => !tr.querySelector("th") && tr.style.display !== "none");
          const escMd = (s) => String(s || "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
          const lines = [];
          lines.push("| " + headerTexts.map(escMd).join(" | ") + " |");
          lines.push("|" + headerTexts.map(() => " --- ").join("|") + "|");
          bodyRows.forEach((tr) => {
            const cells = Array.from(tr.cells).map((td) => escMd(td.textContent));
            lines.push("| " + cells.join(" | ") + " |");
          });
          const md = lines.join("\n");
          await navigator.clipboard.writeText(md);
          panelToast(`📋 Markdown テーブルをコピー (${bodyRows.length} 行 / ${md.length} 文字)`, { kind: "ok" });
        } catch (e) {
          panelToast("⚠ Markdown コピーに失敗: " + String(e), { kind: "err" });
        }
      });
    });
    // v3.113.0 Phase 203: 一括削除イベントバインド (全選択 / 個別チェック / 削除ボタン)
    const updateSelCount = (target) => {
      const checked = document.querySelectorAll(`.table-row-select[data-target="${target}"]:checked`).length;
      const ctr = document.querySelector(`.table-selected-count[data-target="${target}"]`);
      if (ctr) ctr.textContent = checked;
      const btn = document.querySelector(`.table-bulk-delete[data-target="${target}"]`);
      if (btn) btn.style.opacity = checked > 0 ? "1" : "0.5";
    };
    document.querySelectorAll(".table-select-all:not([data-sel-bound])").forEach((cb) => {
      cb.dataset.selBound = "true";
      cb.addEventListener("change", () => {
        const target = cb.dataset.target;
        document.querySelectorAll(`.table-row-select[data-target="${target}"]:not([disabled])`).forEach((rc) => { rc.checked = cb.checked; });
        updateSelCount(target);
      });
    });
    document.querySelectorAll(".table-row-select:not([data-sel-bound])").forEach((cb) => {
      cb.dataset.selBound = "true";
      cb.addEventListener("change", () => updateSelCount(cb.dataset.target));
    });
    document.querySelectorAll(".table-bulk-delete:not([data-del-bound])").forEach((btn) => {
      btn.dataset.delBound = "true";
      btn.style.opacity = "0.5";
      btn.addEventListener("click", () => doBulkDelete(btn.dataset.target));
    });
  }, 0);
  return searchInput + `<table id="${tableId}">${head}${rows}</table>`;
}

// v3.113.0 Phase 203: 一括レコード DELETE (Composite API、200 件チャンク、allOrNone=false で部分成功記録)
async function doBulkDelete(tableId) {
  const checked = Array.from(document.querySelectorAll(`.table-row-select[data-target="${tableId}"]:checked`));
  const ids = checked.map((cb) => cb.dataset.id).filter((v) => /^[a-zA-Z0-9]{15,18}$/.test(v));
  if (!ids.length) { panelToast("⚠ 削除対象が選択されていません", { kind: "warn" }); return; }
  // ⚠ 本番組織誤操作防止のため、件数 + 先頭 5 件 ID を出して 2 段階確認
  const preview = ids.slice(0, 5).join("\n");
  const more = ids.length > 5 ? `\n…他 ${ids.length - 5} 件` : "";
  // v3.201.0 Phase 291: PROD 環境では警告メッセージを強化 + 組織情報を明示
  // v3.313.0 Phase 403: footer を inline 式から prodFooter 変数 pattern に統一 (他 5 経路と code-level 整合性)
  const prodHeader = state.isProd
    ? `🚨🚨 本番組織 (PROD) での DELETE 操作 🚨🚨\n対象組織: ${state.host || "?"}\n\n`
    : "";
  const prodFooter = state.isProd ? "\n\n(Sandbox での事前テストを強く推奨します)" : "";
  const ok = window.confirm(`${prodHeader}⚠ ${ids.length} 件のレコードを削除します\n\n対象 Id (先頭 5 件):\n${preview}${more}\n\nこの操作は取り消せません。続行しますか?${prodFooter}`);
  if (!ok) return;
  if (!state.host || !state.sid) { panelToast("⚠ セッション未取得です", { kind: "err" }); return; }
  panelToast(`🗑 削除を開始します (${ids.length} 件)…`, { kind: "loading" });
  const apiVer = state.apiVersion || "62.0";
  let success = 0, failed = 0;
  const errors = [];
  // 200 件ずつ chunk (Composite API 上限)
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const path = `/services/data/v${apiVer}/composite/sobjects?ids=${chunk.join(",")}&allOrNone=false`;
    try {
      const r = await sfFetch({ host: state.host, sid: state.sid, path, method: "DELETE" });
      if (Array.isArray(r.data)) {
        r.data.forEach((res) => {
          if (res.success) success++;
          else {
            failed++;
            const errMsg = (res.errors && res.errors[0] && res.errors[0].message) || "unknown";
            errors.push(`${res.id || "?"}: ${errMsg}`);
          }
        });
      } else {
        failed += chunk.length;
        errors.push(`Chunk ${i}-${i + chunk.length}: ${JSON.stringify(r.data).substring(0, 200)}`);
      }
    } catch (e) {
      failed += chunk.length;
      errors.push(`Chunk ${i}-${i + chunk.length}: ${String(e && e.message || e)}`);
    }
  }
  const kind = failed === 0 ? "ok" : (success > 0 ? "warn" : "err");
  panelToast(`🗑 削除完了: 成功 ${success} 件 / 失敗 ${failed} 件${failed > 0 ? "\n失敗例: " + errors.slice(0, 3).join("; ") : ""}`, { kind });
  // 削除成功した行をテーブルから視覚的に消す (取消線 + 半透明)
  checked.forEach((cb, i) => {
    const tr = cb.closest("tr");
    if (tr) { tr.style.textDecoration = "line-through"; tr.style.opacity = "0.4"; cb.disabled = true; cb.checked = false; }
  });
  // 件数カウンタリセット
  const ctr = document.querySelector(`.table-selected-count[data-target="${tableId}"]`);
  if (ctr) ctr.textContent = "0";
}

// v3.114.0 Phase 204: CSV から一括 INSERT (Inspector 風一括操作 第 2 弾)
// v3.115.0 Phase 205: UPDATE / UPSERT 拡張 (External Id ベース冪等更新)
// 業務シナリオ: Excel リストの一気投入、テストシードデータ、別組織からのマイグレ、External Id でべき等更新
function openBulkInsertDialog() {
  if (!state.host || !state.sid) { panelToast("⚠ セッション未取得です。popup の ⟳ で再取得してください", { kind: "err" }); return; }
  const existing = document.getElementById("bulkInsertOverlay");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "bulkInsertOverlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;";
  overlay.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--accent);border-radius:var(--r-lg);width:min(720px,95vw);max-height:90vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.6);">
      <div style="padding:12px 16px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;">
        <div style="color:var(--accent);font-weight:700;font-size:13px;">📤 CSV から一括 DML (INSERT / UPDATE / UPSERT)</div>
        <button id="bulkInsertClose" style="background:transparent;border:1px solid var(--line);color:var(--fg);padding:4px 10px;border-radius:var(--r-tag);cursor:pointer;">✖ 閉じる (Esc)</button>
      </div>
      <div style="padding:14px 16px;overflow:auto;display:flex;flex-direction:column;gap:10px;font-size:11px;color:var(--fg);">
        <div class="meta" style="padding:6px 8px;background:rgba(243,156,18,0.1);border-left:3px solid var(--warn);border-radius:var(--r-sm);color:var(--warn);">
          ⚠ 本番組織での DML は実データに影響します。テスト環境または十分検証した上でご利用ください。
        </div>
        <label style="display:flex;align-items:center;gap:8px;">
          <span style="width:120px;">操作:</span>
          <select id="bulkInsertOp" style="flex:1;background:var(--bg);border:1px solid var(--line);color:var(--fg);padding:6px 8px;border-radius:var(--r-tag);">
            <option value="insert">INSERT (新規作成、CSV に Id 不要)</option>
            <option value="update">UPDATE (既存更新、CSV に Id 列必須)</option>
            <option value="upsert">UPSERT (External Id で更新 or 新規、CSV に Ext Id 列必須)</option>
          </select>
        </label>
        <label style="display:flex;align-items:center;gap:8px;">
          <span style="width:120px;">対象オブジェクト:</span>
          <input id="bulkInsertObj" type="text" placeholder="例: Account / Contact / Lead / カスタムオブジェクト__c" style="flex:1;background:var(--bg);border:1px solid var(--line);color:var(--fg);padding:6px 8px;border-radius:var(--r-tag);" />
        </label>
        <label id="bulkInsertExtIdRow" style="display:none;align-items:center;gap:8px;">
          <span style="width:120px;">External Id 項目:</span>
          <input id="bulkInsertExtId" type="text" placeholder="例: MyExternalId__c / Account_External_Id__c (Salesforce 側で External ID 属性が ON の項目)" style="flex:1;background:var(--bg);border:1px solid var(--line);color:var(--fg);padding:6px 8px;border-radius:var(--r-tag);" />
        </label>
        <label style="display:flex;align-items:center;gap:8px;color:var(--accent);font-weight:600;">
          <input type="checkbox" id="bulkInsertUseBulkApi" />
          <span>📦 Bulk API v2 を使う (200 件超え推奨、非同期ジョブとして実行 — 完了まで自動ポーリング)</span>
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;">
          <span>CSV (1 行目はヘッダ = フィールド API 名・カンマ区切り):</span>
          <textarea id="bulkInsertCsv" rows="10" placeholder="INSERT 例:&#10;Name,Industry,Phone&#10;Acme Corp,Technology,03-1234-5678&#10;Beta Inc,Manufacturing,06-9876-5432&#10;&#10;UPDATE 例 (Id 列必須):&#10;Id,Industry,Phone&#10;0011x00000abc,Healthcare,03-9999-0000&#10;&#10;UPSERT 例 (External Id 列必須):&#10;ExtId__c,Name,Phone&#10;EXT-001,Acme Corp,03-1234-5678&#10;&#10;💡 値にカンマを含む場合は &quot;...&quot; で囲む / 空欄は NULL 扱い / Boolean は true/false" style="background:var(--bg);border:1px solid var(--line);color:var(--fg);padding:8px;border-radius:var(--r-tag);font:11px/1.5 ui-monospace,Consolas,monospace;resize:vertical;"></textarea>
        </label>
        <div id="bulkInsertPreview" style="font-size:10px;color:var(--fg-dim);"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid var(--line);padding-top:10px;">
          <button id="bulkInsertPreviewBtn" style="background:var(--bg3);color:var(--fg);border:1px solid var(--line);padding:6px 14px;border-radius:var(--r-tag);cursor:pointer;">🔍 プレビュー</button>
          <button id="bulkInsertExecBtn" style="background:var(--accent);color:#fff;border:1px solid var(--accent-2);padding:6px 14px;border-radius:var(--r-tag);cursor:pointer;font-weight:700;">▶ 実行</button>
        </div>
        <div id="bulkInsertResult" style="font-size:10px;max-height:200px;overflow:auto;"></div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  document.getElementById("bulkInsertClose").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function onEsc(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", onEsc); } });
  // v3.115.0 Phase 205: 操作種別で External Id 入力欄の表示切替 + 実行ボタンラベル更新
  const opSel = document.getElementById("bulkInsertOp");
  const extIdRow = document.getElementById("bulkInsertExtIdRow");
  const execBtn = document.getElementById("bulkInsertExecBtn");
  opSel.addEventListener("change", () => {
    extIdRow.style.display = opSel.value === "upsert" ? "flex" : "none";
    execBtn.textContent = opSel.value === "insert" ? "▶ INSERT 実行" : (opSel.value === "update" ? "▶ UPDATE 実行" : "▶ UPSERT 実行");
  });
  document.getElementById("bulkInsertPreviewBtn").addEventListener("click", () => previewBulkInsert());
  execBtn.addEventListener("click", () => doBulkInsert());
  document.getElementById("bulkInsertObj").focus();
}

// CSV パース: シンプル実装 (RFC 4180 部分対応 — ダブルクォート囲み + エスケープ "")
function parseCsvSimple(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (!lines.length) return { headers: [], records: [] };
  const parseLine = (line) => {
    const cells = [];
    let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') { inQ = false; }
        else { cur += c; }
      } else {
        if (c === '"') inQ = true;
        else if (c === ",") { cells.push(cur); cur = ""; }
        else cur += c;
      }
    }
    cells.push(cur);
    return cells;
  };
  const headers = parseLine(lines[0]).map((h) => h.trim());
  const records = lines.slice(1).map((line) => {
    const vals = parseLine(line);
    const rec = {};
    headers.forEach((h, i) => {
      const v = (vals[i] ?? "").trim();
      if (v === "") return; // 空欄はキー追加せず (Salesforce 側で NULL 扱い)
      // 型推測: Boolean / Number / 日付はそのまま文字列で送り Salesforce 側で coerce
      if (v === "true") rec[h] = true;
      else if (v === "false") rec[h] = false;
      else rec[h] = v;
    });
    return rec;
  });
  return { headers, records };
}

function previewBulkInsert() {
  const op = document.getElementById("bulkInsertOp").value;
  const obj = document.getElementById("bulkInsertObj").value.trim();
  const extId = (document.getElementById("bulkInsertExtId").value || "").trim();
  const csv = document.getElementById("bulkInsertCsv").value;
  const previewEl = document.getElementById("bulkInsertPreview");
  if (!obj) { previewEl.innerHTML = `<span style="color:var(--warn)">⚠ 対象オブジェクト名を入力してください</span>`; return; }
  if (op === "upsert" && !extId) { previewEl.innerHTML = `<span style="color:var(--warn)">⚠ UPSERT には External Id 項目名が必要です</span>`; return; }
  const { headers, records } = parseCsvSimple(csv);
  if (!headers.length) { previewEl.innerHTML = `<span style="color:var(--warn)">⚠ CSV データを入力してください</span>`; return; }
  // v3.115.0 Phase 205: 操作種別ごとの必須列バリデーション
  if (op === "update" && !headers.includes("Id")) { previewEl.innerHTML = `<span style="color:var(--warn)">⚠ UPDATE には CSV ヘッダに「Id」列が必要です</span>`; return; }
  if (op === "upsert" && !headers.includes(extId)) { previewEl.innerHTML = `<span style="color:var(--warn)">⚠ UPSERT には CSV ヘッダに「${escape(extId)}」列が必要です</span>`; return; }
  const samples = records.slice(0, 3).map((r) => JSON.stringify(r)).join("<br>");
  const opLabel = op === "insert" ? "INSERT (新規作成)" : (op === "update" ? "UPDATE (既存更新)" : `UPSERT (External Id: ${escape(extId)})`);
  previewEl.innerHTML = `
    <div style="background:var(--bg);padding:8px;border-radius:var(--r-sm);border:1px solid var(--line);">
      <div><strong>操作:</strong> <code>${opLabel}</code></div>
      <div><strong>オブジェクト:</strong> <code>${escape(obj)}</code></div>
      <div><strong>フィールド:</strong> ${headers.map((h) => `<code>${escape(h)}</code>`).join(", ")}</div>
      <div><strong>レコード数:</strong> ${records.length} 件 (Composite API 上限 200/コール、自動チャンク)</div>
      <div style="margin-top:6px;color:var(--fg-dim);"><strong>先頭 3 件プレビュー:</strong><br>${samples}</div>
    </div>`;
}

async function doBulkInsert() {
  const op = document.getElementById("bulkInsertOp").value;
  const obj = document.getElementById("bulkInsertObj").value.trim();
  const extId = (document.getElementById("bulkInsertExtId").value || "").trim();
  const csv = document.getElementById("bulkInsertCsv").value;
  const useBulkApi = document.getElementById("bulkInsertUseBulkApi").checked;
  const resultEl = document.getElementById("bulkInsertResult");
  if (!obj) { resultEl.innerHTML = `<span style="color:var(--warn)">⚠ 対象オブジェクト名を入力してください</span>`; return; }
  if (op === "upsert" && !extId) { resultEl.innerHTML = `<span style="color:var(--warn)">⚠ UPSERT には External Id 項目名が必要です</span>`; return; }
  const { headers, records } = parseCsvSimple(csv);
  if (!records.length) { resultEl.innerHTML = `<span style="color:var(--warn)">⚠ CSV データを入力してください</span>`; return; }
  if (op === "update" && !headers.includes("Id")) { resultEl.innerHTML = `<span style="color:var(--warn)">⚠ UPDATE には CSV ヘッダに「Id」列が必要です</span>`; return; }
  if (op === "upsert" && !headers.includes(extId)) { resultEl.innerHTML = `<span style="color:var(--warn)">⚠ UPSERT には CSV ヘッダに「${escape(extId)}」列が必要です</span>`; return; }
  // 2 段階確認
  const opLabel = op === "insert" ? "INSERT" : (op === "update" ? "UPDATE" : `UPSERT (Ext Id: ${extId})`);
  const apiNote = useBulkApi ? "\n\n📦 Bulk API v2 (非同期ジョブ) で実行します。完了まで自動ポーリングします。" : "";
  // v3.201.0 Phase 291: PROD 環境では警告メッセージを強化 + 組織情報を明示
  const prodHeader = state.isProd
    ? `🚨🚨 本番組織 (PROD) での ${opLabel} 操作 🚨🚨\n対象組織: ${state.host || "?"}\n\n`
    : "";
  const prodFooter = state.isProd ? "\n\n(Sandbox での事前テストを強く推奨します)" : "";
  if (!window.confirm(`${prodHeader}⚠ ${records.length} 件のレコードを ${obj} に ${opLabel} します${apiNote}\n\n本番組織では実データが変更されます。続行しますか?${prodFooter}`)) return;
  // v3.116.0 Phase 206: Bulk API v2 分岐
  if (useBulkApi) { return doBulkInsertViaBulkApi(op, obj, extId, csv, opLabel); }
  const apiVer = state.apiVersion || "62.0";
  let success = 0, failed = 0;
  const errors = [];
  const successIds = [];
  resultEl.innerHTML = `<span class="pill loading">⏳ ${opLabel} 実行中…</span>`;
  // v3.115.0 Phase 205: 操作別の API メソッド + endpoint dispatch
  const method = op === "insert" ? "POST" : "PATCH";
  const path = op === "upsert"
    ? `/services/data/v${apiVer}/composite/sobjects/${encodeURIComponent(obj)}/${encodeURIComponent(extId)}`
    : `/services/data/v${apiVer}/composite/sobjects`;
  for (let i = 0; i < records.length; i += 200) {
    const chunk = records.slice(i, i + 200).map((r) => ({ attributes: { type: obj }, ...r }));
    try {
      const r = await sfFetch({
        host: state.host, sid: state.sid, path, method,
        body: { allOrNone: false, records: chunk },
      });
      if (Array.isArray(r.data)) {
        r.data.forEach((res, idx) => {
          if (res.success) { success++; if (res.id) successIds.push(res.id); }
          else {
            failed++;
            const errMsg = (res.errors && res.errors[0] && res.errors[0].message) || "unknown";
            errors.push(`行 ${i + idx + 2}: ${errMsg}`);
          }
        });
      } else {
        failed += chunk.length;
        errors.push(`Chunk ${i}-${i + chunk.length}: ${JSON.stringify(r.data).substring(0, 200)}`);
      }
    } catch (e) {
      failed += chunk.length;
      errors.push(`Chunk ${i}: ${String(e && e.message || e)}`);
    }
  }
  const kind = failed === 0 ? "ok" : (success > 0 ? "warn" : "err");
  panelToast(`📤 ${opLabel} 完了: 成功 ${success} 件 / 失敗 ${failed} 件`, { kind });
  const idLabel = op === "insert" ? "作成された Id" : (op === "update" ? "更新された Id" : "作成/更新された Id");
  resultEl.innerHTML = `
    <div style="background:var(--bg);padding:8px;border-radius:var(--r-sm);border:1px solid ${failed === 0 ? "var(--ok)" : "var(--warn)"};margin-top:6px;">
      <div><strong>✓ 成功:</strong> ${success} 件 / <strong style="color:var(--err)">✗ 失敗:</strong> ${failed} 件 (${opLabel})</div>
      ${successIds.length ? `<div style="margin-top:4px;color:var(--fg-dim);">${idLabel} (先頭 5 件): ${successIds.slice(0, 5).map((id) => `<code>${escape(id)}</code>`).join(", ")}${successIds.length > 5 ? ` …他 ${successIds.length - 5} 件` : ""}</div>` : ""}
      ${errors.length ? `<details style="margin-top:6px;"><summary style="cursor:pointer;color:var(--err);">❌ エラー詳細 (${errors.length} 件)</summary><pre style="font-size:9px;white-space:pre-wrap;color:var(--err);margin-top:4px;">${escape(errors.slice(0, 20).join("\n"))}${errors.length > 20 ? `\n…他 ${errors.length - 20} 件` : ""}</pre></details>` : ""}
    </div>`;
}

// v3.116.0 Phase 206: Bulk API v2 連携 (200 件超えの大量データ用、非同期ジョブ)
// Composite API は 1 コール 200 件上限なので、それを超えると Bulk API v2 が必須
// フロー: Job 作成 → CSV upload → Close → ポーリング → 結果取得
async function doBulkInsertViaBulkApi(op, obj, extId, csvText, opLabel) {
  const apiVer = state.apiVersion || "62.0";
  const resultEl = document.getElementById("bulkInsertResult");
  const sf = (path, method, body, headers) => sfFetch({ host: state.host, sid: state.sid, path, method, body, headers });
  try {
    // 1) Job 作成
    resultEl.innerHTML = `<span class="pill loading">⏳ Bulk API v2 Job 作成中…</span>`;
    const jobBody = {
      object: obj,
      operation: op, // insert / update / upsert / delete
      contentType: "CSV",
      lineEnding: "LF",
    };
    if (op === "upsert") jobBody.externalIdFieldName = extId;
    const jobRes = await sf(`/services/data/v${apiVer}/jobs/ingest`, "POST", jobBody);
    if (!jobRes.ok || !jobRes.data || !jobRes.data.id) {
      resultEl.innerHTML = `<span style="color:var(--err)">❌ Job 作成失敗: ${escape(JSON.stringify(jobRes.data).substring(0, 300))}</span>`;
      return;
    }
    const jobId = jobRes.data.id;
    resultEl.innerHTML = `<span class="pill loading">⏳ CSV データ送信中 (Job ${jobId})…</span>`;
    // 2) CSV upload (PUT text/csv)
    const uploadRes = await sf(`/services/data/v${apiVer}/jobs/ingest/${jobId}/batches`, "PUT", csvText, { "Content-Type": "text/csv" });
    if (!uploadRes.ok) {
      resultEl.innerHTML = `<span style="color:var(--err)">❌ CSV upload 失敗 (Job ${jobId}): ${escape(JSON.stringify(uploadRes.data).substring(0, 300))}</span>`;
      return;
    }
    // 3) Job Close (state: UploadComplete)
    resultEl.innerHTML = `<span class="pill loading">⏳ Job をクローズして処理開始 (Job ${jobId})…</span>`;
    const closeRes = await sf(`/services/data/v${apiVer}/jobs/ingest/${jobId}`, "PATCH", { state: "UploadComplete" });
    if (!closeRes.ok) {
      resultEl.innerHTML = `<span style="color:var(--err)">❌ Job Close 失敗 (Job ${jobId}): ${escape(JSON.stringify(closeRes.data).substring(0, 300))}</span>`;
      return;
    }
    // 4) ポーリング (5 秒間隔、最大 5 分)
    const t0 = Date.now();
    const maxMs = 5 * 60 * 1000;
    let jobInfo = null;
    while (Date.now() - t0 < maxMs) {
      await new Promise((r) => setTimeout(r, 5000));
      const elapsed = Math.round((Date.now() - t0) / 1000);
      resultEl.innerHTML = `<span class="pill loading">⏳ Job 処理中… (経過 ${elapsed}s, 5 分でタイムアウト) — <a href="https://${state.host}/lightning/setup/AsyncApiJobStatus/home" target="_blank" style="color:var(--accent);">Setup でジョブ状態を確認</a></span>`;
      const infoRes = await sf(`/services/data/v${apiVer}/jobs/ingest/${jobId}`, "GET");
      if (!infoRes.ok) {
        resultEl.innerHTML = `<span style="color:var(--err)">❌ Job ステータス取得失敗 (Job ${jobId}): ${escape(JSON.stringify(infoRes.data).substring(0, 300))}</span>`;
        return;
      }
      jobInfo = infoRes.data;
      if (jobInfo.state === "JobComplete" || jobInfo.state === "Failed" || jobInfo.state === "Aborted") break;
    }
    if (!jobInfo || (jobInfo.state !== "JobComplete" && jobInfo.state !== "Failed")) {
      resultEl.innerHTML = `<span style="color:var(--warn)">⚠ Job タイムアウト (5 分) — Setup でジョブ状態を直接ご確認ください (Job ${jobId})</span>`;
      return;
    }
    // 5) 結果サマリ
    const total = jobInfo.numberRecordsProcessed || 0;
    const failed = jobInfo.numberRecordsFailed || 0;
    const success = total - failed;
    const kind = failed === 0 ? "ok" : (success > 0 ? "warn" : "err");
    panelToast(`📦 Bulk API ${opLabel} 完了: 成功 ${success} 件 / 失敗 ${failed} 件 (Job ${jobId})`, { kind });
    resultEl.innerHTML = `
      <div style="background:var(--bg);padding:8px;border-radius:var(--r-sm);border:1px solid ${failed === 0 ? "var(--ok)" : "var(--warn)"};margin-top:6px;">
        <div><strong>Job Id:</strong> <code>${escape(jobId)}</code> / <strong>State:</strong> <code>${escape(jobInfo.state)}</code></div>
        <div><strong>✓ 成功:</strong> ${success} 件 / <strong style="color:var(--err)">✗ 失敗:</strong> ${failed} 件 (合計 ${total} 件処理)</div>
        <div><strong>処理時間:</strong> ${jobInfo.totalProcessingTime || 0}ms (Apex CPU 時間内訳: ${jobInfo.apexProcessingTime || 0}ms / API 処理時間: ${jobInfo.apiActiveProcessingTime || 0}ms)</div>
        <div style="margin-top:6px;">
          <a href="https://${state.host}/services/data/v${apiVer}/jobs/ingest/${jobId}/successfulResults" target="_blank" style="color:var(--ok);">✓ 成功 CSV ダウンロード</a> /
          <a href="https://${state.host}/services/data/v${apiVer}/jobs/ingest/${jobId}/failedResults" target="_blank" style="color:var(--err);">✗ 失敗 CSV ダウンロード</a> /
          <a href="https://${state.host}/services/data/v${apiVer}/jobs/ingest/${jobId}/unprocessedrecords" target="_blank" style="color:var(--fg-dim);">未処理 CSV</a>
        </div>
        <div style="margin-top:4px;color:var(--fg-dim);font-size:9px;">💡 結果 CSV は API 経由のため Authorization Bearer ヘッダ付きの fetch でないと取得できません。Setup → ジョブの状況 から GUI で確認 ⤴</div>
      </div>`;
  } catch (e) {
    resultEl.innerHTML = `<span style="color:var(--err)">❌ Bulk API エラー: ${escape(String(e && e.message || e))}</span>`;
  }
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
    // v3.48.0: 早期バリデーション + 入力欄にフォーカス戻し
    meta.innerHTML = `<span class="pill warn">⚠ 入力が必要</span> 匿名 Apex コードを入力してください (例: <code>System.debug(UserInfo.getName());</code>)`;
    const ta = document.getElementById("apexCode");
    if (ta) ta.focus();
    return;
  }
  // v3.199.0 Phase 289 / v3.304.0 Phase 394: PROD 環境で破壊的 DML を含む Apex 実行前に confirm ダイアログ — Phase 394 で 6 経路 format 統一 (🚨🚨 sandwich style)
  if (state.isProd) {
    const dmlPattern = /\b(insert|update|upsert|delete|undelete|merge)\b|database\.(insert|update|upsert|delete|undelete|merge|executeBatch)/i;
    if (dmlPattern.test(code)) {
      const ok = window.confirm(
        `🚨🚨 本番組織 (PROD) での DML 操作を含む Apex 実行 🚨🚨\n` +
        `対象組織: ${state.host || "?"}\n\n` +
        `実データが変更・削除される可能性があります。\n本当に実行してよろしいですか？\n\n` +
        `(Sandbox での事前テストを強く推奨します)`
      );
      if (!ok) {
        meta.innerHTML = `<span class="pill warn">⚠ PROD 実行をキャンセルしました</span>`;
        return;
      }
    }
  }
  const myId = ++apexRunId;
  meta.innerHTML = `<span class="pill loading">匿名 Apex を実行しています… #${myId}</span>`;
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
  // v3.76.0: コンパイル成功時のみ履歴に push (構文エラーで弾かれたコードは履歴に積まない)
  if (compiled) pushApexHistory(code);
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
    // v3.178.0 Phase 268: ガバナ消費サマリを自動抽出して meta に pill 表示
    // SOQL queries / DML statements / CPU time / Heap size を「N / M (NN%)」形式で
    try {
      const limitRe = /Number of (SOQL queries|DML statements|query rows|DML rows|Async calls|Future calls|callouts|SOSL queries|Aggregate queries|Email Invocations|chained Apex jobs|Mobile Apex push calls): (\d+) out of (\d+)|Maximum (CPU time|heap size|stack depth): (\d+) out of (\d+)/g;
      const limits = {};
      let m;
      while ((m = limitRe.exec(txt)) !== null) {
        const name = m[1] || m[4];
        const used = parseInt(m[2] || m[5], 10);
        const max = parseInt(m[3] || m[6], 10);
        // 最大値 (累積) を採用
        if (!limits[name] || limits[name].used < used) {
          limits[name] = { used, max };
        }
      }
      // 主要 4 種を抽出して pill 表示
      const priority = ["SOQL queries", "DML statements", "CPU time", "heap size"];
      const summaryPills = priority
        .filter((k) => limits[k] && limits[k].max > 0)
        .map((k) => {
          const { used, max } = limits[k];
          const pct = Math.round((used / max) * 100);
          const cls = pct >= 80 ? "err" : pct >= 50 ? "warn" : "ok";
          const labelMap = {
            "SOQL queries": "SOQL",
            "DML statements": "DML",
            "CPU time": "CPU",
            "heap size": "Heap",
          };
          return `<span class="pill ${cls}" title="${k}: ${used.toLocaleString()} / ${max.toLocaleString()}">${labelMap[k]} ${used}/${max} (${pct}%)</span>`;
        });
      if (summaryPills.length) {
        const cur = meta.innerHTML;
        meta.innerHTML = `${cur} ${summaryPills.join(" ")}`;
      }
    } catch (e) { console.warn("[apex] governor summary failed", e); }
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
  // v3.237.0 Phase 327: 期間フィルタ (LAST_N_DAYS:N) — セキュリティ監査ワークフロー強化
  const periodEl = document.getElementById("loginPeriod");
  const periodDays = periodEl && periodEl.value ? parseInt(periodEl.value, 10) : 0;
  const meta = document.getElementById("loginMeta");
  meta.innerHTML = `<span class="pill loading">ログイン履歴を取得しています…</span>`;
  meta.classList.add("loading-pulse");

  // v2.93.0 バグ修正: Salesforce LoginHistory は Status フィールドが filterable=false のため
  // WHERE Status='Success' を入れると INVALID_FIELD / "No such filterable column" エラーになっていた。
  // WHERE 句を撤廃し、取得後にクライアント側で Status フィルタを適用する。
  // 取得件数を保証するため LIMIT を 2 倍に増やしフィルタ後に slice
  // v3.237.0 Phase 327: LoginTime は filterable なので期間 WHERE 句を追加可能
  const fetchLimit = statusFilter ? Math.min(limit * 3, 1000) : limit;
  const whereParts = [];
  if (periodDays > 0) whereParts.push(`LoginTime = LAST_N_DAYS:${periodDays}`);
  const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")} ` : "";
  const soql = `SELECT Id, UserId, LoginTime, LoginType, Application, Status, ApiType, ApiVersion, ClientVersion, Browser, Platform, SourceIp FROM LoginHistory ${whereClause}ORDER BY LoginTime DESC LIMIT ${fetchLimit}`;

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
  let recs = (r.data && r.data.records) || [];
  // v2.93.0: クライアント側で Status フィルタ
  if (statusFilter === "Success") recs = recs.filter((rec) => rec.Status === "Success");
  else if (statusFilter === "Failed") recs = recs.filter((rec) => rec.Status !== "Success");
  recs = recs.slice(0, limit);
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
  state.lastLoginRows = rows;
  renderLoginHistory();
}

// v3.110.0 Phase 200: ログイン履歴に検索 + ソート機能 (ユーザー要望)
let _loginSort = { col: "LoginTime", dir: "desc" };
let _loginFilter = "";
function renderLoginHistory() {
  const rows = state.lastLoginRows || [];
  const q = _loginFilter.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)))
    : rows;
  const { col, dir } = _loginSort;
  const sorted = [...filtered].sort((a, b) => {
    const va = String(a[col] ?? "");
    const vb = String(b[col] ?? "");
    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
  const root = document.getElementById("loginResult");
  if (!root) return;
  root.innerHTML = loginHistoryTable(sorted, filtered.length, rows.length);
  // 検索 input イベント
  const filterInput = root.querySelector("#loginFilter");
  if (filterInput) {
    filterInput.value = _loginFilter;
    filterInput.addEventListener("input", (e) => {
      _loginFilter = e.target.value;
      renderLoginHistory();
      const fi = document.getElementById("loginFilter");
      if (fi) { fi.focus(); fi.setSelectionRange(_loginFilter.length, _loginFilter.length); }
    });
    filterInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { _loginFilter = ""; renderLoginHistory(); }
    });
  }
  // ヘッダクリックでソート
  root.querySelectorAll("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const c = th.dataset.sort;
      if (_loginSort.col === c) _loginSort.dir = _loginSort.dir === "asc" ? "desc" : "asc";
      else { _loginSort.col = c; _loginSort.dir = "asc"; }
      renderLoginHistory();
    });
  });
}

function loginHistoryTable(rows, filteredCount, totalCount) {
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
  // v3.110.0: 検索ボックス + 件数表示
  const filterBar = `
    <div style="display:flex; align-items:center; gap:8px; padding:6px 8px; background:var(--bg2); border-bottom:1px solid var(--line); position:sticky; top:0; z-index:11;">
      <input type="search" id="loginFilter" placeholder="🔎 検索 (全列横断・Esc でクリア) … 例: 田中 / Failed / 192.168" style="flex:1; padding:5px 8px; font-size:11px; border:1px solid var(--line); border-radius:var(--r-tag); background:#0a1224; color:var(--fg);" />
      <span style="font-size:10px; color:var(--fg-dim); white-space:nowrap;">${filteredCount}/${totalCount} 件</span>
    </div>`;
  if (!rows.length) {
    if (totalCount === 0) return filterBar + `<div class="meta" style="padding:8px">📭 該当するログイン履歴はありません</div>`;
    return filterBar + `<div class="meta" style="padding:8px">🔍 検索条件に一致する履歴がありません (取得 ${totalCount} 件中 0 件)</div>`;
  }
  // ソート矢印
  const arrow = (h) => _loginSort.col === h ? (_loginSort.dir === "asc" ? " ▲" : " ▼") : " ⇅";
  const head = `<tr>${headers.map((h) => `<th class="sortable" data-sort="${escape(h)}" title="${escape(h)} (Salesforce API 名・クリックでソート)" style="cursor:pointer; user-select:none;">${escape(colLabels[h])}<span style="opacity:${_loginSort.col === h ? 1 : 0.4}; font-size:9px;">${arrow(h)}</span></th>`).join("")}</tr>`;
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
  return filterBar + `<table>${head}${body}</table>`;
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

// v3.177.0 Phase 267: 結果テーブルから Markdown を生成する汎用関数 (logs/metadata 等で共通利用)
async function copyResultTableAsMd(resultId, title) {
  const resultEl = document.getElementById(resultId);
  const table = resultEl ? resultEl.querySelector("table") : null;
  if (!table) {
    panelToast(`📭 ${title}が未取得です。先に取得ボタンを押してください`, { kind: "warn" });
    return;
  }
  const ths = Array.from(table.querySelectorAll("thead th"));
  const headers = ths.map((th) => th.textContent.trim()).filter((h) => h && !["", "選択"].includes(h));
  const trs = Array.from(table.querySelectorAll("tbody tr"));
  const lines = [];
  lines.push(`## ${title}`);
  lines.push("");
  lines.push(`_取得日時: ${new Date().toLocaleString("ja-JP")} / 件数: ${trs.length}_`);
  lines.push("");
  lines.push("| " + headers.map((h) => h.replace(/\|/g, "\\|")).join(" | ") + " |");
  lines.push("|" + headers.map(() => "---").join("|") + "|");
  for (const tr of trs) {
    const tds = Array.from(tr.querySelectorAll("td"));
    const adjusted = tds.length > headers.length ? tds.slice(tds.length - headers.length) : tds;
    const row = adjusted.slice(0, headers.length).map((td) => (td.textContent || "").trim().replace(/\|/g, "\\|").replace(/\r?\n/g, " "));
    while (row.length < headers.length) row.push("");
    lines.push("| " + row.join(" | ") + " |");
  }
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    panelToast(`📝 ${title}を Markdown でコピーしました (${trs.length} 件)`, { kind: "ok" });
  } catch (e) {
    panelToast("❌ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" });
  }
}

// v3.185.0 Phase 275: Describe 結果を「タイトル + 統計サマリ + 項目表」の Markdown でコピー (設計書/仕様書向け)
async function copyDescribeAsMd() {
  const last = state.lastDescribe;
  if (!last || !last.data) {
    panelToast("📭 先にオブジェクトの describe を取得してください", { kind: "warn" });
    return;
  }
  const { obj, data: d } = last;
  const fields = d.fields || [];
  const total = fields.length;
  const customCount = fields.filter((f) => f.custom).length;
  const requiredCount = fields.filter((f) => !f.nillable && !f.defaultedOnCreate && f.createable).length;
  const uniqueCount = fields.filter((f) => f.unique).length;
  const formulaCount = fields.filter((f) => f.calculated).length;
  const picklistCount = fields.filter((f) => f.type === "picklist" || f.type === "multipicklist").length;
  const lookupCount = fields.filter((f) => f.type === "reference").length;
  const esc = (s) => String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  const lines = [
    `# 📋 ${d.label || obj} (${d.name || obj}) — オブジェクト定義書`,
    "",
    `_取得日時: ${new Date().toLocaleString("ja-JP")} / 対象組織: ${state.host || ""}_`,
    "",
    `## 統計サマリ`,
    "",
    `| 区分 | 件数 |`,
    `|---|---:|`,
    `| 全項目数 | ${total} |`,
    `| カスタム項目 | ${customCount} |`,
    `| 必須項目 | ${requiredCount} |`,
    `| ユニーク制約 | ${uniqueCount} |`,
    `| 数式項目 | ${formulaCount} |`,
    `| 選択リスト | ${picklistCount} |`,
    `| 参照型 (lookup) | ${lookupCount} |`,
    "",
    `## 権限`,
    "",
    `- 作成可能: ${d.createable ? "✓" : "✗"}`,
    `- 更新可能: ${d.updateable ? "✓" : "✗"}`,
    `- 削除可能: ${d.deletable ? "✓" : "✗"}`,
    `- SOQL クエリ可能: ${d.queryable ? "✓" : "✗"}`,
    `- カスタムオブジェクト: ${d.custom ? "✓" : "✗"}`,
    "",
    `## 全項目一覧 (${total} 件)`,
    "",
    `| API 名 | ラベル | 型 | 長さ | 必須 | ユニーク | カスタム | 選択肢数 | 参照先 |`,
    `|---|---|---|---:|:---:|:---:|:---:|---:|---|`,
  ];
  for (const f of fields) {
    const required = (!f.nillable && !f.defaultedOnCreate && f.createable) ? "✓" : "";
    const unique = f.unique ? "✓" : "";
    const custom = f.custom ? "✓" : "";
    const picklist = (f.picklistValues || []).length || "";
    const refs = (f.referenceTo || []).join(", ");
    lines.push(`| ${esc(f.name)} | ${esc(f.label)} | ${esc(f.type)} | ${f.length || ""} | ${required} | ${unique} | ${custom} | ${picklist} | ${esc(refs)} |`);
  }
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    panelToast(`📝 ${d.label || obj} の設計書 MD をコピーしました (${total} 項目)`, { kind: "ok" });
  } catch (e) {
    panelToast("❌ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" });
  }
}

// v3.181.0 Phase 271: admin モーダル本体の table を Markdown でコピー
async function copyAdminModalAsMd(overlay, title) {
  const body = overlay && overlay.querySelector(".admin-modal-body");
  const table = body && body.querySelector("table");
  if (!table) {
    panelToast("📭 モーダル内に表がありません", { kind: "warn" });
    return;
  }
  const ths = Array.from(table.querySelectorAll("thead th"));
  const headers = ths.map((th) => th.textContent.trim()).filter((h) => h && !["", "選択"].includes(h));
  const trs = Array.from(table.querySelectorAll("tbody tr"));
  const lines = [
    `## ${title}`,
    "",
    `_取得日時: ${new Date().toLocaleString("ja-JP")} / 件数: ${trs.length}_`,
    "",
    "| " + headers.map((h) => h.replace(/\|/g, "\\|")).join(" | ") + " |",
    "|" + headers.map(() => "---").join("|") + "|",
  ];
  for (const tr of trs) {
    const tds = Array.from(tr.querySelectorAll("td"));
    const adjusted = tds.length > headers.length ? tds.slice(tds.length - headers.length) : tds;
    const row = adjusted.slice(0, headers.length).map((td) => (td.textContent || "").trim().replace(/\|/g, "\\|").replace(/\r?\n/g, " "));
    while (row.length < headers.length) row.push("");
    lines.push("| " + row.join(" | ") + " |");
  }
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    panelToast(`📝 ${title}を Markdown でコピーしました (${trs.length} 件)`, { kind: "ok" });
  } catch (e) {
    panelToast("❌ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" });
  }
}

// v3.175.0 Phase 265: ログイン履歴を Markdown テーブル形式でコピー (セキュリティ監査用)
async function copyLoginHistoryMd() {
  if (!state.lastLoginRecords || !state.lastLoginRecords.length) {
    panelToast("📭 ログイン履歴が未取得です。先に「取得」ボタンをクリックしてください", { kind: "warn" });
    return;
  }
  const recs = state.lastLoginRecords;
  // 主要列のみ抽出 (LoginTime / Username / Status / SourceIp / LoginType / Browser / Platform)
  const headers = ["LoginTime", "Username", "Status", "SourceIp", "LoginType", "Browser", "Platform"];
  // 表示用列名 (業務用日本語)
  const headerLabels = ["日時", "ユーザー", "結果", "送信元 IP", "種別", "ブラウザ", "プラットフォーム"];
  const lines = [
    "## Salesforce ログイン履歴",
    "",
    `_取得日時: ${new Date().toLocaleString("ja-JP")} / 件数: ${recs.length}_`,
    "",
    "| " + headerLabels.join(" | ") + " |",
    "|" + headers.map(() => "---").join("|") + "|",
  ];
  const mdEsc = (v) => String(v == null ? "" : v).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  // Status 別マーカー (✓ Success / ✗ Failed)
  const statusIcon = (s) => s === "Success" ? "✓ Success" : s === "Failed" ? "✗ Failed" : (s || "");
  for (const r of recs) {
    const row = headers.map((h) => {
      if (h === "LoginTime" && r.LoginTime) {
        const m = String(r.LoginTime).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
        return mdEsc(m ? `${m[1]} ${m[2]}` : r.LoginTime);
      }
      if (h === "Status") return mdEsc(statusIcon(r.Status));
      if (h === "Username") {
        // Username は r.LoginHistoryRelationships の Username (リレーション)、または直接 r.Username
        return mdEsc((r.User && r.User.Username) || r.UserName || r.Username || "");
      }
      return mdEsc(r[h] || "");
    });
    lines.push("| " + row.join(" | ") + " |");
  }
  // セキュリティ統計: 成功 vs 失敗
  const okCount = recs.filter((r) => r.Status === "Success").length;
  const failCount = recs.filter((r) => r.Status === "Failed").length;
  lines.push("");
  lines.push(`**集計**: ✓ Success ${okCount} 件 / ✗ Failed ${failCount} 件${failCount > 0 ? " ⚠ 認証失敗あり、要監査" : ""}`);
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    panelToast(`📝 ログイン履歴を Markdown でコピーしました (${recs.length} 件 / 失敗 ${failCount} 件)`, { kind: "ok" });
  } catch (e) {
    panelToast("❌ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" });
  }
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

// =============================================================================
// v3.137.0 Phase 227 (Team G2): グローバル検索 (SOSL ベース)
// 検索ワードを SOSL FIND 句に渡し、複数オブジェクト横断で結果を取得
// =============================================================================
// v3.149.0 Phase 239: グローバル検索履歴 (chrome.storage.local 永続化)
const SEARCH_HISTORY_KEY = "sfdtRecentSearches";
const SEARCH_HISTORY_MAX = 10;
async function loadSearchHistory() {
  try {
    const d = await chrome.storage.local.get(SEARCH_HISTORY_KEY);
    return Array.isArray(d[SEARCH_HISTORY_KEY]) ? d[SEARCH_HISTORY_KEY] : [];
  } catch { return []; }
}
async function pushSearchHistory(entry) {
  // entry: { kw, scope, ts }
  if (!entry || !entry.kw) return;
  try {
    const list = await loadSearchHistory();
    const norm = String(entry.kw).trim();
    if (!norm) return;
    const next = [{ kw: norm, scope: entry.scope || "standard", ts: Date.now() }, ...list.filter((e) => e && e.kw !== norm)].slice(0, SEARCH_HISTORY_MAX);
    await chrome.storage.local.set({ [SEARCH_HISTORY_KEY]: next });
    renderSearchHistory(next);
  } catch (e) { console.warn("[search] push history failed", e); }
}
function renderSearchHistory(list) {
  const row = document.getElementById("searchHistoryRow");
  if (!row) return;
  if (!list || !list.length) {
    row.innerHTML = "";
    return;
  }
  const scopeLabelMap = { standard: "📌主要", extended: "📚拡張", all: "🌐全" };
  const chips = list.map((e) => {
    const lbl = scopeLabelMap[e.scope] || "📌";
    return `<button class="search-hist-chip" data-kw="${escape(e.kw)}" data-scope="${escape(e.scope || "standard")}" title="${escape(e.kw)} (${escape(e.scope || "standard")} スコープ) で再検索">
      <span class="search-hist-scope">${lbl}</span>
      <span class="search-hist-kw">${escape(e.kw)}</span>
    </button>`;
  }).join("");
  row.innerHTML = `<span class="search-hist-label">📜 最近の検索:</span>${chips}<button class="search-hist-clear" title="検索履歴をすべて削除">✕ 履歴削除</button>`;
  // 各 chip にクリックハンドラ
  row.querySelectorAll(".search-hist-chip").forEach((b) => {
    b.addEventListener("click", () => {
      const inp = document.getElementById("searchQuery");
      const sel = document.getElementById("searchScope");
      if (inp) inp.value = b.dataset.kw || "";
      if (sel) sel.value = b.dataset.scope || "standard";
      doGlobalSearch();
    });
  });
  const clearBtn = row.querySelector(".search-hist-clear");
  if (clearBtn) clearBtn.addEventListener("click", async () => {
    if (!window.confirm("検索履歴を全て削除しますか？")) return;
    try {
      await chrome.storage.local.remove(SEARCH_HISTORY_KEY);
      renderSearchHistory([]);
      panelToast("✓ 検索履歴を削除しました", { kind: "ok" });
    } catch (e) { console.warn("[search] clear history failed", e); }
  });
}

const SEARCH_SCOPES = {
  standard: [
    { obj: "Account", fields: "Id, Name, Type, Industry, Phone, Website, Owner.Name" },
    { obj: "Contact", fields: "Id, Name, Email, Phone, Account.Name, Title, Owner.Name" },
    { obj: "Lead", fields: "Id, Name, Email, Phone, Company, Status, Owner.Name" },
    { obj: "Opportunity", fields: "Id, Name, StageName, Amount, CloseDate, Account.Name, Owner.Name" },
    { obj: "Case", fields: "Id, CaseNumber, Subject, Status, Priority, Account.Name, Owner.Name" },
    { obj: "User", fields: "Id, Name, Username, Email, Profile.Name, IsActive" },
  ],
  extended: [
    { obj: "Account", fields: "Id, Name, Type, Industry, Phone, Owner.Name" },
    { obj: "Contact", fields: "Id, Name, Email, Phone, Account.Name, Owner.Name" },
    { obj: "Lead", fields: "Id, Name, Email, Phone, Company, Status" },
    { obj: "Opportunity", fields: "Id, Name, StageName, Amount, CloseDate, Account.Name" },
    { obj: "Case", fields: "Id, CaseNumber, Subject, Status, Priority, Account.Name" },
    { obj: "User", fields: "Id, Name, Username, Email, IsActive" },
    { obj: "Task", fields: "Id, Subject, Status, Priority, ActivityDate, Who.Name, What.Name" },
    { obj: "Event", fields: "Id, Subject, ActivityDate, Who.Name, What.Name" },
    { obj: "Note", fields: "Id, Title, ParentId" },
    { obj: "Campaign", fields: "Id, Name, Status, Type, StartDate, EndDate" },
  ],
  // "all" は SOSL の RETURNING 句を空にして全 SObject を対象 (Salesforce 標準仕様)
};

function buildSoslQuery(keyword, scope) {
  // ワイルドカード: ユーザー入力に * を含まない場合は前後に * を付けて部分一致化
  let kw = String(keyword || "").trim();
  if (!kw) return null;
  // SOSL の予約文字エスケープ ( \ + ? * { } ( ) [ ] " & | ! - )
  // ここでは最小限: 単一引用符と バックスラッシュのみエスケープ
  kw = kw.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  // ユーザーが * を入れていなければ自動 wildcard 化 (3 文字以上の場合)
  if (kw.length >= 3 && !kw.includes("*") && !kw.includes("?")) {
    kw = kw + "*"; // 前方一致 + 部分一致
  }
  const scopeDef = SEARCH_SCOPES[scope];
  if (!scopeDef) {
    // "all" 等: RETURNING 句なしで全 SObject
    return `FIND {${kw}} IN ALL FIELDS RETURNING Account(Id, Name), Contact(Id, Name, Email), Lead(Id, Name, Email), Opportunity(Id, Name, StageName), Case(Id, CaseNumber, Subject), User(Id, Name, Username)`;
  }
  const returning = scopeDef.map((s) => `${s.obj}(${s.fields})`).join(", ");
  return `FIND {${kw}} IN ALL FIELDS RETURNING ${returning}`;
}

async function doGlobalSearch() {
  if (!state.sid) { panelToast("⚠ 先に Salesforce に接続してください", { kind: "warn" }); return; }
  const kw = document.getElementById("searchQuery").value.trim();
  const scope = document.getElementById("searchScope").value || "standard";
  const meta = document.getElementById("searchMeta");
  const root = document.getElementById("searchResultRoot");
  if (!kw) {
    if (meta) meta.innerHTML = `<span class="pill warn">⚠ 検索ワードを入力してください</span>`;
    document.getElementById("searchQuery").focus();
    return;
  }
  if (kw.length < 2) {
    if (meta) meta.innerHTML = `<span class="pill warn">⚠ 2 文字以上で検索してください (Salesforce SOSL の最低要件)</span>`;
    return;
  }
  const sosl = buildSoslQuery(kw, scope);
  if (!sosl) return;
  meta.innerHTML = `<span class="pill loading">検索中…</span>`;
  root.innerHTML = `<div class="empty-state" style="padding:18px">⏳ SOSL を実行中… (検索ワード: <strong>${escape(kw)}</strong>)</div>`;

  const unlock = lockBtn("btnSearch");
  const t0 = performance.now();
  const url = `/services/data/v${state.apiVersion}/search/?q=${encodeURIComponent(sosl)}`;
  const r = await sfFetch({ host: state.host, sid: state.sid, path: url });
  const dt = Math.round(performance.now() - t0);
  unlock();

  if (!r.ok) {
    meta.innerHTML = `<span class="pill err">HTTP ${r.status}</span>`;
    const errBody = r.data && r.data[0] && r.data[0].message ? r.data[0].message : (typeof r.data === "string" ? r.data : JSON.stringify(r.data || {}).slice(0, 240));
    root.innerHTML = `<div class="meta admin-card-err" style="padding:12px">
      <strong>HTTP ${escape(String(r.status))}</strong>: ${escape(String(errBody)).substring(0, 240)}
      <br><br><strong>SOSL:</strong> <code>${escape(sosl)}</code>
      <br><br><strong>原因の可能性</strong>: 検索ワードが Salesforce 検索インデックスにヒットしない (Salesforce 検索インデックスは編集後 30 秒〜数分遅延あり) / 検索対象オブジェクトが Search Layout 設定されていない / 権限不足</div>`;
    return;
  }

  // SOSL レスポンスは Salesforce のバージョンにより形式が異なる:
  // v36+ : { searchRecords: [...] } (フラット)
  // v40+ : { searchRecords: [{ attributes: { type }, ...fields }] } (フラットだが attributes.type で SObject 区別)
  const records = (r.data && r.data.searchRecords) || [];
  // SObject 別にグループ化
  const groups = new Map();
  for (const rec of records) {
    const type = (rec.attributes && rec.attributes.type) || "?";
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push(rec);
  }

  meta.innerHTML = `<span class="pill ok">✓ ${records.length} 件</span> <span class="meta">${dt}ms / ${groups.size} オブジェクト</span> <button id="btnSearchExportCsv" class="admin-row-action" style="margin-left:8px" title="検索結果全体を CSV ファイルとしてダウンロードします (SObject 列付き、全グループ統合)">📥 CSV</button> <button id="btnSearchExportMd" class="admin-row-action" style="margin-left:4px" title="検索結果全体を Markdown ドキュメントとしてクリップボードコピー (オブジェクト別セクション付き、議事録/Notion 向け)">📝 全 MD</button> <button id="btnSearchCopyLink" class="admin-row-action" style="margin-left:4px" title="この検索を再実行できる URL (?view=search&kw=&scope=) をクリップボードコピー — Slack/Notion 共有用 (Phase 281)">🔗 リンク</button>`;
  // v3.155.0 Phase 245: CSV ダウンロードボタン (グローバル検索結果)
  const csvBtn = document.getElementById("btnSearchExportCsv");
  if (csvBtn) csvBtn.addEventListener("click", () => exportSearchCsv(records, kw));
  // v3.182.0 Phase 272: 全体 MD コピーボタン (グローバル検索結果)
  const mdBtn = document.getElementById("btnSearchExportMd");
  if (mdBtn) mdBtn.addEventListener("click", () => exportSearchMd(groups, kw));
  // v3.191.0 Phase 281: 検索リンクコピー (?view=search&kw=&scope= URL を生成)
  const linkBtn = document.getElementById("btnSearchCopyLink");
  if (linkBtn) linkBtn.addEventListener("click", async () => {
    try {
      const qp = new URLSearchParams({ view: "search", kw, scope });
      const url = chrome.runtime.getURL(`html/tool.html?${qp.toString()}`);
      await navigator.clipboard.writeText(url);
      panelToast(`🔗 検索リンクをコピーしました (${kw})`, { kind: "ok" });
    } catch (e) {
      panelToast("❌ リンクコピー失敗: " + (e.message || e), { kind: "err" });
    }
  });

  if (!records.length) {
    root.innerHTML = `<div class="empty-state" style="padding:24px 12px">
      📭 「<strong>${escape(kw)}</strong>」に一致するレコードが見つかりませんでした。<br><br>
      <strong>確認ポイント</strong>:
      <ul style="text-align:left;display:inline-block;margin-top:8px">
        <li>検索ワードを <strong>3 文字以上</strong> にする (短いワードは Salesforce 検索インデックス対象外)</li>
        <li>ワイルドカード <code>*</code> を付ける (例: <code>${escape(kw)}*</code>)</li>
        <li>Salesforce 検索インデックスは編集後 <strong>30 秒〜数分</strong>遅延あります</li>
        <li>検索対象オブジェクトの「検索レイアウト」に項目が設定されているか Setup で確認</li>
      </ul>
    </div>`;
    return;
  }

  // 各 SObject ごとにテーブル表示
  const sortedTypes = Array.from(groups.keys()).sort();
  const SObject_ICONS = {
    "Account": "🏢", "Contact": "👤", "Lead": "🎯", "Opportunity": "💰",
    "Case": "📞", "User": "👨", "Task": "📋", "Event": "📅",
    "Note": "📝", "Campaign": "📣",
  };
  const sections = sortedTypes.map((type) => {
    const recs = groups.get(type);
    const icon = SObject_ICONS[type] || "📦";
    return `<details class="search-group" open>
      <summary class="search-group-summary">
        <span style="font-size:14px">${icon} <strong>${escape(type)}</strong></span>
        <span class="pill ok" style="font-size:10px">${recs.length} 件</span>
        <button class="search-group-export-csv admin-row-action" data-sobject="${escape(type)}" title="📥 この ${escape(type)} グループ単独の CSV ファイルをダウンロード (Phase 257)" aria-label="${escape(type)} を CSV エクスポート" style="margin-left:auto">📥 CSV</button>
      </summary>
      <div class="search-group-body">${recordsTable(recs)}</div>
    </details>`;
  });
  root.innerHTML = sections.join("");
  // v3.167.0 Phase 257: グループ別 CSV ダウンロードボタンのイベント
  root.querySelectorAll(".search-group-export-csv").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const t = btn.dataset.sobject;
      const recs = groups.get(t);
      if (!recs) return;
      // 既存 exportSearchCsv を SObject 別に呼び出し (キーワードに SObject 名を入れてファイル名を明示化)
      exportSearchCsv(recs, `${kw}-${t}`);
    });
  });
  // v3.148.0 Phase 238: 検索ワードのハイライト処理
  // ユーザー入力 kw を元にテーブル内のセル text を <mark> でマーク (大文字小文字無視)
  // wildcard * は無視して文字列マッチ部分のみ
  highlightSearchTerm(root, kw);
  // v3.149.0 Phase 239: 履歴に push (chrome.storage 永続化)
  pushSearchHistory({ kw, scope });
}

// v3.155.0 Phase 245: グローバル検索結果を CSV としてダウンロード
// SOSL の結果は SObject ごとに項目が異なるため、共通項目 + 個別項目 を 1 CSV にまとめる
function exportSearchCsv(records, keyword) {
  if (!Array.isArray(records) || !records.length) {
    panelToast("📭 エクスポート対象の結果がありません", { kind: "warn" });
    return;
  }
  // 全項目を収集 (各レコードのキーを集約、attributes は除外)
  const allKeys = new Set(["SObject"]); // 先頭は SObject (種別判別用)
  for (const rec of records) {
    Object.keys(rec).forEach((k) => {
      if (k !== "attributes") allKeys.add(k);
    });
  }
  const headers = ["SObject", ...Array.from(allKeys).filter((k) => k !== "SObject")];
  // CSV セル変換 (recordsToCsv と同じ、ネスト object 平坦化 + datetime 整形)
  const escCsv = (v) => {
    let s;
    if (v == null) s = "";
    else if (typeof v === "object") {
      if (v.attributes && typeof v.attributes === "object") {
        const fields = Object.keys(v).filter((k) => k !== "attributes");
        const prefer = ["Name", "Subject", "Title", "DeveloperName", "MasterLabel"];
        let label = null;
        for (const p of prefer) {
          if (fields.includes(p) && v[p] != null) {
            const id = fields.includes("Id") && v.Id ? ` [${String(v.Id).substring(0, 18)}]` : "";
            label = `${v[p]}${id}`;
            break;
          }
        }
        s = label || (fields.length ? `${fields[0]}=${v[fields[0]]}` : "{}");
      } else {
        s = JSON.stringify(v);
      }
    } else {
      s = String(v);
      const m = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/);
      if (m) s = `${m[1]} ${m[2]}`;
    }
    return /[",\n\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [];
  lines.push(headers.map(escCsv).join(","));
  for (const rec of records) {
    const sobj = (rec.attributes && rec.attributes.type) || "?";
    const row = headers.map((h) => {
      if (h === "SObject") return escCsv(sobj);
      return escCsv(rec[h]);
    });
    lines.push(row.join(","));
  }
  // BOM 付き UTF-8 (Excel 文字化け防止)
  const csv = "﻿" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  const ts = new Date().toISOString().substring(0, 19).replace(/[-T:]/g, "");
  const kwSafe = String(keyword || "search").replace(/[^a-zA-Z0-9_\-]/g, "_").substring(0, 30);
  a.href = URL.createObjectURL(blob);
  a.download = `devtoolsnext-search-${kwSafe}-${ts}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
  panelToast(`📥 検索結果 CSV をダウンロードしました (${records.length} 件)`, { kind: "ok" });
}

// v3.182.0 Phase 272: グローバル検索結果全体を Markdown ドキュメントとしてクリップボードコピー
// オブジェクト別セクション (## SObject) + 各セクションに Markdown 表 — 議事録/Notion/Slack 向け
async function exportSearchMd(groups, keyword) {
  if (!groups || !groups.size) {
    panelToast("📭 エクスポート対象の結果がありません", { kind: "warn" });
    return;
  }
  // 値の整形 (CSV と同じネスト object 平坦化 + datetime)
  const fmt = (v) => {
    if (v == null) return "";
    if (typeof v === "object") {
      if (v.attributes && typeof v.attributes === "object") {
        const fields = Object.keys(v).filter((k) => k !== "attributes");
        const prefer = ["Name", "Subject", "Title", "DeveloperName", "MasterLabel"];
        for (const p of prefer) {
          if (fields.includes(p) && v[p] != null) {
            const id = fields.includes("Id") && v.Id ? ` [${String(v.Id).substring(0, 18)}]` : "";
            return `${v[p]}${id}`;
          }
        }
        return fields.length ? `${fields[0]}=${v[fields[0]]}` : "";
      }
      return JSON.stringify(v);
    }
    const s = String(v);
    const m = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/);
    return m ? `${m[1]} ${m[2]}` : s;
  };
  const esc = (s) => String(s).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  const totalCount = Array.from(groups.values()).reduce((acc, recs) => acc + recs.length, 0);
  const lines = [
    `# 🔎 グローバル検索結果: ${keyword || ""}`,
    "",
    `_取得日時: ${new Date().toLocaleString("ja-JP")} / 合計: ${totalCount} 件 / オブジェクト数: ${groups.size}_`,
    "",
  ];
  const SObject_ICONS = {
    Account: "🏢", Contact: "👤", Lead: "🎯", Opportunity: "💰",
    Case: "📞", User: "👨", Task: "📋", Event: "📅", Note: "📝", Campaign: "📣",
  };
  // 件数の多い順にセクション化
  const sortedTypes = Array.from(groups.keys()).sort((a, b) => groups.get(b).length - groups.get(a).length);
  for (const type of sortedTypes) {
    const recs = groups.get(type);
    const icon = SObject_ICONS[type] || "📦";
    lines.push(`## ${icon} ${type} — ${recs.length} 件`);
    lines.push("");
    // 各 SObject の項目集合
    const keys = new Set();
    recs.forEach((r) => Object.keys(r).forEach((k) => k !== "attributes" && keys.add(k)));
    const headers = Array.from(keys);
    if (!headers.length) {
      lines.push(`_(項目なし)_`);
      lines.push("");
      continue;
    }
    lines.push("| " + headers.map((h) => esc(h)).join(" | ") + " |");
    lines.push("|" + headers.map(() => "---").join("|") + "|");
    for (const rec of recs) {
      const row = headers.map((h) => esc(fmt(rec[h])));
      lines.push("| " + row.join(" | ") + " |");
    }
    lines.push("");
  }
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    panelToast(`📝 検索結果 Markdown をコピーしました (${totalCount} 件 / ${groups.size} オブジェクト)`, { kind: "ok" });
  } catch (e) {
    panelToast("❌ クリップボードへのコピーに失敗しました: " + (e.message || e), { kind: "err" });
  }
}

// v3.148.0 Phase 238: 検索結果セル内のキーワードハイライト
// 検索ワードを大文字小文字無視で <mark class="search-hl"> でラップ
// XSS 防止: textNode のみ対象、HTML 構造は触らない (mark 要素のみ作成)
function highlightSearchTerm(rootEl, keyword) {
  if (!rootEl || !keyword) return;
  // ワイルドカード * ? を除外し、特殊文字エスケープした単純文字列を取り出す
  const plain = String(keyword).replace(/[*?]/g, "").trim();
  if (plain.length < 2) return; // 1 文字は誤マークしやすい
  const esc = plain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${esc})`, "ig");
  // 全テーブルの td 要素を走査
  const cells = rootEl.querySelectorAll("td");
  cells.forEach((td) => {
    // 既にネスト要素 (button 等) を含むセルはスキップ — search 結果は単純テキスト想定
    if (td.children.length > 0) {
      // テキストノードだけ処理
      td.childNodes.forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) {
          const text = n.nodeValue;
          if (re.test(text)) {
            const frag = document.createDocumentFragment();
            const parts = text.split(re);
            parts.forEach((p) => {
              if (re.test(p)) {
                const m = document.createElement("mark");
                m.className = "search-hl";
                m.textContent = p;
                frag.appendChild(m);
              } else if (p) {
                frag.appendChild(document.createTextNode(p));
              }
              re.lastIndex = 0;
            });
            n.parentNode.replaceChild(frag, n);
          }
        }
      });
      return;
    }
    const text = td.textContent || "";
    if (!re.test(text)) return;
    re.lastIndex = 0;
    const parts = text.split(re);
    td.textContent = "";
    parts.forEach((p) => {
      if (re.test(p)) {
        const m = document.createElement("mark");
        m.className = "search-hl";
        m.textContent = p;
        td.appendChild(m);
      } else if (p) {
        td.appendChild(document.createTextNode(p));
      }
      re.lastIndex = 0;
    });
  });
}

// =============================================================================
// v3.129.0 Phase 219 (Team U): ユーザー・ライセンス管理ダッシュボード
// SOQL/Apex テンプレート内に埋もれていた機能を専用画面化。各カードは独立して取得可。
// =============================================================================
const adminState = {
  orgInfo: null,
  licenses: null,
  permsetLicenses: null,
  userStats: null,
  frozen: null,
  mfa: null,
  packages: null,
  lastLoadedAt: null,
};

// v3.139.0 Phase 229: Login as User URL ヘルパー (popup.js loginAsUser の panel 版)
// state.orgId と userId (15 桁) から Salesforce 標準の代理ログイン URL を組み立てて新タブで開く
function adminLoginAsUser(userId, userName) {
  if (!state.host || !state.orgId) {
    panelToast("⚠ セッション情報未取得 — 先に再接続してください", { kind: "warn" });
    return;
  }
  if (!userId) { panelToast("⚠ ユーザー ID が指定されていません", { kind: "warn" }); return; }
  const orgId15 = String(state.orgId).substring(0, 15);
  const uid15 = String(userId).substring(0, 15);
  const url = `https://${state.apiHost}/servlet/servlet.su?oid=${orgId15}&suorgadminid=${uid15}&retURL=%2Flightning%2F&targetURL=%2Flightning%2F`;
  window.open(url, "_blank", "noopener");
  panelToast(`👤 ${userName || userId} として代理ログインしています…`, { kind: "ok" });
}

function adminSetCardLoading(elId, label) {
  const el = document.getElementById(elId);
  if (el) el.innerHTML = `<div class="meta" style="padding:12px;text-align:center"><span class="pill loading">${escape(label)}</span></div>`;
}

function adminSetCardError(elId, status, body) {
  const el = document.getElementById(elId);
  if (!el) return;
  const txt = typeof body === "string" ? body : JSON.stringify(body || {});
  const short = txt.length > 220 ? txt.substring(0, 220) + "…" : txt;
  el.innerHTML = `<div class="meta admin-card-err" style="padding:12px;color:var(--err)"><strong>HTTP ${escape(String(status))}</strong>: ${escape(short)}</div>`;
}

function adminFmtPct(used, total) {
  if (!total || total <= 0) return { txt: "—", ratio: 0 };
  const ratio = Math.min(1, used / total);
  return { txt: (ratio * 100).toFixed(1) + "%", ratio };
}

function adminPctBarHtml(used, total) {
  const { txt, ratio } = adminFmtPct(used, total);
  const widthPct = (ratio * 100).toFixed(1);
  const kind = ratio >= 0.9 ? "err" : ratio >= 0.7 ? "warn" : "ok";
  return `<div class="admin-bar" title="使用率 ${escape(txt)} (${escape(String(used))} / ${escape(String(total))})">
    <div class="admin-bar-fill admin-bar-${kind}" style="width:${widthPct}%"></div>
    <span class="admin-bar-label">${escape(txt)}</span>
  </div>`;
}

function adminTableHtml(headers, rows, opts = {}) {
  if (!rows || !rows.length) return `<div class="meta" style="padding:12px;text-align:center;font-size:11px">📭 該当データなし</div>`;
  const cls = opts.compact ? "admin-table compact" : "admin-table";
  const headHtml = headers.map((h) => `<th>${escape(h)}</th>`).join("");
  const rowsHtml = rows.map((r) => `<tr>${headers.map((h) => {
    const v = r[h];
    if (v && typeof v === "object" && v.__html) return `<td>${v.__html}</td>`;
    return `<td>${escape(v == null ? "" : String(v))}</td>`;
  }).join("")}</tr>`).join("");
  return `<table class="${cls}"><thead><tr>${headHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

// v3.144.0 Phase 234: 組織情報サマリ — Organization SOQL + Limits API でストレージ使用量
async function doAdminOrgInfo() {
  if (!state.sid) { panelToast("⚠ 先に Salesforce に接続してください", { kind: "warn" }); return; }
  adminSetCardLoading("adminOrgInfoResult", "組織情報を取得中…");
  // 1. Organization SOQL
  const orgR = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion,
    soql: `SELECT Id, Name, OrganizationType, InstanceName, IsSandbox, LanguageLocaleKey, TimeZoneSidKey, DefaultCurrencyIsoCode, FiscalYearStartMonth, CreatedDate, NamespacePrefix, TrialExpirationDate, MonthlyPageViewsEntitlement, MonthlyPageViewsUsed FROM Organization LIMIT 1`,
  });
  if (!orgR.ok) { adminSetCardError("adminOrgInfoResult", orgR.status, orgR.data); return; }
  const org = ((orgR.data || {}).records || [])[0] || {};
  // 2. Limits API でストレージ使用量を取得
  let limits = null;
  try {
    const limR = await sfFetch({ host: state.host, sid: state.sid, path: `/services/data/v${state.apiVersion}/limits` });
    if (limR.ok) limits = limR.data;
  } catch (e) { console.warn("[admin] Limits fetch failed:", e); }

  adminState.orgInfo = { org, limits };

  // エディション業務用表記マップ
  const editionMap = {
    "Developer Edition": "Developer (開発者・無料)",
    "Enterprise Edition": "Enterprise (大規模企業向け)",
    "Unlimited Edition": "Unlimited (上位)",
    "Performance Edition": "Performance",
    "Professional Edition": "Professional (中小規模)",
    "Group Edition": "Group (小規模)",
    "Essentials Edition": "Essentials (Starter)",
    "Trial Edition": "Trial (試用)",
  };

  // 月別マップ (FiscalYearStartMonth)
  const monthMap = { 1: "1月", 2: "2月", 3: "3月", 4: "4月 (日本会計年度)", 5: "5月", 6: "6月", 7: "7月", 8: "8月", 9: "9月", 10: "10月", 11: "11月", 12: "12月" };

  const envBadge = org.IsSandbox
    ? '<span class="pill" style="background:rgba(243,156,18,0.15);color:var(--warn);border:1px solid var(--warn)">⚠ Sandbox</span>'
    : '<span class="pill" style="background:rgba(239,68,68,0.15);color:var(--err);border:1px solid var(--err)">🚨 Production (本番)</span>';

  // ストレージ使用量カード (Limits API から)
  let storageHtml = "";
  if (limits) {
    const ds = limits.DataStorageMB || {};
    const fs = limits.FileStorageMB || {};
    const dsTotal = Number(ds.Max) || 0;
    const dsUsed = (Number(ds.Max) || 0) - (Number(ds.Remaining) || 0);
    const fsTotal = Number(fs.Max) || 0;
    const fsUsed = (Number(fs.Max) || 0) - (Number(fs.Remaining) || 0);
    storageHtml = `<div class="admin-card-subtitle">💾 ストレージ使用量</div>
      <div class="admin-stat-grid">
        <div class="admin-stat ${dsTotal > 0 && dsUsed / dsTotal >= 0.9 ? "admin-stat-warn" : ""}">
          <div class="admin-stat-label">データストレージ</div>
          <div class="admin-stat-value" style="font-size:13px">${dsUsed.toLocaleString("ja-JP")} / ${dsTotal.toLocaleString("ja-JP")} MB</div>
          ${adminPctBarHtml(dsUsed, dsTotal)}
        </div>
        <div class="admin-stat ${fsTotal > 0 && fsUsed / fsTotal >= 0.9 ? "admin-stat-warn" : ""}">
          <div class="admin-stat-label">ファイルストレージ</div>
          <div class="admin-stat-value" style="font-size:13px">${fsUsed.toLocaleString("ja-JP")} / ${fsTotal.toLocaleString("ja-JP")} MB</div>
          ${adminPctBarHtml(fsUsed, fsTotal)}
        </div>
      </div>`;
  } else {
    storageHtml = `<div class="meta" style="padding:8px;font-size:11px;color:var(--fg-dim)">※ ストレージ使用量の取得に失敗しました (Limits API 権限不足の可能性)</div>`;
  }

  // 基本情報 KV
  const kv = [
    ["組織名", `<strong>${escape(org.Name || "—")}</strong>`],
    ["組織 ID", `<code style="font-family:ui-monospace,Consolas,monospace">${escape(org.Id || "—")}</code>`],
    ["エディション", editionMap[org.OrganizationType] || (org.OrganizationType || "—")],
    ["環境種別", envBadge],
    ["インスタンス", escape(org.InstanceName || "—")],
    ["ネームスペース", escape(org.NamespacePrefix || "(なし)")],
    ["言語", escape(org.LanguageLocaleKey || "—")],
    ["タイムゾーン", escape(org.TimeZoneSidKey || "—")],
    ["既定通貨", escape(org.DefaultCurrencyIsoCode || "—")],
    ["会計年度開始月", monthMap[org.FiscalYearStartMonth] || String(org.FiscalYearStartMonth || "—")],
    ["組織作成日", org.CreatedDate ? String(org.CreatedDate).substring(0, 10) : "—"],
  ];
  if (org.TrialExpirationDate) {
    kv.push(["⚠ Trial 期限", `<span style="color:var(--warn);font-weight:700">${escape(String(org.TrialExpirationDate).substring(0, 10))} — 試用期間中の組織</span>`]);
  }
  if (org.MonthlyPageViewsEntitlement) {
    const pvUsed = Number(org.MonthlyPageViewsUsed) || 0;
    const pvTotal = Number(org.MonthlyPageViewsEntitlement) || 0;
    kv.push(["月間 PV 使用量 (Communities)", `${pvUsed.toLocaleString("ja-JP")} / ${pvTotal.toLocaleString("ja-JP")} (${pvTotal > 0 ? ((pvUsed / pvTotal) * 100).toFixed(1) : 0}%)`]);
  }
  const kvHtml = `<table class="admin-table compact"><tbody>${kv.map(([k, v]) => `<tr><td style="font-weight:600;width:30%">${escape(k)}</td><td>${v}</td></tr>`).join("")}</tbody></table>`;
  document.getElementById("adminOrgInfoResult").innerHTML = kvHtml + storageHtml;
}

async function doAdminLicenses() {
  if (!state.sid) { panelToast("⚠ 先に Salesforce に接続してください", { kind: "warn" }); return; }
  adminSetCardLoading("adminLicensesResult", "UserLicense を取得中…");
  const r = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion,
    soql: `SELECT Name, MasterLabel, TotalLicenses, UsedLicenses, Status FROM UserLicense ORDER BY UsedLicenses DESC LIMIT 100`,
  });
  if (!r.ok) { adminSetCardError("adminLicensesResult", r.status, r.data); return; }
  const recs = (r.data && r.data.records) || [];
  const rows = recs.map((rec) => {
    const total = Number(rec.TotalLicenses) || 0;
    const used = Number(rec.UsedLicenses) || 0;
    const remaining = total - used;
    const ratio = total > 0 ? used / total : 0;
    const apiName = rec.Name || "";
    // v3.139.0 Phase 229: 残席数が 5 席未満で総数 > 0 のものは「即追加調達」アラート
    const remainingLabel = remaining.toLocaleString("ja-JP");
    const remainingHtml = (total > 0 && remaining < 5 && remaining >= 0)
      ? `<span style="color:var(--err);font-weight:700" title="残席 ${remainingLabel} 席 — 即追加調達検討">${remainingLabel} 席 ⚠</span>`
      : (total > 0 && remaining < 10)
        ? `<span style="color:var(--warn)" title="残席 ${remainingLabel} 席 — 注意水準">${remainingLabel} 席</span>`
        : remainingLabel;
    return {
      "ライセンス": rec.MasterLabel || rec.Name,
      "API 名": apiName,
      "総数": total.toLocaleString("ja-JP"),
      "使用中": used.toLocaleString("ja-JP"),
      "残り": { __html: remainingHtml },
      "使用率": { __html: adminPctBarHtml(used, total) },
      "状態": rec.Status === "Active" ? "○ 有効" : rec.Status,
      "アクション": { __html: total > 0 ? `<button class="admin-action-license-detail admin-row-action" data-api-name="${escape(apiName)}" title="このライセンスを使用中の全ユーザーを抽出表示します (Profile.UserLicense 経由)">👥 使用者を見る</button>` : "" },
    };
  });
  adminState.licenses = rows;
  const totalSum = recs.reduce((s, r) => s + (Number(r.TotalLicenses) || 0), 0);
  const usedSum = recs.reduce((s, r) => s + (Number(r.UsedLicenses) || 0), 0);
  const criticalCount = recs.filter((r) => {
    const t = Number(r.TotalLicenses) || 0;
    const u = Number(r.UsedLicenses) || 0;
    return t > 0 && u / t >= 0.9;
  }).length;
  // v3.139.0 Phase 229: 残席 5 席未満の即追加調達アラート (criticalCount より厳しい条件)
  const urgentLicenses = recs.filter((r) => {
    const t = Number(r.TotalLicenses) || 0;
    const u = Number(r.UsedLicenses) || 0;
    return t > 0 && (t - u) < 5 && (t - u) >= 0;
  });
  const urgentLabels = urgentLicenses.map((r) => `${r.MasterLabel || r.Name} (残 ${(Number(r.TotalLicenses) || 0) - (Number(r.UsedLicenses) || 0)})`).slice(0, 3).join(", ");
  const urgentExtra = urgentLicenses.length > 3 ? ` 他 ${urgentLicenses.length - 3} 件` : "";
  const alertHtml = urgentLicenses.length > 0
    ? `<div class="admin-alert admin-alert-err">🚨 残席 5 席未満のライセンスが <strong>${urgentLicenses.length} 件</strong>: ${escape(urgentLabels)}${escape(urgentExtra)} — <strong>即追加調達を検討</strong>してください</div>`
    : (criticalCount > 0
      ? `<div class="admin-alert admin-alert-err">⚠ 使用率 90% 超のライセンスが <strong>${criticalCount} 件</strong> あります — 早急に追加調達 / 棚卸しが必要です</div>`
      : "");
  const headers = ["ライセンス", "API 名", "総数", "使用中", "残り", "使用率", "状態", "アクション"];
  document.getElementById("adminLicensesResult").innerHTML =
    alertHtml +
    `<div class="admin-card-summary">合計 ${recs.length} 種類 / 総席数 <strong>${totalSum.toLocaleString("ja-JP")}</strong> 席 / 使用中 <strong>${usedSum.toLocaleString("ja-JP")}</strong> 席 (全体 ${adminFmtPct(usedSum, totalSum).txt})</div>` +
    adminTableHtml(headers, rows);
}

async function doAdminPermSetLicenses() {
  if (!state.sid) { panelToast("⚠ 先に Salesforce に接続してください", { kind: "warn" }); return; }
  adminSetCardLoading("adminPermSetLicensesResult", "PermissionSetLicense を取得中…");
  const r = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion,
    soql: `SELECT MasterLabel, DeveloperName, TotalLicenses, UsedLicenses, ExpirationDate, Status FROM PermissionSetLicense ORDER BY UsedLicenses DESC LIMIT 200`,
  });
  if (!r.ok) { adminSetCardError("adminPermSetLicensesResult", r.status, r.data); return; }
  const recs = (r.data && r.data.records) || [];
  const rows = recs.map((rec) => {
    const total = Number(rec.TotalLicenses) || 0;
    const used = Number(rec.UsedLicenses) || 0;
    return {
      "ライセンス": rec.MasterLabel,
      "API 名": rec.DeveloperName,
      "総数": total.toLocaleString("ja-JP"),
      "使用中": used.toLocaleString("ja-JP"),
      "残り": (total - used).toLocaleString("ja-JP"),
      "使用率": { __html: adminPctBarHtml(used, total) },
      "有効期限": rec.ExpirationDate ? String(rec.ExpirationDate).substring(0, 10) : "無期限",
      "状態": rec.Status === "Active" ? "○ 有効" : rec.Status,
    };
  });
  adminState.permsetLicenses = rows;
  const headers = ["ライセンス", "API 名", "総数", "使用中", "残り", "使用率", "有効期限", "状態"];
  document.getElementById("adminPermSetLicensesResult").innerHTML =
    `<div class="admin-card-summary">合計 ${recs.length} 種類 / 期限切れ間近 (90 日以内): <strong>${recs.filter((r) => r.ExpirationDate && (new Date(r.ExpirationDate) - new Date()) < 90 * 86400000 && (new Date(r.ExpirationDate) - new Date()) > 0).length}</strong> 件</div>` +
    adminTableHtml(headers, rows);
}

async function doAdminUserStats() {
  if (!state.sid) { panelToast("⚠ 先に Salesforce に接続してください", { kind: "warn" }); return; }
  adminSetCardLoading("adminUserStatsResult", "ユーザー集計中…");
  // 1) アクティブ・非アクティブ集計
  const userAgg = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion,
    soql: `SELECT IsActive, COUNT(Id) cnt FROM User GROUP BY IsActive`,
  });
  if (!userAgg.ok) { adminSetCardError("adminUserStatsResult", userAgg.status, userAgg.data); return; }
  let activeCount = 0, inactiveCount = 0;
  for (const r of (userAgg.data.records || [])) {
    if (r.IsActive) activeCount = Number(r.cnt) || 0;
    else inactiveCount = Number(r.cnt) || 0;
  }
  // 2) 凍結数
  const frozenAgg = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion,
    soql: `SELECT COUNT(Id) cnt FROM UserLogin WHERE IsFrozen = true`,
  });
  const frozenCount = frozenAgg.ok ? (Number(((frozenAgg.data.records || [])[0] || {}).cnt) || 0) : 0;
  // 3) プロファイル分布 (アクティブのみ Top 20)
  const profAgg = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion,
    soql: `SELECT Profile.Name profile, COUNT(Id) cnt FROM User WHERE IsActive = true GROUP BY Profile.Name ORDER BY COUNT(Id) DESC LIMIT 20`,
  });
  const profRows = profAgg.ok ? ((profAgg.data.records || []).map((r) => ({
    "プロファイル": r.profile || "(未設定)",
    "アクティブ人数": Number(r.cnt).toLocaleString("ja-JP"),
    "割合": ((Number(r.cnt) / Math.max(activeCount, 1)) * 100).toFixed(1) + "%",
  }))) : [];
  adminState.userStats = { activeCount, inactiveCount, frozenCount, profRows };
  const total = activeCount + inactiveCount;
  const summary = `
    <div class="admin-stat-grid">
      <div class="admin-stat"><div class="admin-stat-label">総ユーザー数</div><div class="admin-stat-value">${total.toLocaleString("ja-JP")}</div></div>
      <div class="admin-stat admin-stat-ok"><div class="admin-stat-label">アクティブ</div><div class="admin-stat-value">${activeCount.toLocaleString("ja-JP")}</div></div>
      <div class="admin-stat admin-stat-dim"><div class="admin-stat-label">非アクティブ</div><div class="admin-stat-value">${inactiveCount.toLocaleString("ja-JP")}</div></div>
      <div class="admin-stat admin-stat-warn"><div class="admin-stat-label">凍結</div><div class="admin-stat-value">${frozenCount.toLocaleString("ja-JP")}</div></div>
    </div>`;
  const profTable = profRows.length
    ? `<div class="admin-card-subtitle">プロファイル別 アクティブユーザー (Top 20)</div>` + adminTableHtml(["プロファイル", "アクティブ人数", "割合"], profRows, { compact: true })
    : `<div class="meta" style="padding:8px">プロファイル別取得に失敗しました (権限不足の可能性)</div>`;
  document.getElementById("adminUserStatsResult").innerHTML = summary + profTable;
}

async function doAdminFrozen() {
  if (!state.sid) { panelToast("⚠ 先に Salesforce に接続してください", { kind: "warn" }); return; }
  adminSetCardLoading("adminFrozenResult", "凍結ユーザーを取得中…");
  // v3.131.0 Phase 220: フォールバック付きクエリ (User リレーション解決不可な組織への対応)
  // 段階 1: User.Name 等のフルリレーション取得を試行
  let r = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion,
    soql: `SELECT Id, UserId, User.Name, User.Username, User.Profile.Name, User.IsActive, User.Email FROM UserLogin WHERE IsFrozen = true ORDER BY User.Name LIMIT 500`,
  });
  // 段階 2: 失敗した場合、UserLogin の最小限のみ取得し、User は別 SOQL で引く
  if (!r.ok) {
    console.warn("[admin] UserLogin リレーションクエリ失敗、フォールバック実行:", r.status, r.data);
    const r2 = await runSoql({
      host: state.host, sid: state.sid, apiVersion: state.apiVersion,
      soql: `SELECT Id, UserId FROM UserLogin WHERE IsFrozen = true LIMIT 500`,
    });
    if (!r2.ok) {
      // UserLogin 自体取れない (API バージョン < 39 等)
      const el = document.getElementById("adminFrozenResult");
      if (el) el.innerHTML = `<div class="admin-card-summary admin-card-warn">⚠ UserLogin の取得に失敗しました (HTTP ${r2.status})</div>
        <div class="meta" style="padding:8px;font-size:11px;color:var(--fg-dim)">
          ${escape(String((r2.data && (r2.data[0] && r2.data[0].message)) || r2.data || "詳細不明")).substring(0, 240)}<br><br>
          ※ UserLogin オブジェクトは API バージョン 39.0 以上が必要です。<br>
          ※ または「ユーザーログインを管理」権限が必要な場合があります。<br>
          ※ 代替: Apex タブの「❄️ ユーザー一括凍結」テンプレを利用してください。
        </div>`;
      return;
    }
    const minRecs = (r2.data && r2.data.records) || [];
    if (!minRecs.length) {
      document.getElementById("adminFrozenResult").innerHTML = `<div class="admin-card-summary admin-card-ok">✓ 凍結中のユーザーはいません</div>`;
      adminState.frozen = [];
      return;
    }
    const ids = minRecs.map((m) => `'${m.UserId}'`).join(",");
    const userR = await runSoql({
      host: state.host, sid: state.sid, apiVersion: state.apiVersion,
      soql: `SELECT Id, Name, Username, Email, IsActive, Profile.Name FROM User WHERE Id IN (${ids}) ORDER BY Name`,
    });
    const userMap = new Map();
    if (userR.ok) (userR.data.records || []).forEach((u) => userMap.set(u.Id, u));
    // 合成 records
    r = {
      ok: true,
      data: {
        records: minRecs.map((m) => ({
          Id: m.Id,
          UserId: m.UserId,
          User: userMap.get(m.UserId) ? {
            Name: userMap.get(m.UserId).Name,
            Username: userMap.get(m.UserId).Username,
            Email: userMap.get(m.UserId).Email,
            IsActive: userMap.get(m.UserId).IsActive,
            Profile: userMap.get(m.UserId).Profile,
          } : null,
        })),
      },
    };
  }
  const recs = (r.data && r.data.records) || [];
  // v3.139.0 Phase 229: アクション列に「代理ログイン」を併設 (凍結解除後の動作確認用)
  const rows = recs.map((rec) => {
    const uid = rec.UserId || "";
    const uname = rec.User ? rec.User.Name : "";
    const unfreezeBtn = `<button class="admin-action-unfreeze admin-row-action" data-user-id="${escape(uid)}" data-user-name="${escape(uname)}" title="このユーザーの凍結を解除します (UserLogin.IsFrozen = false)">🔓 凍結解除</button>`;
    const loginAsBtn = `<button class="admin-action-login-as admin-row-action" data-user-id="${escape(uid)}" data-user-name="${escape(uname)}" title="このユーザーとして代理ログインします (新タブで Salesforce にアクセス、要 ModifyAllData / Modify All Users 権限)">👤 代理ログイン</button>`;
    return {
      "氏名": uname,
      "ユーザ名": rec.User ? rec.User.Username : "",
      "メール": rec.User ? rec.User.Email : "",
      "プロファイル": rec.User && rec.User.Profile ? rec.User.Profile.Name : "(未設定)",
      "IsActive": rec.User && rec.User.IsActive ? "○ 有効" : "− 無効",
      "User Id": uid,
      "アクション": { __html: `<div style="display:flex;gap:4px;flex-wrap:wrap">${unfreezeBtn}${loginAsBtn}</div>` },
    };
  });
  adminState.frozen = rows;
  const headers = ["氏名", "ユーザ名", "メール", "プロファイル", "IsActive", "User Id", "アクション"];
  const hint = recs.length
    ? `<div class="admin-card-summary">${recs.length} 件凍結中 — 各行の「🔓 凍結解除」ボタンで個別解除、または Apex タブの「🔓 ユーザー一括凍結解除」テンプレで一括処理</div>`
    : `<div class="admin-card-summary admin-card-ok">✓ 凍結中のユーザーはいません</div>`;
  document.getElementById("adminFrozenResult").innerHTML = hint + adminTableHtml(headers, rows);
}

// 個別ユーザー凍結解除 (UserLogin.IsFrozen = false を REST API で UPDATE)
async function doAdminUnfreezeUser(userId, userName) {
  if (!state.sid || !userId) { panelToast("⚠ User Id が取得できません", { kind: "warn" }); return; }
  // 1. UserLogin の Id を引く (UserLogin の主キーは Id、UserId は外部キー)
  const findR = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion,
    soql: `SELECT Id, IsFrozen FROM UserLogin WHERE UserId = '${userId.replace(/'/g, "")}' LIMIT 1`,
  });
  if (!findR.ok) { panelToast(`❌ UserLogin 取得に失敗: HTTP ${findR.status}`, { kind: "err" }); return; }
  const userLogin = ((findR.data || {}).records || [])[0];
  if (!userLogin) { panelToast(`❌ 該当する UserLogin が見つかりません (UserId=${userId})`, { kind: "err" }); return; }
  if (!userLogin.IsFrozen) { panelToast(`✓ ユーザー「${userName}」は既に凍結解除されています`, { kind: "ok" }); doAdminFrozen(); return; }
  // 2. 確認ダイアログ (v3.203.0 Phase 293: PROD 強化警告)
  const prodHeader = state.isProd
    ? `🚨🚨 本番組織 (PROD) で凍結解除 🚨🚨\n対象組織: ${state.host || "?"}\n\n`
    : "";
  const prodFooter = state.isProd ? "\n\n(セキュリティ影響: 凍結解除後はユーザーが即座にログイン可能になります)" : "";
  const ok = window.confirm(`${prodHeader}ユーザー「${userName}」(UserId=${userId}) の凍結を解除しますか？\n\nUserLogin (${userLogin.Id}) の IsFrozen を false に更新します。\nこの操作は本番組織でも即時反映されます。${prodFooter}`);
  if (!ok) return;
  // 3. PATCH /sobjects/UserLogin/<Id>
  const patchR = await sfFetch({
    host: state.host, sid: state.sid,
    path: `/services/data/v${state.apiVersion}/sobjects/UserLogin/${encodeURIComponent(userLogin.Id)}`,
    method: "PATCH",
    body: JSON.stringify({ IsFrozen: false }),
  });
  if (!patchR.ok) {
    panelToast(`❌ 凍結解除に失敗: HTTP ${patchR.status} ${JSON.stringify(patchR.data || {}).slice(0, 120)}`, { kind: "err" });
    return;
  }
  panelToast(`✓ ユーザー「${userName}」の凍結を解除しました`, { kind: "ok" });
  // 4. 一覧再取得
  doAdminFrozen();
}

// MFA 未設定のアクティブユーザー一覧 (TwoFactorMethodsInfo に登録の無い User を抽出)
async function doAdminListMfaMissing() {
  if (!state.sid) { panelToast("⚠ 先に Salesforce に接続してください", { kind: "warn" }); return; }
  const el = document.getElementById("adminMfaResult");
  if (el) el.innerHTML = `<div class="meta" style="padding:12px"><span class="pill loading">MFA 未設定アクティブユーザーを抽出中…</span></div>`;
  // 1. MFA 設定済 UserId 一覧
  const mfaR = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion,
    soql: `SELECT UserId FROM TwoFactorMethodsInfo LIMIT 50000`,
  });
  if (!mfaR.ok) { adminSetCardError("adminMfaResult", mfaR.status, mfaR.data); return; }
  const mfaUserIds = new Set(((mfaR.data || {}).records || []).map((r) => r.UserId).filter(Boolean));
  // 2. アクティブな内部ユーザー一覧 (UserType=Standard)
  const userR = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion,
    soql: `SELECT Id, Name, Username, Email, Profile.Name, UserType, LastLoginDate FROM User WHERE IsActive = true AND UserType = 'Standard' ORDER BY LastLoginDate DESC NULLS LAST LIMIT 5000`,
  });
  if (!userR.ok) { adminSetCardError("adminMfaResult", userR.status, userR.data); return; }
  const allActive = (userR.data || {}).records || [];
  const missing = allActive.filter((u) => !mfaUserIds.has(u.Id));
  // v3.139.0 Phase 229: 代理ログイン列を追加
  const rows = missing.slice(0, 500).map((u) => ({
    "氏名": u.Name,
    "ユーザ名": u.Username,
    "メール": u.Email || "",
    "プロファイル": u.Profile ? u.Profile.Name : "(未設定)",
    "最終ログイン": u.LastLoginDate ? String(u.LastLoginDate).substring(0, 10) : "未ログイン",
    "アクション": { __html: `<button class="admin-action-login-as admin-row-action" data-user-id="${escape(u.Id || "")}" data-user-name="${escape(u.Name || "")}" title="このユーザーとして代理ログイン (要 ModifyAllUsers 権限) → MFA セットアップ画面に直接案内可">👤 代理ログイン</button>` },
  }));
  const headers = ["氏名", "ユーザ名", "メール", "プロファイル", "最終ログイン", "アクション"];
  const summary = `<div class="admin-card-summary admin-card-warn">⚠ MFA 未設定アクティブ内部ユーザー: <strong>${missing.length}</strong> 名 / 全アクティブ内部 ${allActive.length} 名 (${allActive.length ? ((missing.length / allActive.length) * 100).toFixed(1) : 0}%)</div>`;
  const note = `<div class="meta" style="padding:6px 8px;font-size:11px;color:var(--fg-dim)">※ Salesforce はすべての内部ユーザーに MFA を必須化しています (2022/02 以降)。未設定者は要督促。<br>※ 表示は最大 500 名まで。全件は「📥 サマリ CSV」で出力できます。</div>`;
  document.getElementById("adminMfaResult").innerHTML = summary + note + adminTableHtml(headers, rows);
  // CSV エクスポート用に保存
  adminState.mfaMissing = rows;
}

// v3.145.0 Phase 235: ストレージ大量消費オブジェクト抽出 — ファイル種別別 + 添付サイズ Top
async function doAdminStorageDetail() {
  if (!state.sid) { panelToast("⚠ 先に Salesforce に接続してください", { kind: "warn" }); return; }
  adminShowModal(`📁 ストレージ大量消費の内訳`, `<div style="padding:24px;text-align:center"><span class="pill loading">ストレージ詳細を取得中…</span></div>`);

  // 1. ContentVersion を FileExtension 別に集計 (SUM(ContentSize), COUNT(Id))
  const cvR = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion,
    soql: `SELECT FileExtension, COUNT(Id) cnt, SUM(ContentSize) total FROM ContentVersion WHERE IsLatest = true GROUP BY FileExtension ORDER BY SUM(ContentSize) DESC NULLS LAST LIMIT 100`,
  });
  // 2. 個別 Top 20 大型ファイル (削除候補の特定用)
  const cvTopR = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion,
    soql: `SELECT Id, Title, FileExtension, ContentSize, CreatedBy.Name, CreatedDate, FirstPublishLocationId FROM ContentVersion WHERE IsLatest = true ORDER BY ContentSize DESC NULLS LAST LIMIT 20`,
  });

  if (!cvR.ok) {
    adminUpdateModalBody(`<div class="meta admin-card-err" style="padding:12px">HTTP ${cvR.status}: ${escape(JSON.stringify(cvR.data || {}).slice(0, 200))}<br>※ ContentVersion 集計失敗。「View All Data」権限が必要な可能性があります。</div>`);
    return;
  }

  const extRecs = (cvR.data || {}).records || [];
  const totalBytes = extRecs.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const totalFiles = extRecs.reduce((s, r) => s + (Number(r.cnt) || 0), 0);

  // バイト数を人間可読化
  const fmtSize = (n) => {
    const v = Number(n) || 0;
    if (v < 1024) return `${v.toLocaleString("ja-JP")} B`;
    if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
    if (v < 1024 * 1024 * 1024) return `${(v / 1024 / 1024).toFixed(2)} MB`;
    return `${(v / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  // 拡張子別の業務用語マップ
  const extMap = {
    "pdf": "PDF (Adobe PDF)", "xlsx": "Excel ブック", "xls": "Excel ブック (旧形式)",
    "docx": "Word 文書", "doc": "Word 文書 (旧形式)", "pptx": "PowerPoint", "ppt": "PowerPoint (旧形式)",
    "jpg": "JPEG 画像", "jpeg": "JPEG 画像", "png": "PNG 画像", "gif": "GIF 画像", "bmp": "ビットマップ画像",
    "zip": "ZIP アーカイブ", "rar": "RAR アーカイブ", "7z": "7zip アーカイブ",
    "txt": "テキストファイル", "csv": "CSV", "json": "JSON", "xml": "XML",
    "mp4": "MP4 動画", "mov": "MOV 動画", "mp3": "MP3 音声", "wav": "WAV 音声",
    "html": "HTML", "css": "CSS", "js": "JavaScript", "log": "ログファイル",
  };
  const extRows = extRecs.map((r, i) => {
    const ext = (r.FileExtension || "(拡張子なし)").toLowerCase();
    const total = Number(r.total) || 0;
    return {
      "順位": i + 1,
      "拡張子": ext,
      "種別": extMap[ext] || "(その他)",
      "ファイル数": Number(r.cnt).toLocaleString("ja-JP"),
      "合計サイズ": fmtSize(total),
      "全体に占める割合": totalBytes > 0 ? `${(total / totalBytes * 100).toFixed(1)}%` : "—",
    };
  });

  const topRecs = cvTopR.ok ? (cvTopR.data.records || []) : [];
  const topRows = topRecs.map((r, i) => ({
    "順位": i + 1,
    "タイトル": r.Title || "",
    "拡張子": r.FileExtension || "",
    "サイズ": fmtSize(r.ContentSize),
    "作成者": r.CreatedBy ? r.CreatedBy.Name : "",
    "作成日": r.CreatedDate ? String(r.CreatedDate).substring(0, 10) : "",
    "親レコード Id": r.FirstPublishLocationId || "",
  }));

  const extHeaders = ["順位", "拡張子", "種別", "ファイル数", "合計サイズ", "全体に占める割合"];
  const topHeaders = ["順位", "タイトル", "拡張子", "サイズ", "作成者", "作成日", "親レコード Id"];

  const summary = `<div class="admin-card-summary">📊 ContentVersion 合計: <strong>${totalFiles.toLocaleString("ja-JP")}</strong> ファイル / <strong>${fmtSize(totalBytes)}</strong></div>`;
  const note = `<div class="meta" style="padding:6px 8px;font-size:11px;color:var(--fg-dim);line-height:1.6">
    ※ 「合計サイズ」が大きい拡張子から削減検討。<br>
    ※ <strong>削減方法</strong>: ContentVersion を「最終アクセス日」「親レコード」で絞込み、不要ファイルは Apex タブの DML テンプレで一括削除可能。<br>
    ※ Attachment (旧添付) は別途集計が必要。ContentDocument に統合移行を推奨。<br>
    ※ 取得は最大 100 拡張子・Top 20 個別ファイルまで。
  </div>`;

  const html = summary + note
    + `<div class="admin-card-subtitle" style="margin-top:12px">📦 ファイル種別 (拡張子) 別 合計サイズ</div>`
    + adminTableHtml(extHeaders, extRows, { compact: true })
    + `<div class="admin-card-subtitle" style="margin-top:12px">🔝 個別ファイル サイズ Top 20</div>`
    + adminTableHtml(topHeaders, topRows, { compact: true });
  adminUpdateModalBody(html);
}

// v3.140.0 Phase 230: 未活動ユーザー抽出 (N 日以上ログインなしの IsActive ユーザー)
// 業務シナリオ: 退職予定者特定 / 休職者の凍結候補 / ライセンス棚卸し
async function doAdminListInactiveUsers(days = 30) {
  if (!state.sid) { panelToast("⚠ 先に Salesforce に接続してください", { kind: "warn" }); return; }
  // モーダル即表示
  adminShowModal(`⏰ ${days} 日以上ログインなしのアクティブユーザー`, `<div style="padding:24px;text-align:center"><span class="pill loading">ユーザーを抽出中…</span></div>`);
  // SOQL: LastLoginDate < LAST_N_DAYS:N AND IsActive = true (LastLoginDate が null = 一度もログインしていないユーザーも対象)
  const soql = `SELECT Id, Name, Username, Email, Profile.Name, UserType, LastLoginDate, CreatedDate FROM User WHERE IsActive = true AND (LastLoginDate = null OR LastLoginDate < LAST_N_DAYS:${days}) ORDER BY LastLoginDate ASC NULLS FIRST LIMIT 1000`;
  const r = await runSoql({ host: state.host, sid: state.sid, apiVersion: state.apiVersion, soql });
  if (!r.ok) {
    adminUpdateModalBody(`<div class="meta admin-card-err" style="padding:12px">HTTP ${r.status}: ${escape(JSON.stringify(r.data || {}).slice(0, 240))}</div>`);
    return;
  }
  const recs = (r.data || {}).records || [];
  const neverLoggedIn = recs.filter((u) => !u.LastLoginDate).length;
  const rows = recs.map((u) => {
    const lastLogin = u.LastLoginDate ? String(u.LastLoginDate).substring(0, 10) : "🚨 未ログイン";
    const created = u.CreatedDate ? String(u.CreatedDate).substring(0, 10) : "";
    const elapsedDays = u.LastLoginDate ? Math.floor((Date.now() - new Date(u.LastLoginDate).getTime()) / 86400000) : null;
    const elapsedHtml = elapsedDays != null ? `${elapsedDays} 日前` : "—";
    return {
      "氏名": u.Name,
      "ユーザ名": u.Username,
      "メール": u.Email || "",
      "プロファイル": u.Profile ? u.Profile.Name : "(未設定)",
      "種別": u.UserType || "",
      "最終ログイン": lastLogin,
      "経過": elapsedHtml,
      "作成日": created,
      "アクション": { __html: `<button class="admin-action-login-as admin-row-action" data-user-id="${escape(u.Id || "")}" data-user-name="${escape(u.Name || "")}" title="このユーザーとして代理ログインし、状況確認">👤 代理ログイン</button>` },
    };
  });
  const headers = ["氏名", "ユーザ名", "メール", "プロファイル", "種別", "最終ログイン", "経過", "作成日", "アクション"];
  const summary = `<div class="admin-card-summary admin-card-warn">⏰ ${days} 日以上ログインなしのアクティブユーザー: <strong>${recs.length}</strong> 名${neverLoggedIn > 0 ? ` (うち 🚨 未ログイン ${neverLoggedIn} 名)` : ""}</div>`;
  const note = `<div class="meta" style="padding:6px 8px;font-size:11px;color:var(--fg-dim);line-height:1.6">
    ※ 「経過」列で長期未活動を即特定。<strong>業務シナリオ</strong>: 退職予定者の凍結候補 / 休職者の整理 / ライセンス棚卸し。<br>
    ※ 「👤 代理ログイン」で個別動作確認可能。 一括凍結は Apex タブの「❄️ ユーザー一括凍結」テンプレを利用してください。<br>
    ※ 最大 1,000 名まで表示 (それ以上は SOQL 直接実行を検討)。
  </div>`;
  adminUpdateModalBody(summary + note + adminTableHtml(headers, rows, { compact: true }));
}

// 特定ライセンスの使用ユーザー一覧 — モーダルで中央表示 (Phase 220 ユーザー要望対応)
async function doAdminShowLicenseUsers(apiName) {
  if (!state.sid || !apiName) return;
  // モーダルを即表示 (loading 状態)
  adminShowModal(`📊 ${apiName} ライセンス使用ユーザー`, `<div style="padding:24px;text-align:center"><span class="pill loading">ユーザーを抽出中…</span></div>`);
  const r = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion,
    soql: `SELECT Id, Name, Username, IsActive, Profile.Name, LastLoginDate, Email FROM User WHERE Profile.UserLicense.Name = '${apiName.replace(/'/g, "")}' AND IsActive = true ORDER BY LastLoginDate DESC NULLS LAST LIMIT 1000`,
  });
  if (!r.ok) {
    adminUpdateModalBody(`<div class="meta admin-card-err" style="padding:12px"><strong>HTTP ${r.status}</strong> 抽出に失敗しました</div>`);
    return;
  }
  const recs = (r.data || {}).records || [];
  // v3.139.0 Phase 229: モーダル内のユーザー行にも代理ログインボタン
  const rows = recs.map((u) => ({
    "氏名": u.Name,
    "ユーザ名": u.Username,
    "メール": u.Email || "",
    "プロファイル": u.Profile ? u.Profile.Name : "",
    "最終ログイン": u.LastLoginDate ? String(u.LastLoginDate).substring(0, 10) : "未ログイン",
    "状態": u.IsActive ? "○ 有効" : "− 無効",
    "アクション": { __html: `<button class="admin-action-login-as admin-row-action" data-user-id="${escape(u.Id || "")}" data-user-name="${escape(u.Name || "")}" title="このユーザーとして代理ログイン (新タブ)">👤 代理ログイン</button>` },
  }));
  const headers = ["氏名", "ユーザ名", "メール", "プロファイル", "最終ログイン", "状態", "アクション"];
  const summary = `<div class="admin-card-summary">合計 <strong>${recs.length}</strong> 名 (アクティブのみ・最大 1000 件)</div>`;
  adminUpdateModalBody(summary + adminTableHtml(headers, rows, { compact: true }));
}

// ====== 共通モーダル (Phase 220 — Admin 詳細表示用) ======
function adminShowModal(title, bodyHtml) {
  // 既存モーダル削除
  const existing = document.getElementById("adminModalOverlay");
  if (existing) existing.remove();
  // v3.141.0 Phase 231 (a11y): モーダル表示直前のフォーカス要素を保存し、閉じた時に戻す
  const prevFocus = document.activeElement;
  const overlay = document.createElement("div");
  overlay.id = "adminModalOverlay";
  overlay.className = "admin-modal-overlay";
  overlay.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="adminModalTitle" tabindex="-1">
      <div class="admin-modal-hdr">
        <h3 id="adminModalTitle" class="admin-modal-title">${escape(title)}</h3>
        <div class="admin-modal-actions">
          <button class="admin-modal-md" title="表を Markdown でクリップボードコピー" aria-label="表を Markdown でコピー">📝 MD</button>
          <button class="admin-modal-close" title="閉じる (Esc)" aria-label="モーダルを閉じる">✕</button>
        </div>
      </div>
      <div class="admin-modal-body">${bodyHtml}</div>
    </div>`;
  document.body.appendChild(overlay);
  // v3.181.0 Phase 271: モーダル本体の table を Markdown でコピー (使用者を見る/ストレージ詳細/未活動ユーザー等)
  const mdBtn = overlay.querySelector(".admin-modal-md");
  if (mdBtn) {
    mdBtn.addEventListener("click", () => copyAdminModalAsMd(overlay, title));
  }
  // v3.141.0 Phase 231 (a11y): 初期フォーカスを ✕ ボタンに (Esc で閉じられる旨も title で示す)
  const closeBtn = overlay.querySelector(".admin-modal-close");
  if (closeBtn) {
    // 短い遅延でフォーカス (DOM 描画完了後)
    setTimeout(() => closeBtn.focus(), 50);
  }
  // 閉じる
  const close = () => {
    overlay.remove();
    // フォーカスを元に戻す (a11y 標準パターン)
    if (prevFocus && typeof prevFocus.focus === "function") {
      try { prevFocus.focus(); } catch {}
    }
  };
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  // Esc キー
  const onKey = (e) => { if (e.key === "Escape") { close(); document.removeEventListener("keydown", onKey); } };
  document.addEventListener("keydown", onKey);
}

function adminUpdateModalBody(html) {
  const overlay = document.getElementById("adminModalOverlay");
  if (!overlay) return;
  const body = overlay.querySelector(".admin-modal-body");
  if (body) body.innerHTML = html;
}

async function doAdminMfa() {
  if (!state.sid) { panelToast("⚠ 先に Salesforce に接続してください", { kind: "warn" }); return; }
  adminSetCardLoading("adminMfaResult", "MFA 設定状況を取得中…");
  // v3.131.0 Phase 220: フォールバック付きクエリ
  let r = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion,
    soql: `SELECT UserId, User.Name, User.Username, User.Profile.Name, MethodDefinition FROM TwoFactorMethodsInfo ORDER BY User.Name LIMIT 500`,
  });
  if (!r.ok) {
    // フォールバック 1: User リレーション無しで再試行
    const r2 = await runSoql({
      host: state.host, sid: state.sid, apiVersion: state.apiVersion,
      soql: `SELECT UserId, MethodDefinition FROM TwoFactorMethodsInfo LIMIT 500`,
    });
    if (r2.ok) {
      // User を別途引く
      const userIds = [...new Set((r2.data.records || []).map((rec) => rec.UserId).filter(Boolean))];
      const userMap = new Map();
      if (userIds.length) {
        const ids = userIds.map((i) => `'${i}'`).join(",");
        const userR = await runSoql({
          host: state.host, sid: state.sid, apiVersion: state.apiVersion,
          soql: `SELECT Id, Name, Username, Profile.Name FROM User WHERE Id IN (${ids})`,
        });
        if (userR.ok) (userR.data.records || []).forEach((u) => userMap.set(u.Id, u));
      }
      r = {
        ok: true,
        data: {
          records: (r2.data.records || []).map((rec) => ({
            UserId: rec.UserId,
            MethodDefinition: rec.MethodDefinition,
            User: userMap.get(rec.UserId) ? {
              Name: userMap.get(rec.UserId).Name,
              Username: userMap.get(rec.UserId).Username,
              Profile: userMap.get(rec.UserId).Profile,
            } : null,
          })),
        },
      };
    } else {
      // 両方失敗 → 詳細説明
      const el = document.getElementById("adminMfaResult");
      const errBody = r.data && r.data[0] && r.data[0].message ? r.data[0].message : (typeof r.data === "string" ? r.data : JSON.stringify(r.data || {}));
      if (el) el.innerHTML = `<div class="admin-card-summary admin-card-warn">⚠ TwoFactorMethodsInfo を取得できませんでした (HTTP ${r.status})</div>
        <div class="meta" style="padding:8px;font-size:11px;color:var(--fg-dim);line-height:1.6">
          ${escape(String(errBody)).substring(0, 240)}<br><br>
          <strong>原因の可能性:</strong><br>
          • TwoFactorMethodsInfo は Identity Verification 機能を有効化した組織のみ参照可能 (Spring '20 以降)<br>
          • API バージョン 47.0 未満では存在しない<br>
          • 「Manage Multi-Factor Authentication」権限が必要<br><br>
          <strong>代替手段:</strong><br>
          • Setup → Identity → Identity Verification History でユーザー別 MFA 利用履歴確認<br>
          • SOQL タブ「🛡️ MFA 設定状況」テンプレを Tooling API で実行
        </div>`;
      return;
    }
  }
  const recs = (r.data && r.data.records) || [];
  // 方式別集計
  const byMethod = {};
  const userMfa = new Map();
  for (const rec of recs) {
    const m = rec.MethodDefinition || "(未定義)";
    byMethod[m] = (byMethod[m] || 0) + 1;
    if (rec.UserId) {
      if (!userMfa.has(rec.UserId)) userMfa.set(rec.UserId, { name: rec.User ? rec.User.Name : "", username: rec.User ? rec.User.Username : "", profile: rec.User && rec.User.Profile ? rec.User.Profile.Name : "", methods: [] });
      userMfa.get(rec.UserId).methods.push(m);
    }
  }
  const methodRows = Object.entries(byMethod).map(([m, cnt]) => ({
    "方式": m,
    "件数": Number(cnt).toLocaleString("ja-JP"),
    "説明": m === "TOTP" ? "Time-based OTP (Google Authenticator 等)"
          : m === "SalesforceAuthenticator" ? "Salesforce Authenticator アプリ"
          : m === "U2F" || m === "WebAuthn" ? "セキュリティキー (FIDO)"
          : m === "OneTimePasswordSms" || m === "SMSCode" ? "SMS ワンタイムパスワード"
          : m === "OneTimePasswordEmail" || m === "EmailCode" ? "メール ワンタイムパスワード"
          : "—",
  })).sort((a, b) => Number(b["件数"].replace(/,/g, "")) - Number(a["件数"].replace(/,/g, "")));
  const userRows = Array.from(userMfa.values()).slice(0, 100).map((u) => ({
    "氏名": u.name,
    "ユーザ名": u.username,
    "プロファイル": u.profile || "(未設定)",
    "登録方式": u.methods.join(", "),
  }));
  adminState.mfa = { byMethod, userRows };
  const summary = `<div class="admin-card-summary">MFA 設定済 <strong>${userMfa.size}</strong> ユーザー / 方式 <strong>${Object.keys(byMethod).length}</strong> 種類 / 登録レコード総数 ${recs.length} 件</div>`;
  const methodSection = `<div class="admin-card-subtitle">方式別集計</div>` + adminTableHtml(["方式", "件数", "説明"], methodRows, { compact: true });
  const userSection = userRows.length
    ? `<div class="admin-card-subtitle" style="margin-top:8px">ユーザー別 MFA 設定 (先頭 100 名)</div>` + adminTableHtml(["氏名", "ユーザ名", "プロファイル", "登録方式"], userRows, { compact: true })
    : "";
  document.getElementById("adminMfaResult").innerHTML = summary + methodSection + userSection;
}

async function doAdminPackages() {
  if (!state.sid) { panelToast("⚠ 先に Salesforce に接続してください", { kind: "warn" }); return; }
  adminSetCardLoading("adminPackagesResult", "InstalledSubscriberPackage (Tooling) を取得中…");
  const r = await runSoql({
    host: state.host, sid: state.sid, apiVersion: state.apiVersion, tooling: true,
    soql: `SELECT SubscriberPackage.Name, SubscriberPackage.NamespacePrefix, SubscriberPackageVersion.Name, SubscriberPackageVersion.MajorVersion, SubscriberPackageVersion.MinorVersion, SubscriberPackageVersion.PatchVersion, SubscriberPackageVersion.IsBeta, SubscriberPackageVersion.IsManaged FROM InstalledSubscriberPackage ORDER BY SubscriberPackage.Name LIMIT 500`,
  });
  if (!r.ok) { adminSetCardError("adminPackagesResult", r.status, r.data); return; }
  const recs = (r.data && r.data.records) || [];
  const rows = recs.map((rec) => {
    const pkg = rec.SubscriberPackage || {};
    const ver = rec.SubscriberPackageVersion || {};
    const verStr = [ver.MajorVersion, ver.MinorVersion, ver.PatchVersion].filter((n) => n != null).join(".");
    return {
      "パッケージ名": pkg.Name || "",
      "名前空間": pkg.NamespacePrefix || "(なし)",
      "バージョン名": ver.Name || "",
      "バージョン番号": verStr || "—",
      "形態": ver.IsManaged ? "管理パッケージ" : "非管理",
      "Beta": ver.IsBeta ? "○ Beta" : "",
    };
  });
  adminState.packages = rows;
  const headers = ["パッケージ名", "名前空間", "バージョン名", "バージョン番号", "形態", "Beta"];
  document.getElementById("adminPackagesResult").innerHTML =
    `<div class="admin-card-summary">合計 ${recs.length} 件 / 管理 ${rows.filter((r) => r["形態"] === "管理パッケージ").length} 件 / Beta ${rows.filter((r) => r["Beta"]).length} 件</div>` +
    adminTableHtml(headers, rows);
}

async function doAdminLoadAll() {
  if (!state.sid) { panelToast("⚠ 先に Salesforce に接続してください", { kind: "warn" }); return; }
  const meta = document.getElementById("adminMeta");
  if (meta) meta.innerHTML = `<span class="pill loading">7 カードを順次取得中…</span>`;
  const t0 = performance.now();
  // 順次実行 (並列だと UserLogin の参照などで 401 になりやすい組織あり)
  await doAdminOrgInfo();
  await doAdminLicenses();
  await doAdminPermSetLicenses();
  await doAdminUserStats();
  await doAdminFrozen();
  await doAdminMfa();
  await doAdminPackages();
  const dt = Math.round(performance.now() - t0);
  // v3.139.0 Phase 229: 最終取得時刻を保存・表示
  adminState.lastLoadedAt = new Date();
  const timeStr = adminState.lastLoadedAt.toLocaleString("ja-JP");
  if (meta) meta.innerHTML = `<span class="pill ok">✓ すべて取得完了</span> <span class="meta">${dt} ms / 取得時刻: ${escape(timeStr)}</span> <button class="admin-row-action" id="btnAdminReload" title="6 カードを再取得します" style="margin-left:6px">🔄 再取得</button>`;
  // 再取得ボタンに動的にイベント
  const reload = document.getElementById("btnAdminReload");
  if (reload) reload.addEventListener("click", () => doAdminLoadAll());
  panelToast(`✓ ユーザー・ライセンス管理 7 カードを取得しました (${dt} ms)`, { kind: "ok" });
}

// v3.168.0 Phase 258: admin カード別 個別 CSV エクスポート
function adminExportCardCsv(cardKey) {
  const cardDef = {
    licenses: {
      data: adminState.licenses,
      headers: ["ライセンス", "API 名", "総数", "使用中", "残り", "使用率", "状態"],
      label: "ユーザーライセンス",
    },
    permsetLicenses: {
      data: adminState.permsetLicenses,
      headers: ["ライセンス", "API 名", "総数", "使用中", "残り", "使用率", "有効期限", "状態"],
      label: "権限セットライセンス",
    },
    frozen: {
      data: adminState.frozen,
      headers: ["氏名", "ユーザ名", "メール", "プロファイル", "IsActive", "User Id"],
      label: "凍結ユーザー",
    },
    packages: {
      data: adminState.packages,
      headers: ["パッケージ名", "名前空間", "バージョン名", "バージョン番号", "形態", "Beta"],
      label: "インストールパッケージ",
    },
  };
  const def = cardDef[cardKey];
  if (!def || !def.data || !def.data.length) {
    panelToast(`📭 ${def ? def.label : cardKey} のデータがまだ取得されていません — 先に「取得」ボタンを押してください`, { kind: "warn" });
    return;
  }
  // CSV セル整形 (__html セル除外、Excel BOM 付与)
  const escCsv = (v) => {
    if (v && typeof v === "object" && v.__html) {
      const m = v.__html.match(/admin-bar-label">([^<]+)</);
      v = m ? m[1] : String(v.__html).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    }
    const s = v == null ? "" : String(v);
    return /[",\n\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [def.headers.map(escCsv).join(",")];
  for (const r of def.data) lines.push(def.headers.map((h) => escCsv(r[h])).join(","));
  const csv = "﻿" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  const ts = new Date().toISOString().substring(0, 19).replace(/[-T:]/g, "");
  a.href = URL.createObjectURL(blob);
  a.download = `devtoolsnext-admin-${cardKey}-${ts}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
  panelToast(`📥 ${def.label} CSV をダウンロードしました (${def.data.length} 件)`, { kind: "ok" });
}

function adminExportCsv() {
  // 取得済みカードのみ CSV に集約
  const sections = [];
  if (adminState.licenses) sections.push({ title: "📊 ユーザーライセンス", headers: ["ライセンス", "API 名", "総数", "使用中", "残り", "使用率", "状態"], rows: adminState.licenses });
  if (adminState.permsetLicenses) sections.push({ title: "🔑 権限セットライセンス", headers: ["ライセンス", "API 名", "総数", "使用中", "残り", "使用率", "有効期限", "状態"], rows: adminState.permsetLicenses });
  if (adminState.userStats) sections.push({ title: "👥 ユーザー集計", headers: ["プロファイル", "アクティブ人数", "割合"], rows: adminState.userStats.profRows });
  if (adminState.frozen) sections.push({ title: "❄️ 凍結ユーザー", headers: ["氏名", "ユーザ名", "メール", "プロファイル", "IsActive", "User Id"], rows: adminState.frozen });
  if (adminState.mfa) sections.push({ title: "🛡️ MFA 方式別", headers: ["方式", "件数", "説明"], rows: Object.entries(adminState.mfa.byMethod).map(([m, c]) => ({ "方式": m, "件数": c, "説明": "" })) });
  if (adminState.packages) sections.push({ title: "🔌 インストールパッケージ", headers: ["パッケージ名", "名前空間", "バージョン名", "バージョン番号", "形態", "Beta"], rows: adminState.packages });
  if (!sections.length) { panelToast("📭 取得済みデータがありません。先に「▶ すべて取得」を実行してください", { kind: "warn" }); return; }
  const escCsv = (v) => {
    if (v && typeof v === "object" && v.__html) {
      // 使用率セル: HTML 内の文字列ラベルだけ抽出
      const m = v.__html.match(/admin-bar-label">([^<]+)</);
      v = m ? m[1] : "";
    }
    const s = v == null ? "" : String(v);
    return /[",\n\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [];
  lines.push(`# DevToolsNext ユーザー・ライセンス管理 サマリ`);
  lines.push(`# 生成日時: ${new Date().toLocaleString("ja-JP")}`);
  lines.push(`# 組織: ${state.host || ""}`);
  for (const s of sections) {
    lines.push("");
    lines.push(`# ${s.title}`);
    lines.push(s.headers.map(escCsv).join(","));
    for (const r of s.rows) lines.push(s.headers.map((h) => escCsv(r[h])).join(","));
  }
  const csv = "﻿" + lines.join("\n"); // BOM (Excel 文字化け防止)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  const ts = new Date().toISOString().substring(0, 19).replace(/[-T:]/g, "");
  a.href = URL.createObjectURL(blob);
  a.download = `devtoolsnext-admin-summary-${ts}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
  panelToast(`📥 サマリ CSV をダウンロードしました (${sections.length} セクション)`, { kind: "ok" });
}
