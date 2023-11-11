<script context="module" lang="ts">
    import { setContext } from "svelte";
    import { twMerge } from "tailwind-merge";
  
    export interface FromInlineProps {
      className?: string;
    }
  
    export type FromInlineContext = boolean;
  </script>
  
  <script lang="ts">
    let className: FromInlineProps["className"] = undefined;
  
    export { className as class };
  
    setContext<FromInlineContext>("formInline", true);
  </script>
  
  <div class={twMerge(["block sm:flex items-center", className])}>
    <slot />
  </div>
  