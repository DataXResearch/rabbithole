<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { scaleTime } from "d3-scale";
  import { timeDay } from "d3-time";

  const dispatch = createEventDispatcher();

  export let websites = [];
  export let startDate = null;
  export let endDate = null;

  let sliderContainer;
  let isDragging = false;
  let dragHandle = null;

  $: if (websites.length > 0) {
    initializeSlider();
  }

  function initializeSlider() {
    if (websites.length === 0) return;

    const dates = websites.map((w) => new Date(w.savedAt));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    if (!startDate) startDate = minDate;
    if (!endDate) endDate = maxDate;

    dispatch("dateRangeChange", { startDate, endDate });
  }

  function handleSliderChange(event) {
    if (websites.length === 0) return;

    const rect = sliderContainer.getBoundingClientRect();
    const dates = websites.map((w) => new Date(w.savedAt));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    const scale = scaleTime().domain([minDate, maxDate]).range([0, rect.width]);

    const x = event.clientX - rect.left;
    const selectedDate = scale.invert(x);

    if (event.target.classList.contains("start-handle")) {
      startDate = selectedDate;
    } else if (event.target.classList.contains("end-handle")) {
      endDate = selectedDate;
    }

    dispatch("dateRangeChange", { startDate, endDate });
  }

  function getWebsitePositions() {
    if (websites.length === 0 || !sliderContainer) return [];

    const rect = sliderContainer.getBoundingClientRect();
    const dates = websites.map((w) => new Date(w.savedAt));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    const scale = scaleTime().domain([minDate, maxDate]).range([0, rect.width]);

    return websites.map((website) => ({
      ...website,
      x: scale(new Date(website.savedAt)),
    }));
  }

  function getHandlePositions() {
    if (websites.length === 0 || !sliderContainer || !startDate || !endDate)
      return { start: 0, end: 0 };

    const rect = sliderContainer.getBoundingClientRect();
    const dates = websites.map((w) => new Date(w.savedAt));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    const scale = scaleTime().domain([minDate, maxDate]).range([0, rect.width]);

    return {
      start: scale(startDate),
      end: scale(endDate),
    };
  }

  $: websitePositions = getWebsitePositions();
  $: handlePositions = getHandlePositions();
</script>

<div class="timeline-container">
  <div
    class="timeline-slider"
    bind:this={sliderContainer}
    on:click={handleSliderChange}
  >
    <div class="slider-track"></div>

    <!-- Website icons -->
    {#each websitePositions as website}
      <div
        class="website-icon"
        style="left: {website.x}px"
        title="{website.name} - {new Date(
          website.savedAt,
        ).toLocaleDateString()}"
      >
        {#if website.faviconUrl}
          <img src={website.faviconUrl} alt={website.name} />
        {:else}
          <div class="default-icon">•</div>
        {/if}
      </div>
    {/each}

    <!-- Range selection -->
    <div
      class="range-selection"
      style="left: {handlePositions.start}px; width: {handlePositions.end -
        handlePositions.start}px"
    ></div>

    <!-- Handles -->
    <div
      class="slider-handle start-handle"
      style="left: {handlePositions.start}px"
      on:click={handleSliderChange}
    ></div>
    <div
      class="slider-handle end-handle"
      style="left: {handlePositions.end}px"
      on:click={handleSliderChange}
    ></div>
  </div>

  <!-- Date labels -->
  <div class="date-labels">
    <span>{startDate ? startDate.toLocaleDateString() : ""}</span>
    <span>{endDate ? endDate.toLocaleDateString() : ""}</span>
  </div>
</div>

<style>
  .timeline-container {
    margin: 20px 0;
    width: 100%;
  }

  .timeline-slider {
    position: relative;
    height: 60px;
    width: 100%;
    background: #f5f5f5;
    border-radius: 8px;
    cursor: pointer;
  }

  .slider-track {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 4px;
    background: #ddd;
    transform: translateY(-50%);
  }

  .website-icon {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    z-index: 2;
  }

  .website-icon img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }

  .default-icon {
    width: 100%;
    height: 100%;
    background: #007bff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 8px;
  }

  .range-selection {
    position: absolute;
    top: 50%;
    height: 8px;
    background: rgba(0, 123, 255, 0.3);
    transform: translateY(-50%);
    z-index: 1;
  }

  .slider-handle {
    position: absolute;
    top: 50%;
    width: 20px;
    height: 20px;
    background: #007bff;
    border: 2px solid white;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    cursor: grab;
    z-index: 3;
  }

  .slider-handle:active {
    cursor: grabbing;
  }

  .date-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    font-size: 12px;
    color: #666;
  }
</style>
