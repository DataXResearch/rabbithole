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
                    ([tab]) => db.store({
                        url: tab.url,
                        name: tab.title,
                        faviconUrl: tab.favIconUrl,
                        savedAt: Date.now(),
                    })
                        .then((res) => sendResponse(res)));

                break;
            case MessageRequest.GET_ALL_ITEMS:
                db.getAll()
                    .then((res) => sendResponse(res));
                break;
            default:
        }

        // arcane incantation required for async `sendResponse`s to work
        // https://developer.chrome.com/docs/extensions/mv3/messaging/#simple
        return true;
    }
);
