<script>
  import { onMount } from "svelte";
  import Timeline from "src/lib/Timeline.svelte";
  import Sidebar from "src/lib/Sidebar.svelte";
  import {
    MessageRequest,
    getOrderedProjects,
    NotificationDuration,
  } from "../utils";
  import { SvelteUIProvider, AppShell, Navbar } from "@svelteuidev/core";

  let activeProject = {};
  let websites = [];
  let projects = [];
  let isDark = false;
  let opened = true;
  let syncSuccess = false;
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
    activeProject = await chrome.runtime.sendMessage({
      type: MessageRequest.SAVE_WINDOW_TO_NEW_PROJECT,
      newProjectName: event.detail.newProjectName,
    });
    projects = await getOrderedProjects();
    updateWebsites();
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
    await chrome.runtime.sendMessage({
      type: MessageRequest.SAVE_WINDOW_TO_ACTIVE_PROJECT,
    });
    setTimeout(() => {
      updateWebsites();
      syncSuccess = true;
      setTimeout(() => {
        syncSuccess = false;
      }, NotificationDuration);
    }, 300);
    setTimeout(() => {
      updateWebsites();
    }, 1000);
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
  <AppShell>
    {#if opened}
      <Navbar
        fixed
        width={{
          sm: 300,
          lg: 400,
          base: 100,
        }}
        height={"100%"}
        override={{
          borderRight: "1px solid rgb(233, 236, 239)",
          overflowY: "auto",
        }}
      >
        <Sidebar
          {syncSuccess}
          {projects}
          {opened}
          on:projectDelete={deleteActiveProject}
          on:projectChange={updateActiveProject}
          on:newProject={createNewProject}
          on:newProjectSync={createNewProjectFromWindow}
          on:projectSync={saveWindowToActiveProject}
          on:exportRabbitholes={exportRabbitholes}
          on:toggleSidebar={handleToggleSidebar}
        />
      </Navbar>
    {:else}
      <div class="hamburger-only">
        <Sidebar
          {syncSuccess}
          {projects}
          {opened}
          on:projectDelete={deleteActiveProject}
          on:projectChange={updateActiveProject}
          on:newProject={createNewProject}
          on:newProjectSync={createNewProjectFromWindow}
          on:projectSync={saveWindowToActiveProject}
          on:exportRabbitholes={exportRabbitholes}
          on:toggleSidebar={handleToggleSidebar}
        />
      </div>
    {/if}
    <div class="main-content" class:sidebar-closed={!opened}>
      <Timeline
        on:websiteDelete={deleteWebsite}
        on:projectRename={renameActiveProject}
        on:toggleTheme={toggleTheme}
        {activeProject}
        {websites}
        {isDark}
      />
    </div>
  </AppShell>
</SvelteUIProvider>

<style>
  .main-content {
    width: 100%;
  }

  .main-content.sidebar-closed {
    display: flex;
    justify-content: center;
  }

  .hamburger-only {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 100;
    background: transparent;
  }

  :global(.hamburger-only .sidebar-wrapper) {
    background: transparent !important;
  }

  :global(body.dark-mode) {
    background-color: #1a1a1a;
    color: white;
  }

  :global(body.dark-mode .mantine-AppShell-root) {
    background-color: #1a1a1a;
  }

  :global(body.dark-mode .mantine-AppShell-main) {
    background-color: #1a1a1a;
    color: white;
  }

  :global(body.dark-mode .mantine-Text-root) {
    color: white;
  }

  :global(body.dark-mode .mantine-TextInput-input) {
    background-color: #2c2c2c;
    color: #ffffff;
    border-color: #444;
  }

  :global(body.dark-mode .mantine-Input-input) {
    background-color: #2c2c2c;
    color: #ffffff;
  }

  :global(body.dark-mode .mantine-Navbar-root) {
    background-color: #d3d3d3 !important;
    border-right: 1px solid #bbb !important;
  }

  :global(body.dark-mode .mantine-Navbar-root[aria-hidden="true"]) {
    background-color: transparent !important;
  }

  :global(body.dark-mode .mantine-Navbar-root[aria-hidden="false"]) {
    border-right: 1px solid #bbb !important;
  }

  :global(body.dark-mode .mantine-Navbar-root *) {
    color: #1a1a1a;
  }

  :global(body.dark-mode .mantine-Divider-root) {
    border-color: #444;
  }

  :global(body.dark-mode #project-name) {
    color: white !important;
  }

  :global(body.dark-mode .active-rabbithole) {
    color: white !important;
    font-weight: bold;
  }
</style>
