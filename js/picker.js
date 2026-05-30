// 共通 Picker モジュール — オブジェクト/フィールド/Profile/PermSet/Apex/Flow 等の選択を統一する
// 使い方: showPicker({ kind, host, sid, apiVersion, onPick(value, item) })
// kind: 'sobject' | 'field' | 'profile' | 'permset' | 'apexClass' | 'flow' | 'user'
// 親要素には autocomplete の overlay を貼り付ける。
//
// v3.356.0 Phase 446: ファイルレベル documentation (コード意図 documentation 第 4 弾 / 第 4 ファイル目、Phase 443-445 design-docs.js / sf-api.js / background.js に続く)
// ─────────────────────────────────────────
// 【公開 export 2 件】(Grep で実装検証済 — Phase 443 hallucination 教訓継続)
//   ・showPicker ({ kind, host, sid, apiVersion, parentObject, onPick, orgKey }) — line 202、メイン Picker UI 表示
//   ・invalidatePickerCache (reason?) — line 12、Org 切り替え時のキャッシュ全消去 (panel.js の reconnect から呼ぶ)
//
// 【7 kind 定義】PICKER_DEFS (line 47+) で各 kind の title / placeholder / columns / load 関数を定義
//   ・sobject (line 48): /services/data/v{ver}/sobjects/ — queryable のみ filter
//   ・field (line 64): /sobjects/{parentObject}/describe — parentObject 必須
//   ・profile (line 79): SOQL `Profile` 取得 (UserLicense + UserType)
//   ・permset (line 94): SOQL `PermissionSet` 取得 (IsOwnedByProfile=false で profile 由来除外、value に "@" 接頭辞)
//   ・apexClass / flow / user (line 110 以降): SOQL ベースで類似実装
//
// 【3 永続化機構】(chrome.storage.local / Map / Map)
//   ① cache Map (line 8): キャッシュキー = `{kind}|{host}|{parentObject}` — 同一 kind 再表示時の SF API 呼出回避
//   ② scrollMemory Map (line 9): キャッシュキー = `{kind}|{host}|{parentObject}` — 同一 kind 連続オープン時のスクロール位置復元
//   ③ RECENT_KEY = "sfdtPickerRecent" (line 23): chrome.storage.local、`{orgKey}|{kind}` 別 最大 10 件保持
//      - Phase 421 で documentation: panel.js RECENT_OBJ_KEY (sfdtRecentObjects) / RECENT_RECORD_ID_KEY (sfdtRecentRecordIds) と **別管理**
//      - Picker は kind 別 + Org 別の汎用、panel.js は datalist 入力補助専用
//      - 共通点: 最大 10 件保持 (Phase 407 で「履歴 5 件と異なる最近候補は 10 件」documentation)
//
// 【お気に入り】FAVORITES (line 19-21): sobject のみ 10 件固定上部表示 (Account / Contact / Opportunity / Lead / Case / User / Task / Event / Campaign / Product2)
//
// 【依存】sf-api.js から sfFetch + runSoql を import (Phase 444 sf-api.js documentation で 14 export 7 カテゴリ確認)
import { sfFetch, runSoql } from "./sf-api.js";
// v3.462.0 Phase 552: HTML escape を sf-format-helpers に集約 (旧 ローカル定義は削除、call site は alias 'escape' で不変)
import { escHtml as escape } from "./sf-format-helpers.js";

const cache = new Map(); // key=kind|host|extraKey, value=items[]
const scrollMemory = new Map(); // key=cacheKey, value=scrollTop

// Org 切り替え時にキャッシュ全消去 (panel.js の reconnect から呼ぶ)
export function invalidatePickerCache(reason = "") {
  if (cache.size === 0) return;
  console.log(`[DevToolsNext] Picker cache cleared (${cache.size} entries)${reason ? ": " + reason : ""}`);
  cache.clear();
}

// お気に入り (kind 別の固定上部表示候補)
const FAVORITES = {
  sobject: ["Account", "Contact", "Opportunity", "Lead", "Case", "User", "Task", "Event", "Campaign", "Product2"],
};

const RECENT_KEY = "sfdtPickerRecent"; // chrome.storage.local — { [orgId|kind]: [value, ...最大10件] }
// v3.331.0 Phase 421: panel.js RECENT_OBJ_KEY (sfdtRecentObjects) / RECENT_RECORD_ID_KEY (sfdtRecentRecordIds) とは
//                     **別管理** (kind 別 + Org 別分離保存)。Picker は kind = sobject/field/profile/permset/apexClass/flow/user の汎用、
//                     panel.js RECENT_OBJ_KEY は datalist 入力補助専用 (Phase 223)。
//                     共通点: 最大 10 件保持 (Phase 407 で「履歴 5 件と異なる最近候補は 10 件」と documentation 化)。
// Org 別管理: showPicker 呼出時に orgKey を渡し、orgKey|kind で分離保存
// v3.512.0 Phase 602: export して unit test 対象に (テスト 0 件だった picker.js の test 化開始)
export function recentMapKey(orgKey, kind) { return `${orgKey || "default"}|${kind}`; }
const _recentMapKey = recentMapKey; // 後方互換 (内部 callers は旧名)
async function getRecent(kind, orgKey) {
  try {
    const { [RECENT_KEY]: data = {} } = await chrome.storage.local.get(RECENT_KEY);
    return data[_recentMapKey(orgKey, kind)] || [];
  } catch { return []; }
}
async function pushRecent(kind, value, orgKey) {
  try {
    const { [RECENT_KEY]: data = {} } = await chrome.storage.local.get(RECENT_KEY);
    const k = _recentMapKey(orgKey, kind);
    const list = (data[k] || []).filter((v) => v !== value);
    list.unshift(value);
    data[k] = list.slice(0, 10);
    await chrome.storage.local.set({ [RECENT_KEY]: data });
  } catch {}
}

const PICKER_DEFS = {
  sobject: {
    title: "オブジェクトを選択してください",
    placeholder: "オブジェクトを API 名または表示名で検索できます (例: Account / 取引先 / Custom__c)",
    columns: ["API 名", "ラベル", "Key Prefix", "種別"],
    async load({ host, sid, apiVersion }) {
      const r = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/sobjects/` });
      if (!r.ok) throw new Error(`オブジェクト一覧の取得に失敗しました (HTTP ${r.status})`);
      return (r.data.sobjects || [])
        .filter((s) => s.queryable)
        .map((s) => ({
          value: s.name,
          row: [s.name, s.label, s.keyPrefix || "", s.custom ? "Custom" : "Standard"],
          hay: (s.name + " " + s.label + " " + (s.keyPrefix || "")).toLowerCase(),
        }));
    },
  },
  field: {
    title: "フィールドを選択してください",
    placeholder: "項目を API 名または表示名で検索できます",
    columns: ["API 名", "ラベル", "型", "必須"],
    async load({ host, sid, apiVersion, parentObject }) {
      if (!parentObject) throw new Error("項目を取得するには、先に親オブジェクトを指定してください");
      const r = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/sobjects/${encodeURIComponent(parentObject)}/describe` });
      if (!r.ok) throw new Error(`項目定義 (describe) の取得に失敗しました (HTTP ${r.status})`);
      return (r.data.fields || []).map((f) => ({
        value: f.name,
        row: [f.name, f.label, f.type, !f.nillable && !f.defaultedOnCreate && f.createable ? "○" : ""],
        hay: (f.name + " " + f.label + " " + f.type).toLowerCase(),
      }));
    },
  },
  profile: {
    title: "プロファイルを選択してください",
    placeholder: "プロファイル名で検索できます",
    columns: ["Name", "ライセンス", "UserType"],
    async load({ host, sid, apiVersion }) {
      const r = await runSoql({ host, sid, apiVersion,
        soql: `SELECT Id, Name, UserLicense.Name, UserType FROM Profile ORDER BY Name LIMIT 500` });
      if (!r.ok) throw new Error(`プロファイル一覧の取得に失敗しました`);
      return (r.data.records || []).map((p) => ({
        value: p.Name,
        row: [p.Name, p.UserLicense ? p.UserLicense.Name : "", p.UserType || ""],
        hay: (p.Name + " " + (p.UserLicense ? p.UserLicense.Name : "")).toLowerCase(),
      }));
    },
  },
  permset: {
    title: "権限セットを選択してください",
    placeholder: "API 名またはラベルで検索できます",
    columns: ["API 名", "ラベル", "ライセンス"],
    async load({ host, sid, apiVersion }) {
      const r = await runSoql({ host, sid, apiVersion,
        soql: `SELECT Id, Name, Label, License.Name FROM PermissionSet WHERE IsOwnedByProfile=false ORDER BY Name LIMIT 500` });
      if (!r.ok) throw new Error(`権限セットの取得に失敗しました`);
      return (r.data.records || []).map((p) => ({
        // PermSet は profileDetail に '@<API名>' で渡すので最初から @ を付ける
        value: "@" + p.Name,
        row: [p.Name, p.Label || "", p.License ? p.License.Name : ""],
        hay: (p.Name + " " + (p.Label || "")).toLowerCase(),
      }));
    },
  },
  profileOrPermset: {
    // プロファイル詳細レポート用の統合 Picker (Profile or PermSet を選ぶ)
    title: "プロファイルまたは権限セットを選択してください",
    placeholder: "プロファイルまたは権限セットを名前で検索できます",
    columns: ["種別", "名前", "ラベル/ライセンス"],
    async load({ host, sid, apiVersion }) {
      const [profR, psR] = await Promise.all([
        runSoql({ host, sid, apiVersion, soql: `SELECT Name, UserLicense.Name FROM Profile ORDER BY Name LIMIT 500` }),
        runSoql({ host, sid, apiVersion, soql: `SELECT Name, Label, License.Name FROM PermissionSet WHERE IsOwnedByProfile=false ORDER BY Name LIMIT 500` }),
      ]);
      const items = [];
      if (profR.ok) (profR.data.records || []).forEach((p) => items.push({
        value: p.Name,
        row: ["👤 Profile", p.Name, p.UserLicense ? p.UserLicense.Name : ""],
        hay: ("profile " + p.Name).toLowerCase(),
      }));
      if (psR.ok) (psR.data.records || []).forEach((p) => items.push({
        value: "@" + p.Name,
        row: ["🔑 PermSet", p.Name, p.Label || ""],
        hay: ("permset " + p.Name + " " + (p.Label || "")).toLowerCase(),
      }));
      return items;
    },
  },
  apexClass: {
    title: "Apex クラスを選択してください",
    placeholder: "Apex クラス名で検索できます",
    columns: ["クラス名", "Status", "API Ver"],
    async load({ host, sid, apiVersion }) {
      const r = await runSoql({ host, sid, apiVersion, tooling: true,
        soql: `SELECT Name, ApiVersion, Status FROM ApexClass WHERE ManageableState='unmanaged' OR ManageableState='installedEditable' ORDER BY Name LIMIT 1000` });
      if (!r.ok) throw new Error(`Apex クラスの取得に失敗しました`);
      return (r.data.records || []).map((c) => ({
        value: c.Name,
        row: [c.Name, c.Status, c.ApiVersion],
        hay: c.Name.toLowerCase(),
      }));
    },
  },
  flow: {
    title: "フローを選択してください",
    placeholder: "Flow DeveloperName またはラベルで検索できます",
    columns: ["DeveloperName", "ラベル", "Active"],
    async load({ host, sid, apiVersion }) {
      const r = await runSoql({ host, sid, apiVersion, tooling: true,
        soql: `SELECT DeveloperName, MasterLabel, ActiveVersion.VersionNumber FROM FlowDefinition ORDER BY DeveloperName LIMIT 500` });
      if (!r.ok) throw new Error(`フロー一覧の取得に失敗しました`);
      return (r.data.records || []).map((f) => ({
        value: f.DeveloperName,
        row: [f.DeveloperName, f.MasterLabel || "", f.ActiveVersion ? "v" + f.ActiveVersion.VersionNumber : "(なし)"],
        hay: (f.DeveloperName + " " + (f.MasterLabel || "")).toLowerCase(),
      }));
    },
  },
  lwc: {
    title: "LWC コンポーネントを選択してください",
    placeholder: "LWC DeveloperName またはラベルで検索できます",
    columns: ["DeveloperName", "ラベル", "公開"],
    async load({ host, sid, apiVersion }) {
      const r = await runSoql({ host, sid, apiVersion, tooling: true,
        soql: `SELECT DeveloperName, MasterLabel, IsExposed FROM LightningComponentBundle ORDER BY DeveloperName LIMIT 500` });
      if (!r.ok) throw new Error(`LWC コンポーネントの取得に失敗しました`);
      return (r.data.records || []).map((b) => ({
        value: b.DeveloperName,
        row: [b.DeveloperName, b.MasterLabel || "", b.IsExposed ? "○" : ""],
        hay: (b.DeveloperName + " " + (b.MasterLabel || "")).toLowerCase(),
      }));
    },
  },
  user: {
    title: "ユーザを選択してください",
    placeholder: "Name / Username / Email で検索できます",
    columns: ["Name", "Username", "Profile"],
    async load({ host, sid, apiVersion }) {
      const r = await runSoql({ host, sid, apiVersion,
        soql: `SELECT Id, Name, Username, Email, Profile.Name FROM User WHERE IsActive=true ORDER BY LastLoginDate DESC NULLS LAST LIMIT 200` });
      if (!r.ok) throw new Error(`ユーザ一覧の取得に失敗しました`);
      return (r.data.records || []).map((u) => ({
        value: u.Id,
        row: [u.Name, u.Username, u.Profile ? u.Profile.Name : ""],
        hay: (u.Name + " " + u.Username + " " + (u.Email || "")).toLowerCase(),
      }));
    },
  },
};

/**
 * Picker をモーダルで表示し、選択された value を返す。
 * 既存のキャッシュがある場合は即座に表示、ない場合は load() を呼ぶ。
 *
 * @returns Promise<string|null> 選択された value、キャンセル時 null
 */
export function showPicker({ kind, host, sid, apiVersion, parentObject, onPick, orgKey }) {
  return new Promise(async (resolve) => {
    const def = PICKER_DEFS[kind];
    if (!def) { resolve(null); return; }

    // 多重表示防止: 既存の Picker があれば再呼出は無視
    if (document.querySelector(".picker-overlay")) {
      console.log("[DevToolsNext] Picker already open, ignoring duplicate showPicker call");
      resolve(null);
      return;
    }

    const cacheKey = `${kind}|${host}|${parentObject || ""}`;
    let items = cache.get(cacheKey);

    // フォーカス復元用に元の active 要素を記憶
    const focusReturnTarget = document.activeElement;

    // v2.72.0: 各 picker インスタンスにユニーク ID を発番し ARIA aria-controls / aria-activedescendant に利用
    const pickerInstanceId = "p" + Math.random().toString(36).slice(2, 9);

    // モーダル DOM 構築
    const overlay = document.createElement("div");
    overlay.className = "picker-overlay";
    overlay.innerHTML = `
      <div class="picker-modal">
        <div class="picker-header">
          <h3>${escape(def.title)}</h3>
          <span class="picker-kbd-hint" title="↑↓ で候補移動 / Home/End で先頭・末尾へ / Enter で決定 / Esc で閉じる">⌨ ↑↓ / Home/End / Enter / Esc</span>
          <button class="picker-close" title="ピッカーを閉じます" aria-label="閉じる">✕</button>
        </div>
        <div class="picker-toolbar">
          <div class="picker-search-wrap">
            <input class="picker-search" placeholder="${escape(def.placeholder)}" autofocus aria-label="候補検索" maxlength="200" role="combobox" aria-controls="picker-list-${pickerInstanceId}" aria-expanded="true" aria-autocomplete="list" />
            <button class="picker-clear" type="button" title="検索キーワードをクリアします" aria-label="検索をクリア">✕</button>
          </div>
          <span class="picker-count meta" role="status" aria-live="polite" aria-atomic="true">読み込み中…</span>
          <button class="picker-reload mini-btn" title="再取得">⟳</button>
        </div>
        <div class="picker-list" id="picker-list-${pickerInstanceId}" role="listbox" aria-label="${escape(def.title)}" tabindex="-1"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    // 背景スクロール抑止
    document.body.classList.add("picker-open");

    const $input = overlay.querySelector(".picker-search");
    const $list = overlay.querySelector(".picker-list");
    const $count = overlay.querySelector(".picker-count");
    const $clear = overlay.querySelector(".picker-clear");
    if ($clear) $clear.addEventListener("click", () => {
      $input.value = "";
      selectedIdx = 0; // 検索クリア時は先頭にハイライト戻し
      $input.focus();
      $input.dispatchEvent(new Event("input"));
      if ($list) $list.scrollTop = 0;
    });

    const close = (val) => {
      // 閉じる直前にスクロール位置を保存 (同一 kind 再表示時に復元)
      try {
        if ($list && $list.scrollTop > 0) scrollMemory.set(cacheKey, $list.scrollTop);
      } catch {}
      overlay.remove();
      document.body.classList.remove("picker-open");
      // 元のトリガにフォーカスを戻す (キーボードユーザー向け)
      // 開いた後に DOM 再描画で focusReturnTarget が detached になるケースを防ぐ:
      // document.contains() でツリー存在を確認、ダメなら body にフォールバック
      if (focusReturnTarget && typeof focusReturnTarget.focus === "function") {
        try {
          if (document.body.contains(focusReturnTarget)) focusReturnTarget.focus();
        } catch {}
      }
      resolve(val);
    };
    overlay.querySelector(".picker-close").addEventListener("click", () => close(null));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(null); });
    overlay.querySelector(".picker-reload").addEventListener("click", async () => {
      cache.delete(cacheKey);
      scrollMemory.delete(cacheKey);
      $count.textContent = "⏳ 再取得中…";
      // v2.75.0: スクリーンリーダーに「読み込み中」を通知
      $list.setAttribute("aria-busy", "true");
      try {
        items = await def.load({ host, sid, apiVersion, parentObject });
        cache.set(cacheKey, items);
        selectedIdx = 0; // reload 後は先頭に戻す
        $input.value = ""; // 検索クエリもクリア
        render();
        if ($list) $list.scrollTop = 0;
      } catch (e) { $count.textContent = "❌ 失敗: " + (e.message || e); }
      finally { $list.setAttribute("aria-busy", "false"); }
    });

    let selectedIdx = 0;
    let recentList = await getRecent(kind, orgKey);
    const favSet = new Set((FAVORITES[kind] || []));
    const recentSet = new Set(recentList);

    const sortItems = (arr, q) => {
      // 検索クエリありの場合は通常順、なしの場合は最近選択 → お気に入り → その他
      if (q) return arr;
      const recent = []; const fav = []; const other = [];
      for (const it of arr) {
        if (recentSet.has(it.value)) recent.push(it);
        else if (favSet.has(it.value)) fav.push(it);
        else other.push(it);
      }
      // recent は recentList 順を維持
      const recentByValue = new Map(recent.map((it) => [it.value, it]));
      const recentOrdered = recentList.map((v) => recentByValue.get(v)).filter(Boolean);
      return [...recentOrdered, ...fav, ...other];
    };

    const render = () => {
      const q = ($input.value || "").toLowerCase();
      const sorted = sortItems(items.slice(), q);
      const filtered = sorted.filter((it) => !q || it.hay.includes(q)).slice(0, 300);
      if (selectedIdx >= filtered.length) selectedIdx = 0;
      // 内訳: 最近選択 + お気に入りの数を併記
      const recentCount = items.filter((it) => recentSet.has(it.value)).length;
      const favCount = items.filter((it) => favSet.has(it.value) && !recentSet.has(it.value)).length;
      const breakdown = (recentCount || favCount)
        ? ` <span style="color:var(--accent)">(⏱${recentCount} ★${favCount})</span>` : "";
      $count.innerHTML = `${filtered.length} / ${items.length} 件${breakdown}`;
      $list.innerHTML = "";
      // ヘッダ (a11y: 視覚的にはテーブル見出しだが listbox の子としては presentation 扱いにする)
      const hdr = document.createElement("div");
      hdr.className = "picker-row header";
      hdr.setAttribute("role", "presentation");
      hdr.title = "上から: ⏱ 最近選択 / ★ お気に入り / その他 順で並んでいます (検索時は除外)";
      hdr.innerHTML = def.columns.map((c) => `<div title="${escape(c)}">${escape(c)}</div>`).join("");
      $list.appendChild(hdr);
      filtered.forEach((it, idx) => {
        const row = document.createElement("div");
        const isRecent = recentSet.has(it.value);
        const isFav = favSet.has(it.value);
        const isSelected = idx === selectedIdx;
        row.className = "picker-row" + (isSelected ? " selected" : "") +
          (isRecent ? " is-recent" : "") + (isFav ? " is-fav" : "");
        // v2.72.0: ARIA listbox/option パターン
        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", isSelected ? "true" : "false");
        row.id = `${pickerInstanceId}-opt-${idx}`;
        const badge = isRecent ? '<span class="picker-badge recent" title="最近選択">⏱</span>' :
                      isFav ? '<span class="picker-badge fav" title="お気に入り">★</span>' : "";
        // v3.482.0 Phase 572: escape (= escHtml) は null-safe なので String(... == null ? "" : ...) は冗長。削除して簡潔化
        row.innerHTML = it.row.map((c, i) =>
          `<div>${i === 0 ? badge : ""}${escape(c)}</div>`
        ).join("");
        row.addEventListener("click", async () => {
          await pushRecent(kind, it.value, orgKey);
          if (onPick) onPick(it.value, it);
          close(it.value);
        });
        $list.appendChild(row);
      });
      // v2.72.0: スクリーンリーダーに現在のアクティブ option を通知
      const activeRow = $list.querySelector(".picker-row.selected");
      if (activeRow && activeRow.id) {
        $input.setAttribute("aria-activedescendant", activeRow.id);
      } else {
        $input.removeAttribute("aria-activedescendant");
      }
      if (!filtered.length) {
        const empty = document.createElement("div");
        empty.className = "meta";
        empty.style.padding = "12px";
        empty.setAttribute("role", "presentation");
        empty.textContent = "該当なし";
        $list.appendChild(empty);
      }
    };

    $input.addEventListener("input", () => render());
    $input.addEventListener("keydown", (e) => {
      // IME 入力中 (日本語等の変換中) は ↑↓/Enter/Esc 等の特殊キーをスキップ
      // → IME の候補選択キー (Space, Enter, ↑↓) と Picker のナビゲーションキーが競合しないよう
      if (e.isComposing || e.keyCode === 229) return;
      const rows = $list.querySelectorAll(".picker-row:not(.header)");
      const lastIdx = rows.length - 1;
      const scrollToSelected = () => {
        const sel = $list.querySelector(".picker-row.selected");
        if (sel) sel.scrollIntoView({ block: "nearest" });
      };
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectedIdx = Math.min(selectedIdx + 1, lastIdx);
        render(); scrollToSelected();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectedIdx = Math.max(selectedIdx - 1, 0);
        render(); scrollToSelected();
      } else if (e.key === "Home") {
        e.preventDefault();
        selectedIdx = 0;
        render(); scrollToSelected();
      } else if (e.key === "End") {
        e.preventDefault();
        selectedIdx = lastIdx;
        render(); scrollToSelected();
      } else if (e.key === "PageDown") {
        e.preventDefault();
        selectedIdx = Math.min(selectedIdx + 10, lastIdx);
        render(); scrollToSelected();
      } else if (e.key === "PageUp") {
        e.preventDefault();
        selectedIdx = Math.max(selectedIdx - 10, 0);
        render(); scrollToSelected();
      } else if (e.key === "Enter") {
        // Enter も伝播ガード (背景 form submit や global keydown を防ぐ)
        e.preventDefault();
        e.stopPropagation();
        const sel = $list.querySelector(".picker-row.selected");
        if (sel) sel.click();
      } else if (e.key === "Escape") {
        // 背景の view やグローバル keydown に Esc が流出しないようガード
        e.preventDefault();
        e.stopPropagation();
        close(null);
      }
    });

    // 初回ロード
    if (!items) {
      // v2.75.0: 初回 fetch 中も aria-busy で SR に通知
      $list.setAttribute("aria-busy", "true");
      try {
        items = await def.load({ host, sid, apiVersion, parentObject });
        cache.set(cacheKey, items);
      } catch (e) {
        $count.textContent = "ロード失敗: " + (e.message || e);
        $list.setAttribute("aria-busy", "false");
        return;
      }
      $list.setAttribute("aria-busy", "false");
    }
    render();
    // 前回のスクロール位置を復元 (同一 kind 連続オープン時の利便性)
    const savedTop = scrollMemory.get(cacheKey);
    if (savedTop && savedTop > 0) {
      requestAnimationFrame(() => { try { $list.scrollTop = savedTop; } catch {} });
    }
  });
}

// v3.462.0 Phase 552: ローカル escape は sf-format-helpers.escHtml に統合済 (上の import 'escHtml as escape' 参照、6 call site は不変)
