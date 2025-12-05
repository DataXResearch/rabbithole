<script lang="ts">
  import { onMount } from "svelte";
  import { Button, Group, Tooltip, ActionIcon, Text } from "@svelteuidev/core";
  import Options from "./Options.svelte";
  import ProjectSelector from "src/lib/ProjectSelector.svelte";
  import { MessageRequest, getOrderedProjects } from "../utils.ts";
  import type { Settings } from "../storage/db";
  import { Move, EyeNone } from "radix-icons-svelte";

  export let isPopup = false;

  let settings: Settings = {
    show: false,
    alignment: "right",
    darkMode: false,
  };
  let projects = [];
  let isHovering = false;

  onMount(async () => {
    settings = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_SETTINGS,
    });
    projects = await getOrderedProjects();
  });

  function changeAlignment(event) {
    settings.alignment = settings.alignment === "left" ? "right" : "left";
    chrome.runtime.sendMessage({
      type: MessageRequest.UPDATE_SETTINGS,
      settings,
    });
  }

  async function hideOverlay(event) {
    settings.show = false;
    chrome.runtime.sendMessage({
      type: MessageRequest.UPDATE_SETTINGS,
      settings,
    });
  }

  async function handleProjectChange(event) {
    await chrome.runtime.sendMessage({
      type: MessageRequest.CHANGE_ACTIVE_PROJECT,
      projectId: event.target.value,
    });
  }
</script>

{#if settings.show || isPopup}
  <div id="overlay-container" class="overlay {settings.alignment}" class:popup={isPopup}>
    <div class="header">
      <Text size="sm" weight="bold" color="dimmed">Rabbithole</Text>
      <Group spacing="xs">
        <Tooltip label="Move Position" withArrow>
          <ActionIcon on:click={changeAlignment} variant="subtle" size="sm">
            <Move />
          </ActionIcon>
        </Tooltip>
        <Tooltip {isHovering} label="Hide Overlay" withArrow>
          <ActionIcon
            on:click={hideOverlay}
            on:mouseenter={() => isHovering = true}
            on:mouseleave={() => isHovering = false}
            variant="subtle"
            size="sm"
          >
            <EyeNone />
          </ActionIcon>
        </Tooltip>
      </Group>
    </div>

    <div class="content">
      <div class="selector-wrapper">
        <ProjectSelector {projects} {handleProjectChange} />
      </div>
      <div class="options-wrapper">
        <Options />
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    z-index: 2147483647;
    width: 260px;
    position: fixed;
    bottom: 24px;
    background-color: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    border: 1px solid rgba(0, 0, 0, 0.05);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: all 0.3s ease;
  }

  .overlay.popup {
    position: static;
    width: 100%;
    height: 100%;
    border-radius: 0;
    border: none;
    background-color: transparent;
    box-shadow: none;
    padding: 0;
    z-index: auto;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .right {
    right: 24px;
  }

  .left {
    left: 24px;
  }

  .selector-wrapper {
    margin-bottom: 12px;
  }

  /* Dark mode support for overlay if needed, though usually overlays might stick to one theme or detect system */
  @media (prefers-color-scheme: dark) {
    .overlay:not(.popup) {
      background-color: rgba(37, 38, 43, 0.95);
      border-color: rgba(255, 255, 255, 0.1);
      color: white;
    }
  }
</style>
