<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Trail, Website } from "src/utils/types";
  import TimelineCard from "./TimelineCard.svelte";
  import { Button } from "@svelteuidev/core";
  import TrailNoteModal from "./TrailNoteModal.svelte";

  export let trail: Trail;
  export let websites: Website[];

  const dispatch = createEventDispatcher();

  let isEditing = false;
  let editingNoteIndex: number | null = null;
  let showNoteModal = false;

  function getWebsite(url: string) {
    return websites.find((w) => w.url === url);
  }

  function editNote(index: number) {
    if (!isEditing) return;
    editingNoteIndex = index;
    showNoteModal = true;
  }

  function saveNote(event: CustomEvent<{ note: string }>) {
    const newNote = event.detail.note;
    if (editingNoteIndex === -1) {
      trail.startNote = newNote;
    } else if (editingNoteIndex !== null) {
      trail.stops[editingNoteIndex].note = newNote;
    }
    showNoteModal = false;
    editingNoteIndex = null;
  }

  function toggleEdit() {
    if (isEditing) {
      isEditing = false;
      dispatch("save", { trail });
    } else {
      isEditing = true;
    }
  }

  async function startTrail() {
    const trailPageUrl = chrome.runtime.getURL(
      `src/trail/trail.html?trailId=${trail.id}`,
    );
    window.open(trailPageUrl, "_blank");
  }
</script>

<TrailNoteModal
  isOpen={showNoteModal}
  initialNote={editingNoteIndex === -1
    ? trail.startNote
    : editingNoteIndex !== null
      ? trail.stops[editingNoteIndex].note
      : ""}
  on:save={saveNote}
  on:close={() => (showNoteModal = false)}
/>

<div class="trail-view">
  <div class="trail-header">
    <h2 class="trail-title">{trail.name}</h2>
    <div class="header-actions">
      <Button variant="light" color="blue" on:click={startTrail}
        >Start Trail</Button
      >
      <Button variant={isEditing ? "filled" : "light"} on:click={toggleEdit}>
        {isEditing ? "Done" : "Edit"}
      </Button>
    </div>
  </div>

  <div class="trail-nodes">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="note-node"
      class:editing={isEditing}
      on:click={() => isEditing && editNote(-1)}
    >
      <div class="note-content">
        {trail.startNote || (isEditing ? "Add a starting note..." : "")}
      </div>
    </div>

    {#each trail.stops as stop, i}
      <div class="trail-edge"></div>
      <div class="website-node">
        {#if getWebsite(stop.websiteUrl)}
          <TimelineCard
            website={getWebsite(stop.websiteUrl)}
            showDelete={false}
          />
        {:else}
          <div class="missing-site">{stop.websiteUrl}</div>
        {/if}
      </div>
      <div class="trail-edge"></div>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="note-node"
        class:editing={isEditing}
        on:click={() => isEditing && editNote(i)}
      >
        <div class="note-content">
          {stop.note || (isEditing ? "Add a note..." : "")}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .trail-view {
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
    padding-bottom: 64px;
  }
  .trail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
  }
  .header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .trail-title {
    font-size: 20px;
    font-weight: 800;
    color: #1a1b1e;
    margin: 0;
  }
  .trail-nodes {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .note-node {
    width: 100%;
    background: #f8f9fa;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    padding: 16px 20px;
    font-size: 15px;
    line-height: 1.5;
    color: #495057;
    text-align: center;
    transition: all 0.2s;
  }
  .note-node.editing {
    cursor: pointer;
    border: 1px dashed #1185fe;
    background: rgba(17, 133, 254, 0.05);
  }
  .note-node.editing:hover {
    background: rgba(17, 133, 254, 0.1);
  }
  .trail-edge {
    width: 2px;
    height: 32px;
    background: rgba(0, 0, 0, 0.12);
    margin: 8px 0;
  }
  .website-node {
    width: 100%;
  }
  .missing-site {
    padding: 24px;
    text-align: center;
    background: #fff5f5;
    color: #e03131;
    border-radius: 12px;
    border: 1px solid rgba(224, 49, 49, 0.2);
  }
  :global(body.dark-mode) .trail-title {
    color: #e7e7e7;
  }
  :global(body.dark-mode) .note-node {
    background: #25262b;
    border-color: rgba(255, 255, 255, 0.12);
    color: #c1c2c5;
  }
  :global(body.dark-mode) .note-node.editing {
    border-color: #4dabf7;
    background: rgba(77, 171, 247, 0.05);
  }
  :global(body.dark-mode) .note-node.editing:hover {
    background: rgba(77, 171, 247, 0.1);
  }
  :global(body.dark-mode) .trail-edge {
    background: rgba(255, 255, 255, 0.14);
  }
  :global(body.dark-mode) .missing-site {
    background: rgba(224, 49, 49, 0.1);
    border-color: rgba(224, 49, 49, 0.2);
    color: #ff8787;
  }
</style>
