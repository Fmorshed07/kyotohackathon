import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebaseClient";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type ProfileMediaKind = "avatar" | "cover" | "gallery";
export type EventMediaKind = "cover" | "banner" | "gallery" | "guest";

const extensionForMime = (mime: string) => {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
};

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Use a JPG, PNG, WebP, or GIF image.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Keep the image under 5 MB.";
  }
  return null;
}

/** @deprecated Prefer validateImageFile */
export function validateProfileAvatarFile(file: File): string | null {
  return validateImageFile(file);
}

async function uploadBytesToPath(path: string, file: File): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  try {
    const storage = getFirebaseStorage();
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, {
      contentType: file.type,
      cacheControl: "public,max-age=3600",
    });
    return getDownloadURL(storageRef);
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code.includes("unauthorized") || code.includes("permission")) {
      throw new Error(
        "Photo upload blocked by Firebase Storage rules. Deploy storage.rules so authenticated users can write images."
      );
    }
    if (code.includes("unauthenticated")) {
      throw new Error("Sign in again, then upload your photo.");
    }
    throw error instanceof Error ? error : new Error("Could not upload photo.");
  }
}

export async function uploadProfileImage(
  userId: string,
  file: File,
  kind: ProfileMediaKind = "avatar"
): Promise<string> {
  const stamp = Date.now();
  const ext = extensionForMime(file.type);
  const path =
    kind === "avatar"
      ? `profile-avatars/${userId}/avatar_${stamp}.${ext}`
      : kind === "cover"
        ? `profile-media/${userId}/cover_${stamp}.${ext}`
        : `profile-media/${userId}/gallery_${stamp}.${ext}`;
  return uploadBytesToPath(path, file);
}

export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  return uploadProfileImage(userId, file, "avatar");
}

export async function uploadEventImage(
  userId: string,
  file: File,
  kind: EventMediaKind = "cover"
): Promise<string> {
  const stamp = Date.now();
  const ext = extensionForMime(file.type);
  const path = `event-media/${userId}/${kind}_${stamp}.${ext}`;
  return uploadBytesToPath(path, file);
}

export async function deleteStorageImageByUrl(imageUrl: string | null | undefined): Promise<void> {
  const trimmed = imageUrl?.trim();
  if (!trimmed || !trimmed.includes("firebasestorage.googleapis.com")) return;

  try {
    const storage = getFirebaseStorage();
    await deleteObject(ref(storage, trimmed));
  } catch {
    // Ignore missing/unauthorized deletes so edits still succeed.
  }
}

export async function deleteProfileAvatarByUrl(avatarUrl: string | null | undefined): Promise<void> {
  return deleteStorageImageByUrl(avatarUrl);
}
