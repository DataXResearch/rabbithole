import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/svelte";
import Overlay from "../src/lib/Overlay.svelte";
import { MessageRequest } from "../src/utils";

describe("Overlay Component", () => {
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
        if (req.type === MessageRequest.UPDATE_SETTINGS) return {};
        return {};
      },
    );

    vi.mocked(chrome.storage.local.get).mockImplementation(
      (keys: any, callback?: any) => {
        if (typeof callback === "function") callback({});
        return Promise.resolve({});
      },
    );
    vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);
  });

  it("renders the overlay when isPopup is true", async () => {
    const { container } = render(Overlay, { isPopup: true });
    await waitFor(
      () => {
        expect(
          container.querySelector(".rabbithole-overlay"),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("renders with correct alignment class when isPopup is true", async () => {
    const { container } = render(Overlay, { isPopup: true });
    await waitFor(
      () => {
        const el = container.querySelector(".rabbithole-overlay");
        expect(el).toBeInTheDocument();
        expect(el).toHaveClass("rabbithole-right");
      },
      { timeout: 3000 },
    );
  });

  it("renders popup class when isPopup is true", async () => {
    const { container } = render(Overlay, { isPopup: true });
    await waitFor(() => {
      expect(container.querySelector(".rabbithole-popup")).toBeInTheDocument();
    });
  });

  it("does not render header icons in popup mode", async () => {
    const { container } = render(Overlay, { isPopup: true });
    await waitFor(() => {
      expect(
        container.querySelector(".rabbithole-overlay"),
      ).toBeInTheDocument();
    });
    expect(
      container.querySelector(".rabbithole-header"),
    ).not.toBeInTheDocument();
  });

  it("calls UPDATE_SETTINGS with alignment left when move button is clicked", async () => {
    const { component, container } = render(Overlay, { isPopup: true });

    await waitFor(
      () => {
        expect(
          container.querySelector(".rabbithole-overlay"),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Wait for settings to be loaded by onMount (so we can update them)
    await new Promise((r) => setTimeout(r, 0));

    vi.clearAllMocks();
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({});

    (component as any).changeAlignment();

    await waitFor(
      () => {
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: MessageRequest.UPDATE_SETTINGS,
            settings: expect.objectContaining({ alignment: "left" }),
          }),
        );
      },
      { timeout: 3000 },
    );
  });

  it("calls UPDATE_SETTINGS with show false when hide button is clicked", async () => {
    const { component, container } = render(Overlay, { isPopup: true });

    await waitFor(
      () => {
        expect(
          container.querySelector(".rabbithole-overlay"),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Wait for settings to be loaded by onMount (so we can update them)
    await new Promise((r) => setTimeout(r, 0));

    vi.clearAllMocks();
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({});

    await (component as any).hideOverlay();

    await waitFor(
      () => {
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: MessageRequest.UPDATE_SETTINGS,
            settings: expect.objectContaining({ show: false }),
          }),
        );
      },
      { timeout: 3000 },
    );
  });
});
