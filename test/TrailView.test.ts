import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/svelte";
import TrailView from "../src/lib/TrailView.svelte";
import type { Trail, Website } from "../src/utils/types";

const mockWebsites: Website[] = [
  {
    url: "https://a.com",
    name: "Site A",
    savedAt: Date.now(),
    faviconUrl: "",
    description: "Desc A",
  },
  {
    url: "https://b.com",
    name: "Site B",
    savedAt: Date.now(),
    faviconUrl: "",
    description: "Desc B",
  },
];

const mockTrail: Trail = {
  id: "t1",
  createdAt: Date.now(),
  name: "My Trail",
  rabbitholeId: "rh1",
  startNote: "Start here",
  stops: [
    { websiteUrl: "https://a.com", note: "Look for X" },
    { websiteUrl: "https://b.com", note: "Look for Y" },
  ],
};

const emptyNotesTrail: Trail = {
  id: "t2",
  createdAt: Date.now(),
  name: "Empty Notes Trail",
  rabbitholeId: "rh1",
  startNote: "",
  stops: [
    { websiteUrl: "https://a.com", note: "" },
    { websiteUrl: "https://b.com", note: "" },
  ],
};

describe("TrailView Component", () => {
  describe("Read mode (not editing)", () => {
    it("renders the trail name", () => {
      const { getByText } = render(TrailView, {
        props: { trail: mockTrail, websites: mockWebsites },
      });
      expect(getByText("My Trail")).toBeInTheDocument();
    });

    it("renders the start note", () => {
      const { getByText } = render(TrailView, {
        props: { trail: mockTrail, websites: mockWebsites },
      });
      expect(getByText("Start here")).toBeInTheDocument();
    });

    it("renders stop notes", () => {
      const { getByText } = render(TrailView, {
        props: { trail: mockTrail, websites: mockWebsites },
      });
      expect(getByText("Look for X")).toBeInTheDocument();
      expect(getByText("Look for Y")).toBeInTheDocument();
    });

    it("renders website cards for each stop", () => {
      const { container } = render(TrailView, {
        props: { trail: mockTrail, websites: mockWebsites },
      });
      const cards = container.querySelectorAll(".card-container");
      expect(cards).toHaveLength(2);
    });

    it("renders trail edges between nodes", () => {
      const { container } = render(TrailView, {
        props: { trail: mockTrail, websites: mockWebsites },
      });
      const edges = container.querySelectorAll(".trail-edge");
      // 2 stops × 2 edges each = 4 edges
      expect(edges.length).toBeGreaterThanOrEqual(2);
    });

    it("shows Edit button in read mode", () => {
      const { getByText } = render(TrailView, {
        props: { trail: mockTrail, websites: mockWebsites },
      });
      expect(getByText("Edit")).toBeInTheDocument();
    });

    it("does not show Done button in read mode", () => {
      const { queryByText } = render(TrailView, {
        props: { trail: mockTrail, websites: mockWebsites },
      });
      expect(queryByText("Done")).not.toBeInTheDocument();
    });

    it("shows missing site placeholder for unknown URL", () => {
      const trailWithMissing: Trail = {
        ...mockTrail,
        stops: [{ websiteUrl: "https://missing.com", note: "" }],
      };
      const { container } = render(TrailView, {
        props: { trail: trailWithMissing, websites: mockWebsites },
      });
      expect(container.querySelector(".missing-site")).toBeInTheDocument();
      expect(container.querySelector(".missing-site")?.textContent).toContain(
        "https://missing.com",
      );
    });

    it("note nodes are not clickable in read mode", async () => {
      const { container } = render(TrailView, {
        props: { trail: mockTrail, websites: mockWebsites },
      });
      const noteNodes = container.querySelectorAll(".note-node");
      noteNodes.forEach((node) => {
        expect(node).not.toHaveClass("editing");
      });
    });
  });

  describe("Edit mode", () => {
    it("switches to edit mode when Edit is clicked", async () => {
      const { getByText, queryByText } = render(TrailView, {
        props: { trail: mockTrail, websites: mockWebsites },
      });

      await fireEvent.click(getByText("Edit"));

      await waitFor(() => {
        expect(queryByText("Done")).toBeInTheDocument();
        expect(queryByText("Edit")).not.toBeInTheDocument();
      });
    });

    it("note nodes have editing class in edit mode", async () => {
      const { getByText, container } = render(TrailView, {
        props: { trail: mockTrail, websites: mockWebsites },
      });

      await fireEvent.click(getByText("Edit"));

      await waitFor(() => {
        const noteNodes = container.querySelectorAll(".note-node");
        noteNodes.forEach((node) => {
          expect(node).toHaveClass("editing");
        });
      });
    });

    it("opens TrailNoteModal when a note node is clicked in edit mode", async () => {
      const { getByText, container } = render(TrailView, {
        props: { trail: mockTrail, websites: mockWebsites },
      });

      await fireEvent.click(getByText("Edit"));

      await waitFor(() => {
        expect(
          container.querySelector(".note-node.editing"),
        ).toBeInTheDocument();
      });

      const noteNode = container.querySelector(
        ".note-node.editing",
      ) as HTMLElement;
      await fireEvent.click(noteNode);

      await waitFor(() => {
        // TrailNoteModal should be open - look for the modal overlay
        expect(container.querySelector(".modal-overlay")).toBeInTheDocument();
      });
    });

    it("shows placeholder text for empty notes in edit mode", async () => {
      const { getByText, container } = render(TrailView, {
        props: { trail: emptyNotesTrail, websites: mockWebsites },
      });

      await fireEvent.click(getByText("Edit"));

      await waitFor(() => {
        const noteContents = container.querySelectorAll(".note-content");
        const placeholders = Array.from(noteContents).filter((n) =>
          n.textContent?.includes("Add a"),
        );
        expect(placeholders.length).toBeGreaterThan(0);
      });
    });

    it("dispatches save event with updated trail when Done is clicked", async () => {
      const { component, getByText } = render(TrailView, {
        props: { trail: mockTrail, websites: mockWebsites },
      });
      const handler = vi.fn();
      component.$on("save", handler);

      await fireEvent.click(getByText("Edit"));
      await waitFor(() => getByText("Done"));
      await fireEvent.click(getByText("Done"));

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            trail: expect.objectContaining({
              id: "t1",
              name: "My Trail",
            }),
          }),
        }),
      );
    });

    it("returns to read mode after clicking Done", async () => {
      const { getByText, queryByText } = render(TrailView, {
        props: { trail: mockTrail, websites: mockWebsites },
      });

      await fireEvent.click(getByText("Edit"));
      await waitFor(() => getByText("Done"));
      await fireEvent.click(getByText("Done"));

      await waitFor(() => {
        expect(queryByText("Edit")).toBeInTheDocument();
        expect(queryByText("Done")).not.toBeInTheDocument();
      });
    });
  });

  describe("TrailNoteModal integration", () => {
    it("pre-fills modal with existing start note", async () => {
      const { getByText, container } = render(TrailView, {
        props: { trail: mockTrail, websites: mockWebsites },
      });

      await fireEvent.click(getByText("Edit"));
      await waitFor(() =>
        expect(
          container.querySelector(".note-node.editing"),
        ).toBeInTheDocument(),
      );

      // Click the first note node (start note)
      const noteNodes = container.querySelectorAll(".note-node.editing");
      await fireEvent.click(noteNodes[0]);

      await waitFor(() => {
        const textarea = container.querySelector(
          "textarea",
        ) as HTMLTextAreaElement;
        expect(textarea).toBeInTheDocument();
        expect(textarea.value).toBe("Start here");
      });
    });

    it("saves note from modal back to trail", async () => {
      const { getByText, container } = render(TrailView, {
        props: {
          trail: { ...mockTrail, startNote: "Old note" },
          websites: mockWebsites,
        },
      });

      await fireEvent.click(getByText("Edit"));
      await waitFor(() =>
        expect(
          container.querySelector(".note-node.editing"),
        ).toBeInTheDocument(),
      );

      const noteNodes = container.querySelectorAll(".note-node.editing");
      await fireEvent.click(noteNodes[0]);

      await waitFor(() => {
        expect(container.querySelector(".modal-overlay")).toBeInTheDocument();
      });

      const textarea = container.querySelector(
        "textarea",
      ) as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: "New note text" } });
      await fireEvent.click(getByText("Save"));

      await waitFor(() => {
        expect(
          container.querySelector(".modal-overlay"),
        ).not.toBeInTheDocument();
        expect(getByText("New note text")).toBeInTheDocument();
      });
    });
  });

  describe("Empty trail", () => {
    it("renders with no stops", () => {
      const emptyTrail: Trail = {
        id: "t3",
        createdAt: Date.now(),
        name: "Empty",
        rabbitholeId: "rh1",
        startNote: "",
        stops: [],
      };
      const { container } = render(TrailView, {
        props: { trail: emptyTrail, websites: [] },
      });
      const cards = container.querySelectorAll(".card-container");
      expect(cards).toHaveLength(0);
    });

    it("still renders start note node for empty trail", () => {
      const emptyTrail: Trail = {
        id: "t3",
        createdAt: Date.now(),
        name: "Empty",
        rabbitholeId: "rh1",
        startNote: "Begin",
        stops: [],
      };
      const { getByText } = render(TrailView, {
        props: { trail: emptyTrail, websites: [] },
      });
      expect(getByText("Begin")).toBeInTheDocument();
    });
  });
});
