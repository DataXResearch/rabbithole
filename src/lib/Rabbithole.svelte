<script>
  import { onMount } from "svelte";
  import Timeline from "src/lib/Timeline.svelte";
  import Sidebar from "src/lib/Sidebar.svelte";
  import {
    MessageRequest,
    getOrderedProjects,
    NotificationDuration,
  } from "../utils";
  import {
    SvelteUIProvider,
    fns,
    AppShell,
    Navbar,
    Title,
    Divider,
  } from "@svelteuidev/core";

  let activeProject = {};
  let websites = [];
  let projects = [];
  let isDark = false;
  let opened = false;

  // status for updatingComponents
  // TODO: better; is dispatching from parent to child an antipattern?
  // how can `Sidebar` be cut out as a middleman? should it?
  let syncSuccess = false;
  let syncFail = false;

  onMount(async () => {
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
    // FIXME: this is a direct consequence of the background script's `storeWebsites`
    // function being a weird hybrid of sync and async. This makes the UI behave
    // somewhat correctly but is quite an ugly temp solution
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
    // FIXME: when rabbithole is installed, the first time a session is saved
    // the website list is duplicated, so dedup here for now
    const possiblyDuplicatedWebsites = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_PROJECT_SAVED_WEBSITES,
      projectId: activeProject.id,
    });
    websites = possiblyDuplicatedWebsites.filter(
      (value, index, self) =>
        index === self.findIndex((t) => t.url === value.url),
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

  function toggleTheme() {
    isDark = !isDark;
    document.body.classList.toggle("dark-mode", isDark);
  }

  function toggleOpened() {
    opened = !opened;
  }
</script>

<SvelteUIProvider>
  <AppShell>
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
        overflowY: "scroll",
      }}
      hidden={!opened}
    >
      <Sidebar
        {syncSuccess}
        {projects}
        on:projectDelete={deleteActiveProject}
        on:projectChange={updateActiveProject}
        on:newProject={createNewProject}
        on:newProjectSync={createNewProjectFromWindow}
        on:projectSync={saveWindowToActiveProject}
        on:exportRabbitholes={exportRabbitholes}
      />
    </Navbar>
    <Timeline
      on:websiteDelete={deleteWebsite}
      on:projectRename={renameActiveProject}
      on:toggleTheme={toggleTheme}
      {activeProject}
      {websites}
      {isDark}
    />
  </AppShell>
</SvelteUIProvider>

<style>
  :global(body.dark-mode) {
    background-color: #1a1a1a;
    color: #ffffff;
  }

  :global(body.dark-mode .timeline) {
    background-color: #1a1a1a;
    color: #ffffff;
  }

  :global(body.dark-mode .mantine-AppShell-root) {
    background-color: #1a1a1a;
  }

  :global(body.dark-mode .mantine-AppShell-main) {
    background-color: #1a1a1a;
    color: #ffffff;
  }

  :global(body.dark-mode .mantine-Card-root) {
    background-color: #2c2c2c;
    color: #ffffff;
  }

  :global(body.dark-mode .mantine-Text-root) {
    color: #ffffff;
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
    background-color: #2c2c2c;
    border-right: 1px solid #444 !important;
  }

  :global(body.dark-mode .mantine-Button-root) {
    background-color: #2c2c2c;
    color: #ffffff;
  }

  :global(body.dark-mode .mantine-Divider-root) {
    border-color: #444;
  }
</style>
