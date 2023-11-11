<script context="module" lang="ts">
  import { type SvelteComponent } from "svelte";
  import { twMerge } from "tailwind-merge";
  import Component from "../../component.svelte";

  export interface DividerProps {
    as?: string | typeof SvelteComponent;
    className?: string;
  }
</script>

<script lang="ts">
  let as: DividerProps["as"] = "div";
  let className: DividerProps["className"] = undefined;

  export { as, className as class };

  const computedClass = twMerge([
    "h-px my-2 -mx-2 bg-slate-200/60 dark:bg-darkmode-400",
    className,
  ]);
</script>

<Component {...$$props} {as} class={computedClass}>
  <slot />
</Component>
