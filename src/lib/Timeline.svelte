<script>
  import { onMount, createEventDispatcher } from "svelte";
  import { Badge, Button, Card, Group, Image, Input, Text, TextInput } from '@svelteuidev/core';
  import { MessageRequest } from "../utils"
  import TimelineCard from "src/lib/TimelineCard.svelte";
  import { Pencil1 } from 'radix-icons-svelte';

  // FIXME: why aren't types working here?
  const dispatch = createEventDispatcher();
  let nameClicked = false;

  export let activeProject = {};
  export let websites = [];

  async function deleteProject() {
    dispatch("projectDelete");
  }

  async function renameProject() {
    if (activeProject.name === "") {
      // TODO: error modal
      return;
    }
    dispatch("projectRename", {
      newActiveProjectName: activeProject.name
    });
  }

  function makeActiveProjectFirst() {
    for (let i = 0; i < projects.length; i++) {
      if (projects[i].name === activeProject.name) {
        projects.splice(i, 1);
      }
    }
    projects.unshift(activeProject);
  }

  async function updateItems() {
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
</script>

<div class="timeline">
  <Group position="center">
    <div class="input-div">
      <Input id="project-name"
             icon={Pencil1}
             variant="unstyled"
             size="lg"
             on:click={() => { nameClicked = true; }}
             bind:value={activeProject.name}
             />
    </div>
    {#if nameClicked}
      <Button
        on:click={renameProject}
        variant='light'
        color='blue'
        >
        Rename
      </Button>
      <Button
        on:click={deleteProject}
        variant='filled'
        color='red'
        >
        Delete
      </Button>
    {/if}
  </Group>
  <div class="feed">
    {#each websites as site}
      <TimelineCard website={site} />
    {/each}
  </div>
</div>

<style>
  .timeline {
    width: 40vw;
    margin: 0 auto;
    margin-top: 50px;
  }

  .input-div {
    max-width: 400px;
  }
</style>
