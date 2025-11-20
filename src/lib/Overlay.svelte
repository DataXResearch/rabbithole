<script lang="ts">
  import { onMount } from "svelte";
  import { Button, Group, Tooltip } from "@svelteuidev/core";
  import Options from "./Options.svelte";
  import ProjectSelector from "src/lib/ProjectSelector.svelte";
  import { MessageRequest, getOrderedProjects } from "../utils.ts";
  import type { Settings } from "../storage/db";

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
    <div class="buttons">
      <Group position="center" spacing="md">
        <Button
          on:click={changeAlignment}
          id="move"
          variant="light"
          color="blue"
        >
          Move
        </Button>
        <Tooltip {isHovering} label="You can unhide from the newtab page">
          <Button
            on:click={hideOverlay}
            on:mouseenter={() => {
              isHovering = true;
            }}
            on:mouseleave={() => {
              isHovering = false;
            }}
            id="move"
            variant="light"
            color="blue"
          >
            Hide
          </Button>
        </Tooltip>
      </Group>
    </div>
    <div class="selector">
      <ProjectSelector {projects} {handleProjectChange} />
    </div>
    <div>
      <Options />
    </div>
  </div>
{/if}

<style>
  .selector {
    width: 175px;
    margin: 0 auto;
    margin-top: 10px;
  }

  .buttons {
    margin-top: 10px;
  }

  .overlay {
    z-index: 2147483647;
    width: 250px;
    height: 200px;
    position: fixed;
    bottom: 16px;
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 20px;
    border: 1px solid black;
    padding: 4px;
  }

  .overlay.popup {
    position: static;
    width: 100%;
    height: 100%;
    border-radius: 0;
    border: none;
    background-color: transparent;
    z-index: auto;
  }

  .right {
    right: 16px;
  }

  .left {
    left: 16px;
  }
</style>
