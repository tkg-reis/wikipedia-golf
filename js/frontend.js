// wikipedia-golf
// EXPLAIN:制限時間設定関数、関数発火時設定秒数とalarm apiの作成をする。
const timer = (time = 60) => {
  const intedTime = Number(time);
  const endTime = Date.now() + intedTime * 1000; // 現在時刻 + X秒
  const delayInMinutes = intedTime / 60;
  // 終了時刻を保存
  chrome.storage.session.set({ endTime: endTime }, () => {
    chrome.alarms.create("timer", { delayInMinutes: delayInMinutes });
  });
};

const updateResultValue = async () => {
  const { returnCheckVal = "No result" } = await chrome.storage.session.get(["returnCheckVal"]);
  const resultElement = document.getElementById("result_value");
  if (!resultElement) {
    return;
  }

  if (returnCheckVal && returnCheckVal !== "No result") {
    resultElement.innerHTML = returnCheckVal;
  } else {
    resultElement.textContent = "No result";
  }
};

const toggleGameInputs = (shouldDisable) => {
  const controls = ["catch", "second", "url"];
  controls.forEach((id) => {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }

    if (shouldDisable) {
      element.setAttribute("disabled", true);
    } else {
      element.removeAttribute("disabled");
    }
  });
};

const applyDefaultGameCopy = () => {
  const defaultCopy = {
    "word_start": "The game has not started yet!",
    "word_end": "Please push bottom button!",
    "number_of_steps": "Your count is no set",
    "remaining-time": "Your time is not set",
  };

  Object.entries(defaultCopy).forEach(([id, message]) => {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = message;
    }
  });
};

const updateCountCopy = (gameStatus, visitCount) => {
  const countNode = document.getElementById("count");
  if (!countNode) {
    return;
  }

  if (gameStatus === "inProgress") {
    countNode.textContent = `Your Current Count : ${visitCount}`;
  } else {
    countNode.textContent = "Welcome to wikipedia-golf!";
  }
};

const updateLimitationCopy = (gameStatus, numberOfSteps) => {
  const limitationNode = document.getElementById("number_of_steps");
  if (!limitationNode) {
    return;
  }

  if (numberOfSteps) {
    if (gameStatus === "completed") {
      limitationNode.textContent = `Your limitation Count was ${numberOfSteps}`;
    } else {
      limitationNode.textContent = `Your limitation Count : ${numberOfSteps}`;
    }
  } else {
    limitationNode.textContent = "Your count is no set";
  }
};

const updateTableTitle = (gameStatus, hasSteps) => {
  const tableTitleNode = document.getElementById("table-title");
  if (!tableTitleNode) {
    return;
  }

  if (gameStatus === "inProgress") {
    tableTitleNode.textContent = hasSteps ? "Current Steps" : "";
  } else if (hasSteps) {
    tableTitleNode.textContent = "前回の成績";
  } else {
    tableTitleNode.textContent = "";
  }
};

// EXPLAIN:ポップアップを表示する際に手数や始まり、終わりの言葉、制限時間を管理する。手数か制限時間が切れる、または手数以内で目的の言葉までたどり着けば、これまで遷移したurlのデータを配列でポップアップに表示する。
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const sessionKeys = [
      "visitCount",
      "wordList",
      "word_start",
      "word_end",
      "number_of_steps",
      "returnCheckVal",
      "endTime",
      "gameStatus",
    ];
    let sessionData = await chrome.storage.session.get(sessionKeys);

    if (!sessionData.gameStatus && (!sessionData.wordList || sessionData.wordList.length === 0)) {
      const legacyData = await chrome.storage.local.get(sessionKeys);
      const hasLegacyData = Object.entries(legacyData).some(([key, value]) => {
        if (key === "wordList") {
          return Array.isArray(value) && value.length > 0;
        }
        return Boolean(value);
      });

      if (hasLegacyData) {
        const derivedStatus = legacyData.word_start ? "completed" : "idle";
        sessionData = {
          ...legacyData,
          gameStatus: derivedStatus,
        };
        await chrome.storage.session.set({
          ...legacyData,
          gameStatus: derivedStatus,
        });
        await chrome.storage.local.remove(sessionKeys);
      }
    }

    const {
      visitCount = 0,
      wordList = [],
      word_start = "",
      word_end = "",
      number_of_steps = 0,
      returnCheckVal = "No result",
      endTime,
      gameStatus = "idle",
    } = sessionData;

    const table = document.querySelector("#table");
    if (table) {
      let rows = "";
      wordList.forEach((word, index) => {
        rows += `
          <tr>
            <td>step${index + 1}</td>
            <td>${word}</td>
          </tr>`;
      });
      table.innerHTML = rows;
    }

    updateTableTitle(gameStatus, wordList.length > 0);

    if (word_start && word_end && number_of_steps) {
      document.getElementById("word_start").textContent = `start word : ${word_start}`;
      document.getElementById("word_end").textContent = `end word : ${word_end}`;
      updateLimitationCopy(gameStatus, number_of_steps);
    } else {
      applyDefaultGameCopy();
    }

    updateCountCopy(gameStatus, visitCount);

    toggleGameInputs(gameStatus === "inProgress");

    const remainingTime = endTime ? Math.max(0, Math.floor((endTime - Date.now()) / 1000)) : null;
    if (remainingTime !== null) {
      document.getElementById("remaining-time").textContent = `time limit : ${remainingTime} sec`;
    } else if (gameStatus !== "inProgress") {
      document.getElementById("remaining-time").textContent = "Your time is not set";
    }

    const lastVisitedWord = wordList[wordList.length - 1];
    const hasReachedStepLimit = number_of_steps > 0 && visitCount >= number_of_steps;
    const hasReachedGoal = Boolean(word_end && lastVisitedWord && word_end === lastVisitedWord);
    const isTimeUp = remainingTime !== null && remainingTime < 1;

    if (gameStatus === "inProgress" && (hasReachedStepLimit || hasReachedGoal || isTimeUp)) {
      let checkResult;
      if (isTimeUp && !hasReachedGoal) {
        checkResult = "No result";
      } else {
        checkResult = checkValue(word_end, lastVisitedWord);
      }
      await chrome.storage.session.set({
        gameStatus: "completed",
        returnCheckVal: checkResult,
      });

      if (isTimeUp) {
        await chrome.storage.session.remove("endTime");
      }

      toggleGameInputs(false);
      updateCountCopy("completed", visitCount);
      updateTableTitle("completed", wordList.length > 0);
      updateLimitationCopy("completed", number_of_steps);
      await updateResultValue();
    } else if (gameStatus === "completed") {
      updateCountCopy(gameStatus, visitCount);
      updateTableTitle(gameStatus, wordList.length > 0);
      updateLimitationCopy(gameStatus, number_of_steps);
      await updateResultValue();
    } else if (gameStatus === "idle") {
      const resultElement = document.getElementById("result_value");
      if (resultElement) {
        resultElement.textContent = "No result";
      }
    } else if (returnCheckVal) {
      // Fallback when migrating from older storage state
      const resultElement = document.getElementById("result_value");
      if (resultElement) {
        resultElement.innerHTML = returnCheckVal;
      }
    }
  } catch (error) {
    console.error("Failed to initialize popup:", error);
  }
});

// EXPLAIN:制限時間をポップアップに表示するための機能
function updateRemainingTime() {
  chrome.storage.session.get(["endTime", "gameStatus"], (data) => {
    const remainingTimeNode = document.getElementById("remaining-time");
    if (!remainingTimeNode) {
      return;
    }

    if (data.endTime) {
      const remainingTime = Math.max(0, Math.floor((data.endTime - Date.now()) / 1000));
      remainingTimeNode.textContent = `time limit : ${remainingTime} sec`;
      // MEMO:0にするとfalsyな値になるため処理が面倒になる。
      if (remainingTime < 1) {
        chrome.storage.session.remove("endTime", () => {
          if (chrome.runtime.lastError) {
            console.error("Failed to clear endTime", chrome.runtime.lastError);
            return;
          }
          if (data.gameStatus !== "inProgress") {
            remainingTimeNode.textContent = "Your time is not set";
          }
        });
      }
    } else if (data.gameStatus !== "inProgress") {
      remainingTimeNode.textContent = "Your time is not set";
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
  try {
    toggleGameInputs(true);

    const table = document.querySelector("#table");
    if (table) {
      table.innerHTML = "";
    }
    updateTableTitle("inProgress", false);

    await chrome.storage.session.remove("endTime");
    await chrome.storage.session.set({
      visitCount: 0,
      wordList: [],
      returnCheckVal: "No result",
      gameStatus: "inProgress",
    });

    updateCountCopy("inProgress", 0);
    await updateResultValue();

    const randomTitles = await getRandomWikipediaTitle();
    if (!randomTitles || randomTitles.length < 2) {
      console.log("タイトルの取得に失敗しました。");
      toggleGameInputs(false);
      applyDefaultGameCopy();
      updateCountCopy("idle", 0);
      updateTableTitle("idle", false);
      return;
    }

    const [randomTitle_start, randomTitle_end] = randomTitles;
    const { selectedURLOption, selectedSecondOption } = await chrome.storage.local.get([
      "selectedURLOption",
      "selectedSecondOption",
    ]);

    const endWordTitle = selectedURLOption ? selectedURLOption : randomTitle_end.title;
    const startWordCopy = `start word : ${randomTitle_start.title}`;
    const endWordCopy = `end word : ${endWordTitle}`;

    document.getElementById("word_start").textContent = startWordCopy;
    document.getElementById("word_end").textContent = endWordCopy;

    const numberOfSteps = randomNumberFunc();
    updateLimitationCopy("inProgress", numberOfSteps);

    await chrome.storage.session.set({
      word_start: randomTitle_start.title,
      word_end: endWordTitle,
      number_of_steps: numberOfSteps,
    });

    const timerSeconds = selectedSecondOption ? Number(selectedSecondOption) : 60;
    timer(timerSeconds);
    document.getElementById("remaining-time").textContent = `time limit : ${timerSeconds} sec`;

    await wikipediaPageOpen(randomTitle_start.title);
  } catch (error) {
    console.error("Failed to start wikipedia-golf", error);
    toggleGameInputs(false);
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
  const trimmedData = data.trim();
  if (!trimmedData) {
    return false;
  }

  const endpoint = "https://ja.wikipedia.org/w/api.php";
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    titles: trimmedData,
    origin: "*"
  });

  try {
    const response = await fetch(`${endpoint}?${params.toString()}`);
    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const pages = data?.query?.pages;
    if (!pages) {
      return false;
    }

    return Object.values(pages).every((page) => page.missing === undefined);
  } catch (error) {
    console.error("wikipedia page validation error", error);
    return false;
  }
}

// Highlight toggle removed in issue #38; no DOM effect messaging required here anymore.
// ***************************************************************************
//wikipedia-compare
// EXPLAIN:
document.querySelectorAll('input[name="view"]').forEach(radio => {
  radio.addEventListener('change', function() {
      document.querySelectorAll('.wikipedia-content').forEach(div => div.classList.remove('active'));
      document.getElementById(this.value).classList.add('active');
  });
});

document.getElementById('catch-data').addEventListener('click', async() => {
  try {
    document.getElementById("compare-first-count").textContent = "";
    document.getElementById("compare-second-count").textContent = "";
    const randomTitle = await getRandomWikipediaTitle();
    const tmpCountData = randomTitle.map(title => getWikipediaViewCount(title.id));
    const [compareFirstCount, compareSecondCount] = await Promise.all(tmpCountData);
    console.log(compareFirstCount);
    console.log(compareSecondCount);
    document.getElementById("compare-first").textContent = randomTitle[0].title;
    document.getElementById("compare-second").textContent = randomTitle[1].title;
    setTimeout(() => {
      document.getElementById("compare-first-count").textContent = compareFirstCount
      document.getElementById("compare-second-count").textContent = compareSecondCount
    }, 5000);
  } catch (error) {
    throw new Error(`Error getting ${error}`);
  }
});

async function getWikipediaViewCount(pageid) {
  const endpoint = "https://ja.wikipedia.org/w/api.php";
  const params = {
    action: "query",
    prop: "pageviews",
    format: "json",
    pageids : pageid
  };
  const url = `${endpoint}?${new URLSearchParams(params).toString()}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTPエラー: ${response.status}`);
    }
    const data = await response.json();
    const countobject = data.query.pages[pageid].pageviews;
    let count = 0; 
    for(num of Object.values(countobject)) {
      if(num === null) continue;
      count += num
    }
    return count;
  } catch (error) {
    return null;
  }
}
