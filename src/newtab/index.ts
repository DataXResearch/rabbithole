import Timeline from "src/lib/Timeline.svelte";
import SettingsButtons from "src/lib/SettingsButtons.svelte"

const target = document.getElementById("app");

function render() {
  new SettingsButtons({ target });
  new Timeline({ target });
}

document.addEventListener("DOMContentLoaded", render);
