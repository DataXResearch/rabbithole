<script lang="ts">
  import Overlay from "src/lib/Overlay.svelte";
  import { Button } from "@svelteuidev/core";
  import { EyeOpen, EyeNone } from "radix-icons-svelte";
  import { onMount } from "svelte";
  import { MessageRequest } from "../utils";
  import type { Settings } from "../storage/db";

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
  }
</script>

<div class="popup-container">
  <div class="popup-wrapper">
    <Overlay isPopup={true} />
    <div class="toggle-button-wrapper">
      <Button
        on:click={toggleOverlay}
        color={settings.show ? "red" : "blue"}
        fullWidth
        leftIcon={settings.show ? EyeNone : EyeOpen}
      >
        {settings.show ? "Hide" : "Show"} Overlay
      </Button>
    </div>
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
  }

  .toggle-button-wrapper {
    margin-top: auto;
  }

  @media (prefers-color-scheme: dark) {
    .popup-container {
      background-color: #1a1b1e;
    }
  }
</style>
