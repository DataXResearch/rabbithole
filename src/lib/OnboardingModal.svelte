<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { ChevronLeft, ChevronRight, Check } from "radix-icons-svelte";
  import Modal from "./Modal.svelte";

  export let isOpen: boolean = false;

  const dispatch = createEventDispatcher();

  let currentSlide: number = 0;

  const slides = [
    {
      title: "Welcome to Rabbithole",
      content: `
        <p><strong>Your companion for deep dives on the web.</strong></p>
        <p>Rabbithole helps you organize your research trails, manage browser tabs, and keep track of where you've been without the clutter.</p>
      `,
    },
    {
      title: "Rabbitholes & Burrows",
      content: `
        <p><strong>Organize your knowledge.</strong></p>
        <p>Create <strong>Burrows</strong> for specific projects or topics you are researching.</p>
        <p>Group related Burrows into <strong>Rabbitholes</strong> to keep your workspace organized and focused.</p>
      `,
    },
    {
      title: "Sync Your Window",
      content: `
        <p><strong>Never lose context.</strong></p>
        <p>Working on a topic? Click the <strong>Sync</strong> button (reload icon) in the timeline header to save all your currently open tabs to the active Burrow instantly.</p>
      `,
    },
    {
      title: "Pinned Websites",
      content: `
        <p><strong>Quick access to essentials.</strong></p>
        <p>Pin important websites to your Burrow to keep them at the top. You can open all pinned sites at once with the "Open All" button when you're ready to resume work.</p>
      `,
    },
  ];

  function next(): void {
    if (currentSlide < slides.length - 1) {
      currentSlide++;
    } else {
      close();
    }
  }

  function prev(): void {
    if (currentSlide > 0) {
      currentSlide--;
    }
  }

  function close(): void {
    dispatch("close");
    // Reset slide after a delay so it doesn't jump while closing
    setTimeout(() => {
      currentSlide = 0;
    }, 300);
  }

  function goToSlide(index: number): void {
    currentSlide = index;
  }
</script>

<Modal {isOpen} title={slides[currentSlide].title} on:close={close}>
  <div class="onboarding-container">
    <div class="slide-content">
      {@html slides[currentSlide].content}
    </div>

    <div class="controls">
      <button
        class="nav-btn"
        on:click={prev}
        disabled={currentSlide === 0}
        aria-label="Previous slide"
      >
        <ChevronLeft size={24} />
      </button>

      <div class="dots">
        {#each slides as _, i}
          <button
            class="dot"
            class:active={i === currentSlide}
            on:click={() => goToSlide(i)}
            aria-label="Go to slide {i + 1}"
          ></button>
        {/each}
      </div>

      <button
        class="nav-btn"
        on:click={next}
        aria-label={currentSlide === slides.length - 1
          ? "Finish"
          : "Next slide"}
      >
        {#if currentSlide === slides.length - 1}
          <Check size={24} />
        {:else}
          <ChevronRight size={24} />
        {/if}
      </button>
    </div>
  </div>
</Modal>

<style>
  .onboarding-container {
    display: flex;
    flex-direction: column;
    min-height: 200px;
  }

  .slide-content {
    flex: 1;
    font-size: 16px;
    line-height: 1.6;
    color: #495057;
    margin-bottom: 32px;
    text-align: center;
    padding: 0 20px;
  }

  /* Deep selector for html content */
  .slide-content :global(p) {
    margin-bottom: 16px;
  }

  .slide-content :global(strong) {
    color: #1a1b1e;
    font-weight: 600;
  }

  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  .nav-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: #228be6;
    padding: 8px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  }

  .nav-btn:hover:not(:disabled) {
    background-color: rgba(34, 139, 230, 0.1);
  }

  .nav-btn:disabled {
    color: #adb5bd;
    cursor: default;
  }

  .dots {
    display: flex;
    gap: 8px;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #dee2e6;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .dot:hover {
    background-color: #ced4da;
  }

  .dot.active {
    background-color: #228be6;
  }

  /* Dark mode */
  :global(body.dark-mode) .slide-content {
    color: #c1c2c5;
  }

  :global(body.dark-mode) .slide-content :global(strong) {
    color: #e7e7e7;
  }

  :global(body.dark-mode) .controls {
    border-top-color: rgba(255, 255, 255, 0.1);
  }

  :global(body.dark-mode) .nav-btn {
    color: #4dabf7;
  }

  :global(body.dark-mode) .nav-btn:hover:not(:disabled) {
    background-color: rgba(77, 171, 247, 0.15);
  }

  :global(body.dark-mode) .nav-btn:disabled {
    color: #5c5f66;
  }

  :global(body.dark-mode) .dot {
    background-color: #373a40;
  }

  :global(body.dark-mode) .dot:hover {
    background-color: #5c5f66;
  }

  :global(body.dark-mode) .dot.active {
    background-color: #4dabf7;
  }
</style>
