<script lang="ts">
  import { onMount } from "svelte";
  import { Button, Group, Tooltip } from '@svelteuidev/core';
  import Options from "./Options.svelte";
  import { MessageRequest } from "../utils.ts"

  export let settings: Settings = {
    show: false,
    alignment: "right"
  };
  let isHovering = false;

  function changeAlignment(event) {
    if (settings.alignment === "left") {
      settings.alignment = "right";
    } else {
      settings.alignment = "left";
    }
    chrome.runtime.sendMessage({
      type: MessageRequest.UPDATE_SETTINGS,
      settings,
    });
  }

  async function hideOverlay(event) {
    if (settings.show === true) {
      settings.show = false;
    } else {
      settings.show = true;
    }
    chrome.runtime.sendMessage({
      type: MessageRequest.UPDATE_SETTINGS,
      settings,
    });
  }

  onMount(async () => {
    settings = await chrome.runtime.sendMessage({type: MessageRequest.GET_SETTINGS});
  });
</script>

<div>
  <Group position="center" spacing="md">
    <Button on:click={changeAlignment} id="move" variant='light' color='blue'>
      {#if settings.alignment === "right"}
        Move button left
      {:else}
        Move button right
      {/if}
    </Button>
    <Button
      on:click={hideOverlay}
      on:mouseenter={()=>{isHovering=true}}
      on:mouseleave={()=>{isHovering=false}}
      id="move"
      variant='light'
      color='blue'
      >
      {#if settings.show}
        Hide
      {:else}
        Show
      {/if}
    </Button>
  </Group>
</div>
