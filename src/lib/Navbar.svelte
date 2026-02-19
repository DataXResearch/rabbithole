<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { Button, ActionIcon, Menu, Tooltip } from "@svelteuidev/core";
  import { Agent } from "@atproto/api";
  import {
    MagnifyingGlass,
    Person,
    Sun,
    Moon,
    Gear,
    Exit,
    Download,
    Upload,
    QuestionMarkCircled,
    FileText,
  } from "radix-icons-svelte";
  import SearchEverywhereModal from "src/lib/SearchEverywhereModal.svelte";
  import Modal from "src/lib/Modal.svelte";
  import Auth from "src/lib/Auth.svelte";
  import OnboardingModal from "src/lib/OnboardingModal.svelte";
  import { getSession, clearSession } from "../atproto/client";
  import { MessageRequest, Logger } from "../utils";
  import type { Settings } from "src/utils/types";

  export let onRabbitholesClick = () => {};
  export let onBurrowsClick = () => {};

  const dispatch = createEventDispatcher();

  let showSearchModal: boolean = false;
  let showAuthModal: boolean = false;
  let showOnboardingModal: boolean = false;
  let showHelpTooltip: boolean = false;
  let isMac = navigator.userAgent.includes("Mac");
  let isLoggedIn: boolean = false;
  let userHandle: string = "";
  let userAvatar: string = "";
  let isDark: boolean = false;
  let fileInput: HTMLInputElement;

  let settings: Settings | null = null;

  onMount(async () => {
    settings = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_SETTINGS,
    });
    isDark = settings.darkMode;

    if (!settings.hasSeenOnboarding) {
      showOnboardingModal = true;
    }

    const session = await getSession();
    if (session) {
      isLoggedIn = true;
      userHandle = session.handle || "";
      loadUserProfile(session);
    }

    function handleKeydown(e: KeyboardEvent) {
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

  async function loadUserProfile(session): Promise<void> {
    try {
      const agent = new Agent("https://public.api.bsky.app");
      const response = await agent.getProfile({ actor: session.did });
      if (response.success) {
        userAvatar = response.data.avatar;
        userHandle = response.data.handle;
      }
    } catch (e) {
      Logger.error("Failed to load user profile", e);
    }
  }

  function openSearchModal(): void {
    showSearchModal = true;
  }

  function handleSignIn(): void {
    showAuthModal = true;
  }

  async function toggleTheme(): Promise<void> {
    isDark = !isDark;
    document.body.classList.toggle("dark-mode", isDark);
    chrome.runtime.sendMessage({
      type: MessageRequest.UPDATE_SETTINGS,
      settings: { ...settings, darkMode: isDark },
    });
  }

  async function handleAuthSuccess(): Promise<void> {
    // Refresh login state
    const session = await getSession();
    if (session) {
      isLoggedIn = true;
      userHandle = session.handle || "";
      await loadUserProfile(session);
    }
    showAuthModal = false;
  }

  async function handleSignOut(): Promise<void> {
    await clearSession();
    isLoggedIn = false;
    userHandle = "";
    userAvatar = "";
  }

  async function handleDownloadLogs(): Promise<void> {
    await Logger.downloadLogs();
  }

  async function exportData(): Promise<void> {
    const burrows = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ALL_BURROWS,
    });
    const websites = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ALL_ITEMS,
    });
    const rabbitholes = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ALL_RABBITHOLES,
    });

    const exportData = {
      burrows,
      websites,
      rabbitholes,
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

  async function handleImport(event: CustomEvent<any>): Promise<void> {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e: CustomEvent<any>) => {
      try {
        const data = JSON.parse(e.target.result);

        let burrowsToImport = [];
        let websitesToImport = [];
        let rabbitholesToImport = [];

        if (Array.isArray(data)) {
          burrowsToImport = data;
        } else if (data && typeof data === "object") {
          burrowsToImport = data.burrows ?? data.projects ?? [];
          websitesToImport = data.websites ?? data.savedWebsites ?? [];
          rabbitholesToImport = data.rabbitholes ?? [];
        }

        await chrome.runtime.sendMessage({
          type: "IMPORT_DATA",
          burrows: burrowsToImport,
          websites: websitesToImport,
          rabbitholes: rabbitholesToImport,
        });

        onBurrowsClick();
      } catch (err) {
        Logger.error("Failed to parse import file", err);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function triggerImport(): void {
    fileInput.click();
  }

  function handleSearchSelect(event: CustomEvent<any>): void {
    dispatch("navigate", event.detail);
  }

  async function handleOnboardingClose(): Promise<void> {
    showOnboardingModal = false;
    if (!settings.hasSeenOnboarding) {
      await chrome.runtime.sendMessage({
        type: MessageRequest.UPDATE_SETTINGS,
        settings: { ...settings, hasSeenOnboarding: true },
      });
      showHelpTooltip = true;
      setTimeout(() => {
        showHelpTooltip = false;
      }, 3000);
    }
  }
</script>

<SearchEverywhereModal
  bind:isOpen={showSearchModal}
  on:select={handleSearchSelect}
/>

<Modal
  isOpen={showAuthModal}
  title="Sign in with Internet Handle"
  titleLink="https://internethandle.org/"
  on:close={() => (showAuthModal = false)}
>
  <Auth on:authSuccess={handleAuthSuccess} showWhyBluesky={true} />
</Modal>

<OnboardingModal
  isOpen={showOnboardingModal}
  on:close={handleOnboardingClose}
/>

<input
  type="file"
  accept=".json"
  style="display: none;"
  bind:this={fileInput}
  on:change={handleImport}
/>

<nav class="navbar">
  <div class="navbar-left">
    <div class="logo-container">
      <img class="logo" alt="Rabbithole logo" src="../assets/icons/logo.png" />
    </div>
    <Button
      variant="subtle"
      color="gray"
      size="lg"
      on:click={onRabbitholesClick}
      class="rabbitholes-btn"
    >
      Rabbitholes
    </Button>
    <Button
      variant="subtle"
      color="gray"
      size="lg"
      on:click={onBurrowsClick}
      class="rabbitholes-btn"
    >
      Burrows
    </Button>
  </div>

  <div class="navbar-center">
    <button class="search-button" on:click={openSearchModal}>
      <MagnifyingGlass size={18} />
      <span class="search-text">Search everywhere...</span>
      <span class="search-shortcut">{isMac ? "⌘K" : "Ctrl+K"}</span>
    </button>
  </div>

  <div class="navbar-right">
    <Tooltip
      label={showHelpTooltip ? "Click here to see the tour again" : "Help"}
      opened={showHelpTooltip || undefined}
      withArrow
    >
      <ActionIcon
        color="gray"
        size="xl"
        radius="xl"
        on:click={() => (showOnboardingModal = true)}
      >
        <QuestionMarkCircled size={22} />
      </ActionIcon>
    </Tooltip>

    <ActionIcon
      color="gray"
      size="xl"
      radius="xl"
      on:click={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {#if isDark}
        <Sun size={22} />
      {:else}
        <Moon size={22} />
      {/if}
    </ActionIcon>

    {#if isLoggedIn}
      <Menu placement="end" withArrow>
        <ActionIcon
          slot="control"
          variant="light"
          color="blue"
          size="xl"
          radius="xl"
          title={userHandle}
          style="overflow: hidden; padding: {userAvatar ? '0' : ''};"
        >
          {#if userAvatar}
            <img
              src={userAvatar}
              alt={userHandle}
              style="width: 100%; height: 100%; object-fit: cover;"
            />
          {:else}
            <Person size={22} />
          {/if}
        </ActionIcon>

        <Menu.Item icon={Upload} on:click={triggerImport}>
          Import Data
        </Menu.Item>
        <Menu.Item icon={Download} on:click={exportData}>Export Data</Menu.Item>
        <Menu.Item icon={FileText} on:click={handleDownloadLogs}>
          Download Logs
        </Menu.Item>
        <Menu.Item icon={Exit} color="red" on:click={handleSignOut}>
          Sign Out
        </Menu.Item>
      </Menu>
    {:else}
      <div class="connect-container">
        <Button variant="light" color="blue" size="md" on:click={handleSignIn}>
          Sign in
        </Button>
        <Menu placement="end" withArrow>
          <ActionIcon
            slot="control"
            variant="filled"
            color="gray"
            size="xl"
            radius="xl"
            title="Settings"
          >
            <Gear size={22} />
          </ActionIcon>

          <Menu.Item icon={Upload} on:click={triggerImport}>
            Import Data
          </Menu.Item>
          <Menu.Item icon={Download} on:click={exportData}>
            Export Data
          </Menu.Item>
          <Menu.Item icon={FileText} on:click={handleDownloadLogs}>
            Download Logs
          </Menu.Item>
        </Menu>
      </div>
    {/if}
  </div>
</nav>

<style>
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    background-color: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(10px);
    transition: background-color 0.3s ease;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    z-index: 1000;
    gap: 32px;
    color: #1a1b1e;
  }

  .navbar:hover {
    background-color: rgba(255, 255, 255, 0.95);
  }

  .navbar-left {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-shrink: 0;
  }

  .logo-container {
    display: flex;
    align-items: center;
  }

  .logo {
    width: 48px;
    height: auto;
    opacity: 0.95;
  }

  :global(.rabbitholes-btn) {
    font-weight: 600;
    font-size: 16px;
  }

  .navbar-center {
    flex: 1;
    max-width: 700px;
    display: flex;
    justify-content: center;
  }

  .search-button {
    width: 100%;
    max-width: 600px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background-color: rgba(0, 0, 0, 0.05);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 15px;
    color: #1a1b1e;
  }

  .search-button:hover {
    background-color: rgba(0, 0, 0, 0.08);
    border-color: rgba(0, 0, 0, 0.2);
  }

  .search-text {
    flex: 1;
    text-align: left;
  }

  .search-shortcut {
    font-size: 13px;
    padding: 3px 8px;
    background-color: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(0, 0, 0,  0.1);
    border-radius: 5px;
    color: #1a1b1e;
    font-family: monospace;
  }

  .navbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .connect-container {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  /* Dark mode */
  :global(body.dark-mode) .navbar {
    background-color: rgba(37, 38, 43, 0.4);
    border-bottom-color: rgba(255, 255, 255, 0.1);
    color: white;
  }

  :global(body.dark-mode) .rabbitholes-btn {
    color: white !important;
  }

  :global(body.dark-mode) .navbar .svelteui-ActionIcon {
    color: white !important;
  }

  :global(body.dark-mode) .navbar:hover {
    background-color: rgba(37, 38, 43, 0.95);
  }

  :global(body.dark-mode) .search-button {
    background-color: rgba(37, 38, 43, 0.8);
    border-color: rgba(55, 58, 64, 0.6);
    color: white;
  }

  :global(body.dark-mode) .search-button:hover {
    background-color: rgba(44, 46, 51, 0.9);
    border-color: rgba(73, 80, 87, 0.8);
  }

  :global(body.dark-mode) .search-shortcut {
    background-color: rgba(26, 27, 30, 0.9);
    border-color: rgba(55, 58, 64, 0.6);
    color: white;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .navbar {
      padding: 0 20px;
      gap: 16px;
      height: 64px;
    }

    .navbar-center {
      max-width: 400px;
    }

    .search-text {
      display: none;
    }

    .search-button {
      padding: 12px;
      justify-content: center;
    }

    .logo {
      width: 40px;
    }
  }

  @media (max-width: 480px) {
    .logo {
      width: 36px;
    }

    :global(.rabbitholes-btn) {
      font-size: 15px;
      padding: 10px 14px;
    }

    .navbar-center {
      max-width: 200px;
    }
  }
</style>
