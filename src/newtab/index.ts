import Router from "./router.svelte";

// global styles
import "../assets/css/app.css";
import "./styles.css";

const target = document.getElementById("app");

const render = () => {
  new Router({
    target,
  });
};

document.addEventListener("DOMContentLoaded", render);
