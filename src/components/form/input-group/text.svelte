<script context="module" lang="ts">
    import { getContext } from "svelte";
    import type { HTMLAttributes } from "svelte/elements";
    import { twMerge } from "tailwind-merge";
    import type { InputGroupContext } from "./input-group.svelte";
  
    export interface TextProps extends HTMLAttributes<HTMLDivElement> {
      className?: string;
    }
  </script>
  
  <script lang="ts">
    let className: TextProps["className"] = undefined;
  
    export { className as class };
  
    const inputGroup = getContext<InputGroupContext>("inputGroup");
  </script>
  
  <div
    {...$$props}
    class={twMerge([
      "py-2 px-3 bg-slate-100 border shadow-sm border-slate-200 text-slate-600 dark:bg-darkmode-900/20 dark:border-darkmode-900/20 dark:text-slate-400",
      inputGroup &&
        "rounded-none [&:not(:first-child)]:border-l-transparent first:rounded-l last:rounded-r",
      className,
    ])}
  >
    <slot />
  </div>
  