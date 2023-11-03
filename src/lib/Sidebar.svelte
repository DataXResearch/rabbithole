<script>
  import { onMount, createEventDispatcher } from "svelte";
  import { Badge, Button, Card, Group, Image, Text, TextInput, Tooltip } from '@svelteuidev/core';
  import SettingsButtons from "src/lib/SettingsButtons.svelte"
  import UpdatingComponent from "src/lib/UpdatingComponent.svelte"
  import { MessageRequest, NotificationDuration } from "../utils"
  import ProjectSelector from "src/lib/ProjectSelector.svelte"

  // FIXME: why aren't types working here?
  const dispatch = createEventDispatcher();

  export let projects;
  export let syncSuccess;

  let createProjectFail = false;
  let createProjectFailMsg = "";

  let newRabbitholeName = "";
  let isHoveringOverSync = false;
  let isHoveringOverDelete = false;
  const textStyleOverride = {
    marginTop: "15px"
  }

  function validateProjectName() {
    let valid = true;
    if (newRabbitholeName === "") {
      createProjectFailMsg = "Project name required!";
      valid = false;
    }
    if (projects.filter(p => p.name === newRabbitholeName).length > 0) {
      createProjectFailMsg = "Project name already used!";
      valid = false;
    }
    if (!valid) {
      createProjectFail = true;
      setTimeout(() => { createProjectFail = false; }, NotificationDuration);
      return false;
    }
    return valid;
  }

  async function handleProjectChange(event) {
    dispatch('projectChange', {
      newProjectId: event.target.value,
    });
  }

  async function createNewProject() {
    if (validateProjectName()){
      dispatch('newProject', {
        newProjectName: newRabbitholeName
      });
    }
  }

  async function saveAllTabsToNewProject() {
    if (validateProjectName()){
      dispatch('newProjectSync', {
        newProjectName: newRabbitholeName
      });
    }
  }

  async function saveAllTabsToActiveProject() {
    dispatch('projectSync');
  }

  async function deleteProject() {
    dispatch("projectDelete");
  }
</script>

<div class="sidebar">
  <Group direction="column" position="left" override={{
         alignItems: "left"
     }}>
    <Text weight="bold" size="lg" override={textStyleOverride}>Overlay Settings</Text>
    <SettingsButtons/>
    <Text weight="bold" size="lg" override={textStyleOverride}>Change Project</Text>
    <ProjectSelector
      id="project-selector"
      projects={projects}
      handleProjectChange={handleProjectChange} />
    <Tooltip {isHoveringOverSync} label="Save all tabs in window to current project">
      <UpdatingComponent success={syncSuccess}>
        <Button
          on:click={saveAllTabsToActiveProject}
          on:mouseenter={()=>{isHoveringOverSync=true}}
          on:mouseleave={()=>{isHoveringOverSync=false}}
          variant='light'
          color='blue'
          >
          Sync window
        </Button>
      </UpdatingComponent>
    </Tooltip>
    <Tooltip {isHoveringOverDelete} label="This action is irreversible!">
      <Button
        on:click={deleteProject}
        on:mouseenter={()=>{isHoveringOverDelete=true}}
        on:mouseleave={()=>{isHoveringOverDelete=false}}
        variant='filled'
        color='red'
        >
        Delete Project
      </Button>
    </Tooltip>
    <Text weight="bold" size="lg" override={textStyleOverride}>Create Project</Text>
    <UpdatingComponent fail={createProjectFail} failMsg={createProjectFailMsg}>
      <TextInput
        placeholder="My new rabbithole"
        bind:value={newRabbitholeName}
        />
    </UpdatingComponent>
    <Button
      on:click={createNewProject}
      variant='light'
      color='blue'
      >
      Create empty project
    </Button>
    <Button
      on:click={saveAllTabsToNewProject}
      variant='light'
      color='blue'
      >
      Create and save all tabs in window
    </Button>
  </Group>
</div>

<style>
  .sidebar {
    margin-top: 15px;
    margin-left: 10px;
  }
</style>
