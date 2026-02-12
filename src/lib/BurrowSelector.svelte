<script lang="ts">
  import { TextInput, Paper } from "@svelteuidev/core";
  import { MessageRequest } from "../utils";
  import { Burrow } from "src/storage/db";

  export let handleBurrowChange: (burrowId: string) => Promise<void>;
  export let burrows: any[] = [];
  // "down" or "up"
  export let dropdownDirection: string = "down";
  // Allow creating new burrows when no results found
  export let allowCreate: boolean = false;

  let searchValue: string = "";
  let isOpen: boolean = false;

  $: selectedBurrow = burrows.length > 0 ? burrows[0] : null;
  $: displayValue = isOpen ? searchValue : selectedBurrow?.name || "";
  $: filteredBurrows = burrows.filter((b) =>
    b.name.toLowerCase().includes(searchValue.toLowerCase().trim()),
  );

  function handleFocus(): void {
    isOpen = true;
    searchValue = "";
  }

  function handleBlur(): void {
    // Delay closing to allow click events on dropdown items
    setTimeout(() => {
      isOpen = false;
      searchValue = "";
    }, 150);
  }

  function handleInput(e: CustomEvent<any>): void {
    searchValue = e.target.value;
  }

  function selectBurrow(burrow: Burrow): void {
    selectedBurrow = burrow;
    isOpen = false;
    searchValue = "";
    handleBurrowChange(burrow.id);

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  async function createNewBurrow(): Promise<void> {
    const burrowName = searchValue.trim();
    if (!burrowName) return;

    try {
      const newBurrow = await chrome.runtime.sendMessage({
        type: MessageRequest.CREATE_NEW_BURROW,
        newBurrowName: burrowName,
      });

      // Refresh burrows list
      const allBurrows = await chrome.runtime.sendMessage({
        type: MessageRequest.GET_ALL_BURROWS,
      });
      burrows = allBurrows;

      // Select the new burrow
      selectBurrow(newBurrow);
    } catch (err) {
      console.error("Failed to create burrow:", err);
    }
  }

  function handleKeydown(e: CustomEvent<any>): void {
    // FIXME: on:keydown annoyingly only takes a CustomEvent
    const ke = e as unknown as KeyboardEvent;
    if (ke.key === "Escape") {
      isOpen = false;
      searchValue = "";
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
    if (ke.key === "Enter") {
      if (filteredBurrows.length > 0) {
        selectBurrow(filteredBurrows[0]);
      } else if (allowCreate && searchValue.trim()) {
        createNewBurrow();
      }
    }
  }
</script>

<div class="project-selector-container">
  <TextInput
    value={displayValue}
    on:focus={handleFocus}
    on:blur={handleBlur}
    on:input={handleInput}
    on:keydown={handleKeydown}
    placeholder="Select or search burrow"
    radius="md"
    size="sm"
    class="project-selector-input"
  />

  {#if isOpen}
    <Paper
      class="project-dropdown {dropdownDirection === 'up'
        ? 'dropdown-up'
        : 'dropdown-down'}"
      shadow="md"
      radius="md"
      padding="xs"
    >
      {#if filteredBurrows.length > 0}
        {#each filteredBurrows as burrow}
          <button
            type="button"
            class="project-option"
            class:selected={selectedBurrow?.id === burrow.id}
            on:mousedown|preventDefault={() => selectBurrow(burrow)}
          >
            {burrow.name}
          </button>
        {/each}
      {:else if allowCreate && searchValue.trim()}
        <button
          type="button"
          class="create-project-button"
          on:mousedown|preventDefault={createNewBurrow}
        >
          Create "{searchValue.trim()}"
        </button>
      {:else}
        <div class="no-results">No burrows found</div>
      {/if}
    </Paper>
  {/if}
</div>

<style>
  .project-selector-container {
    width: 100%;
    position: relative;
  }

  :global(.project-selector-input input) {
    text-align: center;
    cursor: pointer;
  }

  :global(.project-selector-input input:focus) {
    text-align: left;
  }

  :global(.project-dropdown) {
    position: absolute;
    left: 0;
    right: 0;
    z-index: 1000;
    max-height: 200px;
    overflow-y: auto;
    background: white;
  }

  :global(.project-dropdown.dropdown-down) {
    top: 100%;
    margin-top: 4px;
  }

  :global(.project-dropdown.dropdown-up) {
    bottom: 100%;
    margin-bottom: 4px;
  }

  .project-option {
    display: block;
    width: 100%;
    padding: 8px 12px;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    border-radius: 4px;
    color: inherit;
  }

  .project-option:hover {
    background-color: #f1f3f5;
  }

  .project-option.selected {
    background-color: #e7f5ff;
    color: #1c7ed6;
  }

  .create-project-button {
    display: block;
    width: 100%;
    padding: 8px 12px;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    border-radius: 4px;
    color: #1185fe;
    font-weight: 500;
  }

  .create-project-button:hover {
    background-color: #e7f5ff;
  }

  .no-results {
    padding: 8px 12px;
    text-align: center;
    color: #868e96;
    font-size: 14px;
  }

  /* Dark mode */
  :global(body.dark-mode .project-dropdown) {
    background: #25262b;
  }

  :global(body.dark-mode) .project-option {
    color: #c1c2c5;
  }

  :global(body.dark-mode) .project-option:hover {
    background-color: #2c2e33;
    color: #ffffff;
  }

  :global(body.dark-mode) .project-option.selected {
    background-color: #1c3a5e;
    color: #74c0fc;
  }

  :global(body.dark-mode) .create-project-button {
    color: #4dabf7;
  }

  :global(body.dark-mode) .create-project-button:hover {
    background-color: #1c3a5e;
  }

  :global(body.dark-mode) .no-results {
    color: #909296;
  }
</style>
