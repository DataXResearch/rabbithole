import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/svelte";
import TrailNoteModal from "../src/lib/TrailNoteModal.svelte";

describe("TrailNoteModal Component", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(TrailNoteModal, {
      props: { isOpen: false, initialNote: "" },
    });
    expect(container.querySelector(".modal-overlay")).not.toBeInTheDocument();
  });

  it("renders when isOpen is true", async () => {
    const { getByText } = render(TrailNoteModal, {
      props: { isOpen: true, initialNote: "" },
    });
    await waitFor(() => {
      expect(getByText("Edit Note")).toBeInTheDocument();
    });
  });

  it("renders a textarea for note input", async () => {
    const { container } = render(TrailNoteModal, {
      props: { isOpen: true, initialNote: "" },
    });
    await waitFor(() => {
      expect(container.querySelector("textarea")).toBeInTheDocument();
    });
  });

  it("pre-fills textarea with initialNote", async () => {
    const { container } = render(TrailNoteModal, {
      props: { isOpen: true, initialNote: "Existing note text" },
    });
    await waitFor(() => {
      const textarea = container.querySelector(
        "textarea",
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe("Existing note text");
    });
  });

  it("pre-fills with empty string when initialNote is empty", async () => {
    const { container } = render(TrailNoteModal, {
      props: { isOpen: true, initialNote: "" },
    });
    await waitFor(() => {
      const textarea = container.querySelector(
        "textarea",
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe("");
    });
  });

  it("renders Save button", async () => {
    const { getByText } = render(TrailNoteModal, {
      props: { isOpen: true, initialNote: "" },
    });
    await waitFor(() => {
      expect(getByText("Save")).toBeInTheDocument();
    });
  });

  it("dispatches save event with note text when Save is clicked", async () => {
    const { component, container, getByText } = render(TrailNoteModal, {
      props: { isOpen: true, initialNote: "" },
    });
    const handler = vi.fn();
    component.$on("save", handler);

    await waitFor(() => getByText("Save"));

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    await fireEvent.input(textarea, { target: { value: "My new note" } });
    await fireEvent.click(getByText("Save"));

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { note: "My new note" },
      }),
    );
  });

  it("dispatches save event with original text if not modified", async () => {
    const { component, getByText } = render(TrailNoteModal, {
      props: { isOpen: true, initialNote: "Original text" },
    });
    const handler = vi.fn();
    component.$on("save", handler);

    await waitFor(() => getByText("Save"));
    await fireEvent.click(getByText("Save"));

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { note: "Original text" },
      }),
    );
  });

  it("dispatches save event with empty string for empty note", async () => {
    const { component, getByText } = render(TrailNoteModal, {
      props: { isOpen: true, initialNote: "" },
    });
    const handler = vi.fn();
    component.$on("save", handler);

    await waitFor(() => getByText("Save"));
    await fireEvent.click(getByText("Save"));

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { note: "" },
      }),
    );
  });

  it("dispatches close event when modal overlay is clicked", async () => {
    const { component, container } = render(TrailNoteModal, {
      props: { isOpen: true, initialNote: "" },
    });
    const handler = vi.fn();
    component.$on("close", handler);

    await waitFor(() =>
      expect(container.querySelector(".modal-overlay")).toBeInTheDocument(),
    );

    await fireEvent.click(container.querySelector(".modal-overlay"));
    expect(handler).toHaveBeenCalled();
  });

  it("dispatches close event on Escape key", async () => {
    const { component, getByText } = render(TrailNoteModal, {
      props: { isOpen: true, initialNote: "" },
    });
    const handler = vi.fn();
    component.$on("close", handler);

    await waitFor(() => getByText("Edit Note"));
    await fireEvent.keyDown(window, { key: "Escape" });

    expect(handler).toHaveBeenCalled();
  });

  it("resets to initialNote when reopened", async () => {
    const { component, container } = render(TrailNoteModal, {
      props: { isOpen: true, initialNote: "Original" },
    });

    await waitFor(() => {
      const textarea = container.querySelector(
        "textarea",
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe("Original");
    });

    // Modify the textarea
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    await fireEvent.input(textarea, { target: { value: "Modified" } });

    // Close and reopen
    await component.$set({ isOpen: false });
    await component.$set({ isOpen: true, initialNote: "Original" });

    await waitFor(() => {
      const ta = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(ta.value).toBe("Original");
    });
  });

  it("handles multiline note text", async () => {
    const multilineNote = "Line 1\nLine 2\nLine 3";
    const { component, getByText } = render(TrailNoteModal, {
      props: { isOpen: true, initialNote: multilineNote },
    });
    const handler = vi.fn();
    component.$on("save", handler);

    await waitFor(() => getByText("Save"));
    await fireEvent.click(getByText("Save"));

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { note: multilineNote },
      }),
    );
  });
});
