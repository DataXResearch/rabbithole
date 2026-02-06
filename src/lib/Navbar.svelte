<script>
  import { onMount, createEventDispatcher } from "svelte";
  import { Button, ActionIcon, Menu } from "@svelteuidev/core";
  import { Agent } from "@atproto/api";
  import {
    MagnifyingGlass,
    InfoCircled,
    Person,
    Sun,
    Moon,
    Gear,
    Exit,
    Download,
    Upload,
  } from "radix-icons-svelte";
  import SearchEverywhereModal from "src/lib/SearchEverywhereModal.svelte";
  import Modal from "src/lib/Modal.svelte";
  import Auth from "src/lib/Auth.svelte";
  import { getSession, clearSession } from "../atproto/client";
  import { MessageRequest } from "../utils";

  export let onRabbitholesClick = () => {};

  const dispatch = createEventDispatcher();

  let showSearchModal = false;
  let showAuthModal = false;
  let showInfoModal = false;
  let isMac = false;
  let isLoggedIn = false;
  let userHandle = "";
  let userAvatar = "";
  let isDark = false;
  let fileInput;

  let settings = {
    show: false,
    alignment: "right",
    darkMode: false,
  };

  onMount(async () => {
    isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

    // Get settings for dark mode
    settings = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_SETTINGS,
    });
    isDark = settings.darkMode;

    // Check if user is logged in
    const session = await getSession();
    if (session) {
      isLoggedIn = true;
      userHandle = session.handle || "";
      loadUserProfile(session);
    }

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

  async function loadUserProfile(session) {
    try {
      const agent = new Agent("https://public.api.bsky.app");
      const response = await agent.getProfile({ actor: session.did });
      if (response.success) {
        userAvatar = response.data.avatar;
        userHandle = response.data.handle;
      }
    } catch (e) {
      console.error("Failed to load user profile", e);
    }
  }

  function openSearchModal() {
    showSearchModal = true;
  }

  function handleSignIn() {
    showAuthModal = true;
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

  async function handleAuthSuccess() {
    // Refresh login state
    const session = await getSession();
    if (session) {
      isLoggedIn = true;
      userHandle = session.handle || "";
      await loadUserProfile(session);
    }
    showAuthModal = false;
  }

  async function handleSignOut() {
    await clearSession();
    isLoggedIn = false;
    userHandle = "";
    userAvatar = "";
  }

  async function exportData() {
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

  async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);

        let burrowsToImport = [];
        let websitesToImport = [];

        if (Array.isArray(data)) {
          burrowsToImport = data;
        } else if (data && typeof data === "object") {
          burrowsToImport = data.burrows ?? data.projects ?? [];
          websitesToImport = data.websites ?? data.savedWebsites ?? [];
        }

        await chrome.runtime.sendMessage({
          type: "IMPORT_DATA",
          burrows: burrowsToImport,
          websites: websitesToImport,
        });
      } catch (err) {
        console.error("Failed to parse import file", err);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function triggerImport() {
    fileInput.click();
  }

  function handleSearchSelect(event) {
    dispatch("navigate", event.detail);
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
  </div>

  <div class="navbar-center">
    <button class="search-button" on:click={openSearchModal}>
      <MagnifyingGlass size={18} />
      <span class="search-text">Search everywhere...</span>
      <span class="search-shortcut">{isMac ? "⌘K" : "Ctrl+K"}</span>
    </button>
  </div>

  <div class="navbar-right">
    <ActionIcon
      variant="subtle"
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
      <Menu placement="bottom-end" withArrow>
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
    background: transparent;
    z-index: 1000;
    gap: 32px;
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
    background-color: rgba(248, 249, 250, 0.8);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(222, 226, 230, 0.6);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 15px;
    color: #868e96;
  }

  .search-button:hover {
    background-color: rgba(233, 236, 239, 0.9);
    border-color: rgba(206, 212, 218, 0.8);
  }

  .search-text {
    flex: 1;
    text-align: left;
  }

  .search-shortcut {
    font-size: 13px;
    padding: 3px 8px;
    background-color: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(222, 226, 230, 0.6);
    border-radius: 5px;
    color: #495057;
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

  .semble-link {
    color: #228be6;
    text-decoration: none;
    font-weight: 600;
    padding: 8px 16px;
    border-radius: 4px;
    background-color: rgba(34, 139, 230, 0.1);
    transition: background-color 0.2s;
  }

  .semble-link:hover {
    background-color: rgba(34, 139, 230, 0.2);
  }

  /* Dark mode */
  :global(body.dark-mode) .search-button {
    background-color: rgba(37, 38, 43, 0.8);
    border-color: rgba(55, 58, 64, 0.6);
    color: #909296;
  }

  :global(body.dark-mode) .search-button:hover {
    background-color: rgba(44, 46, 51, 0.9);
    border-color: rgba(73, 80, 87, 0.8);
  }

  :global(body.dark-mode) .search-shortcut {
    background-color: rgba(26, 27, 30, 0.9);
    border-color: rgba(55, 58, 64, 0.6);
    color: #c1c2c5;
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
