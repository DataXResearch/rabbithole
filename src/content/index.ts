import Overlay from "src/lib/Overlay.svelte";
import { storage } from "../storage";

// Some global styles on the page
import "./styles.css";

// Some JS on the page
storage.get().then(console.log);

// Some svelte component on the page
new Overlay({ target: document.body });
