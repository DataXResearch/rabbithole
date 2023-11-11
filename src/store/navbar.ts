import { writable } from "svelte/store";
import type { Icon } from "../components/lucide.svelte";

export interface Menu {
  icon: Icon;
  title: string;
  pathname?: string;
  subMenu?: Menu[];
  ignore?: boolean;
}

export interface NavbarState {
  menu: Array<Menu | "divider">;
}

export const navbarStore = writable<NavbarState>({
  menu: [
    // {
    //   icon: "Home",
    //   title: "Dashboard",
    //   subMenu: [
    //     {
    //       icon: "Activity",
    //       pathname: "/",
    //       title: "Overview 1",
    //     },
    //     {
    //       icon: "Activity",
    //       pathname: "/dashboard-overview-2",
    //       title: "Overview 2",
    //     },
    //     {
    //       icon: "Activity",
    //       pathname: "/dashboard-overview-3",
    //       title: "Overview 3",
    //     },
    //     {
    //       icon: "Activity",
    //       pathname: "/dashboard-overview-4",
    //       title: "Overview 4",
    //     },
    //   ],
    // },
    {
      icon: "Box",
      pathname: "/",
      title: "Rabbitholes",
    },
  ],
});
