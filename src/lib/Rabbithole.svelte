<script>
  import { onMount } from "svelte";
  import Timeline from "src/lib/Timeline.svelte"
  import Sidebar from "src/lib/Sidebar.svelte"
  import { MessageRequest } from "../utils"
  import { SvelteUIProvider, fns, AppShell, Aside, Navbar, Header, Title, Divider } from "@svelteuidev/core";

  let activeProject = {};
  let websites = [];
  let isDark = true;
  let opened = false;

  onMount(async () => {
    activeProject = await chrome.runtime.sendMessage({ type: MessageRequest.GET_ACTIVE_PROJECT })
    updateWebsites();
  });

  async function createNewProject(event) {
    await chrome.runtime.sendMessage({
      type: MessageRequest.CREATE_NEW_PROJECT,
      newProjectName: event.detail.newProjectName,
    });
    updateWebsites();
  }

  async function createNewProjectFromWindow(event) {
    await chrome.runtime.sendMessage({
      type: MessageRequest.SAVE_WINDOW_TO_NEW_PROJECT,
      newProjectName: event.detail.newProjectName,
    });
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
    updateWebsites();
  }

  async function renameActiveProject(event) {
    activeProject = await chrome.runtime.sendMessage({
      type: MessageRequest.RENAME_PROJECT,
      newName: event.detail.newActiveProjectName,
      projectId: activeProject.id
    });
  }

  async function updateWebsites() {
    // FIXME: when rabbithole is installed, the first time a session is saved
    // the website list is duplicated, so dedup here for now
    const possiblyDuplicatedWebsites = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_PROJECT_SAVED_WEBSITES,
      projectId: activeProject.id,
    });
    websites = possiblyDuplicatedWebsites.filter((value, index, self) =>
      index === self.findIndex((t) => (
        t.url === value.url
      ))
    );
  }

  function toggleTheme() {
    isDark = !isDark;
  }
  function toggleOpened() {
    opened = !opened;
  }
</script>

<SvelteUIProvider>
  <AppShell>
    <Navbar
      width={{
      sm: 300,
      lg: 400,
      base: 100
      }}
      hidden={!opened}>
      <Sidebar
        on:projectChange={updateActiveProject}
        on:newProject={createNewProject}
        on:newProjectSync={createNewProjectFromWindow}
        on:projectSync={saveWindowToActiveProject} />
    </Navbar>
    <Header slot="header">
      <div class="logo-container">
        <img class="logo" alt="Rabbithole logo" src="../assets/icons/logo.png">
      </div>
    </Header>
    <Timeline
      on:projectRename={renameActiveProject}
      activeProject={activeProject}
      websites={websites} />
  </AppShell>
</SvelteUIProvider>

<style>
  .logo-container {
    display: flex;
    justify-content: center;
  }
  .logo {
    width: 150px;
    height: auto;
  }
</style>
