import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import RabbitholeGrid from "../src/lib/RabbitholeGrid.svelte";

const mockRabbitholes = [
  {
    id: "rh1",
    title: "Research",
    burrows: ["b1"],
    meta: ["https://example.com"],
    createdAt: Date.now(),
  },
  {
    id: "rh2",
    title: "Work",
    burrows: [],
    meta: [],
    createdAt: Date.now(),
  },
];

const mockBurrows = [
  {
    id: "b1",
    name: "Subtopic",
    websites: ["https://example.com", "https://foo.com"],
    createdAt: Date.now(),
  },
];

describe("RabbitholeGrid Component", () => {
  it("renders all rabbitholes", () => {
    const { getByText } = render(RabbitholeGrid, {
      props: {
        rabbitholes: mockRabbitholes,
        burrows: mockBurrows,
        onSelect: vi.fn(),
      },
    });
    expect(getByText("Research")).toBeInTheDocument();
    expect(getByText("Work")).toBeInTheDocument();
  });

  it("shows correct burrow and site counts", () => {
    const { getByText } = render(RabbitholeGrid, {
      props: {
        rabbitholes: mockRabbitholes,
        burrows: mockBurrows,
        onSelect: vi.fn(),
      },
    });
    // Site count only includes rabbithole.meta (burrow sites are subsets and not double-counted)
    expect(getByText("1 burrow")).toBeInTheDocument();
    expect(getByText("1 site")).toBeInTheDocument();
    // rh2 has 0 burrows and 0 sites
    expect(getByText("0 burrows")).toBeInTheDocument();
    expect(getByText("0 sites")).toBeInTheDocument();
  });

  it("calls onSelect when a card is clicked", async () => {
    const onSelect = vi.fn();
    const { getByText } = render(RabbitholeGrid, {
      props: {
        rabbitholes: mockRabbitholes,
        burrows: mockBurrows,
        onSelect,
      },
    });
    await fireEvent.click(getByText("Research"));
    expect(onSelect).toHaveBeenCalledWith("rh1");
  });

  it("renders create button when allowCreate is true", () => {
    const { getByTitle } = render(RabbitholeGrid, {
      props: {
        rabbitholes: [],
        burrows: [],
        onSelect: vi.fn(),
        allowCreate: true,
      },
    });
    expect(getByTitle("Create new rabbithole")).toBeInTheDocument();
  });

  it("does not render create button when allowCreate is false", () => {
    const { queryByTitle } = render(RabbitholeGrid, {
      props: {
        rabbitholes: [],
        burrows: [],
        onSelect: vi.fn(),
        allowCreate: false,
      },
    });
    expect(queryByTitle("Create new rabbithole")).not.toBeInTheDocument();
  });

  it("renders delete buttons when showDelete is true", () => {
    const { getAllByTitle } = render(RabbitholeGrid, {
      props: {
        rabbitholes: mockRabbitholes,
        burrows: mockBurrows,
        onSelect: vi.fn(),
        showDelete: true,
      },
    });
    expect(getAllByTitle("Delete Rabbithole")).toHaveLength(2);
  });

  it("dispatches deleteRabbithole event when delete is clicked", async () => {
    const { component, getAllByTitle } = render(RabbitholeGrid, {
      props: {
        rabbitholes: mockRabbitholes,
        burrows: mockBurrows,
        onSelect: vi.fn(),
        showDelete: true,
      },
    });
    const deleteHandler = vi.fn();
    component.$on("deleteRabbithole", deleteHandler);

    await fireEvent.click(getAllByTitle("Delete Rabbithole")[0]);
    expect(deleteHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { rabbitholeId: "rh1" },
      }),
    );
  });
});
