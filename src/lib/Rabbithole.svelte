<script lang="ts">
  import { onMount, tick } from "svelte";
  import Timeline from "src/lib/Timeline.svelte";
  import Navbar from "src/lib/Navbar.svelte";
  import RabbitholeGrid from "src/lib/RabbitholeGrid.svelte";
  import BurrowGrid from "src/lib/BurrowGrid.svelte";
  import { MessageRequest, getOrderedBurrows } from "../utils";
  import {
    SvelteUIProvider,
    Loader,
    Text,
    Tooltip,
    AppShell,
  } from "@svelteuidev/core";
  import type { Burrow, Rabbithole, Settings, Website } from "src/storage/db";

  let activeBurrow: Burrow | null = null;
  let websites: Website[] = [];
  let burrows: Burrow[] = [];
  let rabbitholes: Rabbithole[] = [];
  let activeRabbithole: Rabbithole | null = null;
  let viewingAllBurrows: boolean = false;

  let isDark: boolean = true;
  let opened: boolean = true;

  let isLoadingWebsites: boolean = false;
  let isLoadingHome: boolean = true;

  let autoFocusTimelineTitle: boolean = false;

  let settings: Settings | null = null;

  onMount(async () => {
    settings = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_SETTINGS,
    });
    isDark = settings?.darkMode ?? false;
    document.body.classList.toggle("dark-mode", isDark);

    await refreshHomeState();
    isLoadingHome = false;

    if (activeBurrow?.id) {
      updateWebsites();
    }
  });

  async function refreshHomeState(): Promise<void> {
    try {
      [activeRabbithole, rabbitholes, burrows, activeBurrow] =
        await Promise.all([
          chrome.runtime.sendMessage({
            type: MessageRequest.GET_ACTIVE_RABBITHOLE,
          }),
          chrome.runtime.sendMessage({
            type: MessageRequest.GET_ALL_RABBITHOLES,
          }),
          chrome.runtime.sendMessage({ type: MessageRequest.GET_ALL_BURROWS }),
          chrome.runtime.sendMessage({
            type: MessageRequest.GET_ACTIVE_BURROW,
          }),
        ]);
    } catch (e) {
      const [allRh, allBurrows] = await Promise.all([
        chrome.runtime.sendMessage({
          type: MessageRequest.GET_ALL_RABBITHOLES,
        }),
        chrome.runtime.sendMessage({ type: MessageRequest.GET_ALL_BURROWS }),
      ]);

      activeRabbithole = null;
      activeBurrow = null;
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
    if (viewingAllBurrows) return "Burrows";
    if (activeRabbithole?.title) return activeRabbithole.title;
    return "Rabbitholes";
  })();

  async function goHome(): Promise<void> {
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
    activeBurrow = null;
    websites = [];
    viewingAllBurrows = false;
  }

  async function goToAllBurrows(): Promise<void> {
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
    activeBurrow = null;
    websites = [];
    viewingAllBurrows = true;
  }

  async function selectRabbithole(rabbithole: Rabbithole): Promise<void> {
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
      activeBurrow = null;
      websites = [];
    }
  }

  async function selectBurrow(burrow: Burrow): Promise<void> {
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

  async function handleCreateBurrow(): Promise<void> {
    let baseName = "New Burrow";
    let newName = baseName;
    let counter = 1;

    const listToCheck = viewingAllBurrows ? burrows : burrowsInActiveRabbithole;
    while (listToCheck.some((b) => b.name === newName)) {
      counter++;
      newName = `${baseName} ${counter}`;
    }

    if (!viewingAllBurrows && activeRabbithole) {
      activeBurrow = await chrome.runtime.sendMessage({
        type: MessageRequest.CREATE_NEW_BURROW_IN_RABBITHOLE,
        burrowName: newName,
      });
      activeRabbithole = await chrome.runtime.sendMessage({
        type: MessageRequest.GET_ACTIVE_RABBITHOLE,
      });
    } else {
      activeBurrow = await chrome.runtime.sendMessage({
        type: MessageRequest.CREATE_NEW_BURROW,
        newBurrowName: newName,
      });
    }
    burrows = await getOrderedBurrows();
    updateWebsites();
    autoFocusTimelineTitle = true;
  }

  async function handleCreateRabbithole(): Promise<void> {
    const newRabbithole = await chrome.runtime.sendMessage({
      type: MessageRequest.CREATE_NEW_RABBITHOLE,
      title: "New Rabbithole",
    });

    await selectRabbithole(newRabbithole);
    await refreshHomeState();

    // Focus the input after render
    await tick();
    const input = document.querySelector(".rabbithole-title-input");
    if (input) {
      input.focus();
      input.select();
    }
  }

  let rabbitholeNameError: string | null = null;

  async function renameActiveRabbithole(): Promise<void> {
    if (!activeRabbithole?.id) {
      return;
    }

    const title = activeRabbithole.title.trim();
    if (title === "") {
      rabbitholeNameError = "Rabbithole name cannot be empty";
      return;
    }

    if (
      rabbitholes.some((r) => r.id !== activeRabbithole.id && r.title === title)
    ) {
      rabbitholeNameError = "Rabbithole name must be unique";
      return;
    }

    rabbitholeNameError = null;

    await chrome.runtime.sendMessage({
      type: MessageRequest.UPDATE_RABBITHOLE,
      rabbitholeId: activeRabbithole.id,
      title: title,
    });

    rabbitholes = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ALL_RABBITHOLES,
    });
  }

  async function deleteRabbithole(event): Promise<void> {
    const { rabbitholeId } = event.detail;
    if (confirm("Are you sure you want to delete this rabbithole?")) {
      await chrome.runtime.sendMessage({
        type: MessageRequest.DELETE_RABBITHOLE,
        rabbitholeId,
      });
      await refreshHomeState();
    }
  }

  async function handleDeleteBurrowFromGrid(event): Promise<void> {
    const { burrowId } = event.detail;
    if (confirm("Are you sure you want to delete this burrow?")) {
      await chrome.runtime.sendMessage({
        type: MessageRequest.DELETE_BURROW,
        burrowId,
      });

      if (activeBurrow?.id === burrowId) {
        await chrome.runtime.sendMessage({
          type: MessageRequest.CHANGE_ACTIVE_BURROW,
          burrowId: null,
        });
      }

      await refreshHomeState();
      activeBurrow = null;
      websites = [];
    }
  }

  async function renameActiveBurrow(event): Promise<void> {
    activeBurrow = await chrome.runtime.sendMessage({
      type: MessageRequest.RENAME_BURROW,
      newName: event.detail.newActiveBurrowName,
      burrowId: activeBurrow.id,
    });
    burrows = await getOrderedBurrows();
  }

  async function deleteWebsite(event): Promise<void> {
    await chrome.runtime.sendMessage({
      type: MessageRequest.DELETE_WEBSITE,
      burrowId: activeBurrow.id,
      url: event.detail.url,
    });
    updateWebsites();
  }

  async function handleBurrowDeleted(): Promise<void> {
    websites = [];
    await refreshHomeState();
    activeBurrow = null;
  }

  async function updateWebsites(): Promise<void> {
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

  async function handleNavigation(): Promise<void> {
    viewingAllBurrows = false;
    await refreshHomeState();
    if (activeBurrow?.id) {
      updateWebsites();
    }
  }
</script>

<SvelteUIProvider>
  <Navbar
    onRabbitholesClick={goHome}
    onBurrowsClick={goToAllBurrows}
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
            {#if !activeBurrow?.id}
              {#if activeRabbithole && !viewingAllBurrows}
                <Tooltip
                  label={rabbitholeNameError || "Click to rename rabbithole"}
                  withArrow
                  color={rabbitholeNameError ? "red" : "gray"}
                  opened={!!rabbitholeNameError || undefined}
                >
                  <input
                    id="rabbithole-name"
                    class="project-name-input rabbithole-title-input"
                    class:input-error={!!rabbitholeNameError}
                    bind:value={activeRabbithole.title}
                    on:blur={renameActiveRabbithole}
                    on:input={() => (rabbitholeNameError = null)}
                    on:keydown={(e) => e.key === "Enter" && e.target.blur()}
                  />
                </Tooltip>
              {:else}
                <h1 class="home-title">{pageTitle}</h1>
              {/if}
            {/if}
          </div>

          {#if activeBurrow?.id}
            <Timeline
              on:websiteDelete={deleteWebsite}
              on:burrowRename={renameActiveBurrow}
              on:burrowDeleted={handleBurrowDeleted}
              {activeBurrow}
              {websites}
              {selectRabbithole}
              isLoading={isLoadingWebsites}
              autoFocusTitle={autoFocusTimelineTitle}
              {burrowsInActiveRabbithole}
            />
          {:else if viewingAllBurrows}
            <div class="timeline-placeholder timeline-placeholder-grid">
              <BurrowGrid
                {burrows}
                selectedBurrowId={activeBurrow?.id}
                onSelect={selectBurrow}
                allowCreate={true}
                on:createBurrow={handleCreateBurrow}
                showDelete={true}
                on:deleteBurrow={handleDeleteBurrowFromGrid}
              />
            </div>
          {:else if !activeRabbithole}
            <div class="timeline-placeholder timeline-placeholder-grid">
              <RabbitholeGrid
                {rabbitholes}
                {burrows}
                onSelect={selectRabbithole}
                allowCreate={true}
                on:createRabbithole={handleCreateRabbithole}
                showDelete={true}
                on:deleteRabbithole={deleteRabbithole}
              />
            </div>
          {:else}
            <div class="timeline-placeholder timeline-placeholder-grid">
              <BurrowGrid
                burrows={burrowsInActiveRabbithole}
                selectedBurrowId={activeBurrow?.id}
                onSelect={selectBurrow}
                allowCreate={true}
                on:createBurrow={handleCreateBurrow}
                showDelete={true}
                on:deleteBurrow={handleDeleteBurrowFromGrid}
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

  .rabbithole-title-input {
    text-align: center;
    font-weight: 800;
    font-size: 2rem;
    color: #1a1b1e;
    background: transparent;
    border: none;
    width: 100%;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: inherit;
    transition: background-color 0.2s ease;
  }

  .rabbithole-title-input:hover,
  .rabbithole-title-input:focus {
    background-color: rgba(0, 0, 0, 0.05);
    outline: none;
  }

  :global(body.dark-mode) .rabbithole-title-input {
    color: #e7e7e7;
  }

  :global(body.dark-mode) .rabbithole-title-input:hover,
  :global(body.dark-mode) .rabbithole-title-input:focus {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .input-error {
    border: 1px solid #fa5252 !important;
    background-color: rgba(250, 82, 82, 0.1) !important;
  }
</style>
