<script context="module" lang="ts">
    import { onMount, type SvelteComponent } from "svelte";
  
    type Ref = HTMLElement | SvelteComponent;
  
    export interface ComponentProps {
      as: string | typeof SvelteComponent;
      ref?: Ref;
    }
  </script>
  
  <script lang="ts">
    let as: ComponentProps["as"];
    let ref: ComponentProps["ref"] = undefined;
  
    export { as, ref };
  
    let localRef: Ref;
    let rand = "_" + Math.random().toString(36).substr(2, 9);
  
    onMount(() => {
      if (localRef instanceof HTMLElement) {
        ref = localRef;
      } else {
        ref = document.querySelectorAll(`[data-ref="${rand}"]`)[0] as HTMLElement;
      }
    });
  </script>
  
  {#if typeof as !== "string"}
    <svelte:component
      this={as}
      {...$$restProps}
      data-ref={rand}
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
    >
      <slot />
    </svelte:component>
  {:else if $$slots.default && as !== "img"}
    <svelte:element
      this={as}
      bind:this={localRef}
      {...$$props}
      role="presentation"
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
    >
      <slot />
    </svelte:element>
  {:else}
    <svelte:element
      this={as}
      bind:this={localRef}
      {...$$props}
      role="presentation"
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
    />
  {/if}
  