<script context="module" lang="ts">
    import type { HTMLInputAttributes } from "svelte/elements";
    import { twMerge } from "tailwind-merge";
  
    export interface InputProps extends HTMLInputAttributes {
      className?: string;
      type: "radio" | "checkbox";
      ref?: HTMLInputElement;
    }
  </script>
  
  <script lang="ts">
    let className: InputProps["className"] = undefined;
    let type: InputProps["type"];
    let ref: InputProps["ref"] = undefined;
    let value: InputProps["value"] = undefined;
  
    export { className as class, type, ref, value };
  </script>
  
  <input
    {...$$props}
    class={twMerge([
      // Default
      "transition-all duration-100 ease-in-out",
  
      // Input type radio
      type == "radio" &&
        "shadow-sm border-slate-200 cursor-pointer focus:ring-4 focus:ring-offset-0 focus:ring-primary focus:ring-opacity-20 dark:bg-darkmode-800 dark:border-transparent dark:focus:ring-slate-700 dark:focus:ring-opacity-50",
  
      // Input type checkbox
      type == "checkbox" &&
        "shadow-sm border-slate-200 cursor-pointer rounded focus:ring-4 focus:ring-offset-0 focus:ring-primary focus:ring-opacity-20 dark:bg-darkmode-800 dark:border-transparent dark:focus:ring-slate-700 dark:focus:ring-opacity-50",
  
      // On checked
      "[&[type='radio']]:checked:bg-primary [&[type='radio']]:checked:border-primary [&[type='radio']]:checked:border-opacity-10",
      "[&[type='checkbox']]:checked:bg-primary [&[type='checkbox']]:checked:border-primary [&[type='checkbox']]:checked:border-opacity-10",
  
      // On checked and not disabled
      "[&:disabled:not(:checked)]:bg-slate-100 [&:disabled:not(:checked)]:cursor-not-allowed [&:disabled:not(:checked)]:dark:bg-darkmode-800/50",
  
      // On checked and disabled
      "[&:disabled:checked]:opacity-70 [&:disabled:checked]:cursor-not-allowed [&:disabled:checked]:dark:bg-darkmode-800/50",
  
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
  