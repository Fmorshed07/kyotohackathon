export type EmailType =
  | "welcome"
  | "submission_created"
  | "submission_updated"
  | "admin_submission"
  | "broadcast";

export type WelcomePayload = {
  type: "welcome";
  hackathonName?: string;
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

export type EmailRequestBody = WelcomePayload | SubmissionPayload | BroadcastPayload;

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
