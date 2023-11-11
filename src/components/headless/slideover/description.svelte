<script context="module" lang="ts">
  import { DialogDescription as HeadlessDialogDescription } from "@rgossiaux/svelte-headlessui";
  import { twMerge } from "tailwind-merge";

  export interface DescriptionProps
    extends ExtractProps<typeof HeadlessDialogDescription> {
    className?: string;
  }
</script>

<script lang="ts">
  let className: DescriptionProps["className"] = undefined;
  let as: DescriptionProps["as"] = "div";

  export { className as class, as };
</script>

<HeadlessDialogDescription
  {...$$props}
  {as}
  class={twMerge(["p-5", className])}
>
  <slot />
</HeadlessDialogDescription>
