// popup.js – tab routing, SF info loading, SOQL/REST/ID utilities.

import {
  getActiveSfTab, getSessionId, parseOrgIdFromSid, toApiHost,
  runSoql, sfFetch, getUserInfo, to18CharId, lookupPrefix, recordsToCsv,
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
    await renderHistory();
  } catch (e) {
    console.error("popup init error:", e);
    const s = document.getElementById("statusMsg");
    if (s) s.textContent = "❌ 初期化失敗: " + String(e && e.message || e);
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
  document.getElementById("btnSettings").addEventListener("click", () => {
    chrome.runtime.openOptionsPage ? chrome.runtime.openOptionsPage() : toast("⚠ 設定画面は今後のバージョンで実装予定です (現在は未実装)", { kind: "warn" });
  });
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
  // whats-new 折りたたみ
  const toggle = document.getElementById("whatsNewToggle");
  const body = document.getElementById("whatsNewBody");
  const arrow = document.getElementById("whatsNewArrow");
  if (toggle && body && arrow) {
    chrome.storage.local.get("whatsNewCollapsed", ({ whatsNewCollapsed }) => {
      if (whatsNewCollapsed) {
        body.style.display = "none";
        arrow.textContent = "▶";
      }
    });
    toggle.addEventListener("click", async () => {
      const collapsed = body.style.display === "none";
      body.style.display = collapsed ? "" : "none";
      arrow.textContent = collapsed ? "▼" : "▶";
      await chrome.storage.local.set({ whatsNewCollapsed: !collapsed });
    });
  }

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

  document.getElementById("info-apiver").addEventListener("change", (e) => {
    state.apiVersion = e.target.value;
  });

  document.getElementById("btnRunSoql").addEventListener("click", doSoql);
  document.getElementById("btnExportCsv").addEventListener("click", exportCsv);
  document.getElementById("btnClearHistory").addEventListener("click", clearHistory);
  document.getElementById("soqlText").addEventListener("keydown", (e) => {
    if (e.isComposing || e.keyCode === 229) return; // IME 確定中はスキップ
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") doSoql();
  });

  // クイックログイン (Login as User)
  document.getElementById("btnLoginAsSearch").addEventListener("click", searchUsersForLogin);
  document.getElementById("loginAsSearch").addEventListener("keydown", (e) => {
    if (e.isComposing || e.keyCode === 229) return; // IME 確定中はスキップ
    if (e.key === "Enter") searchUsersForLogin();
  });

  document.getElementById("btnParseId").addEventListener("click", doParseId);
  document.getElementById("btnOpenId").addEventListener("click", openIdInOrg);

  document.getElementById("btnApiSend").addEventListener("click", doApiCall);
  document.getElementById("btnApiLimits").addEventListener("click", () => {
    document.getElementById("apiMethod").value = "GET";
    document.getElementById("apiPath").value = `/services/data/v${state.apiVersion}/limits`;
    doApiCall();
  });
  document.getElementById("btnApiVersions").addEventListener("click", () => {
    document.getElementById("apiMethod").value = "GET";
    document.getElementById("apiPath").value = `/services/data`;
    doApiCall();
  });

  document.getElementById("openDevtools").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL("html/tool.html") });
    window.close();
  });
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
  setBadge("接続OK", true);
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

async function doSoql() {
  if (!state.sid) { toast("⚠ 先に Salesforce タブへ接続してください", { kind: "warn" }); return; }
  const soql = document.getElementById("soqlText").value.trim();
  const tooling = document.getElementById("soqlTooling").checked;
  if (!soql) { toast("⚠ クエリを入力してください", { kind: "warn" }); return; }
  setStatus("⏳ SOQL を実行しています…");
  const t0 = performance.now();
  const r = await runSoql({ host: state.host, sid: state.sid, soql, apiVersion: state.apiVersion, tooling });
  const dt = Math.round(performance.now() - t0);
  if (!r.ok) {
    document.getElementById("soqlMeta").textContent = `❌ HTTP ${r.status} — ${formatError(r.data)}`;
    document.getElementById("soqlResult").innerHTML = `<pre class="code">${escape(JSON.stringify(r.data, null, 2))}</pre>`;
    setStatus("❌ 実行に失敗しました");
    state.lastRecords = null;
    await pushHistory({ soql, tooling, ok: false, count: 0, ms: dt, status: r.status });
    return;
  }
  const recs = (r.data && r.data.records) || [];
  state.lastRecords = recs;
  document.getElementById("soqlMeta").textContent =
    `✅ ${recs.length} 件 / total=${r.data.totalSize ?? recs.length} / ${dt}ms${tooling ? " (Tooling)" : ""}`;
  document.getElementById("soqlResult").innerHTML = recordsToTableHtml(recs);
  setStatus("OK");
  await pushHistory({ soql, tooling, ok: true, count: recs.length, ms: dt, status: r.status });
}

// ====== SOQL 履歴 (chrome.storage.local, 最大10件) ======
const HISTORY_KEY = "soqlHistory";
const HISTORY_MAX = 10;

async function pushHistory(entry) {
  const { [HISTORY_KEY]: hist = [] } = await chrome.storage.local.get(HISTORY_KEY);
  // 同一クエリ連投の場合は既存を削除して先頭へ。ただしピン留め項目は維持
  const existed = hist.find((h) => h.soql === entry.soql && h.tooling === entry.tooling);
  const pinned = !!(existed && existed.pinned);
  const filtered = hist.filter((h) => !(h.soql === entry.soql && h.tooling === entry.tooling));
  filtered.unshift({ ...entry, ts: Date.now(), pinned });
  // ピン留めを上に、非ピンを下に保ちつつ非ピンを最大 HISTORY_MAX 件に剪定
  const pin = filtered.filter((h) => h.pinned);
  const free = filtered.filter((h) => !h.pinned).slice(0, HISTORY_MAX);
  const pruned = [...pin, ...free];
  await chrome.storage.local.set({ [HISTORY_KEY]: pruned });
  await renderHistory();
}

async function renderHistory() {
  const root = document.getElementById("soqlHistory");
  if (!root) return;
  const { [HISTORY_KEY]: hist = [] } = await chrome.storage.local.get(HISTORY_KEY);
  if (!hist.length) {
    root.innerHTML = `<div class="meta">履歴はまだありません。SOQL を実行するとここに最大 10 件保存します (長押しでピン留め / ダブルクリックで削除できます)</div>`;
    return;
  }
  root.innerHTML = "";
  hist.forEach((h, idx) => {
    const el = document.createElement("div");
    el.className = "history-item" + (h.pinned ? " pinned" : "");
    const time = new Date(h.ts).toLocaleTimeString();
    el.innerHTML = `
      ${h.pinned ? `<span class="qbadge pin" title="ピン留め中">📌</span>` : ""}
      <span class="qbadge ${h.ok ? "ok" : "err"}">${h.ok ? "✓" : "✗"}</span>
      ${h.tooling ? `<span class="qbadge tool">T</span>` : ""}
      <span class="qtext" title="クリックでクエリを復元します / ダブルクリックで削除 / 長押しでピン留めの切替\n${escape(h.soql)}">${escape(h.soql)}</span>
      <span class="qmeta">${h.count}件 ${h.ms}ms ${time}</span>
    `;
    // クリック=復元
    el.addEventListener("click", () => {
      if (el._suppressed) return;
      document.getElementById("soqlText").value = h.soql;
      document.getElementById("soqlTooling").checked = !!h.tooling;
      toast("📋 クエリを復元しました", { kind: "ok" });
    });
    // ダブルクリック=削除
    el.addEventListener("dblclick", async (e) => {
      e.preventDefault();
      el._suppressed = true;
      await deleteHistoryAt(idx);
      toast("🗑 履歴を削除しました", { kind: "warn" });
    });
    // 長押し (500ms) = ピン留め切替
    let pressTimer = null;
    const startPress = (e) => {
      pressTimer = setTimeout(async () => {
        pressTimer = null;
        el._suppressed = true;
        await togglePinAt(idx);
      }, 500);
    };
    const cancelPress = () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    };
    el.addEventListener("mousedown", startPress);
    el.addEventListener("mouseup", cancelPress);
    el.addEventListener("mouseleave", cancelPress);
    el.addEventListener("touchstart", startPress);
    el.addEventListener("touchend", cancelPress);

    root.appendChild(el);
  });
}

async function deleteHistoryAt(index) {
  const { [HISTORY_KEY]: hist = [] } = await chrome.storage.local.get(HISTORY_KEY);
  hist.splice(index, 1);
  await chrome.storage.local.set({ [HISTORY_KEY]: hist });
  await renderHistory();
}
async function togglePinAt(index) {
  const { [HISTORY_KEY]: hist = [] } = await chrome.storage.local.get(HISTORY_KEY);
  if (!hist[index]) return;
  hist[index].pinned = !hist[index].pinned;
  // 再ソート: pinned が先、各群内は ts 降順
  hist.sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return (b.ts || 0) - (a.ts || 0);
  });
  await chrome.storage.local.set({ [HISTORY_KEY]: hist });
  await renderHistory();
  toast(hist[0] && hist[0].pinned ? "📌 ピン留めしました" : "📌 ピンを外しました", { kind: "ok" });
}

async function clearHistory() {
  // ピン留めは消さない
  const { [HISTORY_KEY]: hist = [] } = await chrome.storage.local.get(HISTORY_KEY);
  const kept = hist.filter((h) => h.pinned);
  await chrome.storage.local.set({ [HISTORY_KEY]: kept });
  await renderHistory();
  toast(kept.length ? `🗑 ピン留め ${kept.length} 件を残し、その他の履歴を削除しました` : "🗑 履歴をすべて削除しました", { kind: "warn" });
}

// ====== クイックログイン (Login as User) ======
async function searchUsersForLogin() {
  if (!state.sid) { toast("⚠ 先に Salesforce タブへ接続してください", { kind: "warn" }); return; }
  const term = document.getElementById("loginAsSearch").value.trim();
  const result = document.getElementById("loginAsResult");
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
  if (!r.ok) {
    result.innerHTML = `<div class="meta">❌ ユーザ検索に失敗しました (HTTP ${r.status}): ${escape(formatError(r.data))}</div>`;
    return;
  }
  const users = r.data.records || [];
  if (!users.length) {
    const hint = term
      ? `検索条件「${escape(term)}」に一致するユーザは見つかりませんでした。<br/>💡 別のキーワード (Username の一部 / Alias / 姓名) で再度お試しください`
      : `有効なユーザが見つかりませんでした。<br/>💡 権限不足の可能性があります (「すべてのデータの編集 (Modify All Data)」または「すべてのユーザの参照 (View All Users)」が必要です)`;
    result.innerHTML = `<div class="meta" style="padding:16px;text-align:center;line-height:1.7">📭 ${hint}</div>`;
    return;
  }

  result.innerHTML = "";
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

function exportCsv() {
  if (!state.lastRecords || !state.lastRecords.length) { toast("📭 エクスポート対象がありません (先に SOQL を実行してください)", { kind: "warn" }); return; }
  const csv = recordsToCsv(state.lastRecords);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  chrome.downloads
    ? chrome.downloads.download({ url, filename: `soql-${Date.now()}.csv` })
    : window.open(url);
}

function recordsToTableHtml(records) {
  if (!records.length) return `<div class="meta">該当なし</div>`;
  const cols = new Set();
  records.forEach((r) => Object.keys(r).forEach((k) => k !== "attributes" && cols.add(k)));
  const headers = Array.from(cols);
  const head = `<tr>${headers.map((h) => `<th class="sortable" data-col="${escape(h)}" title="クリックで ${escape(h)} 列をソート">${escape(h)}</th>`).join("")}</tr>`;
  const rows = records.map((r) =>
    `<tr>${headers.map((h) => {
      const raw = r[h];
      const val = stringify(raw);
      const isNested = raw && typeof raw === "object" && raw.attributes;
      const cls = "cell-copyable" + (isNested ? " cell-nested" : "");
      const rawAttr = isNested ? ` data-raw-value="${escape(JSON.stringify(raw))}"` : "";
      // ネストセルは tooltip に整形 JSON プレビュー (max 280 文字)
      let tip = "ダブルクリックでコピー";
      if (isNested) {
        const pretty = JSON.stringify(raw, null, 2);
        const preview = pretty.length > 280 ? pretty.substring(0, 280) + "\n…(切詰)" : pretty;
        tip = `dblclick で raw JSON コピー:\n${preview}`;
      }
      return `<td class="${cls}"${rawAttr} title="${escape(tip)}">${escape(val)}</td>`;
    }).join("")}</tr>`
  ).join("");
  setTimeout(() => {
    document.querySelectorAll("#soqlResult th.sortable:not([data-sort-bound])").forEach((th) => {
      th.dataset.sortBound = "true";
      th.addEventListener("click", () => sortTableByTh(th));
    });
    document.querySelectorAll("#soqlResult td.cell-copyable:not([data-copy-bound])").forEach((td) => {
      td.dataset.copyBound = "true";
      td.addEventListener("dblclick", () => {
        const txt = td.dataset.rawValue || td.textContent;
        navigator.clipboard.writeText(txt).then(() => toast(`📋 コピー: ${txt.substring(0, 30)}${txt.length > 30 ? "…" : ""}`, { kind: "ok" }));
      });
    });
  }, 0);
  return `<table>${head}${rows}</table>`;
}

// popup 用: th クリックで in-place ソート (asc → desc → unsort トグル)
function sortTableByTh(th) {
  const table = th.closest("table");
  if (!table) return;
  const idx = Array.prototype.indexOf.call(th.parentElement.children, th);
  const tbody = table.tBodies[0] || table;
  const cur = th.dataset.sortDir || "";
  const next = cur === "asc" ? "desc" : (cur === "desc" ? "" : "asc");
  table.querySelectorAll("th.sortable").forEach((other) => { delete other.dataset.sortDir; });
  if (next) th.dataset.sortDir = next;
  if (!tbody.dataset.originalOrder) {
    tbody.dataset.originalOrder = "true";
    Array.from(tbody.rows).forEach((tr, i) => { tr.dataset.origIdx = String(i); });
  }
  const rows = Array.from(tbody.querySelectorAll("tr")).filter((tr) => tr.cells.length > idx && !tr.querySelector("th"));
  if (!next) {
    rows.sort((a, b) => (parseInt(a.dataset.origIdx, 10) || 0) - (parseInt(b.dataset.origIdx, 10) || 0));
  } else {
    const dir = next === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const av = a.cells[idx] ? a.cells[idx].textContent : "";
      const bv = b.cells[idx] ? b.cells[idx].textContent : "";
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
    // attributes を除いた代表項目を Name / Subject / Id 優先で平坦化 (panel と統一)
    if (v.attributes && typeof v.attributes === "object") {
      const fields = Object.keys(v).filter((k) => k !== "attributes");
      if (v.records && Array.isArray(v.records)) {
        return `[${v.records.length} 件のサブクエリ]`;
      }
      const prefer = ["Name", "Subject", "Title", "DeveloperName", "MasterLabel", "FullName"];
      for (const p of prefer) {
        if (fields.includes(p) && v[p] != null) {
          const id = fields.includes("Id") && v.Id ? ` [${String(v.Id).substring(0, 18)}]` : "";
          return `${stringify(v[p])}${id}`;
        }
      }
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

async function doParseId() {
  const raw = document.getElementById("idInput").value.trim();
  if (!/^[a-zA-Z0-9]{15,18}$/.test(raw)) {
    document.getElementById("idResult").innerHTML = `<div class="meta">15 桁または 18 桁の英数字 ID を入力してください</div>`;
    return;
  }
  const id15 = raw.substring(0, 15);
  const id18 = to18CharId(id15);
  const prefix = raw.substring(0, 3);
  const objGuess = lookupPrefix(raw);
  const recordUrl = state.host ? `https://${state.host}/${raw}` : "(Salesforce に未接続)";

  document.getElementById("idResult").innerHTML = `
    <div class="kv"><span>15 桁 ID</span><code>${escape(id15)}</code></div>
    <div class="kv"><span>18 桁 ID</span><code>${escape(id18 || "-")}</code><button class="mini" id="cp18" title="18 桁 ID をクリップボードにコピーします">コピー</button></div>
    <div class="kv"><span>Key Prefix (先頭 3 文字)</span><code>${escape(prefix)}</code></div>
    <div class="kv"><span>推定オブジェクト</span><code>${escape(objGuess || "-")}</code></div>
    <div class="kv"><span>レコード URL</span><code>${escape(recordUrl)}</code></div>
  `;
  const cp = document.getElementById("cp18");
  if (cp) cp.addEventListener("click", () => {
    navigator.clipboard.writeText(id18 || "").then(() => toast(`📋 18 桁 ID をコピーしました: ${id18}`, { kind: "ok" }));
  });
}

async function openIdInOrg() {
  const raw = document.getElementById("idInput").value.trim();
  if (!/^[a-zA-Z0-9]{15,18}$/.test(raw)) { toast("⚠ 15 桁または 18 桁の有効な Salesforce ID を入力してください", { kind: "warn" }); return; }
  if (!state.host) { toast("⚠ Salesforce のタブを開いてから実行してください", { kind: "warn" }); return; }
  chrome.tabs.create({ url: `https://${state.host}/${raw}` });
  toast(`🔍 レコード ${raw} を新しいタブで開きました`, { kind: "ok" });
}

async function doApiCall() {
  if (!state.sid) { toast("⚠ 先に Salesforce タブへ接続してください", { kind: "warn" }); return; }
  const method = document.getElementById("apiMethod").value;
  const path = document.getElementById("apiPath").value.trim();
  const body = document.getElementById("apiBody").value.trim();
  if (!path) { toast("⚠ パスを入力してください", { kind: "warn" }); return; }
  setStatus("⏳ API を呼び出しています…");
  const t0 = performance.now();
  const r = await sfFetch({
    host: state.host, sid: state.sid, path, method,
    body: body ? body : null,
  });
  const dt = Math.round(performance.now() - t0);
  document.getElementById("apiMeta").textContent = `${r.ok ? "✅" : "❌"} HTTP ${r.status} / ${dt}ms`;
  document.getElementById("apiResult").textContent = JSON.stringify(r.data, null, 2);
  setStatus(r.ok ? "✓ 成功しました" : "❌ 失敗しました");
}

function renderLinks() {
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
  groups.forEach((g) => {
    const heading = document.createElement("div");
    heading.className = "links-group-title";
    heading.textContent = g.title;
    root.appendChild(heading);
    g.links.forEach(([label, path]) => {
      const a = document.createElement("a");
      a.textContent = label;
      a.href = "#";
      a.addEventListener("click", (e) => { e.preventDefault(); openLink(path); });
      root.appendChild(a);
    });
  });
}
