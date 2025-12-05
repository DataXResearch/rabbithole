<script lang="ts">
  import { MessageRequest, NotificationDuration } from "../utils";
  import { Button, Group, Text } from "@svelteuidev/core";
  import { Bookmark } from "radix-icons-svelte";

  let successMessage: string = null;

  async function save() {
    const [savedTab] = await chrome.runtime.sendMessage({
      type: MessageRequest.SAVE_TAB,
    });
    successMessage = savedTab.alreadySaved
      ? "Already saved!"
      : "Saved!";
    setTimeout(() => {
      successMessage = null;
    }, NotificationDuration);
  }
</script>

<div class="container">
  <Button 
    on:click={save} 
    size="sm" 
    fullWidth 
    color="blue" 
    leftIcon={Bookmark}
  >
    Save Website
  </Button>
  {#if successMessage}
    <Text size="xs" color="green" align="center" weight="bold" style="margin-top: 8px;">
      {successMessage}
    </Text>
  {/if}
</div>

<style>
  .container {
    width: 100%;
  }
</style>
