<script>
  import { createEventDispatcher } from "svelte";
  import { Button, Group, Text, TextInput, Tooltip } from "@svelteuidev/core";
  import SettingsButtons from "src/lib/SettingsButtons.svelte";
  import UpdatingComponent from "src/lib/UpdatingComponent.svelte";
  import { NotificationDuration } from "../utils";
  import ProjectSelector from "src/lib/ProjectSelector.svelte";
  import { HamburgerMenu } from "radix-icons-svelte";

  const dispatch = createEventDispatcher();

  export let projects;
  export let syncSuccess;
  export let opened;

  let createProjectFail = false;
  let createProjectFailMsg = "";

  let newRabbitholeName = "";
  let isHoveringOverSync = false;
  let isHoveringOverDelete = false;
  const textStyleOverride = {
    marginTop: "15px",
  };

  function validateProjectName() {
    let valid = true;
    if (newRabbitholeName === "") {
      createProjectFailMsg = "Project name required!";
      valid = false;
    }
    if (projects.filter((p) => p.name === newRabbitholeName).length > 0) {
      createProjectFailMsg = "Project name already used!";
      valid = false;
    }
    if (!valid) {
      createProjectFail = true;
      setTimeout(() => {
        createProjectFail = false;
      }, NotificationDuration);
      return false;
    }
    return valid;
  }

  async function handleProjectChange(event) {
    dispatch("projectChange", {
      newProjectId: event.target.value,
    });
  }

  async function createNewProject() {
    if (validateProjectName()) {
      dispatch("newProject", {
        newProjectName: newRabbitholeName,
      });
    }
  }

  async function saveAllTabsToNewProject() {
    if (validateProjectName()) {
      dispatch("newProjectSync", {
        newProjectName: newRabbitholeName,
      });
    }
  }

  async function saveAllTabsToActiveProject() {
    dispatch("projectSync");
  }

  async function deleteProject() {
    dispatch("projectDelete");
  }

  async function exportRabbitholes() {
    dispatch("exportRabbitholes");
  }

  function toggleSidebar() {
    dispatch("toggleSidebar");
  }
</script>

<div class="sidebar-wrapper">
  <Button
    on:click={toggleSidebar}
    variant="subtle"
    color="gray"
    override={{ marginBottom: "20px", alignSelf: "flex-start", padding: "4px" }}
  >
    <HamburgerMenu size="24" color="#1a1a1a" />
  </Button>

  {#if opened}
    <div class="sidebar">
      <Group
        direction="column"
        position="left"
        override={{
          alignItems: "left",
        }}
      >
        <Text weight="bold" size="lg" override={textStyleOverride}
          >Overlay Settings</Text
        >
        <SettingsButtons />
        <Text weight="bold" size="lg" override={textStyleOverride}
          >Change Project</Text
        >
        <ProjectSelector
          id="project-selector"
          {projects}
          {handleProjectChange}
        />
        <Tooltip
          {isHoveringOverSync}
          label="Save all tabs in window to current project"
        >
          <UpdatingComponent
            success={syncSuccess}
            successMsg="Window synced successfully!"
          >
            <Button
              on:click={saveAllTabsToActiveProject}
              on:mouseenter={() => {
                isHoveringOverSync = true;
              }}
              on:mouseleave={() => {
                isHoveringOverSync = false;
              }}
              variant="light"
              color="blue"
            >
              Sync window
            </Button>
          </UpdatingComponent>
        </Tooltip>
        <Tooltip {isHoveringOverDelete} label="This action is irreversible!">
          <Button
            on:click={deleteProject}
            on:mouseenter={() => {
              isHoveringOverDelete = true;
            }}
            on:mouseleave={() => {
              isHoveringOverDelete = false;
            }}
            variant="filled"
            color="red"
          >
            Delete Project
          </Button>
        </Tooltip>
        <Text weight="bold" size="lg" override={textStyleOverride}
          >Create Project</Text
        >
        <UpdatingComponent
          fail={createProjectFail}
          failMsg={createProjectFailMsg}
        >
          <TextInput
            placeholder="My new rabbithole"
            bind:value={newRabbitholeName}
          />
        </UpdatingComponent>
        <Button on:click={createNewProject} variant="light" color="blue">
          Create empty project
        </Button>
        <Button on:click={saveAllTabsToNewProject} variant="light" color="blue">
          Create and save all tabs in window
        </Button>
        <Button on:click={exportRabbitholes} variant="light" color="blue">
          Export rabbitholes
        </Button>
      </Group>
    </div>
  {/if}
</div>

<style>
  .sidebar-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .sidebar {
    margin-top: 15px;
    margin-left: 10px;
    display: flex;
    flex-direction: column;
  }

  :global(.active-rabbithole) {
    font-weight: bold;
    color: #1a1a1a;
  }

  :global(body.dark-mode .sidebar) {
    background-color: #d3d3d3;
    color: #1a1a1a;
  }

  :global(body.dark-mode .sidebar .mantine-Text-root) {
    color: #1a1a1a;
  }

  :global(body.dark-mode .sidebar .mantine-Button-root) {
    color: #1a1a1a;
  }

  :global(body.dark-mode .sidebar-wrapper) {
    background-color: #d3d3d3;
  }
</style>
