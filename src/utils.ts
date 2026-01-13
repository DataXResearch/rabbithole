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
  UPDATE_ACTIVE_TABS,
  RENAME_PROJECT,
  DELETE_PROJECT,
  DELETE_WEBSITE,
  PUBLISH_RABBITHOLE,
}

export async function getOrderedProjects(): Promise<Project[]> {
  let projects = await chrome.runtime.sendMessage({
    type: MessageRequest.GET_ALL_PROJECTS,
  });
  const activeProject = await chrome.runtime.sendMessage({
    type: MessageRequest.GET_ACTIVE_PROJECT,
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

export interface Project {
  id: string;
  createdAt: number;
  savedWebsites: string[];
  name: string;
  sembleCollectionUri?: string;
  lastSembleSync?: number;
  activeTabs?: string[];
}

export const NotificationDuration = 2000;
