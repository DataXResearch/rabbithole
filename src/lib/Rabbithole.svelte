<script>
  import { AppShell, Navbar, SvelteUIProvider } from "@svelteuidev/core";
  import Sidebar from "src/lib/Sidebar.svelte";
  import Timeline from "src/lib/Timeline.svelte";
  import { onMount } from "svelte";
  import { MessageRequest, NotificationDuration, getOrderedProjects } from "../utils";

  let activeProject = {};
  let websites = [];
  let projects = [];
  let isDark = true;
  let opened = false;

  // status for updatingComponents
  // TODO: better; is dispatching from parent to child an antipattern?
  // how can `Sidebar` be cut out as a middleman? should it?
  let syncSuccess = false;
  let syncFail = false;

  onMount(async () => {
    projects = await getOrderedProjects()
    activeProject = await chrome.runtime.sendMessage({ type: MessageRequest.GET_ACTIVE_PROJECT })
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
      setTimeout(() => { syncSuccess = false }, NotificationDuration);
    }, 300);
    setTimeout(() => {
      updateWebsites();
    }, 1000);
  }

  async function renameActiveProject(event) {
    activeProject = await chrome.runtime.sendMessage({
      type: MessageRequest.RENAME_PROJECT,
      newName: event.detail.newActiveProjectName,
      projectId: activeProject.id
    });
    projects = await getOrderedProjects();
  }

  async function deleteActiveProject(event) {
    activeProject = await chrome.runtime.sendMessage({
      type: MessageRequest.DELETE_PROJECT,
      projectId: activeProject.id
    });
    projects = await getOrderedProjects();
    updateWebsites();
  }

  async function deleteWebsite(event) {
    await chrome.runtime.sendMessage({
      type: MessageRequest.DELETE_WEBSITE,
      projectId: activeProject.id,
      url: event.detail.url
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
      fixed
      width={{
        sm: 300,
        lg: 400,
        base: 100
      }}
      height={"100%"}
      override={{
        borderRight: "1px solid rgb(233, 236, 239)",
        overflowY: "scroll"
      }}
      hidden={!opened}>
      <Sidebar
        syncSuccess={syncSuccess}
        projects={projects}
        on:projectDelete={deleteActiveProject}
        on:projectChange={updateActiveProject}
        on:newProject={createNewProject}
        on:newProjectSync={createNewProjectFromWindow}
        on:projectSync={saveWindowToActiveProject} />
    </Navbar>
    <Timeline
      on:websiteDelete={deleteWebsite}
      on:projectRename={renameActiveProject}
      activeProject={activeProject}
      websites={websites} />
  </AppShell>
</SvelteUIProvider>
