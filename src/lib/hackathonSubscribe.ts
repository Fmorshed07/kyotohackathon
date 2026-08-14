import { collection, doc, getDocs, setDoc, type Firestore } from "firebase/firestore";

export const HACKATHON_SUBSCRIBERS_COLLECTION = "hackathon_subscribers";

export type NewsletterSubscriber = {
  email: string;
  source: string;
  createdAt: string;
};

export function normalizeSubscribeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidSubscribeEmail(value: string) {
  const email = normalizeSubscribeEmail(value);
  return email.length >= 6 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function parseNewsletterSubscriber(
  id: string,
  data: Record<string, unknown>,
): NewsletterSubscriber | null {
  const email = typeof data.email === "string" ? normalizeSubscribeEmail(data.email) : normalizeSubscribeEmail(id);
  if (!isValidSubscribeEmail(email)) return null;
  return {
    email,
    source: typeof data.source === "string" && data.source.trim() ? data.source.trim() : "site",
    createdAt: typeof data.created_at === "string" ? data.created_at : "",
  };
}

export async function fetchNewsletterSubscribers(db: Firestore) {
  const snapshot = await getDocs(collection(db, HACKATHON_SUBSCRIBERS_COLLECTION));
  return snapshot.docs
    .map((item) => parseNewsletterSubscriber(item.id, item.data() as Record<string, unknown>))
    .filter((item): item is NewsletterSubscriber => item != null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.email.localeCompare(right.email));
}

export function buildNewsletterCsv(subscribers: NewsletterSubscriber[]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [
    "email,source,created_at",
    ...subscribers.map((item) => [item.email, item.source, item.createdAt].map(escape).join(",")),
  ].join("\n");
}

export async function subscribeToHackathons(
  db: Firestore,
  email: string,
  source = "site",
) {
  const normalized = normalizeSubscribeEmail(email);
  if (!isValidSubscribeEmail(normalized)) {
    throw new Error("Enter a valid email address.");
  }

  try {
    await setDoc(doc(db, HACKATHON_SUBSCRIBERS_COLLECTION, normalized), {
      email: normalized,
      created_at: new Date().toISOString(),
      source: source.trim().slice(0, 80) || "site",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/permission|already exists/i.test(message)) {
      return { alreadySubscribed: true as const, email: normalized };
    }
    throw error;
  }

  return { alreadySubscribed: false as const, email: normalized };
}
