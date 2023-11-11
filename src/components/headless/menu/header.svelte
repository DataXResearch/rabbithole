<script context="module" lang="ts">
  import { type SvelteComponent } from "svelte";
  import { twMerge } from "tailwind-merge";
  import Component from "../../component.svelte";

  export interface HeaderProps {
    as?: string | typeof SvelteComponent;
    className?: string;
  }
</script>

<script lang="ts">
  let as: HeaderProps["as"] = "div";
  let className: HeaderProps["className"] = undefined;

  export { as, className as class };

  const computedClass = twMerge(["p-2 font-medium", className]);
</script>

<Component {...$$props} {as} class={computedClass}>
  <slot />
</Component>
