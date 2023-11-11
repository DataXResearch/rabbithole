<script context="module" lang="ts">
    export interface KeyContext {
      getKey: () => number;
    }
  
    export interface BreadcrumbContext {
      light?: boolean;
    }
  </script>
  
  <script lang="ts">
    import clsx from "clsx";
    import { setContext } from "svelte";
  
    interface BreadcrumbProps {
      className?: string;
      light?: boolean;
    }
  
    let className: BreadcrumbProps["className"] = undefined;
    let light: BreadcrumbProps["light"] = undefined;
  
    export { className as class, light };
  
    let key = -1;
    setContext<KeyContext>("key", {
      getKey: () => {
        key += 1;
        return key;
      },
    });
  
    setContext<BreadcrumbContext>("breadcrumb", {
      light: light,
    });
  </script>
  
  <nav class={clsx(["flex", className])} aria-label="breadcrumb">
    <ol
      class={clsx([
        "flex items-center text-primary dark:text-slate-300",
        light && "text-white/90",
      ])}
    >
      <slot />
    </ol>
  </nav>
  