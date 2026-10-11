import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  PeopleProfileSection,
  type PeopleProfileFormState,
} from "@/components/dashboard/PeopleProfileSection";
import { Button } from "@/components/ui/button";
import { useFormDraftPersistence } from "@/hooks/useFormDraftPersistence";
import { useHackathonSelection } from "@/hooks/useHackathonSelection";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { draftsDiffer, formDraftStorageKey } from "@/lib/formDrafts";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebaseClient";
import {
  getHackathonsByIds,
  getUserAllowedHackathonIds,
  HACKATHON_STORAGE_KEYS,
  isHackathonId,
  pickPreferredHackathonId,
  PORTAL_HACKATHONS,
  type HackathonId,
  type PortalHackathon,
} from "@/lib/hackathons";
import { fetchPortalHackathonCatalog } from "@/lib/aiHackathons";
import { getDashboardPathForUser } from "@/lib/portalRoutes";
import { deleteStorageImageByUrl, uploadProfileAvatar, uploadProfileImage } from "@/lib/profileMedia";
import type { UserProfile } from "@/types/portal";

const initialProfileForm: PeopleProfileFormState = {
  fullName: "",
  avatarUrl: "",
  coverUrl: "",
  galleryUrls: [],
  headline: "",
  bio: "",
  publicRole: "",
  experienceLevel: "",
  organization: "",
  location: "",
  timezone: "",
  languages: "",
  lookingFor: "",
  githubUsername: "",
  githubProfileUrl: "",
  linkedinUrl: "",
  portfolioUrl: "",
  xUrl: "",
  discordHandle: "",
  skills: "",
  interests: "",
};

const getStringField = (value: unknown) => (typeof value === "string" ? value : "");

const normalizeGithubUsername = (value: string) =>
  value
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .split(/[/?#]/)[0] ?? "";

const buildGithubProfileUrl = (username: string, fallbackUrl: string) => {
  const normalizedUsername = normalizeGithubUsername(username);
  if (normalizedUsername) return `https://github.com/${normalizedUsername}`;
  return fallbackUrl.trim();
};

const mapUserDocToProfile = (data: Record<string, unknown>): UserProfile => ({
  fullName: getStringField(data.fullName),
  avatarUrl: getStringField(data.avatarUrl),
  coverUrl: getStringField(data.coverUrl),
  galleryUrls: Array.isArray(data.galleryUrls)
    ? data.galleryUrls.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    : [],
  headline: getStringField(data.headline),
  bio: getStringField(data.bio),
  publicRole: getStringField(data.publicRole),
  experienceLevel: getStringField(data.experienceLevel),
  organization: getStringField(data.organization),
  location: getStringField(data.location),
  timezone: getStringField(data.timezone),
  languages: getStringField(data.languages),
  lookingFor: getStringField(data.lookingFor),
  githubUsername: getStringField(data.githubUsername),
  githubProfileUrl: getStringField(data.githubProfileUrl),
  linkedinUrl: getStringField(data.linkedinUrl),
  portfolioUrl: getStringField(data.portfolioUrl),
  xUrl: getStringField(data.xUrl),
  discordHandle: getStringField(data.discordHandle),
  skills: getStringField(data.skills),
  interests: getStringField(data.interests),
  profileUpdatedAt: getStringField(data.profileUpdatedAt),
});

const mapUserProfileToForm = (profile: UserProfile | undefined | null): PeopleProfileFormState => ({
  fullName: profile?.fullName ?? "",
  avatarUrl: profile?.avatarUrl ?? "",
  coverUrl: profile?.coverUrl ?? "",
  galleryUrls: Array.isArray(profile?.galleryUrls)
    ? profile.galleryUrls.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    : [],
  headline: profile?.headline ?? "",
  bio: profile?.bio ?? "",
  publicRole: profile?.publicRole ?? "",
  experienceLevel: profile?.experienceLevel ?? "",
  organization: profile?.organization ?? "",
  location: profile?.location ?? "",
  timezone: profile?.timezone ?? "",
  languages: profile?.languages ?? "",
  lookingFor: profile?.lookingFor ?? "",
  githubUsername: profile?.githubUsername ?? "",
  githubProfileUrl: profile?.githubProfileUrl ?? "",
  linkedinUrl: profile?.linkedinUrl ?? "",
  portfolioUrl: profile?.portfolioUrl ?? "",
  xUrl: profile?.xUrl ?? "",
  discordHandle: profile?.discordHandle ?? "",
  skills: profile?.skills ?? "",
  interests: profile?.interests ?? "",
});

export default function ParticipantProfilePage() {
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const userId = sessionUser?.id;
  const userRole = sessionUser?.role;
  const db = getFirestoreDb();
  const [eventCatalog, setEventCatalog] = useState<PortalHackathon[]>(PORTAL_HACKATHONS);
  const { selectedHackathonId, setSelectedHackathonId } = useHackathonSelection(
    HACKATHON_STORAGE_KEYS.participant,
    undefined,
    eventCatalog
  );

  const [profileForm, setProfileForm] = useState<PeopleProfileFormState>(initialProfileForm);
  const [profileBaseline, setProfileBaseline] = useState<PeopleProfileFormState>(initialProfileForm);
  const [enrolledHackathonIds, setEnrolledHackathonIds] = useState<HackathonId[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [profileLoadAttempt, setProfileLoadAttempt] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverMessage, setCoverMessage] = useState<string | null>(null);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [galleryMessage, setGalleryMessage] = useState<string | null>(null);
  const activeProfileRef = useRef<string | null>(null);
  const profileOperationRef = useRef(false);
  const profileFormRef = useRef(profileForm);
  profileFormRef.current = profileForm;

  const isActiveProfile = () => Boolean(
    userId && activeProfileRef.current === userId && getFirebaseAuth().currentUser?.uid === userId
  );

  const beginProfileOperation = () => {
    if (profileOperationRef.current || isLoadingProfile || profileLoadError || !isActiveProfile()) return false;
    profileOperationRef.current = true;
    return true;
  };

  const profileDraftKey = formDraftStorageKey(["participant-profile", sessionUser?.id]);

  const {
    isDirty: isProfileDraftDirty,
    clearDraft: clearProfileDraft,
    pendingRestore: pendingProfileRestore,
    consumePendingRestore: consumeProfileRestore,
  } = useFormDraftPersistence<PeopleProfileFormState>({
    storageKey: profileDraftKey,
    value: profileForm,
    enabled: userRole === "participant" && !isLoadingProfile && !profileLoadError,
    baseline: profileBaseline,
    debounceMs: 400,
  });

  useUnsavedChangesGuard(isProfileDraftDirty);

  const accessibleHackathonIds = useMemo(() => {
    const ids = new Set<HackathonId>([...enrolledHackathonIds]);
    for (const id of sessionUser?.hackathonIds ?? []) {
      if (isHackathonId(id)) ids.add(id);
    }
    if (sessionUser?.hackathonId && isHackathonId(sessionUser.hackathonId)) {
      ids.add(sessionUser.hackathonId);
    }
    return Array.from(ids);
  }, [enrolledHackathonIds, sessionUser]);

  const accessibleHackathons = useMemo(
    () => getHackathonsByIds(accessibleHackathonIds, eventCatalog),
    [accessibleHackathonIds, eventCatalog]
  );

  useEffect(() => {
    let cancelled = false;
    void fetchPortalHackathonCatalog(db)
      .then((catalog) => {
        if (!cancelled) setEventCatalog(catalog);
      })
      .catch(() => {
        // Keep static catalog fallback.
      });
    return () => {
      cancelled = true;
    };
  }, [db]);

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "participant") return;
    if (accessibleHackathonIds.length === 0) return;
    if (accessibleHackathonIds.includes(selectedHackathonId)) return;
    const fallback = pickPreferredHackathonId(accessibleHackathonIds, {
      storedId: selectedHackathonId,
      primaryId: sessionUser.hackathonId,
    });
    if (fallback) setSelectedHackathonId(fallback);
  }, [accessibleHackathonIds, selectedHackathonId, sessionUser, setSelectedHackathonId]);

  useEffect(() => {
    if (!userId || userRole !== "participant") return;
    let cancelled = false;
    activeProfileRef.current = userId;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      setProfileLoadError(null);
      try {
        const userSnap = await getDoc(doc(db, "users", userId));
        if (cancelled) return;
        const userData = userSnap.exists()
          ? (userSnap.data() as Record<string, unknown>)
          : undefined;
        const profile = userData ? mapUserDocToProfile(userData) : undefined;
        const allowedIds = getUserAllowedHackathonIds({
          hackathon_id:
            typeof userData?.hackathon_id === "string" ? userData.hackathon_id : null,
          hackathon_ids: userData?.hackathon_ids,
        });
        setEnrolledHackathonIds(allowedIds);
        const mapped = mapUserProfileToForm(profile);
        setProfileBaseline(mapped);
        setProfileForm(mapped);
      } catch {
        if (!cancelled) setProfileLoadError("Could not load your profile. Please try again before editing.");
      } finally {
        if (!cancelled) setIsLoadingProfile(false);
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
      activeProfileRef.current = null;
    };
  }, [userId, userRole, db, profileLoadAttempt]);

  useEffect(() => {
    if (!pendingProfileRestore) return;
    const restored = pendingProfileRestore.value;
    if (restored && typeof restored === "object" && !Array.isArray(restored)) {
      setProfileForm(mapUserProfileToForm(mapUserDocToProfile({ ...profileBaseline, ...restored })));
      setSaveMessage("Restored unsaved profile draft from this browser.");
    }
    consumeProfileRestore();
  }, [pendingProfileRestore, consumeProfileRestore, profileBaseline]);

  const persistProfileMedia = async (patch: {
    avatarUrl?: string;
    coverUrl?: string;
    galleryUrls?: string[];
  }) => {
    if (!sessionUser || !isActiveProfile()) return false;
    await setDoc(
      doc(db, "users", sessionUser.id),
      {
        ...patch,
        profileUpdatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    if (!isActiveProfile()) return false;
    setProfileForm((prev) => ({ ...prev, ...patch }));
    setProfileBaseline((prev) => ({ ...prev, ...patch }));
    return true;
  };

  const handleAvatarSelected = async (file: File) => {
    if (!sessionUser || !beginProfileOperation()) return;
    setIsUploadingAvatar(true);
    setAvatarMessage(null);
    const previousUrl = profileForm.avatarUrl;
    let uploadedUrl: string | null = null;
    try {
      const avatarUrl = await uploadProfileAvatar(sessionUser.id, file);
      uploadedUrl = avatarUrl;
      if (!await persistProfileMedia({ avatarUrl })) return;
      if (previousUrl && previousUrl !== avatarUrl) void deleteStorageImageByUrl(previousUrl);
      setAvatarMessage("Profile photo saved.");
    } catch (error: unknown) {
      if (uploadedUrl) void deleteStorageImageByUrl(uploadedUrl);
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Could not upload photo.";
      setAvatarMessage(message);
    } finally {
      profileOperationRef.current = false;
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!sessionUser || !beginProfileOperation()) return;
    setIsUploadingAvatar(true);
    setAvatarMessage(null);
    const previousUrl = profileForm.avatarUrl;
    try {
      if (!await persistProfileMedia({ avatarUrl: "" })) return;
      await deleteStorageImageByUrl(previousUrl);
      setAvatarMessage("Profile photo removed.");
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Could not remove photo.";
      setAvatarMessage(message);
    } finally {
      profileOperationRef.current = false;
      setIsUploadingAvatar(false);
    }
  };

  const handleCoverSelected = async (file: File) => {
    if (!sessionUser || !beginProfileOperation()) return;
    setIsUploadingCover(true);
    setCoverMessage(null);
    const previousUrl = profileForm.coverUrl;
    let uploadedUrl: string | null = null;
    try {
      const coverUrl = await uploadProfileImage(sessionUser.id, file, "cover");
      uploadedUrl = coverUrl;
      if (!await persistProfileMedia({ coverUrl })) return;
      if (previousUrl && previousUrl !== coverUrl) void deleteStorageImageByUrl(previousUrl);
      setCoverMessage("Banner saved.");
    } catch (error: unknown) {
      if (uploadedUrl) void deleteStorageImageByUrl(uploadedUrl);
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Could not upload banner.";
      setCoverMessage(message);
    } finally {
      profileOperationRef.current = false;
      setIsUploadingCover(false);
    }
  };

  const handleRemoveCover = async () => {
    if (!sessionUser || !beginProfileOperation()) return;
    setIsUploadingCover(true);
    setCoverMessage(null);
    const previousUrl = profileForm.coverUrl;
    try {
      if (!await persistProfileMedia({ coverUrl: "" })) return;
      await deleteStorageImageByUrl(previousUrl);
      setCoverMessage("Banner removed.");
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Could not remove banner.";
      setCoverMessage(message);
    } finally {
      profileOperationRef.current = false;
      setIsUploadingCover(false);
    }
  };

  const handleGallerySelected = async (files: File[]) => {
    if (!sessionUser || files.length === 0) return;
    const remainingSlots = 12 - profileForm.galleryUrls.length;
    if (remainingSlots <= 0) {
      setGalleryMessage("Gallery limit is 12 photos.");
      return;
    }
    if (!beginProfileOperation()) return;

    setIsUploadingGallery(true);
    setGalleryMessage(null);
    const uploadedUrls: string[] = [];
    try {
      const nextUrls = [...profileForm.galleryUrls];
      for (const file of files.slice(0, remainingSlots)) {
        if (!isActiveProfile()) return;
        const url = await uploadProfileImage(sessionUser.id, file, "gallery");
        uploadedUrls.push(url);
        nextUrls.push(url);
      }
      const galleryUrls = nextUrls.slice(0, 12);
      if (!await persistProfileMedia({ galleryUrls })) return;
      setGalleryMessage(
        files.length > remainingSlots
          ? `Added ${remainingSlots} photo${remainingSlots === 1 ? "" : "s"} (gallery limit is 12).`
          : "Gallery photo added."
      );
    } catch (error: unknown) {
      for (const url of uploadedUrls) void deleteStorageImageByUrl(url);
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Could not upload gallery photo.";
      setGalleryMessage(message);
    } finally {
      profileOperationRef.current = false;
      setIsUploadingGallery(false);
    }
  };

  const handleRemoveGalleryImage = async (url: string) => {
    if (!sessionUser || !beginProfileOperation()) return;
    setIsUploadingGallery(true);
    setGalleryMessage(null);
    try {
      const galleryUrls = profileForm.galleryUrls.filter((item) => item !== url);
      if (!await persistProfileMedia({ galleryUrls })) return;
      await deleteStorageImageByUrl(url);
      setGalleryMessage("Gallery photo removed.");
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Could not remove gallery photo.";
      setGalleryMessage(message);
    } finally {
      profileOperationRef.current = false;
      setIsUploadingGallery(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!sessionUser || !beginProfileOperation()) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const normalizedGithubUsername = normalizeGithubUsername(profileForm.githubUsername);
      const payload = {
        fullName: profileForm.fullName.trim(),
        avatarUrl: profileForm.avatarUrl.trim(),
        coverUrl: profileForm.coverUrl.trim(),
        galleryUrls: profileForm.galleryUrls,
        headline: profileForm.headline.trim(),
        bio: profileForm.bio.trim(),
        publicRole: profileForm.publicRole.trim(),
        experienceLevel: profileForm.experienceLevel.trim(),
        organization: profileForm.organization.trim(),
        location: profileForm.location.trim(),
        timezone: profileForm.timezone.trim(),
        languages: profileForm.languages.trim(),
        lookingFor: profileForm.lookingFor.trim(),
        githubUsername: normalizedGithubUsername,
        githubProfileUrl: buildGithubProfileUrl(
          normalizedGithubUsername,
          profileForm.githubProfileUrl
        ),
        linkedinUrl: profileForm.linkedinUrl.trim(),
        portfolioUrl: profileForm.portfolioUrl.trim(),
        xUrl: profileForm.xUrl.trim(),
        discordHandle: profileForm.discordHandle.trim(),
        skills: profileForm.skills.trim(),
        interests: profileForm.interests.trim(),
        profileUpdatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "users", sessionUser.id), payload, { merge: true });
      if (!isActiveProfile()) return;
      const mapped = mapUserProfileToForm(payload);
      const hasNewerEdits = draftsDiffer(profileFormRef.current, profileForm);
      setProfileBaseline(mapped);
      setProfileForm((current) => ({
        ...current,
        ...Object.fromEntries(Object.entries(mapped).filter(([key]) => {
          const field = key as keyof PeopleProfileFormState;
          return !draftsDiffer(current[field], profileForm[field]);
        })),
      }));
      if (!hasNewerEdits) clearProfileDraft();
      setSaveMessage(hasNewerEdits ? "Profile saved. Your newer edits still need to be saved." : "Profile saved successfully.");
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Could not save profile.";
      setSaveMessage(message);
    } finally {
      profileOperationRef.current = false;
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!sessionUser) {
    return <Navigate to="/signin" replace />;
  }

  if (sessionUser.role === "judge" || sessionUser.role === "mentor") {
    return (
      <Navigate
        to={getDashboardPathForUser(sessionUser.role, sessionUser.judgeApprovalStatus)}
        replace
      />
    );
  }

  if (sessionUser.role !== "participant") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout
      sessionUser={sessionUser}
      role="participant"
      onSignOut={signOut}
      hackathons={accessibleHackathons}
      selectedHackathonId={selectedHackathonId}
      onHackathonChange={setSelectedHackathonId}
    >
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/dashboard/participant">
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>
        </Button>
      </div>

      {profileLoadError ? (
        <div role="alert" className="space-y-3">
          <p>{profileLoadError}</p>
          <Button onClick={() => setProfileLoadAttempt((attempt) => attempt + 1)}>Retry loading profile</Button>
        </div>
      ) : <PeopleProfileSection
        form={profileForm}
        setForm={setProfileForm}
        isLoading={isLoadingProfile}
        isSaving={isSaving}
        saveMessage={saveMessage}
        isUploadingAvatar={isUploadingAvatar}
        avatarMessage={avatarMessage}
        onAvatarSelected={handleAvatarSelected}
        onRemoveAvatar={handleRemoveAvatar}
        isUploadingCover={isUploadingCover}
        coverMessage={coverMessage}
        onCoverSelected={handleCoverSelected}
        onRemoveCover={handleRemoveCover}
        isUploadingGallery={isUploadingGallery}
        galleryMessage={galleryMessage}
        onGallerySelected={handleGallerySelected}
        onRemoveGalleryImage={handleRemoveGalleryImage}
        onSave={handleSaveProfile}
      />}
    </DashboardLayout>
  );
}
