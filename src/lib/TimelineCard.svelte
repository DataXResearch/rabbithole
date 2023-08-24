<script>
  import { Card, Button, Toggle } from 'flowbite-svelte';
  import { Icon } from 'flowbite-svelte-icons';

  export let title = "Title";
  export let description = "Loading..."
  export let href = "";

  let hCard = false;
</script>

<div>
  <Card img="/images/gov.jpeg" href="/" horizontal reverse={hCard}  class="mb-4">
    <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h5>
    <p class="mb-3 font-normal text-gray-700 dark:text-gray-400 leading-tight">{description}</p>
    <Button {href} target="_blank">
      Read more <Icon name="arrow-right-outline" class="w-3.5 h-3.5 ml-2 text-white" />
    </Button>
  </Card>
</div>
