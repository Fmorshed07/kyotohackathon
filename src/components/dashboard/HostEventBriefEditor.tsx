import { CalendarDays, MapPin, Plus, Sparkles, Trash2, Users } from "lucide-react";
import { EventTemplateGallery } from "@/components/dashboard/EventTemplateGallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EventRichText } from "@/components/EventRichText";
import { GalleryUploadField, ImageUploadField } from "@/components/dashboard/ImageUploadField";
import {
  buildHostEventSummary,
  emptyHostGuest,
  emptyHostScheduleItem,
  formatDateTime,
  type HostEventGuest,
  type HostEventScheduleItem,
} from "@/lib/hostEvents";
import {
  EVENT_ACCENT_PRESETS,
  EVENT_FONT_PRESETS,
  EVENT_LAYOUT_STYLES,
  buildEventThemeStyle,
  getEventFontPreset,
  getEventLayoutStyle,
  normalizeAccentHex,
} from "@/lib/eventBranding";
import { getEventTemplate } from "@/lib/eventTemplates";
import {
  type HostEventBriefForm,
} from "@/lib/hostEventBriefForm";
import { uploadEventImage } from "@/lib/profileMedia";
import { cn } from "@/lib/utils";

export type { HostEventBriefForm } from "@/lib/hostEventBriefForm";

/** @deprecated Prefer EventTemplateGallery + EVENT_TEMPLATES */
export const ideathon2026Template = (): HostEventBriefForm =>
  getEventTemplate("ai-ideathon")?.apply() ?? {
    name: "AI Ideathon 2026",
    tagline: "Build AI Solutions That Solve Real World Problems",
    description: "",
    theme: "AI for Real World Impact",
    format: "Online · 3 days",
    eligibility: "Open to participants worldwide",
    teamSize: "Solo or teams of 1–4",
    prize: "Mentorship, exposure, and community recognition",
    rulebookUrl: "",
    registrationUrl: "",
    highlightNote: "",
    focusAreas: "",
    schedule: [],
    coverImageUrl: "",
    bannerImageUrl: "",
    logoUrl: "",
    galleryUrls: [],
    guests: [],
    organizerName: "",
    accentColor: "#00A3FF",
    fontPreset: "signal",
    layoutStyle: "stage",
    startAt: "",
    endAt: "",
    location: "Online",
    capacity: "200",
  };

type HostEventBriefEditorProps = {
  value: HostEventBriefForm;
  onChange: (next: HostEventBriefForm) => void;
  selectedEventId: string;
  eventOptions: Array<{ id: string; name: string; status: string }>;
  onSelectEvent: (eventId: string) => void;
  uploaderId?: string;
  disabled?: boolean;
};

const fieldLabel = "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

export function HostEventBriefEditor({
  value,
  onChange,
  selectedEventId,
  eventOptions,
  onSelectEvent,
  uploaderId,
  disabled,
}: HostEventBriefEditorProps) {
  const patch = (partial: Partial<HostEventBriefForm>) => onChange({ ...value, ...partial });

  const updateScheduleItem = (index: number, partial: Partial<HostEventScheduleItem>) => {
    patch({
      schedule: value.schedule.map((item, i) => (i === index ? { ...item, ...partial } : item)),
    });
  };

  const updateGuest = (index: number, partial: Partial<HostEventGuest>) => {
    patch({
      guests: value.guests.map((guest, i) => (i === index ? { ...guest, ...partial } : guest)),
    });
  };

  const uploadFor = (kind: "cover" | "banner" | "gallery" | "guest" | "logo") => async (file: File) => {
    if (!uploaderId) throw new Error("Sign in to upload event images.");
    return uploadEventImage(uploaderId, file, kind);
  };

  const previewSummary = buildHostEventSummary({
    name: value.name,
    tagline: value.tagline,
    description: value.description,
    highlightNote: value.highlightNote,
    theme: value.theme,
    focusAreas: value.focusAreas
      .split(/[,|\n]/)
      .map((item) => item.trim())
      .filter(Boolean),
  });

  const previewStart = value.startAt ? formatDateTime(new Date(value.startAt).toISOString()) : "Date TBC";
  const previewEnd = value.endAt ? formatDateTime(new Date(value.endAt).toISOString()) : null;
  const themeStyle = buildEventThemeStyle({
    accentHex: value.accentColor,
    fontPreset: value.fontPreset,
  });
  const heroImage = value.bannerImageUrl || value.coverImageUrl;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
      <div className="space-y-6">
        <EventTemplateGallery
          disabled={disabled}
          onApply={(template) => {
            const next = template.apply();
            onChange({
              ...next,
              // Keep current dates/media if the host already filled them.
              startAt: value.startAt || next.startAt,
              endAt: value.endAt || next.endAt,
              coverImageUrl: value.coverImageUrl || next.coverImageUrl,
              bannerImageUrl: value.bannerImageUrl || next.bannerImageUrl,
              logoUrl: value.logoUrl || next.logoUrl,
              galleryUrls: value.galleryUrls.length > 0 ? value.galleryUrls : next.galleryUrls,
              guests: value.guests.length > 0 ? value.guests : next.guests,
              organizerName: value.organizerName || next.organizerName,
              registrationUrl: value.registrationUrl || next.registrationUrl,
            });
          }}
        />

        <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
          <div>
            <p className={fieldLabel}>Identity & look</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Make this event feel like yours — logo, accent, typography, and page layout.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className={fieldLabel}>Organiser name</span>
              <Input
                placeholder="Your community or company"
                value={value.organizerName}
                disabled={disabled}
                onChange={(event) => patch({ organizerName: event.target.value })}
              />
            </label>
            <label className="space-y-1.5">
              <span className={fieldLabel}>Custom accent hex</span>
              <Input
                placeholder="#00A3FF"
                value={value.accentColor}
                disabled={disabled}
                onChange={(event) =>
                  patch({ accentColor: normalizeAccentHex(event.target.value) || event.target.value })
                }
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {EVENT_ACCENT_PRESETS.map((accent) => (
              <button
                key={accent.id}
                type="button"
                disabled={disabled}
                onClick={() => patch({ accentColor: accent.hex })}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition",
                  normalizeAccentHex(value.accentColor) === accent.hex
                    ? "border-white/40 bg-white/10 text-foreground"
                    : "border-white/10 text-muted-foreground hover:border-white/25 hover:text-foreground",
                )}
              >
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: accent.hex }} />
                {accent.label}
              </button>
            ))}
          </div>
          <div>
            <p className={fieldLabel}>Typography</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {EVENT_FONT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => patch({ fontPreset: preset.id })}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition",
                    value.fontPreset === preset.id
                      ? "border-primary/50 bg-primary/10"
                      : "border-white/10 bg-black/20 hover:border-white/25",
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{preset.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {preset.display} · {preset.body}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/80">{preset.note}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className={fieldLabel}>Page layout</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {EVENT_LAYOUT_STYLES.map((layout) => (
                <button
                  key={layout.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => patch({ layoutStyle: layout.id })}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition",
                    value.layoutStyle === layout.id
                      ? "border-primary/50 bg-primary/10"
                      : "border-white/10 bg-black/20 hover:border-white/25",
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{layout.label}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{layout.note}</p>
                </button>
              ))}
            </div>
          </div>
          <ImageUploadField
            label="Organiser logo"
            value={value.logoUrl}
            onChange={(logoUrl) => patch({ logoUrl })}
            onUpload={uploadFor("logo")}
            hint="Square mark works best"
            aspectClassName="aspect-square"
            disabled={disabled || !uploaderId}
          />
        </div>

        <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
          <div>
            <p className={fieldLabel}>Visuals</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cover and banner drive the public hero. Gallery and guests make the page feel alive.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <ImageUploadField
              label="Cover image"
              value={value.coverImageUrl}
              onChange={(coverImageUrl) => patch({ coverImageUrl })}
              onUpload={uploadFor("cover")}
              hint="1600×900 recommended"
              disabled={disabled || !uploaderId}
            />
            <ImageUploadField
              label="Banner image"
              value={value.bannerImageUrl}
              onChange={(bannerImageUrl) => patch({ bannerImageUrl })}
              onUpload={uploadFor("banner")}
              hint="Wide hero · falls back to cover"
              disabled={disabled || !uploaderId}
            />
          </div>
          <GalleryUploadField
            label="Event gallery"
            value={value.galleryUrls}
            onChange={(galleryUrls) => patch({ galleryUrls })}
            onUpload={uploadFor("gallery")}
            disabled={disabled || !uploaderId}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 sm:col-span-2">
            <span className={fieldLabel}>Event name</span>
            <Input
              placeholder="AI Ideathon 2026"
              value={value.name}
              disabled={disabled}
              onChange={(event) => patch({ name: event.target.value })}
            />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className={fieldLabel}>Tagline</span>
            <Input
              placeholder="Build AI solutions that solve real-world problems"
              value={value.tagline}
              disabled={disabled}
              onChange={(event) => patch({ tagline: event.target.value })}
            />
          </label>
          <label className="space-y-1.5">
            <span className={fieldLabel}>Location / platform</span>
            <Input
              placeholder="Online · Zoom"
              value={value.location}
              disabled={disabled}
              onChange={(event) => patch({ location: event.target.value })}
            />
          </label>
          <label className="space-y-1.5">
            <span className={fieldLabel}>Capacity</span>
            <Input
              type="number"
              min={1}
              placeholder="100"
              value={value.capacity}
              disabled={disabled}
              onChange={(event) => patch({ capacity: event.target.value })}
            />
          </label>
          <label className="space-y-1.5">
            <span className={fieldLabel}>Starts</span>
            <Input
              type="datetime-local"
              value={value.startAt}
              disabled={disabled}
              onChange={(event) => patch({ startAt: event.target.value })}
            />
          </label>
          <label className="space-y-1.5">
            <span className={fieldLabel}>Ends</span>
            <Input
              type="datetime-local"
              value={value.endAt}
              disabled={disabled}
              onChange={(event) => patch({ endAt: event.target.value })}
            />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className={fieldLabel}>Choose draft or ongoing edit</span>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedEventId}
              disabled={disabled}
              onChange={(event) => onSelectEvent(event.target.value)}
            >
              <option value="">New event draft</option>
              {eventOptions.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} ({event.status})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <div>
            <p className={fieldLabel}>Story</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Write short paragraphs. Use blank lines between sections. Bold with **like this**.
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>About the event</span>
            <Textarea
              className="min-h-[140px]"
              placeholder={`Have an idea that could solve a real problem?\n\nJoin a three-day online ideathon for students, developers, designers, founders, and AI enthusiasts.`}
              value={value.description}
              disabled={disabled}
              onChange={(event) => patch({ description: event.target.value })}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>Highlight / registration note</span>
            <Textarea
              className="min-h-[72px]"
              placeholder="Regular registration is closed. Limited late-registration slots are still open."
              value={value.highlightNote}
              disabled={disabled}
              onChange={(event) => patch({ highlightNote: event.target.value })}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={fieldLabel}>Registration URL</span>
              <Input
                placeholder="https://…"
                value={value.registrationUrl}
                disabled={disabled}
                onChange={(event) => patch({ registrationUrl: event.target.value })}
              />
            </label>
            <label className="block space-y-1.5">
              <span className={fieldLabel}>Rulebook URL</span>
              <Input
                placeholder="https://…"
                value={value.rulebookUrl}
                disabled={disabled}
                onChange={(event) => patch({ rulebookUrl: event.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className={fieldLabel}>Theme & participation</p>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>Theme</span>
            <Input
              placeholder="AI for Real World Impact"
              value={value.theme}
              disabled={disabled}
              onChange={(event) => patch({ theme: event.target.value })}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>Prizes</span>
            <Input
              placeholder="Mentorship, awards, community recognition"
              value={value.prize}
              disabled={disabled}
              onChange={(event) => patch({ prize: event.target.value })}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>Focus areas</span>
            <Textarea
              className="min-h-[80px]"
              placeholder="Education, Healthcare, Finance, Agriculture, Accessibility, Sustainability…"
              value={value.focusAreas}
              disabled={disabled}
              onChange={(event) => patch({ focusAreas: event.target.value })}
            />
            <span className="text-xs text-muted-foreground">Comma or new-line separated.</span>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className={fieldLabel}>Format</span>
              <Input
                placeholder="Online · 3 days"
                value={value.format}
                disabled={disabled}
                onChange={(event) => patch({ format: event.target.value })}
              />
            </label>
            <label className="space-y-1.5">
              <span className={fieldLabel}>Eligibility</span>
              <Input
                placeholder="Open worldwide"
                value={value.eligibility}
                disabled={disabled}
                onChange={(event) => patch({ eligibility: event.target.value })}
              />
            </label>
            <label className="space-y-1.5">
              <span className={fieldLabel}>Team size</span>
              <Input
                placeholder="Solo or teams of 1–4"
                value={value.teamSize}
                disabled={disabled}
                onChange={(event) => patch({ teamSize: event.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className={fieldLabel}>Guests & speakers</p>
              <p className="mt-1 text-sm text-muted-foreground">Optional faces for the public page.</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={disabled}
              onClick={() => patch({ guests: [...value.guests, emptyHostGuest()] })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add guest
            </Button>
          </div>
          {value.guests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No guests yet.</p>
          ) : (
            <div className="space-y-3">
              {value.guests.map((guest, index) => (
                <div
                  key={`guest-${index}`}
                  className="grid gap-3 rounded-lg border border-white/10 bg-background/40 p-3 sm:grid-cols-[120px_1fr_auto]"
                >
                  <ImageUploadField
                    label="Photo"
                    value={guest.imageUrl}
                    onChange={(imageUrl) => updateGuest(index, { imageUrl })}
                    onUpload={uploadFor("guest")}
                    aspectClassName="aspect-square"
                    disabled={disabled || !uploaderId}
                  />
                  <div className="space-y-2">
                    <Input
                      placeholder="Name"
                      value={guest.name}
                      disabled={disabled}
                      onChange={(event) => updateGuest(index, { name: event.target.value })}
                    />
                    <Input
                      placeholder="Role"
                      value={guest.role}
                      disabled={disabled}
                      onChange={(event) => updateGuest(index, { role: event.target.value })}
                    />
                    <Textarea
                      className="min-h-[64px]"
                      placeholder="Short bio"
                      value={guest.bio}
                      disabled={disabled}
                      onChange={(event) => updateGuest(index, { bio: event.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      patch({ guests: value.guests.filter((_, guestIndex) => guestIndex !== index) })
                    }
                    aria-label="Remove guest"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className={fieldLabel}>Programme schedule</p>
              <p className="mt-1 text-sm text-muted-foreground">One row per session — day, title, and detail.</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={disabled}
              onClick={() => patch({ schedule: [...value.schedule, emptyHostScheduleItem()] })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add session
            </Button>
          </div>
          <div className="space-y-3">
            {value.schedule.map((item, index) => (
              <div
                key={`schedule-${index}`}
                className="grid gap-2 rounded-lg border border-white/10 bg-background/40 p-3 sm:grid-cols-[140px_1fr_auto]"
              >
                <Input
                  placeholder="Aug 13 · Webinar"
                  value={item.time}
                  disabled={disabled}
                  onChange={(event) => updateScheduleItem(index, { time: event.target.value })}
                />
                <div className="space-y-2 sm:col-span-1">
                  <Input
                    placeholder="Session title"
                    value={item.title}
                    disabled={disabled}
                    onChange={(event) => updateScheduleItem(index, { title: event.target.value })}
                  />
                  <Textarea
                    className="min-h-[64px]"
                    placeholder="What participants will learn or do"
                    value={item.description}
                    disabled={disabled}
                    onChange={(event) => updateScheduleItem(index, { description: event.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={disabled}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    patch({ schedule: value.schedule.filter((_, itemIndex) => itemIndex !== index) })
                  }
                  aria-label="Remove session"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {value.schedule.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sessions yet. Add webinars, workshops, and demos.</p>
            ) : null}
          </div>
        </div>
      </div>

      <aside className="xl:sticky xl:top-24 xl:self-start">
        <div
          className="overflow-hidden rounded-2xl border border-primary/25 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_42%),linear-gradient(180deg,hsl(var(--card))_0%,hsl(210_20%_3%)_100%)] shadow-[0_24px_80px_-40px_hsl(var(--primary)/0.45)]"
          style={themeStyle}
        >
          <div className="relative overflow-hidden border-b border-white/10 bg-black">
            {heroImage ? (
              <img
                src={heroImage}
                alt=""
                className="mx-auto block h-auto max-h-48 w-full object-contain object-center"
              />
            ) : (
              <div className="min-h-[140px] bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.25),transparent_50%)]" />
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[hsl(var(--card))] to-transparent" />
            <div className="relative px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Live public preview</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {EVENT_LAYOUT_STYLES.find((item) => item.id === getEventLayoutStyle(value.layoutStyle))?.label} ·{" "}
                {EVENT_FONT_PRESETS.find((item) => item.id === getEventFontPreset(value.fontPreset))?.label}
              </p>
            </div>
          </div>
          <div className="space-y-5 px-5 py-6">
            <div className="flex flex-wrap items-center gap-3">
              {value.logoUrl ? (
                <img
                  src={value.logoUrl}
                  alt=""
                  className="h-10 w-10 rounded-md border border-white/15 object-cover"
                />
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Badge className="uppercase tracking-[0.14em]">Upcoming</Badge>
                {value.format ? (
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    {value.format}
                  </Badge>
                ) : null}
              </div>
            </div>
            {value.organizerName ? (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Hosted by {value.organizerName}
              </p>
            ) : null}
            {value.theme ? (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{value.theme}</p>
            ) : null}
            <h3
              className="text-3xl font-semibold leading-tight text-foreground"
              style={{ fontFamily: "var(--event-display)" }}
            >
              {value.name.trim() || "Untitled event"}
            </h3>
            {value.tagline ? (
              <p
                className="text-lg font-medium leading-snug text-foreground/90"
                style={{ fontFamily: "var(--event-display)" }}
              >
                {value.tagline}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 text-sm text-foreground">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                {previewEnd && previewEnd !== previewStart ? `${previewStart} – ${previewEnd}` : previewStart}
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                <MapPin className="h-4 w-4 text-primary" />
                {value.location.trim() || "Location TBC"}
              </span>
            </div>

            <EventRichText content={previewSummary} className="text-sm" />

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <Users className="h-4 w-4 text-primary" />
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Eligibility
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {value.eligibility.trim() || "Open to registered attendees"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{value.teamSize.trim() || "Team size TBC"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Format
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">{value.format.trim() || "To be confirmed"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Capacity {value.capacity.trim() || "—"}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <CalendarDays className="h-4 w-4 text-primary" />
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Programme
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {value.schedule.length > 0 ? `${value.schedule.length} sessions` : "Add sessions"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {value.guests.length > 0 ? `${value.guests.length} guests` : "Add guests anytime"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
