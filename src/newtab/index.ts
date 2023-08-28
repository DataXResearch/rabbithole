import Timeline from "src/lib/Timeline.svelte";

const target = document.getElementById("app");

function render() {
  new Timeline({ target });
}

document.addEventListener("DOMContentLoaded", render);
