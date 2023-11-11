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

  export { as, className as class };

  const computedClass = twMerge(["flex p-1", className]);
</script>

<Component {...$$props} {as} class={computedClass}>
  <slot />
</Component>
