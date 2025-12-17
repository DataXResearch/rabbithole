<script>
  import { onMount } from "svelte";
  import Timeline from "src/lib/Timeline.svelte";
  import Sidebar from "src/lib/Sidebar.svelte";
  import {
    MessageRequest,
    getOrderedProjects,
    NotificationDuration,
  } from "../utils";
  import { SvelteUIProvider, AppShell, Navbar, ActionIcon } from "@svelteuidev/core";
  import { HamburgerMenu } from "radix-icons-svelte";

  let activeProject = {};
  let websites = [];
  let projects = [];
  let isDark = false;
  let opened = true;
  
  // Split state for buttons
  let syncWindowSuccess = false;
  let isSyncingWindow = false;
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
    projects = await getOrderedProjects();
    activeProject = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ACTIVE_PROJECT,
    });
    updateWebsites();
  });

  async function createNewProject(event) {
    activeProject = await chrome.runtime.sendMessage({
      type: MessageRequest.CREATE_NEW_PROJECT,
      newProjectName: event.detail.newProjectName,
    });
    projects = await getOrderedProjects();
    updateWebsites();
  }

  async function createNewProjectFromWindow(event) {
    isCreatingAndSyncing = true;
    isLoadingWebsites = true;
    activeProject = await chrome.runtime.sendMessage({
      type: MessageRequest.SAVE_WINDOW_TO_NEW_PROJECT,
      newProjectName: event.detail.newProjectName,
    });
    projects = await getOrderedProjects();
    // Wait for websites to be stored in the background
    await new Promise(resolve => setTimeout(resolve, 1500));
    updateWebsites();
    
    createAndSyncSuccess = true;
    isCreatingAndSyncing = false;
    isLoadingWebsites = false;
    
    setTimeout(() => {
      createAndSyncSuccess = false;
    }, NotificationDuration);
  }

  async function updateActiveProject(event) {
    const newProjectId = event.detail.newProjectId;
    await chrome.runtime.sendMessage({
      type: MessageRequest.CHANGE_ACTIVE_PROJECT,
      projectId: newProjectId,
    });
    activeProject = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_PROJECT,
      projectId: newProjectId,
    });
    updateWebsites();
  }

  async function saveWindowToActiveProject(event) {
    isSyncingWindow = true;
    isLoadingWebsites = true;
    await chrome.runtime.sendMessage({
      type: MessageRequest.SAVE_WINDOW_TO_ACTIVE_PROJECT,
    });
    await new Promise(resolve => setTimeout(resolve, 1500));
    updateWebsites();
    
    syncWindowSuccess = true;
    isSyncingWindow = false;
    isLoadingWebsites = false;
    
    setTimeout(() => {
      syncWindowSuccess = false;
    }, NotificationDuration);
  }

  async function renameActiveProject(event) {
    activeProject = await chrome.runtime.sendMessage({
      type: MessageRequest.RENAME_PROJECT,
      newName: event.detail.newActiveProjectName,
      projectId: activeProject.id,
    });
    projects = await getOrderedProjects();
  }

  async function deleteActiveProject(event) {
    activeProject = await chrome.runtime.sendMessage({
      type: MessageRequest.DELETE_PROJECT,
      projectId: activeProject.id,
    });
    projects = await getOrderedProjects();
    updateWebsites();
  }

  async function deleteWebsite(event) {
    await chrome.runtime.sendMessage({
      type: MessageRequest.DELETE_WEBSITE,
      projectId: activeProject.id,
      url: event.detail.url,
    });
    updateWebsites();
  }

  async function updateWebsites() {
    const possiblyDuplicatedWebsites = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_PROJECT_SAVED_WEBSITES,
      projectId: activeProject.id,
    });
    websites = possiblyDuplicatedWebsites.filter(
      (value, index, self) =>
        index === self.findIndex((t) => t.url === value.url)
    );
  }

  async function exportRabbitholes(event) {
    const projects = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ALL_PROJECTS,
    });
    const blob = new Blob([JSON.stringify(projects)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "rabbithole.json");
    link.click();
  }

  async function importRabbitholes(event) {
    const projectsToImport = event.detail.projects;
    if (!Array.isArray(projectsToImport)) return;

    await chrome.runtime.sendMessage({
      type: "IMPORT_DATA",
      projects: projectsToImport,
    });

    // Refresh state
    projects = await getOrderedProjects();
    activeProject = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ACTIVE_PROJECT,
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
            {createAndSyncSuccess}
            {isCreatingAndSyncing}
            {projects}
            {opened}
            on:projectDelete={deleteActiveProject}
            on:projectChange={updateActiveProject}
            on:newProject={createNewProject}
            on:newProjectSync={createNewProjectFromWindow}
            on:projectSync={saveWindowToActiveProject}
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
          on:projectRename={renameActiveProject}
          on:toggleTheme={toggleTheme}
          {activeProject}
          {websites}
          {isDark}
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
