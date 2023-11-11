<script context="module" lang="ts">
  import { setContext } from "svelte";

  export type DisclosureContext = Writable<{
    open: boolean;
    close: () => void;
    index: number;
  }>;

  export interface ProviderProps {
    open: boolean;
    close: (ref?: HTMLElement) => void;
    index: number;
  }
</script>

<script lang="ts">
  import { writable, type Writable } from "svelte/store";

  let open: ProviderProps["open"] = false;
  let close: ProviderProps["close"] = () => {};
  let index: ProviderProps["index"] = 0;

  export { open, close, index };

  let openDisclosure = writable({
    open,
    close,
    index,
  });

  $: openDisclosure.set({
    open,
    close,
    index,
  });

  setContext<DisclosureContext>("disclosure", openDisclosure);
</script>

<slot />
