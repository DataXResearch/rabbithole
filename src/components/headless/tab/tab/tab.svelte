<script context="module" lang="ts">
  import { Tab as HeadlessTab } from "@rgossiaux/svelte-headlessui";
  import clsx from "clsx";
  import { getContext } from "svelte";

  export interface ButtonProps extends ExtractProps<typeof HeadlessTab> {
    className?: string;
    fullWidth?: boolean;
  }
</script>

<script lang="ts">
  import { type ListContext } from "../list.svelte";
  import Provider from "./Provider.svelte";

  let className: ButtonProps["className"] = undefined;
  let fullWidth: ButtonProps["fullWidth"] = true;

  export { className as class, fullWidth };

  const list = getContext<ListContext>("list");
</script>

<HeadlessTab
  {...$$props}
  as="li"
  let:selected
  class={clsx([
    "focus-visible:outline-none",
    fullWidth && "flex-1",
    list && list.variant == "tabs" && "-mb-px",
    className,
  ])}
>
  <Provider {selected}>
    <slot {selected} />
  </Provider>
</HeadlessTab>
