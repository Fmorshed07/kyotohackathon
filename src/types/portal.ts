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

export type Submission = {
  id: string;
  user_id: string;
  hackathon_id?: string | null;
  title: string | null;
  team_name?: string | null;
  member_names?: string | null;
  short_description: string | null;
  project_url: string | null;
  submission_pdf_url: string | null;
  demo_video_url: string | null;
  cover_url?: string | null;
  gallery_urls?: string[] | null;
  /** Explicit participant consent required before a submission appears on hackathon boards and the public gallery. */
  public_preview_consent?: boolean | null;
  created_at: string | null;
  judge_id?: string | null;
  judge_score: number | null;
  judge_notes: string | null;
  judge_scores?: Record<string, number | null> | null;
  judge_notes_by_judge?: Record<string, string> | null;
  judge_criteria_scores?: Record<string, number | null> | null;
  judge_criteria_scores_by_judge?: Record<string, Record<string, number | null>> | null;
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
