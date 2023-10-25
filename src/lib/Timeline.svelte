<script>
  import { onMount } from "svelte";
  import { Badge, Button, Card, Group, Image, Text, TextInput } from '@svelteuidev/core';
  import { MessageRequest } from "../utils"
  import TimelineCard from "src/lib/TimelineCard.svelte";
  import ProjectSelector from "src/lib/ProjectSelector.svelte"

  // FIXME: why aren't types working here?

  let websites = [];
  let projects = [];
  let loading = true;
  let newRabbitholeName = "";
  let activeProject = {};

  onMount(async () => {
    websites = await chrome.runtime.sendMessage({type: MessageRequest.GET_ALL_ITEMS});
    refresh();
    loading = false;
  });

  function makeActiveProjectFirst() {
    for (let i = 0; i < projects.length; i++) {
      if (projects[i].name === activeProject.name) {
        projects.splice(i, 1);
      }
    }
    projects.unshift(activeProject);
  }

  async function refresh() {
    activeProject = await chrome.runtime.sendMessage({ type: MessageRequest.GET_ACTIVE_PROJECT })
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
    )
  }

  async function handleProjectChange(event) {
    await chrome.runtime.sendMessage({
      type: MessageRequest.CHANGE_ACTIVE_PROJECT,
      projectId: event.target.value,
    });
    activeProject = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_PROJECT,
      projectId: event.target.value,
    });
    refresh();
  }

  async function createNewProject() {
    if (newRabbitholeName === "") {
      // TODO: error modal
      return;
    }
    await chrome.runtime.sendMessage({
      type: MessageRequest.CREATE_NEW_PROJECT,
      newProjectName: newRabbitholeName,
    });
    refresh();
  }

  async function saveAllTabsToActiveProject() {
    const tabs = await chrome.runtime.sendMessage({
      type: MessageRequest.SAVE_WINDOW_TO_ACTIVE_PROJECT,
    });

    refresh();
  }

  async function saveAllTabs() {
    if (newRabbitholeName === "") {
      // TODO: error modal
      return;
    }
    await chrome.runtime.sendMessage({
      type: MessageRequest.SAVE_WINDOW_TO_NEW_PROJECT,
      newProjectName: newRabbitholeName,
    });

    refresh();
  }
</script>

<div class="timeline">
  <img src="../assets/icons/logo.png">
  <div>
    <ProjectSelector projects={projects} handleProjectChange={handleProjectChange} />
  </div>
  <div class="feed">
    {#if !loading}
      {#each websites as site}
        <TimelineCard website={site} />
      {/each}
    {:else}
      <p> Loading... </p>
    {/if}
  </div>
</div>

<style>
  .timeline {
    width: 50vw;
    margin: 0 auto;
  }
</style>
