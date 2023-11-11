<script lang="ts">
    import { useLocation } from "svelte-navigator";
  
    const location = useLocation();
  
    $: {
      if ($location) {
        window.scrollTo(0, 0);
      }
    }
  </script>
  