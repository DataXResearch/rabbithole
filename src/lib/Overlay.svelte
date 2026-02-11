<script lang="ts">
  import { onMount } from "svelte";
  import { Group, Tooltip, ActionIcon, Text, Button, Input, Textarea } from "@svelteuidev/core";
  import Options from "./Options.svelte";
  import BurrowSelector from "src/lib/BurrowSelector.svelte";
  import { MessageRequest, getOrderedBurrows, NotificationDuration } from "../utils.ts";
  import type { Settings } from "../storage/db";
  import { Move, EyeNone, Update, Check, Cross2 } from "radix-icons-svelte";

  export let isPopup = false;

  let settings: Settings = {
    show: false,
    alignment: "right",
    darkMode: false,
  };
  let burrows = [];
  let isHovering = false;
  let isSyncingWindow = false;
  let syncWindowSuccess = false;
  let isHoveringOverSync = false;
  let isHoveringOverMove = false;

  // Save Page State
  let isSavingPage = false;
  let pageTitle = "";
  let pageDescription = "";
  let isSaving = false;
  let saveSuccess = false;

  onMount(async () => {
    settings = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_SETTINGS,
    });
    burrows = await getOrderedBurrows();
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

  async function handleBurrowChange(event) {
    const newBurrowId = event.detail || event.target?.value;
    await chrome.runtime.sendMessage({
      type: MessageRequest.CHANGE_ACTIVE_BURROW,
      burrowId: newBurrowId,
    });
    // Refresh the burrows list to reflect the new active burrow
    burrows = await getOrderedBurrows();
  }

  async function saveAllTabsToActiveBurrow() {
    isSyncingWindow = true;
    try {
      await chrome.runtime.sendMessage({
        type: MessageRequest.SAVE_WINDOW_TO_ACTIVE_BURROW,
      });
      syncWindowSuccess = true;
      setTimeout(() => {
        syncWindowSuccess = false;
      }, NotificationDuration);
    } catch (e) {
      console.error(e);
    } finally {
      isSyncingWindow = false;
    }
  }

  function initSavePage() {
    // Pre-fill with current page data
    pageTitle = document.title;
    
    // Try to find description
    const metaDesc = document.querySelector('meta[name="description"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    pageDescription = metaDesc ? metaDesc.getAttribute("content") : (ogDesc ? ogDesc.getAttribute("content") : "");
    
    isSavingPage = true;
  }

  function cancelSavePage() {
    isSavingPage = false;
    pageTitle = "";
    pageDescription = "";
  }

  async function savePage() {
    isSaving = true;
    try {
      // 1. Save the tab (this creates the record if needed)
      await chrome.runtime.sendMessage({
        type: MessageRequest.SAVE_TAB,
      });

      // 2. Update with user's custom metadata
      await chrome.runtime.sendMessage({
        type: MessageRequest.UPDATE_WEBSITE,
        url: window.location.href,
        name: pageTitle,
        description: pageDescription
      });

      saveSuccess = true;
      setTimeout(() => {
        saveSuccess = false;
        isSavingPage = false;
      }, 1500);
    } catch (e) {
      console.error("Failed to save page:", e);
    } finally {
      isSaving = false;
    }
  }
</script>

{#if settings.show || isPopup}
  <div id="rabbithole-overlay-container" class="rabbithole-overlay rabbithole-{settings.alignment}" class:rabbithole-popup={isPopup}>
    {#if !isPopup}
      <div class="rabbithole-header">
        <Text size="sm" weight="bold" class="rabbithole-icon">Rabbithole</Text>
        <Group spacing="xs">
          <Tooltip
            {isHoveringOverSync}
            label="Save all tabs in window to current burrow"
            withArrow
          >
            <div class="icon-wrapper">
              <ActionIcon
                on:click={saveAllTabsToActiveBurrow}
                on:mouseenter={() => isHoveringOverSync = true}
                on:mouseleave={() => isHoveringOverSync = false}
                variant="subtle"
                size="sm"
                class="rabbithole-icon header-icon"
                disabled={isSyncingWindow}
              >
                <Update />
              </ActionIcon>
              {#if syncWindowSuccess}
                <div class="success-check-icon">
                  <Check size={12} />
                </div>
              {/if}
            </div>
          </Tooltip>
          <Tooltip
            {isHoveringOverMove}
            label="Move Position"
            withArrow
          >
            <ActionIcon
              on:click={changeAlignment}
              on:mouseenter={() => isHoveringOverMove = true}
              on:mouseleave={() => isHoveringOverMove = false}
              variant="subtle"
              size="sm"
              class="rabbithole-icon header-icon"
            >
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
              class="rabbithole-icon header-icon"
            >
              <EyeNone />
            </ActionIcon>
          </Tooltip>
        </Group>
      </div>
    {/if}

    <div class="rabbithole-content">
      {#if isSavingPage}
        <div class="save-page-form">
          <div class="form-header">
            <Text size="xs" weight="bold" color="dimmed">Save to Burrow</Text>
            <ActionIcon size="xs" variant="subtle" on:click={cancelSavePage}>
              <Cross2 />
            </ActionIcon>
          </div>
          
          <Input
            placeholder="Title"
            bind:value={pageTitle}
            size="xs"
            class="save-input"
          />
          
          <Textarea
            placeholder="Description"
            bind:value={pageDescription}
            size="xs"
            minRows={2}
            maxRows={4}
            autosize
            class="save-input"
          />
          
          <Button 
            size="xs" 
            fullWidth 
            on:click={savePage} 
            loading={isSaving}
            color={saveSuccess ? "green" : "blue"}
          >
            {saveSuccess ? "Saved!" : "Save Page"}
          </Button>
        </div>
      {:else}
        <div class="rabbithole-selector-wrapper">
          <BurrowSelector {burrows} {handleBurrowChange} dropdownDirection={isPopup ? "down" : "up"} allowCreate={true} />
        </div>
        <div class="rabbithole-options-wrapper">
          <Options on:save={initSavePage} />
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .rabbithole-overlay {
    z-index: 2147483647;
    width: 260px;
    position: fixed;
    bottom: 24px;
    background-color: rgba(255, 255, 255, 0.4);
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

  .rabbithole-overlay:hover {
    background-color: rgba(255, 255, 255, 0.95);
  }

  .rabbithole-overlay.rabbithole-popup {
    position: static;
    width: 100%;
    height: 100%;
    border-radius: 0;
    border: none;
    background-color: transparent;
    box-shadow: none;
    padding: 0;
    z-index: auto;
    gap: 16px;
    outline: none;
  }

  .rabbithole-overlay.rabbithole-popup:hover {
    background-color: transparent;
  }

  .rabbithole-overlay.rabbithole-popup .rabbithole-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .rabbithole-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .rabbithole-right {
    right: 24px;
  }

  .rabbithole-left {
    left: 24px;
  }

  .rabbithole-selector-wrapper {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }

  .rabbithole-overlay.rabbithole-popup .rabbithole-selector-wrapper {
    margin-bottom: 0;
  }

  .rabbithole-options-wrapper {
    width: 100%;
  }

  .rabbithole-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }

  .save-page-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: rgba(255, 255, 255, 0.5);
    padding: 8px;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  :global(.save-input input), :global(.save-input textarea) {
    background-color: rgba(255, 255, 255, 0.8) !important;
  }

  :global(.rabbithole-icon) {
    color: white !important;
  }

  :global(.rabbithole-icon svg) {
    color: white !important;
  }

  :global(.rabbithole-icon.header-icon:hover) {
    background-color: rgba(255, 255, 255, 0.15) !important;
  }

  .icon-wrapper {
    position: relative;
    display: inline-flex;
  }

  .success-check-icon {
    position: absolute;
    bottom: -2px;
    right: -2px;
    background-color: rgba(64, 192, 87, 0.9);
    border-radius: 50%;
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    pointer-events: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  /* Dark mode support for overlay */
  @media (prefers-color-scheme: dark) {
    .rabbithole-overlay:not(.rabbithole-popup) {
      background-color: rgba(37, 38, 43, 0.4);
      border-color: rgba(255, 255, 255, 0.1);
      color: white;
    }
    .rabbithole-overlay:not(.rabbithole-popup):hover {
      background-color: rgba(37, 38, 43, 0.95);
    }

    .rabbithole-overlay.rabbithole-popup {
      background-color: transparent;
    }

    .rabbithole-overlay.rabbithole-popup:hover {
      background-color: transparent;
    }

    :global(.rabbithole-icon.header-icon:hover) {
      background-color: rgba(255, 255, 255, 0.1) !important;
    }

    .save-page-form {
      background: rgba(0, 0, 0, 0.2);
      border-color: rgba(255, 255, 255, 0.1);
    }

    :global(.save-input input), :global(.save-input textarea) {
      background-color: rgba(0, 0, 0, 0.3) !important;
      color: white !important;
      border-color: rgba(255, 255, 255, 0.1) !important;
    }
  }
</style>
