import { MessageRequest } from "../utils";
import { WebsiteStore } from "../storage/db";

function sendOverlayUpdate(tabId: number) {
  // ignore errors; receiving end won't exist if it's the newtab page
  try {
    chrome.tabs.sendMessage(tabId, { type: MessageRequest.PING });
  } catch (err) { }
}

// this is meant to be called async
function storeWebsites(
  tabs: chrome.tabs.Tab[],
  db: WebsiteStore,
  sendResponse: any,
): Promise<void[]> {
  // delegate this to db?
  // FIXME: add some guarantees that this won't randomly crash
  const promiseArray = tabs.map((tab) =>
    fetch(
      `https://cardyb.bsky.app/v1/extract?url=${encodeURIComponent(tab.url)}`,
      {
        method: "GET",
        redirect: "follow",
      },
    )
      .then((response) => response.json())
      .then((result) => {
        return {
          url: tab.url,
          name:
            result.error === "" && result.title !== ""
              ? result.title
              : tab.title,
          faviconUrl: tab.favIconUrl,
          savedAt: Date.now(),
          openGraphImageUrl: result.error === "" ? result.image : null,
          description: result.error === "" ? result.description : null,
        };
      })
      .then((website) => {
        db.saveWebsiteToProject([website])
          .then((res) => sendResponse(res))
          .catch((err) => {
            console.log(err);
            sendResponse(err);
          });
      })
      .catch((error) => {
        // just use info at hand if OG information cannot be retrieved
        // TODO: are there cases when it's preferable to do this?
        db.saveWebsiteToProject([
          {
            url: tab.url,
            name: tab.title,
            faviconUrl: tab.favIconUrl,
            savedAt: Date.now(),
            openGraphImageUrl: null,
            description: null,
          },
        ])
          .then((res) => sendResponse(res))
          .catch((err) => {
            console.log(err);
            sendResponse(err);
          });
      }),
  );

  return Promise.all(promiseArray);
}

chrome.runtime.onInstalled.addListener(async () => {
  console.log("just installed!");
  WebsiteStore.init(indexedDB);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!("type" in request)) {
    sendResponse({
      error: "request type required",
    });
  }
  const db = new WebsiteStore(indexedDB);

  // ugly callback/.then syntax because of listener function quirks
  // see https://stackoverflow.com/questions/70353944/chrome-runtime-onmessage-returns-undefined-even-when-value-is-known-for-asynch
  switch (request.type) {
    case MessageRequest.SAVE_TAB:
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) =>
        storeWebsites(tabs, db, sendResponse),
      );
      break;
    case MessageRequest.GET_ALL_ITEMS:
      db.getAllWebsites()
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;
    case MessageRequest.GET_SETTINGS:
      db.getSettings()
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;
    case MessageRequest.UPDATE_SETTINGS:
      if (!("settings" in request)) {
        sendResponse({
          error: "settings required",
        });
        break;
      }
      db.updateSettings(request.settings)
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;
    case MessageRequest.GET_ALL_PROJECTS:
      db.getAllProjects()
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;
    case MessageRequest.GET_PROJECT_SAVED_WEBSITES:
      if (!("projectId" in request)) {
        sendResponse({
          error: "projectId required",
        });
        break;
      }
      db.getAllWebsitesForProject(request.projectId)
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;
    case MessageRequest.CREATE_NEW_PROJECT:
      if (!("newProjectName" in request)) {
        sendResponse({
          error: "newProjectName required",
        });
        break;
      }
      db.createNewActiveProject(request.newProjectName)
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;
    case MessageRequest.CHANGE_ACTIVE_PROJECT:
      if (!("projectId" in request)) {
        sendResponse({
          error: "projectId required",
        });
        break;
      }
      db.changeActiveProject(request.projectId)
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;
    case MessageRequest.GET_ACTIVE_PROJECT:
      db.getActiveProject()
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;
    case MessageRequest.GET_PROJECT:
      if (!("projectId" in request)) {
        sendResponse({
          error: "projectId required",
        });
        break;
      }
      db.getProject(request.projectId)
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;
    case MessageRequest.SAVE_WINDOW_TO_NEW_PROJECT:
      chrome.tabs.query({ windowId: sender.tab.windowId }).then((tabs) => {
        let websites: string[] = tabs.map((tab) => tab.url);
        // store websites async
        storeWebsites(tabs, db, sendResponse);

        if (!("newProjectName" in request)) {
          sendResponse({
            error: "projectName required",
          });
        }
        // FIXME: remove websites to see if that fixes double website store
        db.createNewActiveProject(request.newProjectName, websites)
          .then((res) => sendResponse(res))
          .catch((err) => {
            console.log(err);
            sendResponse(err);
          });
      });

      break;
    case MessageRequest.SAVE_WINDOW_TO_ACTIVE_PROJECT:
      chrome.tabs.query({ windowId: sender.tab.windowId }).then((tabs) => {
        // store websites async
        storeWebsites(tabs, db, sendResponse);
      });

      break;
    case MessageRequest.RENAME_PROJECT:
      if (!("newName" in request) || !("projectId" in request)) {
        sendResponse({
          error: "projectId and newName required",
        });
        break;
      }
      db.renameProject(request.projectId, request.newName)
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;
    case MessageRequest.DELETE_PROJECT:
      if (!("projectId" in request)) {
        sendResponse({
          error: "projectId required",
        });
        break;
      }
      db.deleteProject(request.projectId)
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;
    case MessageRequest.DELETE_WEBSITE:
      if (!("url" in request) || !("projectId" in request)) {
        sendResponse({
          error: "projectId and url required",
        });
        break;
      }
      db.deleteWebsiteFromProject(request.projectId, request.url)
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;

    default:
  }

  // arcane incantation required for async `sendResponse`s to work
  // https://developer.chrome.com/docs/extensions/mv3/messaging/#simple
  return true;
});

// send updates to tabs when created, changed, updated
// chrome.tabs.onUpdated.addListener((tabId, info) => {
// if (info.status === "complete") {
// sendOverlayUpdate(tabId);
// }
// });
chrome.tabs.onActivated.addListener((tab) => {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabInfo) => {
    // FIXME: firefox? also maybe should be abstracted
    if ("pendingUrl" in tabInfo[0]) {
      if (
        !tabInfo[0].pendingUrl.includes("chrome://") &&
        !tabInfo[0].pendingUrl.includes("brave://") &&
        !tabInfo[0].pendingUrl.includes("edge://")
      ) {
        sendOverlayUpdate(tab.tabId);
      }
    } else {
      if (
        !tabInfo[0].url.includes("chrome://") &&
        !tabInfo[0].url.includes("brave://") &&
        !tabInfo[0].url.includes("edge://")
      ) {
        sendOverlayUpdate(tab.tabId);
      }
    }
  });
});
