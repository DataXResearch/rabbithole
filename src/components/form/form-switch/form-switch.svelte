<script context="module" lang="ts">
    export interface FormSwitchProps {
      className?: string;
    }
  </script>
  
  <script lang="ts">
    import FormCheck from "../form-check";
  
    let className: FormSwitchProps["className"] = undefined;
  
    export { className as class };
  </script>
  
  <FormCheck class={className} {...$$props}>
    <slot />
  </FormCheck>
  