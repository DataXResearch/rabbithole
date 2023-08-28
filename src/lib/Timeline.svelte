<script>
  import { onMount } from "svelte";
  import { Badge, Button, Card, Group, Image, Text } from '@svelteuidev/core';
  import { MessageRequest } from "../utils"
  import TimelineCard from "src/lib/TimelineCard.svelte";

  let websites = [];
  let loading = true;

  onMount(async () => {
    websites = await chrome.runtime.sendMessage({type: MessageRequest.GET_ALL_ITEMS});
    loading = false;
  });
</script>

<div class="timeline">
  <img src="../assets/icons/logo.png">
  <div>
    </div>
  <div class="feed">
  {#if !loading}
    {#each websites as site}
      <div>
        <h3>{site.name}</h3>
      </div>
      <TimelineCard website={site} />
    {/each}
  {:else}
    <p> Loading... </p>
  {/if}
</div>
</div>

<style>
  .timeline {
    width: 50vw;
    margin: 0 auto;
  }
</style>
