// content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "switchDomEffect") {
    if (!message.enabled) {
      chrome.runtime.sendMessage({ action: "open_popup" });
      applyDomEffect();
    } else {
      removeDomEffect();
    }
    sendResponse({ status: "ok" });
  }
});

function applyDomEffect() {
  const enableClickLinks = document.querySelectorAll("a[href^='/wiki/']");
  enableClickLinks.forEach((includeLink) => {
    if (includeLink.dataset.originalBackgroundColor === undefined) {
      includeLink.dataset.originalBackgroundColor = includeLink.style.backgroundColor;
    }
    if (includeLink.dataset.originalBorderWidth === undefined) {
      includeLink.dataset.originalBorderWidth = includeLink.style.borderWidth;
    }
    if (includeLink.dataset.originalBorderStyle === undefined) {
      includeLink.dataset.originalBorderStyle = includeLink.style.borderStyle;
    }
    if (includeLink.dataset.originalBorderColor === undefined) {
      includeLink.dataset.originalBorderColor = includeLink.style.borderColor;
    }

    includeLink.style.backgroundColor = "yellow";
    includeLink.style.borderWidth = "1px";
    includeLink.style.borderStyle = "dotted";
    includeLink.style.borderColor = "black";
  });

  document
    .querySelectorAll("a[href]:not(a[href^='/wiki/'])")
    .forEach((excludeLink) => {
      if (excludeLink.dataset.originalPointerEvents === undefined) {
        excludeLink.dataset.originalPointerEvents = excludeLink.style.pointerEvents;
      }
      if (excludeLink.dataset.originalColor === undefined) {
        excludeLink.dataset.originalColor = excludeLink.style.color;
      }

      if (excludeLink.parentElement) {
        if (excludeLink.parentElement.dataset.originalBackgroundColor === undefined) {
          excludeLink.parentElement.dataset.originalBackgroundColor = excludeLink.parentElement.style.backgroundColor;
        }
        excludeLink.parentElement.style.backgroundColor = "black";
      }

      excludeLink.style.pointerEvents = "none";
      excludeLink.style.color = "black";
    });
}

function removeDomEffect() {
  const enableClickLinks = document.querySelectorAll("a[href^='/wiki/']");
  enableClickLinks.forEach((includeLink) => {
    if (includeLink.dataset.originalBackgroundColor !== undefined) {
      includeLink.style.backgroundColor = includeLink.dataset.originalBackgroundColor;
      delete includeLink.dataset.originalBackgroundColor;
    } else {
      includeLink.style.backgroundColor = "";
    }

    if (includeLink.dataset.originalBorderWidth !== undefined) {
      includeLink.style.borderWidth = includeLink.dataset.originalBorderWidth;
      delete includeLink.dataset.originalBorderWidth;
    } else {
      includeLink.style.borderWidth = "";
    }

    if (includeLink.dataset.originalBorderStyle !== undefined) {
      includeLink.style.borderStyle = includeLink.dataset.originalBorderStyle;
      delete includeLink.dataset.originalBorderStyle;
    } else {
      includeLink.style.borderStyle = "";
    }

    if (includeLink.dataset.originalBorderColor !== undefined) {
      includeLink.style.borderColor = includeLink.dataset.originalBorderColor;
      delete includeLink.dataset.originalBorderColor;
    } else {
      includeLink.style.borderColor = "";
    }
  });

  document
    .querySelectorAll("a[href]:not(a[href^='/wiki/'])")
    .forEach((excludeLink) => {
      if (excludeLink.dataset.originalPointerEvents !== undefined) {
        excludeLink.style.pointerEvents = excludeLink.dataset.originalPointerEvents;
        delete excludeLink.dataset.originalPointerEvents;
      } else {
        excludeLink.style.pointerEvents = "";
      }

      if (excludeLink.dataset.originalColor !== undefined) {
        excludeLink.style.color = excludeLink.dataset.originalColor;
        delete excludeLink.dataset.originalColor;
      } else {
        excludeLink.style.color = "";
      }

      const parentElement = excludeLink.parentElement;
      if (parentElement) {
        if (parentElement.dataset.originalBackgroundColor !== undefined) {
          parentElement.style.backgroundColor = parentElement.dataset.originalBackgroundColor;
          delete parentElement.dataset.originalBackgroundColor;
        } else {
          parentElement.style.backgroundColor = "";
        }
      }
    });
}


