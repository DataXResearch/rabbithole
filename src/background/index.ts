import { MessageRequest } from "../utils";
import { WebsiteStore, type Burrow } from "../storage/db";
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

// this is meant to be called async
function storeWebsites(
  tabs: chrome.tabs.Tab[],
  db: WebsiteStore,
  sendResponse: any,
): Promise<void[]> {
  // Filter out newtab pages
  const validTabs = tabs.filter((tab) => !isNewtabPage(tab.url));

  if (validTabs.length === 0) {
    sendResponse({ error: "No valid tabs to save" });
    return Promise.resolve([]);
  }

  const promiseArray = validTabs.map((tab) =>
    fetch(tab.url)
      .then((response) => response.text())
      .then((html) => {
        const { title, image, description } = extractOpenGraphData(html);
        return {
          url: tab.url,
          // FIXME: is it worth even having og title?
          name: tab.title ?? title,
          faviconUrl: tab.favIconUrl,
          savedAt: Date.now(),
          openGraphImageUrl: image,
          description: description ?? "",
        };
      })
      .then((website) => {
        db.saveWebsitesToBurrow([website])
          .then((res) => sendResponse(res))
          .catch((err) => {
            console.log(err);
            sendResponse(err);
          });
      })
      .catch((error) => {
        // just use info at hand if OG information cannot be retrieved
        // TODO: are there cases when it's preferable to do this?
        db.saveWebsitesToBurrow([
          {
            url: tab.url,
            name: tab.title,
            faviconUrl: tab.favIconUrl,
            savedAt: Date.now(),
            openGraphImageUrl: null,
            description: "No description available",
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

    case MessageRequest.GET_ALL_BURROWS:
      db.getAllBurrows()
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
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
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
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
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;

    case MessageRequest.CHANGE_ACTIVE_BURROW:
      db.changeActiveBurrow("burrowId" in request ? request.burrowId : null)
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;

    case MessageRequest.GET_ACTIVE_BURROW:
      db.getActiveBurrow()
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
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
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;

    case MessageRequest.SAVE_WINDOW_TO_NEW_BURROW:
      chrome.tabs.query({ windowId: sender.tab.windowId }).then((tabs) => {
        let websites: string[] = tabs
          .filter((tab) => !isNewtabPage(tab.url))
          .map((tab) => tab.url);
        // store websites async
        storeWebsites(tabs, db, sendResponse);

        if (!("newBurrowName" in request)) {
          sendResponse({
            error: "burrowName required",
          });
        }
        db.createNewActiveBurrow(request.newBurrowName, websites)
          .then(async (burrow) => {
            await db.updateBurrowActiveTabs(burrow.id, websites);
            sendResponse(burrow);
          })
          .catch((err) => {
            console.log(err);
            sendResponse(err);
          });
      });

      break;

    case MessageRequest.SAVE_WINDOW_TO_ACTIVE_BURROW:
      chrome.windows.getCurrent().then((window) => {
        chrome.tabs.query({ windowId: window.id }).then(async (tabs) => {
          storeWebsites(tabs, db, sendResponse);
        });
      });
      break;

    case MessageRequest.UPDATE_ACTIVE_TABS:
      chrome.tabs
        .query({ windowId: sender.tab.windowId })
        .then(async (tabs) => {
          const websites = tabs
            .filter((tab) => !isNewtabPage(tab.url))
            .map((tab) => tab.url);
          const activeBurrow = await db.getActiveBurrow();
          await db.updateBurrowActiveTabs(activeBurrow.id, websites);

          // store websites async
          storeWebsites(tabs, db, sendResponse);
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
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
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
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
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
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
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
        .catch((err) => {
          console.log(err);
          sendResponse({ error: err.message });
        });
      break;

    case MessageRequest.GET_ACTIVE_RABBITHOLE:
      db.getActiveRabbithole()
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;

    case MessageRequest.GET_ALL_RABBITHOLES:
      db.getAllRabbitholes()
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;

    case MessageRequest.FETCH_RABBITHOLES_FOR_BURROW:
      if (!("burrowId" in request)) {
        sendResponse({ error: "burrowId required" });
        break;
      }
      db.fetchRabbitholesForBurrow(request.burrowId)
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse({ error: err.message });
        });
      break;

    case MessageRequest.DELETE_BURROW_FROM_RABBITHOLE:
      if (!("rabbitholeId" in request) || !("burrowId" in request)) {
        sendResponse({ error: "rabbitholeId and burrowId required" });
        break;
      }
      db.deleteBurrowFromRabbithole(request.rabbitholeId, request.burrowId)
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse({ error: err.message });
        });
      break;

    case MessageRequest.CHANGE_ACTIVE_RABBITHOLE:
      db.changeActiveRabbithole(
        "rabbitholeId" in request ? request.rabbitholeId : null,
      )
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
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
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
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
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
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
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
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
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
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
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
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
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
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
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
      break;

    case MessageRequest.UPDATE_WEBSITE:
      if (!("url" in request)) {
        sendResponse({ error: "url required" });
        break;
      }
      db.updateWebsite(request.url, request.name, request.description)
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.log(err);
          sendResponse(err);
        });
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
          console.error(err);
          sendResponse({ error: err.message });
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
        .catch((err) => {
          console.log(err);
          sendResponse({ error: err.message });
        });
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
              console.log("saving missing websites", missingWebsites);
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
                console.log(
                  `Project ${burrowName} already exists and is consistent. Skipping creation.`,
                );
                continue;
              } else {
                let counter = 1;
                while (existingBurrowMap.has(burrowName)) {
                  burrowName = `${burrow.name} (${counter})`;
                  counter++;
                }
              }
            }

            await db.createNewActiveBurrow(burrowName, websites);

            existingBurrowMap.set(burrowName, {
              id: "temp",
              createdAt: Date.now(),
              name: burrowName,
              websites: websites,
            });
          }
          sendResponse({ success: true });
        } catch (err) {
          console.error(err);
          sendResponse({ error: err.message });
        }
      })();
      break;

    default:
  }

  // arcane incantation required for async `sendResponse`s to work
  // https://developer.chrome.com/docs/extensions/mv3/messaging/#simple
  return true;
});
