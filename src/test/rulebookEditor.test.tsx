import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventManagementWorkspace } from "@/components/dashboard/EventManagementWorkspace";
import { HostEventBriefEditor } from "@/components/dashboard/HostEventBriefEditor";
import { portalHackathonAsHosted } from "@/lib/aiHackathons";
import { PORTAL_HACKATHONS } from "@/lib/hackathons";
import { emptyHostEventBriefForm } from "@/lib/hostEventBriefForm";
import { RULEBOOK_URL_ERROR } from "@/lib/rulebook";

vi.mock("@/components/dashboard/ImageUploadField", () => ({ ImageUploadField: () => null, GalleryUploadField: () => null }));
vi.mock("@/components/dashboard/EventTemplateGallery", () => ({ EventTemplateGallery: () => null }));

afterEach(cleanup);

function showListing() {
  const onSaveEvent = vi.fn().mockResolvedValue(undefined);
  const event = { ...portalHackathonAsHosted(PORTAL_HACKATHONS[0]), rulebookUrl: "https://example.test/old.pdf" };
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <EventManagementWorkspace
        events={[event]} hostEvents={[]} onPublish={vi.fn()} onUnpublish={vi.fn()}
        onSetStatus={vi.fn()} onSetSubmissionMode={vi.fn()} onSaveEvent={onSaveEvent}
        onDeleteEvent={vi.fn()} onPublishHostEvent={vi.fn()} onUnpublishHostEvent={vi.fn()}
      />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: /^Edit$/ }));
  return { onSaveEvent, event };
}

describe("rule book URL editors", () => {
  it("labels the existing admin field, explains where it appears, and blocks invalid saves until corrected", async () => {
    const { onSaveEvent, event } = showListing();
    const field = screen.getByRole("textbox", { name: "Rule book URL (optional)" });
    expect(field).toHaveValue(event.rulebookUrl);
    expect(field).toHaveAccessibleDescription(/Appears in Resources and on the event page/);
    fireEvent.change(field, { target: { value: "javascript:alert(1)" } });
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(RULEBOOK_URL_ERROR);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSaveEvent).not.toHaveBeenCalled();

    fireEvent.change(field, { target: { value: " /documents/new-rules.pdf " } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(onSaveEvent).toHaveBeenCalledWith(event.id, expect.objectContaining({ rulebookUrl: "/documents/new-rules.pdf" })));
  });

  it("allows clearing an existing rule book URL", async () => {
    const { onSaveEvent, event } = showListing();
    fireEvent.change(screen.getByRole("textbox", { name: "Rule book URL (optional)" }), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(onSaveEvent).toHaveBeenCalledWith(event.id, expect.objectContaining({ rulebookUrl: "" })));
  });

  it("shows an accessible URL error in the host editor while keeping its existing rule book field editable", () => {
    render(<HostEventBriefEditor value={{ ...emptyHostEventBriefForm(), rulebookUrl: "not a URL" }}
      onChange={vi.fn()} selectedEventId="host-event" eventOptions={[]} onSelectEvent={vi.fn()} />);
    const field = screen.getByRole("textbox", { name: /Rule book URL \(optional\)/ });
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(/Appears in Resources.*Enter a rule book URL/);
    expect(screen.getByRole("alert")).toHaveTextContent(RULEBOOK_URL_ERROR);
  });
});
