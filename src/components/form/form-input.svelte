<script context="module" lang="ts">
    import { getContext } from "svelte";
    import type { HTMLInputAttributes } from "svelte/elements";
    import { twMerge } from "tailwind-merge";
    import type { FromInlineContext } from "./form-inline.svelte";
    import type { InputGroupContext } from "./input-group/input-group.svelte";
  
    export interface FormInputProps extends HTMLInputAttributes {
      className?: string;
      formInputSize?: "sm" | "lg";
      rounded?: boolean;
      ref?: HTMLInputElement;
    }
  </script>
  
  <script lang="ts">
    let className: FormInputProps["className"] = undefined;
    let formInputSize: FormInputProps["formInputSize"] = undefined;
    let rounded: FormInputProps["rounded"] = undefined;
    let ref: FormInputProps["ref"] = undefined;
    let value: FormInputProps["value"] = undefined;
  
    export { className as class, formInputSize, rounded, ref, value };
  
    const formInline = getContext<FromInlineContext>("formInline");
    const inputGroup = getContext<InputGroupContext>("inputGroup");
  </script>
  
  <input
    {...$$props}
    class={twMerge([
      "disabled:bg-slate-100 disabled:cursor-not-allowed dark:disabled:bg-darkmode-800/50 dark:disabled:border-transparent",
      "[&[readonly]]:bg-slate-100 [&[readonly]]:cursor-not-allowed [&[readonly]]:dark:bg-darkmode-800/50 [&[readonly]]:dark:border-transparent",
      "transition duration-200 ease-in-out w-full text-sm border-slate-200 shadow-sm rounded-md placeholder:text-slate-400/90 focus:ring-4 focus:ring-primary focus:ring-opacity-20 focus:border-primary focus:border-opacity-40 dark:bg-darkmode-800 dark:border-transparent dark:focus:ring-slate-700 dark:focus:ring-opacity-50 dark:placeholder:text-slate-500/80",
      formInputSize == "sm" && "text-xs py-1.5 px-2",
      formInputSize == "lg" && "text-lg py-1.5 px-4",
      rounded && "rounded-full",
      formInline && "flex-1",
      inputGroup &&
        "rounded-none [&:not(:first-child)]:border-l-transparent first:rounded-l last:rounded-r z-10",
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
  />
  