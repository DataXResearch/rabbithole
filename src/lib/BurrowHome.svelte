<script>
  import { Text, Button, Stack } from "@svelteuidev/core";
  import { OpenInNewWindow } from "radix-icons-svelte";
  import TimelineCard from "src/lib/TimelineCard.svelte";

  export let activeBurrow = {};
  export let websites = [];

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
</script>

{#if burrowHomeWebsites.length > 0}
  <div class="burrow-home-section">
    <div class="section-header">
      <Text weight="bold" size="lg" color="dimmed">Burrow Home</Text>
      <Button
        variant="subtle"
        compact
        leftIcon={OpenInNewWindow}
        on:click={openAllBurrowHomeTabs}
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

<style>
  .burrow-home-section {
    margin-bottom: 40px;
    background-color: rgba(0, 0, 0, 0.03);
    border: 2px dotted #adb5bd;
    border-radius: 12px;
    padding: 20px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 0 4px;
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

  :global(body.dark-mode) .scroll-container::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
  }
</style>
