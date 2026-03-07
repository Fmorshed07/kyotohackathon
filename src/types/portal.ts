export type PortalRole = "participant" | "judge" | "admin";
export type JudgeApprovalStatus = "pending" | "approved";

export type Submission = {
  id: string;
  user_id: string;
  title: string | null;
  team_name?: string | null;
  member_names?: string | null;
  short_description: string | null;
  project_url: string | null;
  submission_pdf_url: string | null;
  demo_video_url: string | null;
  created_at: string | null;
  judge_id?: string | null;
  judge_score: number | null;
  judge_notes: string | null;
  judge_scores?: Record<string, number | null> | null;
  judge_notes_by_judge?: Record<string, string> | null;
  judge_criteria_scores?: Record<string, number | null> | null;
  judge_criteria_scores_by_judge?: Record<string, Record<string, number | null>> | null;
};

export type SessionUser = {
  id: string;
  email: string;
  role?: PortalRole;
  judgeApprovalStatus?: JudgeApprovalStatus;
};
