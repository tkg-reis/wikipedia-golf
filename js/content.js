// EXPLAIN:DOMの読み込みが行われるごとに、background.jsにポップアップを自動で開くメッセージを送信する。
chrome.runtime.sendMessage({ action: "open_popup" });

// EXPLAIN:クリック可能なリンクをハイライト処理
const enableClickLinks = document.querySelectorAll("a[href^='/wiki/']");
enableClickLinks.forEach(includeLink => {
  includeLink.style.backgroundColor = "yellow";
  includeLink.style.borderWidth = "1px";
  includeLink.style.borderStyle = "dotted";
  includeLink.style.borderColor = "black";
});

// EXPLAIN:指定リンク以外を背景色を黒くして除外処理
document.querySelectorAll("a[href]:not(a[href^='/wiki/'])").forEach(excludeLink => {
  excludeLink.style.pointerEvents = "none";
  excludeLink.style.color = "black";
  excludeLink.parentElement.style.backgroundColor = "black";
});
