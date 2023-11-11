<script context="module" lang="ts">
  import {
    Dialog as HeadlessDialog,
    Transition,
  } from "@rgossiaux/svelte-headlessui";
  import { twMerge } from "tailwind-merge";

  type Size = "sm" | "md" | "lg" | "xl";

  export interface SlideoverProps extends ExtractProps<typeof HeadlessDialog> {
    className?: string;
    size?: Size;
    open: boolean;
    staticBackdrop?: boolean;
  }

  export type SlideoverContext = Writable<{
    size: Size;
    zoom: boolean;
    close: () => void;
  }>;
</script>

<script lang="ts">
  import { createEventDispatcher, setContext } from "svelte";
  import { writable, type Writable } from "svelte/store";

  let className: SlideoverProps["className"] = undefined;
  let as: SlideoverProps["as"] = "div";
  let size: SlideoverProps["size"] = "md";
  let open: SlideoverProps["open"] = false;
  let staticBackdrop: SlideoverProps["staticBackdrop"] = false;
  let initialFocus: SlideoverProps["initialFocus"] = undefined;

  export { className as class, as, size, open, staticBackdrop, initialFocus };

  const dispatch = createEventDispatcher();
  let slideoverContext = writable({
    size: size,
    zoom: false,
    close: () => handleClose(),
  });

  const handleClose = () => {
    if (!staticBackdrop) {
      dispatch("close");
    } else {
      slideoverContext.set({
        ...$slideoverContext,
        zoom: true,
      });

      setTimeout(() => {
        slideoverContext.set({
          ...$slideoverContext,
          zoom: false,
        });
      }, 300);
    }
  };

  const handleEscape = (e) => {
    e.key == "Escape" && handleClose();
  };

  $: {
    open && initialFocus instanceof HTMLElement && initialFocus.focus();

    if (open) {
      document.addEventListener("keydown", handleEscape);
    } else {
      document.removeEventListener("keydown", handleEscape);
    }
  }

  setContext<SlideoverContext>("slideover", slideoverContext);
</script>

<Transition appear show={open}>
  <HeadlessDialog
    {...$$props}
    {as}
    class={twMerge(["relative z-[60]", className])}
  >
    <slot />
  </HeadlessDialog>
</Transition>
