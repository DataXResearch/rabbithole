<script lang="ts">
  import { MessageRequest } from "../utils"
  import { Button, Group } from '@svelteuidev/core';

  let successMessage: string = null;

  async function save() {
    const [savedTab] = await chrome.runtime.sendMessage({type: MessageRequest.SAVE_TAB});
    successMessage = (savedTab.alreadySaved)? "Website already saved!" : "Website saved!";
    setTimeout(() => {
      successMessage = null;
    }, 1500);
  }
</script>

<div class="container">
  <Group position="center">
    <Button on:click={save} size="md" id="move" color='blue'>
      Save Website
    </Button>
  {#if successMessage}<span class="success">{successMessage}</span>{/if}
  </Group>
</div>

<style>
  .container {
    margin-top: 10px;
    max-width: 210px;
  }
  .success {
    color: #2ecc71;
    font-weight: bold;
  }
</style>
