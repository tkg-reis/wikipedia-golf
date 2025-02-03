const timer = () => {
  const endTime = Date.now() + 60 * 1000; // 現在時刻 + 60秒

  // 終了時刻を保存
  chrome.storage.local.set({ endTime: endTime }, () => {
    chrome.alarms.create("timer", { delayInMinutes: 1 });
    alert("60秒の制限タイマーを開始しました！");
  });
};

// TODO: apiを読んだ時点でendTimeをどこかで仕込む必要がある。そうしないといつまでもundefind
document.addEventListener("DOMContentLoaded", async () => {
  
  chrome.storage.local.get(["visitCount","wordList","word_start","word_end","number_of_steps","resultValue","returnCheckVal", "endTime"],
    (result) => {
      const count = result.visitCount || 0;
      const wordList = result.wordList || [];
      const word_start = result.word_start || "";
      const word_end = result.word_end || "";
      const number_of_steps = result.number_of_steps || 0;
      const endtime = result.endTime;
      const remainingTime = endtime ? Math.max(0, Math.floor((endtime - Date.now()) / 1000)) : null;
      // const resultValue = result.resultValue || "";
      let tempCurrentWord = "";

      if (wordList.length > 0) {
        for (const word of wordList) {
          document.getElementById("chainWords").textContent += `${word}\n =>`; // 改行で連結する
          tempCurrentWord = word;
        }
      } else {
        document.getElementById("chainWords").textContent =
          "登録されたURLがありません";
      }

      if (word_start && word_end && number_of_steps) {
        document.getElementById("word_start").textContent = word_start;
        document.getElementById("word_end").textContent = word_end;
        document.getElementById("number_of_steps").textContent =
          number_of_steps;
        // startTimer(60);
        document.getElementById("catch").setAttribute("disabled", true);
      } else {
        document.getElementById("views").textContent =
          "ゲームはスタートしていません";
      }

      document.getElementById("count").textContent = count;
      
      if ((wordList.length > 0 && Number(document.getElementById("count").textContent) >= number_of_steps) ||
        (wordList.length > 0 && tempCurrentWord === word_end) || (remainingTime < 1)) {
        document.getElementById("catch").removeAttribute("disabled");
        chrome.storage.local.set({
          returnCheckVal : checkValue(word_end, wordList[wordList.length - 1]) || "no data",
          resultValue : wordList.toString(),
        }).then(() => {
          chrome.storage.local.remove(
            [
              "wordList",
              "visitCount",
              "word_start",
              "word_end",
              "number_of_steps",
              "endTime"
            ],
            () => {
              document.getElementById("word_start").textContent = "";
              document.getElementById("word_end").textContent = "";
              document.getElementById("number_of_steps").textContent = 0;
              document.getElementById("count").textContent = 0;
              document.getElementById("chainWords").textContent = "";
            }
          );
        })
      }
      // きちんとgetで値を取得や初期化をしていないためか。
      // getを使用してresultがあるかいなかを判別して、非同期処理を使ってresultのデータ確実に格納されるようにリファクタリングする。
      // if (result.resultValue) {
      //   document.getElementById("result_value").textContent =
      //     result.resultValue + result.returnCheckVal;
      // } else {
      //   document.getElementById("result_value").textContent = "データなし";
      // }
    }
  );
  // if(chrome.storage.local.get("returnCheckVal", "resultValue")) {

  // }

  const updateResultValue = async () => {
    const result = await new Promise((resolve, reject) => {
      chrome.storage.local.get(["resultValue", "returnCheckVal"], (res) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(res);
        }
      });
    });
  
    const resultElement = document.getElementById("result_value");
    if (resultElement) {
      resultElement.textContent =
        result.resultValue || result.returnCheckVal
          ? (result.resultValue || "") + (result.returnCheckVal || "")
          : "データなし";
    }
  };
  
  updateResultValue().catch((error) => {
    console.error("エラー:", error);
  });
  
});

function updateRemainingTime() {
  chrome.storage.local.get("endTime", (data) => {
    if (data.endTime) {
      const remainingTime = Math.max(0, Math.floor((data.endTime - Date.now()) / 1000));
      document.getElementById("remaining-time").textContent = remainingTime;

      // 0秒になったらタイマーをリセット
      // 0にするとfalsyな値になるため処理が面倒になるため一時的に下記の処理
      if (remainingTime < 1) {
        chrome.storage.local.remove("endTime");
      }
    }
  });
}

// 1秒ごとに経過時間を更新
setInterval(updateRemainingTime, 1000);

// ポップアップを開いたときに経過時間を更新
updateRemainingTime();

function checkValue(endtWord, resultWord) {
  if (endtWord == resultWord) {
    return "\n success";
  } else {
    return "\n failure";
  }
}

// MEMO:  ランダムな数を生成する関数
const randomNumberFunc = () => {
  return Math.floor(Math.random() * (9 - 5 + 1)) + 5;
};
// MEMO:  wikipedia apiで単語をランダムに2つ取得する関数
// FIX: 返値の渡し方のリファクタリング
async function getRandomWikipediaTitle() {
  const endpoint = "https://ja.wikipedia.org/w/api.php";
  const params = {
    action: "query",
    format: "json",
    list: "random",
    rnnamespace: 0,
    rnlimit: 2, // 2つのランダムタイトルを取得
  };
  const url = `${endpoint}?${new URLSearchParams(params).toString()}&origin=*`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTPエラー: ${response.status}`);
    }
    const data = await response.json();
    const randomTitle = data.query.random;
    return randomTitle;
  } catch (error) {
    console.error("エラーが発生しました:", error);
    return null;
  }
}

function wikipediaPageOpen(val) {
  return new Promise((resolve, reject) => {
    try {
      setTimeout(() => {
        resolve(
          window.open(
            `https://ja.wikipedia.org/wiki/${encodeURIComponent(val)}`,
            "_blank"
          )
        );
      }, 3000);
    } catch (error) {
      reject(console.log(error));
    }
  });
}

// TODO:画面遷移するとフェッチしたデータが保存されないため、storage apiのセッションストレージタイプで保存しておく。
// TODO: 加えてユーザーが選択したデータを元にして画面遷移をするためにフェッチしたデータを一時的に保持してから対象のurlに遷移するようにする。
// FIX: 取得配列のリファクタリング
document.getElementById("catch").addEventListener("click", async () => {
  const [randomTitle_start, randomTitle_end] = await getRandomWikipediaTitle();
  if (randomTitle_start && randomTitle_end) {
    // MEMO: 個人が終着点のデータを登録できるようにすると面白いかも。
    const startWord = `start word : ${randomTitle_start.title}`;
    const endWord = `end word : ${randomTitle_end.title}`;
    document.getElementById("word_start").textContent = startWord;
    document.getElementById("word_end").textContent = endWord;
    chrome.storage.local.set({
      word_start: randomTitle_start.title,
      word_end: randomTitle_end.title,
      number_of_steps: randomNumberFunc(), // ランダムな数をカウント
    });
    timer();
    await wikipediaPageOpen(randomTitle_start.title);
  } else {
    console.log("タイトルの取得に失敗しました。");
  }
});