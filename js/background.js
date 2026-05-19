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
        title: "DevToolsNext を自動更新",
        message: `${knownVersion} → ${cur} に更新しました。Chrome に新バージョンが適用されました。`,
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
      } else {
        sendResponse({ ok: false, error: "unknown message type" });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e && e.message || e) });
    }
  })();
  return true; // async
});
