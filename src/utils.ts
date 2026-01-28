import type { Project } from "./storage/db";

// Can these be reordered without breaking older versions?
// seems like no because they are bound to ints
export enum MessageRequest {
  SAVE_TAB,
  GET_ALL_ITEMS,
  GET_SETTINGS,
  UPDATE_SETTINGS,
  GET_ALL_BURROWS,
  GET_BURROW_WEBSITES,
  CREATE_NEW_BURROW,
  CHANGE_ACTIVE_BURROW,
  GET_ACTIVE_BURROW,
  GET_BURROW,
  SAVE_WINDOW_TO_NEW_BURROW,
  SAVE_WINDOW_TO_ACTIVE_BURROW,
  UPDATE_ACTIVE_TABS,
  RENAME_BURROW,
  DELETE_PROJECT,
  DELETE_WEBSITE,
  PUBLISH_RABBITHOLE,
}

export async function getOrderedProjects(): Promise<Project[]> {
  let projects = await chrome.runtime.sendMessage({
    type: MessageRequest.GET_ALL_BURROWS,
  });
  const activeProject = await chrome.runtime.sendMessage({
    type: MessageRequest.GET_ACTIVE_BURROW,
  });

  for (let i = 0; i < projects.length; i++) {
    if (projects[i].name === activeProject.name) {
      const temp = projects[0];
      projects[0] = projects[i];
      projects[i] = temp;
      break;
    }
  }

  return projects;
}

export const NotificationDuration = 2000;
