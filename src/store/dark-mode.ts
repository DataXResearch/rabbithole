import { writable } from "svelte/store";

interface DarkModeState {
  value: boolean;
}

export const darkModeStore = writable<DarkModeState>({
  value: localStorage.getItem("darkMode") === "true",
});

export const darkMode = () => {
  if (localStorage.getItem("darkMode") === null) {
    localStorage.setItem("darkMode", "false");
  }

  return darkModeStore;
};

export const setDarkMode = (darkMode: boolean) => {
  localStorage.setItem("darkMode", darkMode.toString());
  darkModeStore.set({
    value: darkMode,
  });
};
