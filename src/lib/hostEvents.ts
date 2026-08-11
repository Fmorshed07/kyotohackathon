export type HostEventStatus = "draft" | "published" | "closed";
export type HostTicketStatus = "issued" | "checked_in" | "cancelled";

export type HostEvent = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  start_at: string;
  end_at: string;
  location: string;
  capacity: number;
  status: HostEventStatus;
  created_at: string;
  updated_at: string;
};

export type HostEventTicket = {
  id: string;
  host_id: string;
  event_id: string;
  attendee_name: string;
  attendee_email: string;
  ticket_type: string;
  ticket_code: string;
  qr_payload: string;
  status: HostTicketStatus;
  created_at: string;
  checked_in_at?: string | null;
};

export type HostEventJudge = {
  id: string;
  host_id: string;
  event_id: string;
  name: string;
  email: string;
  organization: string;
  expertise: string;
  status: "invited" | "confirmed";
  created_at: string;
};

export const createTicketCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = Array.from({ length: 8 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
  return `CGN-${random}`;
};

export const createTicketQrPayload = (eventId: string, ticketCode: string) =>
  `COGNISOR:TICKET:${eventId}:${ticketCode}`;

export const getTicketQrImageUrl = (payload: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=256x256&margin=8&data=${encodeURIComponent(payload)}`;

export const extractTicketCode = (input: string) => {
  const normalized = input.trim().toUpperCase();
  if (normalized.startsWith("COGNISOR:TICKET:")) {
    const pieces = normalized.split(":");
    return pieces.at(-1) ?? "";
  }
  return normalized;
};

export const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date to be confirmed";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};
