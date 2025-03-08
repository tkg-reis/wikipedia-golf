// wikipedia-golf
// EXPLAIN:制限時間設定関数、関数発火時設定秒数とalarm apiの作成をする。
const timer = (time = 60) => {
  const intedTime = Number(time)
  const endTime = Date.now() + intedTime * 1000; // 現在時刻 + X秒
  const delayInMinutes = intedTime / 60 
  // 終了時刻を保存
  chrome.storage.local.set({ endTime: endTime }, () => {
    chrome.alarms.create("timer", { delayInMinutes: delayInMinutes });
  });
};

// EXPLAIN:ポップアップを表示する際に手数や始まり、終わりの言葉、制限時間を管理する。手数か制限時間が切れる、または手数以内で目的の言葉までたどり着けば、これまで遷移したurlのデータを配列でポップアップに表示する。
document.addEventListener("DOMContentLoaded", async () => {
  
  chrome.storage.local.get(["visitCount","wordList","word_start","word_end","number_of_steps","returnCheckVal", "endTime"],
    (result) => {
      const count = result.visitCount || 0;
      const wordList = result.wordList || [];
      const word_start = result.word_start || "";
      const word_end = result.word_end || "";
      const number_of_steps = result.number_of_steps || 0;
      const endtime = result.endTime;
      const remainingTime = endtime ? Math.max(0, Math.floor((endtime - Date.now()) / 1000)) : null;
      let tempCurrentWord = "";
      const table = document.querySelector("#table");
      let val = "";
      if (wordList.length > 0) {
        for (let i = 0; i < wordList.length; i++) {
          val += `
          <tr>
          <td>step${i + 1}</td>
          <td>${wordList[i]}</td>
          </tr>
          `
          tempCurrentWord = wordList[i];
        }
        table.innerHTML += val;
      }
      if (word_start && word_end && number_of_steps) {
        document.getElementById("word_start").textContent = `start word : ${word_start}`;
        document.getElementById("word_end").textContent = `end word : ${word_end}`;
        document.getElementById("number_of_steps").textContent = `Your limitation Count : ${number_of_steps}`;
        document.getElementById("catch").setAttribute("disabled", true);
        document.getElementById("second").setAttribute("disabled", true);
        document.getElementById("url").setAttribute("disabled", true);
      }

      document.getElementById("count").textContent = `Your Current Count : ${count}`;
      
      if ((wordList.length > 0 && Number(count) >= number_of_steps) ||
        (wordList.length > 0 && tempCurrentWord === word_end) || (remainingTime < 1)) {
        document.getElementById("catch").removeAttribute("disabled");
        document.getElementById("second").removeAttribute("disabled");
        document.getElementById("url").removeAttribute("disabled");
        chrome.storage.local.set({
          returnCheckVal : checkValue(word_end, wordList[wordList.length - 1])
        }).then(() => {
          chrome.storage.local.remove(
            [
              "wordList",
              "visitCount",
              "word_start",
              "word_end",
              "number_of_steps",
              "endTime",
              "selectedSecondOption",
              "selectedURLOption"
            ],
            () => {
              document.getElementById("word_start").textContent = "The game has not started yet!";
              document.getElementById("word_end").textContent = "Please push bottom button!";
              document.getElementById("number_of_steps").textContent = "Your count is no set";
              document.getElementById("count").textContent = "Welcome to wikipedia-golf!";
              document.getElementById("remaining-time").textContent = "Your time is not set";
            }
          )
        }).then(() => {
          updateResultValue().catch((error) => {
            console.error("エラー:", error);
          });
        })
      }
    }
  );

  // EXPLAIN:遷移した時に取得したurlを配列で格納。
  const updateResultValue = async () => {
    const result = await new Promise((resolve, reject) => {
      chrome.storage.local.get("returnCheckVal", (res) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(res);
        }
      });
    });
    const resultElement = document.getElementById("result_value");
    if (resultElement) {
      resultElement.innerHTML = result.returnCheckVal
    }
  };
});

// EXPLAIN:制限時間をポップアップに表示するための機能
function updateRemainingTime() {
  chrome.storage.local.get("endTime", (data) => {
    if (data.endTime) {
      const remainingTime = Math.max(0, Math.floor((data.endTime - Date.now()) / 1000));
      document.getElementById("remaining-time").textContent = `time limit : ${remainingTime} sec`;
      // MEMO:0にするとfalsyな値になるため処理が面倒になる。
      if (remainingTime < 1) {
        chrome.storage.local.remove("endTime");
      }
    }
  });
}

// EXPLAIN:1秒ごとに経過時間を更新
setInterval(updateRemainingTime, 1000);

// EXPLAIN:ポップアップを開いたときに経過時間を更新
updateRemainingTime();

// EXPLAIN:終わりの言葉と自分がたどってきたurlの道の終着点のデータを判定してsuccess/failureを出力する関数。
function checkValue(endtWord, resultWord) {
  if(endtWord != "" && resultWord != undefined) {
    if (endtWord == resultWord) {
      return outputImg("success");
    } else {
      return outputImg("failure");;
    }
  }
  return "No result"
}

function outputImg(result) {
  if(result === "success") {
    const imgPath = "img/giffycanvas-success.gif";
    const imgAlt = "successImg";
    return `<img src='${imgPath}' alt='${imgAlt}'>`
  } else if(result === "failure") {
    const imgPath = "img/giffycanvas-failure.gif";
    const imgAlt = "failureImg";
    return `<img src='${imgPath}' alt='${imgAlt}'>`
  }
}
// EXPLAIN:ランダムな数を生成する関数
const randomNumberFunc = () => {
  return Math.floor(Math.random() * (9 - 5 + 1)) + 5;
};

// EXPLAIN:wikipedia apiで単語をランダムに2つ取得する関数
async function getRandomWikipediaTitle() {
  const endpoint = "https://ja.wikipedia.org/w/api.php";
  const params = {
    action: "query",
    format: "json",
    list: "random",
    rnnamespace: 0,
    // MEMO:2つのランダムタイトルを取得
    rnlimit: 2,
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
    return null;
  }
}

// EXPLAIN:3秒後にapiで取得したページのリンク先に遷移する関数。
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
document.getElementById("second").addEventListener("change", (e) => {
  chrome.storage.local.set({
    selectedSecondOption: e.target.value
  }
  );
});

document.getElementById("url").addEventListener("change", async(e) => {
  const sanitizedVal = sanitizeHTML(e.target.value);
  if(await checkWikipediaURL(sanitizedVal)) {
    chrome.storage.local.set({
      selectedURLOption: sanitizedVal
    }
    );
  } else {
    alert("入力情報が不正です。");
    document.getElementById("url").value = "";
  }
})
// EXPLAIN:始まりと終わりの言葉をランダムで取得して画面に表示する関数。ここでtimerとページ遷移関数を発火させる。
document.getElementById("catch").addEventListener("click", async () => {
  const [randomTitle_start, randomTitle_end] = await getRandomWikipediaTitle();
  if (randomTitle_start && randomTitle_end) {
    chrome.storage.local.get(["selectedURLOption","selectedSecondOption"], (data) => {
      const startWord = `start word : ${randomTitle_start.title}`;
      const endWord = `end word : ${data.selectedURLOption ? data.selectedURLOption : randomTitle_end.title}`;
      document.getElementById("word_start").textContent = startWord;
      document.getElementById("word_end").textContent = endWord;

      chrome.storage.local.set({
        word_start: randomTitle_start.title,
        word_end: data.selectedURLOption ? data.selectedURLOption : randomTitle_end.title,
        number_of_steps: randomNumberFunc(),
      });
      timer(data.selectedSecondOption ? data.selectedSecondOption : 60);
    })
    await wikipediaPageOpen(randomTitle_start.title);
  } else {
    console.log("タイトルの取得に失敗しました。");
  }
});

// EXPLAIN:メッセージを受け取り、ポップアップを自動で閉じる関数。
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "close_popup") {
    window.close();
  }
});

function sanitizeHTML(input) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  return String(input).replace(/[&<>"'`=\/]/g, (char) => map[char]);
}

async function checkWikipediaURL(data) {
  const baseURL = `https://ja.wikipedia.org/wiki/${encodeURIComponent(data)}`;
  const response = await fetch(baseURL);
  return response.ok;
}

// ***************************************************************************
//wikipedia-compare
// EXPLAIN:
document.querySelectorAll('input[name="view"]').forEach(radio => {
  radio.addEventListener('change', function() {
      document.querySelectorAll('.wikipedia-content').forEach(div => div.classList.remove('active'));
      document.getElementById(this.value).classList.add('active');
  });
});

