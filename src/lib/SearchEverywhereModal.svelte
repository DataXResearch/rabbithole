<script>
  import { onMount, tick, afterUpdate } from "svelte";
  import { createEventDispatcher } from "svelte";
  import { ActionIcon, TextInput, Text, Stack, Loader } from "@svelteuidev/core";
  import { Cross2, MagnifyingGlass } from "radix-icons-svelte";
  import Fuse from "fuse.js";
  import TimelineCard from "src/lib/TimelineCard.svelte";
  import { MessageRequest } from "../utils";

  export let isOpen = false;

  const dispatch = createEventDispatcher();

  let searchQuery = "";
  let allWebsites = [];
  let searchResults = [];
  let isLoading = true;
  let inputRef;

  onMount(async () => {
    await loadAllWebsites();
  });

  afterUpdate(() => {
    if (isOpen && inputRef) {
      // Find the actual input element within the TextInput component
      const input = inputRef.querySelector('input');
      if (input) {
        input.focus();
      }
    }
  });

  async function loadAllWebsites() {
    isLoading = true;
    try {
      allWebsites = await chrome.runtime.sendMessage({
        type: MessageRequest.GET_ALL_ITEMS,
      });
    } catch (err) {
      console.error("Failed to load websites:", err);
    }
    isLoading = false;
  }

  function close() {
    isOpen = false;
    searchQuery = "";
    searchResults = [];
  }

  function handleKeydown(e) {
    if (e.key === "Escape" && isOpen) {
      close();
    }
  }

  function performSearch() {
    if (searchQuery.length < 2) {
      searchResults = [];
      return;
    }

    const fuse = new Fuse(allWebsites, {
      keys: ["name", "description", "url"],
      includeScore: true,
      threshold: 0.3,
    });

    const results = fuse.search(searchQuery);
    searchResults = results.map((res) => res.item);
  }

  async function handleDeleteWebsite(event) {
    const urlToDelete = event.detail.url;

    // Find which project(s) contain this website
    const projects = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ALL_BURROWS,
    });

    for (const project of projects) {
      if (project.savedWebsites.includes(urlToDelete)) {
        await chrome.runtime.sendMessage({
          type: MessageRequest.DELETE_WEBSITE,
          projectId: project.id,
          url: urlToDelete,
        });
      }
    }

    // Reload websites and re-search
    await loadAllWebsites();
    performSearch();
  }

  $: if (searchQuery) {
    performSearch();
  }
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
            placeholder="Search across all projects..."
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
              Loading websites...
            </Text>
          </div>
        {:else if searchQuery.length < 2}
          <div class="empty-state">
            <Text size="sm" color="dimmed" align="center">
              Type at least 2 characters to search
            </Text>
          </div>
        {:else if searchResults.length === 0}
          <div class="empty-state">
            <Text size="sm" color="dimmed" align="center">
              No results found for "{searchQuery}"
            </Text>
          </div>
        {:else}
          <div class="results-container">
            <Text size="sm" color="dimmed" style="margin-bottom: 12px;">
              Found {searchResults.length} result{searchResults.length === 1 ? "" : "s"}
            </Text>
            <Stack spacing="md">
              {#each searchResults as website}
                <TimelineCard {website} on:websiteDelete={handleDeleteWebsite} />
              {/each}
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
    max-width: 700px;
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
