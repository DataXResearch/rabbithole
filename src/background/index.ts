import { MessageRequest } from "../utils"
import { WebsiteStore } from "../indexedDb"

chrome.runtime.onInstalled.addListener(async () => {
  console.log("just installed!")
  WebsiteStore.init(indexedDB);
});

chrome.runtime.onMessage.addListener(
  (request, _, sendResponse) => {
    if (!("type" in request)) {
      sendResponse({
        error: "request type required"
      });
    }
    const db = new WebsiteStore(indexedDB)

    // ugly callback/.then syntax because of listener function quirks
    // see https://stackoverflow.com/questions/70353944/chrome-runtime-onmessage-returns-undefined-even-when-value-is-known-for-asynch
    switch (request.type) {
      case MessageRequest.SAVE_TAB:
        chrome.tabs.query({ active: true, lastFocusedWindow: true },
          ([tab]) => {
            const requestOptions = {
              method: 'GET',
              redirect: 'follow'
            };

            // FIXME: add some guarantees that this won't randomly crash
            fetch(`https://cardyb.bsky.app/v1/extract?url=${encodeURIComponent(tab.url)}`,
              requestOptions)
              .then(response => response.json())
              .then(result => {
                db.store({
                  url: tab.url,
                  name: (result.error === "") ? result.title : tab.title,
                  faviconUrl: tab.favIconUrl,
                  savedAt: Date.now(),
                  openGraphImageUrl: (result.error === "") ? result.image : null,
                  description: (result.error === "") ? result.description : null,
                })
                  .then(res => sendResponse(res))
                  .catch(err => {
                    console.log(err)
                    sendResponse(err)
                  });
              })
              .catch(error => console.log('error', error));
          });
        break;
      case MessageRequest.GET_ALL_ITEMS:
        db.getAll()
          .then((res) => sendResponse(res))
          .catch(err => {
            console.log(err)
            sendResponse(err)
          });
        break;
      default:
    }

    // arcane incantation required for async `sendResponse`s to work
    // https://developer.chrome.com/docs/extensions/mv3/messaging/#simple
    return true;
  }
);
