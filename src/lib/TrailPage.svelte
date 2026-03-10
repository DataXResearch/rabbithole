<script lang="ts">
  import { onMount } from "svelte";
  import { Loader } from "@svelteuidev/core";
  import { MessageRequest } from "../utils";
  import type { Trail, TrailWalk, Website } from "../utils/types";

  let trail: Trail | null = null;
  let walk: TrailWalk | null = null;
  let websites: Website[] = [];
  let isLoading = true;
  let showNoteModal = false;
  let currentNoteText = "";
  let noteAcknowledged = false;

  const params = new URLSearchParams(window.location.search);
  const trailId = params.get("trailId");

  onMount(async () => {
    if (!trailId) {
      isLoading = false;
      return;
    }
    await loadState();
    isLoading = false;
  });

  async function loadState() {
    const res = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_TRAIL_WALK_STATE,
      trailId,
    });
    trail = res.trail;
    walk = res.walk;
    websites = res.websites || [];
  }

  $: visitedCount = walk?.visitedStops?.length ?? 0;
  $: currentStop = trail?.stops?.[visitedCount] ?? null;
  $: isComplete =
    trail && visitedCount >= (trail.stops?.length ?? 0) && walk !== null;
  $: totalStops = trail?.stops?.length ?? 0;

  function getWebsite(url: string): Website | undefined {
    return websites.find((w) => w.url === url);
  }

  async function startWalk() {
    walk = await chrome.runtime.sendMessage({
      type: MessageRequest.START_TRAIL_WALK,
      trailId,
    });
    noteAcknowledged = false;
    currentNoteText = trail.startNote || "";
    if (currentNoteText) {
      showNoteModal = true;
    } else {
      noteAcknowledged = true;
    }
  }

  function acknowledgeNote() {
    showNoteModal = false;
    noteAcknowledged = true;
    const nextStop = trail?.stops[walk?.visitedStops?.length ?? 0];
    if (nextStop) {
      chrome.tabs.create({ url: nextStop.websiteUrl });
    }
  }

  async function advance() {
    if (!currentStop || !trail) return;
    walk = await chrome.runtime.sendMessage({
      type: MessageRequest.ADVANCE_TRAIL_WALK,
      trailId,
      websiteUrl: currentStop.websiteUrl,
    });
    noteAcknowledged = false;
    const nextStop = trail.stops[walk.visitedStops.length];
    if (nextStop) {
      currentNoteText = nextStop.note || "";
      if (currentNoteText) {
        showNoteModal = true;
      } else {
        noteAcknowledged = true;
        chrome.tabs.create({ url: nextStop.websiteUrl });
      }
    } else {
      await chrome.runtime.sendMessage({
        type: MessageRequest.COMPLETE_TRAIL_WALK,
        trailId,
      });
      await loadState();
    }
  }

  async function abandon() {
    if (!confirm("Abandon this trail walk?")) return;
    await chrome.runtime.sendMessage({
      type: MessageRequest.ABANDON_TRAIL_WALK,
      trailId,
    });
    walk = null;
    noteAcknowledged = false;
  }
</script>

<div class="trail-page">
  {#if isLoading}
    <div class="center"><Loader size="lg" variant="dots" /></div>
  {:else if !trail}
    <div class="center"><h2>Trail not found.</h2></div>
  {:else if isComplete}
    <div class="center complete">
      <div class="complete-icon">🎉</div>
      <h2>Trail Complete!</h2>
      <p>You've finished <strong>{trail.name}</strong>.</p>
      <button class="primary-btn" on:click={startWalk}>Walk Again</button>
    </div>
  {:else if !walk}
    <div class="start-state">
      <h1>{trail.name}</h1>
      <p class="subtitle">
        {trail.stops.length} stop{trail.stops.length !== 1 ? "s" : ""} on this trail
      </p>
      {#if trail.startNote}
        <div class="note-preview">
          <div class="note-label">Starting note</div>
          <div class="note-text">{trail.startNote}</div>
        </div>
      {/if}
      <div class="stops-list">
        {#each trail.stops as stop, i}
          <div class="stop-row">
            <div class="stop-num">{i + 1}</div>
            <div class="stop-name">
              {getWebsite(stop.websiteUrl)?.name ?? stop.websiteUrl}
            </div>
          </div>
        {/each}
      </div>
      <button class="primary-btn large" on:click={startWalk}>Start Trail</button
      >
    </div>
  {:else}
    <div class="walk-state">
      <div class="walk-header">
        <h1>{trail.name}</h1>
        <div class="progress-dots">
          {#each trail.stops as stop, i}
            <div
              class="dot"
              class:visited={walk.visitedStops.includes(stop.websiteUrl)}
              class:current={i === visitedCount}
            ></div>
          {/each}
        </div>
        <div class="progress-label">{visitedCount} / {totalStops}</div>
      </div>

      {#if currentStop}
        <div class="stop-badge">Stop {visitedCount + 1} of {totalStops}</div>
        {#if getWebsite(currentStop.websiteUrl)}
          {@const site = getWebsite(currentStop.websiteUrl)}
          <div class="site-card">
            {#if site.openGraphImageUrl}
              <img
                src={site.openGraphImageUrl}
                alt={site.name}
                class="site-image"
              />
            {/if}
            <div class="site-info">
              <h2>{site.name}</h2>
              {#if site.description}<p>{site.description}</p>{/if}
              <a href={site.url} target="_blank" rel="noopener noreferrer"
                >{site.url}</a
              >
            </div>
          </div>
        {:else}
          <div class="site-card">
            <div class="site-info">
              <a
                href={currentStop.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {currentStop.websiteUrl}
              </a>
            </div>
          </div>
        {/if}
        <div class="walk-actions">
          <button class="abandon-btn" on:click={abandon}>Abandon</button>
          <button class="primary-btn" on:click={advance}>
            {visitedCount + 1 < totalStops ? "Next Stop →" : "Complete Trail ✓"}
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

{#if showNoteModal}
  <div class="note-modal-overlay">
    <div class="note-modal">
      <div class="note-modal-label">
        {visitedCount === 0
          ? "Before you begin..."
          : `Before stop ${visitedCount + 1}...`}
      </div>
      <p class="note-modal-text">{currentNoteText}</p>
      <button class="primary-btn" on:click={acknowledgeNote}>OK</button>
    </div>
  </div>
{/if}

<style>
  .trail-page {
    min-height: 100vh;
    background: #f8f9fa;
    padding: 48px 24px;
    font-family: inherit;
    box-sizing: border-box;
  }
  .center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 16px;
    text-align: center;
  }
  .complete-icon {
    font-size: 64px;
  }
  .start-state,
  .walk-state {
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  h1 {
    font-size: 32px;
    font-weight: 900;
    color: #1a1b1e;
    margin: 0;
  }
  h2 {
    font-size: 22px;
    font-weight: 800;
    color: #1a1b1e;
    margin: 0;
  }
  .subtitle {
    color: #868e96;
    font-size: 16px;
    margin: 0;
  }
  .note-preview {
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    padding: 16px 20px;
  }
  .note-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #868e96;
    margin-bottom: 8px;
  }
  .note-text {
    font-size: 15px;
    color: #1a1b1e;
    line-height: 1.6;
  }
  .stops-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .stop-row {
    display: flex;
    align-items: center;
    gap: 14px;
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 10px;
    padding: 14px 18px;
  }
  .stop-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #1185fe;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 13px;
    flex-shrink: 0;
  }
  .stop-name {
    font-weight: 600;
    color: #1a1b1e;
    font-size: 14px;
  }
  .walk-header {
    text-align: center;
  }
  .progress-dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin: 16px 0 8px;
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #dee2e6;
    transition: all 0.2s;
  }
  .dot.visited {
    background: #1185fe;
  }
  .dot.current {
    background: #1185fe;
    box-shadow: 0 0 0 3px rgba(17, 133, 254, 0.3);
    transform: scale(1.3);
  }
  .progress-label {
    font-size: 13px;
    color: #868e96;
    font-weight: 600;
  }
  .stop-badge {
    display: inline-block;
    background: rgba(17, 133, 254, 0.1);
    color: #1185fe;
    font-weight: 700;
    font-size: 13px;
    padding: 6px 16px;
    border-radius: 999px;
    align-self: center;
  }
  .site-card {
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 16px;
    overflow: hidden;
  }
  .site-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }
  .site-info {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .site-info h2 {
    font-size: 20px;
  }
  .site-info p {
    font-size: 14px;
    color: #495057;
    line-height: 1.6;
    margin: 0;
  }
  .site-info a {
    font-size: 13px;
    color: #1185fe;
    text-decoration: none;
    word-break: break-all;
  }
  .walk-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .primary-btn {
    background: #1185fe;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
  }
  .primary-btn:hover {
    background: #0070e0;
  }
  .primary-btn.large {
    padding: 16px 32px;
    font-size: 17px;
    align-self: center;
  }
  .abandon-btn {
    background: none;
    border: none;
    color: #e03131;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    padding: 8px 16px;
    border-radius: 8px;
    transition: background 0.2s;
  }
  .abandon-btn:hover {
    background: rgba(224, 49, 49, 0.08);
  }
  .note-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(4px);
  }
  .note-modal {
    background: #fff;
    border-radius: 16px;
    padding: 32px;
    max-width: 480px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: popIn 0.2s ease-out;
  }
  @keyframes popIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  .note-modal-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #868e96;
    letter-spacing: 0.05em;
  }
  .note-modal-text {
    font-size: 18px;
    line-height: 1.6;
    color: #1a1b1e;
    margin: 0;
    white-space: pre-wrap;
  }
</style>
