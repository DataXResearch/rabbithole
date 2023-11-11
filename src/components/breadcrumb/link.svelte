<script context="module" lang="ts">
    import clsx from "clsx";
    import { getContext } from "svelte";
    import { Link } from "svelte-navigator";
    import type { HTMLLiAttributes } from "svelte/elements";
    import type { BreadcrumbContext, KeyContext } from "./breadcrumb.svelte";
  
    export interface LinkProps extends HTMLLiAttributes {
      className?: string;
      to?: string;
      active?: boolean;
    }
  </script>
  
  <script lang="ts">
    let className: LinkProps["className"] = undefined;
    let to: LinkProps["to"] = undefined;
    let active: LinkProps["active"] = undefined;
  
    export { className as class, to, active };
  
    const { getKey } = getContext<KeyContext>("key");
    let key = getKey();
  
    const breadcrumb = getContext<BreadcrumbContext>("breadcrumb");
  </script>
  
  <li
    {...$$props}
    class={clsx([
      className,
      key > 0 && "relative ml-5 pl-0.5",
      !breadcrumb.light &&
        key > 0 &&
        "before:content-[''] before:w-[14px] before:h-[14px] before:bg-bredcrumb-chevron-dark before:bg-[length:100%] before:-ml-[1.125rem] before:absolute before:my-auto before:inset-y-0",
      breadcrumb.light &&
        key > 0 &&
        "before:content-[''] before:w-[14px] before:h-[14px] before:bg-bredcrumb-chevron-light before:bg-[length:100%] before:-ml-[1.125rem] before:absolute before:my-auto before:inset-y-0",
      key > 0 && "dark:before:bg-bredcrumb-chevron-darkmode",
      !breadcrumb.light &&
        active &&
        "text-slate-800 cursor-text dark:text-slate-400",
      breadcrumb.light && active && "text-white/70",
    ])}
  >
    <Link {to}><slot /></Link>
  </li>
  