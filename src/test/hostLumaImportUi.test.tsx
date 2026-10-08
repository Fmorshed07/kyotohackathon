import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HostDashboardPage from "@/pages/HostDashboardPage";
import { emptyHostEventBriefForm } from "@/lib/hostEventBriefForm";
import { formDraftStorageKey, writeFormDraft } from "@/lib/formDrafts";
import { importLumaEvent } from "@/lib/lumaEventImport";
import { addDoc, getDocs, updateDoc } from "firebase/firestore";

const context = vi.hoisted(() => ({
  db: {},
  user: { id: "host-id", role: "host", email: "host@example.com", hostApprovalStatus: "approved" },
}));

vi.mock("@/hooks/usePortalAuth", () => ({ usePortalAuth: () => ({ sessionUser: context.user, loading: false, signOut: vi.fn() }) }));
vi.mock("@/lib/firebaseClient", async (original) => ({
  ...await original<typeof import("@/lib/firebaseClient")>(),
  getFirestoreDb: () => context.db,
}));
vi.mock("firebase/firestore", async (original) => ({
  ...await original<typeof import("firebase/firestore")>(),
  collection: (_db: unknown, name: string) => name,
  query: (collection: unknown) => collection,
  where: vi.fn(), getDocs: vi.fn(), addDoc: vi.fn(), updateDoc: vi.fn(),
}));
vi.mock("@/components/dashboard/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sectionClass: "", dashJumpLinkClass: "",
}));
vi.mock("@/components/dashboard/HostEventBriefEditor", () => ({
  HostEventBriefEditor: ({ value, selectedEventId }: { value: { name: string }; selectedEventId: string }) => (
    <div><output data-testid="event-name">{value.name}</output><output data-testid="selected-event">{selectedEventId || "new"}</output></div>
  ),
}));
vi.mock("@/components/dashboard/HostEventJudgingWorkspace", () => ({ HostEventJudgingWorkspace: () => null, HostJudgingUnavailableNotice: () => null }));
vi.mock("@/components/dashboard/JudgeInvitePanel", () => ({ JudgeInvitePanel: () => null }));
vi.mock("@/lib/lumaEventImport", async (original) => ({ ...await original<typeof import("@/lib/lumaEventImport")>(), importLumaEvent: vi.fn() }));

const imported = {
  sourceUrl: "https://luma.com/community-event", timezone: "Asia/Tokyo", warnings: [],
  details: { ...emptyHostEventBriefForm(), name: "Imported event", description: "Public event details", startAt: "2026-10-17T05:00:00.000Z", endAt: "2026-10-17T09:00:00.000Z", location: "Kyoto" },
};

beforeEach(() => {
  localStorage.clear();
  vi.mocked(importLumaEvent).mockResolvedValue(imported);
  vi.mocked(getDocs).mockImplementation(async (collection) => ({
    docs: collection as unknown === "host_events" ? [{ id: "existing-event", data: () => ({ name: "Existing event", owner_id: "host-id", start_at: "2026-10-10T05:00:00Z", location: "Tokyo", status: "draft" }) }] : [],
  }) as Awaited<ReturnType<typeof getDocs>>);
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.clearAllMocks(); });

async function previewImport() {
  render(<MemoryRouter><HostDashboardPage /></MemoryRouter>);
  await waitFor(() => expect(screen.getByTestId("event-name")).toHaveTextContent("Existing event"));
  fireEvent.change(screen.getByLabelText("Luma event link"), { target: { value: imported.sourceUrl } });
  fireEvent.click(screen.getByRole("button", { name: "Extract details" }));
  await screen.findByRole("heading", { name: "Imported event" });
}

describe("host Luma draft integration", () => {
  it("switches to an imported new draft without overwriting or autosaving the existing event", async () => {
    await previewImport();
    const newKey = formDraftStorageKey(["host-event", context.user.id, "new"]);
    writeFormDraft(newKey, { ...emptyHostEventBriefForm(), name: "Old browser draft" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Use details in new draft" }));
    await waitFor(() => expect(screen.getByTestId("event-name")).toHaveTextContent("Imported event"));
    expect(screen.getByTestId("selected-event")).toHaveTextContent("new");
    expect(screen.getByRole("button", { name: "Create event draft" })).toBeInTheDocument();
    expect(addDoc).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(newKey!) || "{}").value?.name).toBe("Imported event"));
  });

  it("keeps the original brief and stored new draft when replacement is declined", async () => {
    await previewImport();
    const newKey = formDraftStorageKey(["host-event", context.user.id, "new"]);
    writeFormDraft(newKey, { ...emptyHostEventBriefForm(), name: "Old browser draft" });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Use details in new draft" }));
    expect(screen.getByTestId("event-name")).toHaveTextContent("Existing event");
    expect(screen.getByTestId("selected-event")).toHaveTextContent("existing-event");
    expect(JSON.parse(localStorage.getItem(newKey!) || "{}").value.name).toBe("Old browser draft");
    expect(updateDoc).not.toHaveBeenCalled();
  });
});
