import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import type { TeammatePost } from "@/types/portal";

const COLLECTION = "teammate_posts";

export type TeammatePostInput = {
  hackathon_id: string;
  author_name: string;
  author_email: string;
  looking_for: string;
  message: string;
  skills?: string;
};

const getString = (value: unknown) => (typeof value === "string" ? value : "");

export function mapTeammatePost(
  id: string,
  data: Record<string, unknown>
): TeammatePost {
  return {
    id,
    user_id: getString(data.user_id),
    hackathon_id: getString(data.hackathon_id),
    author_name: getString(data.author_name),
    author_email: getString(data.author_email),
    looking_for: getString(data.looking_for),
    message: getString(data.message),
    skills: getString(data.skills) || null,
    status: data.status === "closed" ? "closed" : "open",
    created_at: getString(data.created_at),
    updated_at: getString(data.updated_at),
  };
}

/** All open posts for a hackathon — visible on every participant dashboard. */
export async function listTeammatePosts(
  db: Firestore,
  hackathonId: string
): Promise<TeammatePost[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("hackathon_id", "==", hackathonId))
  );

  const posts = snap.docs
    .map((entry) => mapTeammatePost(entry.id, entry.data() as Record<string, unknown>))
    .filter((post) => post.status === "open");

  return posts.sort((left, right) => {
    const leftTime = Date.parse(left.created_at);
    const rightTime = Date.parse(right.created_at);
    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;
    return rightTime - leftTime;
  });
}

export async function createTeammatePost(
  db: Firestore,
  userId: string,
  input: TeammatePostInput
): Promise<TeammatePost> {
  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    hackathon_id: input.hackathon_id,
    author_name: input.author_name.trim(),
    author_email: input.author_email.trim().toLowerCase(),
    looking_for: input.looking_for.trim(),
    message: input.message.trim(),
    skills: input.skills?.trim() || "",
    status: "open" as const,
    created_at: now,
    updated_at: now,
  };

  const ref = await addDoc(collection(db, COLLECTION), payload);
  return mapTeammatePost(ref.id, payload);
}

export async function updateTeammatePost(
  db: Firestore,
  postId: string,
  patch: Partial<Pick<TeammatePostInput, "looking_for" | "message" | "skills">> & {
    status?: "open" | "closed";
  }
): Promise<void> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof patch.looking_for === "string") updates.looking_for = patch.looking_for.trim();
  if (typeof patch.message === "string") updates.message = patch.message.trim();
  if (typeof patch.skills === "string") updates.skills = patch.skills.trim();
  if (patch.status === "open" || patch.status === "closed") updates.status = patch.status;
  await updateDoc(doc(db, COLLECTION, postId), updates);
}

export async function deleteTeammatePost(db: Firestore, postId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, postId));
}

/** Close any prior open posts by this user for the same event before posting a fresh one. */
export async function closeOwnOpenPosts(
  db: Firestore,
  userId: string,
  hackathonId: string
): Promise<void> {
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("user_id", "==", userId))
  );
  const now = new Date().toISOString();
  await Promise.all(
    snap.docs
      .filter((entry) => {
        const data = entry.data() as Record<string, unknown>;
        return data.hackathon_id === hackathonId && data.status === "open";
      })
      .map((entry) =>
        setDoc(entry.ref, { status: "closed", updated_at: now }, { merge: true })
      )
  );
}
