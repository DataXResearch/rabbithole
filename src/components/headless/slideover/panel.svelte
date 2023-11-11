<script context="module" lang="ts">
  import {
    Dialog as HeadlessDialog,
    DialogOverlay as HeadlessDialogOverlay,
    TransitionChild,
  } from "@rgossiaux/svelte-headlessui";
  import { twMerge } from "tailwind-merge";

  export interface SlideoverProps extends ExtractProps<typeof HeadlessDialog> {
    className?: string;
  }
</script>

<script lang="ts">
  import { getContext } from "svelte";
  import Component from "../../component.svelte";
  import { type SlideoverContext } from "./slideover.svelte";

  let className: SlideoverProps["className"] = undefined;
  let as: SlideoverProps["as"] = "div";

  export { className as class, as };

  const slideover = getContext<SlideoverContext>("slideover");
</script>

<TransitionChild
  as="div"
  enter="ease-in-out duration-500"
  enterFrom="opacity-0 -mr-[100%]"
  enterTo="opacity-100 mr-0"
  leave="ease-in-out duration-[400ms]"
  leaveFrom="opacity-100 mr-0"
  leaveTo="opacity-0 -mr-[100%]"
  class="fixed inset-y-0 right-0"
>
  <TransitionChild
    as="div"
    enter="ease-in-out duration-500"
    enterFrom="opacity-0"
    enterTo="opacity-100"
    leave="ease-in-out duration-[400ms]"
    leaveFrom="opacity-100"
    leaveTo="opacity-0"
    class={twMerge(["fixed inset-0", className])}
  >
    <HeadlessDialogOverlay
      on:click={() => $slideover.close()}
      class={twMerge(["fixed inset-0 bg-black/60", className])}
    />
  </TransitionChild>
  <Component
    {...$$props}
    {as}
    class={twMerge([
      "w-[90%] ml-auto h-screen flex flex-col bg-white relative shadow-md transition-transform dark:bg-darkmode-600",
      $slideover.size == "md" && "sm:w-[460px]",
      $slideover.size == "sm" && "sm:w-[300px]",
      $slideover.size == "lg" && "sm:w-[600px]",
      $slideover.size == "xl" && "sm:w-[600px] lg:w-[900px]",
      $slideover.zoom && "scale-105",
      className,
    ])}
  >
    <slot />
  </Component>
</TransitionChild>
