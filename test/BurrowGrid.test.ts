import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import BurrowGrid from "../src/lib/BurrowGrid.svelte";

const mockBurrows = [
  {
    id: "b1",
    name: "Alpha",
    websites: ["https://a.com"],
    createdAt: Date.now(),
  },
  { id: "b2", name: "Beta", websites: [], createdAt: Date.now() },
];

const mockTrails = [
  {
    id: "t1",
    name: "Gamma",
    stops: [{ websiteUrl: "https://g.com", note: "" }],
    rabbitholeId: "rh1",
    createdAt: Date.now(),
    startNote: "",
  },
];

describe("BurrowGrid Component", () => {
  it("renders all burrows", () => {
    const { getByText } = render(BurrowGrid, {
      props: { burrows: mockBurrows, onSelectBurrow: vi.fn() },
    });
    expect(getByText("Alpha")).toBeInTheDocument();
    expect(getByText("Beta")).toBeInTheDocument();
  });

  it("shows correct website counts", () => {
    const { getByText } = render(BurrowGrid, {
      props: { burrows: mockBurrows, onSelectBurrow: vi.fn() },
    });
    expect(getByText("Burrow • 1 site")).toBeInTheDocument();
    expect(getByText("Burrow • 0 sites")).toBeInTheDocument();
  });

  it("calls onSelectBurrow when a burrow card is clicked", async () => {
    const onSelectBurrow = vi.fn();
    const { getByText } = render(BurrowGrid, {
      props: { burrows: mockBurrows, onSelectBurrow },
    });
    await fireEvent.click(getByText("Alpha"));
    expect(onSelectBurrow).toHaveBeenCalledWith("b1");
  });

  it("renders all trails", () => {
    const { getByText } = render(BurrowGrid, {
      props: { trails: mockTrails, onSelectTrail: vi.fn() },
    });
    expect(getByText("Gamma")).toBeInTheDocument();
    expect(getByText("Trail • 1 stop")).toBeInTheDocument();
  });

  it("calls onSelectTrail when a trail card is clicked", async () => {
    const onSelectTrail = vi.fn();
    const { getByText } = render(BurrowGrid, {
      props: { trails: mockTrails, onSelectTrail },
    });
    await fireEvent.click(getByText("Gamma"));
    expect(onSelectTrail).toHaveBeenCalledWith("t1");
  });

  it("renders organize button when allowCreate is true", () => {
    const { getByTitle } = render(BurrowGrid, {
      props: { burrows: [], onSelectBurrow: vi.fn(), allowCreate: true },
    });
    expect(getByTitle("Organize")).toBeInTheDocument();
  });

  it("dispatches organize event when organize button is clicked", async () => {
    const { component, getByTitle } = render(BurrowGrid, {
      props: { burrows: [], onSelectBurrow: vi.fn(), allowCreate: true },
    });
    const handler = vi.fn();
    component.$on("organize", handler);
    await fireEvent.click(getByTitle("Organize"));
    expect(handler).toHaveBeenCalled();
  });

  it("highlights selected burrow", () => {
    const { container } = render(BurrowGrid, {
      props: {
        burrows: mockBurrows,
        onSelectBurrow: vi.fn(),
        selectedBurrowId: "b1",
      },
    });
    const cards = container.querySelectorAll(".card");
    expect(cards[0]).toHaveClass("selected");
    expect(cards[1]).not.toHaveClass("selected");
  });

  it("renders delete buttons when showDelete is true", () => {
    const { getAllByTitle } = render(BurrowGrid, {
      props: {
        burrows: mockBurrows,
        trails: mockTrails,
        onSelectBurrow: vi.fn(),
        showDelete: true,
      },
    });
    expect(getAllByTitle("Delete Burrow")).toHaveLength(2);
    expect(getAllByTitle("Delete Trail")).toHaveLength(1);
  });
});
