<script>
  import { Text, Button, Stack } from "@svelteuidev/core";
  import { OpenInNewWindow } from "radix-icons-svelte";
  import TimelineCard from "src/lib/TimelineCard.svelte";

  export let activeBurrow = {};
  export let websites = [];

  let isCollapsed = false;

  $: burrowHomeWebsites = (() => {
    if (!activeBurrow?.activeTabs || activeBurrow.activeTabs.length === 0) {
      return [];
    }
    // Map URLs to website objects from the main list
    // Note: This assumes all active tabs are also in the main saved list, which they should be after sync
    return activeBurrow.activeTabs
      .map((url) => websites.find((w) => w.url === url))
      .filter(Boolean);
  })();

  $: hasBurrowHome = burrowHomeWebsites.length > 0;

  // If Burrow Home becomes empty, reset collapsed state so it doesn't "stick"
  $: if (!hasBurrowHome && isCollapsed) {
    isCollapsed = false;
  }

  async function openAllBurrowHomeTabs() {
    if (activeBurrow.activeTabs && activeBurrow.activeTabs.length > 0) {
      await chrome.runtime.sendMessage({
        type: "OPEN_TABS",
        urls: activeBurrow.activeTabs,
      });
    }
  }

  async function removeFromBurrowHome(url) {
    await chrome.runtime.sendMessage({
      type: "REMOVE_FROM_ACTIVE_TABS",
      burrowId: activeBurrow.id,
      url: url,
    });

    activeBurrow.activeTabs = activeBurrow.activeTabs.filter((u) => u !== url);
  }

  function toggleCollapsed() {
    isCollapsed = !isCollapsed;
  }

  function handleOpenAllClick(event) {
    // This Button sits inside a clickable header; prevent collapsing when clicking "Open All"
    event.stopPropagation();
    openAllBurrowHomeTabs();
  }
</script>

{#if hasBurrowHome}
  {#if isCollapsed}
    <div
      class="burrow-home-section burrow-home-collapsed"
      role="button"
      tabindex="0"
      on:click={toggleCollapsed}
      on:keydown={(e) => e.key === "Enter" && toggleCollapsed()}
    >
      <Text weight="bold" size="lg" color="dimmed">Burrow Home</Text>
    </div>
  {:else}
    <div class="burrow-home-section">
      <div
        class="section-header section-header-clickable"
        role="button"
        tabindex="0"
        on:click={toggleCollapsed}
        on:keydown={(e) => e.key === "Enter" && toggleCollapsed()}
      >
        <Text weight="bold" size="lg" color="dimmed">Burrow Home</Text>
        <Button
          class="open-all-btn"
          variant="subtle"
          compact
          leftIcon={OpenInNewWindow}
          on:click={handleOpenAllClick}
        >
          Open All
        </Button>
      </div>

      <div class="scroll-container">
        <Stack spacing="md">
          {#each burrowHomeWebsites as site}
            <div class="burrow-home-card">
              <TimelineCard
                website={site}
                on:websiteDelete={() => removeFromBurrowHome(site.url)}
              />
            </div>
          {/each}
        </Stack>
      </div>
    </div>
  {/if}
{/if}

<style>
  .burrow-home-section {
    margin-bottom: 40px;
    background-color: rgba(0, 0, 0, 0.03);
    border: 2px dotted #adb5bd;
    border-radius: 12px;
    padding: 20px;
  }

  .burrow-home-collapsed {
    cursor: pointer;
    user-select: none;
    transition: background-color 0.15s ease, border-color 0.15s ease,
      transform 0.15s ease;
  }

  .burrow-home-collapsed:hover {
    background-color: rgba(0, 0, 0, 0.06);
    border-color: rgba(17, 133, 254, 0.65);
  }

  .burrow-home-collapsed:active {
    transform: translateY(1px);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 0 4px;
  }

  .section-header-clickable {
    cursor: pointer;
    user-select: none;
    border-radius: 10px;
    padding: 8px 8px;
    margin: -8px -4px 8px -4px;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  /* Highlight the header on hover, but NOT when hovering the "Open All" button */
  .section-header-clickable:hover:not(:has(.open-all-btn:hover)) {
    background-color: rgba(0, 0, 0, 0.06);
  }

  .scroll-container {
    max-height: 600px; /* Approximate height for ~5 cards */
    overflow-y: auto;
    padding-right: 4px; /* Space for scrollbar */
  }

  /* Custom scrollbar styling for webkit browsers */
  .scroll-container::-webkit-scrollbar {
    width: 8px;
  }

  .scroll-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .scroll-container::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  :global(body.dark-mode) .burrow-home-section {
    background-color: rgba(255, 255, 255, 0.03);
    border-color: #5c5f66;
  }

  :global(body.dark-mode) .burrow-home-collapsed:hover {
    background-color: rgba(255, 255, 255, 0.06);
    border-color: rgba(77, 171, 247, 0.65);
  }

  :global(body.dark-mode) .section-header-clickable:hover:not(:has(.open-all-btn:hover)) {
    background-color: rgba(255, 255, 255, 0.06);
  }

  :global(body.dark-mode) .scroll-container::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
  }
</style>
