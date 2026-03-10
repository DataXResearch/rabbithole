import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/svelte";
import Popup from "../src/lib/Popup.svelte";
import { MessageRequest } from "../src/utils";

describe("Popup Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      async (req: any) => {
        if (req.type === MessageRequest.GET_SETTINGS)
          return {
            show: true,
            alignment: "right",
            darkMode: false,
            hasSeenOnboarding: true,
          };
        if (req.type === MessageRequest.GET_ALL_BURROWS) return [];
        if (req.type === MessageRequest.GET_ALL_RABBITHOLES) return [];
        if (req.type === MessageRequest.GET_ACTIVE_BURROW) return null;
        if (req.type === MessageRequest.GET_ACTIVE_RABBITHOLE) return null;
        if (req.type === MessageRequest.SAVE_WINDOW_TO_ACTIVE_BURROW)
          return { success: true };
        if (req.type === MessageRequest.UPDATE_SETTINGS) return {};
        return {};
      },
    );

    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { id: 1, active: true, currentWindow: true } as chrome.tabs.Tab,
    ]);
    vi.mocked(chrome.tabs.reload).mockResolvedValue(undefined);
    vi.mocked(chrome.storage.local.get).mockImplementation(
      (keys: any, callback?: any) => {
        if (typeof callback === "function") callback({});
        return Promise.resolve({});
      },
    );
  });

  it("renders correctly and fetches settings", async () => {
    const { getByText } = render(Popup);
    await waitFor(
      () => {
        expect(getByText("Hide Overlay")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("renders Sync Window button", async () => {
    const { getByText } = render(Popup);
    await waitFor(() => getByText("Sync Window"), { timeout: 3000 });
    expect(getByText("Sync Window")).toBeInTheDocument();
  });

  it("sends SAVE_WINDOW_TO_ACTIVE_BURROW when Sync Window is clicked", async () => {
    const { getByText } = render(Popup);
    await waitFor(() => getByText("Sync Window"), { timeout: 3000 });
    await fireEvent.click(getByText("Sync Window"));

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: MessageRequest.SAVE_WINDOW_TO_ACTIVE_BURROW,
    });

    await waitFor(
      () => {
        expect(getByText("Synced!")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("toggles overlay visibility to hidden", async () => {
    const { getByText } = render(Popup);
    await waitFor(() => getByText("Hide Overlay"), { timeout: 3000 });
    await fireEvent.click(getByText("Hide Overlay"));

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageRequest.UPDATE_SETTINGS,
        settings: expect.objectContaining({ show: false }),
      }),
    );
  });

  it("shows Show Overlay button after hiding", async () => {
    const { getByText } = render(Popup);
    await waitFor(() => getByText("Hide Overlay"), { timeout: 3000 });
    await fireEvent.click(getByText("Hide Overlay"));
    await waitFor(() => {
      expect(getByText("Show Overlay")).toBeInTheDocument();
    });
  });

  it("renders the embedded Overlay in popup mode", async () => {
    const { container } = render(Popup);
    await waitFor(
      () => {
        expect(
          container.querySelector(".rabbithole-overlay"),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
