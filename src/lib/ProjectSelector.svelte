<script>
  import { onMount } from "svelte";
  import { NativeSelect } from '@svelteuidev/core';
  import { MessageRequest } from "../utils.ts"

  export let handleProjectChange;
  export let projects = [];
</script>

<div>
 <NativeSelect data={projects.map(p => { return { label: p.name, value: p.id }; })}
    on:change={handleProjectChange}
    />
</div>
