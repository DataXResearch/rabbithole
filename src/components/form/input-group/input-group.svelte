<script context="module" lang="ts">
    import { setContext } from "svelte";
    import { twMerge } from "tailwind-merge";
  
    export interface InputGroupProps {
      className?: string;
    }
  
    export type InputGroupContext = boolean;
  </script>
  
  <script lang="ts">
    let className: InputGroupProps["className"] = undefined;
  
    export { className as class };
  
    setContext<InputGroupContext>("inputGroup", true);
  </script>
  
  <div class={twMerge(["flex", className])}>
    <slot />
  </div>
  