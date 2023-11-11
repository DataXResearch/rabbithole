<script lang="ts">
  import _ from "lodash";
  import type { Project } from "src/storage/db";
  import { MessageRequest, getOrderedProjects } from "src/utils";
  import { onMount } from "svelte";
  import Logo from "../../assets/icons/logo.png";
  import Button from "../../components/button.svelte";
  import { FormInput, FormSelect } from "../../components/form";
  import { Menu } from "../../components/headless";
  import Lucide from "../../components/lucide.svelte";
  import Pagination from "../../components/pagination";

  let activeProject = {};
  let projects: Project[] = [];

  onMount(async () => {
    projects = await getOrderedProjects();
    activeProject = await chrome.runtime.sendMessage({
      type: MessageRequest.GET_ACTIVE_PROJECT,
    });
    // updateWebsites();
  });

  //   async function createNewProject(event) {
  //     activeProject = await chrome.runtime.sendMessage({
  //       type: MessageRequest.CREATE_NEW_PROJECT,
  //       newProjectName: event.detail.newProjectName,
  //     });
  //     projects = await getOrderedProjects();
  //     // updateWebsites();
  //   }
</script>

<div>
  <h2 class="mt-10 text-lg font-medium intro-y">Rabbithole Collections</h2>
  <div class="grid grid-cols-12 gap-6 mt-5">
    <div
      class="flex flex-wrap items-center col-span-12 mt-2 intro-y sm:flex-nowrap"
    >
      <Button variant="primary" class="mr-2 shadow-md">Create Collection</Button
      >
      <div class="hidden mx-auto md:block text-slate-500">
        Showing 1 to 10 of {projects.length} entries
      </div>
      <div class="w-full mt-3 sm:w-auto sm:mt-0 sm:ml-auto md:ml-0">
        <div class="relative w-56 text-slate-500">
          <FormInput
            type="text"
            class="w-56 pr-10 !box"
            placeholder="Search..."
          />
          <Lucide
            icon="Search"
            class="absolute inset-y-0 right-0 w-4 h-4 my-auto mr-3"
          />
        </div>
      </div>
    </div>
    <!-- BEGIN: Users Layout -->
    {#each _.take(projects) as project}
      <div class="col-span-12 intro-y md:col-span-6 lg:col-span-4">
        <div class="box">
          <div class="flex items-start px-5 pt-5">
            <div class="flex flex-col items-center w-full lg:flex-row">
              <div class="w-16 h-16 image-fit">
                <img alt="rabbithole" class="rounded-full" src={Logo} />
              </div>
              <div class="mt-3 text-center lg:ml-4 lg:text-left lg:mt-0">
                <a href="#top" class="font-medium">
                  {project.name}
                </a>
                <div class="text-slate-500 text-xs mt-0.5">
                  {project.id}
                </div>
              </div>
            </div>
            <Menu class="absolute top-0 right-0 mt-3 mr-5">
              <Menu.Button as="a" class="block w-5 h-5">
                <Lucide icon="MoreHorizontal" class="w-5 h-5 text-slate-500" />
              </Menu.Button>
              <Menu.Items class="w-40">
                <Menu.Item>
                  <Lucide icon="Edit2" class="w-4 h-4 mr-2" /> Edit
                </Menu.Item>
                <Menu.Item>
                  <Lucide icon="Trash" class="w-4 h-4 mr-2" /> Delete
                </Menu.Item>
              </Menu.Items>
            </Menu>
          </div>
          <div class="p-5 text-center lg:text-left">
            <div><time>{project.createdAt}</time></div>
            <div
              class="flex items-center justify-center mt-5 lg:justify-start text-slate-500"
            >
              <Lucide icon="Network" class="w-3 h-3 mr-2" />
              {project.savedWebsites.length >= 1
                ? "No websites"
                : `${project.savedWebsites.length} websites`}
            </div>
          </div>
          <div
            class="p-5 text-center border-t lg:text-right border-slate-200/60 dark:border-darkmode-400"
          >
            <Button variant="primary" class="px-2 py-1 mr-2">Browse</Button>
          </div>
        </div>
      </div>
    {/each}
    <!-- END: Users Layout -->
    <!-- BEGIN: Pagination -->
    <div
      class="flex flex-wrap items-center col-span-12 intro-y sm:flex-row sm:flex-nowrap"
    >
      <Pagination class="w-full sm:w-auto sm:mr-auto">
        <Pagination.Link>
          <Lucide icon="ChevronsLeft" class="w-4 h-4" />
        </Pagination.Link>
        <Pagination.Link>
          <Lucide icon="ChevronLeft" class="w-4 h-4" />
        </Pagination.Link>
        <Pagination.Link>...</Pagination.Link>
        <Pagination.Link>1</Pagination.Link>
        <Pagination.Link active>2</Pagination.Link>
        <Pagination.Link>3</Pagination.Link>
        <Pagination.Link>...</Pagination.Link>
        <Pagination.Link>
          <Lucide icon="ChevronRight" class="w-4 h-4" />
        </Pagination.Link>
        <Pagination.Link>
          <Lucide icon="ChevronsRight" class="w-4 h-4" />
        </Pagination.Link>
      </Pagination>
      <FormSelect class="w-20 mt-3 !box sm:mt-0">
        <option>10</option>
        <option>25</option>
        <option>35</option>
        <option>50</option>
      </FormSelect>
    </div>
    <!-- END: Pagination -->
  </div>
</div>
