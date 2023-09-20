<script>
  import { onMount } from "svelte";
  import { NativeSelect } from '@svelteuidev/core';
  import { MessageRequest } from "../utils.ts"

  export let handleProjectChange;
  let projects = [];
  let unsortedProjects = [];

  onMount(async () => {
    await makeActiveProjectFirst();
  });

  async function makeActiveProjectFirst() {
    unsortedProjects = await chrome.runtime.sendMessage({type: MessageRequest.GET_ALL_PROJECTS});
    const activeProject = await chrome.runtime.sendMessage({ type: MessageRequest.GET_ACTIVE_PROJECT });

    // FIXME: what even....
    projects = unsortedProjects;

    for (let i = 0; i < projects.length; i++) {
      if (projects[i].name === activeProject.name) {
        projects.splice(i, 1);
      }
    }
    projects.unshift(activeProject);
  }

  async function handleProjectChangeWrapper(event) {
    await handleProjectChange(event);
    await makeActiveProjectFirst();
  }
</script>

<div>
 <NativeSelect data={projects.map(p => { return { label: p.name, value: p.id }; })}
    label="Active Project"
    on:change={handleProjectChangeWrapper}
    />
</div>
