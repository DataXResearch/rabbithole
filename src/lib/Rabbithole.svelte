<script>
  import { onMount } from "svelte";
  import Timeline from "src/lib/Timeline.svelte";
  import Navbar from "src/lib/Navbar.svelte";
  import RabbitholeGrid from "src/lib/RabbitholeGrid.svelte";
  import BurrowGrid from "src/lib/BurrowGrid.svelte";
  import {
    MessageRequest,
    getOrderedBurrows,
    NotificationDuration,
  } from "../utils";
  import {
    SvelteUIProvider,
    AppShell,
    Navbar as MantineNavbar,
    ActionIcon,
    Button,
    Loader,
    Text,
  } from "@svelteuidev/core";
  import { HamburgerMenu, Sun, Moon } from "radix-icons-svelte";

  let activeBurrow = {};
  let websites = [];
  let burrows = [];
  let rabbitholes = [];
  let activeRabbithole = null;
  let viewingAllBurrows = false;

  let isDark = false;
  let opened = true;

  let syncWindowSuccess = false;
  let isSyncingWindow = false;
  let updateBurrowHomeSuccess = false;
  let isUpdatingBurrowHome = false;
  let createAndSyncSuccess = false;
  let isCreatingAndSyncing = false;

  let isLoadingWebsites = false;
  let isLoadingHome = true;

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

    await refreshHomeState();
    isLoadingHome = false;

    if (activeBurrow?.id) {
      updateWebsites();
    }
  });

  async function refreshHomeState() {
    try {
      const [rh, allRh, allBurrows, activeB] = await Promise.all([
        chrome.runtime.sendMessage({
          type: MessageRequest.GET_ACTIVE_RABBITHOLE,
        }),
        chrome.runtime.sendMessage({
          type: MessageRequest.GET_ALL_RABBITHOLES,
        }),
        chrome.runtime.sendMessage({ type: MessageRequest.GET_ALL_BURROWS }),
        chrome.runtime.sendMessage({ type: MessageRequest.GET_ACTIVE_BURROW }),
      ]);

      activeRabbithole = rh || null;
      rabbitholes = Array.isArray(allRh) ? allRh : [];
      burrows = Array.isArray(allBurrows) ? allBurrows : [];
      activeBurrow = activeB || {};
    } catch (e) {
      const [allRh, allBurrows] = await Promise.all([
        chrome.runtime.sendMessage({
          type: MessageRequest.GET_ALL_RABBITHOLES,
        }),
        chrome.runtime.sendMessage({ type: MessageRequest.GET_ALL_BURROWS }),
      ]);

      activeRabbithole = null;
      activeBurrow = {};
      websites = [];
      rabbitholes = Array.isArray(allRh) ? allRh : [];
      burrows = Array.isArray(allBurrows) ? allBurrows : [];
    }
  }

  $: burrowsInActiveRabbithole =
    activeRabbithole && Array.isArray(activeRabbithole.burrows)
      ? burrows.filter((b) => activeRabbithole.burrows.includes(b.id))
      : [];

  $: pageTitle = (() => {
    if (viewingAllBurrows) return "All Burrows";
    if (activeRabbithole?.title) return activeRabbithole.title;
    return "Rabbithole";
  })();

  async function goHome() {
    await Promise.all([
      chrome.runtime.sendMessage({
        type: MessageRequest.CHANGE_ACTIVE_RABBITHOLE,
        rabbitholeId: null,
      }),
      chrome.runtime.sendMessage({
        type: MessageRequest.CHANGE_ACTIVE_BURROW,
        burrowId: null,
      }),
    ]);

    activeRabbithole = null;
    activeBurrow = {};
    websites = [];
    viewingAllBurrows = false;
  }

  async function goToAllBurrows() {
    await Promise.all([
      chrome.runtime.sendMessage({
        type: MessageRequest.CHANGE_ACTIVE_RABBITHOLE,
        rabbitholeId: null,
      }),
      chrome.runtime.sendMessage({
        type: MessageRequest.CHANGE_ACTIVE_BURROW,
        burrowId: null,
      }),
    ]);

    activeRabbithole = null;
    activeBurrow = {};
    websites = [];
    viewingAllBurrows = true;
  }

  async function selectRabbithole(rabbithole) {
    if (!rabbithole?.id) return;

    await chrome.runtime.sendMessage({
      type: MessageRequest.CHANGE_ACTIVE_RABBITHOLE,
      rabbitholeId: rabbithole.id,
    });

    activeRabbithole = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ACTIVE_RABBITHOLE,
    });

    const activeB = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ACTIVE_BURROW,
    });

    if (activeB?.id && activeRabbithole?.burrows?.includes(activeB.id)) {
      activeBurrow = activeB;
    } else {
      activeBurrow = {};
      websites = [];
    }
  }

  async function selectBurrow(burrow) {
    if (!burrow?.id) return;

    await chrome.runtime.sendMessage({
      type: MessageRequest.CHANGE_ACTIVE_BURROW,
      burrowId: burrow.id,
    });

    activeBurrow = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_BURROW,
      burrowId: burrow.id,
    });

    updateWebsites();
  }

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

    await new Promise((resolve) => setTimeout(resolve, 1500));

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
    await new Promise((resolve) => setTimeout(resolve, 1500));

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

  async function updateBurrowHome(event) {
    isUpdatingBurrowHome = true;
    isLoadingWebsites = true;
    await chrome.runtime.sendMessage({
      type: MessageRequest.UPDATE_ACTIVE_TABS,
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    activeBurrow = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ACTIVE_BURROW,
    });
    burrows = await getOrderedBurrows();
    updateWebsites();

    updateBurrowHomeSuccess = true;
    isUpdatingBurrowHome = false;
    isLoadingWebsites = false;

    setTimeout(() => {
      updateBurrowHomeSuccess = false;
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
    if (!activeBurrow?.id) {
      websites = [];
      return;
    }

    const possiblyDuplicatedWebsites = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_BURROW_WEBSITES,
      burrowId: activeBurrow.id,
    });
    websites = possiblyDuplicatedWebsites.filter(
      (value, index, self) =>
        index === self.findIndex((t) => t.url === value.url),
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
      websites,
    };

    const blob = new Blob([JSON.stringify(exportData)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date();
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
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
    } else if (importData && typeof importData === "object") {
      // TODO: supporting legacy data imports for now, deprecate in a few version
      burrowsToImport = importData.burrows ?? importData.projects ?? [];
      websitesToImport = importData.websites ?? importData.savedWebsites ?? [];
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

  function handleToggleSidebar() {
    opened = !opened;
  }

  function handleRabbitholesClick() {
    goHome();
  }

  function handleBurrowsClick() {
    goToAllBurrows();
  }

  async function handleNavigation() {
    viewingAllBurrows = false;
    await refreshHomeState();
    if (activeBurrow?.id) {
      updateWebsites();
    }
  }
</script>

<SvelteUIProvider>
  <Navbar
    onRabbitholesClick={handleRabbitholesClick}
    onBurrowsClick={handleBurrowsClick}
    on:navigate={handleNavigation}
  />

  <AppShell class={!opened ? "sidebar-closed-shell" : ""}>
    <div class="main-content" class:sidebar-closed={!opened}>
      <div class="timeline-wrapper">
        {#if isLoadingHome}
          <div class="home-loading">
            <Loader size="lg" variant="dots" />
            <Text size="md" color="dimmed" style="margin-top: 1rem;">
              Loading...
            </Text>
          </div>
        {:else}
          <div class="home-header" on:click={goHome} role="button" tabindex="0">
            <div class="logo-container">
              <img
                class="logo"
                alt="Rabbithole logo"
                src="../assets/icons/logo.png"
              />
            </div>

            {#if !activeBurrow?.id}
              <h1 class="home-title">{pageTitle}</h1>
            {/if}
          </div>

          {#if activeBurrow?.id}
            <Timeline
              on:websiteDelete={deleteWebsite}
              on:burrowRename={renameActiveBurrow}
              {activeBurrow}
              {websites}
              {selectRabbithole}
              isLoading={isLoadingWebsites}
            />
          {:else if viewingAllBurrows}
            <div class="timeline-placeholder timeline-placeholder-grid">
              <BurrowGrid
                burrows={burrows}
                selectedBurrowId={activeBurrow?.id}
                onSelect={selectBurrow}
              />
            </div>
          {:else if !activeRabbithole}
            <div class="timeline-placeholder timeline-placeholder-grid">
              <RabbitholeGrid
                {rabbitholes}
                {burrows}
                onSelect={selectRabbithole}
              />
            </div>
          {:else}
            <div class="timeline-placeholder timeline-placeholder-grid">
              <BurrowGrid
                burrows={burrowsInActiveRabbithole}
                selectedBurrowId={activeBurrow?.id}
                onSelect={selectBurrow}
              />
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </AppShell>
</SvelteUIProvider>

<style>
  :global(body) {
    background-color: #f8f9fa;
    margin: 0;
  }

  :global(body.dark-mode) {
    background-color: #141517;
  }

  :global(.mantine-AppShell-main) {
    background-color: #f8f9fa;
    padding: 0 !important;
  }

  :global(body.dark-mode .mantine-AppShell-main) {
    background-color: #141517;
  }

  .main-content {
    display: flex;
    width: 100%;
    min-height: 100vh;
    background-color: #f8f9fa;
    transition: background-color 0.3s ease;
    padding-top: 72px; /* Account for fixed navbar */
  }

  :global(body.dark-mode) .main-content {
    background-color: #141517;
  }

  .timeline-wrapper {
    flex: 1;
    width: 100%;
    padding: 40px 20px;
    max-width: 1100px;
    margin: 0 auto;
  }

  .main-content.sidebar-closed {
    justify-content: center;
  }

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

  .home-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 26px;
    cursor: pointer;
    user-select: none;
  }

  .home-header:hover .home-title {
    text-decoration: underline;
  }

  .logo-container {
    margin-bottom: 12px;
  }

  .logo {
    width: 72px;
    height: auto;
    opacity: 0.95;
  }

  .home-title {
    margin: 0;
    font-size: 2rem;
    font-weight: 800;
    color: #1a1b1e;
    text-align: center;
  }

  :global(body.dark-mode) .home-title {
    color: #e7e7e7;
  }

  .burrow-header {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 0 18px 0;
  }

  .burrow-title {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 900;
    color: #1a1b1e;
    text-align: center;
    line-height: 1.15;
  }

  :global(body.dark-mode) .burrow-title {
    color: #e7e7e7;
  }

  .timeline-placeholder {
    margin-top: 28px;
    min-height: 420px;
    border-radius: 16px;
    border: 2px dashed rgba(0, 0, 0, 0.12);
    background: rgba(0, 0, 0, 0.02);
  }

  .timeline-placeholder-grid {
    padding: 18px;
    border-style: solid;
    border-width: 1px;
    border-color: rgba(0, 0, 0, 0.08);
    background: rgba(255, 255, 255, 0.6);
  }

  :global(body.dark-mode) .timeline-placeholder {
    border-color: rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.03);
  }

  :global(body.dark-mode) .timeline-placeholder-grid {
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(26, 27, 30, 0.6);
  }

  .home-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
  }

  :global(body.dark-mode .mantine-AppShell-root) {
    background-color: #141517;
  }

  :global(body.dark-mode .mantine-AppShell-main) {
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
    background-color: #1a1b1e !important;
    border-right: 1px solid #2c2e33 !important;
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
