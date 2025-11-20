<script>
  import { Button, Group, Loader } from "@svelteuidev/core";
  import { CheckCircled, CrossCircled } from "radix-icons-svelte";

  export let success = false;
  export let fail = false;
  export let loading = false;
  export let successMsg = "";
  export let failMsg = "";
</script>

<div class="updating-component">
  <div class="child">
    <slot />
  </div>
  {#if loading}
    <div class="child">
      <Loader size="xs" />
    </div>
  {/if}
  {#if success}
    <div class="child">
      <span class="success"><CheckCircled size="20" /></span>
    </div>
    <div>
      <span class="success">{successMsg}</span>
    </div>
  {/if}
  {#if fail}
    <div class="child">
      <span class="fail"><CrossCircled size="20" /></span>
    </div>
    <div>
      <span class="fail">{failMsg}</span>
    </div>
  {/if}
</div>

<style>
  .child {
    display: inline-block;
  }

  .success {
    color: #2ecc71;
    font-weight: bold;
  }
  .fail {
    color: rgb(250, 82, 82);
    font-weight: bold;
  }

  :global(body.dark-mode .success) {
    color: #2ecc71;
  }

  :global(body.dark-mode .fail) {
    color: rgb(250, 82, 82);
  }
</style>
