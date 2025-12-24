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
    Button,
  } from "@svelteuidev/core";
  import TimelineCard from "src/lib/TimelineCard.svelte";
  import TimelineSlider from "src/lib/TimelineSlider.svelte";
  import Modal from "src/lib/Modal.svelte";
  import ActiveTabs from "src/lib/ActiveTabs.svelte";
  import {
    Pencil1,
    MagnifyingGlass,
    Globe,
    Rocket,
    Reload,
    InfoCircled,
  } from "radix-icons-svelte";
  import { getSession } from "../atproto/client";
  import {
    createCollection,
    createUrlCard,
    createCollectionLink,
  } from "../atproto/cosmik";
  import { MessageRequest } from "../utils";

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
  let showInfoModal = false;

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
        alert(
          `Failed to publish any cards. Last error: ${
            lastError?.message || "Unknown error"
          }`
        );
      } else {
        // Save to DB
        const timestamp = Date.now();
        const response = await chrome.runtime.sendMessage({
          type: MessageRequest.PUBLISH_RABBITHOLE,
          projectId: activeProject.id,
          uri: collectionData.uri,
          timestamp: timestamp,
        });

        if (response && response.error) {
          console.error("Failed to save publish info:", response.error);
          alert(
            "Published to Cosmik, but failed to save sync status locally: " +
              response.error
          );
        } else {
          // Update local activeProject to reflect changes immediately in UI if needed
          activeProject.sembleCollectionUri = collectionData.uri;
          activeProject.lastSembleSync = timestamp;

          alert(
            `Rabbithole published successfully! Created collection and ${successCount} cards.`
          );
        }
      }
    } catch (e) {
      console.error(e);
      if (e.message.includes("ScopeMissingError")) {
        alert(
          "Permission denied. Please log out and log back in to grant the necessary permissions."
        );
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

  $: sembleUrl = (() => {
    if (!activeProject?.sembleCollectionUri) return null;
    const uri = activeProject.sembleCollectionUri;
    if (!uri.startsWith("at://")) return null;
    const parts = uri.replace("at://", "").split("/");
    // Expecting: did / collection / rkey
    if (parts.length >= 3) {
      const did = parts[0];
      const rkey = parts[parts.length - 1];
      return `https://semble.so/profile/${did}/collections/${rkey}`;
    }
    return null;
  })();

  function openSemble() {
    if (sembleUrl) {
      window.open(sembleUrl, "_blank");
    }
  }
</script>

<Modal
  isOpen={showInfoModal}
  title="About Semble"
  on:close={() => (showInfoModal = false)}
>
  <p><strong>A social knowledge network for researchers.</strong></p>
  <p>
    Follow your peers' research trails. Surface and discover new connections.
    Built on ATProto so you own your data.
  </p>

  <ul style="padding-left: 20px; margin-top: 10px; margin-bottom: 20px;">
    <li style="margin-bottom: 8px;">
      <strong>Curate your research trails.</strong> Collect interesting links, add
      notes, and organize them into shareable collections.
    </li>
    <li style="margin-bottom: 8px;">
      <strong>Connect with peers.</strong> See what your peers are sharing and find
      new collaborators with shared interests.
    </li>
    <li>
      <strong>Own your data.</strong> Built on ATProto, new apps will come to you.
      No more rebuilding your social graph and data when apps pivot and shut down.
    </li>
  </ul>

  <div style="margin-top: 24px; text-align: center;">
    <a
      href="https://semble.so"
      target="_blank"
      rel="noopener noreferrer"
      class="semble-link"
    >
      Visit Semble.so &rarr;
    </a>
  </div>
</Modal>

<div class="timeline">
  <div class="header-section">
    <div class="logo-container">
      <img class="logo" alt="Rabbithole logo" src="../assets/icons/logo.png" />
    </div>

    <Group position="center" spacing="md" class="project-controls">
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

      <div class="semble-actions">
        {#if sembleUrl}
          <Tooltip label="View on Semble" withArrow>
            <ActionIcon
              variant="light"
              color="cyan"
              size={42}
              radius="md"
              on:click={openSemble}
            >
              <Globe size={24} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Update on Semble" withArrow>
            <ActionIcon
              variant="light"
              color="orange"
              size={42}
              radius="md"
              on:click={publishRabbithole}
              loading={isPublishing}
              disabled={isPublishing}
            >
              <Reload size={24} />
            </ActionIcon>
          </Tooltip>
        {:else}
          <Tooltip label="Publish to Semble" withArrow>
            <ActionIcon
              variant="filled"
              color="grape"
              size={42}
              radius="md"
              on:click={publishRabbithole}
              loading={isPublishing}
              disabled={isPublishing}
            >
              <Rocket size={24} />
            </ActionIcon>
          </Tooltip>
        {/if}

        <Tooltip label="About Semble" withArrow>
          <ActionIcon
            variant="transparent"
            color="gray"
            size="lg"
            radius="xl"
            on:click={() => (showInfoModal = true)}
          >
            <InfoCircled />
          </ActionIcon>
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

      {#if !searchQuery}
        <ActiveTabs bind:activeProject {websites} />
      {/if}

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
    flex-wrap: wrap;
  }

  .semble-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 12px;
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

  .semble-link {
    color: #228be6;
    text-decoration: none;
    font-weight: 600;
    padding: 8px 16px;
    border-radius: 4px;
    background-color: rgba(34, 139, 230, 0.1);
    transition: background-color 0.2s;
  }

  .semble-link:hover {
    background-color: rgba(34, 139, 230, 0.2);
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

  :global(body.dark-mode) .semble-link {
    color: #4dabf7;
    background-color: rgba(77, 171, 247, 0.15);
  }

  :global(body.dark-mode) .semble-link:hover {
    background-color: rgba(77, 171, 247, 0.25);
  }
</style>
