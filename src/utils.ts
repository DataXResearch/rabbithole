import type { Project } from "./storage/db";

// Can these be reordered without breaking older versions?
// seems like no because they are bound to ints
export enum MessageRequest {
  SAVE_TAB,
  GET_ALL_ITEMS,
  GET_SETTINGS,
  UPDATE_SETTINGS,
  GET_ALL_PROJECTS,
  GET_PROJECT_SAVED_WEBSITES,
  CREATE_NEW_PROJECT,
  CHANGE_ACTIVE_PROJECT,
  GET_ACTIVE_PROJECT,
  GET_PROJECT,
  SAVE_WINDOW_TO_NEW_PROJECT,
  SAVE_WINDOW_TO_ACTIVE_PROJECT,
  PING,
  RENAME_PROJECT,
  DELETE_PROJECT,
  DELETE_WEBSITE,
}

export const NotificationDuration = 1500;

export async function getOrderedProjects(): Promise<Project[]> {
  let projects = await chrome.runtime.sendMessage({
    type: MessageRequest.GET_ALL_PROJECTS,
  });
  const activeProject = await chrome.runtime.sendMessage({
    type: MessageRequest.GET_ACTIVE_PROJECT,
  });

  for (let i = 0; i < projects.length; i++) {
    if (projects[i].name === activeProject.name) {
      projects.splice(i, 1);
    }
  }
  projects.sort((a, b) => a.name.localeCompare(b.name));
  projects.unshift(activeProject);
  return projects;
}
