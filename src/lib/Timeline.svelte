<script>
  import { onMount, createEventDispatcher } from "svelte";
  import { Badge, Button, Card, Group, Image, Input, Text, TextInput, Tooltip } from '@svelteuidev/core';
  import { MessageRequest } from "../utils"
  import TimelineCard from "src/lib/TimelineCard.svelte";
  import { Pencil1 } from 'radix-icons-svelte';

  // FIXME: why aren't types working here?
  const dispatch = createEventDispatcher();

  export let activeProject = {};
  export let websites = [];

  let nameClicked = false;
  let isHovering = false;

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

  async function deleteWebsite(event) {
    dispatch("websiteDelete", {
      url: event.detail.url
    });
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
      <Tooltip {isHovering} label="Click to rename/delete project">
        <Input id="project-name"
               icon={Pencil1}
               variant="unstyled"
               size="lg"
               on:click={() => { nameClicked = true; }}
               on:mouseenter={()=>{isHovering=true}}
               on:mouseleave={()=>{isHovering=false}}
               bind:value={activeProject.name}
               />
      </Tooltip>
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
      <TimelineCard website={site} on:websiteDelete={deleteWebsite} />
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
