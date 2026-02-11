<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Button } from "@svelteuidev/core";
  import { Bookmark } from "radix-icons-svelte";

  const dispatch = createEventDispatcher();

  function save() {
    dispatch("save");
  }
</script>

<div class="rabbithole-container">
  <Button
    on:click={save}
    size="sm"
    color="blue"
    leftIcon={Bookmark}
  >
    Save Website
  </Button>
</div>

<style>
  .rabbithole-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>
