// DevTools パネル登録のみ行う薄いローダー。
chrome.devtools.panels.create(
  "Salesforce",
  "../icons/icon32.png",
  "../html/panel.html",
  () => {}
);
