<script>
  import { onMount } from "svelte";
  import { Badge, Button, Card, Group, Image, Text, NativeSelect, TextInput } from '@svelteuidev/core';
  import { MessageRequest } from "../utils"
  import TimelineCard from "src/lib/TimelineCard.svelte";

  // FIXME: why aren't types working here?

  let websites = [];
  let projects = [];
  let loading = true;
  let value = ""; // TODO: see if this can be changed to an accurate name
  let activeProject = {};

  onMount(async () => {
    websites = await chrome.runtime.sendMessage({type: MessageRequest.GET_ALL_ITEMS});
    // TODO: load active project and set title as default value on the dropdown
    activeProject = await chrome.runtime.sendMessage({ type: MessageRequest.GET_ACTIVE_PROJECT })
    refreshProjects();
    refreshWebsites();
    loading = false;
  });

  async function refreshWebsites() {
    websites = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_PROJECT_SAVED_WEBSITES,
      projectId: activeProject.id,
    });
  }

  async function refreshProjects() {
    projects = await chrome.runtime.sendMessage({type: MessageRequest.GET_ALL_PROJECTS});
  }

  async function handleProjectChange(event) {
    await chrome.runtime.sendMessage({
      type: MessageRequest.CHANGE_ACTIVE_PROJECT,
      projectId: event.target.value,
    });
    activeProject = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_PROJECT,
      projectId: event.target.value,
    })
    refreshWebsites();
  }

  async function createNewProject() {
    await chrome.runtime.sendMessage({
      type: MessageRequest.CREATE_NEW_PROJECT,
      newProjectName: value,
    });
    refreshProjects();
  }
</script>

<div class="timeline">
  <img src="../assets/icons/logo.png">
  <div>
    <NativeSelect data={projects.map(p => { return { label: p.name, value: p.id }; })}
                  label="Active Project"
                  on:change={handleProjectChange}
                  />
      <div>
        <TextInput
          placeholder="My new rabbithole"
          label="New Project"
          bind:value
          />
        <Button
          on:click={createNewProject}
          variant='light'
          color='blue'
          >
          Create
        </Button>
      </div>
  </div>
  <div class="feed">
  {#if !loading}
    {#each websites as site}
      <div>
        <h3>{site.name}</h3>
      </div>
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
