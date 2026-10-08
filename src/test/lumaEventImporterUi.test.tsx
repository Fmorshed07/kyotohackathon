import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LumaEventImporter } from "@/components/dashboard/LumaEventImporter";
import { emptyHostEventBriefForm } from "@/lib/hostEventBriefForm";
import { importLumaEvent } from "@/lib/lumaEventImport";

vi.mock("@/lib/lumaEventImport", async (original) => ({ ...await original<typeof import("@/lib/lumaEventImport")>(), importLumaEvent: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const result = {
  sourceUrl: "https://luma.com/ai-weekend", timezone: "Asia/Tokyo", warnings: ["Capacity was not published."],
  details: { ...emptyHostEventBriefForm(), name: "AI Weekend", description: "Build with your community.", capacity: "", startAt: "2026-10-17T05:00:00.000Z", endAt: "2026-10-17T09:00:00.000Z", location: "Kyoto" },
};

describe("Luma import preview", () => {
  it("previews first, then fills a new draft only after the host chooses to apply", async () => {
    vi.mocked(importLumaEvent).mockResolvedValue(result);
    const onImport = vi.fn().mockReturnValue(true);
    render(<LumaEventImporter onImport={onImport} />);
    fireEvent.change(screen.getByLabelText("Luma event link"), { target: { value: result.sourceUrl } });
    fireEvent.click(screen.getByRole("button", { name: "Extract details" }));
    await screen.findByRole("heading", { name: "AI Weekend" });
    expect(onImport).not.toHaveBeenCalled();
    expect(screen.getByText("Capacity was not published.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use details in new draft" }));
    expect(onImport).toHaveBeenCalledOnce();
    expect(onImport.mock.calls[0][0]).toMatchObject({ name: "AI Weekend", registrationUrl: result.sourceUrl, accentColor: "#00A3FF", capacity: "" });
    expect(screen.getByRole("button", { name: "Added to new draft" })).toBeDisabled();
  });
  it("allows retry after failure without changing the current draft", async () => {
    vi.mocked(importLumaEvent).mockRejectedValueOnce(new Error("The event is not public.")).mockResolvedValueOnce(result);
    const onImport = vi.fn(); render(<LumaEventImporter onImport={onImport} />);
    fireEvent.change(screen.getByLabelText("Luma event link"), { target: { value: result.sourceUrl } });
    fireEvent.click(screen.getByRole("button", { name: "Extract details" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The event is not public.");
    expect(onImport).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Extract details" }));
    await screen.findByRole("heading", { name: "AI Weekend" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("blocks duplicate requests while loading and clears stale preview when the link changes", async () => {
    let resolve: (value: typeof result) => void;
    vi.mocked(importLumaEvent).mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(<LumaEventImporter onImport={() => true} />);
    fireEvent.change(screen.getByLabelText("Luma event link"), { target: { value: result.sourceUrl } });
    fireEvent.click(screen.getByRole("button", { name: "Extract details" }));
    expect(screen.getByRole("button", { name: "Extracting details…" })).toBeDisabled();
    expect(screen.getByLabelText("Luma event link")).toBeDisabled();
    resolve!(result);
    await waitFor(() => expect(screen.getByRole("heading", { name: "AI Weekend" })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Luma event link"), { target: { value: "https://luma.com/another-event" } });
    expect(screen.queryByRole("heading", { name: "AI Weekend" })).not.toBeInTheDocument();
  });
  it("does not report success if creating the new draft was declined", async () => {
    vi.mocked(importLumaEvent).mockResolvedValue(result);
    render(<LumaEventImporter onImport={() => false} />);
    fireEvent.change(screen.getByLabelText("Luma event link"), { target: { value: result.sourceUrl } });
    fireEvent.click(screen.getByRole("button", { name: "Extract details" }));
    await screen.findByRole("heading", { name: "AI Weekend" });
    fireEvent.click(screen.getByRole("button", { name: "Use details in new draft" }));
    expect(screen.getByRole("button", { name: "Use details in new draft" })).toBeEnabled();
  });
});
