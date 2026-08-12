import type { HostEventGuest, HostEventScheduleItem } from "@/lib/hostEvents";
import type { EventFontPreset, EventLayoutStyle } from "@/lib/eventBranding";

export type HostEventBriefForm = {
  name: string;
  tagline: string;
  description: string;
  theme: string;
  format: string;
  eligibility: string;
  teamSize: string;
  prize: string;
  rulebookUrl: string;
  registrationUrl: string;
  highlightNote: string;
  focusAreas: string;
  schedule: HostEventScheduleItem[];
  coverImageUrl: string;
  bannerImageUrl: string;
  logoUrl: string;
  galleryUrls: string[];
  guests: HostEventGuest[];
  organizerName: string;
  accentColor: string;
  fontPreset: EventFontPreset;
  layoutStyle: EventLayoutStyle;
  startAt: string;
  endAt: string;
  location: string;
  capacity: string;
};

export const emptyHostEventBriefForm = (): HostEventBriefForm => ({
  name: "",
  tagline: "",
  description: "",
  theme: "",
  format: "Online",
  eligibility: "Open to participants worldwide",
  teamSize: "Solo or teams of 1–4",
  prize: "",
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
  fontPreset: "horizon",
  layoutStyle: "stage",
  startAt: "",
  endAt: "",
  location: "",
  capacity: "100",
});
