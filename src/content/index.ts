import Overlay from "src/lib/Overlay.svelte";
import { storage } from "../storage";
import { WebsiteStore } from "../indexedDb";


// Some global styles on the page
import "./styles.css";

// Some JS on the page
storage.get().then(console.log);

// TODO: make this run only when the extension is installed
(async () => {
  await WebsiteStore.init();
})()

// Some svelte component on the page
new Overlay({ target: document.body });
