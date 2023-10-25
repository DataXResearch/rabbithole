import Rabbithole from "src/lib/Rabbithole.svelte"

const target = document.getElementById("app");

function render() {
  new Rabbithole({
    target,
  });
}

document.addEventListener("DOMContentLoaded", render);
