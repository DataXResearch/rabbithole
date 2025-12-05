<script>
  import { createEventDispatcher } from "svelte";
  import { Button, Card, Group, Text, ActionIcon, Tooltip } from "@svelteuidev/core";
  import { Trash, ExternalLink } from "radix-icons-svelte";

  const dispatch = createEventDispatcher();

  export let website;

  async function deleteWebsite() {
    dispatch("websiteDelete", {
      url: website.url,
    });
  }
</script>

<div class="card-container">
  <Card shadow="sm" padding="lg" radius="md" class="timeline-card" withBorder>
    <!-- Header: Title and Actions -->
    <Group position="apart" noWrap align="start" style="margin-bottom: 16px;">
      <Text weight="bold" size="lg" lineClamp={1} title={website.name} class="card-title" style="flex: 1; padding-right: 8px;">
        {website.name || "Untitled"}
      </Text>
      
      <Tooltip label="Delete" withArrow position="left">
        <ActionIcon 
          variant="subtle" 
          color="red" 
          on:click={deleteWebsite}
          size="md"
        >
          <Trash size="18" />
        </ActionIcon>
      </Tooltip>
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
  }

  .description-container {
    min-height: 60px;
  }

  :global(.timeline-card) {
    background-color: #ffffff;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  :global(.timeline-card:hover) {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
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
  
  :global(body.dark-mode .timeline-card .mantine-Text-root[data-color="dimmed"]) {
    color: #909296 !important;
  }
</style>
