<script context="module" lang="ts">
    import * as lucideIcons from "lucide-svelte";
    import type { SVGAttributes } from "svelte/elements";
    import { twMerge } from "tailwind-merge";
  
    export type Icon = keyof typeof lucideIcons;
  
    export interface LucideProps extends SVGAttributes<SVGSVGElement> {
      className?: string;
      icon: Icon;
    }
  </script>
  
  <script lang="ts">
    let className: LucideProps["className"] = undefined;
    let icon: LucideProps["icon"];
  
    export { className as class, icon };
  </script>
  
  <svelte:component
    this={lucideIcons[icon]}
    class={twMerge(["stroke-[1.3] w-[1.4rem] h-[1.4rem]", className])}
  />
  