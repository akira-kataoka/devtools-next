// Service worker (MV3). コンテキストメニュー登録、popup/devtools からの共通リクエスト処理、
// + 自動アップデート (VERSION.txt 監視 → chrome.runtime.reload)。
import { getSessionId, sfFetch, runSoql, toApiHost, isSalesforceHost } from "./sf-api.js";

const CONTEXT_MENUS = [
  { id: "sfdt-open-id-record", title: "Salesforce ID として開く", contexts: ["selection"] },
  { id: "sfdt-copy-18", title: "選択した15桁IDを18桁に変換してコピー", contexts: ["selection"] },
];

// ====== 自動アップデート ======
// VERSION.txt の内容が変わると chrome.runtime.reload() で全体を再ロード。
// Unpacked / Web Store / GPO どのインストール方式でも動作する。
// 開発ループ側 (PowerShell や CI) が VERSION.txt を書き換える、または
// ユーザーが手動で sf-devtool-extension/VERSION.txt を更新すれば自動反映。
const VERSION_ALARM = "sfdt-version-check";
// v3.321.0 Phase 411: 30 秒間隔は「開発時の自動アップデート反映」と「CPU/network 負荷」のバランス値。
//                     より短く (例 10 秒) → 開発反映は早いが過剰 fetch / より長く (例 5 分) → 反映遅延が体感
//                     manifest.json の alarms permission は最低 30 秒 (Chrome MV3 制約: 0.5 分未満は警告)
const VERSION_INTERVAL_MIN = 0.5; // 30 秒間隔
let knownVersion = null;

async function readDiskVersion() {
  try {
    const res = await fetch(chrome.runtime.getURL("VERSION.txt") + "?_=" + Date.now(), { cache: "no-cache" });
    if (!res.ok) return null;
    return (await res.text()).trim();
  } catch { return null; }
}

async function checkForReload() {
  const cur = await readDiskVersion();
  if (!cur) return;
  if (knownVersion === null) {
    knownVersion = cur;
    await chrome.storage.local.set({ sfdtKnownVersion: cur });
    return;
  }
  if (cur !== knownVersion) {
    try {
      await chrome.notifications.create("sfdt-update-" + Date.now(), {
        type: "basic",
        iconUrl: chrome.runtime.getURL("icons/icon128.png"),
        title: "🆕 DevToolsNext を自動更新しました",
        message: `✨ v${knownVersion} から v${cur} に更新しました。新しいバージョンが Chrome に反映されています。`,
        priority: 1,
      });
    } catch {}
    knownVersion = cur;
    await chrome.storage.local.set({ sfdtKnownVersion: cur, sfdtLastReloadAt: Date.now() });
    setTimeout(() => chrome.runtime.reload(), 200);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  for (const m of CONTEXT_MENUS) {
    chrome.contextMenus.create(m, () => void chrome.runtime.lastError);
  }
  // 起動直後に現在の VERSION.txt を記録
  const initial = await readDiskVersion();
  if (initial) {
    knownVersion = initial;
    await chrome.storage.local.set({ sfdtKnownVersion: initial });
  }
  // 定期チェック開始
  chrome.alarms.create(VERSION_ALARM, { periodInMinutes: VERSION_INTERVAL_MIN });
});

chrome.runtime.onStartup.addListener(async () => {
  const stored = await chrome.storage.local.get("sfdtKnownVersion");
  knownVersion = stored.sfdtKnownVersion || null;
  chrome.alarms.create(VERSION_ALARM, { periodInMinutes: VERSION_INTERVAL_MIN });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === VERSION_ALARM) checkForReload();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab) return;
  const sel = (info.selectionText || "").trim();
  if (info.menuItemId === "sfdt-open-id-record") {
    if (/^[a-zA-Z0-9]{15,18}$/.test(sel) && tab.url) {
      try {
        const u = new URL(tab.url);
        if (isSalesforceHost(u.hostname)) {
          chrome.tabs.create({ url: `https://${u.hostname}/${sel}` });
        }
      } catch {}
    }
  } else if (info.menuItemId === "sfdt-copy-18") {
    if (/^[a-zA-Z0-9]{15}$/.test(sel)) {
      const { to18CharId } = await import("./sf-api.js");
      const id18 = to18CharId(sel);
      // service worker からはクリップボード API が使えないので content script にメッセージ
      if (id18 && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "sfdt:copy", text: id18 });
      }
    }
  }
});

// popup / devtools パネルからの API リクエスト中継
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "sfdt:getSession") {
        const session = await getSessionId(msg.host);
        sendResponse({ ok: true, session });
      } else if (msg.type === "sfdt:soql") {
        const r = await runSoql(msg.payload);
        sendResponse({ ok: r.ok, status: r.status, data: r.data });
      } else if (msg.type === "sfdt:fetch") {
        const r = await sfFetch(msg.payload);
        sendResponse({ ok: r.ok, status: r.status, data: r.data, raw: r.raw });
      } else if (msg.type === "sfdt:checkUpdate") {
        await checkForReload();
        const cur = await readDiskVersion();
        sendResponse({ ok: true, version: cur });
      } else if (msg.type === "sfdt:reloadNow") {
        sendResponse({ ok: true });
        setTimeout(() => chrome.runtime.reload(), 200);
      } else if (msg.type === "sfdt:capture") {
        // v3.128.0 Phase 218: アクティブ Salesforce タブの可視範囲を PNG キャプチャ (エビデンス画像化、ユーザー要望)
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs && tabs[0];
        if (!tab) { sendResponse({ ok: false, error: "アクティブなタブが見つかりません" }); return; }
        try {
          const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
          sendResponse({ ok: true, dataUrl, tabUrl: tab.url, tabTitle: tab.title });
        } catch (capErr) {
          sendResponse({ ok: false, error: "captureVisibleTab 失敗: " + String(capErr && capErr.message || capErr) });
        }
      } else {
        sendResponse({ ok: false, error: "unknown message type" });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e && e.message || e) });
    }
  })();
  return true; // async
});
