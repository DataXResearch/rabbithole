<script>
  import { createEventDispatcher } from "svelte";
  import { Button, Card, Group, Image, Text } from "@svelteuidev/core";
  import { Trash } from "radix-icons-svelte";

  const dispatch = createEventDispatcher();

  export let website;

  async function deleteWebsite() {
    dispatch("websiteDelete", {
      url: website.url,
    });
  }
</script>

<div class="card-container">
  <Card shadow="lg" padding="lg">
    <!-- TODO: figure out card image display by avoiding rate limited API calls -->
    <!-- <Card.Section first padding="lg"> -->
    <!-- <Image -->
    <!-- src={website.openGraphImageUrl} -->
    <!-- height={160} -->
    <!-- alt={website.title} -->
    <!-- /> -->
    <!-- </Card.Section> -->

    <Text weight="bold" size="xl">{website.name}</Text>

    <div class="website-description">
      <Text size="lg">{website.description}</Text>
    </div>

    <Group spacing="xs">
      <Button
        variant="light"
        color="blue"
        href={website.url}
        target="_blank"
        override={{ width: "85%" }}
      >
        Open
      </Button>
      <Button
        on:click={deleteWebsite}
        variant="light"
        color="red"
        override={{ width: "10%" }}
      >
        <Trash size="30" />
      </Button>
    </Group>
  </Card>
</div>

<style>
  .card-container {
    margin-top: 20px;
  }

  .website-description {
    margin: 20px auto;
  }
</style>
