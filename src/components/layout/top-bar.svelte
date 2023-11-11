<script lang="ts">
  import { Transition } from "@rgossiaux/svelte-headlessui";
  import clsx from "clsx";
  import Breadcrumb from "../breadcrumb";
  import { FormInput } from "../form";
  import { Menu, Popover } from "../headless";
  import Lucide from "../lucide.svelte";

  let searchDropdown = false;
  const showSearchDropdown = () => {
    searchDropdown = true;
  };
  const hideSearchDropdown = () => {
    searchDropdown = false;
  };
</script>

<!-- BEGIN: Top Bar -->
<div
  class="relative z-[51] flex h-[67px] items-center border-b border-slate-200"
>
  <!-- BEGIN: Breadcrumb -->
  <Breadcrumb class="-intro-x mr-auto hidden sm:flex">
    <Breadcrumb.Link to="/">Application</Breadcrumb.Link>
    <Breadcrumb.Link to="/" active={true}>Rabbitholes</Breadcrumb.Link>
  </Breadcrumb>
  <!-- END: Breadcrumb -->
  <!-- BEGIN: Search -->
  <div class="search intro-x relative mr-3 sm:mr-6">
    <div class="relative hidden sm:block">
      <FormInput
        type="text"
        class="w-56 rounded-full border-transparent bg-slate-300/50 pr-8 shadow-none transition-[width] duration-300 ease-in-out focus:w-72 focus:border-transparent dark:bg-darkmode-400/70"
        placeholder="Search..."
        on:focus={showSearchDropdown}
        on:blur={hideSearchDropdown}
      />
      <Lucide
        icon="Search"
        class="absolute inset-y-0 right-0 my-auto mr-3 h-5 w-5 text-slate-600 dark:text-slate-500"
      />
    </div>
    <a class="relative text-slate-600 sm:hidden" href="#query">
      <Lucide icon="Search" class="w-5 h-5 dark:text-slate-500" />
    </a>
    <Transition
      show={searchDropdown}
      enter="transition-all ease-linear duration-150"
      enterFrom="!mt-5 invisible opacity-0 translate-y-1"
      enterTo="mt-[3px] visible opacity-100 translate-y-0"
      leave="transition-all ease-linear duration-150"
      leaveFrom="mt-[3px] visible opacity-100 translate-y-0"
      leaveTo="!mt-5 invisible opacity-0 translate-y-1"
      class="absolute right-0 z-10 mt-[3px]"
    >
      <div class="w-[450px] p-5 box">
        <div class="mb-2 font-medium">Views</div>
        <div class="mb-5">
          <a href="#top" class="flex items-center">
            <div
              class="flex items-center justify-center w-8 h-8 rounded-full bg-success/20 dark:bg-success/10 text-success"
            >
              <Lucide icon="Inbox" class="w-4 h-4" />
            </div>
            <div class="ml-3">Mail Settings</div>
          </a>
          <a href="#top" class="flex items-center mt-2">
            <div
              class="flex items-center justify-center w-8 h-8 rounded-full bg-pending/10 text-pending"
            >
              <Lucide icon="Users" class="w-4 h-4" />
            </div>
            <div class="ml-3">Users & Permissions</div>
          </a>
        </div>
      </div>
    </Transition>
  </div>
  <!-- END: Search  -->
  <!-- BEGIN: Notifications -->
  <Popover class="intro-x mr-auto sm:mr-6" let:close>
    <Popover.Button
      class="
            relative block text-slate-600 outline-none 
            before:absolute before:top-[-2px] before:right-0 before:h-[8px] before:w-[8px] before:rounded-full before:bg-danger before:content-['']
          "
    >
      <Lucide icon="Bell" class="w-5 h-5 dark:text-slate-500" />
    </Popover.Button>
    <Popover.Panel class="mt-2 w-[280px] p-5 sm:w-[350px]">
      <div class="mb-5 font-medium">Notifications</div>

      <div class={clsx(["cursor-pointer relative flex items-center", "mt-5"])}>
        <!-- <div class="relative flex-none w-12 h-12 mr-1 image-fit">
          <img
            alt="gravatar"
            class="rounded-full"
            src={"https://ui-avatars.com/api/?name=NA"}
          />
          <div
            class="absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full bg-success dark:border-darkmode-600"
          />
        </div>
        <div class="ml-2 overflow-hidden">
          <div class="flex items-center">
            <a href="#top" class="mr-5 font-medium truncate"> Name </a>
            <div class="ml-auto text-xs text-slate-400 whitespace-nowrap">
              4:30 AM
            </div>
          </div>
          <div class="w-full truncate text-slate-500 mt-0.5">Example text</div>
        </div> -->
      </div>
    </Popover.Panel>
  </Popover>
  <!-- END: Notifications  -->
  <!-- BEGIN: Account Menu -->
  <Menu>
    <Menu.Button
      class="image-fit zoom-in intro-x block h-8 w-8 overflow-hidden rounded-full shadow-lg"
    >
      <img alt="gravatar" src={"https://ui-avatars.com/api/?name=NA"} />
    </Menu.Button>
    <Menu.Items class="w-56 mt-px text-white bg-primary">
      <Menu.Header class="font-normal">
        <div class="font-medium">N/A</div>
        <div class="text-xs text-white/70 mt-0.5 dark:text-slate-500">N/A</div>
      </Menu.Header>
      <Menu.Divider class="bg-white/[0.08]" />
      <Menu.Item class="hover:bg-white/5">
        <Lucide icon="User" class="w-4 h-4 mr-2" /> Profile
      </Menu.Item>
      <Menu.Item class="hover:bg-white/5">
        <Lucide icon="Lock" class="w-4 h-4 mr-2" /> Reset Password
      </Menu.Item>
      <Menu.Item class="hover:bg-white/5">
        <Lucide icon="HelpCircle" class="w-4 h-4 mr-2" /> Help
      </Menu.Item>
      <Menu.Divider class="bg-white/[0.08]" />
      <Menu.Item class="hover:bg-white/5">
        <Lucide icon="ToggleRight" class="w-4 h-4 mr-2" /> Logout
      </Menu.Item>
    </Menu.Items>
  </Menu>
  <!-- END: Account Menu -->
</div>
<!-- END: Top Bar -->
