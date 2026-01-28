import Overlay from "src/lib/Overlay.svelte";
import { MessageRequest } from "src/utils";

// global styles, if any
import "./styles.css";

let loaded = false;
let overlay: Overlay;

function loadOverlay() {
  if (!loaded) {
    overlay = new Overlay({ target: document.body });
    loaded = true;
  } else {
    overlay.$destroy();
    overlay = new Overlay({ target: document.body });
  }
}

loadOverlay();
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (!("type" in request)) {
    sendResponse({
      error: "request type required",
    });
  }
});
