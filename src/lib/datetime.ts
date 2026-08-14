const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

const DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...DATE_OPTIONS,
  ...TIME_OPTIONS,
};

/** Parse ISO strings, Date objects, and Firestore Timestamp-like values. */
export function parseTimestamp(value: unknown): Date | null {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value < 1e12 ? value * 1000 : value;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "object") {
    const record = value as {
      toDate?: () => Date;
      seconds?: number;
      _seconds?: number;
    };
    if (typeof record.toDate === "function") {
      try {
        const date = record.toDate();
        return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
      } catch {
        return null;
      }
    }
    const seconds = record.seconds ?? record._seconds;
    if (typeof seconds === "number" && Number.isFinite(seconds)) {
      const date = new Date(seconds * 1000);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
}

export function formatSubmissionDate(value: unknown, fallback = ""): string {
  const date = parseTimestamp(value);
  return date ? date.toLocaleDateString(undefined, DATE_OPTIONS) : fallback;
}

export function formatSubmissionTime(value: unknown, fallback = ""): string {
  const date = parseTimestamp(value);
  return date ? date.toLocaleTimeString(undefined, TIME_OPTIONS) : fallback;
}

/** Date and local time, e.g. "Aug 14, 2026, 8:24 PM". */
export function formatSubmissionDateTime(value: unknown, fallback = ""): string {
  const date = parseTimestamp(value);
  return date ? date.toLocaleString(undefined, DATETIME_OPTIONS) : fallback;
}
