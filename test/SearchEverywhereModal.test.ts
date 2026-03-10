import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/svelte";
import SearchEverywhereModal from "../src/lib/SearchEverywhereModal.svelte";
import { MessageRequest } from "../src/utils";

describe("SearchEverywhereModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      async (req: any) => {
        if (req.type === MessageRequest.GET_ALL_ITEMS)
          return [
            {
              url: "https://example.com",
              name: "Example Site",
              description: "A test site",
              savedAt: Date.now(),
              faviconUrl: "",
            },
          ];
        if (req.type === MessageRequest.GET_ALL_RABBITHOLES)
          return [
            {
              id: "rh1",
              title: "Research Topic",
              description: "",
              burrows: [],
              meta: [],
              createdAt: Date.now(),
            },
          ];
        if (req.type === MessageRequest.GET_ALL_BURROWS)
          return [
            {
              id: "b1",
              name: "Specific Subtopic",
              websites: [],
              createdAt: Date.now(),
            },
          ];
        return [];
      },
    );
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(SearchEverywhereModal, { isOpen: false });
    expect(container.querySelector(".modal-overlay")).not.toBeInTheDocument();
  });

  it("renders the modal when isOpen is true", async () => {
    const { getByText } = render(SearchEverywhereModal, { isOpen: true });
    await waitFor(() => {
      expect(getByText("Search Everywhere")).toBeInTheDocument();
    });
  });

  it("shows prompt to type at least 2 characters initially", async () => {
    const { getByText } = render(SearchEverywhereModal, { isOpen: true });
    await waitFor(() => {
      expect(
        getByText("Type at least 2 characters to search"),
      ).toBeInTheDocument();
    });
  });

  it("loads data on open", async () => {
    render(SearchEverywhereModal, { isOpen: true });
    await waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageRequest.GET_ALL_ITEMS,
      });
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageRequest.GET_ALL_RABBITHOLES,
      });
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageRequest.GET_ALL_BURROWS,
      });
    });
  });

  it("finds rabbithole results when searching", async () => {
    const { container, getByText } = render(SearchEverywhereModal, {
      isOpen: true,
    });
    await waitFor(() =>
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3),
    );

    const input = container.querySelector("input") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "Research" } });

    await waitFor(() => {
      expect(getByText("Research Topic")).toBeInTheDocument();
    });
  });

  it("finds website results when searching", async () => {
    const { container } = render(SearchEverywhereModal, {
      isOpen: true,
    });
    await waitFor(() =>
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3),
    );

    const input = container.querySelector("input") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "Example" } });

    await waitFor(() => {
      // The website name is rendered inside a card-title-input (input element)
      // so check for the card container or the section header instead
      expect(container.querySelector(".card-container")).toBeInTheDocument();
    });

    // Also verify the section heading appears
    await waitFor(() => {
      expect(container.querySelector(".container")).toBeInTheDocument();
    });

    // Verify the website URL link is present (rendered as an anchor)
    const link = container.querySelector('a[href="https://example.com"]');
    expect(link).toBeInTheDocument();
  });

  it("shows no results message when nothing matches", async () => {
    const { container, getByText } = render(SearchEverywhereModal, {
      isOpen: true,
    });
    await waitFor(() =>
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3),
    );

    const input = container.querySelector("input") as HTMLInputElement;
    await fireEvent.input(input, {
      target: { value: "xyznonexistent" },
    });

    await waitFor(() => {
      expect(
        getByText(/No results found for "xyznonexistent"/),
      ).toBeInTheDocument();
    });
  });

  it("closes on Escape key", async () => {
    const { getByText, queryByText } = render(SearchEverywhereModal, {
      isOpen: true,
    });
    await waitFor(() => getByText("Search Everywhere"));
    await fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(queryByText("Search Everywhere")).not.toBeInTheDocument();
    });
  });
});
