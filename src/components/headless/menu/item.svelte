<script context="module" lang="ts">
  import { MenuItem as HeadlessMenuItem } from "@rgossiaux/svelte-headlessui";
  import { twMerge } from "tailwind-merge";

  export interface ItemProps extends ExtractProps<typeof HeadlessMenuItem> {
    className?: string;
  }
</script>

<script lang="ts">
  let className: ItemProps["className"] = undefined;
  let as: ItemProps["as"] = "a";

  export { className as class, as };
</script>

<HeadlessMenuItem
  {...$$props}
  {as}
  class={twMerge([
    "cursor-pointer flex items-center p-2 transition duration-300 ease-in-out rounded-md hover:bg-slate-200/60 dark:bg-darkmode-600 dark:hover:bg-darkmode-400",
    className,
  ])}
>
  <slot />
</HeadlessMenuItem>
