<script>
  import { createEventDispatcher } from "svelte";
  import {
    Button,
    Text,
    TextInput,
    Tooltip,
    Stack,
    ActionIcon,
  } from "@svelteuidev/core";
  import SettingsButtons from "src/lib/SettingsButtons.svelte";
  import Auth from "src/lib/Auth.svelte";
  import { NotificationDuration } from "../utils";
  import ProjectSelector from "src/lib/ProjectSelector.svelte";
  import {
    HamburgerMenu,
    Plus,
    Download,
    Trash,
    Reload,
    FilePlus,
    Check,
  } from "radix-icons-svelte";

  const dispatch = createEventDispatcher();

  export let projects;
  export let syncWindowSuccess = false;
  export let isSyncingWindow = false;
  export let createAndSyncSuccess = false;
  export let isCreatingAndSyncing = false;
  export let opened;

  let createProjectFail = false;
  let createProjectFailMsg = "";

  let newRabbitholeName = "";
  let isHoveringOverSync = false;
  let isHoveringOverDelete = false;
  let isHoveringOverCreateSync = false;

  function validateProjectName() {
    let valid = true;
    if (newRabbitholeName === "") {
      createProjectFailMsg = "Required!";
      valid = false;
    }
    if (
      projects.filter(
        (p) => p.name.toLowerCase() === newRabbitholeName.toLowerCase()
      ).length > 0
    ) {
      createProjectFailMsg = "Taken!";
      valid = false;
    }
    if (!valid) {
      createProjectFail = true;
      setTimeout(() => {
        createProjectFail = false;
      }, NotificationDuration);
      return false;
    }
    return true;
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
      newRabbitholeName = "";
    }
  }

  async function saveAllTabsToNewProject() {
    if (validateProjectName()) {
      dispatch("newProjectSync", {
        newProjectName: newRabbitholeName,
      });
      newRabbitholeName = "";
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
  <div class="sidebar-header">
    <ActionIcon
      on:click={toggleSidebar}
      variant="transparent"
      class="hamburger-btn"
      size="xl"
    >
      <HamburgerMenu size="24" />
    </ActionIcon>
  </div>

  {#if opened}
    <div class="sidebar-content">
      <Stack spacing={40}>
        <!-- Profile Section -->
        <div class="section">
          <Text
            align="center"
            weight="bold"
            size="xs"
            transform="uppercase"
            color="dimmed"
            style="margin-bottom: 20px; letter-spacing: 0.5px;"
          >
            Profile
          </Text>
          <Auth />
        </div>

        <!-- Current Project Section -->
        <div class="section">
          <Text
            align="center"
            weight="bold"
            size="xs"
            transform="uppercase"
            color="dimmed"
            style="margin-bottom: 20px; letter-spacing: 0.5px;"
          >
            Active Project
          </Text>
          <Stack spacing={20} align="center">
            <ProjectSelector
              id="project-selector"
              {projects}
              {handleProjectChange}
            />

            <Tooltip
              {isHoveringOverSync}
              label="Save all tabs in window to current project"
              withArrow
              position="bottom"
              color="dark"
            >
              <div class="button-wrapper">
                <Button
                  on:click={saveAllTabsToActiveProject}
                  on:mouseenter={() => (isHoveringOverSync = true)}
                  on:mouseleave={() => (isHoveringOverSync = false)}
                  color="blue"
                  fullWidth
                  class="sidebar-btn"
                  leftIcon={Reload}
                  loading={isSyncingWindow}
                >
                  Sync Window
                </Button>
                {#if syncWindowSuccess}
                  <div class="success-check-outside">
                    <Check />
                  </div>
                {/if}
              </div>
            </Tooltip>

            <Tooltip
              {isHoveringOverDelete}
              label="Irreversible!"
              withArrow
              position="bottom"
              color="red"
            >
              <Button
                on:click={deleteProject}
                on:mouseenter={() => (isHoveringOverDelete = true)}
                on:mouseleave={() => (isHoveringOverDelete = false)}
                color="red"
                fullWidth
                class="sidebar-btn"
                leftIcon={Trash}
              >
                Delete Project
              </Button>
            </Tooltip>
          </Stack>
        </div>

        <!-- Create Section -->
        <div class="section">
          <Text
            align="center"
            weight="bold"
            size="xs"
            transform="uppercase"
            color="dimmed"
            style="margin-bottom: 20px; letter-spacing: 0.5px;"
          >
            New Project
          </Text>
          <Stack spacing={20} align="center">
            <TextInput
              placeholder="Project Name"
              bind:value={newRabbitholeName}
              variant="filled"
              radius="md"
              error={createProjectFail ? createProjectFailMsg : false}
            />

            <Button
              on:click={createNewProject}
              color="blue"
              fullWidth
              class="sidebar-btn"
              leftIcon={FilePlus}
            >
              Create Empty
            </Button>

            <Tooltip
              {isHoveringOverCreateSync}
              label="Create project and save all tabs"
              withArrow
              position="bottom"
              color="dark"
            >
              <div class="button-wrapper">
                <Button
                  on:click={saveAllTabsToNewProject}
                  on:mouseenter={() => (isHoveringOverCreateSync = true)}
                  on:mouseleave={() => (isHoveringOverCreateSync = false)}
                  color="blue"
                  fullWidth
                  class="sidebar-btn"
                  leftIcon={Reload}
                  loading={isCreatingAndSyncing}
                >
                  Create & Sync Tabs
                </Button>
                {#if createAndSyncSuccess}
                  <div class="success-check-outside">
                    <Check />
                  </div>
                {/if}
              </div>
            </Tooltip>
          </Stack>
        </div>

        <!-- Settings Section -->
        <div class="section">
          <Text
            align="center"
            weight="bold"
            size="xs"
            transform="uppercase"
            color="dimmed"
            style="margin-bottom: 20px; letter-spacing: 0.5px;"
          >
            Settings
          </Text>
          <Stack spacing={20}>
            <SettingsButtons />
          </Stack>
        </div>

        <!-- Export Section -->
        <div class="section">
          <Text
            align="center"
            weight="bold"
            size="xs"
            transform="uppercase"
            color="dimmed"
            style="margin-bottom: 20px; letter-spacing: 0.5px;"
          >
            Export
          </Text>
          <Stack spacing={20} align="center">
            <Button
              on:click={exportRabbitholes}
              color="blue"
              fullWidth
              class="sidebar-btn"
              leftIcon={Download}
            >
              Export Data
            </Button>
          </Stack>
        </div>
      </Stack>
    </div>
  {/if}
</div>

<style>
  .sidebar-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 20px;
  }

  .sidebar-header {
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding-right: 30px; /* Increased to make room for checkmarks */
    animation: fadeIn 0.2s ease-in-out;
  }

  .section {
    width: 100%;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* --- Button Standardization --- */

  /* Base Sidebar Button */
  :global(.sidebar-btn) {
    height: 42px;
    font-weight: 500;
    text-align: center;
    position: relative;
  }

  :global(.sidebar-btn .mantine-Button-inner) {
    justify-content: center !important;
    width: 100%;
  }

  .button-wrapper {
    position: relative;
    width: 100%;
  }

  .success-check-outside {
    position: absolute;
    right: -26px;
    top: 50%;
    transform: translateY(-50%);
    color: #40c057;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Center text in inputs (like Project Name) */
  :global(.sidebar-content input) {
    text-align: center !important;
  }

  /*
     Dark Mode Overrides
  */
  :global(body.dark-mode .sidebar-wrapper) {
    background-color: #1a1b1e;
    color: #c1c2c5;
  }

  :global(body.dark-mode .hamburger-btn) {
    color: #e7e7e7 !important;
  }
  :global(body.dark-mode .hamburger-btn:hover) {
    background-color: #25262b;
  }

  :global(body.dark-mode .mantine-TextInput-input) {
    background-color: #25262b;
    border-color: transparent;
    color: #c1c2c5;
  }
  :global(body.dark-mode .mantine-TextInput-input:focus) {
    border-color: #339af0;
  }
</style>
