// 軽量 content script。コンテキストメニューからの copy 要求と、ページ内で見つけたレコード ID のホバー強化など。
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
