<script context="module" lang="ts">
  import { type SvelteComponent } from "svelte";
  import { twMerge } from "tailwind-merge";
  import Component from "../../component.svelte";

  export interface FooterProps {
    as?: string | typeof SvelteComponent;
    className?: string;
  }
</script>

<script lang="ts">
  let as: FooterProps["as"] = "div";
  let className: FooterProps["className"] = undefined;

  export { className as class, as };

  const computedClass = twMerge([
    "px-5 py-3 text-right border-t border-slate-200/60 dark:border-darkmode-400",
    className,
  ]);
</script>

<Component {...$$props} {as} class={computedClass}>
  <slot />
</Component>
