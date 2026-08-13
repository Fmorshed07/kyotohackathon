import type { UserProfile } from "@/types/portal";

const getString = (value: unknown) => (typeof value === "string" ? value : "");

export const mapUserDocToProfile = (data: Record<string, unknown>): UserProfile => ({
  fullName: getString(data.fullName),
  avatarUrl: getString(data.avatarUrl),
  coverUrl: getString(data.coverUrl),
  galleryUrls: Array.isArray(data.galleryUrls)
    ? data.galleryUrls.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    : [],
  headline: getString(data.headline),
  bio: getString(data.bio),
  publicRole: getString(data.publicRole),
  experienceLevel: getString(data.experienceLevel),
  organization: getString(data.organization),
  location: getString(data.location),
  timezone: getString(data.timezone),
  languages: getString(data.languages),
  lookingFor: getString(data.lookingFor),
  githubUsername: getString(data.githubUsername),
  githubProfileUrl: getString(data.githubProfileUrl),
  linkedinUrl: getString(data.linkedinUrl),
  portfolioUrl: getString(data.portfolioUrl),
  xUrl: getString(data.xUrl),
  discordHandle: getString(data.discordHandle),
  skills: getString(data.skills),
  interests: getString(data.interests),
  profileUpdatedAt: getString(data.profileUpdatedAt),
  onboardingCompletedAt: getString(data.onboardingCompletedAt),
});

/** Compact snapshot stored on team memberships so teammates can see each other. */
export const pickTeamMemberProfile = (profile: UserProfile | null | undefined): UserProfile => {
  const compact: UserProfile = {};
  const source: UserProfile = {
    fullName: profile?.fullName?.trim() || null,
    avatarUrl: profile?.avatarUrl?.trim() || null,
    headline: profile?.headline?.trim() || null,
    bio: profile?.bio?.trim() || null,
    publicRole: profile?.publicRole?.trim() || null,
    experienceLevel: profile?.experienceLevel?.trim() || null,
    organization: profile?.organization?.trim() || null,
    location: profile?.location?.trim() || null,
    timezone: profile?.timezone?.trim() || null,
    languages: profile?.languages?.trim() || null,
    skills: profile?.skills?.trim() || null,
    interests: profile?.interests?.trim() || null,
    lookingFor: profile?.lookingFor?.trim() || null,
    githubUsername: profile?.githubUsername?.trim() || null,
    githubProfileUrl: profile?.githubProfileUrl?.trim() || null,
    linkedinUrl: profile?.linkedinUrl?.trim() || null,
    portfolioUrl: profile?.portfolioUrl?.trim() || null,
    xUrl: profile?.xUrl?.trim() || null,
    discordHandle: profile?.discordHandle?.trim() || null,
  };
  for (const [key, value] of Object.entries(source) as Array<[keyof UserProfile, UserProfile[keyof UserProfile]]>) {
    if (typeof value === "string" && value.trim()) {
      compact[key] = value as never;
    }
  }
  return compact;
};

export const mergeProfiles = (...profiles: Array<UserProfile | null | undefined>): UserProfile => {
  const merged: UserProfile = {};
  for (const profile of profiles) {
    if (!profile) continue;
    for (const [key, value] of Object.entries(profile) as Array<[keyof UserProfile, UserProfile[keyof UserProfile]]>) {
      if (typeof value === "string" && value.trim()) {
        merged[key] = value as never;
      } else if (Array.isArray(value) && value.length > 0) {
        merged[key] = value as never;
      }
    }
  }
  return merged;
};

export const parseSkillChips = (raw: string | null | undefined, limit = 6) =>
  (raw ?? "")
    .split(/[,;/|]+/)
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, limit);

export const getGithubProfileUrl = (profile: UserProfile | null | undefined) => {
  const username = profile?.githubUsername?.trim().replace(/^@/, "") ?? "";
  if (username) return `https://github.com/${username}`;
  const fallback = profile?.githubProfileUrl?.trim() ?? "";
  if (!fallback) return "";
  return /^https?:\/\//i.test(fallback) ? fallback : `https://${fallback}`;
};

export const ensureHttpUrl = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};
