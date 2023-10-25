<script>
  import { Button, Card, Group, Image, Text } from "@svelteuidev/core";

  export let website;
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

    <Button variant="light" color="blue" href={website.url} target="_blank" fullSize>
      Open
    </Button>
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
