<script lang="ts">
  import Overlay from "src/lib/Overlay.svelte";
  import { Tooltip } from "@svelteuidev/core";
  import { onMount } from "svelte";
  import { MessageRequest } from "../utils";
  import type { Settings } from "../storage/db";

  let isHovering = false;
  let settings: Settings = {
    show: false,
    alignment: "right",
    darkMode: false,
  };

  onMount(async () => {
    settings = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_SETTINGS,
    });
  });

  async function toggleOverlay() {
    settings.show = !settings.show;
    await chrome.runtime.sendMessage({
      type: MessageRequest.UPDATE_SETTINGS,
      settings,
    });
    
    // Reload the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.reload(tab.id);
    }
  }
</script>

<div class="popup-container">
  <div class="popup-wrapper">
    <div class="popup-header">
      <span class="popup-title">Rabbithole</span>
      <Tooltip {isHovering} label="This will refresh the page" withArrow>
        <button
          class="link-button"
          on:click={toggleOverlay}
          on:mouseenter={() => isHovering = true}
          on:mouseleave={() => isHovering = false}
        >
          {settings.show ? "Hide" : "Show"} Overlay
        </button>
      </Tooltip>
    </div>
    <Overlay isPopup={true} />
  </div>
</div>

<style>
  .popup-container {
    width: 100%;
    height: 100%;
    background-color: white;
    margin: 0;
    padding: 0;
    border: none;
    outline: none;
    overflow: visible;
  }

  .popup-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px;
    box-sizing: border-box;
    border: none;
    gap: 16px;
    overflow: visible;
  }

  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 8px;
    border-bottom: 1px solid #e9ecef;
  }

  .popup-title {
    font-weight: bold;
    font-size: 14px;
    color: #212529;
  }

  .link-button {
    background: none;
    border: none;
    color: #1185fe;
    text-decoration: underline;
    cursor: pointer;
    font-size: 13px;
    padding: 0;
    font-family: inherit;
  }

  .link-button:hover {
    color: #0070e0;
  }

  @media (prefers-color-scheme: dark) {
    .popup-container {
      background-color: #1a1b1e;
    }

    .popup-header {
      border-bottom-color: #373a40;
    }

    .popup-title {
      color: #c1c2c5;
    }

    .link-button {
      color: #4dabf7;
    }

    .link-button:hover {
      color: #74c0fc;
    }
  }
</style>
