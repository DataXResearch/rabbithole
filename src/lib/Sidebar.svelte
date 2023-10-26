<script>
  import { onMount, createEventDispatcher } from "svelte";
  import { Badge, Button, Card, Group, Image, Text, TextInput, Tooltip } from '@svelteuidev/core';
  import SettingsButtons from "src/lib/SettingsButtons.svelte"
  import { MessageRequest } from "../utils"
  import ProjectSelector from "src/lib/ProjectSelector.svelte"

  // FIXME: why aren't types working here?
  const dispatch = createEventDispatcher();

  export let projects;

  let newRabbitholeName = "";
  let isHovering = false;

  async function handleProjectChange(event) {
    dispatch('projectChange', {
      newProjectId: event.target.value,
    });
  }

  async function createNewProject() {
    if (newRabbitholeName === "") {
      // TODO: error modal
      return;
    }
    dispatch('newProject', {
      newProjectName: newRabbitholeName
    });
  }

  async function saveAllTabs() {
    if (newRabbitholeName === "") {
      // TODO: error modal
      return;
    }
    dispatch('newProjectSync', {
      newProjectName: newRabbitholeName
    });
  }

  async function saveAllTabsToActiveProject() {
    dispatch('projectSync');
  }
</script>

<div class="sidebar">
  <SettingsButtons/>
  <div>
    <div>
      <ProjectSelector
        id="project-selector"
        projects={projects}
        handleProjectChange={handleProjectChange} />
    </div>
    <TextInput
      placeholder="My new rabbithole"
      label="New Project"
      bind:value={newRabbitholeName}
      />
    <Button
      on:click={createNewProject}
      variant='light'
      color='blue'
      >
      Create
    </Button>
    <Button
      on:click={saveAllTabs}
      variant='light'
      color='blue'
      >
      Create and save all tabs in window
    </Button>
    <Tooltip {isHovering} label="Save all tabs in window to current project">
      <Button
        on:click={saveAllTabsToActiveProject}
        on:mouseenter={()=>{isHovering=true}}
        on:mouseleave={()=>{isHovering=false}}
        variant='light'
        color='blue'
        >
        Sync Window
      </Button>
    </Tooltip>
  </div>
</div>

<style>
  .sidebar {
    color: #ab4f16dc;
  }
</style>
