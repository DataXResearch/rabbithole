import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import CollapsibleContainer from "../src/lib/CollapsibleContainer.svelte";

describe("CollapsibleContainer Component", () => {
  it("renders title and is open by default", () => {
    const { getByText } = render(CollapsibleContainer, {
      props: { title: "My Section", defaultOpen: true },
    });
    expect(getByText("My Section")).toBeInTheDocument();
  });

  it("hides content when defaultOpen is false", () => {
    const { queryByText } = render(CollapsibleContainer, {
      props: { title: "Closed Section", defaultOpen: false },
    });
    // The slot content won't be rendered when closed
    const header = queryByText("Closed Section");
    expect(header).toBeInTheDocument();
  });

  it("toggles open/closed when header is clicked", async () => {
    const { getByRole } = render(CollapsibleContainer, {
      props: { title: "Toggle Me", defaultOpen: true },
    });
    const btn = getByRole("button");
    expect(btn).toHaveAttribute("aria-expanded", "true");
    await fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "false");
    await fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("does not toggle when collapsible is false", async () => {
    const { getByRole } = render(CollapsibleContainer, {
      props: { title: "Fixed", defaultOpen: true, collapsible: false },
    });
    const btn = getByRole("button");
    expect(btn).toBeDisabled();
  });
});
