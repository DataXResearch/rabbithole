<script context="module" lang="ts">
  import { DialogTitle as HeadlessDialogTitle } from "@rgossiaux/svelte-headlessui";
  import { twMerge } from "tailwind-merge";

  export interface TitleProps extends ExtractProps<typeof HeadlessDialogTitle> {
    className?: string;
  }
</script>

<script lang="ts">
  let className: TitleProps["className"] = undefined;
  let as: TitleProps["as"] = "div";

  export { className as class, as };
</script>

<HeadlessDialogTitle
  {...$$props}
  {as}
  class={twMerge([
    "flex items-center px-5 py-3 border-b border-slate-200/60 dark:border-darkmode-400",
    className,
  ])}
>
  <slot />
</HeadlessDialogTitle>
