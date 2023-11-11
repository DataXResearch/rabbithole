<script context="module" lang="ts">
  import type { SvelteComponent } from "svelte";

  export interface KeyContext {
    getKey: () => number;
  }

  export type GroupContext = Writable<{
    selectedIndex?: number;
    setSelectedIndex: (value: number) => void;
    variant?: Variant;
  }>;

  export interface GroupProps extends HTMLAttributes<HTMLDivElement> {
    as?: string | typeof SvelteComponent;
    selectedIndex?: number;
    variant?: Variant;
  }

  type Variant = "default" | "boxed";
</script>

<script lang="ts">
  import { setContext } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { writable, type Writable } from "svelte/store";
  import Component from "../../component.svelte";

  let as: GroupProps["as"] = "div";
  let selectedIndex: GroupProps["selectedIndex"] = 0;
  let variant: GroupProps["variant"] = "default";

  export { as, selectedIndex, variant };

  let key = -1;
  setContext<KeyContext>("key", {
    getKey: () => {
      key += 1;
      return key;
    },
  });

  const setActive = (value: number) => {
    selectedGroup.set({
      ...$selectedGroup,
      selectedIndex: value,
    });
  };

  let selectedGroup = writable({
    selectedIndex: selectedIndex,
    setSelectedIndex: setActive,
    variant: variant,
  });

  setContext<GroupContext>("group", selectedGroup);
</script>

<Component {...$$props} {as}>
  <slot />
</Component>
