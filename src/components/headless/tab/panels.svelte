<script context="module" lang="ts">
  import { TabPanels as HeadlessTabPanels } from "@rgossiaux/svelte-headlessui";

  export interface PanelsProps extends ExtractProps<typeof HeadlessTabPanels> {
    className?: string;
  }
</script>

<script lang="ts">
  let className: PanelsProps["className"] = undefined;

  export { className as class };
</script>

<HeadlessTabPanels {...$$props} as="div" class={className}>
  <slot />
</HeadlessTabPanels>
