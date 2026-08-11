import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { Camera, Github, ImagePlus, Rocket, Trash2, UserRound } from "lucide-react";
import { useRef } from "react";

export type PeopleProfileFormState = {
  fullName: string;
  avatarUrl: string;
  coverUrl: string;
  galleryUrls: string[];
  headline: string;
  bio: string;
  publicRole: string;
  experienceLevel: string;
  organization: string;
  location: string;
  timezone: string;
  languages: string;
  lookingFor: string;
  githubUsername: string;
  githubProfileUrl: string;
  linkedinUrl: string;
  portfolioUrl: string;
  xUrl: string;
  discordHandle: string;
  skills: string;
  interests: string;
};

export type PeopleProfileSectionProps = {
  form: PeopleProfileFormState;
  setForm: React.Dispatch<React.SetStateAction<PeopleProfileFormState>>;
  isLoading?: boolean;
  isSaving: boolean;
  saveMessage: string | null;
  isUploadingAvatar: boolean;
  avatarMessage: string | null;
  onAvatarSelected: (file: File) => Promise<void>;
  onRemoveAvatar: () => Promise<void>;
  isUploadingCover: boolean;
  coverMessage: string | null;
  onCoverSelected: (file: File) => Promise<void>;
  onRemoveCover: () => Promise<void>;
  isUploadingGallery: boolean;
  galleryMessage: string | null;
  onGallerySelected: (files: File[]) => Promise<void>;
  onRemoveGalleryImage: (url: string) => Promise<void>;
  onSave: () => Promise<void>;
};

const ensureAbsoluteUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const normalizeGithubUsername = (value: string) =>
  value
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .split(/[/?#]/)[0] ?? "";

const getGithubProfileUrl = (username: string, fallbackUrl: string) => {
  const normalizedUsername = normalizeGithubUsername(username);
  if (normalizedUsername) return `https://github.com/${normalizedUsername}`;
  return ensureAbsoluteUrl(fallbackUrl);
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "YOU";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

export function getPeopleProfileCompleteness(form: PeopleProfileFormState) {
  const signals = [
    form.avatarUrl,
    form.coverUrl,
    form.galleryUrls.join(""),
    form.fullName,
    form.headline || form.publicRole,
    form.bio,
    form.githubUsername || form.githubProfileUrl,
    form.linkedinUrl || form.portfolioUrl,
    form.skills,
    form.interests || form.lookingFor,
  ];
  return Math.round((signals.filter((value) => value.trim()).length / signals.length) * 100);
}

export function PeopleProfileSection({
  form,
  setForm,
  isLoading = false,
  isSaving,
  saveMessage,
  isUploadingAvatar,
  avatarMessage,
  onAvatarSelected,
  onRemoveAvatar,
  isUploadingCover,
  coverMessage,
  onCoverSelected,
  onRemoveCover,
  isUploadingGallery,
  galleryMessage,
  onGallerySelected,
  onRemoveGalleryImage,
  onSave,
}: PeopleProfileSectionProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const githubProfileUrl = getGithubProfileUrl(form.githubUsername, form.githubProfileUrl);
  const profileCompleteness = getPeopleProfileCompleteness(form);
  const displayName = form.fullName.trim() || "Your name";
  const displayRole = form.headline.trim() || form.publicRole.trim() || "Add a short headline";

  if (isLoading) {
    return (
      <section className={sectionClass} aria-labelledby="profile-details-heading">
        <p className="text-sm text-muted-foreground">Loading your profile…</p>
      </section>
    );
  }

  return (
    <section
      className={sectionClass}
      id="my-profile"
      aria-labelledby="profile-details-heading"
    >
      <div className="mb-6 flex items-start gap-3 border-b border-white/10 pb-4">
        <span className="dash-icon-chip" aria-hidden>
          <UserRound className="h-4 w-4" />
        </span>
        <div>
          <p className="dash-eyebrow">Creator profile</p>
          <h2 id="profile-details-heading" className="dash-title">
            People profile
          </h2>
          <p className="dash-subtitle">
            Photo, bio, and links help admins match teammates, mentors, sponsors, and judging ops.
          </p>
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-background/40 to-background/10">
        <div className="relative h-36 w-full bg-gradient-to-r from-primary/25 via-background/40 to-community/20 sm:h-44">
          {form.coverUrl ? (
            <img
              src={form.coverUrl}
              alt={`${displayName} cover banner`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
          <div className="absolute bottom-3 right-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 bg-background/80 backdrop-blur"
              disabled={isUploadingCover}
              onClick={() => coverInputRef.current?.click()}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {form.coverUrl ? "Change banner" : "Add banner"}
            </Button>
            {form.coverUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 bg-background/70 text-muted-foreground hover:text-destructive"
                disabled={isUploadingCover}
                onClick={() => void onRemoveCover()}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            ) : null}
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onCoverSelected(file);
            }}
          />
        </div>
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative shrink-0">
              <Avatar className="h-24 w-24 rounded-2xl border border-white/15 shadow-lg shadow-black/20">
                {form.avatarUrl ? (
                  <AvatarImage
                    src={form.avatarUrl}
                    alt={`${displayName} profile photo`}
                    className="rounded-2xl object-cover"
                  />
                ) : null}
                <AvatarFallback className="rounded-2xl bg-background/70 text-lg font-semibold tracking-[0.12em] text-primary">
                  {getInitials(form.fullName)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-2 -right-2 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary/40 bg-background text-primary shadow-md transition hover:bg-primary/10 disabled:opacity-60"
                aria-label="Upload profile photo"
              >
                {isUploadingAvatar ? (
                  <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-primary/70" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void onAvatarSelected(file);
                }}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {displayName}
              </p>
              <p className="mt-1 truncate text-sm text-muted-foreground">{displayRole}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="h-8 gap-1.5"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  {form.avatarUrl ? "Change photo" : "Add photo"}
                </Button>
                {form.avatarUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void onRemoveAvatar()}
                    disabled={isUploadingAvatar}
                    className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                JPG, PNG, WebP, or GIF · up to 5 MB
              </p>
              {avatarMessage ? <p className="mt-1 text-xs text-primary">{avatarMessage}</p> : null}
              {coverMessage ? <p className="mt-1 text-xs text-primary">{coverMessage}</p> : null}
            </div>
          </div>
          <div className="w-full shrink-0 sm:max-w-[220px]">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="dash-eyebrow">Profile ready</p>
                <p className="text-3xl font-semibold tracking-tight text-foreground">
                  {profileCompleteness}%
                </p>
              </div>
              {githubProfileUrl ? (
                <a
                  href={githubProfileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/30 px-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary transition hover:bg-primary/10"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              ) : null}
            </div>
            <div className="mt-3">
              <div className="dash-progress-track">
                <div className="dash-progress-fill" style={{ width: `${profileCompleteness}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 space-y-3 rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="dash-eyebrow">Photo gallery</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">Guest detail pictures</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Extra photos for your public people profile — demos, team shots, or past work.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1.5"
            disabled={isUploadingGallery || form.galleryUrls.length >= 12}
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {isUploadingGallery ? "Uploading…" : "Add photos"}
          </Button>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (files.length > 0) void onGallerySelected(files);
            }}
          />
        </div>
        {form.galleryUrls.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-muted-foreground">
            No gallery photos yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {form.galleryUrls.map((url) => (
              <div
                key={url}
                className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/30"
              >
                <img src={url} alt="Gallery photo" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                  onClick={() => void onRemoveGalleryImage(url)}
                  disabled={isUploadingGallery}
                  aria-label="Remove gallery photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {galleryMessage ? <p className="text-xs text-primary">{galleryMessage}</p> : null}
      </div>

      <div className="space-y-8">
        <div>
          <p className="dash-eyebrow mb-3">About you</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="dash-field-label">Full name</label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <label className="dash-field-label">Headline</label>
              <Input
                value={form.headline}
                onChange={(e) => setForm((prev) => ({ ...prev, headline: e.target.value }))}
                placeholder="Builder · AI for climate · Kyoto"
              />
            </div>
            <div className="space-y-2">
              <label className="dash-field-label">Role in hackathon</label>
              <Input
                value={form.publicRole}
                onChange={(e) => setForm((prev) => ({ ...prev, publicRole: e.target.value }))}
                placeholder="Developer, designer, founder, researcher..."
              />
            </div>
            <div className="space-y-2">
              <label className="dash-field-label">Experience level</label>
              <Select
                value={form.experienceLevel || "not-set"}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    experienceLevel: value === "not-set" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-set">Select experience</SelectItem>
                  <SelectItem value="Student">Student</SelectItem>
                  <SelectItem value="Early career">Early career</SelectItem>
                  <SelectItem value="Builder">Builder</SelectItem>
                  <SelectItem value="Founder">Founder</SelectItem>
                  <SelectItem value="Expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="dash-field-label">School / organization</label>
              <Input
                value={form.organization}
                onChange={(e) => setForm((prev) => ({ ...prev, organization: e.target.value }))}
                placeholder="University, company, studio..."
              />
            </div>
            <div className="space-y-2">
              <label className="dash-field-label">Languages</label>
              <Input
                value={form.languages}
                onChange={(e) => setForm((prev) => ({ ...prev, languages: e.target.value }))}
                placeholder="English, Japanese, Bengali..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
              <div className="space-y-2">
                <label className="dash-field-label">Location</label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Kyoto, Tokyo, Dhaka..."
                />
              </div>
              <div className="space-y-2">
                <label className="dash-field-label">Timezone</label>
                <Input
                  value={form.timezone}
                  onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                  placeholder="JST, UTC+9..."
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="dash-field-label">Short bio</label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                placeholder="A few sentences about what you build, care about, or bring to a team."
                rows={4}
              />
            </div>
          </div>
        </div>

        <div>
          <p className="dash-eyebrow mb-3">Presence & links</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="dash-field-label">GitHub username</label>
              <Input
                value={form.githubUsername}
                onChange={(e) => setForm((prev) => ({ ...prev, githubUsername: e.target.value }))}
                placeholder="octocat"
              />
            </div>
            <div className="space-y-2">
              <label className="dash-field-label">GitHub profile URL</label>
              <Input
                value={githubProfileUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, githubProfileUrl: e.target.value }))}
                placeholder="https://github.com/username"
              />
            </div>
            <div className="space-y-2">
              <label className="dash-field-label">LinkedIn</label>
              <Input
                value={form.linkedinUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, linkedinUrl: e.target.value }))}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="space-y-2">
              <label className="dash-field-label">Portfolio</label>
              <Input
                value={form.portfolioUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, portfolioUrl: e.target.value }))}
                placeholder="https://your-site.com"
              />
            </div>
            <div className="space-y-2">
              <label className="dash-field-label">X / social</label>
              <Input
                value={form.xUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, xUrl: e.target.value }))}
                placeholder="https://x.com/..."
              />
            </div>
            <div className="space-y-2">
              <label className="dash-field-label">Discord</label>
              <Input
                value={form.discordHandle}
                onChange={(e) => setForm((prev) => ({ ...prev, discordHandle: e.target.value }))}
                placeholder="@handle"
              />
            </div>
          </div>
        </div>

        <div>
          <p className="dash-eyebrow mb-3">Skills & collaboration</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="dash-field-label">Skills</label>
              <Textarea
                value={form.skills}
                onChange={(e) => setForm((prev) => ({ ...prev, skills: e.target.value }))}
                placeholder="React, AI agents, design, pitch, backend..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="dash-field-label">Looking for</label>
              <Input
                value={form.lookingFor}
                onChange={(e) => setForm((prev) => ({ ...prev, lookingFor: e.target.value }))}
                placeholder="Teammates, designer, mentor, co-founder..."
              />
            </div>
            <div className="space-y-2">
              <label className="dash-field-label">Interests and collaboration goals</label>
              <Textarea
                value={form.interests}
                onChange={(e) => setForm((prev) => ({ ...prev, interests: e.target.value }))}
                placeholder="What you want to build, learn, or help others with."
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Save anytime — profile updates are separate from your project submission.
        </p>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {saveMessage ? <p className="dash-message">{saveMessage}</p> : null}
          <Button
            onClick={() => void onSave()}
            disabled={isSaving}
            size="lg"
            className="w-full uppercase tracking-[0.12em] sm:w-auto sm:tracking-[0.18em]"
          >
            <Rocket className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </div>
    </section>
  );
}
