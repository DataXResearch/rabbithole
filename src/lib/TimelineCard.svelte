<script>
  import { Badge, Button, Card, Group, Image, Text } from '@svelteuidev/core';

  export let website;
</script>

<Card shadow='sm' padding='lg' width="500px">
  <Card.Section first padding='lg'>
    <Image
      src={website.openGraphImageUrl}
      height={160}
      alt={website.title}
      />
  </Card.Section>

  <Group position='apart'>
    <Text weight={500}>{website.name}</Text>
    <!-- <Badge color='pink' variant='light'> -->
      <!-- On Sale -->
    <!-- </Badge> -->
  </Group>

  <Text size='sm'>{website.description}</Text>

  <Button variant='light' color='blue' href={website.url} target="_blank" fullSize>
    Open
  </Button>
</Card>
