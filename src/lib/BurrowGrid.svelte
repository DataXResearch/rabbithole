<script lang="ts">
  import { Burrow } from "src/storage/db";
  import { createEventDispatcher } from "svelte";
  export let burrows: any[] = [];
  export let selectedBurrowId: string = null;
  export let onSelect: (burrow: Burrow) => Promise<void>;
  export let allowCreate: boolean = false;

  const dispatch = createEventDispatcher();

  function handleSelect(burrow: Burrow): void {
    if (onSelect) {
      onSelect(burrow);
    }
  }
</script>

<div class="grid">
  {#if allowCreate}
    <button
      type="button"
      class="card add-card"
      on:click={() => dispatch("createBurrow")}
      title="Create new burrow"
      aria-label="Create new burrow"
    >
      <div class="add-plus">+</div>
      <div class="card-title" style="margin-top: 10px; font-size: 16px;">
        Create
      </div>
    </button>
  {/if}

  {#each burrows as burrow (burrow.id)}
    <button
      type="button"
      class="card"
      class:selected={burrow.id === selectedBurrowId}
      on:click={() => handleSelect(burrow)}
    >
      <div class="card-title">{burrow.name || "Untitled"}</div>
      <div class="card-meta">
        <div class="meta-item">
          {burrow.websites?.length || 0} website{(burrow.websites?.length ||
            0) === 1
            ? ""
            : "s"}
        </div>
      </div>
    </button>
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    width: 100%;
  }

  .card {
    text-align: left;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: #ffffff;
    border-radius: 16px;
    padding: 22px;
    cursor: pointer;
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease,
      border-color 0.15s ease;
    min-height: 120px;
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 22px rgba(0, 0, 0, 0.08);
    border-color: rgba(17, 133, 254, 0.35);
  }

  .card.selected {
    border-color: rgba(17, 133, 254, 0.6);
    background: rgba(17, 133, 254, 0.05);
  }

  .card-title {
    font-weight: 900;
    font-size: 18px;
    color: #1a1b1e;
    margin-bottom: 14px;
    line-height: 1.2;
  }

  .card-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .meta-item {
    font-size: 13px;
    color: #868e96;
    font-weight: 600;
  }

  .add-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .add-plus {
    font-size: 44px;
    font-weight: 900;
    color: rgba(17, 133, 254, 0.9);
    line-height: 1;
    transform: translateY(-2px);
  }

  @media (max-width: 980px) {
    .grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  :global(body.dark-mode) .card {
    background: #25262b;
    border-color: rgba(255, 255, 255, 0.12);
  }

  :global(body.dark-mode) .card:hover {
    border-color: rgba(77, 171, 247, 0.45);
    box-shadow: 0 12px 22px rgba(0, 0, 0, 0.35);
  }

  :global(body.dark-mode) .card.selected {
    border-color: rgba(77, 171, 247, 0.7);
    background: rgba(77, 171, 247, 0.08);
  }

  :global(body.dark-mode) .card-title {
    color: #e7e7e7;
  }

  :global(body.dark-mode) .meta-item {
    color: #909296;
  }

  :global(body.dark-mode) .add-plus {
    color: rgba(77, 171, 247, 0.95);
  }
</style>
