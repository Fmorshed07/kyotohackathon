import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ParticipantOnboardingPage from "@/pages/ParticipantOnboardingPage";
import { formDraftStorageKey, readFormDraft } from "@/lib/formDrafts";

const backend = vi.hoisted(() => ({
  db: {}, auth: { currentUser: { uid: "participant" } as { uid: string } | null },
  getDoc: vi.fn(), setDoc: vi.fn(), checkEnrollment: vi.fn(), queueEmail: vi.fn(),
}));
vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => backend.db, getFirebaseAuth: () => backend.auth }));
vi.mock("firebase/firestore", async (original) => ({
  ...await original<typeof import("firebase/firestore")>(),
  doc: (_db: unknown, collection: string, id: string) => ({ id, path: `${collection}/${id}` }),
  getDoc: backend.getDoc, setDoc: backend.setDoc,
}));
vi.mock("@/hooks/usePortalAuth", () => ({
  usePortalAuth: () => ({ sessionUser: { id: "participant", email: "participant@example.com", role: "participant" }, loading: false, signOut: vi.fn() }),
}));
vi.mock("@/lib/aiHackathons", () => ({
  fetchJoinablePortalHackathons: async () => [{ id: "open-event", name: "Open event", shortName: "Open event", status: "active", eventDate: "", location: "", theme: "" }],
  fetchAiHackathon: vi.fn(), hostedToPortalHackathon: vi.fn(), isAiIdeathonEvent: vi.fn(),
}));
vi.mock("@/lib/participantEventEnrollment", () => ({ checkParticipantEventEnrollment: backend.checkEnrollment }));
vi.mock("@/lib/participantEmail", () => ({ queueParticipantEmail: backend.queueEmail }));
vi.mock("@/components/AnimatedBackground", () => ({ default: () => null }));
vi.mock("@/components/BrandLogo", () => ({ default: () => null }));

const view = () => (
  <MemoryRouter initialEntries={["/onboarding"]}>
    <Routes>
      <Route path="/onboarding" element={<ParticipantOnboardingPage />} />
      <Route path="/dashboard/participant" element={<p>Participant workspace</p>} />
    </Routes>
  </MemoryRouter>
);

async function finishBasics() {
  await screen.findByRole("button", { name: "Continue" });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByPlaceholderText("How you want to appear on the board")).toHaveValue("Participant");
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  backend.auth.currentUser = { uid: "participant" };
  backend.getDoc.mockReset().mockResolvedValue({ data: () => ({ fullName: "Participant", publicRole: "Engineer" }) });
  backend.setDoc.mockReset().mockResolvedValue(undefined);
  backend.checkEnrollment.mockReset().mockResolvedValue("new");
});
afterEach(cleanup);

describe("participant onboarding safety", () => {
  it("shows a retry screen after a failed profile load instead of allowing an empty overwrite", async () => {
    backend.getDoc.mockRejectedValueOnce(new Error("Offline"));
    render(view());
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load your profile");
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
    expect(backend.setDoc).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Retry loading profile" }));
    await finishBasics();
    expect(screen.getByRole("button", { name: "Finish & open dashboard" })).toBeEnabled();
  });

  it("does not save a previous account's onboarding after an eligibility check resolves", async () => {
    let finishCheck!: () => void;
    backend.checkEnrollment.mockReturnValueOnce(new Promise<void>((resolve) => { finishCheck = resolve; }));
    render(view());
    await finishBasics();
    fireEvent.click(screen.getByRole("button", { name: "Finish & open dashboard" }));
    expect(backend.checkEnrollment).toHaveBeenCalledOnce();
    backend.auth.currentUser = { uid: "another-participant" };

    await act(async () => finishCheck());

    expect(backend.setDoc).not.toHaveBeenCalled();
    expect(backend.queueEmail).not.toHaveBeenCalled();
    expect(screen.queryByText("Participant workspace")).not.toBeInTheDocument();
  });

  it("does not send welcome email or navigate for an account that changed while saving", async () => {
    let finishSave!: () => void;
    backend.setDoc.mockReturnValueOnce(new Promise<void>((resolve) => { finishSave = resolve; }));
    render(view());
    await finishBasics();
    fireEvent.click(screen.getByRole("button", { name: "Finish & open dashboard" }));
    await waitFor(() => expect(backend.setDoc).toHaveBeenCalledOnce());
    backend.auth.currentUser = { uid: "another-participant" };

    await act(async () => finishSave());

    expect(backend.queueEmail).not.toHaveBeenCalled();
    expect(screen.queryByText("Participant workspace")).not.toBeInTheDocument();
  });

  it("persists a custom role with the rest of the onboarding draft", async () => {
    render(view());
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: /Other Student, multi-hat, still exploring/ }));
    fireEvent.change(screen.getByPlaceholderText("Describe your role (optional)"), { target: { value: "Robotics builder" } });

    act(() => window.dispatchEvent(new Event("pagehide")));

    const draft = readFormDraft<{ customRole: string }>(formDraftStorageKey(["participant-onboarding", "participant"]));
    expect(draft?.value.customRole).toBe("Robotics builder");
  });
});
