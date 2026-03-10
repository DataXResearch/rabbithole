import Overlay from "src/lib/Overlay.svelte";
import TrailOverlay from "src/lib/TrailOverlay.svelte";
import { MessageRequest } from "src/utils";
import "./styles.css";

let loaded = false;
let overlay: Overlay;
let trailOverlay: TrailOverlay;

function loadOverlay() {
  if (!loaded) {
    overlay = new Overlay({ target: document.body });
    trailOverlay = new TrailOverlay({ target: document.body });
    loaded = true;
  } else {
    overlay.$destroy();
    trailOverlay.$destroy();
    overlay = new Overlay({ target: document.body });
    trailOverlay = new TrailOverlay({ target: document.body });
  }
}

loadOverlay();

window.addEventListener("focus", () => {
  if (overlay && loaded) overlay.refreshData();
  if (trailOverlay && loaded) trailOverlay.refresh();
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (!("type" in request)) {
    sendResponse({ error: "request type required" });
    return;
  }
  if (request.type === "SETTINGS_UPDATED" && overlay && loaded) {
    overlay.refreshData();
  }
  if (request.type === "TRAIL_WALK_UPDATED" && trailOverlay && loaded) {
    trailOverlay.refresh();
  }
});
