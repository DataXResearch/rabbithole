import { MessageRequest, Logger } from "../utils";
import { WebsiteStore } from "../storage/db";
import type { Burrow } from "../utils/types";
import { getSession } from "../atproto/client";
import { syncBurrowToCollection } from "../atproto/cosmik";

function extractOpenGraphData(html: string): {
  title: string | null;
  image: string | null;
  description: string | null;
} {
  let title: string | null = null;
  let image: string | null = null;
  let description: string | null = null;

  // Extract Open Graph title
  const titleMatch = html.match(
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
  );
  if (titleMatch) {
    title = titleMatch[1];
  }

  // Extract Open Graph image
  const imageMatch = html.match(
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
  );
  if (imageMatch) {
    image = imageMatch[1];
  }

  // Extract Open Graph description
  const descriptionMatch = html.match(
    /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i,
  );
  if (descriptionMatch) {
    description = descriptionMatch[1];
  }

  // Fallback 1: Standard meta description
  if (!description) {
    const metaDescriptionMatch = html.match(
      /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
    );
    if (metaDescriptionMatch) {
      description = metaDescriptionMatch[1];
    }
  }

  // Fallback 2: Twitter card description
  if (!description) {
    const twitterDescMatch = html.match(
      /<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i,
    );
    if (twitterDescMatch) {
      description = twitterDescMatch[1];
    }
  }

  // Fallback 3: Extract first paragraph of meaningful text
  if (!description) {
    description = extractFirstParagraph(html);
  }

  // Fallback 4: Use title as description if available
  if (!description && title) {
    description = title;
  }

  // Fallback 5: Generic placeholder
  if (!description) {
    description = "No description available";
  }

  return { title, image, description };
}

function extractFirstParagraph(html: string): string | null {
  // Remove script and style tags
  let cleaned = html.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );
  cleaned = cleaned.replace(
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    "",
  );

  // Try to find first paragraph
  const pMatch = cleaned.match(
    /<p[^>]*>([^<]+(?:<[^/][^>]*>[^<]*<\/[^>]+>[^<]*)*)<\/p>/i,
  );
  if (pMatch) {
    // Strip remaining HTML tags and clean up
    const text = pMatch[1].replace(/<[^>]+>/g, "").trim();
    // Limit to reasonable length (e.g., 160 characters)
    return text.length > 160 ? text.substring(0, 157) + "..." : text;
  }

  // Fallback: Get any substantial text from body
  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    const bodyText = bodyMatch[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (bodyText.length > 20) {
      return bodyText.length > 160
        ? bodyText.substring(0, 157) + "..."
        : bodyText;
    }
  }

  // Try to extract from any heading tags as last resort
  const headingMatch = cleaned.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i);
  if (headingMatch) {
    const text = headingMatch[1].trim();
    return text.length > 0 ? text : null;
  }

  return null;
}

function isNewtabPage(url: string): boolean {
  // Chrome variants
  if (url.includes("chrome://newtab")) return true;
  // Firefox
  if (url.includes("about:newtab")) return true;
  // Edge
  if (url.includes("edge://newtab")) return true;
  // Brave
  if (url.includes("brave://newtab")) return true;
  // Opera
  if (url.includes("opera://newtab")) return true;
  // Vivaldi
  if (url.includes("vivaldi://newtab")) return true;
  // Generic about:home for Firefox
  if (url.includes("about:home")) return true;

  return false;
}

async function storeWebsites(
  tabs: chrome.tabs.Tab[],
  db: WebsiteStore,
): Promise<void> {
  const validTabs = tabs.filter((tab) => !isNewtabPage(tab.url));

  if (validTabs.length === 0) {
    return;
  }

  const websitesWithMetadata = await Promise.all(
    validTabs.map(async (tab) => {
      try {
        const response = await fetch(tab.url);
        const html = await response.text();
        const { title, image, description } = extractOpenGraphData(html);

        return {
          url: tab.url,
          name: tab.title ?? title,
          faviconUrl: tab.favIconUrl,
          savedAt: Date.now(),
          openGraphImageUrl: image,
          description: description ?? "",
        };
      } catch (error) {
        Logger.warn(`OG fetch failed for ${tab.url}, using fallback`, error);
        // Fallback to basic tab info
        return {
          url: tab.url,
          name: tab.title,
          savedAt: Date.now(),
          faviconUrl: tab.favIconUrl,
          openGraphImageUrl: null,
          description: "No description available",
        };
      }
    }),
  );

  await db.saveWebsitesToBurrow(websitesWithMetadata);
}

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
            await storeWebsites(tabs, db);
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
      db.changeActiveBurrow("burrowId" in request ? request.burrowId : null)
        .then((res) => sendResponse(res))
        .catch(handleError);
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
            let websites: string[] = tabs.map((tab) => tab.url);

            if (!("newBurrowName" in request)) {
              sendResponse({ error: "burrowName required" });
              return;
            }

            // 1. Save websites metadata (fetch OG tags etc)
            await storeWebsites(tabs, db);

            // 2. Create burrow and link websites
            const burrow = await db.createNewActiveBurrow(
              request.newBurrowName,
              websites,
            );
            await db.updateBurrowActiveTabs(burrow.id, websites);

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
            await storeWebsites(tabs, db);
            sendResponse({ success: true });
          } catch (e) {
            handleError(e);
          }
        });
      });
      break;

    case MessageRequest.UPDATE_ACTIVE_TABS:
      chrome.tabs
        .query({ windowId: sender.tab.windowId })
        .then(async (tabs) => {
          try {
            const websites = tabs
              .filter((tab) => !isNewtabPage(tab.url))
              .map((tab) => tab.url);

            const activeBurrow = await db.getActiveBurrow();
            await db.updateBurrowActiveTabs(activeBurrow.id, websites);

            // Store website metadata
            await storeWebsites(tabs, db);

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
      if (!("burrowId" in request)) {
        sendResponse({
          error: "burrowId required",
        });
        break;
      }
      db.deleteBurrow(request.burrowId)
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

    case MessageRequest.FETCH_RABBITHOLES_FOR_BURROW:
      if (!("burrowId" in request)) {
        sendResponse({ error: "burrowId required" });
        break;
      }
      db.fetchRabbitholesForBurrow(request.burrowId)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.DELETE_BURROW_FROM_RABBITHOLE:
      if (!("rabbitholeId" in request) || !("burrowId" in request)) {
        sendResponse({ error: "rabbitholeId and burrowId required" });
        break;
      }
      db.deleteBurrowFromRabbithole(request.rabbitholeId, request.burrowId)
        .then((res) => sendResponse(res))
        .catch(handleError);
      break;

    case MessageRequest.CHANGE_ACTIVE_RABBITHOLE:
      db.changeActiveRabbithole(
        "rabbitholeId" in request ? request.rabbitholeId : null,
      )
        .then((res) => sendResponse(res))
        .catch(handleError);
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
      db.createNewBurrowInActiveRabbithole(request.burrowName)
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

    case "REMOVE_FROM_ACTIVE_TABS":
      if (!("burrowId" in request) || !("url" in request)) {
        sendResponse({ error: "burrowId and url required" });
        break;
      }
      db.removeWebsiteFromActiveTabs(request.burrowId, request.url)
        .then(() => sendResponse({ success: true }))
        .catch(handleError);
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
            if (burrow.activeTabs && burrow.activeTabs.length > 0) {
              await db.updateBurrowActiveTabs(newBurrow.id, burrow.activeTabs);
            }
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

    default:
      Logger.warn(`Unknown message type: ${request.type}`);
  }

  // arcane incantation required for async `sendResponse`s to work
  // https://developer.chrome.com/docs/extensions/mv3/messaging/#simple
  return true;
});
