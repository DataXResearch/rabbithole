<script>
  import { createEventDispatcher } from "svelte";
  import { Button, Card, Group, Text } from "@svelteuidev/core";
  import { Trash, ExternalLink } from "radix-icons-svelte";

  const dispatch = createEventDispatcher();

  export let website;
  export let showDelete = true;

  async function deleteWebsite() {
    dispatch("websiteDelete", {
      url: website.url,
    });
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
    <Group position="apart" noWrap align="start" style="margin-bottom: 16px;">
      <Text
        weight="bold"
        size="lg"
        lineClamp={1}
        title={website.name}
        class="card-title"
        style="flex: 1; padding-right: 8px;"
      >
        {website.name || "Untitled"}
      </Text>
    </Group>

    <!-- Body: Description -->
    <div class="description-container">
      <Text size="md" color="dimmed" lineClamp={4} style="line-height: 1.5;">
        {website.description || "No description available."}
      </Text>
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

  :global(body.dark-mode .timeline-card) {
    background-color: #25262b !important;
    border-color: #373a40 !important;
    color: #c1c2c5 !important;
  }

  /* Specific override for the title class */
  :global(body.dark-mode .timeline-card .card-title) {
    color: #e7e7e7 !important;
  }

  :global(body.dark-mode .timeline-card .mantine-Text-root) {
    color: #c1c2c5 !important;
  }

  :global(
    body.dark-mode .timeline-card .mantine-Text-root[data-color="dimmed"]
  ) {
    color: #909296 !important;
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
