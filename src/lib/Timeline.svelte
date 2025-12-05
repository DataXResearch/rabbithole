<script>
  import Fuse from "fuse.js";
  import { createEventDispatcher } from "svelte";
  import {
    Button,
    Group,
    Input,
    Text,
    TextInput,
    Tooltip,
    Loader,
    Stack,
  } from "@svelteuidev/core";
  import TimelineCard from "src/lib/TimelineCard.svelte";
  import TimelineSlider from "src/lib/TimelineSlider.svelte";
  import { Pencil1, Moon, Sun, MagnifyingGlass } from "radix-icons-svelte";

  const dispatch = createEventDispatcher();

  export let activeProject = {};
  export let websites = [];
  export let isDark = false;
  export let isLoading = false;

  let searchResults = [];
  let nameClicked = false;
  let isHovering = false;
  let searchQuery = "";
  let filteredWebsites = [];
  let startDate = null;
  let endDate = null;
  let previousWebsitesLength = 0;

  function toggleDarkMode() {
    dispatch("toggleTheme");
  }

  async function renameProject() {
    if (activeProject.name === "") {
      return;
    }
    dispatch("projectRename", {
      newActiveProjectName: activeProject.name,
    });
    nameClicked = false;
  }

  async function deleteWebsite(event) {
    dispatch("websiteDelete", {
      url: event.detail.url,
    });
  }

  function checkWebsiteForQuery(websites) {
    const fuse = new Fuse(websites, {
      keys: ["name", "description", "url"],
      includeScore: true,
      threshold: 0.3,
    });

    const results = fuse.search(searchQuery);
    return results;
  }

  function applySearchQuery(node) {
    const results = checkWebsiteForQuery(websites);
    searchResults = results.map((res) => res.item);
  }

  function handleDateRangeChange(event) {
    startDate = event.detail.startDate;
    endDate = event.detail.endDate;

    filteredWebsites = websites.filter((website) => {
      const websiteDate = new Date(website.savedAt);
      return websiteDate >= startDate && websiteDate <= endDate;
    });
  }

  $: if (websites.length !== previousWebsitesLength) {
    filteredWebsites = websites;
    searchResults = [];
    searchQuery = "";
    previousWebsitesLength = websites.length;
  }

  $: websitesToDisplay =
    searchQuery.length < 3 ? filteredWebsites : searchResults;
</script>

<div class="timeline">
  <div class="header-section">
    <div class="logo-container">
      <img class="logo" alt="Rabbithole logo" src="../assets/icons/logo.png" />
    </div>
    
    <Group position="center" spacing="xs" class="project-controls">
      <div class="input-div">
        <Tooltip {isHovering} label="Click to rename project" withArrow>
          <Input
            id="project-name"
            icon={Pencil1}
            variant="unstyled"
            size="xl"
            class="project-name-input"
            on:click={() => {
              nameClicked = true;
            }}
            on:mouseenter={() => {
              isHovering = true;
            }}
            on:mouseleave={() => {
              isHovering = false;
            }}
            bind:value={activeProject.name}
            on:blur={renameProject}
            on:keydown={(e) => e.key === 'Enter' && renameProject()}
          />
        </Tooltip>
      </div>
      <Button on:click={toggleDarkMode} variant="subtle" color="gray" size="sm">
        {#if isDark}
          <Sun size="20" />
        {:else}
          <Moon size="20" />
        {/if}
      </Button>
    </Group>
  </div>

  <!-- FIXME: make this functional-->
  <!-- <TimelineSlider -->
  <!--   {websites} -->
  <!--   {startDate} -->
  <!--   {endDate} -->
  <!--   on:dateRangeChange={handleDateRangeChange} -->
  <!-- /> -->

  <div class="feed">
    {#if isLoading}
      <div class="loading-container">
        <Loader size="lg" variant="dots" />
        <Text size="md" color="dimmed" style="margin-top: 1rem;">Loading websites...</Text>
      </div>
    {:else}
      <div class="search-bar">
        <TextInput
          placeholder="Search your rabbithole..."
          icon={MagnifyingGlass}
          size="md"
          radius="md"
          bind:value={searchQuery}
          on:input={applySearchQuery}
        />
      </div>
      <Stack spacing="md">
        {#each websitesToDisplay as site}
          <TimelineCard website={site} on:websiteDelete={deleteWebsite} />
        {/each}
      </Stack>
      {#if websitesToDisplay.length === 0 && searchQuery.length > 0}
         <Text align="center" color="dimmed" size="sm" style="margin-top: 2rem;">No results found.</Text>
      {/if}
    {/if}
  </div>
</div>

<style>
  .timeline {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  .header-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 40px;
  }

  .logo-container {
    margin-bottom: 20px;
  }

  .logo {
    width: 80px;
    height: auto;
    opacity: 0.9;
  }

  .project-controls {
    width: 100%;
    justify-content: center;
  }

  .input-div {
    max-width: 500px;
    text-align: center;
  }

  :global(.project-name-input input) {
    text-align: center;
    font-weight: 700;
    font-size: 2rem !important;
    height: auto !important;
    padding: 0 !important;
  }

  .search-bar {
    margin-bottom: 30px;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
  }

  :global(body.dark-mode .feed) {
    background-color: transparent;
  }

  :global(body.dark-mode .search-bar .mantine-TextInput-input) {
    background-color: #25262b;
    border-color: #373a40;
    color: #c1c2c5;
  }
  
  :global(body.dark-mode .search-bar .mantine-TextInput-input::placeholder) {
    color: #5c5f66;
  }

  :global(body.dark-mode .loading-container .mantine-Text-root) {
    color: #c1c2c5;
  }
</style>
