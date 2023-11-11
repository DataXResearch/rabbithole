<script context="module" lang="ts">
    import { twMerge } from "tailwind-merge";
  
    export interface FromHelpProps {
      className?: string;
    }
  </script>
  
  <script lang="ts">
    let className: FromHelpProps["className"] = undefined;
  
    export { className as class };
  </script>
  
  <div class={twMerge(["text-xs text-slate-500 mt-2", className])}>
    <slot />
  </div>
  