<script context="module" lang="ts">
    import { twMerge } from "tailwind-merge";
  
    export interface LabelProps {
      className?: string;
    }
  </script>
  
  <script lang="ts">
    let className: LabelProps["className"] = undefined;
  
    export { className as class };
  </script>
  
  <label class={twMerge(["cursor-pointer ml-2", className])} {...$$props}>
    <slot />
  </label>
  