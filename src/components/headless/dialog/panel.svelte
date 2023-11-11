<script context="module" lang="ts">
  import {
    Dialog as HeadlessDialog,
    DialogOverlay as HeadlessDialogOverlay,
    TransitionChild,
  } from "@rgossiaux/svelte-headlessui";
  import { twMerge } from "tailwind-merge";

  export interface DialogProps extends ExtractProps<typeof HeadlessDialog> {
    className?: string;
  }
</script>

<script lang="ts">
  import { getContext } from "svelte";
  import Component from "../../component.svelte";
  import type { DialogContext } from "./dialog.svelte";

  let className: DialogProps["className"] = undefined;
  let as: DialogProps["as"] = "div";

  export { className as class, as };

  const dialog = getContext<DialogContext>("dialog");
</script>

<TransitionChild
  as="div"
  enter="ease-in-out duration-500"
  enterFrom="opacity-0 -mt-16"
  enterTo="opacity-100 mt-0 pt-16"
  entered="pt-16"
  leave="ease-in-out duration-[400ms]"
  leaveFrom="opacity-100 pt-16"
  leaveTo="opacity-0 -mt-16 pt-0"
  class="fixed inset-0 pb-16 overflow-y-auto"
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
      on:click={() => $dialog.close()}
      class={twMerge(["fixed inset-0 bg-black/60", className])}
    />
  </TransitionChild>
  <Component
    {...$$props}
    {as}
    class={twMerge([
      "w-[90%] mx-auto bg-white relative rounded-md shadow-md transition-transform dark:bg-darkmode-600",
      $dialog.size == "md" && "sm:w-[460px]",
      $dialog.size == "sm" && "sm:w-[300px]",
      $dialog.size == "lg" && "sm:w-[600px]",
      $dialog.size == "xl" && "sm:w-[600px] lg:w-[900px]",
      $dialog.zoom && "scale-105",
      className,
    ])}
  >
    <slot />
  </Component>
</TransitionChild>
