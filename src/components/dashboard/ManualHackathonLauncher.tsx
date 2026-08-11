import { useState } from "react";
import { ExternalLink, FilePenLine, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { GalleryUploadField, ImageUploadField } from "@/components/dashboard/ImageUploadField";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { uploadEventImage } from "@/lib/profileMedia";
import {
  getHostedHackathonUrl,
  type HostedHackathon,
  type ManualHackathonDraft,
} from "@/lib/aiHackathons";

type ManualHackathonLauncherProps = {
  onCreate: (draft: ManualHackathonDraft, rulebookUrl: string) => Promise<HostedHackathon>;
};

type GuestDraft = {
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
};

const emptyGuest = (): GuestDraft => ({ name: "", role: "", bio: "", imageUrl: "" });

const emptyDraft = () => ({
  name: "",
  shortName: "",
  eventDate: "",
  location: "",
  theme: "",
  summary: "",
  format: "Hybrid",
  eligibility: "Open to eligible builders",
  teamSize: "Teams of 1–4",
  prize: "To be confirmed",
  requirements: "",
  schedule: "",
  rulebookUrl: "",
  coverImageUrl: "",
  bannerImageUrl: "",
  galleryUrls: [] as string[],
  guests: [] as GuestDraft[],
  lumaUrl: "",
});

const parseSchedule = (value: string): ManualHackathonDraft["schedule"] =>
  value
    .split("\n")
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts.some(Boolean))
    .map(([time = "", title = "Programme item", description = ""]) => ({ time, title, description }));

export function ManualHackathonLauncher({ onCreate }: ManualHackathonLauncherProps) {
  const { sessionUser } = usePortalAuth();
  const [draft, setDraft] = useState(emptyDraft);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEvent, setCreatedEvent] = useState<HostedHackathon | null>(null);

  const update = (field: keyof ReturnType<typeof emptyDraft>, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const uploadFor = (kind: "cover" | "banner" | "gallery" | "guest") => async (file: File) => {
    if (!sessionUser?.id) throw new Error("Sign in as an admin to upload images.");
    return uploadEventImage(sessionUser.id, file, kind);
  };

  const updateGuest = (index: number, patch: Partial<GuestDraft>) => {
    setDraft((current) => ({
      ...current,
      guests: current.guests.map((guest, i) => (i === index ? { ...guest, ...patch } : guest)),
    }));
  };

  const handleCreate = async () => {
    if (!draft.name.trim() || !draft.eventDate.trim() || !draft.location.trim() || !draft.theme.trim()) {
      setError("Event name, date, location, and theme are required.");
      return;
    }
    setIsCreating(true);
    setError(null);
    setCreatedEvent(null);
    try {
      const event = await onCreate(
        {
          name: draft.name,
          shortName: draft.shortName,
          eventDate: draft.eventDate,
          location: draft.location,
          theme: draft.theme,
          summary: draft.summary,
          format: draft.format,
          eligibility: draft.eligibility,
          teamSize: draft.teamSize,
          prize: draft.prize,
          requirements: draft.requirements.split("\n").map((item) => item.trim()).filter(Boolean),
          schedule: parseSchedule(draft.schedule),
          coverImageUrl: draft.coverImageUrl,
          bannerImageUrl: draft.bannerImageUrl,
          galleryUrls: draft.galleryUrls,
          guests: draft.guests
            .map((guest) => ({
              name: guest.name.trim(),
              role: guest.role.trim(),
              bio: guest.bio.trim(),
              imageUrl: guest.imageUrl.trim(),
            }))
            .filter((guest) => guest.name || guest.imageUrl),
          lumaUrl: draft.lumaUrl,
        },
        draft.rulebookUrl,
      );
      setCreatedEvent(event);
      setDraft(emptyDraft());
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Could not create the hackathon.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className={`${sectionClass} relative overflow-hidden`} id="manual-event-builder">
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex max-w-3xl items-start gap-3">
            <span className="dash-icon-chip" aria-hidden>
              <FilePenLine className="h-4 w-4" />
            </span>
            <div>
              <p className="dash-eyebrow">Manual event builder</p>
              <h2 className="dash-title">Create an event from scratch</h2>
              <p className="dash-subtitle">
                Enter the confirmed details yourself. Upload cover, banner, gallery, and guest photos — the
                event page and a default judging rubric are published immediately.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-community/30 bg-community/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-community">
            Admin only
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Input
            value={draft.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Event name *"
            disabled={isCreating}
          />
          <Input
            value={draft.shortName}
            onChange={(event) => update("shortName", event.target.value)}
            placeholder="Short name"
            disabled={isCreating}
          />
          <Input
            value={draft.eventDate}
            onChange={(event) => update("eventDate", event.target.value)}
            placeholder="Event date *"
            disabled={isCreating}
          />
          <Input
            value={draft.location}
            onChange={(event) => update("location", event.target.value)}
            placeholder="Location or online *"
            disabled={isCreating}
          />
          <Input
            value={draft.theme}
            onChange={(event) => update("theme", event.target.value)}
            placeholder="Theme / challenge *"
            disabled={isCreating}
          />
          <Input
            value={draft.format}
            onChange={(event) => update("format", event.target.value)}
            placeholder="Format"
            disabled={isCreating}
          />
          <Input
            value={draft.eligibility}
            onChange={(event) => update("eligibility", event.target.value)}
            placeholder="Eligibility"
            disabled={isCreating}
          />
          <Input
            value={draft.teamSize}
            onChange={(event) => update("teamSize", event.target.value)}
            placeholder="Team size"
            disabled={isCreating}
          />
          <Input
            value={draft.prize}
            onChange={(event) => update("prize", event.target.value)}
            placeholder="Prize"
            disabled={isCreating}
          />
          <Input
            type="url"
            value={draft.rulebookUrl}
            onChange={(event) => update("rulebookUrl", event.target.value)}
            placeholder="Rulebook link (optional)"
            disabled={isCreating}
          />
          <Input
            type="url"
            value={draft.lumaUrl}
            onChange={(event) => update("lumaUrl", event.target.value)}
            placeholder="Luma or live event URL (optional)"
            disabled={isCreating}
          />
        </div>

        <div className="mt-6 space-y-6 rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5">
          <div>
            <p className="dash-eyebrow">Event visuals</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload images directly — no need to host elsewhere first. Paste URL still works if you already
              have a link.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <ImageUploadField
              label="Cover image"
              value={draft.coverImageUrl}
              onChange={(coverImageUrl) => setDraft((current) => ({ ...current, coverImageUrl }))}
              onUpload={uploadFor("cover")}
              hint="Recommended 1600×900 · used on listings and hero"
              disabled={isCreating}
            />
            <ImageUploadField
              label="Banner image"
              value={draft.bannerImageUrl}
              onChange={(bannerImageUrl) => setDraft((current) => ({ ...current, bannerImageUrl }))}
              onUpload={uploadFor("banner")}
              hint="Optional wide banner · falls back to cover"
              disabled={isCreating}
            />
          </div>
          <GalleryUploadField
            label="Event gallery"
            value={draft.galleryUrls}
            onChange={(galleryUrls) => setDraft((current) => ({ ...current, galleryUrls }))}
            onUpload={uploadFor("gallery")}
            disabled={isCreating}
          />
        </div>

        <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="dash-eyebrow">Guest details</p>
              <h3 className="mt-1 text-base font-semibold text-foreground">Speakers, hosts &amp; guests</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Add names, roles, bios, and photos shown on the public event page.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              disabled={isCreating}
              onClick={() =>
                setDraft((current) => ({ ...current, guests: [...current.guests, emptyGuest()] }))
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add guest
            </Button>
          </div>

          {draft.guests.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-muted-foreground">
              No guests yet. Add speakers, mentors, or special guests with photos.
            </p>
          ) : (
            <div className="space-y-4">
              {draft.guests.map((guest, index) => (
                <div
                  key={`guest-${index}`}
                  className="grid gap-4 rounded-xl border border-white/10 bg-background/30 p-4 sm:grid-cols-[140px_1fr]"
                >
                  <ImageUploadField
                    label="Photo"
                    value={guest.imageUrl}
                    onChange={(imageUrl) => updateGuest(index, { imageUrl })}
                    onUpload={uploadFor("guest")}
                    aspectClassName="aspect-square"
                    hint="Square crop works best"
                    disabled={isCreating}
                  />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        Guest #{index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive"
                        disabled={isCreating}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            guests: current.guests.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input
                      value={guest.name}
                      onChange={(e) => updateGuest(index, { name: e.target.value })}
                      placeholder="Full name"
                      disabled={isCreating}
                    />
                    <Input
                      value={guest.role}
                      onChange={(e) => updateGuest(index, { role: e.target.value })}
                      placeholder="Role / title (e.g. Keynote, Host)"
                      disabled={isCreating}
                    />
                    <Textarea
                      rows={2}
                      value={guest.bio}
                      onChange={(e) => updateGuest(index, { bio: e.target.value })}
                      placeholder="Short bio"
                      disabled={isCreating}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Textarea
          className="mt-4"
          value={draft.summary}
          onChange={(event) => update("summary", event.target.value)}
          placeholder="Event summary"
          rows={3}
          disabled={isCreating}
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Textarea
              value={draft.requirements}
              onChange={(event) => update("requirements", event.target.value)}
              placeholder="Requirements — one per line"
              rows={5}
              disabled={isCreating}
            />
            <p className="mt-1 text-xs text-muted-foreground">One requirement per line.</p>
          </div>
          <div>
            <Textarea
              value={draft.schedule}
              onChange={(event) => update("schedule", event.target.value)}
              placeholder="Schedule — one per line: time | title | description"
              rows={5}
              disabled={isCreating}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Use: <span className="font-mono">09:00 | Registration | Pick up your badge</span>
            </p>
          </div>
        </div>
        <Button type="button" className="mt-5 gap-2" disabled={isCreating} onClick={() => void handleCreate()}>
          <FilePenLine className="h-4 w-4" />
          {isCreating ? "Creating & publishing…" : "Create & publish event"}
        </Button>

        {error ? (
          <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {createdEvent ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-community/35 bg-community/10 px-4 py-3">
            <p className="text-sm text-community">
              <span className="font-semibold">{createdEvent.name}</span> is live.
            </p>
            <a
              href={getHostedHackathonUrl(createdEvent.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-community hover:underline"
            >
              Open live page <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
