import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import {
  ensureAuthPersistence,
  getFirebaseAuth,
  getFirebaseStorage,
} from "@/lib/firebaseClient";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const UPLOAD_TIMEOUT_MS = 30_000;

export type ProfileMediaKind = "avatar" | "cover" | "gallery";
export type EventMediaKind = "cover" | "banner" | "gallery" | "guest" | "logo";

const extensionForMime = (mime: string) => {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
};

const mimeFromFileName = (name: string): string | null => {
  const lower = name.trim().toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return null;
};

/** Some OS pickers (esp. Windows) send an empty MIME type — infer from extension. */
export function normalizeImageFile(file: File): File {
  if (ALLOWED_IMAGE_TYPES.has(file.type)) return file;
  const inferred = mimeFromFileName(file.name);
  if (!inferred) return file;
  return new File([file], file.name, {
    type: inferred,
    lastModified: file.lastModified,
  });
}

export function validateImageFile(file: File): string | null {
  const normalized = normalizeImageFile(file);
  if (!ALLOWED_IMAGE_TYPES.has(normalized.type)) {
    return "Use a JPG, PNG, WebP, or GIF image.";
  }
  if (normalized.size > MAX_IMAGE_BYTES) {
    return "Keep the image under 5 MB.";
  }
  return null;
}

/** @deprecated Prefer validateImageFile */
export function validateProfileAvatarFile(file: File): string | null {
  return validateImageFile(file);
}

async function withUploadTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error("Upload timed out. Check your connection, then try a smaller image.")
            ),
          UPLOAD_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function requireAuthUid(preferredUserId?: string): string {
  const auth = getFirebaseAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Sign in again, then upload your photo.");
  }
  // Storage rules require path userId == auth.uid. Never write under another uid.
  if (preferredUserId && preferredUserId !== uid) {
    throw new Error("Signed-in account does not match this upload session. Refresh and try again.");
  }
  return uid;
}

async function requireAuthUidReady(preferredUserId?: string): Promise<string> {
  await ensureAuthPersistence();
  return requireAuthUid(preferredUserId);
}

/** Storage object path for profile / project media. Exported for tests. */
export function buildProfileMediaPath(
  userId: string,
  kind: ProfileMediaKind,
  stamp = Date.now(),
  mime = "image/jpeg"
): string {
  const ext = extensionForMime(mime);
  if (kind === "avatar") return `profile-avatars/${userId}/avatar_${stamp}.${ext}`;
  if (kind === "cover") return `profile-media/${userId}/cover_${stamp}.${ext}`;
  return `profile-media/${userId}/gallery_${stamp}.${ext}`;
}

/** Storage object path for host/admin event media. Exported for tests. */
export function buildEventMediaPath(
  userId: string,
  kind: EventMediaKind,
  stamp = Date.now(),
  mime = "image/jpeg"
): string {
  const ext = extensionForMime(mime);
  return `event-media/${userId}/${kind}_${stamp}.${ext}`;
}

function mapStorageError(error: unknown): Error {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: string }).code)
      : "";
  const message = error instanceof Error ? error.message : "Could not upload photo.";

  if (code.includes("unauthorized") || code.includes("permission") || /permission|unauthorized/i.test(message)) {
    return new Error(
      "Photo upload blocked by Firebase Storage rules. Ask an admin to redeploy storage.rules."
    );
  }
  if (code.includes("unauthenticated") || /sign in again/i.test(message)) {
    return new Error("Sign in again, then upload your photo.");
  }
  if (code.includes("retry-limit-exceeded") || code.includes("canceled")) {
    return new Error("Upload interrupted. Try again with a smaller image.");
  }
  if (error instanceof Error) return error;
  return new Error(message);
}

async function uploadBytesToPath(path: string, file: File): Promise<string> {
  const normalized = normalizeImageFile(file);
  const validationError = validateImageFile(normalized);
  if (validationError) throw new Error(validationError);

  try {
    const storage = getFirebaseStorage();
    const storageRef = ref(storage, path);
    await withUploadTimeout(
      uploadBytes(storageRef, normalized, {
        contentType: normalized.type,
        cacheControl: "public,max-age=3600",
      })
    );
    return await withUploadTimeout(getDownloadURL(storageRef));
  } catch (error: unknown) {
    throw mapStorageError(error);
  }
}

export async function uploadProfileImage(
  userId: string,
  file: File,
  kind: ProfileMediaKind = "avatar"
): Promise<string> {
  const uid = await requireAuthUidReady(userId);
  const normalized = normalizeImageFile(file);
  return uploadBytesToPath(
    buildProfileMediaPath(uid, kind, Date.now(), normalized.type),
    normalized
  );
}

export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  return uploadProfileImage(userId, file, "avatar");
}

export async function uploadEventImage(
  userId: string,
  file: File,
  kind: EventMediaKind = "cover"
): Promise<string> {
  const uid = await requireAuthUidReady(userId);
  const normalized = normalizeImageFile(file);
  return uploadBytesToPath(
    buildEventMediaPath(uid, kind, Date.now(), normalized.type),
    normalized
  );
}

export async function deleteStorageImageByUrl(imageUrl: string | null | undefined): Promise<void> {
  const trimmed = imageUrl?.trim();
  if (!trimmed) return;
  const isFirebase =
    trimmed.includes("firebasestorage.googleapis.com") ||
    trimmed.includes(".firebasestorage.app") ||
    trimmed.includes("storage.googleapis.com");
  if (!isFirebase) return;

  try {
    const storage = getFirebaseStorage();
    // Firebase 12+: full https/gs URLs go through ref(storage, url) — refFromURL was removed.
    const objectRef = ref(storage, trimmed);
    await deleteObject(objectRef);
  } catch {
    // Ignore missing/unauthorized deletes so edits still succeed.
  }
}

export async function deleteProfileAvatarByUrl(avatarUrl: string | null | undefined): Promise<void> {
  return deleteStorageImageByUrl(avatarUrl);
}
