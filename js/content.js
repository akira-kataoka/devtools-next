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
      /* v3.21.0: 開閉アニメーション磨き — display:none 廃止し opacity+transform で fade-in-up */
      .panel {
        position: fixed; right: 16px; bottom: 70px;
        width: 480px; max-height: 60vh; display: flex; flex-direction: column;
        background: #0b1220; color: #e6ecf5;
        border: 1px solid #1f2c46; border-radius: 10px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        overflow: hidden;
        opacity: 0; transform: translateY(8px) scale(0.98);
        pointer-events: none;
        transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .panel.open {
        opacity: 1; transform: translateY(0) scale(1);
        pointer-events: auto;
      }
      @media (prefers-reduced-motion: reduce) {
        .panel { transition: none; }
        .launcher { transition: none; }
      }
      .hdr {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 12px;
        background: linear-gradient(180deg, #112042 0%, #0b1220 100%);
        border-bottom: 1px solid #1f2c46;
      }
      .hdr-title { color: #1b96ff; font-weight: 700; font-size: 13px; }
      /* v3.41.0: mini-panel ヘッダにも versionBadge (3 モード versionBadge 完全揃い) */
      .hdr-ver {
        font-size: 10px; font-weight: 700;
        background: rgba(27,150,255,0.15); color: #1b96ff;
        padding: 2px 7px; border-radius: 10px;
        cursor: help;
      }
      .hdr-mode {
        font-size: 10px; font-weight: 700; letter-spacing: 0.4px;
        padding: 2px 8px; border-radius: 10px;
        background: rgba(46,204,113,0.18); color: #2ecc71;
        border: 1px solid rgba(46,204,113,0.4);
      }
      /* v3.198.0 Phase 288: 環境 (Sandbox/PROD) バッジ — PROD はパルス警告 */
      .hdr-env {
        flex: 1;
        font-size: 10px; font-weight: 700; letter-spacing: 0.4px;
        padding: 2px 8px; border-radius: 10px;
        cursor: help;
      }
      .hdr-env.env-sandbox {
        background: rgba(243,156,18,0.18); color: #f39c12;
        border: 1px solid rgba(243,156,18,0.5);
      }
      .hdr-env.env-prod {
        background: rgba(255,107,107,0.22); color: #ff6b6b;
        border: 1px solid rgba(255,107,107,0.6);
        animation: envProdPulse 2.4s ease-in-out infinite;
      }
      @keyframes envProdPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(255,107,107,0.0); }
        50% { box-shadow: 0 0 0 4px rgba(255,107,107,0.18); }
      }
      @media (prefers-reduced-motion: reduce) {
        .hdr-env.env-prod { animation: none; }
      }
      .hdr-close, .hdr-open {
        background: transparent; border: 1px solid #1f2c46;
        color: #9fb0c9; padding: 3px 10px; border-radius: 4px;
        cursor: pointer; font-size: 11px; font-weight: 600;
        transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
      }
      .hdr-close:hover { color: #ff6b6b; border-color: #ff6b6b; }
      .hdr-close:focus-visible, .hdr-open:focus-visible, .quick-btn:focus-visible, button.primary:focus-visible {
        outline: 2px solid #1b96ff; outline-offset: 1px;
      }
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
      /* v3.52.0: mini-panel textarea カーソル位置インジケータ (panel/tool と同様の 3 モード統一) */
      .cursor-pos-wrap { position: relative; display: block; }
      .cursor-pos-wrap > textarea { width: 100%; }
      .cursor-pos-badge {
        position: absolute; right: 6px; bottom: 4px;
        background: rgba(11,18,32,0.85); color: #9fb0c9;
        padding: 1px 6px; border-radius: 8px;
        font: 9px ui-monospace, Consolas, monospace;
        pointer-events: none; user-select: none;
        border: 1px solid #1f2c46;
        white-space: nowrap;
      }
      .cursor-pos-wrap > textarea:focus + .cursor-pos-badge {
        color: #1b96ff; border-color: #1b96ff;
      }
      .row { display: flex; gap: 6px; margin-top: 6px; align-items: center; }
      .row .meta { color: #9fb0c9; font-size: 10px; flex: 1; }
      button.primary {
        background: #1b96ff; color: #fff; border: none;
        padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;
        transition: background 0.12s ease, transform 0.05s ease;
      }
      button.primary:hover { background: #0c66e4; }
      button.primary:active:not(:disabled) { transform: translateY(1px); }
      button.primary:disabled { opacity: 0.5; cursor: default; }
      .result {
        margin-top: 8px; max-height: 280px; overflow: auto;
        background: #0a1224; border: 1px solid #1f2c46; border-radius: 6px;
        padding: 6px 8px; font: 11px/1.4 ui-monospace, Consolas, monospace;
      }
      .result table { width: 100%; border-collapse: collapse; font-size: 11px; }
      /* v3.35.0: ソート可能列の視覚マーカー (panel と統一トーン) */
      .result th { background: #112042; color: #1b96ff; padding: 3px 18px 3px 6px; text-align: left; position: sticky; top: 0; cursor: pointer; user-select: none; position: relative; }
      .result th:hover { background: #1a2d56; }
      .result th::after {
        content: "⇅"; position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
        font-size: 8px; opacity: 0.35; transition: opacity 0.12s ease;
      }
      .result th:hover::after { opacity: 0.7; }
      .result th[data-sort-dir="asc"]::after { content: "▲"; opacity: 1; }
      .result th[data-sort-dir="desc"]::after { content: "▼"; opacity: 1; }
      .result td { padding: 3px 6px; border-bottom: 1px solid #1f2c46; vertical-align: top; max-width: 200px; word-break: break-word; }
      /* v3.17.0: 空状態ガイドを panel/tool と統一トーンで mini-panel にも展開 */
      .empty-state {
        padding: 14px 12px; color: #9fb0c9;
        font-size: 11px; line-height: 1.7;
        background: linear-gradient(180deg, rgba(27,150,255,0.06) 0%, transparent 100%);
        border-radius: 4px;
      }
      .empty-state strong { color: #1b96ff; font-weight: 600; }
      .empty-state code {
        background: #142447; color: #e6ecf5;
        padding: 1px 4px; border-radius: 3px;
        font-size: 10px; border: 1px solid #1f2c46;
      }
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
        cursor: pointer; font-size: 11px; font-weight: 600;
        transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
      }
      .quick-btn:hover { background: #1b96ff; color: #fff; border-color: #1b96ff; }
      .quick-btn:active:not(:disabled) { transform: translateY(1px); }
      .quick-btn:disabled { opacity: 0.4; cursor: default; }
      /* v2.94.0: mini-panel SOQL オートコンプリート (ユーザー要望「ユーザーモードでも入力補助が欲しい」) */
      .ac-pop {
        position: absolute; left: 12px; right: 12px;
        max-height: 180px; overflow-y: auto;
        background: #0a1224; border: 1px solid #1b96ff;
        border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        z-index: 100;
      }
      .ac-pop .ac-item { padding: 4px 8px; cursor: pointer; font-size: 11px; color: #e6ecf5; font-family: ui-monospace, Consolas, monospace; }
      .ac-pop .ac-item:hover, .ac-pop .ac-item.selected { background: rgba(27,150,255,0.2); color: #fff; }
      .ac-pop .ac-lbl { color: #9fb0c9; font-size: 9px; margin-left: 6px; }
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
        <span class="hdr-ver" id="hdrVer" title="現在の拡張バージョン">v?</span>
        <span class="hdr-mode" title="ユーザーモード — Salesforce 画面上で軽量に SOQL を実行できます">👤 ユーザー</span>
        <span class="hdr-env" id="hdrEnv" title="現在の組織環境 (Sandbox / Production) — PROD は誤操作防止のため警告表示 (Phase 288)"></span>
        <button class="hdr-open" id="opn" title="DevToolsNext を新しいタブで全画面起動します (SOQL/Inspector/設計書など全機能)" aria-label="DevToolsNext を全画面で開く">↗ 全画面</button>
        <button class="hdr-open" id="opnSearch" title="🌐 グローバル検索 (SOSL) を全画面で開きます — Account/Contact/Lead 等を横断検索 (Phase 243)" aria-label="グローバル検索を全画面で開く">🌐 検索</button>
        <button class="hdr-open" id="opnAdmin" title="👥 ユーザー・ライセンス管理ダッシュボード (7 カード) を全画面で開きます — ライセンス使用率 / 凍結ユーザー / MFA / パッケージ / 組織情報 / ストレージ等を 1 画面で確認 (Phase 244)" aria-label="ユーザー・ライセンス管理を全画面で開く">👥 管理</button>
        <button class="hdr-close" id="cls" title="ミニパネルを閉じます" aria-label="ミニパネルを閉じる">✕</button>
      </div>
      <div class="body">
        <!-- v2.85.0 Team M: 現在ページのレコード即操作ボタン -->
        <div class="quick-row" id="quickRow">
          <span class="quick-label">📍 現在のレコード:</span>
          <span class="quick-info" id="quickInfo">--</span>
          <button class="quick-btn" id="qCopyId" title="現在ページのレコード ID をクリップボードにコピー">📋 ID コピー</button>
          <button class="quick-btn" id="qCopyMd" title="📝 「[Object:Id](URL)」形式の Markdown リンクをコピー — Slack / バグ報告書 / Confluence 等に貼り付け可能 (Phase 256、3 モード整合)">📝 MD</button>
          <button class="quick-btn" id="qOpenNew" title="現在のレコードを新しいタブで開く">↗ 新タブ</button>
          <button class="quick-btn" id="qRelated" title="現在のオブジェクトの最近 5 件を一覧表示">🔎 最近 5 件</button>
          <button class="quick-btn" id="qDescribe" title="📐 現在のオブジェクト構造 (describe) を全画面で表示 — 全項目/型/必須/参照先を統計サマリ付きで確認 (Phase 276)">📐 構造</button>
          <button class="quick-btn" id="qInspector" title="🔎 現在のレコードを全画面 Inspector で開く — 全項目/関連レコード/編集/エビデンス取得など高機能版 (Phase 278)">🔎 Inspector</button>
        </div>
        <!-- v2.86.0 Team K: 直近 SOQL クエリ 3 件をチップ表示 (ワンクリック再実行) -->
        <div class="history-row" id="histRow"></div>
        <!-- v3.72.0: SOQL テンプレート挿入 (panel/tool と統一、3 モード UX 整合性) -->
        <div class="row" style="margin-bottom:6px">
          <select id="qryTemplate" title="よく使う SOQL のサンプルを選んでエディタへ挿入します (上書き)。Phase 313 で 3 カテゴリにグルーピング" style="flex:1;background:#0a1224;color:#e6ecf5;border:1px solid #1f2c46;border-radius:4px;padding:4px 6px;font-size:11px">
            <option value="">📝 サンプル挿入… (13 種、3 カテゴリ)</option>
            <optgroup label="🏢 基本 (営業/開発)">
              <option value="recent_accounts">🏢 最近作成された取引先 10 件</option>
              <option value="active_users">👥 アクティブユーザー一覧</option>
              <option value="last_modified">🕒 過去 7 日に更新された取引先</option>
              <option value="my_open_cases">📬 未解決 Case (Owner.Name = '私')</option>
            </optgroup>
            <optgroup label="💰 業務 (Phase 306/323/336/343)">
              <option value="recent_contacts">👤 最近作成された取引先責任者 10 件</option>
              <option value="top_revenue">💰 売上 Top 10 取引先</option>
              <option value="stale_cases">⏰ 長期未対応 Case 30 日超 (SLA 違反候補)</option>
              <option value="closing_this_month">📅 今月クローズ予定の Opportunity (Phase 323)</option>
              <option value="my_open_leads">🎯 自分が担当の Open Lead (Phase 336)</option>
              <option value="closed_lost_recent">📭 過去 30 日に失注した Opportunity (Phase 343)</option>
            </optgroup>
            <optgroup label="🛡️ 管理者・セキュリティ (Phase 253/312)">
              <option value="frozen_users">❄️ 凍結ユーザー一覧</option>
              <option value="large_files">📁 大型 ContentVersion Top 20</option>
              <option value="setup_audit">📋 設定変更履歴 (Setup Audit Trail) 最新 30 件</option>
            </optgroup>
          </select>
        </div>
        <textarea id="qry" placeholder="SOQL を入力 (例: SELECT Id, Name FROM Account LIMIT 5) / Ctrl+Enter で実行 / 入力中に候補表示" spellcheck="false" title="軽量 SOQL 実行ツールです。上の『📋 ID をクエリに挿入』で現在レコードの WHERE Id='...' を簡単挿入できます。Tooling API オブジェクトは利用できません — 全機能は ↗ 全画面 (開発者モード) で">SELECT Id, Name FROM Account ORDER BY CreatedDate DESC LIMIT 5</textarea>
        <div class="row">
          <button class="hdr-close" id="useId" title="現在のページのレコード ID を WHERE Id='...' でクエリに挿入します" style="border-color:#1b96ff;color:#1b96ff">📋 ID をクエリに挿入</button>
          <button class="hdr-close" id="copyCsv" title="クエリ結果を CSV としてクリップボードにコピーします">📋 CSV コピー</button>
          <button class="hdr-close" id="copyMd" title="📝 クエリ結果を Markdown テーブル形式でクリップボードにコピー — Slack / Confluence / Notion 等に貼り付け可能 (Phase 263、3 モード整合性)">📝 MD</button>
          <button class="hdr-close" id="dlCsv" title="クエリ結果を CSV ファイルとしてダウンロードします">📥 CSV DL</button>
          <button class="hdr-close" id="runFull" title="↗ 現在の SOQL を全画面 panel に転送して実行 — Tooling API / 編集 / 一括 DML / オートコンプリート等の高機能版 (Phase 279、?q= URL クエリ経由)">↗ 全画面で実行</button>
          <span class="meta" id="mta">Ctrl+Enter でクエリを実行できます</span>
          <button class="primary" id="run">▶ 実行</button>
        </div>
        <div class="result" id="res"><div class="empty-state" title="📋 ID をクエリに挿入 = 現在レコードを WHERE 句へ / 🔎 最近 5 件 = 同オブジェクトの直近データ / 複雑な操作は ↗ 全画面 で">👆 SOQL を入力して <strong>Ctrl+Enter</strong> または「▶ 実行」</div></div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const $ = (id) => shadow.getElementById(id);
  const launcher = $("lnch");
  const panel = $("pnl");
  const closeBtn = $("cls");
  const openFullBtn = $("opn");
  // v3.41.0: mini-panel ヘッダの versionBadge を manifest から設定 (3 モード versionBadge 完全揃い)
  const hdrVer = $("hdrVer");
  if (hdrVer && chrome.runtime && chrome.runtime.getManifest) {
    try {
      const v = chrome.runtime.getManifest().version;
      hdrVer.textContent = "v" + v;
      hdrVer.title = `現在の拡張バージョン v${v} (popup から ⬆ アップデート可能)`;
    } catch (e) { /* manifest 取得不可な環境では何もしない */ }
  }
  // v3.198.0 Phase 288: ENV (Sandbox/PROD) バッジを location.hostname から判定
  // Sandbox URL 例: my-org--sandbox.sandbox.my.salesforce.com / my-org--dev.sandbox.my.salesforce.com
  // Production URL 例: my-org.my.salesforce.com / login.salesforce.com
  const hdrEnv = $("hdrEnv");
  if (hdrEnv) {
    try {
      const host = (location.hostname || "").toLowerCase();
      const isSandbox = host.includes(".sandbox.") || host.includes(".cs") || host === "test.salesforce.com";
      if (isSandbox) {
        hdrEnv.textContent = "🧪 Sandbox";
        hdrEnv.classList.add("env-sandbox");
        hdrEnv.title = `Sandbox 環境 (${host}) — テスト用組織です。本番影響なし`;
      } else {
        hdrEnv.textContent = "⚠ PROD";
        hdrEnv.classList.add("env-prod");
        hdrEnv.title = `本番組織 (Production) — ${host} — UPDATE/DELETE 操作は実データに影響します。慎重に！`;
      }
    } catch { /* host 取得不可は無視 */ }
  }
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
  const histRow = $("histRow");
  const qryTemplate = $("qryTemplate");
  // mini-panel ではセッション情報からユーザー username を保持 (my_open_cases テンプレ用)
  // 必要時にのみ取得 (起動時の固定オーバーヘッドを回避)
  let sessionUser = null;

  // v3.72.0: mini-panel SOQL テンプレート挿入 (panel/tool と統一、4 種類に絞って軽量化)
  if (qryTemplate) {
    qryTemplate.addEventListener("change", (e) => {
      const key = e.target.value;
      if (!key) return;
      const TEMPLATES = {
        recent_accounts: `SELECT Id, Name, Industry, CreatedDate\nFROM Account\nORDER BY CreatedDate DESC\nLIMIT 10`,
        active_users: `SELECT Id, Name, Email, IsActive\nFROM User\nWHERE IsActive = true\nORDER BY Name\nLIMIT 50`,
        last_modified: `SELECT Id, Name, LastModifiedDate, LastModifiedBy.Name\nFROM Account\nWHERE LastModifiedDate = LAST_N_DAYS:7\nORDER BY LastModifiedDate DESC\nLIMIT 50`,
        my_open_cases: `SELECT Id, CaseNumber, Subject, Status, Priority, CreatedDate\nFROM Case\nWHERE Owner.Username = '${(sessionUser && sessionUser.username) || "PASTE_USERNAME"}' AND IsClosed = false\nORDER BY Priority ASC, CreatedDate DESC\nLIMIT 30`,
        // v3.163.0 Phase 253: 管理者向けテンプレ 2 種追加 (3 モード整合性継続)
        frozen_users: `SELECT UserId, User.Name, User.Username, User.Profile.Name\nFROM UserLogin\nWHERE IsFrozen = true\nORDER BY User.Name\nLIMIT 50`,
        large_files: `SELECT Id, Title, FileExtension, ContentSize, CreatedBy.Name\nFROM ContentVersion\nWHERE IsLatest = true\nORDER BY ContentSize DESC\nLIMIT 20`,
        // v3.216.0 Phase 306: 業務シナリオ向け 3 種追加
        stale_cases: `SELECT Id, CaseNumber, Subject, Status, Priority, Owner.Name, CreatedDate\nFROM Case\nWHERE IsClosed = false AND CreatedDate < LAST_N_DAYS:30\nORDER BY CreatedDate ASC\nLIMIT 50`,
        recent_contacts: `SELECT Id, Name, Email, Phone, Account.Name, CreatedDate\nFROM Contact\nORDER BY CreatedDate DESC\nLIMIT 10`,
        top_revenue: `SELECT Id, Name, AnnualRevenue, Industry, Owner.Name\nFROM Account\nWHERE AnnualRevenue != null\nORDER BY AnnualRevenue DESC NULLS LAST\nLIMIT 10`,
        // v3.222.0 Phase 312: セキュリティ監査向け Setup Audit Trail (180 日保持)
        setup_audit: `SELECT Id, Action, Section, Display, CreatedBy.Name, CreatedDate, DelegateUser\nFROM SetupAuditTrail\nORDER BY CreatedDate DESC\nLIMIT 30`,
        // v3.233.0 Phase 323: 営業向け業務シナリオ — 今月クローズ予定 Opportunity
        closing_this_month: `SELECT Id, Name, StageName, Amount, CloseDate, Account.Name, Owner.Name\nFROM Opportunity\nWHERE CloseDate = THIS_MONTH AND IsClosed = false\nORDER BY CloseDate ASC, Amount DESC NULLS LAST\nLIMIT 50`,
        // v3.246.0 Phase 336: 営業向け業務シナリオ — 自分が担当の Open Lead
        my_open_leads: `SELECT Id, Name, Company, Status, Email, Phone, Industry, CreatedDate\nFROM Lead\nWHERE Owner.Username = '${(sessionUser && sessionUser.username) || "PASTE_USERNAME"}' AND IsConverted = false\nORDER BY CreatedDate DESC\nLIMIT 50`,
        // v3.253.0 Phase 343: 営業マネージャ向け業務シナリオ — 過去 30 日に失注した Opportunity (失注分析)
        closed_lost_recent: `SELECT Id, Name, StageName, Amount, CloseDate, Account.Name, Owner.Name, NextStep\nFROM Opportunity\nWHERE StageName = 'Closed Lost' AND CloseDate = LAST_N_DAYS:30\nORDER BY CloseDate DESC, Amount DESC NULLS LAST\nLIMIT 50`,
      };
      const code = TEMPLATES[key];
      if (!code) return;
      qry.value = code;
      qry.focus();
      qry.dispatchEvent(new Event("input", { bubbles: true }));
      e.target.value = ""; // リセット
      // toast 代わりに meta 領域に簡易表示
      if (meta) {
        if (key === "my_open_cases" && !(sessionUser && sessionUser.username)) {
          meta.innerHTML = `<span class="err">⚠ Username 未取得。"PASTE_USERNAME" を実 username に書き換えてください</span>`;
        } else {
          meta.innerHTML = `<span class="ok">📝 SOQL サンプルを挿入しました</span>`;
        }
      }
    });
  }

  // v3.52.0: mini-panel qry textarea にカーソル位置インジケータ (3 モード統一)
  if (qry && !qry.dataset.cursorPosAttached) {
    qry.dataset.cursorPosAttached = "true";
    const wrap = document.createElement("span");
    wrap.className = "cursor-pos-wrap";
    qry.parentNode.insertBefore(wrap, qry);
    wrap.appendChild(qry);
    const badge = document.createElement("span");
    badge.className = "cursor-pos-badge";
    badge.textContent = "L:1 C:1";
    badge.title = "現在のカーソル位置 (行:列) — SF エラーメッセージの行/列番号と照合できます";
    wrap.appendChild(badge);
    const updatePos = () => {
      const value = qry.value;
      const pos = qry.selectionStart || 0;
      const before = value.substring(0, pos);
      const line = (before.match(/\n/g) || []).length + 1;
      const lastNl = before.lastIndexOf("\n");
      const col = pos - (lastNl + 1) + 1;
      const totalLines = (value.match(/\n/g) || []).length + 1;
      badge.textContent = `L:${line}/${totalLines} C:${col}`;
    };
    ["input", "click", "keyup", "select", "focus"].forEach((ev) => qry.addEventListener(ev, updatePos));
    updatePos();
  }
  let lastRecs = []; // v2.10.0: CSV コピー用に最終結果保持

  // v3.44.0: SOQL 履歴を chrome.storage.local に永続化
  // v3.46.0: panel/tool と共有のキー sfdtRecentSoql に統一 (最大 5 件保存、mini-panel は先頭 3 件表示)
  const SHARED_KEY = "sfdtRecentSoql";
  const LEGACY_KEY = "sfdtMiniSoqlHistory"; // v3.44 互換: 旧キーから 1 回だけマイグレーション
  let _miniHistory = [];
  const loadMiniHistory = async () => {
    try {
      const data = await chrome.storage.local.get([SHARED_KEY, LEGACY_KEY]);
      let list = Array.isArray(data[SHARED_KEY]) ? data[SHARED_KEY] : [];
      // 旧キーから移行 (SHARED_KEY が空かつ LEGACY_KEY に値がある場合のみ)
      if (!list.length && Array.isArray(data[LEGACY_KEY]) && data[LEGACY_KEY].length) {
        list = data[LEGACY_KEY].slice(0, 5);
        await chrome.storage.local.set({ [SHARED_KEY]: list });
        await chrome.storage.local.remove(LEGACY_KEY);
      }
      _miniHistory = list.slice(0, 3);
    } catch { _miniHistory = []; }
    renderMiniHistory();
  };
  const pushMiniHistory = async (soql) => {
    const norm = String(soql || "").trim();
    if (!norm) return;
    try {
      const data = await chrome.storage.local.get(SHARED_KEY);
      const list = Array.isArray(data[SHARED_KEY]) ? data[SHARED_KEY] : [];
      const next = [norm, ...list.filter((q) => q !== norm)].slice(0, 5);
      await chrome.storage.local.set({ [SHARED_KEY]: next });
      _miniHistory = next.slice(0, 3);
      renderMiniHistory();
    } catch {}
  };
  // panel/tool 側で履歴が更新された場合に mini-panel も即時反映
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes[SHARED_KEY]) {
        _miniHistory = (changes[SHARED_KEY].newValue || []).slice(0, 3);
        renderMiniHistory();
      }
    });
  }
  const truncMiniLabel = (s, n) => (s.length > n ? s.substring(0, n) + "…" : s);
  const renderMiniHistory = () => {
    if (!histRow) return;
    if (!_miniHistory.length) { histRow.innerHTML = ""; return; }
    histRow.innerHTML = `<span class="history-label">最近のクエリ:</span>`;
    _miniHistory.forEach((soql) => {
      const chip = document.createElement("button");
      chip.className = "history-chip";
      chip.textContent = truncMiniLabel(soql, 40);
      chip.title = `クリックでこのクエリを再実行: ${soql}`;
      chip.addEventListener("click", () => {
        qry.value = soql;
        qry.focus();
        runBtn.click();
      });
      histRow.appendChild(chip);
    });
  };
  loadMiniHistory();

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
  // v3.186.0 Phase 276: 📐 構造 — 現在のオブジェクトの describe を全画面で開く (?view=describe&obj=)
  const qDescribeBtn = $("qDescribe");
  if (qDescribeBtn) qDescribeBtn.addEventListener("click", () => {
    const info = extractRecordContext();
    const obj = info && info.obj;
    try {
      const url = chrome.runtime.getURL(`html/tool.html?view=describe${obj ? `&obj=${encodeURIComponent(obj)}` : ""}`);
      window.open(url, "_blank");
      meta.innerHTML = `<span class="ok">📐 ${obj || "describe"} の構造を全画面で開きました</span>`;
    } catch (e) {
      meta.innerHTML = `<span class="err">❌ 構造画面を開けませんでした: ${e.message || e}</span>`;
    }
  });
  // v3.189.0 Phase 279: ↗ 全画面で実行 — 現在の SOQL を全画面 panel に転送して実行 (?view=soql&q=)
  const runFullBtn = $("runFull");
  if (runFullBtn) runFullBtn.addEventListener("click", () => {
    const q = (qry && qry.value || "").trim();
    if (!q) {
      meta.innerHTML = `<span class="err">⚠ SOQL を入力してください</span>`;
      return;
    }
    try {
      const url = chrome.runtime.getURL(`html/tool.html?view=soql&q=${encodeURIComponent(q)}`);
      window.open(url, "_blank");
      meta.innerHTML = `<span class="ok">↗ 全画面 panel で SOQL を実行しています…</span>`;
    } catch (e) {
      meta.innerHTML = `<span class="err">❌ 全画面起動に失敗: ${e.message || e}</span>`;
    }
  });
  // v3.188.0 Phase 278: 🔎 Inspector — 現在のレコードを全画面 Inspector で開く (?view=inspector&id=&obj=)
  const qInspectorBtn = $("qInspector");
  if (qInspectorBtn) qInspectorBtn.addEventListener("click", () => {
    const info = extractRecordContext();
    if (!info || !info.id) {
      meta.innerHTML = `<span class="err">⚠ レコードページで利用してください</span>`;
      return;
    }
    try {
      const qp = new URLSearchParams({ view: "inspector", id: info.id });
      if (info.obj) qp.set("obj", info.obj);
      const url = chrome.runtime.getURL(`html/tool.html?${qp.toString()}`);
      window.open(url, "_blank");
      meta.innerHTML = `<span class="ok">🔎 ${info.obj || "?"}:${info.id} を全画面 Inspector で開きました</span>`;
    } catch (e) {
      meta.innerHTML = `<span class="err">❌ Inspector を開けませんでした: ${e.message || e}</span>`;
    }
  });
  // v3.166.0 Phase 256: 📝 MD リンク (Slack/Confluence 貼付用 Markdown 形式コピー、Inspector Phase 255 と整合性)
  const qCopyMdBtn = $("qCopyMd");
  if (qCopyMdBtn) qCopyMdBtn.addEventListener("click", () => {
    const info = extractRecordContext();
    if (!info || !info.id) {
      meta.innerHTML = `<span class="err">⚠ レコードページで利用してください</span>`;
      return;
    }
    const obj = info.obj || "Record";
    const id = info.id;
    const url = `${location.origin}/lightning/r/${obj}/${id}/view`;
    // mini-panel では DOM の title を取得 (現在ページのレコード名)
    let displayName = "";
    try {
      const titleEl = document.querySelector("h1.slds-page-header__title, .slds-page-header__title, h1");
      if (titleEl) displayName = (titleEl.textContent || "").trim().substring(0, 80);
    } catch {}
    if (!displayName) displayName = `${obj}:${id}`;
    const md = `[${displayName}](${url}) — ${obj} \`${id}\``;
    navigator.clipboard.writeText(md).then(() => {
      meta.innerHTML = `<span class="ok">📝 Markdown リンクをコピーしました: ${displayName}</span>`;
    }).catch((e) => {
      meta.innerHTML = `<span class="err">❌ コピー失敗: ${e.message || e}</span>`;
    });
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
      // v3.73.0: 初回オープン時に sessionUser を lazy fetch (Phase 162 で導入した my_open_cases テンプレート用)
      if (!sessionUser) fetchSessionUser();
    }
  });

  // v3.73.0: sessionUser (username) を Chatter /users/me から取得して保持
  // Phase 162 の sessionUser は declare のみで populate されておらず "PASTE_USERNAME" 警告が常に出ていた問題を修正
  async function fetchSessionUser() {
    try {
      const host = location.hostname;
      const sess = await chrome.runtime.sendMessage({ type: "sfdt:getSession", host });
      if (!sess || !sess.ok || !sess.session) return;
      const r = await chrome.runtime.sendMessage({
        type: "sfdt:fetch",
        payload: { host, sid: sess.session.sid, path: `/services/data/v62.0/chatter/users/me`, method: "GET" },
      });
      if (r && r.ok && r.data && r.data.username) {
        sessionUser = { id: r.data.id, username: r.data.username, name: r.data.displayName };
        console.log("[DevToolsNext] mini-panel sessionUser loaded:", sessionUser.username);
      }
    } catch (e) { console.log("[DevToolsNext] mini-panel sessionUser fetch failed (ignored):", e); }
  }
  closeBtn.addEventListener("click", () => panel.classList.remove("open"));
  openFullBtn.addEventListener("click", () => {
    try {
      const url = chrome.runtime.getURL("html/tool.html");
      window.open(url, "_blank");
    } catch {}
  });
  // v3.153.0 Phase 243: グローバル検索を全画面で直接開く (URL クエリ ?view=search)
  const openSearchBtn = $("opnSearch");
  if (openSearchBtn) openSearchBtn.addEventListener("click", () => {
    try {
      const url = chrome.runtime.getURL("html/tool.html?view=search");
      window.open(url, "_blank");
    } catch {}
  });
  // v3.154.0 Phase 244: 管理ダッシュボードを全画面で直接開く (URL クエリ ?view=admin)
  const openAdminBtn = $("opnAdmin");
  if (openAdminBtn) openAdminBtn.addEventListener("click", () => {
    try {
      const url = chrome.runtime.getURL("html/tool.html?view=admin");
      window.open(url, "_blank");
    } catch {}
  });
  qry.addEventListener("keydown", (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") runBtn.click();
  });

  // v2.94.0 mini-panel SOQL オートコンプリート (FROM 後はオブジェクト、SELECT/WHERE 後は項目)
  let acPop = null, acItems = [], acIdx = 0, acStart = 0;
  let acObjsCache = null;
  const acFieldsCache = new Map();
  const acHide = () => { if (acPop) { acPop.remove(); acPop = null; } acItems = []; };
  const acGetObjs = async () => {
    if (acObjsCache) return acObjsCache;
    try {
      const host = location.hostname;
      const ss = await chrome.runtime.sendMessage({ type: "sfdt:getSession", host });
      if (!ss || !ss.ok) return [];
      // describe global を REST で
      const r = await chrome.runtime.sendMessage({
        type: "sfdt:fetch",
        payload: { host, sid: ss.session.sid, path: `/services/data/v62.0/sobjects/`, method: "GET" },
      });
      if (r && r.ok && r.data && Array.isArray(r.data.sobjects)) {
        acObjsCache = r.data.sobjects.filter((s) => s.queryable).map((s) => ({ name: s.name, label: s.label || "" }));
        return acObjsCache;
      }
    } catch {}
    return [];
  };
  const acGetFields = async (objName) => {
    if (!objName) return [];
    if (acFieldsCache.has(objName)) return acFieldsCache.get(objName);
    try {
      const host = location.hostname;
      const ss = await chrome.runtime.sendMessage({ type: "sfdt:getSession", host });
      if (!ss || !ss.ok) return [];
      const r = await chrome.runtime.sendMessage({
        type: "sfdt:fetch",
        payload: { host, sid: ss.session.sid, path: `/services/data/v62.0/sobjects/${encodeURIComponent(objName)}/describe`, method: "GET" },
      });
      if (r && r.ok && r.data && Array.isArray(r.data.fields)) {
        const fields = r.data.fields.map((f) => ({ name: f.name, label: f.label || "", type: f.type || "" }));
        acFieldsCache.set(objName, fields);
        return fields;
      }
    } catch {}
    return [];
  };
  const acRender = () => {
    if (!acItems.length) { acHide(); return; }
    if (!acPop) {
      acPop = document.createElement("div");
      acPop.className = "ac-pop";
      acPop.style.top = (qry.offsetTop + qry.offsetHeight + 2) + "px";
      qry.parentElement.appendChild(acPop);
    }
    acPop.innerHTML = acItems.map((it, i) =>
      `<div class="ac-item${i === acIdx ? " selected" : ""}" data-i="${i}">${it.name}<span class="ac-lbl">${it.label || ""}</span></div>`).join("");
    acPop.querySelectorAll(".ac-item").forEach((el) => {
      el.addEventListener("mousedown", (e) => { e.preventDefault(); acInsert(Number(el.dataset.i)); });
    });
  };
  const acInsert = (i) => {
    const cand = acItems[i]; if (!cand) return;
    const pos = qry.selectionStart;
    const before = qry.value.substring(0, acStart);
    const after = qry.value.substring(pos);
    qry.value = before + cand.name + after;
    const np = before.length + cand.name.length;
    qry.setSelectionRange(np, np);
    qry.focus();
    acHide();
  };
  const acUpdate = async () => {
    const text = qry.value;
    const pos = qry.selectionStart;
    const before = text.substring(0, pos);
    const wm = before.match(/([A-Za-z0-9_]*)$/);
    const word = wm ? wm[1] : "";
    acStart = pos - word.length;
    const ctx = before.substring(0, pos - word.length).trimEnd();
    const lk = ctx.match(/\b(FROM|SELECT|WHERE|AND|OR|ORDER\s+BY|GROUP\s+BY)\b[^A-Za-z_]*$/i) || ctx.match(/(,)\s*$/);
    if (!lk) { acHide(); return; }
    const kw = lk[1].toUpperCase().replace(/\s+/g, " ");
    const q = word.toLowerCase();
    if (kw === "FROM") {
      const objs = await acGetObjs();
      acItems = objs.filter((s) => !q || s.name.toLowerCase().startsWith(q) || s.label.toLowerCase().includes(q)).slice(0, 15);
    } else {
      // FROM オブジェクト取得 → 項目候補
      const fm = text.match(/\bFROM\s+([A-Za-z0-9_]+)/i);
      const obj = fm ? fm[1] : null;
      if (!obj) { acHide(); return; }
      const fields = await acGetFields(obj);
      acItems = fields.filter((f) => !q || f.name.toLowerCase().startsWith(q) || f.label.toLowerCase().includes(q)).slice(0, 15);
    }
    acIdx = 0;
    acRender();
  };
  qry.addEventListener("input", acUpdate);
  qry.addEventListener("blur", () => setTimeout(() => acHide(), 150));
  qry.addEventListener("keydown", (e) => {
    if (!acItems.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); acIdx = Math.min(acIdx + 1, acItems.length - 1); acRender(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); acIdx = Math.max(acIdx - 1, 0); acRender(); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); e.stopPropagation(); acInsert(acIdx); }
    else if (e.key === "Escape") { e.preventDefault(); acHide(); }
  }, true);

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
      // v3.44.0: 成功時に履歴チップへ追加 (chrome.storage 永続化)
      pushMiniHistory(soql);
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
  // v3.173.0 Phase 263: Markdown テーブル形式でコピー (3 モード整合性、panel の Phase 151 と同パターン)
  const copyMdBtn = $("copyMd");
  if (copyMdBtn) copyMdBtn.addEventListener("click", async () => {
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
      // Markdown テーブル: パイプ \| エスケープ + 改行→半角スペースで崩れ防止
      const mdEsc = (v) => String(flatten(v)).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
      const lines = [];
      lines.push("| " + headers.map(mdEsc).join(" | ") + " |");
      lines.push("|" + headers.map(() => "---").join("|") + "|");
      for (const r of lastRecs) lines.push("| " + headers.map((h) => mdEsc(r[h])).join(" | ") + " |");
      await navigator.clipboard.writeText(lines.join("\n"));
      meta.innerHTML = `<span class="ok">📝 Markdown テーブル ${lastRecs.length} 行をコピーしました</span>`;
    } catch (e) {
      meta.innerHTML = `<span class="err">❌ コピー失敗: ${String(e.message || e)}</span>`;
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
