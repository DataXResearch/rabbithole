<script context="module" lang="ts">
  import { Disclosure as HeadlessDisclosure } from "@rgossiaux/svelte-headlessui";
  import clsx from "clsx";
  import { getContext } from "svelte";

  export interface DisclosureProps
    extends ExtractProps<typeof HeadlessDisclosure> {
    className?: string;
  }
</script>

<script lang="ts">
  import { type GroupContext, type KeyContext } from "../Group.svelte";
  import Provider from "./provider.svelte";

  let className: DisclosureProps["className"] = undefined;

  export { className as class };

  const { getKey } = getContext<KeyContext>("key");
  let index = getKey();

  const group = getContext<GroupContext>("group");
</script>

<HeadlessDisclosure
  {...$$props}
  as="div"
  defaultOpen={$group?.selectedIndex === index}
  class={clsx([
    "py-4 first:-mt-4 last:-mb-4",
    "[&:not(:last-child)]:border-b [&:not(:last-child)]:border-slate-200/60 [&:not(:last-child)]:dark:border-darkmode-400",
    $group?.variant == "boxed" &&
      "p-4 first:mt-0 last:mb-0 border border-slate-200/60 mt-3 dark:border-darkmode-400",
    className,
  ])}
  let:open
  let:close
>
  <Provider {open} {close} {index}>
    <slot {open} {close} />
  </Provider>
</HeadlessDisclosure>
