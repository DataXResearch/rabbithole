<script lang="ts">
  import { onMount } from "svelte";
  import Options from "./Options.svelte";
  import { Button, Group, Tooltip } from '@svelteuidev/core';

  let show = true;
  let isHovering = false;
  let count = 0;
  let alignment = "right"

  function changeAlignment(event) {
    if (alignment === "left") {
      alignment = "right";
    } else {
      alignment = "left";
    }
  }

  function hideOverlay(event) {
    show = false;
  }
</script>

{#if show}
  <div id="overlay-container" class="overlay {alignment}">
    <div class="buttons">
      <Group position="center" spacing="md">
        <Button on:click={changeAlignment} id="move" variant='light' color='blue'>
          Move
        </Button>

        <Tooltip {isHovering} label="You can unhide from the newtab page">
          <Button
            on:click={hideOverlay}
            on:mouseenter={()=>{isHovering=true}}
            on:mouseleave={()=>{isHovering=false}}
            id="move"
            variant='light'
            color='blue'
            >
            Hide
          </Button>
        </Tooltip>
      </Group>
    </div>
    <div>
      <Options {count} />
    </div>
  </div>
{/if}

<style>
  .buttons {
    margin-top: 10px;
  }

  .overlay {
    z-index: 1000000000;
    width: 250px;
    height: 140px;
    position: fixed;
    bottom: 16px;
    background-color: rgba(255,255,255,0.8);
    border-radius: 20px;
    border: 1px solid black;
    padding: 4px;
  }

  .right {
    right: 16px;
  }

  .left {
    left: 16px;
  }
</style>
