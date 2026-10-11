import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ParticipantProfilePage from "@/pages/ParticipantProfilePage";
import { formDraftStorageKey, readFormDraft, writeFormDraft } from "@/lib/formDrafts";
import type { PeopleProfileFormState } from "@/components/dashboard/PeopleProfileSection";
import type { SessionUser } from "@/types/portal";

const backend = vi.hoisted(() => ({
  db: {},
  user: { id: "participant-a", email: "ada@example.com", role: "participant" } as SessionUser,
  auth: { currentUser: { uid: "participant-a" } as { uid: string } | null },
  getDoc: vi.fn(), setDoc: vi.fn(), avatar: vi.fn(), image: vi.fn(), deleteImage: vi.fn(),
  selectEvent: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` }),
  getDoc: backend.getDoc,
  setDoc: backend.setDoc,
}));
vi.mock("@/lib/firebaseClient", () => ({
  getFirestoreDb: () => backend.db,
  getFirebaseAuth: () => backend.auth,
}));
vi.mock("@/hooks/usePortalAuth", () => ({
  usePortalAuth: () => ({ sessionUser: backend.user, loading: false, signOut: vi.fn() }),
}));
vi.mock("@/hooks/useHackathonSelection", () => ({
  useHackathonSelection: () => ({ selectedHackathonId: "impact-kyoto", setSelectedHackathonId: backend.selectEvent }),
}));
vi.mock("@/lib/aiHackathons", () => ({ fetchPortalHackathonCatalog: async () => [] }));
vi.mock("@/lib/profileMedia", () => ({
  uploadProfileAvatar: backend.avatar,
  uploadProfileImage: backend.image,
  deleteStorageImageByUrl: backend.deleteImage,
}));
vi.mock("@/components/dashboard/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sectionClass: "",
}));

const original = {
  fullName: "Ada", headline: "Builder", hackathon_id: "impact-kyoto",
  avatarUrl: "https://example.com/old-avatar.jpg", coverUrl: "https://example.com/old-cover.jpg",
  galleryUrls: ["https://example.com/old-gallery.jpg"],
  githubUsername: "ada", githubProfileUrl: "https://github.com/ada",
};
const newImage = "https://example.com/new-image.jpg";
const photo = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
const draftKey = formDraftStorageKey(["participant-profile", "participant-a"])!;
const profileSnapshot = () => ({ exists: () => true, data: () => original });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const page = () => (
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <ParticipantProfilePage />
  </MemoryRouter>
);
async function showProfile() {
  const view = render(page());
  await screen.findByPlaceholderText("Your name");
  return view;
}
function hasUnsavedChanges() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  backend.user = { id: "participant-a", email: "ada@example.com", role: "participant" };
  backend.auth.currentUser = { uid: "participant-a" };
  backend.getDoc.mockReset().mockResolvedValue(profileSnapshot());
  backend.setDoc.mockReset().mockResolvedValue(undefined);
  backend.avatar.mockReset().mockResolvedValue(newImage);
  backend.image.mockReset().mockResolvedValue(newImage);
  backend.deleteImage.mockReset().mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); localStorage.clear(); });

const mediaCases = [
  { label: "Choose profile photo", field: "avatarUrl", value: newImage, message: "Profile photo saved." },
  { label: "Choose banner", field: "coverUrl", value: newImage, message: "Banner saved." },
  { label: "Choose gallery photos", field: "galleryUrls", value: [...original.galleryUrls, newImage], message: "Gallery photo added." },
] as const;

describe("participant profile editing", () => {
  it("keeps unsaved text when the same account receives a realtime profile update", async () => {
    const view = await showProfile();
    fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "Unsaved name" } });
    backend.user = { ...backend.user, profile: { fullName: "Ada", profileUpdatedAt: "2026-10-11T00:00:00Z" } };
    view.rerender(page());
    await act(async () => {});

    expect(backend.getDoc).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText("Your name")).toHaveValue("Unsaved name");
    expect(hasUnsavedChanges()).toBe(true);
  });

  it.each(mediaCases)("marks $field saved without leaving a false unsaved draft", async ({ label, field, value, message }) => {
    await showProfile();
    fireEvent.change(screen.getByLabelText(label), { target: { files: [photo] } });
    await screen.findByText(message);

    expect(backend.setDoc).toHaveBeenCalledWith({ path: "users/participant-a" }, expect.objectContaining({ [field]: value }), { merge: true });
    expect(hasUnsavedChanges()).toBe(false);
    fireEvent(window, new Event("pagehide"));
    expect(readFormDraft(draftKey)).toBeNull();
  });

  it("keeps a text draft through a photo save and blocks overlapping saves", async () => {
    const upload = deferred<string>();
    backend.avatar.mockReturnValueOnce(upload.promise);
    await showProfile();
    fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "Unsaved name" } });
    fireEvent.change(screen.getByLabelText("Choose profile photo"), { target: { files: [photo] } });

    expect(screen.getByRole("button", { name: "Save profile" })).toBeDisabled();
    expect(screen.getByLabelText("Choose gallery photos")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(backend.setDoc).not.toHaveBeenCalled();
    await act(async () => { upload.resolve(newImage); });

    expect(screen.getByPlaceholderText("Your name")).toHaveValue("Unsaved name");
    expect(hasUnsavedChanges()).toBe(true);
    fireEvent(window, new Event("pagehide"));
    expect(readFormDraft<PeopleProfileFormState>(draftKey)?.value).toMatchObject({ fullName: "Unsaved name", avatarUrl: newImage });
  });

  it.each(mediaCases)("keeps the old $field if saving an uploaded image fails", async ({ label, field }) => {
    backend.setDoc.mockRejectedValueOnce(new Error("Image save failed"));
    await showProfile();
    fireEvent.change(screen.getByLabelText(label), { target: { files: [photo] } });
    await screen.findByText("Image save failed");

    expect(hasUnsavedChanges()).toBe(false);
    expect(backend.deleteImage).toHaveBeenCalledWith(newImage);
    expect(backend.deleteImage).not.toHaveBeenCalledWith(original.avatarUrl);
    expect(backend.deleteImage).not.toHaveBeenCalledWith(original.coverUrl);
    expect(backend.deleteImage).not.toHaveBeenCalledWith(original.galleryUrls[0]);
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await screen.findByText("Profile saved successfully.");
    expect(backend.setDoc.mock.calls[1][1][field]).toEqual(original[field]);
  });

  it.each([
    { label: "Remove profile photo", field: "avatarUrl" },
    { label: "Remove banner", field: "coverUrl" },
    { label: "Remove gallery photo", field: "galleryUrls" },
  ] as const)("keeps $field visible when removing it fails", async ({ label, field }) => {
    backend.setDoc.mockRejectedValueOnce(new Error("Removal failed"));
    await showProfile();
    fireEvent.click(screen.getByRole("button", { name: label }));
    await screen.findByText("Removal failed");

    expect(screen.getByRole("button", { name: label })).toBeEnabled();
    expect(backend.deleteImage).not.toHaveBeenCalled();
    expect(hasUnsavedChanges()).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await screen.findByText("Profile saved successfully.");
    expect(backend.setDoc.mock.calls[1][1][field]).toEqual(original[field]);
  });

  it("retains and persists newer edits typed during a profile save", async () => {
    const save = deferred<void>();
    backend.setDoc.mockReturnValueOnce(save.promise);
    await showProfile();
    fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "Submitted name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(screen.getByLabelText("Choose profile photo")).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "Newer name" } });
    await act(async () => { save.resolve(undefined); });

    expect(backend.setDoc.mock.calls[0][1].fullName).toBe("Submitted name");
    expect(screen.getByPlaceholderText("Your name")).toHaveValue("Newer name");
    expect(screen.getByText("Profile saved. Your newer edits still need to be saved.")).toBeInTheDocument();
    expect(hasUnsavedChanges()).toBe(true);
    fireEvent(window, new Event("pagehide"));
    expect(readFormDraft<PeopleProfileFormState>(draftKey)?.value.fullName).toBe("Newer name");

    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await screen.findByText("Profile saved successfully.");
    expect(backend.setDoc.mock.calls[1][1].fullName).toBe("Newer name");
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("lets the GitHub URL be typed, replaced, and cleared when a username was already saved", async () => {
    await showProfile();
    const urlInput = screen.getByPlaceholderText("https://github.com/username");
    fireEvent.change(urlInput, { target: { value: "h" } });
    expect(urlInput).toHaveValue("h");
    fireEvent.change(urlInput, { target: { value: "https://github.com/new-user" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await screen.findByText("Profile saved successfully.");
    expect(backend.setDoc.mock.calls[0][1].githubProfileUrl).toBe("https://github.com/new-user");

    fireEvent.change(urlInput, { target: { value: "" } });
    expect(urlInput).toHaveValue("");
    fireEvent.change(screen.getByPlaceholderText("octocat"), { target: { value: "@another-user" } });
    expect(urlInput).toHaveValue("https://github.com/another-user");
  });

  it("blocks editing after a failed initial load and retries without erasing the profile", async () => {
    backend.getDoc.mockRejectedValueOnce(new Error("Offline"));
    render(page());
    await screen.findByRole("alert");
    expect(screen.queryByPlaceholderText("Your name")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save profile" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry loading profile" }));
    expect(await screen.findByPlaceholderText("Your name")).toHaveValue("Ada");
    expect(backend.setDoc).not.toHaveBeenCalled();
  });

  it("restores partial browser drafts without crashing on old or malformed field values", async () => {
    writeFormDraft(draftKey, { fullName: "Draft name", galleryUrls: null, headline: 123 });
    await showProfile();
    await screen.findByText("Restored unsaved profile draft from this browser.");
    expect(screen.getByPlaceholderText("Your name")).toHaveValue("Draft name");
    expect(screen.getByPlaceholderText("Builder · AI for climate · Kyoto")).toHaveValue("");
    expect(screen.getByPlaceholderText("octocat")).toHaveValue("ada");
  });

  it.each(["account changes", "page unmounts"])("does not save a pending photo upload after the %s", async (change) => {
    const upload = deferred<string>();
    backend.avatar.mockReturnValueOnce(upload.promise);
    const view = await showProfile();
    fireEvent.change(screen.getByLabelText("Choose profile photo"), { target: { files: [photo] } });
    if (change === "account changes") backend.auth.currentUser = { uid: "participant-b" };
    else view.unmount();
    await act(async () => { upload.resolve(newImage); });
    expect(backend.setDoc).not.toHaveBeenCalled();
  });
});
