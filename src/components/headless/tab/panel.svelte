<script context="module" lang="ts">
  import {
    TabPanel as HeadlessTabPanel,
    Transition,
  } from "@rgossiaux/svelte-headlessui";

  export interface PanelProps extends ExtractProps<typeof HeadlessTabPanel> {
    className?: string;
  }
</script>

<script lang="ts">
  let className: PanelProps["className"] = undefined;

  export { className as class };
</script>

<HeadlessTabPanel let:selected>
  <Transition
    appear
    as="div"
    show={selected}
    enter="transition-opacity duration-300"
    enterFrom="opacity-0"
    enterTo="opacity-100"
    leave="transition-opacity duration-300"
    leaveFrom="opacity-100"
    leaveTo="opacity-0"
    class={className}
    {...$$restProps}
  >
    <slot {selected} />
  </Transition>
</HeadlessTabPanel>
