<script>
  import { onMount } from "svelte";
  import Timeline from "src/lib/Timeline.svelte";
  import Sidebar from "src/lib/Sidebar.svelte";
  import {
    MessageRequest,
    getOrderedBurrows,
    NotificationDuration,
  } from "../utils";
  import { SvelteUIProvider, AppShell, Navbar, ActionIcon, Button } from "@svelteuidev/core";
  import { HamburgerMenu, Sun, Moon } from "radix-icons-svelte";

  let activeBurrow = {};
  let websites = [];
  let burrows = [];
  let isDark = false;
  let opened = true;

  // Split state for buttons
  let syncWindowSuccess = false;
  let isSyncingWindow = false;
  let updateActiveTabsSuccess = false;
  let isUpdatingActiveTabs = false;
  let createAndSyncSuccess = false;
  let isCreatingAndSyncing = false;

  let isLoadingWebsites = false;
  let settings = {
    show: false,
    alignment: "right",
    darkMode: false,
  };

  onMount(async () => {
    settings = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_SETTINGS,
    });
    isDark = settings.darkMode;
    document.body.classList.toggle("dark-mode", isDark);
    burrows = await getOrderedBurrows();
    activeBurrow = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ACTIVE_BURROW,
    });
    updateWebsites();
  });

  async function createNewBurrow(event) {
    activeBurrow = await chrome.runtime.sendMessage({
      type: MessageRequest.CREATE_NEW_BURROW,
      newBurrowName: event.detail.newBurrowName,
    });
    burrows = await getOrderedBurrows();
    updateWebsites();
  }

  async function createNewBurrowFromWindow(event) {
    isCreatingAndSyncing = true;
    isLoadingWebsites = true;

    await chrome.runtime.sendMessage({
      type: MessageRequest.SAVE_WINDOW_TO_NEW_BURROW,
      newBurrowName: event.detail.newBurrowName,
    });

    // Wait for websites to be stored in the background
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Fetch fresh state from DB to ensure we have the correct active burrow and list
    activeBurrow = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ACTIVE_BURROW,
    });
    burrows = await getOrderedBurrows();
    updateWebsites();

    createAndSyncSuccess = true;
    isCreatingAndSyncing = false;
    isLoadingWebsites = false;

    setTimeout(() => {
      createAndSyncSuccess = false;
    }, NotificationDuration);
  }

  async function updateActiveBurrow(event) {
    const newBurrowId = event.detail.newBurrowId;
    await chrome.runtime.sendMessage({
      type: MessageRequest.CHANGE_ACTIVE_BURROW,
      burrowId: newBurrowId,
    });
    activeBurrow = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_BURROW,
      burrowId: newBurrowId,
    });
    updateWebsites();
  }

  async function saveWindowToActiveBurrow(event) {
    isSyncingWindow = true;
    isLoadingWebsites = true;
    await chrome.runtime.sendMessage({
      type: MessageRequest.SAVE_WINDOW_TO_ACTIVE_BURROW,
    });

    // Wait for websites to be stored in the background
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Fetch fresh state
    activeBurrow = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ACTIVE_BURROW,
    });
    burrows = await getOrderedBurrows();
    updateWebsites();

    syncWindowSuccess = true;
    isSyncingWindow = false;
    isLoadingWebsites = false;

    setTimeout(() => {
      syncWindowSuccess = false;
    }, NotificationDuration);
  }

  async function updateActiveTabs(event) {
    isUpdatingActiveTabs = true;
    isLoadingWebsites = true;
    await chrome.runtime.sendMessage({
      type: MessageRequest.UPDATE_ACTIVE_TABS,
    });

    // Wait for websites to be stored in the background
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Fetch fresh state
    activeBurrow = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ACTIVE_BURROW,
    });
    burrows = await getOrderedBurrows();
    updateWebsites();

    updateActiveTabsSuccess = true;
    isUpdatingActiveTabs = false;
    isLoadingWebsites = false;

    setTimeout(() => {
      updateActiveTabsSuccess = false;
    }, NotificationDuration);
  }

  async function renameActiveBurrow(event) {
    activeBurrow = await chrome.runtime.sendMessage({
      type: MessageRequest.RENAME_BURROW,
      newName: event.detail.newActiveBurrowName,
      burrowId: activeBurrow.id,
    });
    burrows = await getOrderedBurrows();
  }

  async function deleteActiveBurrow(event) {
    activeBurrow = await chrome.runtime.sendMessage({
      type: MessageRequest.DELETE_BURROW,
      burrowId: activeBurrow.id,
    });
    burrows = await getOrderedBurrows();
    updateWebsites();
  }

  async function deleteWebsite(event) {
    await chrome.runtime.sendMessage({
      type: MessageRequest.DELETE_WEBSITE,
      burrowId: activeBurrow.id,
      url: event.detail.url,
    });
    updateWebsites();
  }

  async function updateWebsites() {
    const possiblyDuplicatedWebsites = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_BURROW_WEBSITES,
      burrowId: activeBurrow.id,
    });
    websites = possiblyDuplicatedWebsites.filter(
      (value, index, self) =>
        index === self.findIndex((t) => t.url === value.url)
    );
  }

  async function exportRabbitholes(event) {
    const burrows = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ALL_BURROWS,
    });
    const websites = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ALL_ITEMS,
    });

    const exportData = {
      burrows,
      websites
    };

    const blob = new Blob([JSON.stringify(exportData)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const filename = `rabbithole-${day}-${month}-${year}.json`;

    link.href = url;
    link.setAttribute("download", filename);
    link.click();
  }

  async function importRabbitholes(event) {
    const importData = event.detail.data;

    let burrowsToImport = [];
    let websitesToImport = [];

    if (Array.isArray(importData)) {
      burrowsToImport = importData;
    } else if (importData && typeof importData === 'object') {
      burrowsToImport = importData.burrows || [];
      websitesToImport = importData.websites || [];
    }

    await chrome.runtime.sendMessage({
      type: "IMPORT_DATA",
      burrows: burrowsToImport,
      websites: websitesToImport,
    });

    // Refresh state
    burrows = await getOrderedBurrows();
    activeBurrow = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ACTIVE_BURROW,
    });
    updateWebsites();
  }

  async function toggleTheme() {
    isDark = !isDark;
    document.body.classList.toggle("dark-mode", isDark);
    settings.darkMode = isDark;
    chrome.runtime.sendMessage({
      type: MessageRequest.UPDATE_SETTINGS,
      settings,
    });
  }

  function handleToggleSidebar() {
    opened = !opened;
  }
</script>

<SvelteUIProvider>
  <div class="theme-toggle">
    <Button on:click={toggleTheme} variant="subtle" color="gray" size="sm" style="transform: scale(1.1);">
      {#if isDark}
        <Sun size="22" />
      {:else}
        <Moon size="22" />
      {/if}
    </Button>
  </div>

  <AppShell class={!opened ? 'sidebar-closed-shell' : ''}>
    <div class="main-content" class:sidebar-closed={!opened}>
      {#if opened}
        <Navbar
          width={{
            sm: 280,
            lg: 300,
            base: 100,
          }}
          height={"100%"}
          override={{
            borderRight: "1px solid #e9ecef",
            overflowY: "auto",
            backgroundColor: isDark ? "#1A1B1E" : "#ffffff",
          }}
        >
          <Sidebar
            {syncWindowSuccess}
            {isSyncingWindow}
            {updateActiveTabsSuccess}
            {isUpdatingActiveTabs}
            {createAndSyncSuccess}
            {isCreatingAndSyncing}
            burrows={burrows}
            {opened}
            on:burrowDelete={deleteActiveBurrow}
            on:burrowChange={updateActiveBurrow}
            on:newBurrow={createNewBurrow}
            on:newBurrowSync={createNewBurrowFromWindow}
            on:burrowSync={saveWindowToActiveBurrow}
            on:updateActiveTabs={updateActiveTabs}
            on:exportRabbitholes={exportRabbitholes}
            on:importRabbitholes={importRabbitholes}
            on:toggleSidebar={handleToggleSidebar}
          />
        </Navbar>
      {:else}
        <div class="hamburger-only">
          <ActionIcon
            on:click={handleToggleSidebar}
            variant="transparent"
            class="hamburger-btn"
            size="xl"
          >
            <HamburgerMenu size="24" />
          </ActionIcon>
        </div>
      {/if}

      <div class="timeline-wrapper">
        <Timeline
          on:websiteDelete={deleteWebsite}
          on:burrowRename={renameActiveBurrow}
          activeBurrow={activeBurrow}
          {websites}
          isLoading={isLoadingWebsites}
        />
      </div>
    </div>
  </AppShell>
</SvelteUIProvider>

<style>
  /* Global Background Consistency */
  :global(body) {
    background-color: #f8f9fa;
    margin: 0;
  }

  :global(.mantine-AppShell-main) {
    background-color: #f8f9fa;
    padding: 0 !important;
  }

  .main-content {
    display: flex;
    width: 100%;
    min-height: 100vh;
    background-color: #f8f9fa;
    transition: background-color 0.3s ease;
  }

  .timeline-wrapper {
    flex: 1;
    width: 100%;
  }

  .main-content.sidebar-closed {
    justify-content: center;
  }

  /* Force removal of padding when sidebar is closed */
  :global(.sidebar-closed-shell .mantine-AppShell-main) {
    padding-left: 0 !important;
  }

  .hamburger-only {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 100;
    background: transparent;
    padding: 20px;
  }

  :global(.hamburger-only .sidebar-wrapper) {
    background: transparent !important;
    width: auto !important;
    padding: 20px !important;
  }

  .theme-toggle {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
  }

  /* Theme Toggle Hover Effects */
  /* Using 'button' selector to be more robust than class names */
  :global(body:not(.dark-mode) .theme-toggle button:hover) {
    background-color: #141517 !important;
    color: #c1c2c5 !important;
  }

  :global(body.dark-mode .theme-toggle button:hover) {
    background-color: #f8f9fa !important;
    color: #141517 !important;
  }

  /* Dark Mode Global Overrides */
  :global(body.dark-mode) {
    background-color: #141517;
    color: #c1c2c5;
  }

  :global(body.dark-mode .main-content) {
    background-color: #141517;
  }

  :global(body.dark-mode .mantine-AppShell-root) {
    background-color: #141517;
  }

  :global(body.dark-mode .mantine-AppShell-main) {
    background-color: #141517;
    color: #c1c2c5;
  }

  :global(body.dark-mode .mantine-Text-root) {
    color: #c1c2c5;
  }

  :global(body.dark-mode .mantine-TextInput-input),
  :global(body.dark-mode .mantine-Input-input),
  :global(body.dark-mode .mantine-Select-input),
  :global(body.dark-mode .mantine-NativeSelect-select) {
    background-color: #25262b;
    color: #c1c2c5;
    border-color: #373a40;
  }

  :global(body.dark-mode .mantine-Navbar-root) {
    background-color: #1A1B1E !important;
    border-right: 1px solid #2C2E33 !important;
  }

  :global(body.dark-mode .mantine-Navbar-root[aria-hidden="true"]) {
    background-color: transparent !important;
  }

  :global(body.dark-mode .mantine-Divider-root) {
    border-color: #373a40;
  }

  :global(body.dark-mode #project-name) {
    color: #ffffff !important;
  }

  :global(body.dark-mode .active-rabbithole) {
    color: #ffffff !important;
    font-weight: bold;
  }

  :global(body.dark-mode .hamburger-btn) {
    color: #e7e7e7 !important;
  }
  :global(body.dark-mode .hamburger-btn:hover) {
    background-color: #25262b;
  }
</style>
