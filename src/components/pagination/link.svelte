<script context="module" lang="ts">
  import type { SvelteComponent } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { twMerge } from "tailwind-merge";
  import Button from "../button.svelte";

  export interface LinkProps extends HTMLAttributes<HTMLElement> {
    as?: string | typeof SvelteComponent;
    className?: string;
    active?: boolean;
  }
</script>

<script lang="ts">
  let as: LinkProps["as"] = "a";
  let className: LinkProps["className"] = undefined;
  let active: LinkProps["active"] = false;

  export { as, className as class, active };
</script>

<li class="flex-1 sm:flex-initial">
  <Button
    {...$$props}
    {as}
    class={twMerge([
      "min-w-0 sm:min-w-[40px] shadow-none font-normal flex items-center justify-center border-transparent text-slate-800 sm:mr-2 dark:text-slate-300 px-1 sm:px-3",
      active && "!box font-medium dark:bg-darkmode-400",
      className,
    ])}
  >
    <slot />
  </Button>
</li>
