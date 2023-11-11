<script context="module" lang="ts">
  import { Menu as HeadlessMenu } from "@rgossiaux/svelte-headlessui";
  import { twMerge } from "tailwind-merge";

  export interface MenuProps extends ExtractProps<typeof HeadlessMenu> {
    className?: string;
  }
</script>

<script lang="ts">
  let className: MenuProps["className"] = undefined;
  let as: MenuProps["as"] = "div";

  export { className as class, as };
</script>

<HeadlessMenu {...$$props} {as} class={twMerge(["relative", className])}>
  <slot />
</HeadlessMenu>
