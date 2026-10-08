import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHomeSectionAnchor } from "@/hooks/useHomeSectionAnchor";

function Page() { useHomeSectionAnchor(); return <section id="get-hired">Careers</section>; }
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("homepage section links", () => {
  it("scrolls a mounted React section into view for cross-page footer links", () => {
    let callback: FrameRequestCallback | undefined;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(fn => { callback = fn; return 1; });
    const { container } = render(<MemoryRouter initialEntries={["/#get-hired"]}><Page /></MemoryRouter>);
    const scroll = vi.fn();
    container.querySelector("section")!.scrollIntoView = scroll;
    callback?.(0);
    expect(scroll).toHaveBeenCalledWith({ block: "start", behavior: "instant" });
  });
  it("does not interrupt the normal homepage position without a section hash", () => {
    const frame = vi.spyOn(window, "requestAnimationFrame");
    render(<MemoryRouter initialEntries={["/"]}><Page /></MemoryRouter>);
    expect(frame).not.toHaveBeenCalled();
  });
});
