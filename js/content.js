// TODO: 英語ページは非活性にする。https://en.wikipedia.org/wiki/Steve_Englehar
// MEMO: https://ja.wikipedia.org/wiki/%E3%83%B4%E3%82%A3%E3%83%AB%E3%83%98%E3%83%AB%E3%83%A0%E3%83%BB%E3%82%B0%E3%83%AA%E3%83%A0
// 上記の言語学者参照
// TODO: 検索欄の非表示または非活性化
// TODO: 押下可能なリンクに対して色つきのハイライト処理
// MEMO: クリック可能なリンクをハイライト処理
const enableClickLinks = document.querySelectorAll("a[href^='/wiki/']");
enableClickLinks.forEach(includeLink => {
  includeLink.style.backgroundColor = "yellow";
  includeLink.style.borderWidth = "1px";
  includeLink.style.borderStyle = "dotted";
  includeLink.style.borderColor = "black";
});

chrome.runtime.sendMessage({ action: "open_popup" });

// TODO: 手数がなくなったらsendmessageでリロードかpopupを開き直すようにする。
// MEMO: 指定リンク以外を除外処理
document.querySelectorAll("a[href]:not(a[href^='/wiki/'])").forEach(excludeLink => {
  excludeLink.style.pointerEvents = "none";
  excludeLink.style.color = "black";
  excludeLink.parentElement.style.backgroundColor = "black";
})

// content.js

// document.querySelector(".cdx-button.cdx-button--size-large.cdx-button--icon-only.cdx-button--weight-quiet.skin-minerva-search-trigger").style.backgroundColor = "black";

// document.querySelector(".search.skin-minerva-search-trigger").setAttribute("disabled", true);