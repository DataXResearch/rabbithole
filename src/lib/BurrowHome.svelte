<script>
  import { Button } from "@svelteuidev/core";
  import { OpenInNewWindow } from "radix-icons-svelte";
  import TimelineCard from "src/lib/TimelineCard.svelte";
  import CollapsibleContainer from "src/lib/CollapsibleContainer.svelte";

  export let activeBurrow = {};
  export let websites = [];

  let isOpen = true;

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

  // If Burrow Home becomes empty, reset open state so it doesn't "stick"
  $: if (!hasBurrowHome && !isOpen) {
    isOpen = true;
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

  function handleToggle(e) {
    isOpen = e.detail.open;
  }

  function handleOpenAllClick(event) {
    // Prevent toggling collapse when clicking "Open All"
    event.stopPropagation();
    openAllBurrowHomeTabs();
  }
</script>

{#if hasBurrowHome}
  <div class="burrow-home-wrapper">
    <CollapsibleContainer
      title="Burrow Home"
      titleClass="burrow-home-title"
      open={isOpen}
      on:toggle={handleToggle}
      defaultOpen={true}
    >
      <div class="header-actions">
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

      <div class="horizontal-list" aria-label="Burrow Home websites">
        {#each burrowHomeWebsites as site (site.url)}
          <div class="card-wrap">
            <TimelineCard
              website={site}
              on:websiteDelete={() => removeFromBurrowHome(site.url)}
            />
          </div>
        {/each}
      </div>
    </CollapsibleContainer>
  </div>
{/if}

<style>
  .burrow-home-wrapper {
    margin-bottom: 40px;
  }

  /* Keep the title styling you liked */
  :global(.burrow-home-title) {
    font-weight: 700;
    font-size: 1.125rem;
    color: rgba(0, 0, 0, 0.55);
    letter-spacing: 0;
  }

  :global(body.dark-mode .burrow-home-title) {
    color: rgba(255, 255, 255, 0.65);
  }

  .header-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
  }

  .horizontal-list {
    display: flex;
    gap: 14px;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 6px;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }

  .card-wrap {
    flex: 0 0 360px;
    scroll-snap-align: start;
  }

  /* Scrollbar styling */
  .horizontal-list::-webkit-scrollbar {
    height: 10px;
  }

  .horizontal-list::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.12);
    border-radius: 999px;
  }

  :global(body.dark-mode) .horizontal-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.14);
  }

  @media (max-width: 640px) {
    .card-wrap {
      flex-basis: 300px;
    }
  }
</style>
