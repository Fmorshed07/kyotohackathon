export type PortalRole = "participant" | "mentor" | "judge" | "host" | "admin";
export type JudgeApprovalStatus = "pending" | "approved";
export type HostApprovalStatus = "pending" | "approved";

export type UserProfile = {
  fullName?: string | null;
  avatarUrl?: string | null;
  /** Wide profile banner shown above the people profile card */
  coverUrl?: string | null;
  /** Extra photos for the participant / guest profile gallery */
  galleryUrls?: string[] | null;
  headline?: string | null;
  bio?: string | null;
  publicRole?: string | null;
  experienceLevel?: string | null;
  organization?: string | null;
  location?: string | null;
  timezone?: string | null;
  languages?: string | null;
  lookingFor?: string | null;
  githubUsername?: string | null;
  githubProfileUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  xUrl?: string | null;
  discordHandle?: string | null;
  skills?: string | null;
  interests?: string | null;
  profileUpdatedAt?: string | null;
  /** ISO timestamp set when the participant finishes the first-time onboarding wizard. */
  onboardingCompletedAt?: string | null;
};

export type TeamMemberRole = "leader" | "member";

export type TeamMemberRecord = {
  user_id: string;
  name: string;
  email: string;
  joined_at: string;
  role?: TeamMemberRole | null;
  /** Public people-profile snapshot copied when the member joined. */
  profile?: UserProfile | null;
};

export type Submission = {
  id: string;
  user_id: string;
  hackathon_id?: string | null;
  title: string | null;
  team_name?: string | null;
  member_names?: string | null;
  /** Display names synced from the live roster (arrayUnion-friendly on join). */
  member_name_list?: string[] | null;
  /** Linked portal accounts that joined via invite link. */
  team_members?: TeamMemberRecord[] | null;
  /** Auth uids allowed to read/edit this submission after joining via invite. */
  member_user_ids?: string[] | null;
  /** Portal account that currently leads the team (defaults to the creator). */
  team_leader_id?: string | null;
  /** Display name/email for the submission creator (visible to teammates). */
  owner_name?: string | null;
  owner_email?: string | null;
  short_description: string | null;
  project_url: string | null;
  submission_pdf_url: string | null;
  demo_video_url: string | null;
  cover_url?: string | null;
  gallery_urls?: string[] | null;
  /** True when the project appears on hackathon boards and the public gallery. Set by the team, or by a host/admin. */
  public_preview_consent?: boolean | null;
  /** Organizer-controlled flag for teams advancing to the event's final judging round. */
  final_shortlisted?: boolean | null;
  final_shortlisted_at?: string | null;
  created_at: string | null;
  updated_at?: string | null;
  judge_id?: string | null;
  judge_score: number | null;
  judge_notes: string | null;
  judge_scores?: Record<string, number | null> | null;
  judge_notes_by_judge?: Record<string, string> | null;
  judge_criteria_scores?: Record<string, number | null> | null;
  judge_criteria_scores_by_judge?: Record<string, Record<string, number | null>> | null;
};

/** Public “looking for teammates” post visible on every participant dashboard. */
export type TeammatePost = {
  id: string;
  user_id: string;
  hackathon_id: string;
  author_name: string;
  author_email: string;
  /** Roles / skills the poster wants on their team. */
  looking_for: string;
  message: string;
  /** What the poster brings (optional). */
  skills?: string | null;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
};

export type TeamInvite = {
  id: string;
  token: string;
  submission_id: string;
  owner_id: string;
  hackathon_id: string;
  team_name: string;
  owner_name: string;
  owner_email: string;
  status: "open" | "revoked";
  created_at: string;
  max_uses?: number | null;
  use_count: number;
};

export type PortalJudgeInvite = {
  id: string;
  token: string;
  hackathon_ids: string[];
  created_by: string;
  created_by_email?: string | null;
  label?: string | null;
  status: "open" | "revoked";
  created_at: string;
  max_uses?: number | null;
  use_count: number;
  used_by?: string[] | null;
};

export type Top3RankSlot = "first" | "second" | "third";

export type JudgeTop3Ranks = {
  first: string | null;
  second: string | null;
  third: string | null;
};

export type JudgeTop3Ranking = {
  judge_id: string;
  hackathon_id: string;
  ranks: JudgeTop3Ranks;
  updated_at: string | null;
};

export type SessionUser = {
  id: string;
  email: string;
  role?: PortalRole;
  judgeApprovalStatus?: JudgeApprovalStatus;
  hostApprovalStatus?: HostApprovalStatus;
  /** Primary / home hackathon (legacy single-event field). */
  hackathonId?: string;
  /** Events this user may access (judges/mentors). Admins ignore this. */
  hackathonIds?: string[];
  /** Participant finished the detailed onboarding wizard. */
  onboardingCompletedAt?: string | null;
  profile?: UserProfile;
};
