<script context="module" lang="ts">
  import type { SvelteComponent } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";
  import { twMerge } from "tailwind-merge";

  export interface ButtonProps extends HTMLButtonAttributes {
    as?: string | typeof SvelteComponent;
    className?: string;
  }
</script>

<script lang="ts">
  import { getContext } from "svelte";
  import Component from "../../component.svelte";
  import type { ListContext } from "./list.svelte";
  import type { TabContext } from "./tab/provider.svelte";

  let className: ButtonProps["className"] = undefined;
  let as: ButtonProps["as"] = "a";

  export { className as class, as };

  const tab = getContext<TabContext>("tab");
  const list = getContext<ListContext>("list");
</script>

<Component
  {...$$props}
  {as}
  class={twMerge([
    "cursor-pointer block appearance-none px-5 py-2.5 border border-transparent text-slate-700 dark:text-slate-400",
    $tab?.selected && "text-slate-800 dark:text-white",

    // Default
    list?.variant == "tabs" &&
      "cokk block border-transparent rounded-t-md dark:border-transparent",
    list?.variant == "tabs" &&
      $tab?.selected &&
      "bg-white border-slate-200 border-b-transparent font-medium dark:bg-transparent dark:border-t-darkmode-400 dark:border-b-darkmode-600 dark:border-x-darkmode-400",
    list?.variant == "tabs" &&
      !$tab?.selected &&
      "hover:bg-slate-100 dark:hover:bg-darkmode-400 dark:hover:border-transparent",

    // Pills
    list?.variant == "pills" && "rounded-md border-0",
    list?.variant == "pills" &&
      $tab?.selected &&
      "bg-primary text-white font-medium",

    // Boxed tabs
    list?.variant == "boxed-tabs" &&
      "shadow-[0px_3px_20px_#0000000b] rounded-md",
    list?.variant == "boxed-tabs" &&
      $tab?.selected &&
      "bg-primary text-white font-medium",

    // Link tabs
    list?.variant == "link-tabs" &&
      "border-b-2 border-transparent dark:border-transparent",
    list?.variant == "link-tabs" &&
      $tab?.selected &&
      "border-b-primary font-medium dark:border-b-primary",

    className,
  ])}
>
  <slot />
</Component>
