// バックエンドでimportを使おうとするとエラー。削除して読み込み直し必須。使うならviteなどのモジュールバンドラーを採用する必要あり。
// FIX: apiで開いたタブで操作しないとカウントなどが更新されない。の解決。
// TODO:urlの振り分け 原因は判明したため正しい関数の処理順序の組み直しをする
// TODO: オブジェクトリテラルの変数名の変更
// TODO: 遷移先ごとにpopup.html部分を自動で開けるようにする。
// TODO: 定数で終着点を決めるようにする。
// TODO: 手数以内で終着点にたどり着いたらsuccessを出して、apiを呼べるボタンを活性状態にする。
// TODO: リンクが設けられていなくてもDOMツリーに存在すればsuccessを出すようにする。
// TODO: 終着点のデータが半角で文字のスペースがある場合、自動でアンダースコアが挿入されるみたいなので、検索時点でスペースが含まれる文字か検知する関数を作成する必要あり。
// TODO:終着点のデータを相手に決めさせるようにする。

// MEMO: 拡張機能のアイコンからファイルに定義されたプリントデバッグを見ることができる。

// EXPLAIN:カウントの作成、更新の関数
const targetURL = "https://ja.wikipedia.org/wiki/"; // 監視するURL

const countTabChangeToStorage = () => {
  chrome.storage.local.get("visitCount", (result) => {
    const currentCount = result.visitCount || 0;
    const newCount = currentCount + 1;
    chrome.storage.local.set({ visitCount: newCount });
  });
};

// EXPLAIN:半角スペースがあればアンダースコアに変更する関数
const replaceSpacesWithUnderscores = (value) => {
  if (typeof value !== "string") {
      throw new Error("Input must be a string");
  }
  return value.replace(/ /g, "_");
}

const saveURLToStorage = (newURL) => {
  chrome.storage.local.get("wordList", (result) => {
    let wordList = result.wordList || [];

    if (!wordList.includes(newURL)) {
      // 正規表現で最後のパス部分を抽出
      const extractWord = decodeURI(newURL).match(/\/([^\/]+)$/);
      if (extractWord) {
        const targetArryNumber = 1;
        const word = replaceSpacesWithUnderscores(extractWord[targetArryNumber]);
        const updatewordList = [...wordList, word];
        chrome.storage.local.set({ wordList: updatewordList }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error saving URL:", chrome.runtime.lastError);
          } else {
            console.log("URL added");
          }
        });
      }
    } else {
      console.log("URL already exists in the list");
    }
  });
};

// EXPLAIN:半角スペースがあればアンダースコアに変更する関数
// ATTENTION: apiで開いたタブで操作しないとカウントなどが更新されない。
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const { url } = changeInfo;
  if (tabId && url && url.startsWith(targetURL)) {
    countTabChangeToStorage();
    saveURLToStorage(url);
    chrome.notifications.create({
      type: "basic",
      iconUrl: "../img/wikipedia-golf_ver2.png",
      title: "ページとカウントが更新されました。",
      message: `add ${decodeURI(url).match(/\/([^\/]+)$/)[1]}`
    });
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "open_popup") {
        chrome.action.openPopup()
          .then(() => sendResponse({ success: true }))
          .catch((error) => {
            sendResponse({ success: false, error: error.message });
          });
          return true;
      }
    }
    );
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "timer") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "../img/wikipedia-golf_ver2.png",
      title: "タイマー終了",
      message: "60秒が経過しました！ 拡張機能をクリックして結果を確認しましょう",
      priority: 2
    });
    chrome.storage.local.remove("endTime", () => {
      chrome.runtime.sendMessage({ action: "close_popup" });
    });
  }
});