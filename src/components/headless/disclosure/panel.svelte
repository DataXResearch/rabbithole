<script context="module" lang="ts">
  import {
    DisclosurePanel as HeadlessDisclosurePanel,
    Transition,
  } from "@rgossiaux/svelte-headlessui";
  import { twMerge } from "tailwind-merge";

  export interface PanelProps
    extends ExtractProps<typeof HeadlessDisclosurePanel> {
    className?: string;
  }
</script>

<script lang="ts">
  let className: PanelProps["className"] = undefined;
  let as: PanelProps["as"] = "div";

  export { className as class, as };
</script>

<Transition
  enter="overflow-hidden transition-all linear duration-[400ms]"
  enterFrom="mt-0 max-h-0 invisible opacity-0"
  enterTo="mt-3 max-h-[2000px] visible opacity-100"
  entered="mt-3"
  leave="overflow-hidden transition-all linear duration-500"
  leaveFrom="mt-3 max-h-[2000px] visible opacity-100"
  leaveTo="mt-0 max-h-0 invisible opacity-0"
>
  <HeadlessDisclosurePanel
    {...$$props}
    {as}
    class={twMerge([
      "text-slate-700 leading-relaxed dark:text-slate-400",
      className,
    ])}
  >
    <slot />
  </HeadlessDisclosurePanel>
</Transition>
