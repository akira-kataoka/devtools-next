// content_script: SF ページ上で動作する軽量機能
// - コンテキストメニューからの copy 要求
// - v2.7.0+: 右下 floating launcher → mini-panel オーバーレイ (SOQL 簡易実行)

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "sfdt:copy" && typeof msg.text === "string") {
    navigator.clipboard.writeText(msg.text).then(() => {
      flashToast("コピーしました: " + msg.text);
    });
  }
});

function flashToast(text) {
  let el = document.getElementById("__sfdt_toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "__sfdt_toast";
    Object.assign(el.style, {
      position: "fixed", right: "16px", bottom: "16px",
      background: "#1b96ff", color: "#fff", padding: "8px 14px",
      borderRadius: "6px", fontSize: "12px", zIndex: 999999,
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    });
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.opacity = "1";
  clearTimeout(el.__t);
  el.__t = setTimeout(() => { el.style.opacity = "0"; }, 1800);
}

// =============================================================
// v2.7.0+: 右下 floating launcher + mini-panel (shadow DOM)
// =============================================================
(function injectLauncher() {
  // 多重 inject ガード (SPA で content_script 再評価される対策)
  if (document.getElementById("__sfdt_root")) return;

  const root = document.createElement("div");
  root.id = "__sfdt_root";
  root.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647";
  const shadow = root.attachShadow({ mode: "open" });

  // すべてのスタイルは shadow DOM 内に閉じる (SF Lightning の CSS と衝突しない)
  shadow.innerHTML = `
    <style>
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Yu Gothic UI", Segoe UI, sans-serif; }
      .launcher {
        width: 44px; height: 44px; border-radius: 50%;
        background: linear-gradient(180deg, #1b96ff 0%, #0c66e4 100%);
        color: #fff; border: none; cursor: pointer;
        font-size: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .launcher:hover { transform: scale(1.08); box-shadow: 0 6px 18px rgba(27,150,255,0.5); }
      .launcher:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
      .panel {
        position: fixed; right: 16px; bottom: 70px;
        width: 480px; max-height: 60vh; display: none; flex-direction: column;
        background: #0b1220; color: #e6ecf5;
        border: 1px solid #1f2c46; border-radius: 10px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        overflow: hidden;
      }
      .panel.open { display: flex; }
      .hdr {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 12px;
        background: linear-gradient(180deg, #112042 0%, #0b1220 100%);
        border-bottom: 1px solid #1f2c46;
      }
      .hdr-title { color: #1b96ff; font-weight: 700; font-size: 13px; flex: 1; }
      .hdr-close, .hdr-open {
        background: transparent; border: 1px solid #1f2c46;
        color: #9fb0c9; padding: 2px 8px; border-radius: 4px;
        cursor: pointer; font-size: 11px;
      }
      .hdr-close:hover { color: #ff6b6b; border-color: #ff6b6b; }
      .hdr-open:hover { color: #1b96ff; border-color: #1b96ff; }
      .body { padding: 10px 12px; flex: 1; overflow: auto; }
      textarea {
        width: 100%; min-height: 80px;
        background: #0a1224; color: #e6ecf5;
        border: 1px solid #1f2c46; border-radius: 6px;
        padding: 6px 8px; font: 12px/1.4 ui-monospace, Consolas, monospace;
        resize: vertical;
      }
      textarea:focus { outline: 2px solid #1b96ff; outline-offset: 0; }
      .row { display: flex; gap: 6px; margin-top: 6px; align-items: center; }
      .row .meta { color: #9fb0c9; font-size: 10px; flex: 1; }
      button.primary {
        background: #1b96ff; color: #fff; border: none;
        padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;
      }
      button.primary:hover { background: #0c66e4; }
      button.primary:disabled { opacity: 0.5; cursor: default; }
      .result {
        margin-top: 8px; max-height: 280px; overflow: auto;
        background: #0a1224; border: 1px solid #1f2c46; border-radius: 6px;
        padding: 6px 8px; font: 11px/1.4 ui-monospace, Consolas, monospace;
      }
      .result table { width: 100%; border-collapse: collapse; font-size: 11px; }
      .result th { background: #112042; color: #1b96ff; padding: 3px 6px; text-align: left; position: sticky; top: 0; }
      .result td { padding: 3px 6px; border-bottom: 1px solid #1f2c46; vertical-align: top; max-width: 200px; word-break: break-word; }
      .err { color: #ff6b6b; }
      .ok { color: #2ecc71; }
    </style>
    <button class="launcher" id="lnch" title="DevToolsNext mini-panel を開く" aria-label="DevToolsNext mini-panel">🛠</button>
    <div class="panel" id="pnl" role="dialog" aria-label="DevToolsNext mini panel">
      <div class="hdr">
        <span class="hdr-title">🛠 DevToolsNext mini</span>
        <button class="hdr-open" id="opn" title="フルパネルを新タブで開く">↗</button>
        <button class="hdr-close" id="cls" title="閉じる" aria-label="閉じる">✕</button>
      </div>
      <div class="body">
        <textarea id="qry" placeholder="SELECT Id, Name FROM Account LIMIT 5" spellcheck="false">SELECT Id, Name FROM Account ORDER BY CreatedDate DESC LIMIT 5</textarea>
        <div class="row">
          <button class="hdr-close" id="useId" title="現在ページのレコード ID を WHERE Id='...' で挿入" style="border-color:#1b96ff;color:#1b96ff">📋 ID 挿入</button>
          <span class="meta" id="mta">Ctrl+Enter で実行</span>
          <button class="primary" id="run">▶ 実行</button>
        </div>
        <div class="result" id="res"></div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const $ = (id) => shadow.getElementById(id);
  const launcher = $("lnch");
  const panel = $("pnl");
  const closeBtn = $("cls");
  const openFullBtn = $("opn");
  const useIdBtn = $("useId");
  const qry = $("qry");
  const runBtn = $("run");
  const meta = $("mta");
  const res = $("res");

  launcher.addEventListener("click", () => {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) setTimeout(() => qry.focus(), 30);
  });
  closeBtn.addEventListener("click", () => panel.classList.remove("open"));
  openFullBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "sfdt:openTool" }, () => {});
    // fallback: open chrome-extension://.../html/tool.html via runtime
    try {
      const url = chrome.runtime.getURL("html/tool.html");
      window.open(url, "_blank");
    } catch {}
  });
  qry.addEventListener("keydown", (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") runBtn.click();
  });

  // v2.8.0: 現在ページから ID + sObject を抽出して WHERE Id='...' を挿入
  useIdBtn.addEventListener("click", () => {
    const info = extractRecordContext();
    if (!info) {
      meta.innerHTML = `<span class="err">⚠ 現ページからレコード ID を抽出できません (レコード詳細ページで再試行)</span>`;
      return;
    }
    // SELECT Id, Name FROM <Object> WHERE Id = '<id>' 形式で生成 (既存 textarea は置換)
    const tpl = `SELECT Id, Name FROM ${info.obj || "Account"} WHERE Id = '${info.id}' LIMIT 1`;
    qry.value = tpl;
    qry.focus();
    meta.innerHTML = `<span class="ok">📋 ${info.obj || "?"}:${info.id} を挿入</span>`;
  });
  function extractRecordContext() {
    const href = location.href;
    // Lightning record: /lightning/r/<Object>/<Id>/view
    let m = href.match(/\/lightning\/r\/([^/]+)\/([a-zA-Z0-9]{15,18})/);
    if (m) return { obj: m[1], id: m[2] };
    // Setup ?address=%2F<Id>
    try {
      const u = new URL(href);
      const addr = u.searchParams.get("address");
      if (addr) {
        const am = addr.match(/([a-zA-Z0-9]{15,18})/);
        if (am) return { obj: null, id: am[1] };
      }
      // pathname
      m = u.pathname.match(/\/([a-zA-Z0-9]{15,18})(?:\/|$)/);
      if (m) return { obj: null, id: m[1] };
    } catch {}
    return null;
  }

  runBtn.addEventListener("click", async () => {
    const soql = qry.value.trim();
    if (!soql) return;
    runBtn.disabled = true;
    meta.textContent = "⏳ 実行中…";
    res.innerHTML = "";
    try {
      const host = location.hostname;
      const sessionResp = await chrome.runtime.sendMessage({ type: "sfdt:getSession", host });
      if (!sessionResp || !sessionResp.ok || !sessionResp.session) {
        meta.innerHTML = `<span class="err">❌ sid 取得失敗 (このタブで Salesforce にログイン済か確認)</span>`;
        return;
      }
      const r = await chrome.runtime.sendMessage({
        type: "sfdt:soql",
        payload: { host, sid: sessionResp.session.sid, soql, apiVersion: "62.0" },
      });
      if (!r || !r.ok) {
        meta.innerHTML = `<span class="err">❌ HTTP ${r ? r.status : "?"}</span>`;
        res.textContent = JSON.stringify(r && r.data, null, 2);
        return;
      }
      const recs = (r.data && r.data.records) || [];
      meta.innerHTML = `<span class="ok">✓ ${recs.length} 件</span>`;
      res.innerHTML = renderTable(recs);
    } catch (e) {
      meta.innerHTML = `<span class="err">❌ ${String(e && e.message || e)}</span>`;
    } finally {
      runBtn.disabled = false;
    }
  });

  function renderTable(records) {
    if (!records.length) return `<div style="color:#9fb0c9;padding:8px">📭 該当データなし</div>`;
    const cols = new Set();
    records.forEach((r) => Object.keys(r).forEach((k) => k !== "attributes" && cols.add(k)));
    const headers = Array.from(cols);
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const head = `<tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>`;
    const rows = records.map((r) => `<tr>${headers.map((h) => {
      let v = r[h];
      if (v && typeof v === "object" && v.attributes) {
        // ネスト attributes → Name [Id] 平坦化
        const flds = Object.keys(v).filter((k) => k !== "attributes");
        const pref = ["Name", "Subject", "Title"].find((p) => flds.includes(p) && v[p]);
        v = pref ? `${v[pref]}${v.Id ? ` [${v.Id.substring(0,18)}]` : ""}` : JSON.stringify(v);
      }
      return `<td>${esc(typeof v === "object" ? JSON.stringify(v) : v)}</td>`;
    }).join("")}</tr>`).join("");
    return `<table>${head}${rows}</table>`;
  }
})();
