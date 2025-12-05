<script>
  import { onMount } from "svelte";
  import { NativeSelect } from "@svelteuidev/core";
  import { MessageRequest } from "../utils.ts";

  export let handleProjectChange;
  export let projects = [];
</script>

<div class="rabbithole-selector-container">
  <NativeSelect
    data={projects.map((p) => {
      return { label: p.name, value: p.id };
    })}
    on:change={handleProjectChange}
    width="100%"
    radius="md"
    size="sm"
    class="rabbithole-centered-select"
  />
</div>

<style>
  .rabbithole-selector-container {
    width: 100%;
  }

  /* Center text in the select element */
  :global(.rabbithole-centered-select select) {
    text-align: center;
    text-align-last: center;
  }
</style>
