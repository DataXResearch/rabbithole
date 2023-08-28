<script lang="ts">
  import { onMount } from "svelte";
  import Options from "./Options.svelte";

  let count = 0;
</script>

<div class="overlay">
  <Options {count} />
</div>

<style>
  .overlay {
    width: 250px;
    height: 125px;
    position: fixed;
    bottom: 16px;
    right: 16px;
    background-color: white;
    border: 1px solid black;
    padding: 4px;
  }
</style>
