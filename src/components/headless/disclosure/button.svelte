<script context="module" lang="ts">
  import { DisclosureButton as HeadlessDisclosureButton } from "@rgossiaux/svelte-headlessui";
  import { twMerge } from "tailwind-merge";

  export interface ButtonProps
    extends ExtractProps<typeof HeadlessDisclosureButton> {
    className?: string;
  }
</script>

<script lang="ts">
  import { getContext } from "svelte";
  import { type DisclosureContext } from "./Disclosure/Provider.svelte";
  import { type GroupContext } from "./Group.svelte";

  let className: ButtonProps["className"] = undefined;
  let as: ButtonProps["as"] = "button";

  export { className as class, as };

  const disclosure = getContext<DisclosureContext>("disclosure");
  const group = getContext<GroupContext>("group");

  $: $group?.selectedIndex !== $disclosure?.index && $disclosure?.close();
</script>

<HeadlessDisclosureButton
  {...$$props}
  {as}
  class={twMerge([
    "outline-none py-4 -my-4 font-medium w-full text-left dark:text-slate-400",
    $disclosure?.open && "text-primary dark:text-slate-300",
    className,
  ])}
  on:click={() => {
    disclosure && $group?.setSelectedIndex($disclosure.index);
  }}
>
  <slot />
</HeadlessDisclosureButton>
