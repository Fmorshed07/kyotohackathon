import { useEffect, useMemo, useRef, useState } from "react";
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
import { Activity, Radar } from "lucide-react";
import { DashboardLayout, sectionClass } from "@/components/dashboard/DashboardLayout";
import { JudgeInvitePanel } from "@/components/dashboard/JudgeInvitePanel";
import {
  HostEventBriefEditor,
  type HostEventBriefForm,
} from "@/components/dashboard/HostEventBriefEditor";
import { emptyHostEventBriefForm } from "@/lib/hostEventBriefForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormDraftPersistence } from "@/hooks/useFormDraftPersistence";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { hostEventsToPortalHackathons } from "@/hooks/useHostOpsCatalog";
import {
  fetchHackathonForAdmin,
  getHackathonVisibilityLabel,
  getHostedHackathonUrl,
  hostedToPortalHackathon,
  publishHostEventPublicly,
  setHackathonPublished,
  setHackathonStatus,
  type HostedHackathon,
} from "@/lib/aiHackathons";
import { formDraftStorageKey } from "@/lib/formDrafts";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { type HackathonStatus, type PortalHackathon } from "@/lib/hackathons";
import { buildInviteUrl } from "@/lib/inviteTokens";
import { createJudgeInvite } from "@/lib/portalInvites";
import {
  createTicketCode,
  createTicketQrPayload,
  extractTicketCode,
  formatDateTime,
  getTicketQrImageUrl,
  mapHostEventFromFirestore,
  normalizeFocusAreas,
  parseDatetimeLocal,
  toDatetimeLocalValue,
  type HostEvent,
  type HostEventJudge,
  type HostEventTicket,
} from "@/lib/hostEvents";
import {
  getEventFontPreset,
  getEventLayoutStyle,
  normalizeAccentHex,
} from "@/lib/eventBranding";
import {
  HostEventJudgingWorkspace,
  HostJudgingUnavailableNotice,
} from "@/components/dashboard/HostEventJudgingWorkspace";

const emptyEventForm = emptyHostEventBriefForm;

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
  /** Last existing event the host was editing — used to resume from “New draft”. */
  const [lastEditedEventId, setLastEditedEventId] = useState<string>("");
  const [eventForm, setEventForm] = useState<HostEventBriefForm>(() => emptyEventForm());
  const [ticketForm, setTicketForm] = useState(emptyTicketForm);
  const [judgeForm, setJudgeForm] = useState(emptyJudgeForm);
  const [checkInCode, setCheckInCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [portalJudgeInviteUrl, setPortalJudgeInviteUrl] = useState<string | null>(null);
  const [portalJudgeInviteMessage, setPortalJudgeInviteMessage] = useState<string | null>(null);
  const [isCreatingPortalJudgeInvite, setIsCreatingPortalJudgeInvite] = useState(false);
  const [eventFormBaseline, setEventFormBaseline] = useState<HostEventBriefForm>(() => emptyEventForm());
  const [publicListing, setPublicListing] = useState<HostedHackathon | null>(null);
  const suppressEventFormSyncRef = useRef(false);
  const hostAutosaveTimerRef = useRef<number | null>(null);
  const isHostAutosavingRef = useRef(false);
  const saveSelectedEventRef = useRef<((options?: { quiet?: boolean }) => Promise<void>) | null>(
    null,
  );

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const isNewDraftMode = !selectedEventId;

  const ongoingEditEventId = useMemo(() => {
    if (lastEditedEventId && events.some((event) => event.id === lastEditedEventId)) {
      return lastEditedEventId;
    }
    const sorted = [...events].sort((a, b) =>
      (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || ""),
    );
    return sorted[0]?.id ?? "";
  }, [events, lastEditedEventId]);

  const beginNewDraft = () => {
    if (selectedEventId) setLastEditedEventId(selectedEventId);
    setSelectedEventId("");
    setEventForm(emptyEventForm());
    setEventFormBaseline(emptyEventForm());
    setPublicListing(null);
    setMessage(null);
  };

  const resumeOngoingEdit = () => {
    if (!ongoingEditEventId) return;
    setSelectedEventId(ongoingEditEventId);
    setLastEditedEventId(ongoingEditEventId);
    setMessage(null);
  };

  const eventTickets = useMemo(
    () => tickets.filter((ticket) => ticket.event_id === selectedEventId),
    [selectedEventId, tickets],
  );

  const eventJudges = useMemo(
    () => judges.filter((judge) => judge.event_id === selectedEventId),
    [judges, selectedEventId],
  );

  const hostBoardHackathons = useMemo(
    (): PortalHackathon[] => hostEventsToPortalHackathons(events),
    [events],
  );

  const selectedPortalHackathon = useMemo((): PortalHackathon | null => {
    if (publicListing) return hostedToPortalHackathon(publicListing);
    const publicId = selectedEvent?.public_hackathon_id?.trim();
    if (!publicId) return null;
    return hostBoardHackathons.find((event) => event.id === publicId) ?? null;
  }, [publicListing, selectedEvent?.public_hackathon_id, hostBoardHackathons]);

  useEffect(() => {
    if (!selectedEvent) {
      const blank = emptyEventForm();
      setEventForm(blank);
      setEventFormBaseline(blank);
      setPublicListing(null);
      return;
    }
    if (suppressEventFormSyncRef.current) {
      suppressEventFormSyncRef.current = false;
      return;
    }
    const nextForm: HostEventBriefForm = {
      name: selectedEvent.name,
      tagline: selectedEvent.tagline,
      description: selectedEvent.description,
      theme: selectedEvent.theme,
      format: selectedEvent.format || "Online",
      eligibility: selectedEvent.eligibility || "Open to participants worldwide",
      teamSize: selectedEvent.teamSize || "Solo or teams of 1–4",
      prize: selectedEvent.prize,
      rulebookUrl: selectedEvent.rulebookUrl,
      registrationUrl: selectedEvent.registrationUrl,
      highlightNote: selectedEvent.highlightNote,
      focusAreas: selectedEvent.focusAreas.join(", "),
      schedule: selectedEvent.schedule.length > 0 ? selectedEvent.schedule : [],
      coverImageUrl: selectedEvent.coverImageUrl,
      bannerImageUrl: selectedEvent.bannerImageUrl,
      logoUrl: selectedEvent.logoUrl,
      galleryUrls: selectedEvent.galleryUrls,
      guests: selectedEvent.guests,
      organizerName: selectedEvent.organizerName,
      accentColor: selectedEvent.accentColor || "#00A3FF",
      fontPreset: getEventFontPreset(selectedEvent.fontPreset),
      layoutStyle: getEventLayoutStyle(selectedEvent.layoutStyle),
      startAt: selectedEvent.start_at ? toDatetimeLocalValue(selectedEvent.start_at) : "",
      endAt: selectedEvent.end_at ? toDatetimeLocalValue(selectedEvent.end_at) : "",
      location: selectedEvent.location,
      capacity: String(selectedEvent.capacity || ""),
    };
    setEventForm(nextForm);
    setEventFormBaseline(nextForm);
  }, [selectedEvent]);

  const hostEventDraftKey = formDraftStorageKey([
    "host-event",
    sessionUser?.id,
    selectedEventId || "new",
  ]);

  const {
    isDirty: isHostEventDirty,
    clearDraft: clearHostEventDraft,
    pendingRestore: pendingHostEventRestore,
    consumePendingRestore: consumeHostEventRestore,
  } = useFormDraftPersistence<HostEventBriefForm>({
    storageKey: hostEventDraftKey,
    value: eventForm,
    enabled: Boolean(sessionUser) && !loading,
    baseline: eventFormBaseline,
    debounceMs: 500,
  });

  useUnsavedChangesGuard(isHostEventDirty);

  useEffect(() => {
    if (!pendingHostEventRestore) return;
    setEventForm(pendingHostEventRestore.value as HostEventBriefForm);
    setMessage("Restored unsaved event draft from this browser.");
    consumeHostEventRestore();
  }, [pendingHostEventRestore, consumeHostEventRestore]);

  useEffect(() => {
    const publicId = selectedEvent?.public_hackathon_id?.trim();
    if (!publicId) {
      setPublicListing(null);
      return;
    }
    let cancelled = false;
    const loadPublicListing = async () => {
      try {
        const listing = await fetchHackathonForAdmin(db, publicId);
        if (!cancelled) setPublicListing(listing);
      } catch {
        if (!cancelled) setPublicListing(null);
      }
    };
    void loadPublicListing();
    return () => {
      cancelled = true;
    };
  }, [db, selectedEvent?.public_hackathon_id, selectedEvent?.status, selectedEvent?.updated_at]);

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
          mapHostEventFromFirestore(item.id, item.data() as Record<string, unknown>),
        );
        setEvents(nextEvents);
        setTickets(
          ticketsSnap.docs.map((item) => mapTicket(item.id, item.data() as Record<string, unknown>)),
        );
        setJudges(
          judgesSnap.docs.map((item) => mapJudge(item.id, item.data() as Record<string, unknown>)),
        );
        setSelectedEventId((current) => current || nextEvents[0]?.id || "");
        setLastEditedEventId((current) => current || nextEvents[0]?.id || "");
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

  // Autosave existing host event briefs after a short idle.
  // Must stay above early returns to keep hook order stable.
  useEffect(() => {
    if (!selectedEvent || !isHostEventDirty || isBusy || isHostAutosavingRef.current) return;
    if (!eventForm.name.trim()) return;

    if (hostAutosaveTimerRef.current) {
      window.clearTimeout(hostAutosaveTimerRef.current);
    }

    hostAutosaveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        if (isHostAutosavingRef.current || isBusy) return;
        isHostAutosavingRef.current = true;
        try {
          await saveSelectedEventRef.current?.({ quiet: true });
        } catch {
          // Local draft remains via useFormDraftPersistence.
        } finally {
          isHostAutosavingRef.current = false;
        }
      })();
    }, 2500);

    return () => {
      if (hostAutosaveTimerRef.current) {
        window.clearTimeout(hostAutosaveTimerRef.current);
      }
    };
  }, [selectedEvent?.id, isHostEventDirty, eventForm, isBusy]);

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

  const buildEventFieldsFromForm = () => {
    if (!eventForm.name.trim() || !eventForm.startAt || !eventForm.location.trim()) {
      throw new Error("Event name, start time, and location are required.");
    }
    const start = parseDatetimeLocal(eventForm.startAt);
    if (!start) throw new Error("Start time is invalid.");
    const end = eventForm.endAt ? parseDatetimeLocal(eventForm.endAt) : null;
    if (eventForm.endAt && !end) throw new Error("End time is invalid.");
    if (end && end.getTime() < start.getTime()) {
      throw new Error("End time must be after the start time.");
    }
    return {
      name: eventForm.name.trim(),
      tagline: eventForm.tagline.trim(),
      description: eventForm.description.trim(),
      theme: eventForm.theme.trim(),
      format: eventForm.format.trim(),
      eligibility: eventForm.eligibility.trim(),
      teamSize: eventForm.teamSize.trim(),
      prize: eventForm.prize.trim(),
      rulebookUrl: eventForm.rulebookUrl.trim(),
      registrationUrl: eventForm.registrationUrl.trim(),
      highlightNote: eventForm.highlightNote.trim(),
      focusAreas: normalizeFocusAreas(eventForm.focusAreas),
      schedule: eventForm.schedule
        .map((item) => ({
          time: item.time.trim(),
          title: item.title.trim(),
          description: item.description.trim(),
        }))
        .filter((item) => item.time || item.title || item.description),
      coverImageUrl: eventForm.coverImageUrl.trim(),
      bannerImageUrl: eventForm.bannerImageUrl.trim(),
      logoUrl: eventForm.logoUrl.trim(),
      galleryUrls: eventForm.galleryUrls.map((url) => url.trim()).filter(Boolean),
      guests: eventForm.guests
        .map((guest) => ({
          name: guest.name.trim(),
          role: guest.role.trim(),
          bio: guest.bio.trim(),
          imageUrl: guest.imageUrl.trim(),
        }))
        .filter((guest) => guest.name || guest.imageUrl),
      organizerName: eventForm.organizerName.trim(),
      accentColor: normalizeAccentHex(eventForm.accentColor) || "#00A3FF",
      fontPreset: getEventFontPreset(eventForm.fontPreset),
      layoutStyle: getEventLayoutStyle(eventForm.layoutStyle),
      start_at: start.toISOString(),
      end_at: end ? end.toISOString() : "",
      location: eventForm.location.trim(),
      capacity: Number(eventForm.capacity) || 0,
    };
  };

  const createEvent = async () => {
    setIsBusy(true);
    setMessage(null);
    setPublicListing(null);
    try {
      const fields = buildEventFieldsFromForm();
      const now = new Date().toISOString();
      const payload = {
        owner_id: sessionUser.id,
        ...fields,
        status: "draft" as const,
        public_hackathon_id: null,
        created_at: now,
        updated_at: now,
      };
      const ref = await addDoc(collection(db, "host_events"), payload);
      const created = mapHostEventFromFirestore(ref.id, payload);
      suppressEventFormSyncRef.current = true;
      setEvents((prev) => [created, ...prev]);
      setSelectedEventId(ref.id);
      setEventFormBaseline(eventForm);
      clearHostEventDraft();
      setMessage("Event draft created. Publish it when you are ready for it to appear on /hackathons.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create event.");
    } finally {
      setIsBusy(false);
    }
  };

  const saveSelectedEvent = async (options?: { quiet?: boolean }) => {
    if (!selectedEvent) return;

    if (!options?.quiet) {
      setIsBusy(true);
      setMessage(null);
    }
    try {
      const fields = buildEventFieldsFromForm();
      const updatedAt = new Date().toISOString();
      const patch = { ...fields, updated_at: updatedAt };
      await updateDoc(doc(db, "host_events", selectedEvent.id), patch);
      let nextEvent: HostEvent = { ...selectedEvent, ...patch };

      // Keep the public listing in sync when the event is already live.
      if (selectedEvent.status === "published" && !options?.quiet) {
        const publicEvent = await publishHostEventPublicly(db, nextEvent, sessionUser.id);
        nextEvent = {
          ...nextEvent,
          public_hackathon_id: publicEvent.id,
          status: "published",
        };
        setPublicListing(publicEvent);
        setMessage("Event details saved and public page updated.");
      } else if (!options?.quiet) {
        setMessage("Event details saved.");
      } else {
        setMessage("Event draft autosaved.");
      }

      suppressEventFormSyncRef.current = true;
      setEvents((prev) =>
        prev.map((event) => (event.id === selectedEvent.id ? nextEvent : event)),
      );
      setEventFormBaseline(eventForm);
      clearHostEventDraft();
    } catch (error) {
      if (!options?.quiet) {
        setMessage(error instanceof Error ? error.message : "Unable to save event details.");
      }
    } finally {
      if (!options?.quiet) setIsBusy(false);
    }
  };
  saveSelectedEventRef.current = saveSelectedEvent;

  const publishEvent = async () => {
    if (!selectedEvent) return;
    setIsBusy(true);
    setMessage(null);
    try {
      const fields = buildEventFieldsFromForm();
      const updatedAt = new Date().toISOString();
      await updateDoc(doc(db, "host_events", selectedEvent.id), {
        ...fields,
        updated_at: updatedAt,
      });

      const eventForPublish: HostEvent = {
        ...selectedEvent,
        ...fields,
        updated_at: updatedAt,
      };
      const publicEvent = await publishHostEventPublicly(db, eventForPublish, sessionUser.id);

      setEvents((prev) =>
        prev.map((event) =>
          event.id === selectedEvent.id
            ? {
                ...eventForPublish,
                status: "published",
                public_hackathon_id: publicEvent.id,
                updated_at: new Date().toISOString(),
              }
            : event,
        ),
      );
      setPublicListing(publicEvent);
      setMessage(
        publicEvent.status === "past"
          ? "Past event is published again on the public directory."
          : publicEvent.status === "active"
            ? "Event is live on the public directory."
            : "Event is published on the public directory.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to publish event.");
    } finally {
      setIsBusy(false);
    }
  };

  const setPublicLifecycle = async (status: HackathonStatus) => {
    if (!selectedEvent?.public_hackathon_id) {
      setMessage("Publish the event first, then set it to live, upcoming, or past.");
      return;
    }
    setIsBusy(true);
    setMessage(null);
    try {
      await setHackathonStatus(db, selectedEvent.public_hackathon_id, status);
      if (status === "active") {
        setEvents((prev) =>
          prev.map((event) =>
            event.id === selectedEvent.id
              ? { ...event, status: "published", updated_at: new Date().toISOString() }
              : event,
          ),
        );
      }
      setPublicListing((current) =>
        current
          ? {
              ...current,
              status,
              published: status === "active" ? true : current.published,
            }
          : current,
      );
      setMessage(
        status === "active"
          ? "Event is marked live."
          : status === "past"
            ? "Event is marked past. You can still edit details or unpublish it."
            : "Event is marked upcoming.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update event lifecycle.");
    } finally {
      setIsBusy(false);
    }
  };

  const togglePublicVisibility = async (published: boolean) => {
    if (!selectedEvent?.public_hackathon_id) {
      if (published) {
        await publishEvent();
      }
      return;
    }
    setIsBusy(true);
    setMessage(null);
    try {
      await setHackathonPublished(db, selectedEvent.public_hackathon_id, published);
      setEvents((prev) =>
        prev.map((event) =>
          event.id === selectedEvent.id
            ? {
                ...event,
                status: published ? "published" : "draft",
                updated_at: new Date().toISOString(),
              }
            : event,
        ),
      );
      setPublicListing((current) => (current ? { ...current, published } : current));
      if (published) {
        setMessage("Event is visible on the public directory.");
      } else {
        setMessage("Event hidden from /hackathons. Lifecycle (live/past) is kept for when you publish again.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update visibility.");
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

  const createPortalJudgeInviteLink = async () => {
    if (!sessionUser) return;
    const hackathonId = selectedEvent?.public_hackathon_id;
    if (!hackathonId) {
      setPortalJudgeInviteMessage(
        "Publish this event first so the invite can assign a public hackathon workspace."
      );
      return;
    }
    setIsCreatingPortalJudgeInvite(true);
    setPortalJudgeInviteMessage(null);
    try {
      const invite = await createJudgeInvite(db, {
        createdBy: sessionUser.id,
        createdByEmail: sessionUser.email,
        hackathonIds: [hackathonId],
        label: selectedEvent?.name || "Host judge invite",
      });
      setPortalJudgeInviteUrl(buildInviteUrl("judge", invite.token));
      setPortalJudgeInviteMessage(
        "Portal invite ready — judges open the link, sign in with Google, and land on this event’s judge dashboard."
      );
    } catch (error) {
      setPortalJudgeInviteMessage(
        error instanceof Error ? error.message : "Unable to create portal invite."
      );
    } finally {
      setIsCreatingPortalJudgeInvite(false);
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
    <DashboardLayout
      sessionUser={sessionUser}
      role="host"
      onSignOut={signOut}
      hackathons={hostBoardHackathons}
    >
      <div className="space-y-8">
        <section id="overview" className={`${sectionClass} p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Host portal</p>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                Event operations
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Create events, publish them publicly, screen applicants, run live operations, issue
                QR tickets, manage judges, review submissions, and track judging marks.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {sessionUser.role === "admin" ? (
                <Button asChild variant="outline" size="sm">
                  <Link to="/dashboard/admin">Back to admin</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link to="/dashboard/host/screening">
                  <Radar className="h-4 w-4" />
                  Screening agent
                </Link>
              </Button>
              <Button asChild size="sm" className="gap-1.5">
                <Link to="/dashboard/host/operations">
                  <Activity className="h-4 w-4" />
                  Operations
                </Link>
              </Button>
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
          {selectedEvent?.public_hackathon_id ? (
            <p className="mt-2 text-sm">
              {publicListing?.published ? (
                <>
                  <Link
                    className="underline underline-offset-4"
                    to={getHostedHackathonUrl(selectedEvent.public_hackathon_id)}
                  >
                    Open public event page
                  </Link>
                  <span className="text-muted-foreground"> · also listed on </span>
                  <Link className="underline underline-offset-4" to="/hackathons">
                    /hackathons
                  </Link>
                </>
              ) : (
                <span className="text-muted-foreground">
                  Public page exists but is unpublished
                  {publicListing ? ` (${getHackathonVisibilityLabel(publicListing)})` : ""}.
                </span>
              )}
            </p>
          ) : null}
        </section>

        <section id="event-details" className={`${sectionClass} space-y-5 p-6`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">Event brief</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Edit any draft, live, or past event. Publish or unpublish independently of lifecycle.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={isNewDraftMode ? "default" : "outline"}
                onClick={beginNewDraft}
                disabled={isBusy}
              >
                New draft
              </Button>
              <Button
                type="button"
                variant={isNewDraftMode ? "outline" : "default"}
                onClick={resumeOngoingEdit}
                disabled={isBusy || !ongoingEditEventId}
                title={
                  ongoingEditEventId
                    ? "Continue editing your latest event draft or listing"
                    : "Create an event first to enable ongoing edit"
                }
              >
                Ongoing edit
              </Button>
            </div>
          </div>

          <HostEventBriefEditor
            value={eventForm}
            onChange={setEventForm}
            selectedEventId={selectedEventId}
            eventOptions={events.map((event) => ({
              id: event.id,
              name: event.name,
              status: event.status,
            }))}
            onSelectEvent={(eventId) => {
              if (!eventId) {
                beginNewDraft();
                return;
              }
              setSelectedEventId(eventId);
              setLastEditedEventId(eventId);
            }}
            uploaderId={sessionUser.id}
            disabled={isBusy}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => void (selectedEvent ? saveSelectedEvent() : createEvent())}
              disabled={isBusy}
            >
              {selectedEvent ? "Save event brief" : "Create event draft"}
            </Button>
            {selectedEvent ? (
              <Badge variant={selectedEvent.status === "published" ? "default" : "secondary"}>
                Ops: {selectedEvent.status}
              </Badge>
            ) : null}
            {publicListing ? (
              <Badge variant={publicListing.published ? "default" : "outline"}>
                Public: {getHackathonVisibilityLabel(publicListing)}
              </Badge>
            ) : null}
          </div>

          {selectedEvent ? (
            <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Visibility
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Publish or hide on /hackathons — works for upcoming, live, and past events.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.public_hackathon_id && publicListing?.published ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => void togglePublicVisibility(false)}
                    >
                      Unpublish
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        void (selectedEvent.public_hackathon_id
                          ? togglePublicVisibility(true)
                          : publishEvent())
                      }
                    >
                      {selectedEvent.public_hackathon_id ? "Publish again" : "Publish to public"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="border-t border-white/10 pt-3">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Lifecycle
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedEvent.public_hackathon_id
                    ? "Mark the public listing live, upcoming, or past. Past events stay editable."
                    : "Publish once to unlock live / upcoming / past controls."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={publicListing?.status === "active" && publicListing.published ? "default" : "outline"}
                    disabled={isBusy || !selectedEvent.public_hackathon_id}
                    onClick={() => void setPublicLifecycle("active")}
                  >
                    Go live
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={publicListing?.status === "upcoming" ? "default" : "outline"}
                    disabled={isBusy || !selectedEvent.public_hackathon_id}
                    onClick={() => void setPublicLifecycle("upcoming")}
                  >
                    Upcoming
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={publicListing?.status === "past" ? "default" : "outline"}
                    disabled={isBusy || !selectedEvent.public_hackathon_id}
                    onClick={() => void setPublicLifecycle("past")}
                  >
                    Mark past
                  </Button>
                </div>
              </div>
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
            <p className="mt-1 text-sm text-muted-foreground">
              Keep a contact list and share a portal invite link for direct judge access.
            </p>
          </div>
          {selectedEvent?.public_hackathon_id ? (
            <JudgeInvitePanel
              hackathons={[
                publicListing
                  ? {
                      id: publicListing.id,
                      name: publicListing.name,
                      shortName: publicListing.shortName,
                      eventDate: publicListing.eventDate,
                      location: publicListing.location,
                      theme: publicListing.theme,
                      status: publicListing.status,
                    }
                  : {
                      id: selectedEvent.public_hackathon_id,
                      name: selectedEvent.name || "Hosted event",
                      shortName: selectedEvent.name?.split(/\s+/).slice(0, 2).join(" ") || "Event",
                      eventDate: selectedEvent.start_at
                        ? formatDateTime(selectedEvent.start_at)
                        : "TBC",
                      location: selectedEvent.location || "TBC",
                      theme: selectedEvent.theme || selectedEvent.tagline || "Hosted event",
                      status: publicListing?.status ?? "upcoming",
                    },
              ]}
              selectedHackathonIds={[selectedEvent.public_hackathon_id]}
              onToggleHackathon={() => undefined}
              label={selectedEvent.name}
              onLabelChange={() => undefined}
              inviteUrl={portalJudgeInviteUrl}
              isBusy={isCreatingPortalJudgeInvite}
              message={portalJudgeInviteMessage}
              onGenerate={createPortalJudgeInviteLink}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Publish the event to unlock a judge portal invite link with direct access.
            </p>
          )}
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

        {selectedPortalHackathon ? (
          <HostEventJudgingWorkspace
            hackathon={selectedPortalHackathon}
            onMessage={setMessage}
          />
        ) : (
          <HostJudgingUnavailableNotice />
        )}
      </div>
    </DashboardLayout>
  );
}
