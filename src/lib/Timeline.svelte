<script>
  import Fuse from "fuse.js";
  import { createEventDispatcher } from "svelte";
  import {
    Group,
    Input,
    Text,
    TextInput,
    Tooltip,
    Loader,
    Stack,
    ActionIcon,
  } from "@svelteuidev/core";
  import TimelineCard from "src/lib/TimelineCard.svelte";
  import TimelineSlider from "src/lib/TimelineSlider.svelte";
  import { Pencil1, MagnifyingGlass, Share1 } from "radix-icons-svelte";
  import { getSession } from "../atproto/client";
  import {
    createCollection,
    createUrlCard,
    createCollectionLink
  } from "../atproto/cosmik";

  const dispatch = createEventDispatcher();

  export let activeProject = {};
  export let websites = [];
  export let isLoading = false;

  let searchResults = [];
  let nameClicked = false;
  let isHovering = false;
  let searchQuery = "";
  let filteredWebsites = [];
  let startDate = null;
  let endDate = null;
  let previousWebsitesLength = 0;
  let isPublishing = false;

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

  async function publishRabbithole() {
    if (websites.length === 0) {
      alert("Rabbithole is empty!");
      return;
    }

    isPublishing = true;
    let lastError = null;

    try {
      // Get session
      const session = await getSession();

      if (!session) {
        alert("Please log in via the sidebar first.");
        return;
      }

      const did = session.did;

      // Create Collection
      const collectionData = await createCollection(did, activeProject.name);
      console.log("Created collection", collectionData);

      // Create Cards and Links
      let successCount = 0;
      for (const site of websites) {
        try {
          console.log("Creating card for:", site.url);
          // 1. Create the Card
          const cardData = await createUrlCard(did, site);

          // 2. Create the Collection Link
          console.log("Creating link for card:", cardData);
          await createCollectionLink(did, collectionData, cardData);

          successCount++;
        } catch (err) {
          console.error(`Failed to create card/link for ${site.url}`, err);
          lastError = err;
        }
      }

      if (successCount === 0 && websites.length > 0) {
        alert(`Failed to publish any cards. Last error: ${lastError?.message || "Unknown error"}`);
      } else {
        alert(
          `Rabbithole published successfully! Created collection and ${successCount} cards.`
        );
      }
    } catch (e) {
      console.error(e);
      if (e.message.includes("ScopeMissingError")) {
        alert("Permission denied. Please log out and log back in to grant the necessary permissions.");
      } else {
        alert("Error publishing rabbithole: " + e.message);
      }
    } finally {
      isPublishing = false;
    }
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
      <Tooltip label="Publish to Cosmik" withArrow>
        <ActionIcon
          variant="subtle"
          size="xl"
          on:click={publishRabbithole}
          loading={isPublishing}
          disabled={isPublishing}
        >
          <Share1 />
        </ActionIcon>
      </Tooltip>

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
            on:keydown={(e) => e.key === "Enter" && renameProject()}
          />
        </Tooltip>
      </div>
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
        <Text size="md" color="dimmed" style="margin-top: 1rem;"
          >Loading websites...</Text
        >
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
        <Text align="center" color="dimmed" size="sm" style="margin-top: 2rem;"
          >No results found.</Text
        >
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
