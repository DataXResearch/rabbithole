<script>
  import { createEventDispatcher } from "svelte";

  export let title = "";
  export let defaultOpen = true;
  export let open = undefined; // optional controlled mode
  export let collapsible = true;

  // Optional: allow consumers to override title styling without breaking defaults
  export let titleClass = "";

  const dispatch = createEventDispatcher();

  let internalOpen = defaultOpen;

  $: isOpen = typeof open === "boolean" ? open : internalOpen;

  function toggle() {
    if (!collapsible) return;

    const next = !isOpen;
    if (typeof open !== "boolean") {
      internalOpen = next;
    }
    dispatch("toggle", { open: next });
  }
</script>

<div class="container">
  <button
    type="button"
    class="header"
    on:click={toggle}
    aria-expanded={isOpen}
    disabled={!collapsible}
  >
    <div class="title {titleClass}">{title}</div>
    {#if collapsible}
      <div class="chevron" aria-hidden="true">
        {#if isOpen}
          <span class="chevron-icon">▾</span>
        {:else}
          <span class="chevron-icon">▸</span>
        {/if}
      </div>
    {/if}
  </button>

  {#if !collapsible || isOpen}
    <div class="content">
      <slot />
    </div>
  {/if}
</div>

<style>
  .container {
    border-radius: 16px;
    border: 2px dashed rgba(0, 0, 0, 0.12);
    background: rgba(0, 0, 0, 0.02);
    overflow: hidden;
  }

  .header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    background: transparent;
    border: 0;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.15s ease;
  }

  .header:hover {
    background: rgba(0, 0, 0, 0.03);
  }

  .header:disabled {
    cursor: default;
    opacity: 1;
  }

  /* Match BurrowHome title formatting (as requested) */
  .title {
    font-weight: 700;
    font-size: 1.125rem;
    color: rgba(0, 0, 0, 0.55);
    letter-spacing: 0;
    transition: color 0.15s ease;
  }

  /* Hover highlighting like BurrowHome had */
  .header:hover .title {
    color: rgba(0, 0, 0, 0.75);
  }

  .chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(0, 0, 0, 0.55);
    font-size: 14px;
    line-height: 1;
    min-width: 18px;
  }

  .chevron-icon {
    display: inline-block;
    transform: translateY(-1px);
  }

  .content {
    padding: 16px 16px 16px 16px;
  }

  :global(body.dark-mode) .container {
    border-color: rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.03);
  }

  :global(body.dark-mode) .header:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  :global(body.dark-mode) .title {
    color: rgba(255, 255, 255, 0.65);
  }

  :global(body.dark-mode) .header:hover .title {
    color: rgba(255, 255, 255, 0.85);
  }

  :global(body.dark-mode) .chevron {
    color: rgba(255, 255, 255, 0.6);
  }
</style>
