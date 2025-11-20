<script lang="ts">
  import Overlay from "src/lib/Overlay.svelte";
</script>

<div class="popup-wrapper">
  <Overlay isPopup={true} />
</div>

<style>
  .popup-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
