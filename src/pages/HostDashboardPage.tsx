import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { DashboardLayout, sectionClass } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { getFirestoreDb } from "@/lib/firebaseClient";
import {
  createTicketCode,
  createTicketQrPayload,
  extractTicketCode,
  formatDateTime,
  getTicketQrImageUrl,
  type HostEvent,
  type HostEventJudge,
  type HostEventTicket,
} from "@/lib/hostEvents";

const emptyEventForm = {
  name: "",
  description: "",
  startAt: "",
  endAt: "",
  location: "",
  capacity: "100",
};

const emptyTicketForm = {
  attendeeName: "",
  attendeeEmail: "",
  ticketType: "General",
};

const emptyJudgeForm = {
  name: "",
  email: "",
  organization: "",
  expertise: "",
};

const mapEvent = (id: string, data: Record<string, unknown>): HostEvent => ({
  id,
  owner_id: typeof data.owner_id === "string" ? data.owner_id : "",
  name: typeof data.name === "string" ? data.name : "",
  description: typeof data.description === "string" ? data.description : "",
  start_at: typeof data.start_at === "string" ? data.start_at : "",
  end_at: typeof data.end_at === "string" ? data.end_at : "",
  location: typeof data.location === "string" ? data.location : "",
  capacity: typeof data.capacity === "number" ? data.capacity : Number(data.capacity) || 0,
  status:
    data.status === "published" || data.status === "closed" || data.status === "draft"
      ? data.status
      : "draft",
  created_at: typeof data.created_at === "string" ? data.created_at : "",
  updated_at: typeof data.updated_at === "string" ? data.updated_at : "",
});

const mapTicket = (id: string, data: Record<string, unknown>): HostEventTicket => ({
  id,
  host_id: typeof data.host_id === "string" ? data.host_id : "",
  event_id: typeof data.event_id === "string" ? data.event_id : "",
  attendee_name: typeof data.attendee_name === "string" ? data.attendee_name : "",
  attendee_email: typeof data.attendee_email === "string" ? data.attendee_email : "",
  ticket_type: typeof data.ticket_type === "string" ? data.ticket_type : "General",
  ticket_code: typeof data.ticket_code === "string" ? data.ticket_code : "",
  qr_payload: typeof data.qr_payload === "string" ? data.qr_payload : "",
  status:
    data.status === "checked_in" || data.status === "cancelled" || data.status === "issued"
      ? data.status
      : "issued",
  created_at: typeof data.created_at === "string" ? data.created_at : "",
  checked_in_at: typeof data.checked_in_at === "string" ? data.checked_in_at : null,
});

const mapJudge = (id: string, data: Record<string, unknown>): HostEventJudge => ({
  id,
  host_id: typeof data.host_id === "string" ? data.host_id : "",
  event_id: typeof data.event_id === "string" ? data.event_id : "",
  name: typeof data.name === "string" ? data.name : "",
  email: typeof data.email === "string" ? data.email : "",
  organization: typeof data.organization === "string" ? data.organization : "",
  expertise: typeof data.expertise === "string" ? data.expertise : "",
  status: data.status === "confirmed" ? "confirmed" : "invited",
  created_at: typeof data.created_at === "string" ? data.created_at : "",
});

export default function HostDashboardPage() {
  const { sessionUser, loading, signOut } = usePortalAuth();
  const db = getFirestoreDb();

  const [events, setEvents] = useState<HostEvent[]>([]);
  const [tickets, setTickets] = useState<HostEventTicket[]>([]);
  const [judges, setJudges] = useState<HostEventJudge[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [ticketForm, setTicketForm] = useState(emptyTicketForm);
  const [judgeForm, setJudgeForm] = useState(emptyJudgeForm);
  const [checkInCode, setCheckInCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const eventTickets = useMemo(
    () => tickets.filter((ticket) => ticket.event_id === selectedEventId),
    [selectedEventId, tickets],
  );

  const eventJudges = useMemo(
    () => judges.filter((judge) => judge.event_id === selectedEventId),
    [judges, selectedEventId],
  );

  useEffect(() => {
    if (!selectedEvent) return;
    setEventForm({
      name: selectedEvent.name,
      description: selectedEvent.description,
      startAt: selectedEvent.start_at ? selectedEvent.start_at.slice(0, 16) : "",
      endAt: selectedEvent.end_at ? selectedEvent.end_at.slice(0, 16) : "",
      location: selectedEvent.location,
      capacity: String(selectedEvent.capacity || ""),
    });
  }, [selectedEvent]);

  useEffect(() => {
    if (!sessionUser) return;
    const isAdmin = sessionUser.role === "admin";
    const isApprovedHost =
      sessionUser.role === "host" && sessionUser.hostApprovalStatus === "approved";
    if (!isAdmin && !isApprovedHost) return;

    const load = async () => {
      setIsBusy(true);
      setMessage(null);
      try {
        const [eventsSnap, ticketsSnap, judgesSnap] = await Promise.all(
          isAdmin
            ? [
                getDocs(collection(db, "host_events")),
                getDocs(collection(db, "host_tickets")),
                getDocs(collection(db, "host_judges")),
              ]
            : [
                getDocs(query(collection(db, "host_events"), where("owner_id", "==", sessionUser.id))),
                getDocs(query(collection(db, "host_tickets"), where("host_id", "==", sessionUser.id))),
                getDocs(query(collection(db, "host_judges"), where("host_id", "==", sessionUser.id))),
              ],
        );

        const nextEvents = eventsSnap.docs.map((item) =>
          mapEvent(item.id, item.data() as Record<string, unknown>),
        );
        setEvents(nextEvents);
        setTickets(
          ticketsSnap.docs.map((item) => mapTicket(item.id, item.data() as Record<string, unknown>)),
        );
        setJudges(
          judgesSnap.docs.map((item) => mapJudge(item.id, item.data() as Record<string, unknown>)),
        );
        setSelectedEventId((current) => current || nextEvents[0]?.id || "");
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Unable to load host dashboard data.",
        );
      } finally {
        setIsBusy(false);
      }
    };

    void load();
  }, [db, sessionUser]);

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!sessionUser) return <Navigate to="/host/signin" replace />;
  if (sessionUser.role !== "host" && sessionUser.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (sessionUser.role === "host" && sessionUser.hostApprovalStatus !== "approved") {
    return (
      <DashboardLayout sessionUser={sessionUser} role="host" onSignOut={signOut}>
        <section id="overview" className={`${sectionClass} mx-auto max-w-2xl p-8 text-center`}>
          <Badge variant="secondary" className="uppercase tracking-[0.14em]">Approval pending</Badge>
          <h1 className="mt-4 font-display text-2xl font-semibold">Your host workspace is waiting for approval.</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            An admin must approve your host request before you can create events, issue QR tickets, invite judges, or run attendee check-in.
          </p>
        </section>
      </DashboardLayout>
    );
  }

  const createEvent = async () => {
    if (!eventForm.name.trim() || !eventForm.startAt || !eventForm.location.trim()) {
      setMessage("Event name, start time, and location are required.");
      return;
    }

    setIsBusy(true);
    setMessage(null);
    try {
      const now = new Date().toISOString();
      const payload = {
        owner_id: sessionUser.id,
        name: eventForm.name.trim(),
        description: eventForm.description.trim(),
        start_at: eventForm.startAt ? new Date(eventForm.startAt).toISOString() : "",
        end_at: eventForm.endAt ? new Date(eventForm.endAt).toISOString() : "",
        location: eventForm.location.trim(),
        capacity: Number(eventForm.capacity) || 0,
        status: "draft" as const,
        created_at: now,
        updated_at: now,
      };
      const ref = await addDoc(collection(db, "host_events"), payload);
      const created = mapEvent(ref.id, payload);
      setEvents((prev) => [created, ...prev]);
      setSelectedEventId(ref.id);
      setEventForm(emptyEventForm);
      setMessage("Event draft created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create event.");
    } finally {
      setIsBusy(false);
    }
  };

  const saveSelectedEvent = async () => {
    if (!selectedEvent) return;
    if (!eventForm.name.trim() || !eventForm.startAt || !eventForm.location.trim()) {
      setMessage("Event name, start time, and location are required.");
      return;
    }

    setIsBusy(true);
    try {
      const updatedAt = new Date().toISOString();
      const patch = {
        name: eventForm.name.trim(),
        description: eventForm.description.trim(),
        start_at: new Date(eventForm.startAt).toISOString(),
        end_at: eventForm.endAt ? new Date(eventForm.endAt).toISOString() : "",
        location: eventForm.location.trim(),
        capacity: Number(eventForm.capacity) || 0,
        updated_at: updatedAt,
      };
      await updateDoc(doc(db, "host_events", selectedEvent.id), patch);
      setEvents((prev) => prev.map((event) => event.id === selectedEvent.id ? { ...event, ...patch } : event));
      setMessage("Event details saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save event details.");
    } finally {
      setIsBusy(false);
    }
  };

  const publishEvent = async () => {
    if (!selectedEvent) return;
    setIsBusy(true);
    try {
      const updatedAt = new Date().toISOString();
      await updateDoc(doc(db, "host_events", selectedEvent.id), {
        status: "published",
        updated_at: updatedAt,
      });
      setEvents((prev) =>
        prev.map((event) =>
          event.id === selectedEvent.id
            ? { ...event, status: "published", updated_at: updatedAt }
            : event,
        ),
      );
      setMessage("Event published.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to publish event.");
    } finally {
      setIsBusy(false);
    }
  };

  const issueTicket = async () => {
    if (!selectedEvent) {
      setMessage("Select or create an event first.");
      return;
    }
    if (!ticketForm.attendeeName.trim() || !ticketForm.attendeeEmail.trim()) {
      setMessage("Attendee name and email are required.");
      return;
    }
    const activeTickets = eventTickets.filter(
      (ticket) => ticket.status === "issued" || ticket.status === "checked_in",
    ).length;
    if (selectedEvent.capacity > 0 && activeTickets >= selectedEvent.capacity) {
      setMessage("This event is at capacity. Increase capacity before issuing another ticket.");
      return;
    }

    setIsBusy(true);
    try {
      const ticketCode = createTicketCode();
      const qrPayload = createTicketQrPayload(selectedEvent.id, ticketCode);
      const payload = {
        host_id: sessionUser.id,
        event_id: selectedEvent.id,
        attendee_name: ticketForm.attendeeName.trim(),
        attendee_email: ticketForm.attendeeEmail.trim().toLowerCase(),
        ticket_type: ticketForm.ticketType.trim() || "General",
        ticket_code: ticketCode,
        qr_payload: qrPayload,
        status: "issued" as const,
        created_at: new Date().toISOString(),
        checked_in_at: null,
      };
      const ref = await addDoc(collection(db, "host_tickets"), payload);
      setTickets((prev) => [mapTicket(ref.id, payload), ...prev]);
      setTicketForm(emptyTicketForm);
      setMessage(`Ticket issued: ${ticketCode}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to issue ticket.");
    } finally {
      setIsBusy(false);
    }
  };

  const checkInTicket = async () => {
    const code = extractTicketCode(checkInCode);
    if (!code) {
      setMessage("Enter a ticket code or scan payload.");
      return;
    }

    const ticket = tickets.find(
      (item) => item.ticket_code === code && (!selectedEventId || item.event_id === selectedEventId),
    );
    if (!ticket) {
      setMessage("Ticket not found for this host.");
      return;
    }
    if (ticket.status === "checked_in") {
      setMessage(`Already checked in: ${ticket.attendee_name}`);
      return;
    }

    setIsBusy(true);
    try {
      const checkedInAt = new Date().toISOString();
      await updateDoc(doc(db, "host_tickets", ticket.id), {
        status: "checked_in",
        checked_in_at: checkedInAt,
      });
      setTickets((prev) =>
        prev.map((item) =>
          item.id === ticket.id
            ? { ...item, status: "checked_in", checked_in_at: checkedInAt }
            : item,
        ),
      );
      setCheckInCode("");
      setMessage(`Checked in ${ticket.attendee_name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to check in ticket.");
    } finally {
      setIsBusy(false);
    }
  };

  const inviteJudge = async () => {
    if (!selectedEvent) {
      setMessage("Select or create an event first.");
      return;
    }
    if (!judgeForm.name.trim() || !judgeForm.email.trim()) {
      setMessage("Judge name and email are required.");
      return;
    }

    setIsBusy(true);
    try {
      const payload = {
        host_id: sessionUser.id,
        event_id: selectedEvent.id,
        name: judgeForm.name.trim(),
        email: judgeForm.email.trim().toLowerCase(),
        organization: judgeForm.organization.trim(),
        expertise: judgeForm.expertise.trim(),
        status: "invited" as const,
        created_at: new Date().toISOString(),
      };
      const ref = await addDoc(collection(db, "host_judges"), payload);
      setJudges((prev) => [mapJudge(ref.id, payload), ...prev]);
      setJudgeForm(emptyJudgeForm);
      setMessage("Judge invited.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to invite judge.");
    } finally {
      setIsBusy(false);
    }
  };

  const confirmJudge = async (judge: HostEventJudge) => {
    setIsBusy(true);
    try {
      await updateDoc(doc(db, "host_judges", judge.id), { status: "confirmed" });
      setJudges((prev) => prev.map((item) => item.id === judge.id ? { ...item, status: "confirmed" } : item));
      setMessage(`${judge.name} is confirmed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update judge status.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <DashboardLayout sessionUser={sessionUser} role="host" onSignOut={signOut}>
      <div className="space-y-8">
        <section className={`${sectionClass} p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Host portal</p>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                Event operations
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Create events, issue QR tickets, run check-in, and manage judges.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {sessionUser.role === "admin" ? (
                <Button asChild variant="outline" size="sm">
                  <Link to="/dashboard/admin">Back to admin</Link>
                </Button>
              ) : null}
              <Badge variant="outline" className="uppercase tracking-[0.14em]">
                {sessionUser.role === "admin"
                  ? "Admin"
                  : sessionUser.hostApprovalStatus === "approved"
                    ? "Approved"
                    : "Pending approval"}
              </Badge>
            </div>
          </div>
          {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
        </section>

        <section id="event-details" className={`${sectionClass} space-y-5 p-6`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">Event details</h2>
              <p className="mt-1 text-sm text-muted-foreground">Create, update, and publish your hosted event.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedEvent ? (
                <Button type="button" variant="outline" onClick={() => void publishEvent()} disabled={isBusy || selectedEvent.status === "published"}>
                  Publish selected
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => { setSelectedEventId(""); setEventForm(emptyEventForm); }} disabled={isBusy}>
                New draft
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Event name"
              value={eventForm.name}
              onChange={(event) => setEventForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              placeholder="Location"
              value={eventForm.location}
              onChange={(event) => setEventForm((prev) => ({ ...prev, location: event.target.value }))}
            />
            <Input
              type="datetime-local"
              value={eventForm.startAt}
              onChange={(event) => setEventForm((prev) => ({ ...prev, startAt: event.target.value }))}
            />
            <Input
              type="datetime-local"
              value={eventForm.endAt}
              onChange={(event) => setEventForm((prev) => ({ ...prev, endAt: event.target.value }))}
            />
            <Input
              type="number"
              min={1}
              placeholder="Capacity"
              value={eventForm.capacity}
              onChange={(event) => setEventForm((prev) => ({ ...prev, capacity: event.target.value }))}
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedEventId}
              onChange={(event) => {
                setSelectedEventId(event.target.value);
                if (!event.target.value) setEventForm(emptyEventForm);
              }}
            >
              <option value="">Select event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} ({event.status})
                </option>
              ))}
            </select>
          </div>
          <Textarea
            placeholder="Short description"
            value={eventForm.description}
            onChange={(event) => setEventForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          <Button type="button" onClick={() => void (selectedEvent ? saveSelectedEvent() : createEvent())} disabled={isBusy}>
            {selectedEvent ? "Save event details" : "Create event draft"}
          </Button>

          {selectedEvent ? (
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4 text-sm">
              <p className="font-medium">{selectedEvent.name}</p>
              <p className="mt-1 text-muted-foreground">{selectedEvent.description || "No description"}</p>
              <p className="mt-2 text-muted-foreground">
                {formatDateTime(selectedEvent.start_at)} → {formatDateTime(selectedEvent.end_at)}
              </p>
              <p className="mt-1 text-muted-foreground">
                {selectedEvent.location || "Location TBD"} · Capacity {selectedEvent.capacity}
              </p>
            </div>
          ) : null}
        </section>

        <section id="tickets" className={`${sectionClass} space-y-5 p-6`}>
          <div>
            <h2 className="font-display text-xl font-semibold">Tickets & QR</h2>
            <p className="mt-1 text-sm text-muted-foreground">Issue attendee tickets with QR payloads.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              placeholder="Attendee name"
              value={ticketForm.attendeeName}
              onChange={(event) =>
                setTicketForm((prev) => ({ ...prev, attendeeName: event.target.value }))
              }
            />
            <Input
              type="email"
              placeholder="Attendee email"
              value={ticketForm.attendeeEmail}
              onChange={(event) =>
                setTicketForm((prev) => ({ ...prev, attendeeEmail: event.target.value }))
              }
            />
            <Input
              placeholder="Ticket type"
              value={ticketForm.ticketType}
              onChange={(event) =>
                setTicketForm((prev) => ({ ...prev, ticketType: event.target.value }))
              }
            />
          </div>
          <Button type="button" onClick={() => void issueTicket()} disabled={isBusy || !selectedEvent}>
            Issue ticket
          </Button>

          <div className="space-y-3">
            {eventTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex flex-col gap-3 rounded-lg border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{ticket.attendee_name}</p>
                  <p className="text-sm text-muted-foreground">{ticket.attendee_email}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {ticket.ticket_code} · {ticket.status}
                  </p>
                </div>
                <img
                  src={getTicketQrImageUrl(ticket.qr_payload)}
                  alt={`QR for ${ticket.ticket_code}`}
                  className="h-24 w-24 rounded-md border border-border bg-white p-1"
                />
              </div>
            ))}
            {eventTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tickets issued for this event yet.</p>
            ) : null}
          </div>
        </section>

        <section id="check-in" className={`${sectionClass} space-y-5 p-6`}>
          <div>
            <h2 className="font-display text-xl font-semibold">Check-in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter a ticket code or paste a scanned QR payload.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="CGN-XXXX or QR payload"
              value={checkInCode}
              onChange={(event) => setCheckInCode(event.target.value)}
            />
            <Button type="button" onClick={() => void checkInTicket()} disabled={isBusy}>
              Check in
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Checked in: {eventTickets.filter((ticket) => ticket.status === "checked_in").length} /{" "}
            {eventTickets.length}
          </p>
        </section>

        <section id="judges" className={`${sectionClass} space-y-5 p-6`}>
          <div>
            <h2 className="font-display text-xl font-semibold">Judges</h2>
            <p className="mt-1 text-sm text-muted-foreground">Invite judges for the selected event.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Judge name"
              value={judgeForm.name}
              onChange={(event) => setJudgeForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              type="email"
              placeholder="Judge email"
              value={judgeForm.email}
              onChange={(event) => setJudgeForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <Input
              placeholder="Organization"
              value={judgeForm.organization}
              onChange={(event) =>
                setJudgeForm((prev) => ({ ...prev, organization: event.target.value }))
              }
            />
            <Input
              placeholder="Expertise"
              value={judgeForm.expertise}
              onChange={(event) =>
                setJudgeForm((prev) => ({ ...prev, expertise: event.target.value }))
              }
            />
          </div>
          <Button type="button" onClick={() => void inviteJudge()} disabled={isBusy || !selectedEvent}>
            Invite judge
          </Button>
          <div className="space-y-2">
            {eventJudges.map((judge) => (
              <div key={judge.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-3 text-sm">
                <p className="font-medium">{judge.name}</p>
                <p className="text-muted-foreground">
                  {judge.email} · {judge.status}
                </p>
                {judge.status === "invited" ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => void confirmJudge(judge)} disabled={isBusy}>
                    Mark confirmed
                  </Button>
                ) : null}
              </div>
            ))}
            {eventJudges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No judges invited yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
