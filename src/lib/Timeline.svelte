<script>
  import Fuse from "fuse.js";
  import { onMount, createEventDispatcher } from "svelte";
  import { Badge, Button, Card, Group, Image, Input, Text, TextInput, Tooltip } from '@svelteuidev/core';
  import { MessageRequest } from "../utils"
  import TimelineCard from "src/lib/TimelineCard.svelte";
  import { Pencil1 } from 'radix-icons-svelte';

  // FIXME: why aren't types working here?
  const dispatch = createEventDispatcher();

  export let activeProject = {};
  export let websites = [];

  let searchResults = [];
  let nameClicked = false;
  let isHovering = false;
  let searchQuery = "";

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

  function checkWebsiteForQuery(websites) {
    const fuse = new Fuse(websites, {
      keys: ["name", "description", "url"],
      includeScore: true,
      // anything more has too many irrelevant results
      threshold: 0.3,
    });

    const results = fuse.search(searchQuery);
    // const filteredResults = results.map((result) => result.item).filter((item, index, self) => self.indexOf(item) === index);
    return results;
  }

  function applySearchQuery(node) {
    const results = checkWebsiteForQuery(websites);
    searchResults = results.map(res => res.item);
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
    <div class="search-bar">
      <TextInput
        placeholder="Search"
        bind:value={searchQuery}
        on:input={applySearchQuery}
        />
    </div>
    <!-- Following deadgrep's convention of 3 char minimum -->
    {#if searchQuery.length < 3}
      {#each websites as site}
        <TimelineCard website={site} on:websiteDelete={deleteWebsite} />
      {/each}
    {:else}
      {#each searchResults as site}
        <TimelineCard website={site} on:websiteDelete={deleteWebsite} />
      {/each}
    {/if}
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

  .search-bar {
    width: inherit;
    margin-x: 20px
  }
</style>
