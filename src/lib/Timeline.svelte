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
  import BurrowHome from "src/lib/BurrowHome.svelte";
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

  export let activeBurrow = {};
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

  let hoveredTimestamp = null;
  let hoverX = 0;
  let hoverY = 0;
  let isHoveringTimestamp = false;

  async function renameBurrow() {
    if (activeBurrow.name === "") {
      return;
    }
    dispatch("burrowRename", {
      newActiveBurrowName: activeBurrow.name,
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
      const session = await getSession();

      if (!session) {
        alert("Please log in via the sidebar first.");
        return;
      }

      const did = session.did;

      const collectionData = await createCollection(did, activeBurrow.name);

      let successCount = 0;
      for (const site of websites) {
        try {
          const cardData = await createUrlCard(did, site);

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
          }`,
        );
      } else {
        const timestamp = Date.now();
        const response = await chrome.runtime.sendMessage({
          type: MessageRequest.PUBLISH_BURROW,
          burrowId: activeBurrow.id,
          uri: collectionData.uri,
          timestamp: timestamp,
        });

        if (response && response.error) {
          console.error("Failed to save publish info:", response.error);
          alert(
            "Published to Cosmik, but failed to save sync status locally: " +
              response.error,
          );
        } else {
          activeBurrow.sembleCollectionUri = collectionData.uri;
          activeBurrow.lastSembleSync = timestamp;

          alert(
            `Rabbithole published successfully! Created collection and ${successCount} cards.`,
          );
        }
      }
    } catch (e) {
      console.error(e);
      if (e.message.includes("ScopeMissingError")) {
        alert(
          "Permission denied. Please log out and log back in to grant the necessary permissions.",
        );
      } else {
        alert("Error publishing rabbithole: " + e.message);
      }
    } finally {
      isPublishing = false;
    }
  }

  function formatDate(ts) {
    if (!ts) return "";
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(ts));
  }

  function formatDateTime(ts) {
    if (!ts) return "";
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(ts));
  }

  function dateKey(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function groupByDate(items) {
    const map = new Map();
    for (const site of items) {
      const key = dateKey(site.savedAt);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(site);
    }

    const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
    return keys.map((key) => ({
      key,
      label: formatDate(map.get(key)[0]?.savedAt),
      items: map.get(key),
    }));
  }

  $: if (websites.length !== previousWebsitesLength) {
    filteredWebsites = websites;
    searchResults = [];
    searchQuery = "";
    previousWebsitesLength = websites.length;
  }

  $: websitesToDisplay =
    searchQuery.length < 3 ? filteredWebsites : searchResults;

  $: groupedWebsites = groupByDate(websitesToDisplay);

  $: sembleUrl = (() => {
    if (!activeBurrow?.sembleCollectionUri) return null;
    const uri = activeBurrow.sembleCollectionUri;
    if (!uri.startsWith("at://")) return null;
    const parts = uri.replace("at://", "").split("/");
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

  function showTimestamp(ts) {
    hoveredTimestamp = ts;
    isHoveringTimestamp = true;
  }

  function clearTimestamp() {
    isHoveringTimestamp = false;
    hoveredTimestamp = null;
  }

  function updateHoverPosition(e) {
    hoverX = e.clientX;
    hoverY = e.clientY;
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
    <Group position="center" spacing="md" class="project-controls">
      <div class="input-div">
        <Tooltip {isHovering} label="Click to rename burrow" withArrow>
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
            bind:value={activeBurrow.name}
            on:blur={renameBurrow}
            on:keydown={(e) => e.key === "Enter" && renameBurrow()}
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
    <div class="search-bar">
      <TextInput
        placeholder="Search your burrow..."
        icon={MagnifyingGlass}
        size="md"
        radius="md"
        bind:value={searchQuery}
        on:input={applySearchQuery}
      />
    </div>
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
      {#if !searchQuery}
        <BurrowHome bind:activeBurrow {websites} />
      {/if}

      <div class="timeline-feed">
        <div class="timeline-gutter">
          <div class="timeline-line"></div>
        </div>

        <div class="timeline-body">
          {#each groupedWebsites as group (group.key)}
            <div class="date-group">
              <div class="date-header">{group.label}</div>

              <div class="date-cards">
                {#each group.items as site (site.url)}
                  <div class="timeline-item">
                    <div
                      class="timeline-dot"
                      on:mouseenter={(e) => {
                        updateHoverPosition(e);
                        showTimestamp(site.savedAt);
                      }}
                      on:mousemove={updateHoverPosition}
                      on:mouseleave={clearTimestamp}
                    ></div>
                    <div
                      class="timeline-connector"
                      on:mouseenter={(e) => {
                        updateHoverPosition(e);
                        showTimestamp(site.savedAt);
                      }}
                      on:mousemove={updateHoverPosition}
                      on:mouseleave={clearTimestamp}
                    ></div>

                    <div class="timeline-card-wrap">
                      <TimelineCard
                        website={site}
                        on:websiteDelete={deleteWebsite}
                      />
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>

        {#if isHoveringTimestamp && hoveredTimestamp}
          <div
            class="timeline-tooltip"
            style="left: {hoverX}px; top: {hoverY}px;"
          >
            {formatDateTime(hoveredTimestamp)}
          </div>
        {/if}
      </div>

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
    padding: 40px 20px;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  .header-section {
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 40px;
    max-width: 800px;
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
    margin: 30px 0;
    width: 100%;
  }

  .timeline-feed {
    display: grid;
    grid-template-columns: 18px 1fr;
    gap: 0;
    width: 100%;
    position: relative;
  }

  .timeline-gutter {
    position: relative;
  }

  .timeline-line {
    position: absolute;
    left: 8px;
    top: 0;
    bottom: 0;
    width: 1px;
    background: rgba(0, 0, 0, 0.12);
    z-index: 1;
  }

  .timeline-body {
    width: 100%;
  }

  .date-group {
    margin-bottom: 22px;
  }

  .date-header {
    font-size: 12px;
    font-weight: 800;
    color: rgba(0, 0, 0, 0.55);
    letter-spacing: 0.02em;
    margin-bottom: 30px;
    padding-left: 0;
  }

  .date-cards {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  .timeline-item {
    position: relative;
    display: grid;
    max-width: 800px;
    align-items: start;
    margin-bottom: 30px;
  }

  .timeline-dot {
    position: absolute;
    left: -18px;
    top: 20px;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.35);
    z-index: 10;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .timeline-dot:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  .timeline-connector {
    position: absolute;
    left: -10px;
    top: 26px;
    width: 76px;
    height: 1px;
    background: rgba(0, 0, 0, 0.12);
    z-index: 2;
  }

  .timeline-card-wrap {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    margin-left: 80px;
  }

  .timeline-tooltip {
    position: fixed;
    transform: translate(12px, -12px);
    background: rgba(20, 21, 23, 0.95);
    color: #f8f9fa;
    font-size: 12px;
    font-weight: 700;
    padding: 8px 10px;
    border-radius: 10px;
    white-space: nowrap;
    z-index: 9999;
    pointer-events: none;
  }

  .timeline-tooltip::after {
    content: "";
    position: absolute;
    left: -6px;
    top: 14px;
    width: 0;
    height: 0;
    border-right: 6px solid rgba(20, 21, 23, 0.95);
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
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

  :global(body.dark-mode) .timeline-line {
    background: rgba(255, 255, 255, 0.14);
  }

  :global(body.dark-mode) .timeline-dot {
    background: rgba(255, 255, 255, 0.35);
  }

  :global(body.dark-mode) .timeline-dot:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.35),
      0 4px 6px -2px rgba(0, 0, 0, 0.25);
  }

  :global(body.dark-mode) .timeline-connector {
    background: rgba(255, 255, 255, 0.14);
  }

  :global(body.dark-mode) .date-header {
    color: rgba(255, 255, 255, 0.55);
  }

  :global(body.dark-mode) .timeline-tooltip {
    background: rgba(231, 231, 231, 0.95);
    color: #141517;
  }

  :global(body.dark-mode) .timeline-tooltip::after {
    border-right-color: rgba(231, 231, 231, 0.95);
  }

  @media (max-width: 640px) {
    .timeline-feed {
      grid-template-columns: 14px 1fr;
    }

    .timeline-line {
      left: 6px;
    }

    .timeline-dot {
      left: -16px;
      top: 16px;
    }

    .timeline-connector {
      left: -8px;
      top: 22px;
      width: 76px;
    }

    .timeline-card-wrap {
      margin-left: 80px;
    }
  }
</style>
