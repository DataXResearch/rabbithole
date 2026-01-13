import { MessageRequest } from "../utils";
import { WebsiteStore, Website } from "../storage/db";

function sendOverlayUpdate(tabId: number) {
  // ignore errors; receiving end won't exist if it's the newtab page
  try {
    chrome.tabs.sendMessage(tabId, { type: MessageRequest.PING });
  } catch (err) { }
}

function extractOpenGraphData(html: string): {
  title: string | null;
  image: string | null;
  description: string | null
} {
  let title: string | null = null;
  let image: string | null = null;
  let description: string | null = null;

  // Extract Open Graph title
  const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (titleMatch) {
    title = titleMatch[1];
  }

  // Extract Open Graph image
  const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (imageMatch) {
    image = imageMatch[1];
  }

  // Extract Open Graph description
  const descriptionMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
  if (descriptionMatch) {
    description = descriptionMatch[1];
  }

  // Fallback 1: Standard meta description
  if (!description) {
    const metaDescriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    if (metaDescriptionMatch) {
      description = metaDescriptionMatch[1];
    }
  }

  // Fallback 2: Twitter card description
  if (!description) {
    const twitterDescMatch = html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i);
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
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Try to find first paragraph
  const pMatch = cleaned.match(/<p[^>]*>([^<]+(?:<[^/][^>]*>[^<]*<\/[^>]+>[^<]*)*)<\/p>/i);
  if (pMatch) {
    // Strip remaining HTML tags and clean up
    const text = pMatch[1].replace(/<[^>]+>/g, '').trim();
    // Limit to reasonable length (e.g., 160 characters)
    return text.length > 160 ? text.substring(0, 157) + '...' : text;
  }

  // Fallback: Get any substantial text from body
  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    const bodyText = bodyMatch[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (bodyText.length > 20) {
      return bodyText.length > 160 ? bodyText.substring(0, 157) + '...' : bodyText;
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
  const validTabs = tabs.filter(tab => !isNewtabPage(tab.url));

  if (validTabs.length === 0) {
    sendResponse({ error: "No valid tabs to save" });
    return Promise.resolve([]);
  }

  // delegate this to db?
  // FIXME: add some guarantees that this won't randomly crash
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
        let websites: string[] = tabs.filter(tab => !isNewtabPage(tab.url)).map((tab) => tab.url);
        // store websites async
        storeWebsites(tabs, db, sendResponse);

        if (!("newProjectName" in request)) {
          sendResponse({
            error: "projectName required",
          });
        }
        // FIXME: remove websites to see if that fixes double website store
        db.createNewActiveProject(request.newProjectName, websites)
          .then(async (project) => {
            await db.updateProjectActiveTabs(project.id, websites);
            sendResponse(project);
          })
          .catch((err) => {
            console.log(err);
            sendResponse(err);
          });
      });

      break;

    case MessageRequest.SAVE_WINDOW_TO_ACTIVE_PROJECT:
      chrome.tabs.query({ windowId: sender.tab.windowId }).then(async (tabs) => {
        const websites = tabs.filter(tab => !isNewtabPage(tab.url)).map((tab) => tab.url);
        const activeProject = await db.getActiveProject();
        await db.updateProjectActiveTabs(activeProject.id, websites);

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

    case MessageRequest.PUBLISH_RABBITHOLE:
      if (!("projectId" in request) || !("uri" in request) || !("timestamp" in request)) {
        sendResponse({
          error: "projectId, uri, and timestamp required",
        });
        break;
      }
      db.updateProjectSembleInfo(request.projectId, request.uri, request.timestamp)
        .then(() => sendResponse({ success: true }))
        .catch((err) => {
          console.log(err);
          sendResponse({ error: err.message });
        });
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
      if (!("projectId" in request) || !("url" in request)) {
        sendResponse({ error: "projectId and url required" });
        break;
      }
      db.removeWebsiteFromActiveTabs(request.projectId, request.url)
        .then(() => sendResponse({ success: true }))
        .catch((err) => {
          console.log(err);
          sendResponse({ error: err.message });
        });
      break;

    case "IMPORT_DATA":
      if (!("projects" in request)) {
        sendResponse({ error: "projects required" });
        break;
      }
      const projectsToImport = request.projects;
      const websitesToImport = request.savedWebsites || [];

      (async () => {
        try {
          // Save full website details first
          if (websitesToImport.length > 0) {
            await db.saveWebsites(websitesToImport);
          }

          const existingProjects = await db.getAllProjects();
          const allWebsites = await db.getAllWebsites();

          const existingUrls = new Set(allWebsites.map((w) => w.url));
          const existingProjectMap = new Map(existingProjects.map((p) => [p.name, p]));

          for (const project of projectsToImport) {
            const missingWebsites = [];
            if (project.savedWebsites) {
              for (const url of project.savedWebsites) {
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

            let projectName = project.name;
            const existingProject = existingProjectMap.get(projectName);

            if (existingProject) {
              // Check consistency
              const existingWebsites = new Set(existingProject.savedWebsites);
              const newWebsites = new Set(project.savedWebsites || []);

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
                console.log(`Project ${projectName} already exists and is consistent. Skipping creation.`);
                continue;
              } else {
                // Disparate state: rename to allow import
                let counter = 1;
                while (existingProjectMap.has(projectName)) {
                  projectName = `${project.name} (${counter})`;
                  counter++;
                }
              }
            }

            console.log("saving rh", projectName);
            // Create project (this creates a new project with a new ID but same name/content)
            await db.createNewActiveProject(projectName, project.savedWebsites || []);

            // Update map to handle subsequent collisions in the same import batch
            existingProjectMap.set(projectName, {
              id: "temp",
              createdAt: Date.now(),
              name: projectName,
              savedWebsites: project.savedWebsites || []
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

// send updates to tabs when created, changed, updated
// chrome.tabs.onUpdated.addListener((tabId, info) => {
// if (info.status === "complete") {
// sendOverlayUpdate(tabId);
// }
// });
chrome.tabs.onActivated.addListener((tab) => {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabInfo) => {
    // Check for various browser newtab/home pages
    const url = "pendingUrl" in tabInfo[0] ? tabInfo[0].pendingUrl : tabInfo[0].url;

    if (
      !url.includes("chrome://") &&
      !url.includes("brave://") &&
      !url.includes("edge://") &&
      !url.includes("opera://") &&
      !url.includes("vivaldi://") &&
      !url.includes("about:")
    ) {
      sendOverlayUpdate(tab.tabId);
    }
  });
});
