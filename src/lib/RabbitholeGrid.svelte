<script>
  export let rabbitholes = [];
  export let burrows = [];
  export let onSelect;

  function burrowsFor(rabbithole) {
    if (!rabbithole?.burrows) return [];
    return burrows.filter((b) => rabbithole.burrows.includes(b.id));
  }
</script>

<div class="grid">
  {#each rabbitholes as rabbithole (rabbithole.id)}
    <button type="button" class="card" on:click={() => onSelect(rabbithole)}>
      <div class="card-title">{rabbithole.title || "Untitled"}</div>
      <div class="burrow-preview">
        {#each burrowsFor(rabbithole).slice(0, 3) as burrow (burrow.id)}
          <div class="burrow-chip" title={burrow.name}>{burrow.name}</div>
        {/each}
        {#if burrowsFor(rabbithole).length === 0}
          <div class="burrow-empty">No burrows yet</div>
        {/if}
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
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    min-height: 170px;
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 22px rgba(0, 0, 0, 0.08);
    border-color: rgba(17, 133, 254, 0.35);
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
</style>
