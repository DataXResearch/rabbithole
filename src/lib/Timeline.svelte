<script>
  import { Button, Group, Input, Tooltip } from '@svelteuidev/core';
  import { Pencil1 } from 'radix-icons-svelte';
  import TimelineCard from "src/lib/TimelineCard.svelte";
  import { createEventDispatcher } from "svelte";

  // FIXME: why aren't types working here?
  const dispatch = createEventDispatcher();

  export let activeProject = {};
  export let websites = [];

  let nameClicked = false;
  let isHovering = false;

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
</script>

<div class="timeline">
  <Group position="center">
    <div class="logo-container">
      <img class="logo" alt="Rabbithole logo" src="../assets/icons/logo.png">
    </div>
    <div class="input-div">
      <Tooltip {isHovering} label="Click to rename project">
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

  .logo-container {
    display: flex;
    justify-content: center;
  }

  .logo {
    width: 150px;
    height: auto;
  }
</style>
