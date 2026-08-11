import { useState } from "react";
import { Bot, ExternalLink, Plus, Sparkles, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { GalleryUploadField, ImageUploadField } from "@/components/dashboard/ImageUploadField";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { uploadEventImage } from "@/lib/profileMedia";
import {
  generateAiHackathonDraft,
  getHostedHackathonUrl,
  type AiHackathonDraft,
  type HostedHackathon,
} from "@/lib/aiHackathons";
import {
  DEFAULT_HACKATHON_AI_MODEL,
  HACKATHON_AI_MODELS,
} from "@/lib/hackathonAiModels";

type AiHackathonLauncherProps = {
  onCreate: (draft: AiHackathonDraft, rulebookUrl: string) => Promise<HostedHackathon>;
};

type GuestDraft = {
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
};

const emptyGuest = (): GuestDraft => ({ name: "", role: "", bio: "", imageUrl: "" });

export function AiHackathonLauncher({ onCreate }: AiHackathonLauncherProps) {
  const { sessionUser } = usePortalAuth();
  const [details, setDetails] = useState("");
  const [rulebookUrl, setRulebookUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [guests, setGuests] = useState<GuestDraft[]>([]);
  const [lumaUrl, setLumaUrl] = useState("");
  const [model, setModel] = useState(DEFAULT_HACKATHON_AI_MODEL);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEvent, setCreatedEvent] = useState<HostedHackathon | null>(null);

  const selectedModel = HACKATHON_AI_MODELS.find((item) => item.id === model);

  const uploadFor = (kind: "cover" | "banner" | "gallery" | "guest") => async (file: File) => {
    if (!sessionUser?.id) throw new Error("Sign in as an admin to upload images.");
    return uploadEventImage(sessionUser.id, file, kind);
  };

  const updateGuest = (index: number, patch: Partial<GuestDraft>) => {
    setGuests((current) => current.map((guest, i) => (i === index ? { ...guest, ...patch } : guest)));
  };

  const handleCreate = async () => {
    if (!details.trim()) return;
    setIsCreating(true);
    setError(null);
    setCreatedEvent(null);
    try {
      const draft = await generateAiHackathonDraft({ details, rulebookUrl, model });
      const event = await onCreate(
        {
          ...draft,
          coverImageUrl,
          bannerImageUrl,
          galleryUrls,
          guests: guests
            .map((guest) => ({
              name: guest.name.trim(),
              role: guest.role.trim(),
              bio: guest.bio.trim(),
              imageUrl: guest.imageUrl.trim(),
            }))
            .filter((guest) => guest.name || guest.imageUrl),
          lumaUrl,
        },
        rulebookUrl
      );
      setCreatedEvent(event);
      setDetails("");
      setRulebookUrl("");
      setCoverImageUrl("");
      setBannerImageUrl("");
      setGalleryUrls([]);
      setGuests([]);
      setLumaUrl("");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Could not create the hackathon.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className={`${sectionClass} relative overflow-hidden`} id="ai-event-builder">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex max-w-3xl items-start gap-3">
            <span className="dash-icon-chip dash-icon-chip--violet" aria-hidden>
              <Bot className="h-4 w-4" />
            </span>
            <div>
              <p className="dash-eyebrow">AI event builder</p>
              <h2 className="dash-title">Paste details. Go live.</h2>
              <p className="dash-subtitle">
                Paste the organizer brief and optional rulebook link. AI turns it into a complete event page,
                schedule, requirements, and judging rubric, then publishes it immediately.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-primary">
            Admin only
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.48fr)]">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="ai-hackathon-details" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Full hackathon details
              </label>
              <Textarea
                id="ai-hackathon-details"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={11}
                className="min-h-[230px] resize-y bg-background/50"
                placeholder={"Paste everything you have: event name, dates, city or online format, challenge/theme, prizes, eligibility, team rules, deliverables, registration/submission deadlines, programme, sponsors, and any restrictions."}
                disabled={isCreating}
              />
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="dash-eyebrow">Guest details</p>
                  <h3 className="mt-1 text-base font-semibold text-foreground">Speakers, hosts &amp; guests</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Optional photos and bios for the public event page.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  disabled={isCreating}
                  onClick={() => setGuests((current) => [...current, emptyGuest()])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add guest
                </Button>
              </div>

              {guests.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/15 px-4 py-5 text-center text-sm text-muted-foreground">
                  No guests yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {guests.map((guest, index) => (
                    <div
                      key={`ai-guest-${index}`}
                      className="grid gap-4 rounded-xl border border-white/10 bg-background/30 p-4 sm:grid-cols-[120px_1fr]"
                    >
                      <ImageUploadField
                        label="Photo"
                        value={guest.imageUrl}
                        onChange={(imageUrl) => updateGuest(index, { imageUrl })}
                        onUpload={uploadFor("guest")}
                        aspectClassName="aspect-square"
                        hint="Square photo"
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
                            onClick={() => setGuests((current) => current.filter((_, i) => i !== index))}
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
                          placeholder="Role / title"
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
          </div>

          <div className="space-y-4 rounded-xl border border-white/10 bg-black/15 p-4">
            <div className="space-y-2">
              <label htmlFor="ai-hackathon-model" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                OpenAI model
              </label>
              <Select value={model} onValueChange={setModel} disabled={isCreating}>
                <SelectTrigger id="ai-hackathon-model" className="bg-background/50">
                  <SelectValue placeholder="Choose a model" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {HACKATHON_AI_MODELS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      <span className="font-medium">{option.label}</span>
                      <span className="ml-2 text-muted-foreground">· {option.tier}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedModel ? (
                <p className="text-xs leading-relaxed text-muted-foreground">{selectedModel.hint}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label htmlFor="ai-hackathon-rulebook" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Rulebook link <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <Input
                id="ai-hackathon-rulebook"
                type="url"
                value={rulebookUrl}
                onChange={(event) => setRulebookUrl(event.target.value)}
                placeholder="https://…"
                disabled={isCreating}
              />
            </div>
            <ImageUploadField
              label="Cover image"
              value={coverImageUrl}
              onChange={setCoverImageUrl}
              onUpload={uploadFor("cover")}
              hint="Optional · upload or paste URL"
              disabled={isCreating}
            />
            <ImageUploadField
              label="Banner image"
              value={bannerImageUrl}
              onChange={setBannerImageUrl}
              onUpload={uploadFor("banner")}
              hint="Optional wide banner"
              disabled={isCreating}
            />
            <GalleryUploadField
              label="Gallery"
              value={galleryUrls}
              onChange={setGalleryUrls}
              onUpload={uploadFor("gallery")}
              disabled={isCreating}
              maxItems={12}
            />
            <div className="space-y-2">
              <label htmlFor="ai-hackathon-luma" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Luma or live event URL <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <Input
                id="ai-hackathon-luma"
                type="url"
                value={lumaUrl}
                onChange={(event) => setLumaUrl(event.target.value)}
                placeholder="https://lu.ma/…"
                disabled={isCreating}
              />
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
              Missing details are labelled <span className="font-medium text-foreground">To be confirmed</span> rather
              than made up. You can refine the rubric after creation.
            </div>
            <Button
              type="button"
              className="h-auto min-h-11 w-full gap-2 px-4 py-3 text-[0.7rem] uppercase tracking-[0.18em]"
              disabled={isCreating || !details.trim()}
              onClick={() => void handleCreate()}
            >
              <Sparkles className="h-4 w-4" />
              {isCreating ? "Creating & publishing…" : "Create & publish event"}
            </Button>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {createdEvent ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/35 bg-primary/10 px-4 py-3">
            <p className="text-sm text-primary">
              <span className="font-semibold">{createdEvent.name}</span> is live with its rulebook, event page, and judging rubric.
            </p>
            <a
              href={getHostedHackathonUrl(createdEvent.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary underline-offset-4 hover:underline"
            >
              Open live page <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
