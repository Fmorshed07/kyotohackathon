import { describe, expect, it } from "vitest";
import {
  buildEventMediaPath,
  buildProfileMediaPath,
  normalizeImageFile,
  validateImageFile,
} from "@/lib/profileMedia";

describe("profileMedia paths", () => {
  it("puts project cover/gallery under profile-media for signed-in owners", () => {
    expect(buildProfileMediaPath("uid-1", "cover", 1000, "image/png")).toBe(
      "profile-media/uid-1/cover_1000.png"
    );
    expect(buildProfileMediaPath("uid-1", "gallery", 1000, "image/webp")).toBe(
      "profile-media/uid-1/gallery_1000.webp"
    );
    expect(buildProfileMediaPath("uid-1", "avatar", 1000, "image/jpeg")).toBe(
      "profile-avatars/uid-1/avatar_1000.jpg"
    );
  });

  it("puts organiser logo under event-media", () => {
    expect(buildEventMediaPath("uid-2", "logo", 2000, "image/png")).toBe(
      "event-media/uid-2/logo_2000.png"
    );
  });
});

describe("validateImageFile", () => {
  it("rejects non-images and oversized files", () => {
    expect(validateImageFile(new File([""], "a.txt", { type: "text/plain" }))).toMatch(/JPG/);
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });
    expect(validateImageFile(big)).toMatch(/5 MB/);
  });

  it("accepts a normal png", () => {
    const file = new File([new Uint8Array(32)], "logo.png", { type: "image/png" });
    expect(validateImageFile(file)).toBeNull();
  });

  it("infers mime type from filename when the browser leaves type empty", () => {
    const raw = new File([new Uint8Array(32)], "organiser-logo.PNG", { type: "" });
    const normalized = normalizeImageFile(raw);
    expect(normalized.type).toBe("image/png");
    expect(validateImageFile(raw)).toBeNull();
  });
});
