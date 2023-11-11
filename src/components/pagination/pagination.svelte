<script context="module" lang="ts">
  import type { HTMLAttributes } from "svelte/elements";

  export interface PaginationProps extends HTMLAttributes<HTMLElement> {
    className?: string;
  }
</script>

<script lang="ts">
  let className: PaginationProps["className"] = undefined;

  export { className as class };
</script>

<nav {...$$props} class={className}>
  <ul class="flex w-full mr-0 sm:w-auto sm:mr-auto">
    <slot />
  </ul>
</nav>
