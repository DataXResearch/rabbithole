<script lang="ts">
  import { onMount } from "svelte";
  import Options from "./Options.svelte";
  import { Button, Group } from '@svelteuidev/core';

  let count = 0;
  let alignment = "right"

  function onClick(event) {
    if (alignment === "left") {
      alignment = "right";
    } else {
      alignment = "left";
    }
  }
</script>

<div id="overlay-container" class="overlay {alignment}">
  <div class="buttons">
  <Group position="center" spacing="md">
    <Button on:click={onClick} id="move" variant='light' color='blue'>
      Move
    </Button>
    <Button on:click={onClick} id="move" variant='light' color='blue'>
      Hide
    </Button>
  </Group>
  </div>
  <div>
    <Options {count} />
  </div>
</div>

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
