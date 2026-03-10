import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/svelte";
import WebsiteSelectGrid from "../src/lib/WebsiteSelectGrid.svelte";

const mockWebsites = [
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
  {
    url: "https://c.com",
    name: "Site C",
    savedAt: Date.now(),
    faviconUrl: "",
    description: "Desc C",
  },
];

describe("WebsiteSelectGrid Component", () => {
  it("renders all websites", () => {
    const { container } = render(WebsiteSelectGrid, {
      props: { websites: mockWebsites, mode: "Burrow" },
    });
    const cards = container.querySelectorAll(".grid-item");
    expect(cards).toHaveLength(3);
  });

  it("shows the mode in the header title", () => {
    const { getByText } = render(WebsiteSelectGrid, {
      props: { websites: mockWebsites, mode: "Burrow" },
    });
    expect(getByText("Select websites for Burrow")).toBeInTheDocument();
  });

  it("shows Trail mode in the header title", () => {
    const { getByText } = render(WebsiteSelectGrid, {
      props: { websites: mockWebsites, mode: "Trail" },
    });
    expect(getByText("Select websites for Trail")).toBeInTheDocument();
  });

  it("Done button is disabled when nothing is selected", () => {
    const { container } = render(WebsiteSelectGrid, {
      props: { websites: mockWebsites, mode: "Burrow" },
    });
    // Find the Done button - it contains "Done (0)"
    const buttons = container.querySelectorAll("button");
    const doneBtn = Array.from(buttons).find((b) =>
      b.textContent?.includes("Done"),
    ) as HTMLButtonElement;
    expect(doneBtn).toBeDefined();
    expect(doneBtn.disabled).toBe(true);
  });

  it("selects a website when clicked and shows order badge", async () => {
    const { container } = render(WebsiteSelectGrid, {
      props: { websites: mockWebsites, mode: "Burrow" },
    });

    const items = container.querySelectorAll(".selectable");
    await fireEvent.click(items[0]);

    await waitFor(() => {
      const badge = container.querySelector(".selection-badge");
      expect(badge).toBeInTheDocument();
      expect(badge?.textContent).toBe("1");
    });
  });

  it("assigns sequential order numbers when multiple websites are selected", async () => {
    const { container } = render(WebsiteSelectGrid, {
      props: { websites: mockWebsites, mode: "Burrow" },
    });

    const items = container.querySelectorAll(".selectable");
    await fireEvent.click(items[0]);
    await fireEvent.click(items[1]);
    await fireEvent.click(items[2]);

    await waitFor(() => {
      const badges = container.querySelectorAll(".selection-badge");
      expect(badges).toHaveLength(3);
      expect(badges[0].textContent).toBe("1");
      expect(badges[1].textContent).toBe("2");
      expect(badges[2].textContent).toBe("3");
    });
  });

  it("deselects a website when clicked again", async () => {
    const { container } = render(WebsiteSelectGrid, {
      props: { websites: mockWebsites, mode: "Burrow" },
    });

    const items = container.querySelectorAll(".selectable");
    await fireEvent.click(items[0]);
    await fireEvent.click(items[1]);

    // Deselect first
    await fireEvent.click(items[0]);

    await waitFor(() => {
      const badges = container.querySelectorAll(".selection-badge");
      expect(badges).toHaveLength(1);
      // The remaining badge should be renumbered to 1
      expect(badges[0].textContent).toBe("1");
    });
  });

  it("re-numbers remaining selections after deselection", async () => {
    const { container } = render(WebsiteSelectGrid, {
      props: { websites: mockWebsites, mode: "Burrow" },
    });

    const items = container.querySelectorAll(".selectable");
    await fireEvent.click(items[0]); // 1
    await fireEvent.click(items[1]); // 2
    await fireEvent.click(items[2]); // 3

    // Deselect item 2 (index 1)
    await fireEvent.click(items[1]);

    await waitFor(() => {
      const badges = container.querySelectorAll(".selection-badge");
      expect(badges).toHaveLength(2);
      expect(badges[0].textContent).toBe("1");
      expect(badges[1].textContent).toBe("2");
    });
  });

  it("adds selected class to selected items", async () => {
    const { container } = render(WebsiteSelectGrid, {
      props: { websites: mockWebsites, mode: "Burrow" },
    });

    const items = container.querySelectorAll(".selectable");
    await fireEvent.click(items[0]);

    await waitFor(() => {
      expect(items[0]).toHaveClass("selected");
      expect(items[1]).not.toHaveClass("selected");
    });
  });

  it("enables Done button after selection", async () => {
    const { container } = render(WebsiteSelectGrid, {
      props: { websites: mockWebsites, mode: "Burrow" },
    });

    const items = container.querySelectorAll(".selectable");
    await fireEvent.click(items[0]);

    await waitFor(() => {
      const buttons = container.querySelectorAll("button");
      const doneBtn = Array.from(buttons).find((b) =>
        b.textContent?.includes("Done"),
      ) as HTMLButtonElement;
      expect(doneBtn.disabled).toBe(false);
    });
  });

  it("shows count in Done button", async () => {
    const { container } = render(WebsiteSelectGrid, {
      props: { websites: mockWebsites, mode: "Burrow" },
    });

    const items = container.querySelectorAll(".selectable");
    await fireEvent.click(items[0]);
    await fireEvent.click(items[1]);

    await waitFor(() => {
      const buttons = container.querySelectorAll("button");
      const doneBtn = Array.from(buttons).find((b) =>
        b.textContent?.includes("Done"),
      );
      expect(doneBtn?.textContent).toContain("2");
    });
  });

  it("dispatches done event with selectedUrls in order", async () => {
    const { component, container } = render(WebsiteSelectGrid, {
      props: { websites: mockWebsites, mode: "Burrow" },
    });
    const handler = vi.fn();
    component.$on("done", handler);

    const items = container.querySelectorAll(".selectable");
    await fireEvent.click(items[2]); // c.com first
    await fireEvent.click(items[0]); // a.com second

    const buttons = container.querySelectorAll("button");
    const doneBtn = Array.from(buttons).find((b) =>
      b.textContent?.includes("Done"),
    ) as HTMLElement;
    await fireEvent.click(doneBtn);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: {
          selectedUrls: ["https://c.com", "https://a.com"],
        },
      }),
    );
  });

  it("dispatches cancel event when Cancel is clicked", async () => {
    const { component, getByText } = render(WebsiteSelectGrid, {
      props: { websites: mockWebsites, mode: "Burrow" },
    });
    const handler = vi.fn();
    component.$on("cancel", handler);

    await fireEvent.click(getByText("Cancel"));
    expect(handler).toHaveBeenCalled();
  });

  it("renders empty grid when no websites", () => {
    const { container } = render(WebsiteSelectGrid, {
      props: { websites: [], mode: "Burrow" },
    });
    const items = container.querySelectorAll(".selectable");
    expect(items).toHaveLength(0);
  });
});
