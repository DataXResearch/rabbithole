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
  DELETE_BURROW,
  DELETE_WEBSITE,
  PUBLISH_BURROW,
  GET_ACTIVE_RABBITHOLE,
  CHANGE_ACTIVE_RABBITHOLE,
  CREATE_NEW_RABBITHOLE,
  UPDATE_RABBITHOLE,
  DELETE_RABBITHOLE,
  ADD_BURROWS_TO_RABBITHOLE,
  DELETE_BURROW_FROM_RABBITHOLE,
  CREATE_NEW_BURROW_IN_RABBITHOLE,
  ADD_WEBSITES_TO_RABBITHOLE_META,
  DELETE_WEBSITE_FROM_RABBITHOLE_META,
  GET_ALL_RABBITHOLES,
  FETCH_RABBITHOLES_FOR_BURROW,
  UPDATE_WEBSITE,
  SYNC_BURROW,
  OPEN_TABS,
  REMOVE_FROM_ACTIVE_TABS,
  IMPORT_DATA,
}

export interface Settings {
  alignment: "left" | "right";
  show: boolean;
  darkMode: boolean;
  hasSeenOnboarding: boolean;
}

export interface Website {
  url: string;
  name: string;
  savedAt: number;
  faviconUrl: string;
  openGraphImageUrl?: string;
  description?: string;
  alreadySaved?: boolean;
}

export interface Burrow {
  id: string;
  createdAt: number;
  websites: string[]; // urls
  name: string;
  sembleCollectionUri?: string;
  lastSembleSync?: number;
  activeTabs?: string[];
}

export interface Rabbithole {
  id: string;
  createdAt: number;
  burrows: string[]; // burrow IDs
  title: string;
  description?: string;
  meta: string[]; // urls
}

export interface User {
  id: string;
  currentRabbithole: string;
  currentBurrow: string;
  settings: Settings;
}
