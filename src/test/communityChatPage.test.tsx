import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CommunityChatPage from "@/pages/CommunityChatPage";
import type { CommunityMessage } from "@/lib/communityChat";
import type { SessionUser } from "@/types/portal";

const mocks = vi.hoisted(() => ({ auth: { sessionUser: null as SessionUser | null, loading: false }, uid: "participant", subscribe: vi.fn(), send: vi.fn(), remove: vi.fn(), unsubscribe: vi.fn(), signOut: vi.fn(), layout: vi.fn() }));
vi.mock("@/hooks/usePortalAuth", () => ({ usePortalAuth: () => ({ ...mocks.auth, signOut: mocks.signOut }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({
  DashboardLayout: (props: { children: ReactNode; role: string; sessionUser: SessionUser; onSignOut: () => Promise<void> }) => {
    mocks.layout(props);
    return <section aria-label={`${props.role} dashboard`}>{props.children}</section>;
  },
}));
vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => ({}), getFirebaseAuth: () => ({ currentUser: { uid: mocks.uid } }) }));
vi.mock("@/lib/communityChat", async original => ({ ...await original<typeof import("@/lib/communityChat")>(), subscribeToCommunityMessages: mocks.subscribe, sendCommunityMessage: mocks.send, deleteCommunityMessage: mocks.remove }));

const user: SessionUser = { id: "participant", email: "private@example.com", role: "participant", profile: { fullName: "Aki" } };
const message = (patch: Partial<CommunityMessage> = {}): CommunityMessage => ({ id: "a".repeat(20), userId: "participant", authorName: "Aki", authorRole: "participant", body: "Looking for a designer", createdAt: 1792250000000, pending: false, ...patch });
let receive: (messages: CommunityMessage[], cached: boolean) => void;
let fail: (error: Error) => void;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth = { sessionUser: { ...user }, loading: false };
  mocks.uid = "participant";
  mocks.send.mockReset().mockResolvedValue(undefined);
  mocks.remove.mockReset().mockResolvedValue(undefined);
  mocks.subscribe.mockImplementation((_db, _channel, next, error) => { receive = next; fail = error; return mocks.unsubscribe; });
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

function CurrentLocation() {
  const location = useLocation();
  return <p data-testid="community-location">{location.pathname}{location.search}{location.hash}</p>;
}

function show(path = "/dashboard/community") {
  const view = () => <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes>
      <Route path="/dashboard/community" element={<CommunityChatPage />} />
      <Route path="/signin" element={<p>Sign-in page</p>} />
      <Route path="/signup" element={<p>Account setup</p>} />
    </Routes>
    <CurrentLocation />
  </MemoryRouter>;
  const result = render(view());
  return { ...result, redraw: () => result.rerender(view()) };
}
const connected = (messages: CommunityMessage[] = []) => act(() => receive(messages, false));
const write = (text = "Hello community") => fireEvent.change(screen.getByRole("textbox", { name: /Message #/ }), { target: { value: text } });

describe("community networking channel", () => {
  it("redirects signed-out visitors to sign-in without showing chat channels or opening a Firestore listener", () => {
    mocks.auth.sessionUser = null;
    const requestedPath = "/dashboard/community?channel=teams&hackathon=past-ai#latest";
    show(requestedPath);
    expect(screen.getByText("Sign-in page")).toBeInTheDocument();
    expect(screen.getByTestId("community-location")).toHaveTextContent(/^\/signin/);
    const signInUrl = new URL(screen.getByTestId("community-location").textContent!, "https://example.test");
    expect(signInUrl.searchParams.get("next")).toBe(requestedPath);
    expect(screen.queryByRole("navigation", { name: "Community channels" })).not.toBeInTheDocument();
    expect(mocks.layout).not.toHaveBeenCalled();
    expect(mocks.subscribe).not.toHaveBeenCalled();
  });

  it("waits for authentication and requires a registered role", () => {
    mocks.auth.loading = true;
    const view = show();
    expect(screen.getByRole("status")).toHaveTextContent("Loading community…");
    expect(screen.queryByRole("navigation", { name: "Community channels" })).not.toBeInTheDocument();
    expect(mocks.subscribe).not.toHaveBeenCalled();
    mocks.auth = { loading: false, sessionUser: { ...user, role: undefined } };
    view.redraw();
    expect(screen.getByText("Account setup")).toBeInTheDocument();
    expect(screen.getByTestId("community-location")).toHaveTextContent(/^\/signup/);
    expect(screen.queryByRole("navigation", { name: "Community channels" })).not.toBeInTheDocument();
    expect(mocks.layout).not.toHaveBeenCalled();
    expect(mocks.subscribe).not.toHaveBeenCalled();
  });

  it.each(["participant", "judge", "mentor", "host", "admin"] as const)("allows %s networking without event membership or staff approval", role => {
    mocks.auth.sessionUser = { ...user, role, hackathonIds: [], judgeApprovalStatus: "pending", hostApprovalStatus: "pending" };
    show(); connected();
    expect(screen.getByRole("region", { name: `${role} dashboard` })).toBeInTheDocument();
    expect(mocks.layout).toHaveBeenLastCalledWith(expect.objectContaining({ role, sessionUser: mocks.auth.sessionUser, onSignOut: mocks.signOut }));
    expect(screen.getByRole("heading", { name: "general" })).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("receives live messages, searches the loaded room, and renders safe text and links", () => {
    show(); connected([message(), message({ id: "b".repeat(20), userId: "judge", authorName: "Judge Rin", authorRole: "judge", body: '<script>alert(1)</script> https://example.com/team' })]);
    expect(screen.getByText("Looking for a designer")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
    expect(screen.getByRole("link", { name: "https://example.com/team" })).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(screen.getByRole("log", { name: "Messages in general" })).queryByText(user.email)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search recent messages" }), { target: { value: "designer" } });
    expect(screen.queryByText("Judge Rin")).not.toBeInTheDocument();
    expect(screen.getByText("Looking for a designer")).toBeInTheDocument();
  });

  it("sends once, clears a successful draft and briefly throttles the composer", async () => {
    vi.useFakeTimers();
    show(); connected(); write();
    await act(async () => { fireEvent.submit(screen.getByRole("form", { name: "Send a community message" })); fireEvent.submit(screen.getByRole("form", { name: "Send a community message" })); });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith({}, "general", user, "Hello community");
    expect(screen.getByRole("textbox", { name: "Message #general" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "Wait a moment" })).toBeDisabled();
    await act(async () => { vi.advanceTimersByTime(3000); });
    write("Next message");
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });

  it("preserves drafts on failed writes and allows retry", async () => {
    mocks.send.mockRejectedValueOnce({ code: "permission-denied" });
    show(); connected(); write();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send" })); });
    expect(screen.getByRole("alert")).toHaveTextContent("Chat access was denied");
    expect(screen.getByRole("textbox", { name: "Message #general" })).toHaveValue("Hello community");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send" })); });
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });

  it("does not send while loading, offline, cached-only or after account changes", async () => {
    show(); write();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    act(() => receive([], true));
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    connected();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    fireEvent(window, new Event("offline"));
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    fireEvent(window, new Event("online"));
    mocks.uid = "another-account";
    await act(async () => { fireEvent.submit(screen.getByRole("form", { name: "Send a community message" })); });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("account changed");
  });

  it("does not submit Japanese IME composition or Shift+Enter", () => {
    show(); connected(); write("こんにちは");
    const input = screen.getByRole("textbox", { name: "Message #general" });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    fireEvent.keyDown(input, { key: "Enter", keyCode: 229 });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("removes only an author's own message after confirmation", async () => {
    show(); connected([message(), message({ id: "b".repeat(20), userId: "judge", authorName: "Rin" })]);
    expect(screen.queryByRole("button", { name: "Delete message from Rin" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete message from Aki" }));
    expect(mocks.remove).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Confirm delete" })); });
    expect(mocks.remove).toHaveBeenCalledWith({}, "general", "a".repeat(20));
    connected([]);
    expect(screen.queryByText("Looking for a designer")).not.toBeInTheDocument();
  });

  it("cleans up room listeners and ignores stale snapshots after switching channels", () => {
    show("/dashboard/community?channel=general&hackathon=past-ai&ref=dashboard"); connected([message()]); write("General draft");
    const oldReceive = receive;
    fireEvent.click(within(screen.getByRole("navigation", { name: "Community channels" })).getByRole("button", { name: "find-a-team" }));
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
    expect(screen.getByRole("textbox", { name: "Message #find-a-team" })).toHaveValue("");
    const params = new URL(screen.getByTestId("community-location").textContent!, "https://example.test").searchParams;
    expect(params.get("channel")).toBe("teams");
    expect(params.get("hackathon")).toBe("past-ai");
    expect(params.get("ref")).toBe("dashboard");
    act(() => oldReceive([message({ body: "Stale message" })], false));
    expect(screen.queryByText("Stale message")).not.toBeInTheDocument();
    connected([message({ body: "Team room message" })]);
    expect(screen.getByText("Team room message")).toBeInTheDocument();
  });

  it("removes the previous conversation and closes its listener while authentication changes", () => {
    const view = show();
    connected([message({ body: "Previous account conversation" })]);
    mocks.auth.loading = true;
    view.redraw();

    expect(screen.getByRole("status")).toHaveTextContent("Loading community…");
    expect(screen.queryByText("Previous account conversation")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Community channels" })).not.toBeInTheDocument();
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();

    mocks.auth = { sessionUser: null, loading: false };
    view.redraw();

    expect(screen.getByText("Sign-in page")).toBeInTheDocument();
    expect(mocks.subscribe).toHaveBeenCalledOnce();
  });

  it("does not clear a new account's draft when an old send finishes", async () => {
    let resolve!: () => void;
    mocks.send.mockReturnValue(new Promise<void>(done => { resolve = done; }));
    const view = show(); connected(); write("Old account draft");
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    mocks.auth.sessionUser = { ...user, id: "new-account" };
    mocks.uid = "new-account";
    view.redraw(); connected(); write("New account draft");
    await act(async () => { resolve(); });
    expect(screen.getByRole("textbox", { name: "Message #general" })).toHaveValue("New account draft");
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });

  it("handles listener errors and reconnects without losing the draft", () => {
    show(); connected(); write();
    act(() => fail(Object.assign(new Error("Denied"), { code: "permission-denied" })));
    expect(screen.getByRole("alert")).toHaveTextContent("Chat access was denied");
    fireEvent.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
    connected();
    expect(screen.getByRole("textbox", { name: "Message #general" })).toHaveValue("Hello community");
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });

  it("supports channel deep links and safe unknown-channel fallback", () => {
    const first = show("/dashboard/community?channel=judges"); connected();
    expect(screen.getByRole("heading", { name: "ask-judges" })).toBeInTheDocument();
    first.unmount();
    show("/dashboard/community?channel=private"); connected();
    expect(screen.getByRole("heading", { name: "general" })).toBeInTheDocument();
  });
});
