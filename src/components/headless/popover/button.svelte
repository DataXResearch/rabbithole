<script context="module" lang="ts">
  import { PopoverButton as HeadlessPopoverButton } from "@rgossiaux/svelte-headlessui";
  import { twMerge } from "tailwind-merge";

  export interface ButtonProps
    extends ExtractProps<typeof HeadlessPopoverButton> {
    className?: string;
  }
</script>

<script lang="ts">
  import Component from "../../component.svelte";

  let className: ButtonProps["className"] = undefined;
  let as: ButtonProps["as"] = "div";

  export { className as class, as };
</script>

<Component
  {...$$props}
  {as}
  class={twMerge(["cursor-pointer", className])}
  on:blur
  on:change
  on:contextmenu
  on:focus
  on:input
  on:invalid
  on:reset
  on:select
  on:submit
  on:keydown
  on:keypress
  on:keyup
  on:click
  on:dblclick
  on:mousedown
  on:mousemove
  on:mouseout
  on:mouseover
  on:mouseup
  on:wheel
>
  <svelte:component
    this={HeadlessPopoverButton}
    class="absolute inset-0 z-[2]"
  />
  <slot />
</Component>
