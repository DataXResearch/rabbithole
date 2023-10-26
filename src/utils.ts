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
  RENAME_PROJECT
}
