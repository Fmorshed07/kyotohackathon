import type { ComponentProps } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommunityChannelManager } from "@/components/community/CommunityChannelManager";
import type { CommunityChannel } from "@/lib/communityChannels";
import type { SessionUser } from "@/types/portal";

const mocks = vi.hoisted(() => ({
  db: {}, uid: "admin-user",
  auth: { sessionUser: null as SessionUser | null, loading: false },
  create: vi.fn(), save: vi.fn(),
}));
vi.mock("@/hooks/usePortalAuth", () => ({ usePortalAuth: () => mocks.auth }));
vi.mock("@/lib/firebaseClient", () => ({
  getFirestoreDb: () => mocks.db,
  getFirebaseAuth: () => ({ currentUser: mocks.uid ? { uid: mocks.uid } : null }),
}));
vi.mock("@/lib/communityChannels", async (original) => ({
  ...await original<typeof import("@/lib/communityChannels")>(),
  createCommunityChannel: mocks.create,
  saveCommunityChannel: mocks.save,
}));

const admin: SessionUser = { id: "admin-user", email: "admin@example.test", role: "admin" };
const channels: CommunityChannel[] = [
  { id: "general", name: "general", title: "Welcome, builders.", description: "Meet the community.", placeholder: "Say hello…", section: "Community", type: "discussion", status: "open", order: 0 },
  { id: "archive", name: "past-event", title: "Past event", description: "Saved history", placeholder: "", section: "Past events", type: "announcement", status: "archived", order: 2 },
];

function show(overrides: Partial<ComponentProps<typeof CommunityChannelManager>> = {}) {
  const props: ComponentProps<typeof CommunityChannelManager> = {
    user: admin, channels, onSelectChannel: vi.fn(), ...overrides,
  };
  const view = render(<CommunityChannelManager {...props} />);
  return { ...view, props, redraw: (next = props) => view.rerender(<CommunityChannelManager {...next} />) };
}
function openManager() {
  fireEvent.click(screen.getByRole("button", { name: "Manage channels" }));
  return screen.getByRole("dialog", { name: "Manage channels" });
}
function input(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.uid = admin.id;
  mocks.auth = { sessionUser: admin, loading: false };
  mocks.create.mockResolvedValue("new-channel-id");
  mocks.save.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe("admin community channel management", () => {
  it.each(["participant", "judge", "mentor", "host"] as const)("hides management from an actual %s even when the user prop claims admin", (role) => {
    mocks.auth.sessionUser = { ...admin, role };
    show();
    expect(screen.queryByRole("button", { name: "Manage channels" })).not.toBeInTheDocument();
  });

  it("requires a loaded admin session matching the supplied account", () => {
    mocks.auth.loading = true;
    const view = show();
    expect(screen.queryByRole("button", { name: "Manage channels" })).not.toBeInTheDocument();
    mocks.auth = { sessionUser: { ...admin, id: "another-admin" }, loading: false };
    view.redraw();
    expect(screen.queryByRole("button", { name: "Manage channels" })).not.toBeInTheDocument();
    mocks.auth.sessionUser = null;
    view.redraw();
    expect(screen.queryByRole("button", { name: "Manage channels" })).not.toBeInTheDocument();
  });

  it("creates a channel with its complete metadata and opens the confirmed result", async () => {
    const { props } = show();
    const dialog = openManager();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("button", { name: "Edit #past-event" })).toHaveTextContent("Past events · announcement · archived");
    input("Name", " event-updates ");
    input("Section", " Hackathons ");
    input("Description", "Official event updates.");
    input("Channel type", "announcement");
    input("Posting status", "closed");
    input("Order (optional)", "5");
    fireEvent.click(screen.getByText("Conversation details"));
    input("Welcome title (optional)", "Important updates");
    input("Message hint (optional)", "Share an update");
    fireEvent.click(screen.getByRole("button", { name: "Create channel" }));

    await waitFor(() => expect(props.onSelectChannel).toHaveBeenCalledExactlyOnceWith("new-channel-id"));
    expect(mocks.create).toHaveBeenCalledExactlyOnceWith(mocks.db, admin, {
      name: "event-updates", section: "Hackathons", title: "Important updates", description: "Official event updates.",
      placeholder: "Share an update", type: "announcement", status: "closed", order: 5,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("edits an existing channel without navigating until Open channel is chosen", async () => {
    const { props } = show();
    openManager();
    fireEvent.click(screen.getByRole("button", { name: "Edit #general" }));
    expect(screen.getByLabelText("Description")).toHaveValue(channels[0].description);
    input("Posting status", "archived");
    input("Channel type", "announcement");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Channel updated.");
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith(mocks.db, admin, { ...channels[0], type: "announcement", status: "archived" });
    expect(props.onSelectChannel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Open channel" }));
    expect(props.onSelectChannel).toHaveBeenCalledExactlyOnceWith("general");
  });

  it("keeps invalid metadata out of persistence and allows correction", async () => {
    show();
    openManager();
    fireEvent.click(screen.getByRole("button", { name: "Create channel" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
    input("Name", "builders");
    input("Order (optional)", "1.5");
    fireEvent.click(screen.getByRole("button", { name: "Create channel" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
    input("Order (optional)", "0");
    fireEvent.click(screen.getByRole("button", { name: "Create channel" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    expect(mocks.create.mock.calls[0][2]).toMatchObject({ name: "builders", title: "Welcome to #builders.", order: 0 });
  });

  it("prevents duplicate saves and competing edits while a create is pending", async () => {
    const pending = deferred<string>();
    mocks.create.mockReturnValueOnce(pending.promise);
    const { props } = show();
    openManager();
    input("Name", "builders");
    const form = screen.getByRole("form", { name: "Create channel" });
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Saving channel…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "New channel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit #general" })).toBeDisabled();
    await act(async () => { pending.resolve("confirmed-channel"); });
    expect(props.onSelectChannel).toHaveBeenCalledExactlyOnceWith("confirmed-channel");
  });

  it("keeps failed edits retryable without losing entered details", async () => {
    mocks.save.mockRejectedValueOnce(new Error("Connection unavailable"));
    show();
    openManager();
    fireEvent.click(screen.getByRole("button", { name: "Edit #general" }));
    input("Description", "Keep this description.");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Connection unavailable");
    expect(screen.getByLabelText("Description")).toHaveValue("Keep this description.");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Channel updated.");
    expect(mocks.save).toHaveBeenCalledTimes(2);
  });

  it.each(["account change", "unmount", "dialog close"])("ignores a create result after %s", async (reason) => {
    const pending = deferred<string>();
    mocks.create.mockReturnValueOnce(pending.promise);
    const view = show();
    openManager();
    input("Name", "builders");
    fireEvent.click(screen.getByRole("button", { name: "Create channel" }));
    if (reason === "account change") {
      mocks.uid = "another-admin";
      mocks.auth.sessionUser = { ...admin, id: mocks.uid };
      view.redraw();
    } else if (reason === "unmount") view.unmount();
    else fireEvent.click(screen.getByRole("button", { name: /^Close$/ }));
    await act(async () => { pending.resolve("old-result"); });
    expect(view.props.onSelectChannel).not.toHaveBeenCalled();
  });

  it("does not open when the parent disables management", () => {
    show({ disabled: true });
    expect(screen.getByRole("button", { name: "Manage channels" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Manage channels" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
