/** Per-event visual identity for autonomous hosted events. */

export type EventFontPreset = "horizon" | "editorial" | "signal" | "atelier";
export type EventLayoutStyle = "stage" | "folio" | "signal";

export type EventBrandAccent = {
  id: string;
  label: string;
  /** Hex accent used for CTAs, rules, and glow. */
  hex: string;
};

export const EVENT_FONT_PRESETS: Array<{
  id: EventFontPreset;
  label: string;
  display: string;
  body: string;
  note: string;
}> = [
  {
    id: "horizon",
    label: "Horizon",
    display: "Space Grotesk",
    body: "Manrope",
    note: "Crisp tech default",
  },
  {
    id: "editorial",
    label: "Editorial",
    display: "Fraunces",
    body: "Source Sans 3",
    note: "Magazine / manifesto",
  },
  {
    id: "signal",
    label: "Signal",
    display: "Syne",
    body: "DM Sans",
    note: "Bold geometric energy",
  },
  {
    id: "atelier",
    label: "Atelier",
    display: "Instrument Serif",
    body: "Figtree",
    note: "Warm studio feel",
  },
];

export const EVENT_LAYOUT_STYLES: Array<{
  id: EventLayoutStyle;
  label: string;
  note: string;
}> = [
  { id: "stage", label: "Stage", note: "Full-bleed cinematic hero" },
  { id: "folio", label: "Folio", note: "Editorial stacked sections" },
  { id: "signal", label: "Signal", note: "Dense signal-board grid" },
];

export const EVENT_ACCENT_PRESETS: EventBrandAccent[] = [
  { id: "cyan", label: "Electric", hex: "#00A3FF" },
  { id: "ember", label: "Ember", hex: "#FF6A3D" },
  { id: "jade", label: "Jade", hex: "#2DD4A8" },
  { id: "violet", label: "Violet", hex: "#8B7CFF" },
  { id: "gold", label: "Gold", hex: "#E8B84A" },
  { id: "rose", label: "Rose", hex: "#F472B6" },
];

export function isEventFontPreset(value: unknown): value is EventFontPreset {
  return value === "horizon" || value === "editorial" || value === "signal" || value === "atelier";
}

export function isEventLayoutStyle(value: unknown): value is EventLayoutStyle {
  return value === "stage" || value === "folio" || value === "signal";
}

export function normalizeAccentHex(value?: string | null) {
  const trimmed = value?.trim() || "";
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toUpperCase()}`;
  return "";
}

/** Convert #RRGGBB to CSS HSL components without `hsl()` wrapper (for CSS vars). */
export function hexToHslComponents(hex: string): string | null {
  const normalized = normalizeAccentHex(hex);
  if (!normalized) return null;
  const r = Number.parseInt(normalized.slice(1, 3), 16) / 255;
  const g = Number.parseInt(normalized.slice(3, 5), 16) / 255;
  const b = Number.parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function getEventFontPreset(value?: string | null): EventFontPreset {
  return isEventFontPreset(value) ? value : "horizon";
}

export function getEventLayoutStyle(value?: string | null): EventLayoutStyle {
  return isEventLayoutStyle(value) ? value : "stage";
}

export function buildEventThemeStyle(options: {
  accentHex?: string | null;
  fontPreset?: string | null;
}): Record<string, string> {
  const accent = hexToHslComponents(options.accentHex || "") || "199 100% 50%";
  const font = getEventFontPreset(options.fontPreset);
  const display =
    font === "editorial"
      ? '"Fraunces", Georgia, serif'
      : font === "signal"
        ? '"Syne", system-ui, sans-serif'
        : font === "atelier"
          ? '"Instrument Serif", Georgia, serif'
          : '"Space Grotesk", system-ui, sans-serif';
  const body =
    font === "editorial"
      ? '"Source Sans 3", system-ui, sans-serif'
      : font === "signal"
        ? '"DM Sans", system-ui, sans-serif'
        : font === "atelier"
          ? '"Figtree", system-ui, sans-serif'
          : '"Manrope", system-ui, sans-serif';

  return {
    "--primary": accent,
    "--ring": accent,
    "--horizon": accent,
    "--event-display": display,
    "--event-body": body,
    fontFamily: "var(--event-body)",
  };
}
