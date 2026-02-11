import type { Burrow } from "./storage/db";

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
  DELETE_BURROW,
  DELETE_WEBSITE,
  PUBLISH_RABBITHOLE,
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
}

export async function getOrderedBurrows(): Promise<Burrow[]> {
  let burrows = await chrome.runtime.sendMessage({
    type: MessageRequest.GET_ALL_BURROWS,
  });
  const activeBurrow = await chrome.runtime.sendMessage({
    type: MessageRequest.GET_ACTIVE_BURROW,
  });

  for (let i = 0; i < burrows.length; i++) {
    if (burrows[i].name === activeBurrow.name) {
      const temp = burrows[0];
      burrows[0] = burrows[i];
      burrows[i] = temp;
      break;
    }
  }

  return burrows;
}

export const NotificationDuration = 2000;
