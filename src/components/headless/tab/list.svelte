<script context="module" lang="ts">
  import { TabList as HeadlessTabList } from "@rgossiaux/svelte-headlessui";
  import { setContext } from "svelte";
  import { twMerge } from "tailwind-merge";

  type Variant = "tabs" | "pills" | "boxed-tabs" | "link-tabs";

  export interface ListContext {
    variant?: Variant;
  }

  export interface ListProps extends ExtractProps<typeof HeadlessTabList> {
    className?: string;
    variant?: Variant;
  }
</script>

<script lang="ts">
  let className: ListProps["className"] = undefined;
  let variant: ListProps["variant"] = "tabs";

  export { className as class, variant };

  setContext<ListContext>("list", {
    variant: variant,
  });
</script>

<HeadlessTabList
  {...$$props}
  as="ul"
  class={twMerge([
    variant == "tabs" && "border-b border-slate-200 dark:border-darkmode-400",
    "w-full flex",
    className,
  ])}
>
  <slot />
</HeadlessTabList>
