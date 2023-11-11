<script context="module" lang="ts">
  import { twMerge } from "tailwind-merge";
  import {
    Dialog as HeadlessDialog,
    Transition,
  } from "@rgossiaux/svelte-headlessui";

  type Size = "sm" | "md" | "lg" | "xl";

  export interface DialogProps extends ExtractProps<typeof HeadlessDialog> {
    className?: string;
    size?: Size;
    open: boolean;
    staticBackdrop?: boolean;
  }

  export type DialogContext = Writable<{
    size: Size;
    zoom: boolean;
    close: () => void;
  }>;
</script>

<script lang="ts">
  import { setContext, createEventDispatcher } from "svelte";
  import { writable, type Writable } from "svelte/store";

  let className: DialogProps["className"] = undefined;
  let as: DialogProps["as"] = "div";
  let size: DialogProps["size"] = "md";
  let open: DialogProps["open"] = false;
  let staticBackdrop: DialogProps["staticBackdrop"] = false;
  let initialFocus: DialogProps["initialFocus"] = undefined;

  export { className as class, as, size, open, staticBackdrop, initialFocus };

  const dispatch = createEventDispatcher();
  let dialogContext = writable({
    size: size,
    zoom: false,
    close: () => handleClose(),
  });

  const handleClose = () => {
    if (!staticBackdrop) {
      dispatch("close");
    } else {
      dialogContext.set({
        ...$dialogContext,
        zoom: true,
      });

      setTimeout(() => {
        dialogContext.set({
          ...$dialogContext,
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

  setContext<DialogContext>("dialog", dialogContext);
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
