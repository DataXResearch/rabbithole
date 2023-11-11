<script context="module" lang="ts">
  import { setContext } from "svelte";

  export type TabContext = Writable<{
    selected: boolean;
  }>;

  export interface ProviderProps {
    selected: boolean;
  }
</script>

<script lang="ts">
  import { writable, type Writable } from "svelte/store";

  let selected: ProviderProps["selected"] = false;

  export { selected };

  let selectedTab = writable({
    selected,
  });

  $: selectedTab.set({
    selected,
  });

  setContext<TabContext>("tab", selectedTab);
</script>

<slot />
