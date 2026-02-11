<script>
  import { createEventDispatcher } from "svelte";
  import { Trash } from "radix-icons-svelte";

  export let rabbitholes = [];
  export let burrows = [];
  export let onSelect;

  export let horizontal = false;
  export let addTooltip = "add this burrow to another rabbithole";
  export let showBurrows = true;
  export let removeTooltip = "Remove this burrow from this rabbithole";

  // features for showing rabbithole grid within a burrow view
  export let burrowShowAddRabbithole = false;
  export let burrowShowRemoveRabbithole = false;
  
  // Feature to show a "Create New" card at the start
  export let allowCreate = false;
  
  // Feature to delete the rabbithole itself
  export let showDelete = false;

  const dispatch = createEventDispatcher();

  function burrowsFor(rabbithole) {
    if (!rabbithole?.burrows) return [];
    return burrows.filter((b) => rabbithole.burrows.includes(b.id));
  }
</script>

<div class="grid" class:horizontal>
  {#if allowCreate}
    <button
      type="button"
      class="card add-card"
      on:click={() => dispatch("createRabbithole")}
      title="Create new rabbithole"
      aria-label="Create new rabbithole"
    >
      <div class="add-plus">+</div>
      <div class="card-title" style="margin-top: 10px; font-size: 16px;">Create</div>
    </button>
  {/if}

  {#if burrowShowAddRabbithole}
    <button
      type="button"
      class="card add-card"
      on:click={() => dispatch("addBurrowToRabbithole")}
      title={addTooltip}
      aria-label={addTooltip}
    >
      <div class="add-plus">+</div>
    </button>
  {/if}

  {#each rabbitholes as rabbithole (rabbithole.id)}
    <button type="button" class="card" on:click={() => onSelect(rabbithole)}>
      {#if showDelete}
        <button
          type="button"
          class="remove-btn"
          title="Delete Rabbithole"
          aria-label="Delete Rabbithole"
          on:click|stopPropagation={() => dispatch("deleteRabbithole", { rabbitholeId: rabbithole.id })}
        >
          <Trash size="16" />
        </button>
      {/if}

      {#if burrowShowRemoveRabbithole}
        <button
          type="button"
          class="remove-btn"
          title={removeTooltip}
          aria-label={removeTooltip}
          on:click={(e) => {
            e.stopPropagation();
            dispatch("removeBurrowFromRabbithole", {
              rabbitholeId: rabbithole.id,
            });
          }}
        >
          <Trash size="16" />
        </button>
      {/if}

      <div class="card-title">{rabbithole.title || "Untitled"}</div>
      {#if showBurrows}
        <div class="burrow-preview">
          {#each burrowsFor(rabbithole).slice(0, 3) as burrow (burrow.id)}
            <div class="burrow-chip" title={burrow.name}>{burrow.name}</div>
          {/each}
          {#if burrowsFor(rabbithole).length === 0}
            <div class="burrow-empty">No burrows yet</div>
          {/if}
        </div>
      {/if}
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

  .grid.horizontal {
    display: flex;
    gap: 14px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 6px 0;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }

  .grid.horizontal::-webkit-scrollbar {
    height: 10px;
  }

  .grid.horizontal::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.12);
    border-radius: 999px;
  }

  :global(body.dark-mode) .grid.horizontal::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.14);
  }

  .card {
    position: relative;
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
    min-height: 170px;
  }

  .grid.horizontal .card {
    flex: 0 0 280px;
    min-height: 150px;
    scroll-snap-align: start;
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 22px rgba(0, 0, 0, 0.08);
    border-color: rgba(17, 133, 254, 0.35);
  }

  .remove-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 30px;
    height: 30px;
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(255, 255, 255, 0.9);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: rgba(0, 0, 0, 0.55);
    z-index: 2;
  }

  .remove-btn:hover {
    color: #e03131;
    border-color: rgba(224, 49, 49, 0.35);
    background: rgba(255, 245, 245, 0.9);
  }

  .card-title {
    font-weight: 900;
    font-size: 18px;
    color: #1a1b1e;
    margin-bottom: 14px;
    line-height: 1.2;
  }

  .burrow-preview {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .burrow-chip {
    border-radius: 12px;
    padding: 12px 14px;
    background: rgba(0, 0, 0, 0.03);
    border: 1px solid rgba(0, 0, 0, 0.06);
    color: #495057;
    font-size: 13px;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .burrow-empty {
    color: #868e96;
    font-size: 13px;
    padding: 12px 14px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.02);
    border: 1px dashed rgba(0, 0, 0, 0.12);
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
    .grid:not(.horizontal) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .grid:not(.horizontal) {
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

  :global(body.dark-mode) .card-title {
    color: #e7e7e7;
  }

  :global(body.dark-mode) .burrow-chip {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
    color: #c1c2c5;
  }

  :global(body.dark-mode) .burrow-empty {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.14);
    color: #909296;
  }

  :global(body.dark-mode) .add-plus {
    color: rgba(77, 171, 247, 0.95);
  }

  :global(body.dark-mode) .remove-btn {
    background: rgba(26, 27, 30, 0.9);
    border-color: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.65);
  }

  :global(body.dark-mode) .remove-btn:hover {
    color: #ff6b6b;
    border-color: rgba(255, 107, 107, 0.35);
    background: rgba(66, 0, 0, 0.25);
  }
</style>
