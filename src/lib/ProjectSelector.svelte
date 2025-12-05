<script>
  import { onMount } from "svelte";
  import { NativeSelect } from "@svelteuidev/core";
  import { MessageRequest } from "../utils.ts";

  export let handleProjectChange;
  export let projects = [];
</script>

<div class="selector-container">
  <NativeSelect
    data={projects.map((p) => {
      return { label: p.name, value: p.id };
    })}
    on:change={handleProjectChange}
    width="100%"
    radius="md"
    size="sm"
    class="centered-select"
  />
</div>

<style>
  .selector-container {
    width: 100%;
  }

  /* Center text in the select element */
  :global(.centered-select select) {
    text-align: center;
    text-align-last: center;
  }
</style>
