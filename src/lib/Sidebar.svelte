<script>
  import { createEventDispatcher, onMount } from "svelte";
  import {
    Button,
    Text,
    TextInput,
    Tooltip,
    Stack,
    ActionIcon,
    Group,
  } from "@svelteuidev/core";
  import SettingsButtons from "src/lib/SettingsButtons.svelte";
  import Auth from "src/lib/Auth.svelte";
  import CollapsibleSection from "src/lib/CollapsibleSection.svelte";
  import SearchEverywhereModal from "src/lib/SearchEverywhereModal.svelte";
  import { NotificationDuration } from "../utils";
  import BurrowSelector from "src/lib/BurrowSelector.svelte";
  import {
    HamburgerMenu,
    Plus,
    Download,
    Upload,
    Trash,
    Reload,
    FilePlus,
    Check,
    Update,
    MagnifyingGlass,
  } from "radix-icons-svelte";

  const dispatch = createEventDispatcher();

  export let burrows;
  export let syncWindowSuccess = false;
  export let isSyncingWindow = false;
  export let updateBurrowHomeSuccess = false;
  export let isUpdatingBurrowHome = false;
  export let createAndSyncSuccess = false;
  export let isCreatingAndSyncing = false;
  export let opened;

  let createBurrowFail = false;
  let createBurrowFailMsg = "";

  let newRabbitholeName = "";
  let isHoveringOverSync = false;
  let isHoveringOverUpdateBurrowHome = false;
  let isHoveringOverDelete = false;
  let isHoveringOverCreateSync = false;
  let fileInput;
  let showSearchModal = false;
  let isMac = false;

  let sectionStates = {
    profile: true,
    activeBurrow: true,
    newBurrow: true,
    settings: false,
    data: false,
  };

  onMount(() => {
    isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

    function handleKeydown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearchModal();
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  });

  function validateBurrowName() {
    let valid = true;
    if (newRabbitholeName === "") {
      createBurrowFailMsg = "Required!";
      valid = false;
    }
    if (
      burrows.filter(
        (b) => b.name.toLowerCase() === newRabbitholeName.toLowerCase(),
      ).length > 0
    ) {
      createBurrowFailMsg = "Taken!";
      valid = false;
    }
    if (!valid) {
      createBurrowFail = true;
      setTimeout(() => {
        createBurrowFail = false;
      }, NotificationDuration);
      return false;
    }
    return true;
  }

  async function handleBurrowChange(event) {
    // Handle both CustomEvent (Select) and native Event (NativeSelect fallback)
    const newBurrowId = event.detail || event.target?.value;
    dispatch("burrowChange", {
      newBurrowId,
    });
  }

  async function createNewBurrow() {
    if (validateBurrowName()) {
      dispatch("newBurrow", {
        newBurrowName: newRabbitholeName,
      });
      newRabbitholeName = "";
    }
  }

  async function saveAllTabsToNewBurrow() {
    if (validateBurrowName()) {
      dispatch("newBurrowSync", {
        newBurrowName: newRabbitholeName,
      });
      newRabbitholeName = "";
    }
  }

  async function saveAllTabsToActiveBurrow() {
    dispatch("burrowSync");
  }

  async function updateBurrowHome() {
    dispatch("updateBurrowHome");
  }

  async function deleteBurrow() {
    dispatch("burrowDelete");
  }

  async function exportRabbitholes() {
    dispatch("exportRabbitholes");
  }

  async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        dispatch("importRabbitholes", { data });
      } catch (err) {
        console.error("Failed to parse import file", err);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function toggleSidebar() {
    dispatch("toggleSidebar");
  }

  function openSearchModal() {
    showSearchModal = true;
  }
</script>

<SearchEverywhereModal bind:isOpen={showSearchModal} />

<div class="sidebar-wrapper">
  <div class="sidebar-header">
    <ActionIcon
      on:click={toggleSidebar}
      variant="transparent"
      class="hamburger-btn"
      size="xl"
    >
      <HamburgerMenu size="24" />
    </ActionIcon>
  </div>

  {#if opened}
    <div class="sidebar-content">
      <Stack spacing={16}>
        <!-- Search Everywhere Button -->
        <div class="search-button-wrapper">
          <button class="search-button" on:click={openSearchModal}>
            <MagnifyingGlass size={16} />
            <span class="search-text">Search everywhere...</span>
            <span class="search-shortcut">{isMac ? "⌘K" : "Ctrl+K"}</span>
          </button>
        </div>

        <!-- Profile Section -->
        <CollapsibleSection title="Profile" bind:open={sectionStates.profile}>
          <Auth />
        </CollapsibleSection>

        <!-- Current Burrow Section -->
        <CollapsibleSection
          title="Active Burrow"
          bind:open={sectionStates.activeBurrow}
        >
          <Stack spacing={20} align="center">
            <BurrowSelector
              id="burrow-selector"
              {burrows}
              {handleBurrowChange}
            />

            <Tooltip
              {isHoveringOverSync}
              label="Save all tabs in window to current burrow"
              withArrow
              position="bottom"
              color="dark"
            >
              <div class="button-wrapper">
                <Button
                  on:click={saveAllTabsToActiveBurrow}
                  on:mouseenter={() => (isHoveringOverSync = true)}
                  on:mouseleave={() => (isHoveringOverSync = false)}
                  color="blue"
                  fullWidth
                  class="sidebar-btn custom-blue-btn"
                  leftIcon={Reload}
                  loading={isSyncingWindow}
                >
                  Sync Window
                </Button>
                {#if syncWindowSuccess}
                  <div class="success-check-outside">
                    <Check />
                  </div>
                {/if}
              </div>
            </Tooltip>

            <Tooltip
              {isHoveringOverUpdateBurrowHome}
              label="Update burrow home list"
              withArrow
              position="bottom"
              color="dark"
            >
              <div class="button-wrapper">
                <Button
                  on:click={updateBurrowHome}
                  on:mouseenter={() => (isHoveringOverUpdateBurrowHome = true)}
                  on:mouseleave={() => (isHoveringOverUpdateBurrowHome = false)}
                  color="blue"
                  fullWidth
                  class="sidebar-btn custom-blue-btn"
                  leftIcon={Update}
                  loading={isUpdatingBurrowHome}
                >
                  Update Burrow Home
                </Button>
                {#if updateBurrowHomeSuccess}
                  <div class="success-check-outside">
                    <Check />
                  </div>
                {/if}
              </div>
            </Tooltip>

            <Tooltip
              {isHoveringOverDelete}
              label="Irreversible!"
              withArrow
              position="bottom"
              color="red"
            >
              <Button
                on:click={deleteBurrow}
                on:mouseenter={() => (isHoveringOverDelete = true)}
                on:mouseleave={() => (isHoveringOverDelete = false)}
                color="red"
                fullWidth
                class="sidebar-btn"
                leftIcon={Trash}
              >
                Delete Burrow
              </Button>
            </Tooltip>
          </Stack>
        </CollapsibleSection>

        <!-- Create Section -->
        <CollapsibleSection
          title="New Burrow"
          bind:open={sectionStates.newBurrow}
        >
          <Stack spacing={20} align="center">
            <TextInput
              placeholder="Burrow Name"
              bind:value={newRabbitholeName}
              variant="filled"
              radius="md"
              error={createBurrowFail ? createBurrowFailMsg : false}
            />

            <Button
              on:click={createNewBurrow}
              color="blue"
              fullWidth
              class="sidebar-btn custom-blue-btn"
              leftIcon={FilePlus}
            >
              Create Empty
            </Button>

            <Tooltip
              {isHoveringOverCreateSync}
              label="Create a new burrow and add all tabs in this window to it"
              withArrow
              position="bottom"
              color="dark"
            >
              <div class="button-wrapper">
                <Button
                  on:click={saveAllTabsToNewBurrow}
                  on:mouseenter={() => (isHoveringOverCreateSync = true)}
                  on:mouseleave={() => (isHoveringOverCreateSync = false)}
                  color="blue"
                  fullWidth
                  class="sidebar-btn custom-blue-btn"
                  leftIcon={Update}
                  loading={isCreatingAndSyncing}
                >
                  Create and Sync Window
                </Button>
                {#if createAndSyncSuccess}
                  <div class="success-check-outside">
                    <Check />
                  </div>
                {/if}
              </div>
            </Tooltip>
          </Stack>
        </CollapsibleSection>

        <!-- Settings Section -->
        <CollapsibleSection
          title="Settings"
          bind:open={sectionStates.settings}
        >
          <Stack spacing={20}>
            <SettingsButtons />
          </Stack>
        </CollapsibleSection>

        <!-- Data Section -->
        <CollapsibleSection title="Data" bind:open={sectionStates.data}>
          <Stack spacing={20} align="center">
            <Group grow spacing="xs" style="width: 100%">
              <Button
                on:click={() => fileInput.click()}
                color="blue"
                class="sidebar-btn custom-blue-btn"
                leftIcon={Upload}
              >
                Import
              </Button>
              <Button
                on:click={exportRabbitholes}
                color="blue"
                class="sidebar-btn custom-blue-btn"
                leftIcon={Download}
              >
                Export
              </Button>
            </Group>
            <input
              type="file"
              accept=".json"
              style="display: none;"
              bind:this={fileInput}
              on:change={handleImport}
            />
          </Stack>
        </CollapsibleSection>
      </Stack>
    </div>
  {/if}
</div>

<style>
  .sidebar-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 20px;
  }

  .sidebar-header {
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding-right: 30px; /* Increased to make room for checkmarks */
    animation: fadeIn 0.2s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Search Button Styling */
  .search-button-wrapper {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-bottom: 8px;
  }

  .search-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    color: #868e96;
  }

  .search-button:hover {
    background-color: #e9ecef;
    border-color: #ced4da;
  }

  .search-text {
    flex: 1;
    text-align: left;
  }

  .search-shortcut {
    font-size: 12px;
    padding: 2px 6px;
    background-color: #ffffff;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    color: #495057;
    font-family: monospace;
  }

  /* --- Button Standardization --- */

  /* Base Sidebar Button */
  :global(.sidebar-btn) {
    height: 42px;
    font-weight: 500;
    text-align: center;
    position: relative;
  }

  :global(.sidebar-btn .mantine-Button-inner) {
    justify-content: center !important;
    width: 100%;
  }

  :global(.sidebar-btn.custom-blue-btn) {
    background-color: #1185fe !important;
    color: white !important;
  }

  :global(.sidebar-btn.custom-blue-btn:hover) {
    background-color: #0070e0 !important;
  }

  .button-wrapper {
    position: relative;
    width: 100%;
  }

  .success-check-outside {
    position: absolute;
    right: -26px;
    top: 50%;
    transform: translateY(-50%);
    color: #40c057;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Center text in inputs (like Burrow Name) */
  :global(.sidebar-content input) {
    text-align: center !important;
  }

  /*
     Dark Mode Overrides
  */
  :global(body.dark-mode .sidebar-wrapper) {
    background-color: #1a1b1e;
    color: #c1c2c5;
  }

  :global(body.dark-mode .hamburger-btn) {
    color: #e7e7e7 !important;
  }
  :global(body.dark-mode .hamburger-btn:hover) {
    background-color: #25262b;
  }

  :global(body.dark-mode .mantine-TextInput-input) {
    background-color: #25262b;
    border-color: transparent;
    color: #c1c2c5;
  }
  :global(body.dark-mode .mantine-TextInput-input:focus) {
    border-color: #339af0;
  }

  /* Dark mode search button */
  :global(body.dark-mode) .search-button {
    background-color: #25262b;
    border-color: #373a40;
    color: #909296;
  }

  :global(body.dark-mode) .search-button:hover {
    background-color: #2c2e33;
    border-color: #495057;
  }

  :global(body.dark-mode) .search-shortcut {
    background-color: #1a1b1e;
    border-color: #373a40;
    color: #c1c2c5;
  }
</style>
