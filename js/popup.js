// popup.js – tab routing, SF info loading, SOQL/REST/ID utilities.

// v3.87.0: Phase 177 — dead code 削除 (sfFetch / to18CharId / lookupPrefix / recordsToCsv 撤去)
// これらは popup の SOQL/ID 解析/API タブで使われていたが v2.78.0 と v2.80.0 で UI が撤去され dead 化していた
import {
  getActiveSfTab, getSessionId, parseOrgIdFromSid, toApiHost,
  runSoql, getUserInfo,
} from "./sf-api.js";

const state = {
  tab: null,
  host: null,
  apiHost: null,
  sid: null,
  orgId: null,
  userId: null,
  userInfo: null,
  apiVersion: "62.0",
  lastRecords: null,
};

// モジュールスクリプトは defer で読まれる → DOMContentLoaded を取り逃すケースがあるため両対応
// v1.99.0: queueMicrotask で init を遅延 → モジュール body 全 const 初期化完了後に走らせ TDZ 回避
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => queueMicrotask(init));
} else {
  queueMicrotask(() => init().catch((e) => {
    const s = document.getElementById("statusMsg");
    if (s) s.textContent = "初期化エラー: " + String(e && e.message || e);
    console.error("popup init error:", e);
  }));
}

async function init() {
  try {
    bindTabs();
    bindEvents();
    renderLinks();
    await refreshSession();
    await renderLoginAsHistory();
  } catch (e) {
    console.error("popup init error:", e);
    const s = document.getElementById("statusMsg");
    if (s) s.textContent = "❌ 初期化失敗: " + String(e && e.message || e);
  }
}

// v3.85.0: Phase 175 — ⚙ 設定ダイアログを部分クリアに進化 (履歴 / draft / UI 状態 / 保存 / 全削除 を選択可能)
// Phase 174 では all-or-nothing しか選べなかったため、業務で「履歴だけ消したい」「draft は残したい」等のニーズに対応できなかった
// カテゴリ別に粒度を持たせ、目的に応じた最小限のクリアを可能にする
// v3.86.0: Phase 176 — 見えない不具合修正: RESET_CATEGORIES に Login as User 履歴 2 種を追加
// Phase 175 リリース時点で sfdtLoginAsHistory / sfdtLoginAsRecentUsers が「履歴系」カテゴリに含まれず、
// 部分クリア「履歴系」を選んでも Login as User の検索履歴・最近ログインユーザが消えない不具合があった
const RESET_CATEGORIES = {
  history: {
    label: "履歴系 (SOQL/Apex/REST 履歴・Inspector 履歴・設計書「対象」履歴・Login as User 履歴)",
    keys: ["sfdtRecentSoql", "sfdtRecentApex", "sfdtRecentRest", "sfdtInspectHistory", "sfdtDesignObjHist", "sfdtLoginAsHistory", "sfdtLoginAsRecentUsers"],
  },
  drafts: {
    label: "draft 系 (SOQL/Apex/REST body の入力中バックアップ)",
    keys: ["sfdtSoqlDraft", "sfdtApexDraft", "sfdtRestBodyDraft"],
  },
  uistate: {
    label: "UI 状態系 (Limits ピン・各種チェック・サイドバー折りたたみ・最後の view 等)",
    keys: ["sfdtLastView", "sfdtLimitsPinned", "sfdtLimitsSortState", "sfdtMdType", "sfdtSoqlTooling", "sfdtApexFetchLog", "sfdtPopupLinksCollapsed", "sfdtNavCollapsedCats", "sideCollapsed", "whatsNewCollapsed"],
  },
  saved: {
    label: "保存系 (savedQueries / savedApex — 手動命名保存した SOQL・Apex)",
    keys: ["savedQueries", "savedApex"],
  },
};

// v3.88.0: Phase 178 — エクスポート (JSON ダウンロード) + インポート (JSON 読込) で別 PC への設定移行を可能に
const SETTINGS_FORMAT = "DevToolsNext-settings-v1";

function ownedKeysFrom(all) {
  const OWNED_NON_SFDT = new Set(["savedQueries", "savedApex", "sideCollapsed", "whatsNewCollapsed", "soqlHistory"]);
  return Object.keys(all).filter((k) => k.startsWith("sfdt") || OWNED_NON_SFDT.has(k));
}

async function exportSettings() {
  try {
    const all = await chrome.storage.local.get(null);
    const keys = ownedKeysFrom(all);
    if (!keys.length) {
      toast("📭 エクスポートする設定がありません (保存データが空)", { kind: "warn" });
      return;
    }
    const data = {};
    for (const k of keys) data[k] = all[k];
    const payload = {
      _format: SETTINGS_FORMAT,
      _exportedAt: new Date().toISOString(),
      _version: chrome.runtime.getManifest().version,
      _keyCount: keys.length,
      data,
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const filename = `devtoolsnext-settings-${stamp}.json`;
    // popup 内で <a download> クリック — chrome.downloads 権限不要
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    toast(`✓ ${keys.length} キーを ${filename} にエクスポートしました`, { kind: "ok" });
  } catch (e) {
    toast(`❌ エクスポートに失敗しました: ${e.message || e}`, { kind: "err" });
  }
}

async function importSettings() {
  try {
    // 動的に <input type="file"> を生成 (popup.html を汚さない)
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    document.body.appendChild(input);
    const file = await new Promise((resolve) => {
      input.addEventListener("change", () => resolve(input.files && input.files[0]), { once: true });
      input.click();
    });
    input.remove();
    if (!file) { toast("🚫 ファイルが選択されませんでした", { kind: "warn" }); return; }
    const text = await file.text();
    let payload;
    try { payload = JSON.parse(text); }
    catch (parseErr) { toast(`❌ JSON 解析に失敗しました: ${parseErr.message}`, { kind: "err" }); return; }
    if (!payload || payload._format !== SETTINGS_FORMAT) {
      toast(`❌ 不正なファイル形式です (_format が "${SETTINGS_FORMAT}" ではありません)`, { kind: "err" });
      return;
    }
    if (!payload.data || typeof payload.data !== "object") {
      toast(`❌ data フィールドが欠落しています`, { kind: "err" });
      return;
    }
    const importKeys = Object.keys(payload.data);
    // 拡張機能所有キーのみ許可 (任意キーの上書きを防止)
    const OWNED_NON_SFDT = new Set(["savedQueries", "savedApex", "sideCollapsed", "whatsNewCollapsed", "soqlHistory"]);
    const allowed = importKeys.filter((k) => k.startsWith("sfdt") || OWNED_NON_SFDT.has(k));
    const rejected = importKeys.filter((k) => !(k.startsWith("sfdt") || OWNED_NON_SFDT.has(k)));
    if (!allowed.length) {
      toast(`❌ 取込可能なキーがありません (DevToolsNext が所有しないキーのみ)`, { kind: "err" });
      return;
    }
    const confirmed = window.confirm(
      `📥 設定インポート確認\n\n` +
      `ファイル: ${file.name}\n` +
      `エクスポート時刻: ${payload._exportedAt || "不明"}\n` +
      `エクスポート時バージョン: ${payload._version || "不明"}\n` +
      `取込キー数: ${allowed.length} 件\n` +
      (rejected.length ? `⚠ 拒否キー (拡張機能所有外): ${rejected.length} 件\n` : "") +
      `\n⚠ 既存の同名キーは上書きされます。続行しますか?`
    );
    if (!confirmed) { toast("🚫 インポートをキャンセルしました", { kind: "warn" }); return; }
    const toSet = {};
    for (const k of allowed) toSet[k] = payload.data[k];
    await chrome.storage.local.set(toSet);
    toast(`✓ ${allowed.length} キーをインポートしました${rejected.length ? ` (${rejected.length} キー拒否)` : ""}`, { kind: "ok" });
  } catch (e) {
    toast(`❌ インポートに失敗しました: ${e.message || e}`, { kind: "err" });
  }
}

async function showSettingsDialog() {
  try {
    const all = await chrome.storage.local.get(null);
    const sfdtKeys = ownedKeysFrom(all);
    let bytes = 0;
    for (const k of sfdtKeys) {
      try { bytes += new Blob([JSON.stringify(all[k] ?? null)]).size; } catch {}
    }
    const sizeLabel = bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;

    const countFor = (cat) => RESET_CATEGORIES[cat].keys.filter((k) => k in all).length;
    const choice = window.prompt(
      `🛠 DevToolsNext 設定\n\n` +
      `現在の保存データ: ${sfdtKeys.length} キー / 約 ${sizeLabel}\n\n` +
      `操作を番号で選んでください:\n\n` +
      `■ クリア\n` +
      `1. 履歴系 (${countFor("history")} キー保存中) — ${RESET_CATEGORIES.history.label}\n` +
      `2. draft 系 (${countFor("drafts")} キー保存中) — ${RESET_CATEGORIES.drafts.label}\n` +
      `3. UI 状態系 (${countFor("uistate")} キー保存中) — ${RESET_CATEGORIES.uistate.label}\n` +
      `4. 保存系 (${countFor("saved")} キー保存中) — ${RESET_CATEGORIES.saved.label}\n` +
      `5. 全削除 (${sfdtKeys.length} キーすべて、約 ${sizeLabel})\n` +
      `■ 移行 (v3.88.0 新機能)\n` +
      `6. 📤 エクスポート (現在の設定を JSON ファイルでダウンロード — 別 PC への移行用)\n` +
      `7. 📥 インポート (JSON ファイルから設定を取込 — 既存キーは上書き)\n` +
      `0. キャンセル\n\n` +
      `番号 (0-7) を入力してください:`,
      "5"
    );
    if (choice === null || choice.trim() === "" || choice.trim() === "0") {
      toast("🚫 キャンセルしました (データはそのまま)", { kind: "warn" });
      return;
    }
    const num = parseInt(choice.trim(), 10);
    if (num === 6) { await exportSettings(); return; }
    if (num === 7) { await importSettings(); return; }

    let targetKeys, scopeLabel;
    if (num === 5) {
      targetKeys = sfdtKeys;
      scopeLabel = `全削除 (${sfdtKeys.length} キー、約 ${sizeLabel})`;
    } else if (num >= 1 && num <= 4) {
      const cat = ["history", "drafts", "uistate", "saved"][num - 1];
      targetKeys = RESET_CATEGORIES[cat].keys.filter((k) => k in all);
      scopeLabel = RESET_CATEGORIES[cat].label;
    } else {
      toast(`⚠ 不正な番号です: "${choice}" (0-7 で入力してください)`, { kind: "warn" });
      return;
    }
    if (targetKeys.length === 0) {
      toast(`✓ ${scopeLabel} はすでに空です (クリアするキーがありません)`, { kind: "ok" });
      return;
    }
    const confirmed = window.confirm(
      `⚠ 以下をクリアします (取り消せません):\n\n` +
      `${scopeLabel}\n` +
      `対象キー: ${targetKeys.length} 件\n` +
      `(${targetKeys.join(", ")})\n\n` +
      `💡 不安な場合は先に「6. エクスポート」でバックアップを取ってください\n\n` +
      `続行しますか?`
    );
    if (!confirmed) {
      toast("🚫 キャンセルしました (データはそのまま)", { kind: "warn" });
      return;
    }
    await chrome.storage.local.remove(targetKeys);
    toast(`✓ ${targetKeys.length} キーをクリアしました — ${scopeLabel}`, { kind: "ok" });
  } catch (e) {
    toast(`❌ 設定操作に失敗しました: ${e.message || e}`, { kind: "err" });
  }
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".panel").forEach((p) => p.classList.add("hidden"));
      document.getElementById("panel-" + btn.dataset.tab).classList.remove("hidden");
    });
  });
}

function bindEvents() {
  document.getElementById("btnRefresh").addEventListener("click", refreshSession);
  document.getElementById("btnSettings").addEventListener("click", showSettingsDialog);
  // バージョン表示 + 自動アップデート
  const verEl = document.getElementById("versionBadge");
  if (verEl) {
    const v = chrome.runtime.getManifest().version;
    verEl.textContent = "v" + v;
  }
  const btnUpd = document.getElementById("btnCheckUpdate");
  if (btnUpd) {
    btnUpd.addEventListener("click", async () => {
      toast("⏳ アップデートを確認しています…", { kind: "loading" });
      chrome.runtime.sendMessage({ type: "sfdt:checkUpdate" }, (res) => {
        if (res && res.ok) toast(`✓ v${res.version} を確認しました (新しいバージョンがあれば自動で適用されます)`, { kind: "ok" });
        else toast("❌ アップデートの確認に失敗しました", { kind: "err" });
      });
    });
  }
  const btnOpenTool = document.getElementById("btnOpenTool");
  if (btnOpenTool) {
    btnOpenTool.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("html/tool.html") });
      window.close();
    });
  }
  // v3.143.0 Phase 233: 主要ビューへの直接導線 (URL クエリ ?view=xxx で panel.js init が拾う)
  const openToolView = (view) => {
    chrome.tabs.create({ url: chrome.runtime.getURL(`html/tool.html?view=${encodeURIComponent(view)}`) });
    window.close();
  };
  const btnOpenAdmin = document.getElementById("btnOpenAdmin");
  if (btnOpenAdmin) btnOpenAdmin.addEventListener("click", () => openToolView("admin"));
  const btnOpenSearch = document.getElementById("btnOpenSearch");
  if (btnOpenSearch) btnOpenSearch.addEventListener("click", () => openToolView("search"));
  // v3.187.0 Phase 277: 📐 オブジェクト構造 (describe) を全画面で開く — 4 入口統一達成 (popup ⇄ mini-panel ⇄ panel ⇄ tool)
  const btnOpenDescribe = document.getElementById("btnOpenDescribe");
  if (btnOpenDescribe) btnOpenDescribe.addEventListener("click", () => openToolView("describe"));
  // v3.221.0 Phase 311: 📊 使用状況 (Limits) を全画面で開く — 管理者の主要ニーズ「組織制限を一目で確認」
  const btnOpenLimits = document.getElementById("btnOpenLimits");
  if (btnOpenLimits) btnOpenLimits.addEventListener("click", () => openToolView("limits"));
  // v3.232.0 Phase 322: 🟧 Apex 実行を全画面で開く — 開発者の主要ニーズ「匿名 Apex でデータ操作・調査」
  const btnOpenApex = document.getElementById("btnOpenApex");
  if (btnOpenApex) btnOpenApex.addEventListener("click", () => openToolView("apex"));
  // v3.238.0 Phase 328: 🔐 ログイン履歴を全画面で開く — セキュリティ担当者向け 6 ボタン目
  const btnOpenLogin = document.getElementById("btnOpenLogin");
  if (btnOpenLogin) btnOpenLogin.addEventListener("click", () => openToolView("login"));

  document.querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => runQuickAction(btn.dataset.act));
  });
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const el = document.getElementById(btn.dataset.copy);
      if (!el) return;
      navigator.clipboard.writeText(el.textContent.trim()).then(() => toast("📋 コピーしました", { kind: "ok" }));
    });
  });

  // v2.78.0: popup 抜本簡素化に伴い、撤廃された SOQL/API タブの DOM が無くても安全に init を続行できるよう
  // 全イベントバインドを defensive null チェック化 ($ ヘルパーで存在時のみ addEventListener)
  const $on = (id, ev, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(ev, fn);
  };

  $on("info-apiver", "change", (e) => { state.apiVersion = e.target.value; });

  // v3.87.0: Phase 177 で dead 化していた SOQL/ID 解析/API タブのバインディングを削除
  // (v2.78.0 で popup から SOQL タブと API タブを撤去、v2.80.0 で ID 解析セクションを撤去後、$on null-safe で残っていたが完全に到達不能だった)

  // クイックログイン (Login as User) - ホームタブで保持
  $on("btnLoginAsSearch", "click", searchUsersForLogin);
  $on("loginAsSearch", "keydown", (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter") searchUsersForLogin();
    if (e.key === "Escape") { e.target.value = ""; showRecentLoginUsers(); }
  });
  // v3.123.0 Phase 213: 入力即候補表示 (300ms debounce) + 入力なしで最近ユーザー表示 (ユーザー要望)
  let _loginAsSearchTimer = null;
  $on("loginAsSearch", "input", (e) => {
    clearTimeout(_loginAsSearchTimer);
    const term = e.target.value.trim();
    _loginAsSearchTimer = setTimeout(() => {
      if (term.length >= 1) searchUsersForLogin();
      else showRecentLoginUsers();
    }, 300);
  });
  // 初回 popup 表示時に最近ユーザーを即表示 (storage 読込のみで高速)
  showRecentLoginUsers();

  // 全画面で開く — フッタリンクと最上部 CTA の両方に対応
  const openTool = (e) => {
    if (e) e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL("html/tool.html") });
    window.close();
  };
  $on("openDevtools", "click", openTool);
  $on("btnOpenTool", "click", openTool);
}

async function refreshSession() {
  setStatus("⏳ セッション情報を取得しています…");
  const active = await getActiveSfTab();
  if (!active) {
    setBadge("非SF", false);
    fillInfo({});
    setStatus(
      "⚠️ Salesforce のタブが見つかりません\n" +
      "  1. Salesforce (Lightning または Classic) のタブを開いてください\n" +
      "  2. ログインを完了させてください\n" +
      "  3. このボタン (⟳) を再度クリックしてください"
    );
    return;
  }
  state.tab = active.tab;
  state.host = active.url.hostname;
  state.apiHost = toApiHost(state.host);

  const session = await getSessionId(state.host);
  if (!session) {
    setBadge("Cookie無", false);
    fillInfo({ host: state.host });
    setStatus(
      `⚠️ sid Cookie が見つかりません (host: ${state.host})\n` +
      `  1. ${state.host} のタブでログイン状態をご確認ください\n` +
      `  2. ブラウザを最近再起動した場合はセッションが失われている可能性があります\n` +
      `  3. または ${state.apiHost} 側で直接開いて再度お試しください\n` +
      `  → 解決後にこの ⟳ ボタンをクリックしてください`
    );
    return;
  }
  state.sid = session.sid;
  state.orgId = parseOrgIdFromSid(state.sid);

  const ui = await getUserInfo({ host: state.host, sid: state.sid });
  let userMsg = "";
  if (ui.ok && ui.data) {
    state.userInfo = ui.data;
    state.userId = ui.data.user_id;
    userMsg = ui.data.preferred_username || ui.data.email || "";
  } else {
    userMsg = `⚠️ ユーザ情報の取得に失敗しました (HTTP ${ui.status}): ${JSON.stringify(ui.data).substring(0, 100)}`;
  }
  // v2.83.0 Team H: popup ヘッダーに組織名 + ユーザ名を簡潔表示
  // バッジは「接続OK」→ 「組織名 / ユーザ名」に置換、長すぎる場合は省略
  const orgName = (ui.ok && ui.data && (ui.data.organization_name || ui.data.org_name)) || "";
  const displayUser = (ui.ok && ui.data && (ui.data.name || ui.data.preferred_username || ui.data.email)) || "";
  let badgeText = "接続OK";
  if (orgName || displayUser) {
    const short = (s, n) => (s && s.length > n) ? s.substring(0, n) + "…" : s;
    badgeText = [short(orgName, 20), short(displayUser, 16)].filter(Boolean).join(" / ");
  }
  setBadge(badgeText, true);
  fillInfo({
    host: state.host,
    orgId: state.orgId,
    userId: state.userId || "-",
    session: state.sid,
  });
  setStatus(`OK (cookie via ${session.via}, domain=${session.cookieDomain || "-"})${userMsg ? " / " + userMsg : ""}`);
}

function fillInfo({ host = "-", orgId = "-", userId = "-", session = "-" }) {
  document.getElementById("info-host").textContent = host;
  document.getElementById("info-orgid").textContent = orgId;
  document.getElementById("info-userid").textContent = userId;
  const sEl = document.getElementById("info-session");
  sEl.textContent = session && session !== "-" ? session.substring(0, 24) + "…" : "-";
  sEl.title = session;
  // v3.243.0 Phase 333: ENV バッジ (Sandbox/PROD/DEV) を popup ヘッダーに表示 — 3 モード ENV 表示 100% 統一
  const envBadge = document.getElementById("popupEnvBadge");
  if (envBadge && host && host !== "-") {
    let envLabel = "PROD", envClass = "env-prod", envTitle = "";
    if (/\.sandbox\./.test(host)) {
      envLabel = "🧪 Sandbox"; envClass = "env-sandbox";
      envTitle = `Sandbox 環境 (${host}) — テスト用組織です。本番影響なし`;
    } else if (/\.develop\./.test(host) || /\.scratch\./.test(host)) {
      envLabel = "🔧 Dev"; envClass = "env-dev";
      envTitle = `Developer / Scratch 組織 (${host}) — 学習・検証用途`;
    } else {
      envLabel = "⚠ PROD"; envClass = "env-prod";
      envTitle = `本番組織 (Production) — ${host} — UPDATE/DELETE 操作は実データに影響します。慎重に！`;
    }
    envBadge.textContent = envLabel;
    envBadge.title = envTitle;
    envBadge.className = `popup-env-badge ${envClass}`;
    envBadge.style.display = "";
  } else if (envBadge) {
    envBadge.style.display = "none";
  }
}

function setBadge(label, ok) {
  const el = document.getElementById("orgBadge");
  el.textContent = label;
  el.classList.toggle("ok", !!ok);
  el.classList.toggle("err", !ok);
}

function setStatus(msg) {
  document.getElementById("statusMsg").textContent = msg;
}

function toast(msg, opts = {}) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const el = document.createElement("div");
  el.className = "toast" + (opts.kind ? " " + opts.kind : "");
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

function showDevToolsHelp() {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;";
  overlay.innerHTML = `
    <div style="background:#111a2e;border:1px solid #1b96ff;border-radius:8px;padding:16px;max-width:420px;color:#e6ecf5;font-size:11px;line-height:1.6">
      <h2 style="color:#1b96ff;margin:0 0 8px;font-size:13px">🔍 DevTools パネルを開く</h2>
      <ol style="padding-left:18px;margin:0 0 12px">
        <li>Salesforce のタブ (Lightning) を開く</li>
        <li><b>F12</b> キーを押す (または右クリック → 「検証」)</li>
        <li>DevTools の上部タブから <b>「Salesforce」</b> を選択
          <div style="color:#9fb0c9;font-size:10px;margin-top:2px">※ Elements / Console / … >> の中に隠れている場合あり。&gt;&gt; をクリックして探す</div>
        </li>
        <li>左サイドバーから機能を選択:
          <ul style="padding-left:14px;margin:4px 0;color:#9fb0c9">
            <li>SOQL クエリ</li>
            <li>🔍 レコード Inspector</li>
            <li>📥 データエクスポート</li>
            <li>Apex 実行</li>
            <li>🔗 API URL ビルダー</li>
            <li>📦 変更セット / package.xml</li>
            <li>📊 Limits</li>
            <li>設計書ジェネレータ</li>
          </ul>
        </li>
      </ol>
      <div style="background:#0a1224;padding:8px;border-radius:4px;font-size:10px;color:#9fb0c9;margin-bottom:10px">
        💡 ヒント: DevTools が画面下に出る場合は、DevTools 右上の縦三点 → "Dock side" で右側に変更すると見やすい
      </div>
      <button style="background:#1b96ff;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:700;width:100%" id="sfdtHelpClose">閉じる</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay || e.target.id === "sfdtHelpClose") overlay.remove(); });
}

async function runQuickAction(act) {
  if (!state.host) { toast("⚠ Salesforce のタブを開いてから操作してください", { kind: "warn" }); return; }
  const baseLightning = state.host.endsWith(".lightning.force.com")
    ? state.host
    : state.host.replace(/\.my\.salesforce\.com$/, ".lightning.force.com");
  const map = {
    openSetup: `https://${baseLightning}/lightning/setup/SetupOneHome/home`,
    openDevConsole: `https://${state.apiHost}/_ui/common/apex/debug/ApexCSIPage`,
    openObjectMgr: `https://${baseLightning}/lightning/setup/ObjectManager/home`,
    openProfile: `https://${baseLightning}/lightning/settings/personal/PersonalInformation/home`,
    openOrgInfo: `https://${baseLightning}/lightning/setup/CompanyProfileInfo/home`,
    logoutUI: `https://${state.apiHost}/secur/logout.jsp`,
  };
  if (map[act]) chrome.tabs.create({ url: map[act] });
}

// v3.87.0: Phase 177 — doSoql / pushHistory / renderHistory / deleteHistoryAt / togglePinAt / clearHistory を削除
// (v2.78.0 で popup から SOQL タブを撤去後、これらの関数は呼び出し元 (dead な $on バインディング) のみで dead 化していた)
// レガシー HISTORY_KEY ("soqlHistory") は Phase 176 で OWNED_NON_SFDT に追加済 → 「全削除」で除去される

// ====== クイックログイン (Login as User) ======
// v2.83.0 Team G: 検索履歴と最近ログインしたユーザ
const LOGIN_AS_HISTORY_KEY = "sfdtLoginAsHistory"; // 最近検索ワード (最大 5 件)
const LOGIN_AS_RECENT_KEY = "sfdtLoginAsRecentUsers"; // 最近ログインしたユーザ (最大 5 件)

async function pushLoginAsHistory(term) {
  if (!term || !term.trim()) return;
  try {
    const { [LOGIN_AS_HISTORY_KEY]: list = [] } = await chrome.storage.local.get(LOGIN_AS_HISTORY_KEY);
    const next = [term, ...list.filter((t) => t !== term)].slice(0, 5);
    await chrome.storage.local.set({ [LOGIN_AS_HISTORY_KEY]: next });
    await renderLoginAsHistory();
  } catch {}
}
async function pushLoginAsRecent(user) {
  if (!user || !user.Id) return;
  try {
    const { [LOGIN_AS_RECENT_KEY]: list = [] } = await chrome.storage.local.get(LOGIN_AS_RECENT_KEY);
    const minimal = { Id: user.Id, Name: user.Name, Username: user.Username, Alias: user.Alias, ts: Date.now() };
    const next = [minimal, ...list.filter((u) => u.Id !== user.Id)].slice(0, 5);
    await chrome.storage.local.set({ [LOGIN_AS_RECENT_KEY]: next });
    await renderLoginAsHistory();
  } catch {}
}
async function renderLoginAsHistory() {
  const root = document.getElementById("loginAsHistory");
  if (!root) return;
  try {
    const { [LOGIN_AS_HISTORY_KEY]: terms = [], [LOGIN_AS_RECENT_KEY]: users = [] } =
      await chrome.storage.local.get([LOGIN_AS_HISTORY_KEY, LOGIN_AS_RECENT_KEY]);
    if (!terms.length && !users.length) { root.innerHTML = ""; return; }
    let html = "";
    if (users.length) {
      html += `<div class="login-history-title">⏱ 最近ログインしたユーザ</div>`;
      html += `<div class="login-history-chips">` + users.map((u) =>
        `<button class="login-chip recent-user" data-user-id="${escape(u.Id)}" data-user-name="${escape(u.Name || "")}" title="${escape(u.Username || "")} (${escape(u.Alias || "")}) を ${escape(new Date(u.ts).toLocaleString())} にログイン">↻ ${escape(u.Name || u.Username || "?")}</button>`
      ).join("") + `</div>`;
    }
    if (terms.length) {
      html += `<div class="login-history-title">🔎 最近の検索キーワード</div>`;
      html += `<div class="login-history-chips">` + terms.map((t) =>
        `<button class="login-chip search-term" data-term="${escape(t)}" title="クリックでこのキーワードで再検索">${escape(t)}</button>`
      ).join("") + `</div>`;
    }
    root.innerHTML = html;
    // クリックハンドラ
    root.querySelectorAll(".login-chip.search-term").forEach((b) => {
      b.addEventListener("click", () => {
        document.getElementById("loginAsSearch").value = b.dataset.term;
        searchUsersForLogin();
      });
    });
    root.querySelectorAll(".login-chip.recent-user").forEach((b) => {
      b.addEventListener("click", () => {
        loginAsUser({ Id: b.dataset.userId, Name: b.dataset.userName });
      });
    });
  } catch {}
}

// v3.123.0 Phase 213: 入力なしで最近ログインしたユーザーを表示 (storage から、ネットワーク不要で高速)
async function showRecentLoginUsers() {
  const result = document.getElementById("loginAsResult");
  if (!result) return;
  try {
    const data = await chrome.storage.local.get(LOGIN_AS_RECENT_KEY);
    const list = Array.isArray(data[LOGIN_AS_RECENT_KEY]) ? data[LOGIN_AS_RECENT_KEY] : [];
    if (!list.length) {
      result.innerHTML = `<div class="meta" style="padding:10px 8px;text-align:center;line-height:1.7;color:var(--fg-dim);font-size:11px">📋 最近代理ログインしたユーザーはまだいません<br/>🔎 上の検索欄に名前・Username・Email・Alias の一部を入力してください</div>`;
      return;
    }
    const summary = `<div class="meta" style="padding:6px 8px;background:rgba(46,204,113,0.06);border:1px solid rgba(46,204,113,0.2);border-radius:4px;margin-bottom:6px;font-size:10px;color:var(--ok)">📌 最近代理ログインしたユーザー ${list.length} 件 (検索で他のユーザーも検索可能)</div>`;
    const items = list.map((u) => {
      const initials = ((u.name || u.username || "?").trim().match(/[A-Za-z一-鿿぀-ゟ゠-ヿ]{1,2}/g) || ["?"]).slice(0, 2).map((s) => s.charAt(0)).join("");
      const seed = (u.id || "0").substring((u.id || "").length - 6);
      const hue = parseInt(seed, 36) % 360 || 200;
      const color = `hsl(${hue}, 60%, 50%)`;
      return `<div class="user-item recent-user" role="listitem" data-user-id="${escape(u.id)}" data-user-name="${escape(u.name || "")}">
        <div class="user-avatar" style="background:${color}">${escape(initials)}</div>
        <div class="user-main">
          <div class="user-name">${escape(u.name || u.username || "")}</div>
          <div class="user-sub">${escape(u.username || "")}</div>
        </div>
        <div class="user-action">代理ログイン</div>
      </div>`;
    }).join("");
    result.innerHTML = summary + items;
    // クリックで loginAsUser 呼出
    result.querySelectorAll(".user-item.recent-user").forEach((el) => {
      el.addEventListener("click", () => {
        loginAsUser({ Id: el.dataset.userId, Name: el.dataset.userName });
      });
    });
  } catch (e) {
    console.warn("[popup] showRecentLoginUsers failed:", e);
  }
}

async function searchUsersForLogin() {
  if (!state.sid) { toast("⚠ 先に Salesforce タブへ接続してください", { kind: "warn" }); return; }
  const term = document.getElementById("loginAsSearch").value.trim();
  // v2.83.0 Team G: 検索ワード履歴に保存
  if (term) pushLoginAsHistory(term);
  const result = document.getElementById("loginAsResult");
  // v2.73.0: 検索ボタンを実行中無効化 (二重実行防止 + ユーザに状態を可視化)
  const searchBtn = document.getElementById("btnLoginAsSearch");
  const origBtnText = searchBtn ? searchBtn.textContent : "";
  if (searchBtn) { searchBtn.disabled = true; searchBtn.style.opacity = "0.6"; searchBtn.textContent = "⏳ 検索中…"; }
  result.innerHTML = `<div class="meta">⏳ ユーザを検索しています…</div>`;

  // SOQL escape
  const esc = (s) => s.replace(/'/g, "\\'");
  const t = esc(term);
  let where = "IsActive = true";
  if (term) {
    where = `IsActive = true AND (` +
      `Name LIKE '%${t}%' OR Username LIKE '%${t}%' OR Email LIKE '%${t}%' OR Alias LIKE '%${t}%'` +
      `)`;
  }
  const soql = `SELECT Id, Name, Username, Email, Alias, Profile.Name, UserType FROM User WHERE ${where} ORDER BY LastLoginDate DESC NULLS LAST LIMIT 30`;

  const r = await runSoql({ host: state.host, sid: state.sid, soql, apiVersion: state.apiVersion });
  // 検索ボタン復元 (成功/失敗いずれの場合も)
  const restoreBtn = () => {
    if (searchBtn) { searchBtn.disabled = false; searchBtn.style.opacity = ""; searchBtn.textContent = origBtnText || "検索"; }
  };
  if (!r.ok) {
    restoreBtn();
    result.innerHTML = `<div class="meta">❌ ユーザ検索に失敗しました (HTTP ${r.status}): ${escape(formatError(r.data))}</div>`;
    return;
  }
  const users = r.data.records || [];
  if (!users.length) {
    restoreBtn();
    const hint = term
      ? `検索条件「${escape(term)}」に一致するユーザは見つかりませんでした。<br/>💡 別のキーワード (Username の一部 / Alias / 姓名) で再度お試しください`
      : `有効なユーザが見つかりませんでした。<br/>💡 権限不足の可能性があります (「すべてのデータの編集 (Modify All Data)」または「すべてのユーザの参照 (View All Users)」が必要です)`;
    result.innerHTML = `<div class="meta" style="padding:16px;text-align:center;line-height:1.7">📭 ${hint}</div>`;
    return;
  }

  // v2.73.0: 結果ヘッダで件数サマリを表示 (ユーザに「30 件上限あり」を伝える)
  const summaryText = term
    ? `✓ 「${escape(term)}」で ${users.length} 件ヒット (有効ユーザのみ・最終ログイン日時降順・最大 30 件まで)`
    : `✓ 全有効ユーザ ${users.length} 件 (最終ログイン日時降順・最大 30 件まで)`;
  result.innerHTML = `<div class="meta" style="padding:6px 8px;background:rgba(27,150,255,0.05);border-radius:4px;margin-bottom:6px">${summaryText}</div>`;
  restoreBtn();
  users.forEach((u) => {
    // イニシャル円アイコン: 名前の頭文字 (姓・名の先頭) + 一意のアクセント色 (Id から色決定)
    const initials = ((u.Name || u.Username || "?").trim().match(/[A-Za-z一-鿿぀-ゟ゠-ヿ]{1,2}/g) || ["?"])
      .slice(0, 2).map((s) => s.charAt(0)).join("");
    // Id 末尾 6 文字を hex 色のシードに
    const seed = (u.Id || "0").substring(u.Id ? u.Id.length - 6 : 0, u.Id ? u.Id.length : 6);
    const hue = parseInt(seed, 36) % 360 || 200;
    const color = `hsl(${hue}, 60%, 50%)`;

    const el = document.createElement("div");
    el.className = "user-item";
    el.innerHTML = `
      <span class="user-avatar" style="background:${color}" aria-hidden="true">${escape(initials || "?")}</span>
      <div class="user-main">
        <div class="user-name">${escape(u.Name)} <span style="font-weight:400;color:var(--fg-dim)">(${escape(u.Alias || "")})</span></div>
        <div class="user-sub">${escape(u.Username)} / ${escape(u.Profile ? u.Profile.Name : "-")} / ${escape(u.UserType || "")}</div>
      </div>
      <span class="user-action" title="このユーザとしてログインします">ログイン</span>
    `;
    el.addEventListener("click", () => loginAsUser(u));
    result.appendChild(el);
  });
}

function loginAsUser(u) {
  if (!state.host || !state.orgId) { toast("⚠ セッション情報が取得できていません。先に Salesforce タブで再接続してください", { kind: "warn" }); return; }
  // v2.83.0 Team G: 最近ログインユーザに記録
  pushLoginAsRecent(u);
  // Salesforce Login As の URL: /servlet/servlet.su?oid=<OrgId15>&suorgadminid=<UserId15>&retURL=/lightning/&targetURL=/
  const orgId = state.orgId.substring(0, 15);
  const userId = (u.Id || "").substring(0, 15);
  // Lightning ドメインで開く
  const lhost = state.host.endsWith(".lightning.force.com")
    ? state.host
    : state.host.replace(/\.my\.salesforce\.com$/, ".lightning.force.com");
  const url = `https://${state.apiHost}/servlet/servlet.su?oid=${orgId}&suorgadminid=${userId}&retURL=%2Flightning%2F&targetURL=%2Flightning%2F`;
  chrome.tabs.create({ url });
  toast(`👤 ${u.Name} さんとしてログインします`, { kind: "ok" });
}

// v3.87.0: Phase 177 — exportCsv / recordsToTableHtml / sortTableByTh / stringify を削除 (popup SOQL タブ撤去後の dead code)
function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function formatError(d) {
  if (Array.isArray(d) && d[0]) return `${d[0].errorCode || ""} ${d[0].message || ""}`.trim();
  if (d && d.error) return d.error_description || d.error;
  return JSON.stringify(d);
}

// v3.87.0: Phase 177 — doParseId / openIdInOrg / doApiCall を削除 (popup から ID 解析セクション・API タブが撤去された後の dead code)

async function renderLinks() {
  // カテゴリ別グルーピング: Setup / 開発 / 監視 / セキュリティ
  const groups = [
    { title: "⚙️ 設定 (Setup)", links: [
      ["Setup ホーム", "/lightning/setup/SetupOneHome/home"],
      ["オブジェクトマネージャ", "/lightning/setup/ObjectManager/home"],
      ["カスタム設定", "/lightning/setup/CustomSettings/home"],
      ["カスタムメタデータ型", "/lightning/setup/CustomMetadata/home"],
    ]},
    { title: "💻 開発", links: [
      ["Apex クラス", "/lightning/setup/ApexClasses/home"],
      ["Apex トリガ", "/lightning/setup/ApexTriggers/home"],
      ["フロー (Flow)", "/lightning/setup/Flows/home"],
      ["接続アプリケーション", "/lightning/setup/ConnectedApplication/home"],
    ]},
    { title: "📊 監視", links: [
      ["デバッグログ", "/lightning/setup/ApexDebugLogs/home"],
      ["スケジュール済みジョブ", "/lightning/setup/ScheduledJobs/home"],
      ["Apex 非同期ジョブ", "/lightning/setup/AsyncApexJobs/home"],
      ["設定変更履歴 (Setup Audit Trail)", "/lightning/setup/SetupAuditTrail/home"],
    ]},
    { title: "🔐 セキュリティ", links: [
      ["プロファイル", "/lightning/setup/EnhancedProfiles/home"],
      ["権限セット", "/lightning/setup/PermSets/home"],
      ["ユーザ管理", "/lightning/setup/ManageUsers/home"],
      ["ネットワークアクセス (IP 制限)", "/lightning/setup/NetworkAccess/home"],
      ["セッション設定", "/lightning/setup/SecuritySession/home"],
      ["OAuth / OpenID Connect 設定", "/lightning/setup/OAuthAndOpenIDConnectSettings/home"],
    ]},
  ];
  const root = document.getElementById("linkList");
  root.innerHTML = "";
  const openLink = (path) => {
    if (!state.host) { toast("⚠ Salesforce のタブで実行してください", { kind: "warn" }); return; }
    const lhost = state.host.endsWith(".lightning.force.com")
      ? state.host
      : state.host.replace(/\.my\.salesforce\.com$/, ".lightning.force.com");
    chrome.tabs.create({ url: `https://${lhost}${path}` });
  };
  // v3.43.0: フィルタ対応 — リンク名で部分一致絞り込み
  // v3.45.0: カテゴリ折りたたみ対応 — 各グループを <details>/<summary> で表示・状態は chrome.storage に保存
  const COLLAPSED_KEY = "sfdtPopupLinksCollapsed";
  let collapsedSet = new Set();
  try {
    const stored = await chrome.storage.local.get(COLLAPSED_KEY);
    if (Array.isArray(stored[COLLAPSED_KEY])) collapsedSet = new Set(stored[COLLAPSED_KEY]);
  } catch {}
  const persistCollapsed = () => {
    try { chrome.storage.local.set({ [COLLAPSED_KEY]: [...collapsedSet] }); } catch {}
  };
  const renderFiltered = (q) => {
    root.innerHTML = "";
    const qn = (q || "").toLowerCase().trim();
    let hits = 0;
    groups.forEach((g) => {
      const matched = g.links.filter(([label]) => !qn || label.toLowerCase().includes(qn));
      if (!matched.length) return;
      const details = document.createElement("details");
      details.className = "links-group";
      // フィルタ中は常時展開、それ以外は前回保存値に従う
      details.open = !!qn || !collapsedSet.has(g.title);
      details.addEventListener("toggle", () => {
        if (qn) return; // フィルタ中の toggle は永続化しない
        if (details.open) collapsedSet.delete(g.title); else collapsedSet.add(g.title);
        persistCollapsed();
      });
      const summary = document.createElement("summary");
      summary.className = "links-group-title";
      summary.textContent = g.title;
      details.appendChild(summary);
      matched.forEach(([label, path]) => {
        const a = document.createElement("a");
        a.textContent = label;
        a.href = "#";
        a.addEventListener("click", (e) => { e.preventDefault(); openLink(path); });
        details.appendChild(a);
        hits++;
      });
      root.appendChild(details);
    });
    if (!hits && qn) {
      const empty = document.createElement("div");
      empty.style.cssText = "color:var(--fg-dim);font-size:11px;padding:8px 4px";
      empty.textContent = `「${q}」に一致するリンクは見つかりませんでした`;
      root.appendChild(empty);
    }
  };
  const filterInput = document.getElementById("linkFilter");
  if (filterInput) {
    filterInput.addEventListener("input", (e) => renderFiltered(e.target.value));
    filterInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { filterInput.value = ""; renderFiltered(""); }
    });
  }
  renderFiltered("");
}
