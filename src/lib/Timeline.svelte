<script lang="ts">
  import Fuse from "fuse.js";
  import { createEventDispatcher, onMount, tick } from "svelte";
  import {
    Group,
    Input,
    Text,
    TextInput,
    Tooltip,
    Loader,
    ActionIcon,
    Button,
  } from "@svelteuidev/core";
  import CollapsibleContainer from "src/lib/CollapsibleContainer.svelte";
  import TimelineCard from "src/lib/TimelineCard.svelte";
  import Modal from "src/lib/Modal.svelte";
  import RabbitholeGrid from "src/lib/RabbitholeGrid.svelte";
  import BurrowHome from "src/lib/BurrowHome.svelte";
  import AddToRabbitholeModal from "src/lib/AddToRabbitholeModal.svelte";
  import {
    MagnifyingGlass,
    Globe,
    Rocket,
    Reload,
    Trash,
    Home,
    Upload,
    Update,
  } from "radix-icons-svelte";
  import { getSession } from "../atproto/client";
  import {
    createCollection,
    createUrlCard,
    createCollectionLink,
  } from "../atproto/cosmik";
  import { MessageRequest } from "../utils";
  import { Burrow, Rabbithole, Website } from "src/storage/db";

  const dispatch = createEventDispatcher();

  export let activeBurrow: Burrow | null = null;
  export let websites: any[] = [];
  export let isLoading: boolean = false;
  export let selectRabbithole: (rabbithole: Rabbithole) => Promise<void>;
  export let autoFocusTitle: boolean = false;

  let searchResults: Website[] = [];
  let isHovering: boolean = false;
  let searchQuery: string = "";
  let filteredWebsites: Website[] = [];
  let previousWebsitesLength: number = 0;
  let isPublishing: boolean = false;
  let showPublishModal: boolean = false;
  let isSyncing: boolean = false;

  let hoveredTimestamp: number = null;
  let hoverX: number = 0;
  let hoverY: number = 0;
  let isHoveringTimestamp: boolean = false;

  // Slider-controlled date window
  let startDate: Date = null;
  let endDate: Date = null;

  let rabbitholes: Rabbithole[] = [];
  let showAddToRabbitholeModal: boolean = false;

  let isUpdatingBurrowHome: boolean = false;
  let isSavingWindowToBurrow: boolean = false;
  let isDeletingBurrow: boolean = false;

  let showSearchBar: boolean = false;

  onMount(async () => {
    if (autoFocusTitle) {
      await tick();
      const input = document.querySelector(
        ".project-name-input input",
      ) as HTMLInputElement;
      input?.focus();
      input?.select();
    }
  });

  async function loadRabbitholesForActiveBurrow(): Promise<void> {
    if (!activeBurrow?.id) {
      rabbitholes = [];
      return;
    }

    try {
      const res = await chrome.runtime.sendMessage({
        type: MessageRequest.FETCH_RABBITHOLES_FOR_BURROW,
        burrowId: activeBurrow.id,
      });

      if (res && typeof res === "object" && "error" in res) {
        console.error("Failed to fetch rabbitholes for burrow:", res.error);
        rabbitholes = [];
      } else {
        rabbitholes = Array.isArray(res) ? res : [];
      }
    } catch (e) {
      console.error("Failed to fetch rabbitholes for burrow:", e);
      rabbitholes = [];
    }
  }

  async function loadWebsitesForActiveBurrow(): Promise<void> {
    if (!activeBurrow?.id) {
      websites = [];
      return;
    }

    try {
      const res = await chrome.runtime.sendMessage({
        type: MessageRequest.GET_BURROW_WEBSITES,
        burrowId: activeBurrow.id,
      });

      const list = Array.isArray(res) ? res : [];
      websites = list.filter(
        (value, index, self) =>
          index === self.findIndex((t) => t.url === value.url),
      );
    } catch (e) {
      console.error("Failed to fetch websites for burrow:", e);
      websites = [];
    }
  }

  async function refreshActiveBurrow(): Promise<void> {
    try {
      const b = await chrome.runtime.sendMessage({
        type: MessageRequest.GET_ACTIVE_BURROW,
      });
      activeBurrow = b || {};
    } catch (e) {
      console.error("Failed to refresh active burrow:", e);
    }
  }

  async function refreshAllBurrowState(): Promise<void> {
    await refreshActiveBurrow();
    await Promise.all([
      loadWebsitesForActiveBurrow(),
      loadRabbitholesForActiveBurrow(),
    ]);
  }

  $: if (activeBurrow?.id) {
    loadRabbitholesForActiveBurrow();
  } else {
    rabbitholes = [];
  }

  function openAddToRabbitholeModal(): void {
    showAddToRabbitholeModal = true;
  }

  async function removeBurrowFromRabbithole(
    rabbitholeId: string,
  ): Promise<void> {
    if (!activeBurrow?.id || !rabbitholeId) return;

    const res = await chrome.runtime.sendMessage({
      type: MessageRequest.DELETE_BURROW_FROM_RABBITHOLE,
      rabbitholeId,
      burrowId: activeBurrow.id,
    });

    if (res && typeof res === "object" && "error" in res) {
      console.error("Failed to remove burrow from rabbithole:", res.error);
      return;
    }

    await loadRabbitholesForActiveBurrow();
  }

  async function updateBurrowHome(): Promise<void> {
    if (!activeBurrow?.id) return;

    isUpdatingBurrowHome = true;
    try {
      await chrome.runtime.sendMessage({
        type: MessageRequest.UPDATE_ACTIVE_TABS,
      });

      await new Promise((resolve) => setTimeout(resolve, 800));
      await refreshAllBurrowState();
    } catch (e) {
      console.error("Failed to update burrow home:", e);
    } finally {
      isUpdatingBurrowHome = false;
    }
  }

  async function saveWindowToBurrow(): Promise<void> {
    if (!activeBurrow?.id) return;

    isSavingWindowToBurrow = true;
    try {
      await chrome.runtime.sendMessage({
        type: MessageRequest.SAVE_WINDOW_TO_ACTIVE_BURROW,
      });

      await new Promise((resolve) => setTimeout(resolve, 800));
      await refreshAllBurrowState();
    } catch (e) {
      console.error("Failed to save window to burrow:", e);
    } finally {
      isSavingWindowToBurrow = false;
    }
  }

  async function deleteBurrow(): Promise<void> {
    if (!activeBurrow?.id) return;

    isDeletingBurrow = true;
    try {
      const res = await chrome.runtime.sendMessage({
        type: MessageRequest.DELETE_BURROW,
        burrowId: activeBurrow.id,
      });

      if (res && typeof res === "object" && "error" in res) {
        console.error("Failed to delete burrow:", res.error);
        return;
      }

      // Navigate back to home/rabbithole view
      await chrome.runtime.sendMessage({
        type: MessageRequest.CHANGE_ACTIVE_BURROW,
        burrowId: null,
      });

      // Reload the page to refresh state and show the grid view
      window.location.reload();
    } catch (e) {
      console.error("Failed to delete burrow:", e);
    } finally {
      isDeletingBurrow = false;
    }
  }

  async function renameBurrow(): Promise<void> {
    if (activeBurrow.name === "") {
      return;
    }
    dispatch("burrowRename", {
      newActiveBurrowName: activeBurrow.name,
    });
  }

  async function deleteWebsite(event: CustomEvent<any>): Promise<void> {
    dispatch("websiteDelete", {
      url: event.detail.url,
    });
  }

  async function updateWebsite(event: CustomEvent<any>): Promise<void> {
    const { url, name, description } = event.detail;
    try {
      await chrome.runtime.sendMessage({
        type: MessageRequest.UPDATE_WEBSITE,
        url,
        name,
        description,
      });

      // Update local state
      const index = websites.findIndex((w) => w.url === url);
      if (index !== -1) {
        websites[index] = { ...websites[index], name, description };
      }
    } catch (e) {
      console.error("Failed to update website:", e);
    }
  }

  function applySearchQuery(): void {
    const fuse = new Fuse(websites, {
      keys: ["name", "description", "url"],
      includeScore: true,
      threshold: 0.3,
    });

    const results = fuse.search(searchQuery);
    searchResults = results.map((res) => res.item);
  }

  function openPublishModal(): void {
    showPublishModal = true;
  }

  async function confirmPublish(): Promise<void> {
    await publishRabbithole();
    showPublishModal = false;
  }

  async function publishRabbithole(): Promise<void> {
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

  async function syncBurrow(): Promise<void> {
    if (!activeBurrow?.id || !activeBurrow?.sembleCollectionUri) return;

    isSyncing = true;
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageRequest.SYNC_BURROW,
        burrowId: activeBurrow.id,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      activeBurrow.lastSembleSync = response.timestamp;
    } catch (e) {
      console.error("Sync failed:", e);
      alert("Sync failed: " + e.message);
    } finally {
      isSyncing = false;
    }
  }

  function formatDate(ts: number): string {
    if (!ts) return "";
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(ts));
  }

  function formatDateTime(ts: number): string {
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

  function toTimeMs(value: Date): number {
    if (value === null || value === undefined) return null;

    if (typeof value === "number") {
      if (!Number.isFinite(value)) return null;
      // Heuristic: if it's in seconds, convert to ms
      return value < 10_000_000_000 ? value * 1000 : value;
    }

    if (value instanceof Date) {
      const t = value.getTime();
      return Number.isFinite(t) ? t : null;
    }

    if (typeof value === "string") {
      const t = new Date(value).getTime();
      return Number.isFinite(t) ? t : null;
    }

    return null;
  }

  function getWebsiteTimeMs(w): number {
    if (!w || typeof w !== "object") return null;

    const candidates = [
      w.savedAt,
      w.saved_at,
      w.createdAt,
      w.created_at,
      w.timestamp,
      w.time,
      w.date,
      w.saved,
      w.addedAt,
      w.added_at,
      w.indexedAt,
      w.indexed_at,
    ];

    for (const c of candidates) {
      const t = toTimeMs(c);
      if (t !== null) return t;
    }

    return null;
  }

  function dateKeyFromMs(ms: number): string {
    if (!ms) return "";
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function groupByDate(items): any[] {
    const map = new Map();
    for (const site of items) {
      const t = getWebsiteTimeMs(site);
      if (t === null) continue;
      const key = dateKeyFromMs(t);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(site);
    }

    const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
    return keys.map((key) => ({
      key,
      label: formatDate(
        map.get(key)[0] ? getWebsiteTimeMs(map.get(key)[0]) : null,
      ),
      items: map.get(key),
    }));
  }

  function isWithinRange(site): boolean {
    if (!startDate || !endDate) return true;
    const t = getWebsiteTimeMs(site);
    if (t === null) return false;
    return t >= startDate.getTime() && t <= endDate.getTime();
  }

  function getFullRange(items): { min: Date; max: Date } {
    if (!items || items.length === 0) return { min: null, max: null };
    const times = items.map(getWebsiteTimeMs).filter((t) => t !== null);
    if (times.length === 0) return { min: null, max: null };
    return {
      min: new Date(Math.min(...times)),
      max: new Date(Math.max(...times)),
    };
  }

  $: fullRange = getFullRange(websites);

  // Reset slider range when burrow/websites change
  $: if (websites.length !== previousWebsitesLength) {
    filteredWebsites = websites;
    searchResults = [];
    searchQuery = "";
    previousWebsitesLength = websites.length;

    // Reset slider to full range for the new dataset
    startDate = fullRange.min;
    endDate = fullRange.max;
  }

  // Compose filters: search + date window
  $: baseList = searchQuery.length < 3 ? filteredWebsites : searchResults;
  $: websitesToDisplay = baseList.filter(isWithinRange);

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

  function openSemble(): void {
    if (sembleUrl) {
      window.open(sembleUrl, "_blank");
    }
  }

  function showTimestamp(ts: number): void {
    hoveredTimestamp = ts;
    isHoveringTimestamp = true;
  }

  function clearTimestamp(): void {
    isHoveringTimestamp = false;
    hoveredTimestamp = null;
  }

  function updateHoverPosition(e: MouseEvent): void {
    hoverX = e.clientX;
    hoverY = e.clientY;
  }

  $: shouldShowRabbitholes = !showSearchBar;
  $: shouldShowBurrowHome = !showSearchBar;

  $: rabbitholesForActiveBurrow = rabbitholes;

  function toggleSearchBar(): void {
    showSearchBar = !showSearchBar;
    if (!showSearchBar) {
      searchQuery = "";
      searchResults = [];
    }
  }
</script>

<AddToRabbitholeModal
  bind:isOpen={showAddToRabbitholeModal}
  {activeBurrow}
  existingRabbitholes={rabbitholesForActiveBurrow}
  on:updated={async () => {
    await loadRabbitholesForActiveBurrow();
  }}
/>

<Modal
  isOpen={showPublishModal}
  title={sembleUrl ? "Update on Semble" : "Publish to Semble"}
  on:close={() => (showPublishModal = false)}
>
  <p>
    {sembleUrl
      ? "Update this collection on Semble with the latest changes?"
      : "Publish this rabbithole as a collection on Semble?"}
  </p>

  <div style="margin: 20px 0;">
    <CollapsibleContainer title="What is Semble?" defaultOpen={false}>
      <p><strong>A social knowledge network for researchers.</strong></p>
      <p>
        Follow your peers' research trails. Surface and discover new
        connections. Built on ATProto so you own your data.
      </p>

      <ul style="padding-left: 20px; margin-top: 10px; margin-bottom: 20px;">
        <li style="margin-bottom: 8px;">
          <strong>Curate your research trails.</strong> Collect interesting links,
          add notes, and organize them into shareable collections.
        </li>
        <li style="margin-bottom: 8px;">
          <strong>Connect with peers.</strong> See what your peers are sharing and
          find new collaborators with shared interests.
        </li>
        <li>
          <strong>Own your data.</strong> Built on ATProto, new apps will come to
          you. No more rebuilding your social graph and data when apps pivot and shut
          down.
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
    </CollapsibleContainer>
  </div>

  <Group position="right">
    <Button
      variant="subtle"
      color="gray"
      on:click={() => (showPublishModal = false)}>Cancel</Button
    >
    <Button on:click={confirmPublish} loading={isPublishing}>
      {sembleUrl ? "Update" : "Publish"}
    </Button>
  </Group>
</Modal>

<div class="timeline">
  <div class="header-section">
    <div class="title-row">
      <Tooltip {isHovering} label="Click to rename burrow" withArrow>
        <Input
          id="project-name"
          variant="unstyled"
          size="xl"
          class="project-name-input"
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

      {#if sembleUrl}
        <div class="sync-indicator">
          <Tooltip
            label={activeBurrow.lastSembleSync
              ? `Last synced: ${formatDateTime(activeBurrow.lastSembleSync)}. Click to sync.`
              : "Click to sync"}
            withArrow
          >
            <ActionIcon
              variant="transparent"
              color="orange"
              size="lg"
              on:click={syncBurrow}
              loading={isSyncing}
            >
              <Update size={20} />
            </ActionIcon>
          </Tooltip>
        </div>
      {/if}
    </div>

    <div class="action-bar">
      <Group spacing="xs">
        <!-- Sync Actions -->
        <Tooltip
          label="Sync open tabs with this burrow"
          withArrow
          transition="fade"
        >
          <ActionIcon
            size="xl"
            radius="md"
            variant="subtle"
            color="blue"
            on:click={saveWindowToBurrow}
            loading={isSavingWindowToBurrow}
            disabled={!activeBurrow?.id}
          >
            <Reload size={22} />
          </ActionIcon>
        </Tooltip>

        <div class="action-divider"></div>

        <Tooltip label="Update pinned websites" withArrow transition="fade">
          <ActionIcon
            size="xl"
            radius="md"
            variant="subtle"
            color="blue"
            on:click={updateBurrowHome}
            loading={isUpdatingBurrowHome}
            disabled={!activeBurrow?.id}
          >
            <Home size={22} />
          </ActionIcon>
        </Tooltip>

        <div class="action-divider"></div>

        <!-- Search -->
        <Tooltip label="Search within burrow" withArrow transition="fade">
          <ActionIcon
            size="xl"
            radius="md"
            variant={showSearchBar ? "light" : "subtle"}
            color="blue"
            on:click={toggleSearchBar}
            disabled={!activeBurrow?.id}
          >
            <MagnifyingGlass size={22} />
          </ActionIcon>
        </Tooltip>

        <div class="action-divider"></div>

        <!-- Semble Actions -->
        {#if sembleUrl}
          <Tooltip label="View on Semble" withArrow transition="fade">
            <ActionIcon
              size="xl"
              radius="md"
              variant="subtle"
              color="cyan"
              on:click={openSemble}
            >
              <Globe size={22} />
            </ActionIcon>
          </Tooltip>

          <div class="action-divider"></div>

          <Tooltip label="Update on Semble" withArrow transition="fade">
            <ActionIcon
              size="xl"
              radius="md"
              variant="subtle"
              color="orange"
              on:click={openPublishModal}
              loading={isPublishing}
              disabled={!activeBurrow?.id}
            >
              <Upload size={22} />
            </ActionIcon>
          </Tooltip>
        {:else}
          <Tooltip label="Publish Rabbithole" withArrow transition="fade">
            <ActionIcon
              size="xl"
              radius="md"
              variant="subtle"
              color="grape"
              on:click={openPublishModal}
              loading={isPublishing}
              disabled={!activeBurrow?.id}
            >
              <Rocket size={22} />
            </ActionIcon>
          </Tooltip>
        {/if}

        <div class="action-divider"></div>

        <!-- Delete -->
        <Tooltip label="Delete burrow" withArrow color="red" transition="fade">
          <ActionIcon
            size="xl"
            radius="md"
            variant="subtle"
            color="red"
            on:click={deleteBurrow}
            loading={isDeletingBurrow}
            disabled={!activeBurrow?.id}
          >
            <Trash size={22} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </div>

    {#if showSearchBar}
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
    {/if}
  </div>

  <div class="feed">
    {#if isLoading}
      <div class="loading-container">
        <Loader size="lg" variant="dots" />
        <Text size="md" color="dimmed" style="margin-top: 1rem;"
          >Loading websites...</Text
        >
      </div>
    {:else}
      {#if shouldShowRabbitholes}
        <div class="rabbitholes-collapsible">
          <CollapsibleContainer title="Rabbitholes" defaultOpen={false}>
            <RabbitholeGrid
              rabbitholes={rabbitholesForActiveBurrow}
              onSelect={selectRabbithole}
              horizontal={true}
              burrowShowAddRabbithole={true}
              burrowShowRemoveRabbithole={true}
              showBurrows={false}
              addTooltip="Add this burrow to another rabbithole"
              removeTooltip="Remove this burrow from this rabbithole"
              on:addBurrowToRabbithole={() => {
                openAddToRabbitholeModal();
              }}
              on:removeBurrowFromRabbithole={async (e) => {
                await removeBurrowFromRabbithole(e.detail.rabbitholeId);
              }}
            />
          </CollapsibleContainer>
        </div>
      {/if}

      {#if shouldShowBurrowHome}
        <BurrowHome
          bind:activeBurrow
          {websites}
          on:websiteUpdate={updateWebsite}
        />
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
                        showTimestamp(getWebsiteTimeMs(site));
                      }}
                      on:mousemove={updateHoverPosition}
                      on:mouseleave={clearTimestamp}
                    ></div>
                    <div
                      class="timeline-connector"
                      on:mouseenter={(e) => {
                        updateHoverPosition(e);
                        showTimestamp(getWebsiteTimeMs(site));
                      }}
                      on:mousemove={updateHoverPosition}
                      on:mouseleave={clearTimestamp}
                    ></div>

                    <div class="timeline-card-wrap">
                      <TimelineCard
                        website={site}
                        on:websiteDelete={deleteWebsite}
                        on:websiteUpdate={updateWebsite}
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
    transition:
      background-color 0.3s ease,
      color 0.3s ease;
  }

  .header-section {
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 40px;
    max-width: 800px;
  }

  .title-row {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 8px;
    position: relative;
  }

  .sync-indicator {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
  }

  .action-bar {
    display: flex;
    justify-content: center;
    margin-top: 12px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.03);
    border-radius: 12px;
    width: fit-content;
    margin-left: auto;
    margin-right: auto;
  }

  .action-divider {
    width: 1px;
    height: 24px;
    background-color: rgba(0, 0, 0, 0.1);
    margin: 0 8px;
  }

  :global(.project-name-input input) {
    text-align: center;
    font-weight: 700;
    font-size: 2rem !important;
    height: auto !important;
    padding: 0 !important;
  }

  .search-bar {
    margin: 18px 0 12px 0;
    width: 100%;
    max-width: 800px;
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
    z-index: 20;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
  }

  .timeline-dot:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.1),
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

  .rabbitholes-collapsible {
    margin-bottom: 30px;
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

  :global(body.dark-mode) .timeline-line {
    background: rgba(255, 255, 255, 0.14);
  }

  :global(body.dark-mode) .timeline-dot {
    background: rgba(255, 255, 255, 0.35);
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

  :global(body.dark-mode) .action-bar {
    background: rgba(255, 255, 255, 0.05);
  }

  :global(body.dark-mode) .action-divider {
    background-color: rgba(255, 255, 255, 0.1);
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
