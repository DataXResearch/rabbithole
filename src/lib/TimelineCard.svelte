<script>
  import { createEventDispatcher } from "svelte";
  import { Button, Card, Group, Tooltip } from "@svelteuidev/core";
  import { Trash, ExternalLink } from "radix-icons-svelte";

  const dispatch = createEventDispatcher();

  export let website;
  export let showDelete = true;

  let isHoveringTitle = false;
  let isHoveringDesc = false;

  async function deleteWebsite() {
    dispatch("websiteDelete", {
      url: website.url,
    });
  }

  function handleUpdate() {
    dispatch("websiteUpdate", {
      url: website.url,
      name: website.name,
      description: website.description
    });
  }

  function autoResize(node) {
    const resize = () => {
      node.style.height = 'auto';
      node.style.height = node.scrollHeight + 'px';
    };
    node.addEventListener('input', resize);
    
    // Wait for next tick to ensure value is populated and layout is done
    setTimeout(resize, 0);
    
    return {
      destroy() {
        node.removeEventListener('input', resize);
      }
    };
  }
</script>

<div class="card-container">
  <Card shadow="sm" padding="lg" radius="md" class="timeline-card" withBorder>
    {#if showDelete}
      <button
        type="button"
        class="remove-btn"
        title="Delete"
        aria-label="Delete"
        on:click={deleteWebsite}
      >
        <Trash size="16" />
      </button>
    {/if}

    <!-- Header: Title -->
    <Group position="apart" noWrap align="start" style="margin-bottom: 8px; padding-right: 24px;">
        <div 
            class="title-wrapper"
            on:mouseenter={() => isHoveringTitle = true}
            on:mouseleave={() => isHoveringTitle = false}
        >
            <Tooltip label="Click to change title" withArrow opened={isHoveringTitle} allowPointerEvents={false} style="width: 100%;">
                 <input
                    type="text"
                    class="card-title-input"
                    bind:value={website.name}
                    on:blur={handleUpdate}
                    on:keydown={(e) => e.key === "Enter" && e.target.blur()} 
                 />
            </Tooltip>
        </div>
    </Group>

    <!-- Body: Description -->
    <div 
        class="description-container"
        on:mouseenter={() => isHoveringDesc = true}
        on:mouseleave={() => isHoveringDesc = false}
    >
        <Tooltip label="Click to change description" withArrow opened={isHoveringDesc} allowPointerEvents={false} style="width: 100%;">
             <textarea
                use:autoResize
                class="card-desc-input"
                bind:value={website.description}
                on:blur={handleUpdate}
                placeholder="No description available."
                rows="2"
             ></textarea>
        </Tooltip>
    </div>

    <!-- Footer: Action Button -->
    <div style="margin-top: 24px;">
      <Button
        variant="light"
        color="blue"
        href={website.url}
        target="_blank"
        fullWidth
        rightIcon={ExternalLink}
      >
        Open
      </Button>
    </div>
  </Card>
</div>

<style>
  .card-container {
    width: 100%;
    padding: 6px 0;
  }

  .description-container {
    min-height: 60px;
    width: 100%;
  }

  /* Ensure Tooltip wrapper takes full width */
  .title-wrapper :global(.mantine-Tooltip-root),
  .description-container :global(.mantine-Tooltip-root) {
    width: 100%;
    display: block;
  }

  :global(.timeline-card) {
    position: relative;
    background-color: #ffffff;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  :global(.timeline-card:hover) {
    transform: translateY(-2px);
    box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  /* Match RabbitholeGrid delete button style */
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

  .title-wrapper {
      flex: 1;
      width: 100%;
  }

  .card-title-input {
      width: 100%;
      border: none;
      background: transparent;
      font-family: inherit;
      font-weight: 700;
      font-size: 1.25rem; /* 20px */
      color: #1a1b1e;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
      text-overflow: ellipsis;
  }

  .card-title-input:hover,
  .card-title-input:focus {
      background-color: rgba(0, 0, 0, 0.05);
      outline: none;
  }

  .card-desc-input {
      width: 100%;
      border: none;
      background: transparent;
      font-family: inherit;
      font-size: 0.95rem;
      color: #868e96;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
      resize: none;
      line-height: 1.5;
      display: block;
  }

  .card-desc-input:hover,
  .card-desc-input:focus {
      background-color: rgba(0, 0, 0, 0.05);
      outline: none;
      color: #495057; /* Darker text on focus/hover for better readability */
  }

  /* Dark mode styles */
  :global(body.dark-mode .timeline-card) {
    background-color: #25262b !important;
    border-color: #373a40 !important;
    color: #c1c2c5 !important;
  }

  :global(body.dark-mode) .card-title-input {
      color: #e7e7e7;
  }

  :global(body.dark-mode) .card-title-input:hover,
  :global(body.dark-mode) .card-title-input:focus {
      background-color: rgba(255, 255, 255, 0.1);
  }
  
  :global(body.dark-mode) .card-desc-input {
      color: #909296;
  }

  :global(body.dark-mode) .card-desc-input:hover,
  :global(body.dark-mode) .card-desc-input:focus {
      background-color: rgba(255, 255, 255, 0.1);
      color: #c1c2c5;
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
