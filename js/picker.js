// 共通 Picker モジュール — オブジェクト/フィールド/Profile/PermSet/Apex/Flow 等の選択を統一する
// 使い方: showPicker({ kind, host, sid, apiVersion, onPick(value, item) })
// kind: 'sobject' | 'field' | 'profile' | 'permset' | 'apexClass' | 'flow' | 'user'
// 親要素には autocomplete の overlay を貼り付ける。

import { sfFetch, runSoql } from "./sf-api.js";

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
// Org 別管理: showPicker 呼出時に orgKey を渡し、orgKey|kind で分離保存
function _recentMapKey(orgKey, kind) { return `${orgKey || "default"}|${kind}`; }
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
    title: "オブジェクトを選択",
    placeholder: "オブジェクト API 名で検索 (例: Account, Custom__c)",
    columns: ["API 名", "ラベル", "Key Prefix", "種別"],
    async load({ host, sid, apiVersion }) {
      const r = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/sobjects/` });
      if (!r.ok) throw new Error(`sobjects 取得失敗: HTTP ${r.status}`);
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
    title: "フィールドを選択",
    placeholder: "フィールド API 名 / ラベルで検索",
    columns: ["API 名", "ラベル", "型", "必須"],
    async load({ host, sid, apiVersion, parentObject }) {
      if (!parentObject) throw new Error("親オブジェクトが必要です");
      const r = await sfFetch({ host, sid, path: `/services/data/v${apiVersion}/sobjects/${encodeURIComponent(parentObject)}/describe` });
      if (!r.ok) throw new Error(`describe 失敗: HTTP ${r.status}`);
      return (r.data.fields || []).map((f) => ({
        value: f.name,
        row: [f.name, f.label, f.type, !f.nillable && !f.defaultedOnCreate && f.createable ? "○" : ""],
        hay: (f.name + " " + f.label + " " + f.type).toLowerCase(),
      }));
    },
  },
  profile: {
    title: "プロファイルを選択",
    placeholder: "プロファイル名で検索",
    columns: ["Name", "ライセンス", "UserType"],
    async load({ host, sid, apiVersion }) {
      const r = await runSoql({ host, sid, apiVersion,
        soql: `SELECT Id, Name, UserLicense.Name, UserType FROM Profile ORDER BY Name LIMIT 500` });
      if (!r.ok) throw new Error(`Profile 取得失敗`);
      return (r.data.records || []).map((p) => ({
        value: p.Name,
        row: [p.Name, p.UserLicense ? p.UserLicense.Name : "", p.UserType || ""],
        hay: (p.Name + " " + (p.UserLicense ? p.UserLicense.Name : "")).toLowerCase(),
      }));
    },
  },
  permset: {
    title: "権限セットを選択",
    placeholder: "API 名 / ラベルで検索",
    columns: ["API 名", "ラベル", "ライセンス"],
    async load({ host, sid, apiVersion }) {
      const r = await runSoql({ host, sid, apiVersion,
        soql: `SELECT Id, Name, Label, License.Name FROM PermissionSet WHERE IsOwnedByProfile=false ORDER BY Name LIMIT 500` });
      if (!r.ok) throw new Error(`PermissionSet 取得失敗`);
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
    title: "プロファイル または 権限セットを選択",
    placeholder: "Profile / PermissionSet 検索",
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
    title: "Apex クラスを選択",
    placeholder: "クラス名で検索",
    columns: ["クラス名", "Status", "API Ver"],
    async load({ host, sid, apiVersion }) {
      const r = await runSoql({ host, sid, apiVersion, tooling: true,
        soql: `SELECT Name, ApiVersion, Status FROM ApexClass WHERE ManageableState='unmanaged' OR ManageableState='installedEditable' ORDER BY Name LIMIT 1000` });
      if (!r.ok) throw new Error(`ApexClass 取得失敗`);
      return (r.data.records || []).map((c) => ({
        value: c.Name,
        row: [c.Name, c.Status, c.ApiVersion],
        hay: c.Name.toLowerCase(),
      }));
    },
  },
  flow: {
    title: "Flow を選択",
    placeholder: "Flow DeveloperName / ラベルで検索",
    columns: ["DeveloperName", "ラベル", "Active"],
    async load({ host, sid, apiVersion }) {
      const r = await runSoql({ host, sid, apiVersion, tooling: true,
        soql: `SELECT DeveloperName, MasterLabel, ActiveVersion.VersionNumber FROM FlowDefinition ORDER BY DeveloperName LIMIT 500` });
      if (!r.ok) throw new Error(`Flow 取得失敗`);
      return (r.data.records || []).map((f) => ({
        value: f.DeveloperName,
        row: [f.DeveloperName, f.MasterLabel || "", f.ActiveVersion ? "v" + f.ActiveVersion.VersionNumber : "(なし)"],
        hay: (f.DeveloperName + " " + (f.MasterLabel || "")).toLowerCase(),
      }));
    },
  },
  lwc: {
    title: "LWC バンドルを選択",
    placeholder: "LWC DeveloperName / ラベルで検索",
    columns: ["DeveloperName", "ラベル", "公開"],
    async load({ host, sid, apiVersion }) {
      const r = await runSoql({ host, sid, apiVersion, tooling: true,
        soql: `SELECT DeveloperName, MasterLabel, IsExposed FROM LightningComponentBundle ORDER BY DeveloperName LIMIT 500` });
      if (!r.ok) throw new Error(`LWC 取得失敗`);
      return (r.data.records || []).map((b) => ({
        value: b.DeveloperName,
        row: [b.DeveloperName, b.MasterLabel || "", b.IsExposed ? "○" : ""],
        hay: (b.DeveloperName + " " + (b.MasterLabel || "")).toLowerCase(),
      }));
    },
  },
  user: {
    title: "ユーザーを選択",
    placeholder: "Name / Username / Email で検索",
    columns: ["Name", "Username", "Profile"],
    async load({ host, sid, apiVersion }) {
      const r = await runSoql({ host, sid, apiVersion,
        soql: `SELECT Id, Name, Username, Email, Profile.Name FROM User WHERE IsActive=true ORDER BY LastLoginDate DESC NULLS LAST LIMIT 200` });
      if (!r.ok) throw new Error(`User 取得失敗`);
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

    // モーダル DOM 構築
    const overlay = document.createElement("div");
    overlay.className = "picker-overlay";
    overlay.innerHTML = `
      <div class="picker-modal">
        <div class="picker-header">
          <h3>${escape(def.title)}</h3>
          <span class="picker-kbd-hint" title="キーボード操作">⌨ ↑↓ / Home/End / Enter / Esc</span>
          <button class="picker-close" title="閉じる" aria-label="閉じる">✕</button>
        </div>
        <div class="picker-toolbar">
          <div class="picker-search-wrap">
            <input class="picker-search" placeholder="${escape(def.placeholder)}" autofocus aria-label="候補検索" />
            <button class="picker-clear" type="button" title="クリア" aria-label="検索をクリア">✕</button>
          </div>
          <span class="picker-count meta">読み込み中…</span>
          <button class="picker-reload mini-btn" title="再取得">⟳</button>
        </div>
        <div class="picker-list"></div>
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
      $input.focus();
      $input.dispatchEvent(new Event("input"));
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
      try {
        items = await def.load({ host, sid, apiVersion, parentObject });
        cache.set(cacheKey, items);
        selectedIdx = 0; // reload 後は先頭に戻す
        $input.value = ""; // 検索クエリもクリア
        render();
        if ($list) $list.scrollTop = 0;
      } catch (e) { $count.textContent = "❌ 失敗: " + (e.message || e); }
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
      // ヘッダ
      const hdr = document.createElement("div");
      hdr.className = "picker-row header";
      hdr.title = "上から: ⏱ 最近選択 / ★ お気に入り / その他 順で並んでいます (検索時は除外)";
      hdr.innerHTML = def.columns.map((c) => `<div title="${escape(c)}">${escape(c)}</div>`).join("");
      $list.appendChild(hdr);
      filtered.forEach((it, idx) => {
        const row = document.createElement("div");
        const isRecent = recentSet.has(it.value);
        const isFav = favSet.has(it.value);
        row.className = "picker-row" + (idx === selectedIdx ? " selected" : "") +
          (isRecent ? " is-recent" : "") + (isFav ? " is-fav" : "");
        const badge = isRecent ? '<span class="picker-badge recent" title="最近選択">⏱</span>' :
                      isFav ? '<span class="picker-badge fav" title="お気に入り">★</span>' : "";
        row.innerHTML = it.row.map((c, i) =>
          `<div>${i === 0 ? badge : ""}${escape(String(c == null ? "" : c))}</div>`
        ).join("");
        row.addEventListener("click", async () => {
          await pushRecent(kind, it.value, orgKey);
          if (onPick) onPick(it.value, it);
          close(it.value);
        });
        $list.appendChild(row);
      });
      if (!filtered.length) {
        const empty = document.createElement("div");
        empty.className = "meta";
        empty.style.padding = "12px";
        empty.textContent = "該当なし";
        $list.appendChild(empty);
      }
    };

    $input.addEventListener("input", () => render());
    $input.addEventListener("keydown", (e) => {
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
        e.preventDefault();
        const sel = $list.querySelector(".picker-row.selected");
        if (sel) sel.click();
      } else if (e.key === "Escape") {
        close(null);
      }
    });

    // 初回ロード
    if (!items) {
      try {
        items = await def.load({ host, sid, apiVersion, parentObject });
        cache.set(cacheKey, items);
      } catch (e) {
        $count.textContent = "ロード失敗: " + (e.message || e);
        return;
      }
    }
    render();
    // 前回のスクロール位置を復元 (同一 kind 連続オープン時の利便性)
    const savedTop = scrollMemory.get(cacheKey);
    if (savedTop && savedTop > 0) {
      requestAnimationFrame(() => { try { $list.scrollTop = savedTop; } catch {} });
    }
  });
}

function escape(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
