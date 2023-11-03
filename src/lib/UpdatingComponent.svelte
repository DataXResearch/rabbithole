<script>
  import { Button, Group } from '@svelteuidev/core';
  import { CheckCircled, CrossCircled } from 'radix-icons-svelte';

  export let success, fail;
</script>

<div class="updating-component">
  <div class="child">
    <slot />
  </div>
  <div class="child">
    {#if success}<span class="success"><CheckCircled size="20"/></span>{/if}
  </div>
  <div class="child">
    {#if fail}<span class="fail"><CrossCircled size="20"/></span>{/if}
  </div>
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
</style>
