import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/svelte";
import OrganizeModal from "../src/lib/OrganizeModal.svelte";

describe("OrganizeModal Component", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(OrganizeModal, { isOpen: false });
    expect(container.querySelector(".modal-overlay")).not.toBeInTheDocument();
  });

  it("renders when isOpen is true", async () => {
    const { getByText } = render(OrganizeModal, { isOpen: true });
    await waitFor(() => {
      expect(
        getByText("Create a focused view of links in this rabbithole"),
      ).toBeInTheDocument();
    });
  });

  it("renders Burrow option with description", async () => {
    const { getByText } = render(OrganizeModal, { isOpen: true });
    await waitFor(() => {
      expect(getByText("Burrow")).toBeInTheDocument();
      expect(
        getByText(
          "A focused collection within a rabbithole — like a playlist of links for a specific goal or topic",
        ),
      ).toBeInTheDocument();
    });
  });

  it("renders Trail option with description", async () => {
    const { getByText } = render(OrganizeModal, { isOpen: true });
    await waitFor(() => {
      expect(getByText("Trail")).toBeInTheDocument();
      expect(
        getByText(
          "An ordered path through a set of links — built to be followed, shared, or published as a trail",
        ),
      ).toBeInTheDocument();
    });
  });

  it("dispatches select event with type Burrow when Burrow is clicked", async () => {
    const { component, getByText } = render(OrganizeModal, { isOpen: true });
    const handler = vi.fn();
    component.$on("select", handler);

    await waitFor(() => getByText("Burrow"));
    await fireEvent.click(getByText("Burrow"));

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { type: "Burrow" },
      }),
    );
  });

  it("dispatches select event with type Trail when Trail is clicked", async () => {
    const { component, getByText } = render(OrganizeModal, { isOpen: true });
    const handler = vi.fn();
    component.$on("select", handler);

    await waitFor(() => getByText("Trail"));
    await fireEvent.click(getByText("Trail"));

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { type: "Trail" },
      }),
    );
  });

  it("dispatches close event when modal is closed", async () => {
    const { component, container } = render(OrganizeModal, { isOpen: true });
    const handler = vi.fn();
    component.$on("close", handler);

    await waitFor(() =>
      expect(container.querySelector(".modal-overlay")).toBeInTheDocument(),
    );

    // Click the overlay to close
    await fireEvent.click(container.querySelector(".modal-overlay"));
    expect(handler).toHaveBeenCalled();
  });

  it("closes on Escape key", async () => {
    const { component, getByText } = render(OrganizeModal, { isOpen: true });
    const handler = vi.fn();
    component.$on("close", handler);

    await waitFor(() => getByText("Burrow"));
    await fireEvent.keyDown(window, { key: "Escape" });

    expect(handler).toHaveBeenCalled();
  });
});
