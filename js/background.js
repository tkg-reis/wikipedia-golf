// MEMO: 拡張機能のアイコンからファイルに定義されたプリントデバッグを見ることができる。
// MEMO: バックエンドでimportを使おうとするとエラー。削除して読み込み直し必須。使うならviteなどのモジュールバンドラーを採用する必要あり。

// EXPLAIN:監視するURL
const targetURL = "https://ja.wikipedia.org/wiki/";

// EXPLAIN:カウントの作成、更新の関数
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

// EXPLAIN:これまで踏んだurlのデータを配列としてstorage apiに格納する関数
const saveURLToStorage = (newURL) => {
  chrome.storage.local.get("wordList", (result) => {
    let wordList = result.wordList || [];
    if (!wordList.includes(newURL)) {
      //MEMO: 正規表現で最後のパス部分を抽出
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

// EXPLAIN: wikipedia urlが変更されたら、遷移した回数を更新、urlのデータを取得更新、notificationの表示、遷移した時ポップアップを自動で表示する処理
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

// EXPLAIN:chrome.alarms.create("timer", { delayInMinutes: 1 });のメソッドが終了した際notificationを出して、timerで定義した秒数を削除する。その後画面を一度リフレッシュさせるためにポップアップを自動で閉じる。
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "timer") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "../img/wikipedia-golf_ver2.png",
      title: "タイマー終了",
      message: "設定した制限時間が経過しました! 拡張機能をクリックして結果を確認しましょう",
      priority: 2
    });
    chrome.storage.local.remove("endTime", () => {
      chrome.runtime.sendMessage({ action: "close_popup" }).catch((error) => {
        console.log(error);
    });
    });
  }
});

// EXPLAIN:ページを読み込む前に該当の部分にcssを流しこむ処理
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) { // メインフレームのみ適用
    chrome.scripting.insertCSS({
      target: { tabId: details.tabId },
      css: ".vector-header-end { display: none !important; }"
    }).catch(console.error);
  }
});