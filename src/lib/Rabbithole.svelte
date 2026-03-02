<script lang="ts">
  import { onMount, tick } from "svelte";
  import Timeline from "src/lib/Timeline.svelte";
  import Navbar from "src/lib/Navbar.svelte";
  import RabbitholeGrid from "src/lib/RabbitholeGrid.svelte";
  import { MessageRequest } from "../utils";
  import {
    SvelteUIProvider,
    Loader,
    Text,
    Tooltip,
    AppShell,
  } from "@svelteuidev/core";
  import type { Burrow, Rabbithole, Settings, Website } from "src/utils/types";

  let activeBurrow: Burrow | null = null;
  let websites: Website[] = [];
  let burrowsInActiveRabbithole: Burrow[] = [];
  let rabbitholes: Rabbithole[] = [];
  let activeRabbithole: Rabbithole | null = null;

  let isDark: boolean = true;
  let opened: boolean = true;

  let isLoadingWebsites: boolean = false;
  let isLoadingHome: boolean = true;

  let autoFocusTimelineTitle: boolean = false;

  let settings: Settings | null = null;

  // Apply theme immediately from localStorage to prevent flash
  const cachedDarkMode = localStorage.getItem("rabbithole-dark-mode");
  if (cachedDarkMode !== null) {
    isDark = cachedDarkMode === "true";
    document.body.classList.toggle("dark-mode", isDark);
  }

  onMount(async () => {
    settings = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_SETTINGS,
    });

    const actualDarkMode = settings?.darkMode ?? false;
    if (actualDarkMode !== isDark) {
      isDark = actualDarkMode;
      document.body.classList.toggle("dark-mode", isDark);
      localStorage.setItem("rabbithole-dark-mode", String(isDark));
    }

    await refreshHomeState();
    if (activeRabbithole) {
      updateWebsites();
    }
    isLoadingHome = false;
  });

  async function toggleTheme(): Promise<void> {
    isDark = !isDark;
    document.body.classList.toggle("dark-mode", isDark);

    localStorage.setItem("rabbithole-dark-mode", String(isDark));

    await chrome.runtime.sendMessage({
      type: MessageRequest.UPDATE_SETTINGS,
      settings: { ...settings, darkMode: isDark },
    });
  }

  async function refreshHomeState(): Promise<void> {
    [activeRabbithole, rabbitholes, activeBurrow] = await Promise.all([
      chrome.runtime.sendMessage({
        type: MessageRequest.GET_ACTIVE_RABBITHOLE,
      }),
      chrome.runtime.sendMessage({
        type: MessageRequest.GET_ALL_RABBITHOLES,
      }),
      chrome.runtime.sendMessage({
        type: MessageRequest.GET_ACTIVE_BURROW,
      }),
    ]);
    burrowsInActiveRabbithole = await Promise.all(
      activeRabbithole?.burrows.map((burrowId) =>
        chrome.runtime.sendMessage({
          type: MessageRequest.GET_BURROW,
          burrowId,
        }),
      ) ?? [],
    );
    // FIXME: clean up at db
    burrowsInActiveRabbithole = burrowsInActiveRabbithole.filter(Boolean);
    updateWebsites();
  }

  async function updateWebsites(): Promise<void> {
    isLoadingWebsites = true;
    try {
      if (activeBurrow?.id) {
        websites = await chrome.runtime.sendMessage({
          type: MessageRequest.GET_BURROW_WEBSITES,
          burrowId: activeBurrow.id,
        });
      } else if (activeRabbithole?.id) {
        websites = await chrome.runtime.sendMessage({
          type: MessageRequest.GET_RABBITHOLE_WEBSITES,
          rabbitholeId: activeRabbithole.id,
        });
      } else {
        websites = [];
      }
    } finally {
      isLoadingWebsites = false;
    }
  }

  async function goHome(): Promise<void> {
    await chrome.runtime.sendMessage({
      type: MessageRequest.CHANGE_ACTIVE_RABBITHOLE,
      rabbitholeId: null,
    });
    await chrome.runtime.sendMessage({
      type: MessageRequest.CHANGE_ACTIVE_BURROW,
      burrowId: null,
    });
    await refreshHomeState();
  }

  async function selectRabbithole(rabbithole: Rabbithole): Promise<void> {
    isLoadingWebsites = true;
    await chrome.runtime.sendMessage({
      type: MessageRequest.CHANGE_ACTIVE_RABBITHOLE,
      rabbitholeId: rabbithole.id,
    });

    // reset active burrow when switching rabbitholes
    if (activeBurrow) {
      await chrome.runtime.sendMessage({
        type: MessageRequest.CHANGE_ACTIVE_BURROW,
        burrowId: null,
      });
      activeBurrow = null;
    }

    await refreshHomeState();
  }

  async function selectBurrow(burrowId: string): Promise<void> {
    isLoadingWebsites = true;
    await chrome.runtime.sendMessage({
      type: MessageRequest.CHANGE_ACTIVE_BURROW,
      burrowId,
    });

    await refreshHomeState();
  }

  async function handleCreateBurrow(): Promise<void> {
    if (!activeRabbithole) {
      return;
    }

    let baseName = "New Burrow";
    let newName = baseName;
    let counter = 1;
    while (burrowsInActiveRabbithole.some((b) => b.name === newName)) {
      counter++;
      newName = `${baseName} ${counter}`;
    }

    await chrome.runtime.sendMessage({
      type: MessageRequest.CREATE_NEW_BURROW_IN_RABBITHOLE,
      burrowName: newName,
    });

    await refreshHomeState();
    autoFocusTimelineTitle = true;
  }

  async function handleCreateRabbithole(): Promise<void> {
    let baseName = "New Rabbithole";
    let newName = baseName;
    let counter = 1;
    while (rabbitholes.some((b) => b.title === newName)) {
      counter++;
      newName = `${baseName} ${counter}`;
    }

    await chrome.runtime.sendMessage({
      type: MessageRequest.CREATE_NEW_RABBITHOLE,
      title: newName,
    });

    await refreshHomeState();

    // Focus the input after render
    await tick();
    const input = document.querySelector<HTMLInputElement>(
      ".rabbithole-title-input",
    );
    if (input) {
      input.focus();
      input.select();
    }
  }

  async function deleteRabbithole(rabbitholeId: string): Promise<void> {
    // FIXME: use modal
    if (confirm("Are you sure you want to delete this rabbithole?")) {
      await chrome.runtime.sendMessage({
        type: MessageRequest.DELETE_RABBITHOLE,
        rabbitholeId,
      });
      await refreshHomeState();
    }
  }

  async function deleteBurrow(burrowId: string): Promise<void> {
    // FIXME: use modal
    if (confirm("Are you sure you want to delete this burrow?")) {
      await chrome.runtime.sendMessage({
        type: MessageRequest.DELETE_BURROW,
        burrowId,
        rabbitholeId: activeRabbithole.id,
      });
      await refreshHomeState();
    }
  }

  async function renameContainer(event: CustomEvent): Promise<void> {
    const { type, id, name } = event.detail;

    if (type === "burrow") {
      await chrome.runtime.sendMessage({
        type: MessageRequest.RENAME_BURROW,
        newName: name,
        burrowId: id,
      });
    } else if (type === "rabbithole") {
      await chrome.runtime.sendMessage({
        type: MessageRequest.UPDATE_RABBITHOLE,
        rabbitholeId: id,
        title: name,
      });
    }

    await refreshHomeState();
  }

  async function deleteWebsite(event: CustomEvent): Promise<void> {
    if (activeBurrow) {
      await chrome.runtime.sendMessage({
        type: MessageRequest.DELETE_WEBSITE,
        burrowId: activeBurrow.id,
        url: event.detail.url,
      });
    } else if (activeRabbithole) {
      await chrome.runtime.sendMessage({
        type: MessageRequest.DELETE_WEBSITE_FROM_RABBITHOLE_META,
        rabbitholeId: activeRabbithole.id,
        url: event.detail.url,
      });
    }
    updateWebsites();
  }

  async function handleDelete(): Promise<void> {
    if (activeBurrow) {
      await deleteBurrow(activeBurrow.id);
    } else if (activeRabbithole) {
      await deleteRabbithole(activeRabbithole.id);
    }
    await refreshHomeState();
  }

  async function handleNavigation(): Promise<void> {
    await refreshHomeState();
  }
</script>

<SvelteUIProvider>
  <Navbar
    onRabbitholesClick={goHome}
    {isDark}
    on:toggleTheme={toggleTheme}
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
          <div class="home-header" role="button" tabindex="0">
            {#if !activeRabbithole}
              <h1 class="home-title">{"Rabbitholes"}</h1>
            {/if}
          </div>

          {#if activeRabbithole}
            <Timeline
              {activeBurrow}
              {activeRabbithole}
              {websites}
              {selectBurrow}
              {burrowsInActiveRabbithole}
              isLoading={isLoadingWebsites}
              autoFocusTitle={autoFocusTimelineTitle}
              on:websiteDelete={deleteWebsite}
              on:containerRename={renameContainer}
              on:deleteContainer={handleDelete}
              on:createBurrow={handleCreateBurrow}
              on:refresh={updateWebsites}
              on:navigateUp={handleNavigation}
            />
          {:else}
            <div class="timeline-placeholder timeline-placeholder-grid">
              <RabbitholeGrid
                {rabbitholes}
                onSelect={selectRabbithole}
                allowCreate={true}
                on:createRabbithole={handleCreateRabbithole}
                showDelete={true}
                on:deleteRabbithole={(event) =>
                  deleteRabbithole(event.detail.rabbitholeId)}
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
