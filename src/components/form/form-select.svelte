<script context="module" lang="ts">
    import { getContext } from "svelte";
    import type { HTMLSelectAttributes } from "svelte/elements";
    import { twMerge } from "tailwind-merge";
    import type { FromInlineContext } from "./form-inline.svelte";
  
    export interface FormSelectProps extends HTMLSelectAttributes {
      className?: string;
      formSelectSize?: "sm" | "lg";
      ref?: HTMLSelectElement;
    }
  </script>
  
  <script lang="ts">
    let className: FormSelectProps["className"] = undefined;
    let formSelectSize: FormSelectProps["formSelectSize"] = undefined;
    let ref: FormSelectProps["ref"] = undefined;
    let value: FormSelectProps["value"] = undefined;
  
    export { className as class, formSelectSize, ref, value };
  
    const formInline = getContext<FromInlineContext>("formInline");
  </script>
  
  <select
    {...$$props}
    class={twMerge([
      "disabled:bg-slate-100 disabled:cursor-not-allowed disabled:dark:bg-darkmode-800/50",
      "[&[readonly]]:bg-slate-100 [&[readonly]]:cursor-not-allowed [&[readonly]]:dark:bg-darkmode-800/50",
      "transition duration-200 ease-in-out w-full text-sm border-slate-200 shadow-sm rounded-md py-2 px-3 pr-8 focus:ring-4 focus:ring-primary focus:ring-opacity-20 focus:border-primary focus:border-opacity-40 dark:bg-darkmode-800 dark:border-transparent dark:focus:ring-slate-700 dark:focus:ring-opacity-50",
      formSelectSize == "sm" && "text-xs py-1.5 pl-2 pr-8",
      formSelectSize == "lg" && "text-lg py-1.5 pl-4 pr-8",
      formInline && "flex-1",
      className,
    ])}
    on:blur
    on:change
    on:contextmenu
    on:focus
    on:input
    on:invalid
    on:reset
    on:select
    on:submit
    on:keydown
    on:keypress
    on:keyup
    on:click
    on:dblclick
    on:mousedown
    on:mousemove
    on:mouseout
    on:mouseover
    on:mouseup
    on:wheel
    bind:this={ref}
    bind:value
  >
    <slot />
  </select>
  