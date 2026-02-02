<script>
  export let burrows = [];
  export let selectedBurrowId = null;
  export let onSelect;
</script>

<div class="grid">
  {#each burrows as burrow (burrow.id)}
    <button
      type="button"
      class="card"
      class:selected={selectedBurrowId === burrow.id}
      on:click={() => onSelect(burrow)}
    >
      <div class="card-title" title={burrow.name}>{burrow.name || "Untitled"}</div>
    </button>
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    width: 100%;
    margin-bottom: 22px;
  }

  .card {
    text-align: left;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: #ffffff;
    border-radius: 16px;
    padding: 22px;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    min-height: 110px;
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 22px rgba(0, 0, 0, 0.08);
    border-color: rgba(17, 133, 254, 0.35);
  }

  .card.selected {
    border-color: rgba(17, 133, 254, 0.9);
    box-shadow: 0 12px 22px rgba(17, 133, 254, 0.12);
  }

  .card-title {
    font-weight: 900;
    font-size: 18px;
    color: #1a1b1e;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    border-color: rgba(77, 171, 247, 0.95);
    box-shadow: 0 12px 22px rgba(77, 171, 247, 0.18);
  }

  :global(body.dark-mode) .card-title {
    color: #e7e7e7;
  }
</style>
