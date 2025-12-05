<script lang="ts">
  import { onMount } from "svelte";
  import { Button, Group } from "@svelteuidev/core";
  import { MessageRequest } from "../utils.ts";
  import type { Settings } from "../storage/db";
  import { Move, EyeOpen, EyeNone } from "radix-icons-svelte";

  export let settings: Settings = {
    show: false,
    alignment: "right",
    darkMode: false,
  };
  let isHovering = false;

  function changeAlignment(event) {
    if (settings.alignment === "left") {
      settings.alignment = "right";
    } else {
      settings.alignment = "left";
    }
    chrome.runtime.sendMessage({
      type: MessageRequest.UPDATE_SETTINGS,
      settings,
    });
  }

  async function hideOverlay(event) {
    if (settings.show === true) {
      settings.show = false;
    } else {
      settings.show = true;
    }
    chrome.runtime.sendMessage({
      type: MessageRequest.UPDATE_SETTINGS,
      settings,
    });
  }

  onMount(async () => {
    settings = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_SETTINGS,
    });
  });
</script>

<Group spacing="xs" grow>
  <Button
    on:click={changeAlignment}
    color="blue"
    class="sidebar-btn"
    leftIcon={Move}
  >
    {settings.alignment === "right" ? "Move Left" : "Move Right"}
  </Button>

  <Button
    on:click={hideOverlay}
    on:mouseenter={() => isHovering = true}
    on:mouseleave={() => isHovering = false}
    color="blue"
    class="sidebar-btn"
    leftIcon={settings.show ? EyeNone : EyeOpen}
  >
    {settings.show ? "Hide" : "Show"}
  </Button>
</Group>

<style>
  :global(.sidebar-btn .mantine-Button-inner) {
    justify-content: center !important;
    width: 100%;
  }
</style>
