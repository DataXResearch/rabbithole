import { MessageRequest } from "../utils"

chrome.runtime.onInstalled.addListener(async () => {
  console.log("just installed!")
});

chrome.runtime.onMessage.addListener(
  (request, _, sendResponse) => {
    if (request.type === MessageRequest.GET_TAB) {
      chrome.tabs.query({ active: true, lastFocusedWindow: true },
        // ugly callback syntax because of listener function quirks
        // see https://stackoverflow.com/questions/70353944/chrome-runtime-onmessage-returns-undefined-even-when-value-is-known-for-asynch
        ([tab]) => {
          sendResponse(tab);
        });
    }
    return true;
  }
);
