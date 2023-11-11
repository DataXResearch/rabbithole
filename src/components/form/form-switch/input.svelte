<script context="module" lang="ts">
    import type { HTMLInputAttributes } from "svelte/elements";
    import { twMerge } from "tailwind-merge";
  
    export interface InputProps extends HTMLInputAttributes {
      className?: string;
      type: "checkbox";
      ref?: HTMLInputElement;
      value?: string;
    }
  </script>
  
  <script lang="ts">
    import FormCheck from "../form-check";
  
    let className: InputProps["className"] = undefined;
    let type: InputProps["type"];
    let ref: InputProps["ref"] = undefined;
    let value: InputProps["value"] = undefined;
  
    export { className as class, type, ref, value };
  </script>
  
  <FormCheck.Input
    {...$$props}
    class={twMerge([
      // Default
      "w-[38px] h-[24px] p-px rounded-full relative",
      "before:w-[20px] before:h-[20px] before:shadow-[1px_1px_3px_rgba(0,0,0,0.25)] before:transition-[margin-left] before:duration-200 before:ease-in-out before:absolute before:inset-y-0 before:my-auto before:rounded-full before:dark:bg-darkmode-600",
  
      // On checked
      "checked:bg-primary checked:border-primary checked:bg-none",
      "before:checked:ml-[14px] before:checked:bg-white",
  
      className,
    ])}
    {type}
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
    bind:ref
    bind:value
  />
  