import { MessageRequest, Logger } from "../utils";
import { WebsiteStore } from "../storage/db";
import type { Burrow, Website, Trail } from "../utils/types";
import { getSession } from "../atproto/client";
import { syncBurrowToCollection } from "../atproto/cosmik";
import { storeWebsites } from "../utils/browser";
import {
  importBookmarksFromBrowser,
  importTabGroupsFromBrowser,
} from "../utils/import";

chrome.runtime.onInstalled.addListener(async () => {
  WebsiteStore.init(indexedDB);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!("type" in request)) {
    sendResponse({
      error: "request type required",
    });
    // arcane incantation required for async `sendResponse`s to work
    // https://developer.chrome.com/docs/extensions/mv3/messaging/#simple
    return true;
  }

  const requestName = MessageRequest[request.type] || "UNKNOWN_REQUEST";

  Logger.info(`Background received: ${requestName}`, {
    request,
    sender: sender.tab ? `Tab ${sender.tab.id}` : "Extension",
  });

  const db = new WebsiteStore(indexedDB);

  const handleError = (err: any) => {
    Logger.error(`${requestName} failed`, err);
    sendResponse({ error: err.message || "Unknown error" });
  };

  // ugly callback/.then syntax because of listener function quirks
  // see https://stackoverflow.com/questions/70353944/chrome-runtime-onmessage-returns-undefined-even-when-value-is-known-for-asynch
  switch (request.type) {
    case MessageRequest.SAVE_TAB:
      chrome.tabs.query(
        { active: true, lastFocusedWindow: true },
        async (tabs) => {
          try {
            const sites = await storeWebsites(tabs, db);
            if (sites.length > 0) {
              const activeBurrow = await db.getActiveBurrow();
              if (activeBurrow) {
                await db.saveWebsitesToBurrow(sites);
              }

              // Also add to active rabbithole meta
              const activeRabbithole = await db.getActiveRabbithole();
              if (activeRabbithole) {
                const urls = sites.map((s) => s.url);
                await db.addWebsitesToRabbitholeMeta(activeRabbithole.id, urls);
              }
            }
            sendResponse({ success: true });
          } catch (e) {
            handleError(e);
          }
        },
      );
      break;

    case MessageRequest.GET_ALL_ITEMS:
      db.getAllWebsites()
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.GET_SETTINGS:
      db.getSettings()
        .then((res) => sendResponse(res))
        .catch(handleError);
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
        .catch(handleError);
      break;

    case MessageRequest.GET_ALL_BURROWS:
      db.getAllBurrows()
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.GET_BURROW_WEBSITES:
      if (!("burrowId" in request)) {
        sendResponse({
          error: "burrowId required",
        });
        break;
      }
      db.getAllWebsitesForBurrow(request.burrowId)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.GET_RABBITHOLE_WEBSITES:
      if (!("rabbitholeId" in request)) {
        sendResponse({ error: "rabbitholeId required" });
        break;
      }
      db.getAllWebsitesForRabbithole(request.rabbitholeId)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.CREATE_NEW_BURROW:
      if (!("newBurrowName" in request)) {
        sendResponse({
          error: "newBurrowName required",
        });
        break;
      }
      db.createNewActiveBurrow(request.newBurrowName)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.CHANGE_ACTIVE_BURROW:
      (async () => {
        try {
          const burrowId = "burrowId" in request ? request.burrowId : null;
          await db.changeActiveBurrow(burrowId);

          // If selecting a burrow, also set its parent rabbithole as active
          if (burrowId) {
            const parentRabbithole =
              await db.fetchRabbitholeForBurrow(burrowId);
            await db.changeActiveRabbithole(parentRabbithole.id);
          }

          sendResponse({ success: true });
        } catch (err) {
          handleError(err);
        }
      })();
      break;

    case MessageRequest.GET_ACTIVE_BURROW:
      db.getActiveBurrow()
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.GET_BURROW:
      if (!("burrowId" in request)) {
        sendResponse({
          error: "burrowId required",
        });
        break;
      }
      db.getBurrow(request.burrowId)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.SAVE_WINDOW_TO_NEW_BURROW:
      chrome.tabs
        .query({ windowId: sender.tab.windowId })
        .then(async (tabs) => {
          try {
            if (!("newBurrowName" in request)) {
              sendResponse({ error: "burrowName required" });
              return;
            }

            const sites = await storeWebsites(tabs, db);
            const urls = sites.map((s) => s.url);

            const burrow = await db.createNewActiveBurrow(
              request.newBurrowName,
              urls,
            );

            const activeRabbithole = await db.getActiveRabbithole();
            if (activeRabbithole) {
              await db.addWebsitesToRabbitholeMeta(activeRabbithole.id, urls);
            }

            sendResponse(burrow);
          } catch (e) {
            handleError(e);
          }
        });
      break;

    case MessageRequest.SAVE_WINDOW_TO_ACTIVE_BURROW:
      chrome.windows.getCurrent().then((window) => {
        chrome.tabs.query({ windowId: window.id }).then(async (tabs) => {
          try {
            const sites = await storeWebsites(tabs, db);

            if (sites.length > 0) {
              await db.saveWebsitesToBurrow(sites);

              // make sure to sync with rabbithole meta
              const activeBurrow = await db.getActiveBurrow();
              if (activeBurrow) {
                const rabbithole = await db.fetchRabbitholeForBurrow(
                  activeBurrow.id,
                );
                const urls = sites.map((s) => s.url);
                await db.addWebsitesToRabbitholeMeta(rabbithole.id, urls);
              }
            }

            sendResponse({ success: true });
          } catch (e) {
            handleError(e);
          }
        });
      });
      break;

    case MessageRequest.SAVE_WINDOW_TO_RABBITHOLE:
      if (!("rabbitholeId" in request)) {
        sendResponse({ error: "rabbitholeId required" });
        break;
      }
      chrome.windows.getCurrent().then((window) => {
        chrome.tabs.query({ windowId: window.id }).then(async (tabs) => {
          try {
            const sites = await storeWebsites(tabs, db);
            const urls = sites.map((s) => s.url);
            await db.addWebsitesToRabbitholeMeta(request.rabbitholeId, urls);
            sendResponse({ success: true });
          } catch (e) {
            handleError(e);
          }
        });
      });
      break;

    case MessageRequest.UPDATE_RABBITHOLE_PINNED_WEBSITES:
      chrome.tabs
        .query({ windowId: sender.tab.windowId })
        .then(async (tabs) => {
          try {
            const sites = await storeWebsites(tabs, db);
            const urls = sites.map((s) => s.url);

            const activeRabbithole = await db.getActiveRabbithole();
            if (activeRabbithole) {
              await db.updateRabbitholeActiveTabs(activeRabbithole.id, urls);
              await db.addWebsitesToRabbitholeMeta(activeRabbithole.id, urls);
            }

            sendResponse({ success: true });
          } catch (e) {
            handleError(e);
          }
        });
      break;

    case MessageRequest.RENAME_BURROW:
      if (!("newName" in request) || !("burrowId" in request)) {
        sendResponse({
          error: "burrowId and newName required",
        });
        break;
      }
      db.renameBurrow(request.burrowId, request.newName)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.DELETE_BURROW:
      if (!("rabbitholeId" in request) || !("burrowId" in request)) {
        sendResponse({ error: "rabbitholeId and burrowId required" });
        break;
      }
      db.deleteBurrowFromRabbithole(request.rabbitholeId, request.burrowId)
        .then(() => db.deleteBurrow(request.burrowId))
        .then((res) => sendResponse(res))
        .catch(handleError);

      break;

    case MessageRequest.DELETE_WEBSITE:
      if (!("url" in request) || !("burrowId" in request)) {
        sendResponse({
          error: "burrowId and url required",
        });
        break;
      }
      db.deleteWebsiteFromBurrow(request.burrowId, request.url)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.PUBLISH_BURROW:
      if (
        !("burrowId" in request) ||
        !("uri" in request) ||
        !("timestamp" in request)
      ) {
        sendResponse({
          error: "burrowId, uri, and timestamp required",
        });
        break;
      }
      db.updateBurrowSembleInfo(
        request.burrowId,
        request.uri,
        request.timestamp,
      )
        .then(() => sendResponse({ success: true }))
        .catch(handleError);
      break;

    case MessageRequest.GET_ACTIVE_RABBITHOLE:
      db.getActiveRabbithole()
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.GET_ALL_RABBITHOLES:
      db.getAllRabbitholes()
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.FETCH_RABBITHOLE_FOR_BURROW:
      if (!("burrowId" in request)) {
        sendResponse({ error: "burrowId required" });
        break;
      }
      db.fetchRabbitholeForBurrow(request.burrowId)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.CHANGE_ACTIVE_RABBITHOLE:
      (async () => {
        try {
          const rabbitholeId =
            "rabbitholeId" in request ? request.rabbitholeId : null;
          await db.changeActiveRabbithole(rabbitholeId);
          // Always unset active burrow when switching rabbitholes
          await db.changeActiveBurrow(null);
          await db.changeActiveTrail(null);
          sendResponse({ success: true });
        } catch (err) {
          handleError(err);
        }
      })();
      break;

    case MessageRequest.CREATE_NEW_RABBITHOLE:
      if (!("title" in request)) {
        sendResponse({
          error: "title required",
        });
        break;
      }
      db.createNewActiveRabbithole(request.title, request.description)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.UPDATE_RABBITHOLE:
      if (!("rabbitholeId" in request)) {
        sendResponse({
          error: "rabbitholeId required",
        });
        break;
      }
      db.updateRabbithole(
        request.rabbitholeId,
        request.title,
        request.description,
      )
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.DELETE_RABBITHOLE:
      if (!("rabbitholeId" in request)) {
        sendResponse({
          error: "rabbitholeId required",
        });
        break;
      }
      db.deleteRabbithole(request.rabbitholeId)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.ADD_BURROWS_TO_RABBITHOLE:
      if (!("rabbitholeId" in request) || !("burrowIds" in request)) {
        sendResponse({
          error: "rabbitholeId and burrowIds required",
        });
        break;
      }
      db.addBurrowsToRabbithole(request.rabbitholeId, request.burrowIds)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.CREATE_NEW_BURROW_IN_RABBITHOLE:
      if (!("burrowName" in request)) {
        sendResponse({
          error: "burrowName required",
        });
        break;
      }
      db.createNewBurrowInActiveRabbithole(
        request.burrowName,
        request.websites || [],
      )
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.ADD_WEBSITES_TO_RABBITHOLE_META:
      if (!("rabbitholeId" in request) || !("urls" in request)) {
        sendResponse({
          error: "rabbitholeId and urls required",
        });
        break;
      }
      db.addWebsitesToRabbitholeMeta(request.rabbitholeId, request.urls)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.DELETE_WEBSITE_FROM_RABBITHOLE_META:
      if (!("rabbitholeId" in request) || !("url" in request)) {
        sendResponse({
          error: "rabbitholeId and url required",
        });
        break;
      }
      db.deleteWebsiteFromRabbitholeMeta(request.rabbitholeId, request.url)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.UPDATE_WEBSITE:
      if (!("url" in request)) {
        sendResponse({ error: "url required" });
        break;
      }
      db.updateWebsite(request.url, request.name, request.description)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.SYNC_BURROW:
      if (!("burrowId" in request)) {
        sendResponse({ error: "burrowId required" });
        break;
      }
      (async () => {
        try {
          const burrow = await db.getBurrow(request.burrowId);
          if (!burrow.sembleCollectionUri) {
            throw new Error("Burrow is not published");
          }
          const websites = await db.getAllWebsitesForBurrow(request.burrowId);
          const session = await getSession();
          if (!session) throw new Error("Not logged in");

          await syncBurrowToCollection(
            session.did,
            burrow.sembleCollectionUri,
            websites,
          );

          // Update last sync time
          const timestamp = Date.now();
          await db.updateBurrowSembleInfo(
            burrow.id,
            burrow.sembleCollectionUri,
            timestamp,
          );

          sendResponse({ success: true, timestamp });
        } catch (err) {
          handleError(err);
        }
      })();
      break;

    case "OPEN_TABS":
      if (!("urls" in request)) {
        sendResponse({ error: "urls required" });
        break;
      }
      request.urls.forEach((url) => {
        chrome.tabs.create({ url });
      });
      sendResponse({ success: true });
      break;

    case MessageRequest.REMOVE_FROM_ACTIVE_TABS:
      if (!("url" in request)) {
        sendResponse({ error: "url required" });
        break;
      }
      (async () => {
        try {
          const activeRabbithole = await db.getActiveRabbithole();
          if (activeRabbithole) {
            await db.removeWebsiteFromRabbitholeActiveTabs(
              activeRabbithole.id,
              request.url,
            );
            sendResponse({ success: true });
          } else {
            sendResponse({ error: "No active rabbithole found" });
          }
        } catch (e) {
          handleError(e);
        }
      })();
      break;

    case "IMPORT_DATA":
      if (!("burrows" in request && "websites" in request)) {
        sendResponse({ error: "projects required" });
        break;
      }
      const burrowsToImport = request.burrows as (Burrow & {
        savedWebsites?: string[];
      })[];
      const websitesToImport = request.websites || [];
      const rabbitholesToImport = (request.rabbitholes || []) as any[];

      (async () => {
        try {
          if (websitesToImport.length > 0) {
            await db.saveWebsites(websitesToImport);
          }

          const existingBurrows = await db.getAllBurrows();
          const allWebsites = await db.getAllWebsites();

          // FIXME: how much scale is this required to support?
          const existingUrls = new Set(allWebsites.map((w) => w.url));
          const existingBurrowMap = new Map(
            existingBurrows.map((b) => [b.name, b]),
          );
          const oldIdToNewId = new Map<string, string>();

          for (const burrow of burrowsToImport) {
            const missingWebsites = [];
            const websites = burrow.websites ?? burrow.savedWebsites ?? [];
            if (websites) {
              for (const url of websites) {
                if (!existingUrls.has(url)) {
                  missingWebsites.push({
                    url,
                    name: url,
                    savedAt: Date.now(),
                    faviconUrl: "",
                    description: "Imported",
                  });
                  existingUrls.add(url);
                }
              }
            }

            if (missingWebsites.length > 0) {
              await db.saveWebsites(missingWebsites);
            }

            let burrowName = burrow.name;
            const existingBurrow = existingBurrowMap.get(burrowName);

            if (existingBurrow) {
              // Check consistency
              const existingWebsites = new Set(existingBurrow.websites);
              const newWebsites = new Set(websites);

              let isConsistent = existingWebsites.size === newWebsites.size;
              if (isConsistent) {
                for (const w of newWebsites) {
                  if (!existingWebsites.has(w)) {
                    isConsistent = false;
                    break;
                  }
                }
              }

              if (isConsistent) {
                oldIdToNewId.set(burrow.id, existingBurrow.id);
                continue;
              } else {
                let counter = 1;
                while (existingBurrowMap.has(burrowName)) {
                  burrowName = `${burrow.name} (${counter})`;
                  counter++;
                }
              }
            }

            const newBurrow = await db.createNewActiveBurrow(
              burrowName,
              websites,
            );
            oldIdToNewId.set(burrow.id, newBurrow.id);

            existingBurrowMap.set(burrowName, {
              id: newBurrow.id,
              createdAt: Date.now(),
              name: burrowName,
              websites: websites,
            });
          }

          // Import Rabbitholes
          const existingRabbitholes = await db.getAllRabbitholes();
          const existingRabbitholeMap = new Map(
            existingRabbitholes.map((r) => [r.title, r]),
          );

          for (const rh of rabbitholesToImport) {
            if (existingRabbitholeMap.has(rh.title)) {
              continue;
            }

            const newRh = await db.createNewActiveRabbithole(
              rh.title,
              rh.description,
            );
            const newBurrowIds = (rh.burrows || [])
              .map((oldId) => oldIdToNewId.get(oldId))
              .filter((id) => id !== undefined);

            if (newBurrowIds.length > 0) {
              await db.addBurrowsToRabbithole(newRh.id, newBurrowIds);
            }
          }

          sendResponse({ success: true });
        } catch (err) {
          handleError(err);
        }
      })();
      break;

    case "IMPORT_BROWSER_DATA":
      (async () => {
        try {
          const { importBookmarks, importTabGroups } = request as any;

          if (importBookmarks) {
            await importBookmarksFromBrowser(db);
          }

          if (importTabGroups) {
            await importTabGroupsFromBrowser(db);
          }

          sendResponse({ success: true });
        } catch (err) {
          handleError(err);
        }
      })();
      break;

    case MessageRequest.GET_TRAIL:
      db.getTrail(request.trailId)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.GET_ACTIVE_TRAIL:
      db.getActiveTrail()
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.CHANGE_ACTIVE_TRAIL:
      db.changeActiveTrail(request.trailId)
        .then(() => sendResponse({ success: true }))
        .catch(handleError);
      break;

    case MessageRequest.CREATE_TRAIL:
      db.createTrail(request.rabbitholeId, request.name, request.websites)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.UPDATE_TRAIL:
      db.updateTrail(request.trailId, request.updates)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.DELETE_TRAIL:
      db.deleteTrail(request.rabbitholeId, request.trailId)
        .then(() => sendResponse({ success: true }))
        .catch(handleError);
      break;

    case MessageRequest.START_TRAIL_WALK:
      db.startTrailWalk(request.trailId)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.ADVANCE_TRAIL_WALK:
      db.advanceTrailWalk(request.trailId, request.websiteUrl)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.COMPLETE_TRAIL_WALK:
      db.completeTrailWalk(request.trailId)
        .then(() => sendResponse({ success: true }))
        .catch(handleError);
      break;

    case MessageRequest.ABANDON_TRAIL_WALK:
      db.abandonTrailWalk(request.trailId)
        .then(() => sendResponse({ success: true }))
        .catch(handleError);
      break;

    case MessageRequest.GET_TRAIL_WALK_STATE:
      (async () => {
        try {
          const trail = await db.getTrail(request.trailId);
          const walk = await db.getTrailWalk(request.trailId);
          const websites = trail
            ? await db.getAllWebsitesForRabbithole(trail.rabbitholeId)
            : [];
          sendResponse({ trail, walk, websites });
        } catch (err) {
          handleError(err);
        }
      })();
      break;

    default:
      Logger.warn(`Unknown message type: ${request.type}`);
  }

  // arcane incantation required for async `sendResponse`s to work
  // https://developer.chrome.com/docs/extensions/mv3/messaging/#simple
  return true;
});
