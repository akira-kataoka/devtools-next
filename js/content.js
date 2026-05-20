// content_script: SF ページ上で動作する軽量機能
// - コンテキストメニューからの copy 要求
// - v2.7.0+: 右下 floating launcher → mini-panel オーバーレイ (SOQL 簡易実行)

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "sfdt:copy" && typeof msg.text === "string") {
    navigator.clipboard.writeText(msg.text).then(() => {
      flashToast("クリップボードにコピーしました: " + msg.text);
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
      .hdr-title { color: #1b96ff; font-weight: 700; font-size: 13px; }
      .hdr-mode {
        flex: 1;
        font-size: 10px; font-weight: 700; letter-spacing: 0.4px;
        padding: 2px 8px; border-radius: 10px;
        background: rgba(46,204,113,0.18); color: #2ecc71;
        border: 1px solid rgba(46,204,113,0.4);
      }
      .hdr-close, .hdr-open {
        background: transparent; border: 1px solid #1f2c46;
        color: #9fb0c9; padding: 3px 10px; border-radius: 4px;
        cursor: pointer; font-size: 11px; font-weight: 600;
      }
      .hdr-close:hover { color: #ff6b6b; border-color: #ff6b6b; }
      /* v2.79.0: hdr-open は SF 上から全画面 UI へ誘導する重要動線。アクセントカラーで強調 */
      .hdr-open {
        background: rgba(27,150,255,0.12);
        color: #1b96ff; border-color: rgba(27,150,255,0.5);
      }
      .hdr-open:hover { background: #1b96ff; color: #fff; border-color: #1b96ff; }
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
      .result th { background: #112042; color: #1b96ff; padding: 3px 6px; text-align: left; position: sticky; top: 0; cursor: pointer; user-select: none; }
      .result th:hover { background: #1a2d56; }
      .result th[data-sort-dir="asc"]::after { content: " ▲"; font-size: 8px; opacity: 0.8; }
      .result th[data-sort-dir="desc"]::after { content: " ▼"; font-size: 8px; opacity: 0.8; }
      .result td { padding: 3px 6px; border-bottom: 1px solid #1f2c46; vertical-align: top; max-width: 200px; word-break: break-word; }
      .err { color: #ff6b6b; }
      .ok { color: #2ecc71; }
      /* v2.85.0 Team M: 現在ページレコード即操作 */
      .quick-row {
        display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
        padding: 8px 10px; margin-bottom: 8px;
        background: rgba(27,150,255,0.06);
        border: 1px solid #1f2c46; border-left: 3px solid #1b96ff;
        border-radius: 6px;
        font-size: 11px;
      }
      .quick-label { color: #9fb0c9; font-weight: 700; }
      .quick-info { color: #1b96ff; font-family: ui-monospace, Consolas, monospace; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .quick-btn {
        background: transparent; border: 1px solid #1f2c46;
        color: #1b96ff; padding: 3px 8px; border-radius: 4px;
        cursor: pointer; font-size: 11px;
      }
      .quick-btn:hover { background: #1b96ff; color: #fff; border-color: #1b96ff; }
      .quick-btn:disabled { opacity: 0.4; cursor: default; }
      /* v2.86.0 Team K: SOQL 履歴チップ */
      .history-row {
        display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
        margin-bottom: 6px;
        font-size: 10px;
      }
      .history-row:empty { display: none; }
      .history-label { color: #9fb0c9; }
      .history-chip {
        background: rgba(46,204,113,0.10);
        border: 1px solid rgba(46,204,113,0.3);
        color: #2ecc71;
        padding: 2px 8px; border-radius: 10px;
        font-size: 10px; cursor: pointer;
        font-family: ui-monospace, Consolas, monospace;
        max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .history-chip:hover { background: #2ecc71; color: #fff; }
    </style>
    <button class="launcher" id="lnch" title="DevToolsNext のミニパネルを開く (Salesforce 上で簡易 SOQL を実行できます)" aria-label="DevToolsNext ミニパネルを開く">🛠</button>
    <div class="panel" id="pnl" role="dialog" aria-label="DevToolsNext ミニパネル">
      <div class="hdr">
        <span class="hdr-title">🛠 DevToolsNext</span>
        <span class="hdr-mode" title="ユーザーモード — Salesforce 画面上で軽量に SOQL を実行できます">👤 ユーザー</span>
        <button class="hdr-open" id="opn" title="DevToolsNext を新しいタブで全画面起動します (SOQL/Inspector/設計書など全機能)" aria-label="DevToolsNext を全画面で開く">↗ 全画面</button>
        <button class="hdr-close" id="cls" title="ミニパネルを閉じます" aria-label="ミニパネルを閉じる">✕</button>
      </div>
      <div class="body">
        <!-- v2.85.0 Team M: 現在ページのレコード即操作ボタン -->
        <div class="quick-row" id="quickRow">
          <span class="quick-label">📍 現在のレコード:</span>
          <span class="quick-info" id="quickInfo">--</span>
          <button class="quick-btn" id="qCopyId" title="現在ページのレコード ID をクリップボードにコピー">📋 ID コピー</button>
          <button class="quick-btn" id="qOpenNew" title="現在のレコードを新しいタブで開く">↗ 新タブ</button>
          <button class="quick-btn" id="qRelated" title="現在のオブジェクトの最近 5 件を一覧表示">🔎 最近 5 件</button>
        </div>
        <!-- v2.86.0 Team K: 直近 SOQL クエリ 3 件をチップ表示 (ワンクリック再実行) -->
        <div class="history-row" id="histRow"></div>
        <textarea id="qry" placeholder="SELECT Id, Name FROM Account LIMIT 5" spellcheck="false">SELECT Id, Name FROM Account ORDER BY CreatedDate DESC LIMIT 5</textarea>
        <div class="row">
          <button class="hdr-close" id="useId" title="現在のページのレコード ID を WHERE Id='...' でクエリに挿入します" style="border-color:#1b96ff;color:#1b96ff">📋 ID をクエリに挿入</button>
          <button class="hdr-close" id="copyCsv" title="クエリ結果を CSV としてクリップボードにコピーします">📋 CSV コピー</button>
          <button class="hdr-close" id="dlCsv" title="クエリ結果を CSV ファイルとしてダウンロードします">📥 CSV DL</button>
          <span class="meta" id="mta">Ctrl+Enter でクエリを実行できます</span>
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
  const copyCsvBtn = $("copyCsv");
  const dlCsvBtn = $("dlCsv");
  const qCopyIdBtn = $("qCopyId");
  const qOpenNewBtn = $("qOpenNew");
  const quickInfo = $("quickInfo");
  const qry = $("qry");
  const runBtn = $("run");
  const meta = $("mta");
  const res = $("res");
  let lastRecs = []; // v2.10.0: CSV コピー用に最終結果保持

  // v2.85.0 Team M: パネルを開いた時に現在ページの ID を quick-row に表示
  const updateQuickInfo = () => {
    const info = extractRecordContext();
    if (info && info.id) {
      quickInfo.textContent = `${info.obj || "?"}:${info.id}`;
      qCopyIdBtn.disabled = false;
      qOpenNewBtn.disabled = false;
    } else {
      quickInfo.textContent = "(レコードページ以外 — 詳細画面で利用可能)";
      qCopyIdBtn.disabled = true;
      qOpenNewBtn.disabled = true;
    }
  };
  qCopyIdBtn.addEventListener("click", () => {
    const info = extractRecordContext();
    if (!info || !info.id) return;
    navigator.clipboard.writeText(info.id).then(() => {
      meta.innerHTML = `<span class="ok">📋 レコード ID をコピーしました: ${info.id}</span>`;
    });
  });
  qOpenNewBtn.addEventListener("click", () => {
    const info = extractRecordContext();
    if (!info || !info.id) return;
    const url = `${location.origin}/lightning/r/${info.obj || "Account"}/${info.id}/view`;
    window.open(url, "_blank");
    meta.innerHTML = `<span class="ok">↗ 新しいタブで開きました: ${info.obj || "?"}:${info.id}</span>`;
  });
  dlCsvBtn.addEventListener("click", () => {
    if (!lastRecs.length) {
      meta.innerHTML = `<span class="err">⚠ 先にクエリを実行してください</span>`;
      return;
    }
    // 簡易 CSV 変換 (content.js は外部依存を持たない設計のためインライン実装)
    const cols = new Set();
    lastRecs.forEach((r) => Object.keys(r).forEach((k) => k !== "attributes" && cols.add(k)));
    const headers = Array.from(cols);
    const esc = (v) => {
      if (v == null) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(","), ...lastRecs.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soql-mini-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    meta.innerHTML = `<span class="ok">📥 CSV ダウンロード: ${lastRecs.length} 件</span>`;
  });

  launcher.addEventListener("click", () => {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) {
      updateQuickInfo();
      setTimeout(() => qry.focus(), 30);
    }
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
      meta.innerHTML = `<span class="err">⚠ 現在のページからレコード ID を取得できませんでした (レコード詳細ページで再度お試しください)</span>`;
      return;
    }
    // SELECT Id, Name FROM <Object> WHERE Id = '<id>' 形式で生成 (既存 textarea は置換)
    const tpl = `SELECT Id, Name FROM ${info.obj || "Account"} WHERE Id = '${info.id}' LIMIT 1`;
    qry.value = tpl;
    qry.focus();
    meta.innerHTML = `<span class="ok">📋 ${info.obj || "?"}:${info.id} をクエリに挿入しました</span>`;
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
        meta.innerHTML = `<span class="err">❌ セッション (sid) を取得できませんでした。本タブで Salesforce にログイン済みかご確認ください</span>`;
        return;
      }
      const r = await chrome.runtime.sendMessage({
        type: "sfdt:soql",
        payload: { host, sid: sessionResp.session.sid, soql, apiVersion: "62.0" },
      });
      if (!r || !r.ok) {
        meta.innerHTML = `<span class="err">❌ クエリ実行に失敗しました (HTTP ${r ? r.status : "?"})</span>`;
        res.textContent = JSON.stringify(r && r.data, null, 2);
        return;
      }
      const recs = (r.data && r.data.records) || [];
      lastRecs = recs;
      meta.innerHTML = `<span class="ok">✓ ${recs.length} 件を取得しました</span>`;
      res.innerHTML = renderTable(recs);
    } catch (e) {
      meta.innerHTML = `<span class="err">❌ クエリ実行でエラーが発生しました: ${String(e && e.message || e)}</span>`;
    } finally {
      runBtn.disabled = false;
    }
  });

  // CSV コピー
  copyCsvBtn.addEventListener("click", async () => {
    if (!lastRecs.length) { meta.innerHTML = `<span class="err">📭 コピー対象のデータがありません</span>`; return; }
    try {
      const cols = new Set();
      lastRecs.forEach((r) => Object.keys(r).forEach((k) => k !== "attributes" && cols.add(k)));
      const headers = Array.from(cols);
      const flatten = (v) => {
        if (v == null) return "";
        if (typeof v === "object") {
          if (v.attributes) {
            const f = Object.keys(v).filter((k) => k !== "attributes");
            const pref = ["Name", "Subject", "Title"].find((p) => f.includes(p) && v[p]);
            return pref ? `${v[pref]}${v.Id ? ` [${v.Id.substring(0, 18)}]` : ""}` : JSON.stringify(v);
          }
          return JSON.stringify(v);
        }
        const s = String(v);
        const m = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
        return m ? `${m[1]} ${m[2]}` : s;
      };
      const esc = (v) => `"${flatten(v).replace(/"/g, '""')}"`;
      const lines = [headers.map((h) => `"${h}"`).join(",")];
      for (const r of lastRecs) lines.push(headers.map((h) => esc(r[h])).join(","));
      await navigator.clipboard.writeText(lines.join("\n"));
      meta.innerHTML = `<span class="ok">📋 CSV ${lastRecs.length} 行をクリップボードにコピーしました</span>`;
    } catch (e) {
      meta.innerHTML = `<span class="err">❌ クリップボードへのコピーに失敗しました: ${String(e.message || e)}</span>`;
    }
  });

  function renderTable(records) {
    if (!records.length) return `<div style="color:#9fb0c9;padding:8px">📭 該当データはありません</div>`;
    const cols = new Set();
    records.forEach((r) => Object.keys(r).forEach((k) => k !== "attributes" && cols.add(k)));
    const headers = Array.from(cols);
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const isLikelyId = (v) => /^[a-zA-Z0-9]{15,18}$/.test(v) && /[a-zA-Z]/.test(v) && /\d/.test(v);
    const head = `<tr>${headers.map((h) => `<th data-col="${esc(h)}">${esc(h)}</th>`).join("")}</tr>`;
    const rows = records.map((r) => `<tr>${headers.map((h) => {
      let v = r[h];
      if (v && typeof v === "object" && v.attributes) {
        const flds = Object.keys(v).filter((k) => k !== "attributes");
        const pref = ["Name", "Subject", "Title"].find((p) => flds.includes(p) && v[p]);
        v = pref ? `${v[pref]}${v.Id ? ` [${v.Id.substring(0,18)}]` : ""}` : JSON.stringify(v);
      }
      const display = typeof v === "object" ? JSON.stringify(v) : (v == null ? "" : v);
      // v2.9.0: ID セルは click で 全フィールド SOQL ループ
      if (isLikelyId(display)) {
        return `<td class="cell-id" data-id="${esc(display)}" title="Click で全フィールド表示" style="cursor:pointer;color:#1b96ff;text-decoration:underline">${esc(display)}</td>`;
      }
      return `<td>${esc(display)}</td>`;
    }).join("")}</tr>`).join("");
    setTimeout(() => {
      res.querySelectorAll("td.cell-id").forEach((td) => {
        td.addEventListener("click", () => {
          const id = td.dataset.id;
          if (!id) return;
          const fromMatch = qry.value.match(/FROM\s+(\w+)/i);
          const obj = fromMatch ? fromMatch[1] : "Account";
          qry.value = `SELECT FIELDS(STANDARD) FROM ${obj} WHERE Id = '${id}' LIMIT 1`;
          meta.innerHTML = `<span class="ok">🔍 ${obj}:${id} の全標準フィールドを検索します</span>`;
          runBtn.click();
        });
      });
      // v2.10.0: 列ヘッダ click でソート (asc → desc → unsort)
      res.querySelectorAll("th[data-col]").forEach((th) => {
        th.addEventListener("click", () => {
          const cur = th.dataset.sortDir || "";
          const next = cur === "asc" ? "desc" : (cur === "desc" ? "" : "asc");
          res.querySelectorAll("th[data-col]").forEach((o) => { delete o.dataset.sortDir; });
          if (next) th.dataset.sortDir = next;
          const tbody = th.closest("table");
          const allRows = Array.from(tbody.querySelectorAll("tr")).filter((tr) => !tr.querySelector("th"));
          const idx = Array.prototype.indexOf.call(th.parentElement.children, th);
          if (!next) {
            // 元順序に戻す (lastRecs から再描画)
            res.innerHTML = renderTable(lastRecs);
            return;
          }
          const dir = next === "asc" ? 1 : -1;
          allRows.sort((a, b) => {
            const av = a.cells[idx] ? a.cells[idx].textContent : "";
            const bv = b.cells[idx] ? b.cells[idx].textContent : "";
            const an = parseFloat(av), bn = parseFloat(bv);
            if (!isNaN(an) && !isNaN(bn) && /^-?\d+(\.\d+)?$/.test(av.trim()) && /^-?\d+(\.\d+)?$/.test(bv.trim())) {
              return (an - bn) * dir;
            }
            return av.localeCompare(bv, "ja") * dir;
          });
          allRows.forEach((tr) => tbody.appendChild(tr));
        });
      });
    }, 0);
    return `<table>${head}${rows}</table>`;
  }
})();
