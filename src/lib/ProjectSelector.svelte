<script>
  import { TextInput, Paper, Button } from "@svelteuidev/core";
  import { MessageRequest } from "../utils";

  export let handleProjectChange;
  export let projects = [];
  // "down" or "up"
  export let dropdownDirection = "down";
  // Allow creating new projects when no results found
  export let allowCreate = false;

  let searchValue = "";
  let isOpen = false;

  $: selectedProject = projects.length > 0 ? projects[0] : null;
  $: displayValue = isOpen ? searchValue : (selectedProject?.name || "");
  $: filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchValue.toLowerCase().trim())
  );

  function handleFocus() {
    isOpen = true;
    searchValue = "";
  }

  function handleBlur(event) {
    // Delay closing to allow click events on dropdown items
    setTimeout(() => {
      isOpen = false;
      searchValue = "";
    }, 150);
  }

  function handleInput(event) {
    searchValue = event.target.value;
  }

  function selectProject(project) {
    selectedProject = project;
    isOpen = false;
    searchValue = "";
    // Create a synthetic event similar to what Select would dispatch
    handleProjectChange({ detail: project.id });

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  async function createNewProject() {
    const projectName = searchValue.trim();
    if (!projectName) return;

    try {
      const newProject = await chrome.runtime.sendMessage({
        type: MessageRequest.CREATE_NEW_BURROW,
        newProjectName: projectName,
      });

      // Refresh projects list
      const allProjects = await chrome.runtime.sendMessage({
        type: MessageRequest.GET_ALL_BURROWS,
      });
      projects = allProjects;

      // Select the new project
      selectProject(newProject);
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      isOpen = false;
      searchValue = "";
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
    if (event.key === "Enter") {
      if (filteredProjects.length > 0) {
        selectProject(filteredProjects[0]);
      } else if (allowCreate && searchValue.trim()) {
        createNewProject();
      }
    }
  }
</script>

<div class="project-selector-container">
  <TextInput
    value={displayValue}
    on:focus={handleFocus}
    on:blur={handleBlur}
    on:input={handleInput}
    on:keydown={handleKeydown}
    placeholder="Select or search project"
    radius="md"
    size="sm"
    class="project-selector-input"
  />

  {#if isOpen}
    <Paper class="project-dropdown {dropdownDirection === 'up' ? 'dropdown-up' : 'dropdown-down'}" shadow="md" radius="md" padding="xs">
      {#if filteredProjects.length > 0}
        {#each filteredProjects as project}
          <button
            type="button"
            class="project-option"
            class:selected={selectedProject?.id === project.id}
            on:mousedown|preventDefault={() => selectProject(project)}
          >
            {project.name}
          </button>
        {/each}
      {:else if allowCreate && searchValue.trim()}
        <button
          type="button"
          class="create-project-button"
          on:mousedown|preventDefault={createNewProject}
        >
          Create "{searchValue.trim()}"
        </button>
      {:else}
        <div class="no-results">No projects found</div>
      {/if}
    </Paper>
  {/if}
</div>

<style>
  .project-selector-container {
    width: 100%;
    position: relative;
  }

  :global(.project-selector-input input) {
    text-align: center;
    cursor: pointer;
  }

  :global(.project-selector-input input:focus) {
    text-align: left;
  }

  :global(.project-dropdown) {
    position: absolute;
    left: 0;
    right: 0;
    z-index: 1000;
    max-height: 200px;
    overflow-y: auto;
    background: white;
  }

  :global(.project-dropdown.dropdown-down) {
    top: 100%;
    margin-top: 4px;
  }

  :global(.project-dropdown.dropdown-up) {
    bottom: 100%;
    margin-bottom: 4px;
  }

  .project-option {
    display: block;
    width: 100%;
    padding: 8px 12px;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    border-radius: 4px;
    color: inherit;
  }

  .project-option:hover {
    background-color: #f1f3f5;
  }

  .project-option.selected {
    background-color: #e7f5ff;
    color: #1c7ed6;
  }

  .create-project-button {
    display: block;
    width: 100%;
    padding: 8px 12px;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    border-radius: 4px;
    color: #1185fe;
    font-weight: 500;
  }

  .create-project-button:hover {
    background-color: #e7f5ff;
  }

  .no-results {
    padding: 8px 12px;
    text-align: center;
    color: #868e96;
    font-size: 14px;
  }

  /* Dark mode */
  :global(body.dark-mode .project-dropdown) {
    background: #25262b;
  }

  :global(body.dark-mode) .project-option {
    color: #c1c2c5;
  }

  :global(body.dark-mode) .project-option:hover {
    background-color: #2c2e33;
    color: #ffffff;
  }

  :global(body.dark-mode) .project-option.selected {
    background-color: #1c3a5e;
    color: #74c0fc;
  }

  :global(body.dark-mode) .create-project-button {
    color: #4dabf7;
  }

  :global(body.dark-mode) .create-project-button:hover {
    background-color: #1c3a5e;
  }

  :global(body.dark-mode) .no-results {
    color: #909296;
  }
</style>
