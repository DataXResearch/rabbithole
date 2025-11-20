import Popup from "src/popup/Popup.svelte";

const target = document.getElementById("app");

if (target) {
  new Popup({
    target,
  });
}
