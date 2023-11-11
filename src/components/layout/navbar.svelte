<script lang="ts">
    import clsx from "clsx";
    import { onMount } from "svelte";
    import { useLocation, useNavigate } from "svelte-navigator";
    import { slide } from "svelte/transition";
    import Logo from "../../assets/icons/logo.png";
    import { navbarStore } from "../../store/navbar";
    import Lucide from "../lucide.svelte";
    import Tippy from "../tippy.svelte";
    import DarkModeToggle from "./dark-mode-toggle.svelte";
    import { linkTo, nestedMenu, type FormattedMenu } from "./navbar";
    import TopBar from "./top-bar.svelte";

    let windowWidth = window.innerWidth;

    const location = useLocation();
    const navigate = useNavigate();

    let formattedMenu: Array<FormattedMenu | "divider"> = [];
    const sideMenu = () => nestedMenu($navbarStore.menu, $location);

    $: {
        if ($navbarStore || $location) {
        formattedMenu = sideMenu();
        }
    }

    onMount(() => {
        window.addEventListener("resize", () => {
        windowWidth = window.innerWidth;
        });
    });
</script>


<div
  class="-mx-3 bg-black/[0.15] py-5 px-3 dark:bg-transparent sm:-mx-8 sm:px-8 md:py-0"
>
  <DarkModeToggle />
  <!-- <MobileMenu /> -->
  <div class="mt-[4.7rem] flex overflow-hidden md:mt-0">
    <!-- BEGIN: Side Menu -->
    <nav
      class="side-nav z-10 hidden overflow-x-hidden px-5 pb-16 md:block md:w-[105px] xl:w-[250px]"
    >
      <a class="flex items-center pt-4 pl-5 mt-3 intro-x" href="#top">
        <img
          class="w-6"
          src={Logo}
          alt="rabbithole logo"
        />
        <span class="hidden ml-3 text-lg text-white xl:block">Extension</span>
      </a>
      <div class="my-6 side-nav__divider" />
      <ul>
        {#each formattedMenu as menu, menuKey}
          {#if menu == "divider"}
            <li
              class={clsx([
                "side-nav__divider my-6",

                // Animation
                `opacity-0 animate-[0.4s_ease-in-out_0.1s_intro-divider] animate-fill-mode-forwards animate-delay-${
                  (menuKey + 1) * 10
                }`,
              ])}
            />
          {:else}
            <li>
              <Tippy
                as="a"
                content={menu.title}
                options={{
                  placement: "right",
                }}
                disable={windowWidth > 1260}
                href={menu.subMenu ? "javascript:;" : menu.pathname}
                on:click={(e) => {
                  e.preventDefault();
                  menu !== "divider" && linkTo(menu, navigate);
                  formattedMenu = [...formattedMenu];
                }}
                class={clsx([
                  menu.active ? "side-menu side-menu--active" : "side-menu",

                  // Animation
                  !menu.active && [
                    `opacity-0 translate-x-[50px] animate-[0.4s_ease-in-out_0.1s_intro-menu] animate-fill-mode-forwards animate-delay-${
                      (menuKey + 1) * 10
                    }`,
                  ],
                ])}
              >
                <div class="side-menu__icon">
                  <Lucide icon={menu.icon} />
                </div>
                <div class="side-menu__title">
                  {menu.title}
                  {#if menu.subMenu}
                    <div
                      class={clsx([
                        "side-menu__sub-icon",
                        menu.activeDropdown && "transform rotate-180",
                      ])}
                    >
                      <Lucide icon="ChevronDown" />
                    </div>
                  {/if}
                </div>
              </Tippy>
              {#if menu.subMenu && menu.activeDropdown}
                <ul
                  class={clsx([menu.activeDropdown && "side-menu__sub-open"])}
                  transition:slide|local={{ duration: 300 }}
                >
                  {#each menu.subMenu as subMenu, subMenuKey}
                    <li>
                      <Tippy
                        as="a"
                        content={subMenu.title}
                        options={{
                          placement: "right",
                        }}
                        disable={windowWidth > 1260}
                        href={subMenu.subMenu
                          ? "javascript:;"
                          : subMenu.pathname}
                        class={clsx([
                          subMenu.active
                            ? "side-menu side-menu--active"
                            : "side-menu",

                          // Animation
                          !subMenu.active && [
                            `opacity-0 translate-x-[50px] animate-[0.4s_ease-in-out_0.1s_intro-menu] animate-fill-mode-forwards animate-delay-${
                              (subMenuKey + 1) * 10
                            }`,
                          ],
                        ])}
                        on:click={(e) => {
                          e.preventDefault();
                          linkTo(subMenu, navigate);
                          formattedMenu = [...formattedMenu];
                        }}
                      >
                        <div class="side-menu__icon">
                          <Lucide icon={subMenu.icon} />
                        </div>
                        <div class="side-menu__title">
                          {subMenu.title}
                          {#if subMenu.subMenu}
                            <div
                              class={clsx([
                                "side-menu__sub-icon",
                                subMenu.activeDropdown &&
                                  "transform rotate-180",
                              ])}
                            >
                              <Lucide icon="ChevronDown" />
                            </div>
                          {/if}
                        </div>
                      </Tippy>
                      {#if subMenu.subMenu && subMenu.activeDropdown}
                        <ul
                          class={clsx([
                            subMenu.activeDropdown && "side-menu__sub-open",
                          ])}
                          transition:slide|local={{ duration: 300 }}
                        >
                          {#each subMenu.subMenu as lastSubMenu, lastSubMenuKey}
                            <li>
                              <Tippy
                                as="a"
                                content={lastSubMenu.title}
                                options={{
                                  placement: "right",
                                }}
                                disable={windowWidth > 1260}
                                href={lastSubMenu.subMenu
                                  ? "javascript:;"
                                  : lastSubMenu.pathname}
                                class={clsx([
                                  lastSubMenu.active
                                    ? "side-menu side-menu--active"
                                    : "side-menu",

                                  // Animation
                                  !lastSubMenu.active && [
                                    `opacity-0 translate-x-[50px] animate-[0.4s_ease-in-out_0.1s_intro-menu] animate-fill-mode-forwards animate-delay-${
                                      (lastSubMenuKey + 1) * 10
                                    }`,
                                  ],
                                ])}
                                on:click={(e) => {
                                  e.preventDefault();
                                  linkTo(lastSubMenu, navigate);
                                  formattedMenu = [...formattedMenu];
                                }}
                              >
                                <div class="side-menu__icon">
                                  <Lucide icon={lastSubMenu.icon} />
                                </div>
                                <div class="side-menu__title">
                                  {lastSubMenu.title}
                                </div>
                              </Tippy>
                            </li>
                          {/each}
                        </ul>
                      {/if}
                    </li>
                  {/each}
                </ul>
              {/if}
            </li>
          {/if}
        {/each}
      </ul>
    </nav>
    <!-- END: Side Menu -->
    <!-- BEGIN: Content -->
    <div
      class={clsx([
        "rounded-[30px] md:rounded-[35px/50px_0px_0px_0px] min-w-0 min-h-screen max-w-full md:max-w-none bg-slate-100 flex-1 pb-10 px-4 md:px-6 relative md:ml-4 dark:bg-darkmode-700",
        "before:content-[''] before:w-full before:h-px before:block",
        "after:content-[''] after:z-[-1] after:rounded-[40px_0px_0px_0px] after:w-full after:inset-y-0 after:absolute after:left-0 after:bg-white/10 after:mt-8 after:-ml-4 after:dark:bg-darkmode-400/50",
      ])}
    >
      <TopBar />
      <slot />
    </div>
    <!-- END: Content -->
  </div>
</div>
