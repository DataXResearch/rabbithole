<script>
  import { onMount, tick, afterUpdate } from "svelte";
  import { createEventDispatcher } from "svelte";
  import {
    ActionIcon,
    TextInput,
    Text,
    Stack,
    Loader,
  } from "@svelteuidev/core";
  import { Cross2, MagnifyingGlass } from "radix-icons-svelte";
  import Fuse from "fuse.js";
  import TimelineCard from "src/lib/TimelineCard.svelte";
  import RabbitholeGrid from "src/lib/RabbitholeGrid.svelte";
  import BurrowGrid from "src/lib/BurrowGrid.svelte";
  import CollapsibleContainer from "src/lib/CollapsibleContainer.svelte";
  import { MessageRequest } from "../utils";

  export let isOpen = false;

  const dispatch = createEventDispatcher();

  let searchQuery = "";
  let allWebsites = [];
  let allRabbitholes = [];
  let allBurrows = [];
  let websiteResults = [];
  let rabbitholeResults = [];
  let burrowResults = [];
  let isLoading = true;
  let inputRef;

  // Track collapse state for each section
  let sectionStates = {
    rabbitholes: true,
    burrows: true,
    websites: true,
  };

  onMount(async () => {
    await loadAllData();
  });

  afterUpdate(() => {
    if (isOpen && inputRef) {
      const input = inputRef.querySelector("input");
      if (input) {
        input.focus();
      }
    }
  });

  async function loadAllData() {
    isLoading = true;
    try {
      const [websites, rabbitholes, burrows] = await Promise.all([
        chrome.runtime.sendMessage({
          type: MessageRequest.GET_ALL_ITEMS,
        }),
        chrome.runtime.sendMessage({
          type: MessageRequest.GET_ALL_RABBITHOLES,
        }),
        chrome.runtime.sendMessage({
          type: MessageRequest.GET_ALL_BURROWS,
        }),
      ]);

      allWebsites = websites || [];
      allRabbitholes = rabbitholes || [];
      allBurrows = burrows || [];
    } catch (err) {
      console.error("Failed to load data:", err);
    }
    isLoading = false;
  }

  function close() {
    isOpen = false;
    searchQuery = "";
    websiteResults = [];
    rabbitholeResults = [];
    burrowResults = [];
  }

  function handleKeydown(e) {
    if (e.key === "Escape" && isOpen) {
      close();
    }
  }

  function performSearch() {
    if (searchQuery.length < 2) {
      websiteResults = [];
      rabbitholeResults = [];
      burrowResults = [];
      return;
    }

    // Search websites
    const websiteFuse = new Fuse(allWebsites, {
      keys: ["name", "description", "url"],
      includeScore: true,
      threshold: 0.3,
    });
    const websiteMatches = websiteFuse.search(searchQuery);
    websiteResults = websiteMatches.map((res) => res.item);

    // Search rabbitholes
    const rabbitholeFuse = new Fuse(allRabbitholes, {
      keys: ["title", "description"],
      includeScore: true,
      threshold: 0.3,
    });
    const rabbitholeMatches = rabbitholeFuse.search(searchQuery);
    rabbitholeResults = rabbitholeMatches.map((res) => res.item);

    // Search burrows
    const burrowFuse = new Fuse(allBurrows, {
      keys: ["name"],
      includeScore: true,
      threshold: 0.3,
    });
    const burrowMatches = burrowFuse.search(searchQuery);
    burrowResults = burrowMatches.map((res) => res.item);
  }

  function handleToggleSection(section, event) {
    sectionStates[section] = event.detail.open;
  }

  async function handleSelectRabbithole(rabbithole) {
    // Navigate to the rabbithole
    await chrome.runtime.sendMessage({
      type: MessageRequest.CHANGE_ACTIVE_RABBITHOLE,
      rabbitholeId: rabbithole.id,
    });
    dispatch("select", { type: "rabbithole", id: rabbithole.id });
    close();
  }

  async function handleSelectBurrow(burrow) {
    // Navigate to the burrow
    await chrome.runtime.sendMessage({
      type: MessageRequest.CHANGE_ACTIVE_BURROW,
      burrowId: burrow.id,
    });
    dispatch("select", { type: "burrow", id: burrow.id });
    close();
  }

  $: if (searchQuery) {
    performSearch();
  }

  $: totalResults =
    websiteResults.length + rabbitholeResults.length + burrowResults.length;
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="modal-overlay" on:click={close}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2 class="modal-title">Search Everywhere</h2>
        <ActionIcon variant="subtle" on:click={close}>
          <Cross2 />
        </ActionIcon>
      </div>
      <div class="modal-body">
        <div class="search-input-wrapper" bind:this={inputRef}>
          <TextInput
            placeholder="Search rabbitholes, burrows, and websites..."
            icon={MagnifyingGlass}
            size="md"
            radius="md"
            bind:value={searchQuery}
          />
        </div>

        {#if isLoading}
          <div class="loading-container">
            <Loader size="md" variant="dots" />
            <Text size="sm" color="dimmed" style="margin-top: 1rem;">
              Searching...
            </Text>
          </div>
        {:else if searchQuery.length < 2}
          <div class="empty-state">
            <Text size="sm" color="dimmed" align="center">
              Type at least 2 characters to search
            </Text>
          </div>
        {:else if totalResults === 0}
          <div class="empty-state">
            <Text size="sm" color="dimmed" align="center">
              No results found for "{searchQuery}"
            </Text>
          </div>
        {:else}
          <div class="results-container">
            <Stack spacing="lg">
              {#if rabbitholeResults.length > 0}
                <CollapsibleContainer
                  title="Rabbitholes ({rabbitholeResults.length})"
                  open={sectionStates.rabbitholes}
                  on:toggle={(e) => handleToggleSection("rabbitholes", e)}
                >
                  <RabbitholeGrid
                    rabbitholes={rabbitholeResults}
                    burrows={allBurrows}
                    onSelect={handleSelectRabbithole}
                    showBurrows={true}
                  />
                </CollapsibleContainer>
              {/if}

              {#if burrowResults.length > 0}
                <CollapsibleContainer
                  title="Burrows ({burrowResults.length})"
                  open={sectionStates.burrows}
                  on:toggle={(e) => handleToggleSection("burrows", e)}
                >
                  <BurrowGrid
                    burrows={burrowResults}
                    onSelect={handleSelectBurrow}
                  />
                </CollapsibleContainer>
              {/if}

              {#if websiteResults.length > 0}
                <CollapsibleContainer
                  title="Websites ({websiteResults.length})"
                  open={sectionStates.websites}
                  on:toggle={(e) => handleToggleSection("websites", e)}
                >
                  <Stack spacing="md">
                    {#each websiteResults as website}
                      <TimelineCard {website} showDelete={false} />
                    {/each}
                  </Stack>
                </CollapsibleContainer>
              {/if}
            </Stack>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
  }

  .modal-content {
    background-color: white;
    padding: 24px;
    border-radius: 12px;
    width: 90%;
    max-width: 900px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    animation: popIn 0.2s ease-out;
  }

  @keyframes popIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .modal-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1a1b1e;
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex: 1;
  }

  .search-input-wrapper {
    margin-bottom: 20px;
  }

  .loading-container,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
  }

  .results-container {
    overflow-y: auto;
    flex: 1;
    padding-right: 8px;
  }

  /* Custom scrollbar */
  .results-container::-webkit-scrollbar {
    width: 8px;
  }

  .results-container::-webkit-scrollbar-track {
    background: #f1f3f5;
    border-radius: 4px;
  }

  .results-container::-webkit-scrollbar-thumb {
    background: #adb5bd;
    border-radius: 4px;
  }

  .results-container::-webkit-scrollbar-thumb:hover {
    background: #868e96;
  }

  /* Dark mode styles */
  :global(body.dark-mode) .modal-content {
    background-color: #25262b;
    border: 1px solid #373a40;
    color: #c1c2c5;
  }

  :global(body.dark-mode) .modal-title {
    color: #e7f5ff;
  }

  :global(body.dark-mode) .results-container::-webkit-scrollbar-track {
    background: #1a1b1e;
  }

  :global(body.dark-mode) .results-container::-webkit-scrollbar-thumb {
    background: #5c5f66;
  }

  :global(body.dark-mode) .results-container::-webkit-scrollbar-thumb:hover {
    background: #909296;
  }

  :global(body.dark-mode .search-input-wrapper .mantine-TextInput-input) {
    background-color: #1a1b1e;
    border-color: #373a40;
    color: #c1c2c5;
  }
</style>
