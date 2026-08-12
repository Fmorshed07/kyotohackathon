export type EmailType =
  | "welcome"
  | "participant_details"
  | "submission_created"
  | "submission_updated"
  | "admin_submission"
  | "broadcast";

export type WelcomePayload = {
  type: "welcome";
  hackathonName?: string;
};

export type ParticipantDetailsPayload = {
  type: "participant_details";
  hackathonName?: string;
  fullName?: string;
  publicRole?: string;
  experienceLevel?: string;
  organization?: string;
  location?: string;
  bio?: string;
  skills?: string;
  interests?: string;
  lookingFor?: string;
  languages?: string;
  githubUsername?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  xUrl?: string;
  discordHandle?: string;
};

export type SubmissionPayload = {
  type: "submission_created" | "submission_updated" | "admin_submission";
  toEmail?: string;
  title?: string;
  teamName?: string;
  hackathonName?: string;
};

export type BroadcastPayload = {
  type: "broadcast";
  subject: string;
  message: string;
  recipients: string[];
  hackathonName?: string;
};

export type EmailRequestBody =
  | WelcomePayload
  | ParticipantDetailsPayload
  | SubmissionPayload
  | BroadcastPayload;

export type SendResult = {
  ok: true;
  messageId: string;
  preview?: boolean;
  sent?: number;
  failed?: number;
};

export type SendError = {
  ok: false;
  error: string;
  status: number;
};
