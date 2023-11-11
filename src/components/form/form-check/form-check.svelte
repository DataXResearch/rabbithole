<script context="module" lang="ts">
    import { twMerge } from "tailwind-merge";
  
    export interface FromCheckProps {
      className?: string;
    }
  </script>
  
  <script lang="ts">
    let className: FromCheckProps["className"] = undefined;
  
    export { className as class };
  </script>
  
  <div class={twMerge(["flex items-center", className])}>
    <slot />
  </div>
  