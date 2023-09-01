import Overlay from "src/lib/Overlay.svelte";

// global styles, if any
import "./styles.css";

// load floating action overlay
new Overlay({ target: document.body });
