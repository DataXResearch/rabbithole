<script context="module" lang="ts">
  import { TabGroup as HeadlessTabGroup } from "@rgossiaux/svelte-headlessui";

  export interface GroupProps extends ExtractProps<typeof HeadlessTabGroup> {}
</script>

<HeadlessTabGroup {...$$props} as="div">
  <slot />
</HeadlessTabGroup>
