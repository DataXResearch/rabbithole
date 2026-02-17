import { MessageRequest, type Burrow } from "./types";

export async function getOrderedBurrows(): Promise<Burrow[]> {
  let burrows: Burrow[] = await chrome.runtime.sendMessage({
    type: MessageRequest.GET_ALL_BURROWS,
  });
  const activeBurrow: Burrow | null = await chrome.runtime.sendMessage({
    type: MessageRequest.GET_ACTIVE_BURROW,
  });

  if (activeBurrow) {
    for (let i = 0; i < burrows.length; i++) {
      if (burrows[i].id === activeBurrow.id) {
        const temp = burrows[0];
        burrows[0] = burrows[i];
        burrows[i] = temp;
        break;
      }
    }
  }

  return burrows;
}
