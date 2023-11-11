<script context="module" lang="ts">
  import {
    PopoverPanel as HeadlessPopoverPanel,
    Transition,
  } from "@rgossiaux/svelte-headlessui";
  import clsx from "clsx";
  import { twMerge } from "tailwind-merge";

  export interface PanelProps
    extends ExtractProps<typeof HeadlessPopoverPanel> {
    className?: string;
    placement?:
      | "top-start"
      | "top"
      | "top-end"
      | "right-start"
      | "right"
      | "right-end"
      | "bottom-end"
      | "bottom"
      | "bottom-start"
      | "left-start"
      | "left"
      | "left-end";
  }
</script>

<script lang="ts">
  let className: PanelProps["className"] = undefined;
  let placement: PanelProps["placement"] = "bottom-end";

  export { className as class, placement };
</script>

<Transition
  enter="transition-all ease-linear duration-150"
  enterFrom="mt-5 invisible opacity-0 translate-y-1"
  enterTo="mt-1 visible opacity-100 translate-y-0"
  entered="mt-1"
  leave="transition-all ease-linear duration-150"
  leaveFrom="mt-1 visible opacity-100 translate-y-0"
  leaveTo="mt-5 invisible opacity-0 translate-y-1"
  class={clsx([
    "absolute z-30",
    placement == "top-start" && "left-0 bottom-[100%]",
    placement == "top" && "left-[50%] translate-x-[-50%] bottom-[100%]",
    placement == "top-end" && "right-0 bottom-[100%]",
    placement == "right-start" && "left-[100%] translate-y-[-50%]",
    placement == "right" && "left-[100%] top-[50%] translate-y-[-50%]",
    placement == "right-end" && "left-[100%] bottom-0",
    placement == "bottom-end" && "top-[100%] right-0",
    placement == "bottom" && "top-[100%] left-[50%] translate-x-[-50%]",
    placement == "bottom-start" && "top-[100%] left-0",
    placement == "left-start" && "right-[100%] translate-y-[-50%]",
    placement == "left" && "right-[100%] top-[50%] translate-y-[-50%]",
    placement == "left-end" && "right-[100%] bottom-0",
  ])}
>
  <HeadlessPopoverPanel
    {...$$props}
    as="div"
    class={twMerge([
      "p-2 shadow-[0px_3px_20px_#0000000b] bg-white border-transparent rounded-md dark:bg-darkmode-600 dark:border-transparent",
      className,
    ])}
  >
    <slot />
  </HeadlessPopoverPanel>
</Transition>
