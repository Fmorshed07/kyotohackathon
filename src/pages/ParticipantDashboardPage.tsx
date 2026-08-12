import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { getDashboardPathForUser } from "@/lib/portalRoutes";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { formDraftStorageKey } from "@/lib/formDrafts";
import { uploadProfileImage } from "@/lib/profileMedia";
import { useFormDraftPersistence } from "@/hooks/useFormDraftPersistence";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useHackathonSelection } from "@/hooks/useHackathonSelection";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ParticipantDashboard } from "@/components/dashboard/ParticipantDashboard";
import {
  buildParticipantHackathonSummaries,
  collectAccessibleHackathonIds,
  filterSubmissionsByHackathon,
  getHackathonsByIds,
  getSubmissionHackathonId,
  getUserAllowedHackathonIds,
  getHackathonPublicUrl,
  HACKATHON_STORAGE_KEYS,
  isHackathonId,
  nextEnrolledHackathonIds,
  pickPreferredHackathonId,
  PORTAL_HACKATHONS,
  resolvePortalHackathon,
  type HackathonId,
  type PortalHackathon,
} from "@/lib/hackathons";
import {
  fetchJoinablePortalHackathons,
  fetchPortalHackathonCatalog,
} from "@/lib/aiHackathons";
import { buildInviteUrl } from "@/lib/inviteTokens";
import {
  createTeamInvite,
  listTeamMembershipsForSubmission,
  revokeTeamInvite,
} from "@/lib/portalInvites";
import { queueParticipantEmail } from "@/lib/participantEmail";
import {
  closeOwnOpenPosts,
  createTeammatePost,
  deleteTeammatePost,
  listTeammatePosts,
  updateTeammatePost,
} from "@/lib/teammatePosts";
import type { Submission, TeamMemberRecord, TeammatePost, UserProfile } from "@/types/portal";

const initialParticipantForm = {
  title: "",
  shortDescription: "",
  projectUrl: "",
  submissionPdfUrl: "",
  demoVideoUrl: "",
  allowPublicPreview: false,
  projectCoverUrl: "",
  projectGalleryUrls: [] as string[],
  teamName: "",
  memberNames: "",
  fullName: "",
  avatarUrl: "",
  coverUrl: "",
  galleryUrls: [] as string[],
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

const emptyProjectFields = {
  title: "",
  shortDescription: "",
  projectUrl: "",
  submissionPdfUrl: "",
  demoVideoUrl: "",
  allowPublicPreview: false,
  projectCoverUrl: "",
  projectGalleryUrls: [] as string[],
  teamName: "",
  memberNames: "",
};

type ParticipantProjectDraft = typeof emptyProjectFields;

const pickProjectDraft = (form: typeof initialParticipantForm): ParticipantProjectDraft => ({
  title: form.title,
  shortDescription: form.shortDescription,
  projectUrl: form.projectUrl,
  submissionPdfUrl: form.submissionPdfUrl,
  demoVideoUrl: form.demoVideoUrl,
  allowPublicPreview: form.allowPublicPreview,
  projectCoverUrl: form.projectCoverUrl,
  projectGalleryUrls: form.projectGalleryUrls,
  teamName: form.teamName,
  memberNames: form.memberNames,
});

const projectDraftHasContent = (draft: ParticipantProjectDraft) =>
  Boolean(
    draft.title.trim() ||
      draft.shortDescription.trim() ||
      draft.projectUrl.trim() ||
      draft.submissionPdfUrl.trim() ||
      draft.demoVideoUrl.trim() ||
      draft.projectCoverUrl.trim() ||
      draft.projectGalleryUrls.length > 0 ||
      draft.teamName.trim() ||
      draft.memberNames.trim() ||
      draft.allowPublicPreview
  );

const getStringField = (value: unknown) => (typeof value === "string" ? value : "");

const mapUserProfileToForm = (profile: UserProfile | undefined | null) => ({
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

const sortSubmissionsNewestFirst = (submissions: Submission[]) =>
  submissions.slice().sort((left, right) => {
    const leftDate = Date.parse(left.created_at ?? "");
    const rightDate = Date.parse(right.created_at ?? "");
    if (Number.isNaN(leftDate) && Number.isNaN(rightDate)) return 0;
    if (Number.isNaN(leftDate)) return 1;
    if (Number.isNaN(rightDate)) return -1;
    return rightDate - leftDate;
  });

export default function ParticipantDashboardPage() {
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const [searchParams] = useSearchParams();
  const db = getFirestoreDb();
  const [eventCatalog, setEventCatalog] = useState<PortalHackathon[]>(PORTAL_HACKATHONS);
  const didApplyPreferredEvent = useRef(false);
  const [liveJoinableHackathons, setLiveJoinableHackathons] = useState<PortalHackathon[]>([]);
  const { selectedHackathonId, setSelectedHackathonId } = useHackathonSelection(
    HACKATHON_STORAGE_KEYS.participant,
    undefined,
    eventCatalog,
    { preferCurrent: true },
  );
  const selectedHackathon = useMemo(
    () => resolvePortalHackathon(selectedHackathonId, eventCatalog),
    [eventCatalog, selectedHackathonId]
  );

  const [allParticipantSubmissions, setAllParticipantSubmissions] = useState<Submission[]>([]);
  const [participantSubmission, setParticipantSubmission] = useState<Submission | null>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [participantForm, setParticipantForm] = useState(initialParticipantForm);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [enrolledHackathonIds, setEnrolledHackathonIds] = useState<HackathonId[]>([]);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [isJoiningHackathon, setIsJoiningHackathon] = useState(false);
  const [teammatePosts, setTeammatePosts] = useState<TeammatePost[]>([]);
  const [isLoadingTeammatePosts, setIsLoadingTeammatePosts] = useState(false);
  const [isSavingTeammatePost, setIsSavingTeammatePost] = useState(false);
  const [teammatePostMessage, setTeammatePostMessage] = useState<string | null>(null);
  const [teamInviteUrl, setTeamInviteUrl] = useState<string | null>(null);
  const [teamInviteToken, setTeamInviteToken] = useState<string | null>(null);
  const [linkedTeamMembers, setLinkedTeamMembers] = useState<TeamMemberRecord[]>([]);
  const [isTeamInviteBusy, setIsTeamInviteBusy] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<string | null>(null);
  const suppressFormSyncRef = useRef(false);
  const firestoreAutosaveTimerRef = useRef<number | null>(null);
  const isAutosavingRef = useRef(false);

  const mapSubmissionToForm = (data: Submission): ParticipantProjectDraft => ({
    title: data.title ?? "",
    shortDescription: data.short_description ?? "",
    projectUrl: data.project_url ?? "",
    submissionPdfUrl: data.submission_pdf_url ?? "",
    demoVideoUrl: data.demo_video_url ?? "",
    allowPublicPreview: data.public_preview_consent === true,
    projectCoverUrl: data.cover_url ?? "",
    projectGalleryUrls: Array.isArray(data.gallery_urls)
      ? data.gallery_urls.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
      : [],
    teamName: data.team_name ?? "",
    memberNames: data.member_names ?? "",
  });

  const requestedHackathonId = useMemo(() => {
    const value = searchParams.get("hackathon") ?? searchParams.get("event");
    return value && isHackathonId(value) ? value : null;
  }, [searchParams]);

  const accessibleHackathonIds = useMemo(
    () =>
      collectAccessibleHackathonIds({
        enrolledIds: enrolledHackathonIds,
        sessionHackathonId: sessionUser?.hackathonId,
        sessionHackathonIds: sessionUser?.hackathonIds,
        submissions: allParticipantSubmissions,
      }),
    [allParticipantSubmissions, enrolledHackathonIds, sessionUser]
  );

  const accessibleHackathons = useMemo(
    () => getHackathonsByIds(accessibleHackathonIds, eventCatalog),
    [accessibleHackathonIds, eventCatalog]
  );

  const participantSubmissions = useMemo(
    () =>
      sortSubmissionsNewestFirst(
        filterSubmissionsByHackathon(allParticipantSubmissions, selectedHackathonId)
      ),
    [allParticipantSubmissions, selectedHackathonId]
  );

  const hackathonSummaries = useMemo(
    () =>
      buildParticipantHackathonSummaries(
        allParticipantSubmissions,
        enrolledHackathonIds,
        eventCatalog
      ),
    [allParticipantSubmissions, enrolledHackathonIds, eventCatalog]
  );

  const joinableHackathons = useMemo(() => {
    const enrolled = new Set(accessibleHackathonIds);
    return liveJoinableHackathons.filter((hackathon) => !enrolled.has(hackathon.id));
  }, [accessibleHackathonIds, liveJoinableHackathons]);

  useEffect(() => {
    let cancelled = false;
    const loadEvents = async () => {
      try {
        const [catalog, joinable] = await Promise.all([
          fetchPortalHackathonCatalog(db),
          fetchJoinablePortalHackathons(db),
        ]);
        if (cancelled) return;
        setEventCatalog(catalog);
        setLiveJoinableHackathons(joinable);
      } catch {
        // Keep static catalog fallbacks.
      }
    };
    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, [db]);

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "participant") return;
    if (isLoadingWorkspace) return;
    if (accessibleHackathonIds.length === 0) return;

    if (requestedHackathonId && accessibleHackathonIds.includes(requestedHackathonId)) {
      didApplyPreferredEvent.current = true;
      if (selectedHackathonId !== requestedHackathonId) {
        setSelectedHackathonId(requestedHackathonId);
      }
      return;
    }

    if (didApplyPreferredEvent.current) {
      if (!accessibleHackathonIds.includes(selectedHackathonId)) {
        const fallback = pickPreferredHackathonId(accessibleHackathonIds, {
          primaryId: sessionUser.hackathonId,
          submissionHackathonIds: allParticipantSubmissions.map(getSubmissionHackathonId),
        });
        if (fallback) setSelectedHackathonId(fallback);
      }
      return;
    }

    const preferred = pickPreferredHackathonId(accessibleHackathonIds, {
      requestedId: requestedHackathonId,
      storedId: selectedHackathonId,
      primaryId: sessionUser.hackathonId,
      submissionHackathonIds: allParticipantSubmissions.map(getSubmissionHackathonId),
    });
    didApplyPreferredEvent.current = true;
    if (preferred && preferred !== selectedHackathonId) {
      setSelectedHackathonId(preferred);
    }
  }, [
    accessibleHackathonIds,
    allParticipantSubmissions,
    isLoadingWorkspace,
    requestedHackathonId,
    selectedHackathonId,
    sessionUser,
    setSelectedHackathonId,
  ]);

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "participant") return;

    const loadParticipantWorkspace = async () => {
      setIsLoadingWorkspace(true);
      try {
        const userSnap = await getDoc(doc(db, "users", sessionUser.id));
        const userData = userSnap.exists()
          ? (userSnap.data() as Record<string, unknown>)
          : undefined;
        const profile = userData ? mapUserDocToProfile(userData) : undefined;
        const allowedIds = getUserAllowedHackathonIds({
          hackathon_id:
            typeof userData?.hackathon_id === "string" ? userData.hackathon_id : null,
          hackathon_ids: userData?.hackathon_ids,
        });

        setUserProfile(profile ?? null);
        setEnrolledHackathonIds(allowedIds);

        const submissionsQuery = query(
          collection(db, "submissions"),
          where("user_id", "==", sessionUser.id)
        );
        const submissionsSnap = await getDocs(submissionsQuery);
        const submissions = sortSubmissionsNewestFirst(
          submissionsSnap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Submission, "id">),
          })) as Submission[]
        );

        setAllParticipantSubmissions(submissions);
        setParticipantForm((current) => ({
          ...current,
          ...mapUserProfileToForm(profile),
        }));
      } catch {
        // ignore load errors and keep editable form state
      } finally {
        setIsLoadingWorkspace(false);
      }
    };

    void loadParticipantWorkspace();
  }, [sessionUser, db]);

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "participant") return;
    let cancelled = false;
    const loadPosts = async () => {
      setIsLoadingTeammatePosts(true);
      try {
        const posts = await listTeammatePosts(db, selectedHackathonId);
        if (!cancelled) setTeammatePosts(posts);
      } catch {
        if (!cancelled) setTeammatePosts([]);
      } finally {
        if (!cancelled) setIsLoadingTeammatePosts(false);
      }
    };
    void loadPosts();
    return () => {
      cancelled = true;
    };
  }, [sessionUser, db, selectedHackathonId]);

  useEffect(() => {
    if (!activeSubmissionId) {
      setLinkedTeamMembers([]);
      setTeamInviteUrl(null);
      setTeamInviteToken(null);
      return;
    }
    let cancelled = false;
    const loadMembers = async () => {
      try {
        const fromSubmission = participantSubmission?.team_members ?? [];
        const fromCollection = await listTeamMembershipsForSubmission(db, activeSubmissionId);
        if (cancelled) return;
        const byId = new Map<string, TeamMemberRecord>();
        for (const member of [...fromSubmission, ...fromCollection]) {
          if (member.user_id) byId.set(member.user_id, member);
        }
        setLinkedTeamMembers(Array.from(byId.values()));
      } catch {
        if (!cancelled) setLinkedTeamMembers(participantSubmission?.team_members ?? []);
      }
    };
    void loadMembers();
    return () => {
      cancelled = true;
    };
  }, [activeSubmissionId, db, participantSubmission]);

  useEffect(() => {
    if (suppressFormSyncRef.current) {
      suppressFormSyncRef.current = false;
      return;
    }

    const scoped = participantSubmissions;
    if (scoped.length > 0) {
      const activeSubmission =
        scoped.find((submission) => submission.id === activeSubmissionId) ?? scoped[0];
      setActiveSubmissionId(activeSubmission.id);
      setParticipantSubmission(activeSubmission);
      setParticipantForm((current) => ({
        ...current,
        ...mapSubmissionToForm(activeSubmission),
        ...mapUserProfileToForm(userProfile),
      }));
      return;
    }

    setActiveSubmissionId(null);
    setParticipantSubmission(null);
    setParticipantForm((current) => ({
      ...current,
      ...emptyProjectFields,
      ...mapUserProfileToForm(userProfile),
    }));
  }, [participantSubmissions, selectedHackathonId, userProfile]);

  const projectDraftValue = useMemo(
    () => pickProjectDraft(participantForm),
    [participantForm]
  );

  const projectDraftBaseline = useMemo(
    () => (participantSubmission ? mapSubmissionToForm(participantSubmission) : emptyProjectFields),
    [participantSubmission]
  );

  const projectDraftKey = formDraftStorageKey([
    "participant-project",
    sessionUser?.id,
    selectedHackathonId,
    activeSubmissionId ?? "new",
  ]);

  const {
    draftSavedAt,
    isDirty: isProjectDraftDirty,
    clearDraft: clearProjectDraft,
    flushDraft: flushProjectDraft,
    pendingRestore: pendingProjectRestore,
    consumePendingRestore: consumeProjectRestore,
  } = useFormDraftPersistence<ParticipantProjectDraft>({
    storageKey: projectDraftKey,
    value: projectDraftValue,
    enabled: Boolean(sessionUser?.role === "participant") && !isLoadingWorkspace,
    baseline: projectDraftBaseline,
    debounceMs: 400,
  });

  useUnsavedChangesGuard(isProjectDraftDirty && selectedHackathon.status !== "past");

  useEffect(() => {
    if (!pendingProjectRestore) return;
    const restored = pendingProjectRestore.value as ParticipantProjectDraft;
    setParticipantForm((current) => ({ ...current, ...restored }));
    setAutosaveStatus("Restored unsaved draft from this browser.");
    consumeProjectRestore();
  }, [pendingProjectRestore, consumeProjectRestore]);

  useEffect(() => {
    if (!draftSavedAt || !isProjectDraftDirty) return;
    setAutosaveStatus("Draft saved on this device.");
  }, [draftSavedAt, isProjectDraftDirty]);

  const handleSelectSubmission = (submissionId: string) => {
    const selectedSubmission = participantSubmissions.find(
      (submission) => submission.id === submissionId
    );
    if (!selectedSubmission) return;

    flushProjectDraft();
    setActiveSubmissionId(selectedSubmission.id);
    setParticipantSubmission(selectedSubmission);
    setParticipantForm((current) => ({
      ...current,
      ...mapSubmissionToForm(selectedSubmission),
    }));
    setSubmissionMessage(null);
    setAutosaveStatus(null);
  };

  const handleUploadProjectImage = async (file: File, kind: "cover" | "gallery") => {
    if (!sessionUser) throw new Error("Sign in to upload project images.");
    return uploadProfileImage(sessionUser.id, file, kind === "cover" ? "cover" : "gallery");
  };

  const persistParticipantProject = async (options: {
    announce?: boolean;
    queueEmail?: boolean;
  }) => {
    if (!sessionUser) return null;

    const hasScopedSubmission =
      participantSubmission &&
      activeSubmissionId &&
      getSubmissionHackathonId(participantSubmission) === selectedHackathonId;

    const now = new Date().toISOString();
    const payload = {
      user_id: sessionUser.id,
      hackathon_id: selectedHackathonId,
      title: participantForm.title,
      short_description: participantForm.shortDescription,
      project_url: participantForm.projectUrl,
      submission_pdf_url: participantForm.submissionPdfUrl,
      demo_video_url: participantForm.demoVideoUrl,
      public_preview_consent: participantForm.allowPublicPreview,
      cover_url: participantForm.projectCoverUrl,
      gallery_urls: participantForm.projectGalleryUrls,
      team_name: participantForm.teamName,
      member_names: participantForm.memberNames,
      role: "participant",
      created_at: hasScopedSubmission
        ? (participantSubmission?.created_at ?? now)
        : now,
      updated_at: now,
    };
    const nextHackathonIds = nextEnrolledHackathonIds(
      enrolledHackathonIds,
      selectedHackathonId
    );

    const submissionRef = hasScopedSubmission
      ? doc(db, "submissions", activeSubmissionId!)
      : doc(collection(db, "submissions"));
    const userRef = doc(db, "users", sessionUser.id);

    if (hasScopedSubmission) {
      await setDoc(submissionRef, payload, { merge: true });
    } else {
      await setDoc(submissionRef, payload);
    }
    await setDoc(
      userRef,
      {
        hackathon_id: selectedHackathonId,
        hackathon_ids: nextHackathonIds,
      },
      { merge: true }
    );

    const publicProjectRef = doc(db, "public_projects", submissionRef.id);
    if (participantForm.allowPublicPreview) {
      await setDoc(publicProjectRef, {
        owner_id: sessionUser.id,
        user_id: sessionUser.id,
        hackathon_id: selectedHackathonId,
        title: payload.title,
        short_description: payload.short_description,
        project_url: payload.project_url,
        submission_pdf_url: payload.submission_pdf_url,
        demo_video_url: payload.demo_video_url,
        cover_url: payload.cover_url,
        gallery_urls: payload.gallery_urls,
        team_name: payload.team_name,
        member_names: payload.member_names,
        created_at: payload.created_at,
        updated_at: payload.updated_at,
        public_preview_consent: true,
      });
    } else {
      await deleteDoc(publicProjectRef).catch(() => undefined);
    }

    setEnrolledHackathonIds(nextHackathonIds);

    const submissionSnap = await getDoc(submissionRef);
    if (!submissionSnap.exists()) return null;

    const data = {
      id: submissionSnap.id,
      ...(submissionSnap.data() as Omit<Submission, "id">),
    } as Submission;

    suppressFormSyncRef.current = true;
    setActiveSubmissionId(data.id);
    setParticipantSubmission(data);
    setAllParticipantSubmissions((current) => {
      const existingIndex = current.findIndex((submission) => submission.id === data.id);
      if (existingIndex === -1) {
        return [data, ...current];
      }
      const updated = [...current];
      updated[existingIndex] = data;
      return updated;
    });

    clearProjectDraft();

    if (options.announce !== false) {
      setSubmissionMessage("Submission saved successfully.");
    } else {
      setAutosaveStatus("Draft saved to cloud.");
    }

    if (options.queueEmail) {
      queueParticipantEmail({
        type: hasScopedSubmission ? "submission_updated" : "submission_created",
        title: data.title ?? payload.title,
        teamName: data.team_name ?? payload.team_name,
        hackathonName: selectedHackathon.name,
      });
    }

    return data;
  };

  const handleJoinHackathon = async (hackathonId: HackathonId) => {
    if (!sessionUser) return;
    const joinable = liveJoinableHackathons.some((entry) => entry.id === hackathonId);
    if (!joinable) {
      setSubmissionMessage("That event is not open for new participants.");
      return;
    }

    setIsJoiningHackathon(true);
    setSubmissionMessage(null);
    try {
      const nextHackathonIds = nextEnrolledHackathonIds(enrolledHackathonIds, hackathonId);
      await setDoc(
        doc(db, "users", sessionUser.id),
        {
          hackathon_id: hackathonId,
          hackathon_ids: nextHackathonIds,
        },
        { merge: true }
      );
      setEnrolledHackathonIds(nextHackathonIds);
      setSelectedHackathonId(hackathonId);
      setSubmissionMessage(
        `Joined ${resolvePortalHackathon(hackathonId, eventCatalog).name}.`
      );
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Could not join that event.";
      setSubmissionMessage(message);
    } finally {
      setIsJoiningHackathon(false);
    }
  };

  const handleParticipantSubmit = async () => {
    if (!sessionUser) return;

    setIsSubmittingProject(true);
    setSubmissionMessage(null);
    try {
      await persistParticipantProject({ announce: true, queueEmail: true });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "An error occurred while saving your submission.";
      setSubmissionMessage(message);
    } finally {
      setIsSubmittingProject(false);
    }
  };

  // Cloud autosave so drafts survive sudden closes even across devices.
  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "participant") return;
    if (isLoadingWorkspace || selectedHackathon.status === "past") return;
    if (!isProjectDraftDirty || !projectDraftHasContent(projectDraftValue)) return;
    if (isSubmittingProject || isAutosavingRef.current) return;

    if (firestoreAutosaveTimerRef.current) {
      window.clearTimeout(firestoreAutosaveTimerRef.current);
    }

    firestoreAutosaveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        if (isAutosavingRef.current || isSubmittingProject) return;
        isAutosavingRef.current = true;
        try {
          await persistParticipantProject({ announce: false, queueEmail: false });
        } catch {
          // Keep local draft; cloud autosave can retry on next edit.
          setAutosaveStatus("Draft saved on this device (cloud sync pending).");
        } finally {
          isAutosavingRef.current = false;
        }
      })();
    }, 2500);

    return () => {
      if (firestoreAutosaveTimerRef.current) {
        window.clearTimeout(firestoreAutosaveTimerRef.current);
      }
    };
    // persistParticipantProject closes over latest form state intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sessionUser,
    isLoadingWorkspace,
    selectedHackathon.status,
    isProjectDraftDirty,
    projectDraftValue,
    isSubmittingProject,
  ]);

  const handleCreateTeammatePost = async (input: {
    looking_for: string;
    message: string;
    skills: string;
    author_name: string;
    author_email: string;
  }) => {
    if (!sessionUser || selectedHackathon.status === "past") return;
    if (!input.looking_for.trim() || !input.author_email.trim()) {
      setTeammatePostMessage("Looking-for and email are required.");
      return;
    }
    setIsSavingTeammatePost(true);
    setTeammatePostMessage(null);
    try {
      await closeOwnOpenPosts(db, sessionUser.id, selectedHackathonId);
      const post = await createTeammatePost(db, sessionUser.id, {
        hackathon_id: selectedHackathonId,
        author_name: input.author_name || participantForm.fullName || sessionUser.email,
        author_email: input.author_email || sessionUser.email,
        looking_for: input.looking_for,
        message: input.message,
        skills: input.skills,
      });
      setTeammatePosts((prev) => [post, ...prev.filter((entry) => entry.user_id !== sessionUser.id)]);
      setTeammatePostMessage("Your teammate request is live for all participants.");
    } catch (error: unknown) {
      setTeammatePostMessage(
        error instanceof Error ? error.message : "Unable to publish teammate request."
      );
    } finally {
      setIsSavingTeammatePost(false);
    }
  };

  const handleCloseTeammatePost = async (postId: string) => {
    setIsSavingTeammatePost(true);
    try {
      await updateTeammatePost(db, postId, { status: "closed" });
      setTeammatePosts((prev) => prev.filter((post) => post.id !== postId));
      setTeammatePostMessage("Request closed.");
    } catch (error: unknown) {
      setTeammatePostMessage(
        error instanceof Error ? error.message : "Unable to close request."
      );
    } finally {
      setIsSavingTeammatePost(false);
    }
  };

  const handleDeleteTeammatePost = async (postId: string) => {
    setIsSavingTeammatePost(true);
    try {
      await deleteTeammatePost(db, postId);
      setTeammatePosts((prev) => prev.filter((post) => post.id !== postId));
      setTeammatePostMessage("Request deleted.");
    } catch (error: unknown) {
      setTeammatePostMessage(
        error instanceof Error ? error.message : "Unable to delete request."
      );
    } finally {
      setIsSavingTeammatePost(false);
    }
  };

  const handleGenerateTeamInvite = async () => {
    if (!sessionUser || !activeSubmissionId) {
      setSubmissionMessage("Save your project first, then create an invite link.");
      return;
    }
    setIsTeamInviteBusy(true);
    setSubmissionMessage(null);
    try {
      if (teamInviteToken) {
        await revokeTeamInvite(db, teamInviteToken).catch(() => undefined);
      }
      const invite = await createTeamInvite(db, {
        submissionId: activeSubmissionId,
        ownerId: sessionUser.id,
        hackathonId: selectedHackathonId,
        teamName: participantForm.teamName || participantForm.title || "My team",
        ownerName: participantForm.fullName || sessionUser.email,
        ownerEmail: sessionUser.email,
      });
      setTeamInviteToken(invite.token);
      setTeamInviteUrl(buildInviteUrl("team", invite.token));
      setSubmissionMessage("Team invite link ready — share it with teammates.");
    } catch (error: unknown) {
      setSubmissionMessage(
        error instanceof Error ? error.message : "Unable to create team invite."
      );
    } finally {
      setIsTeamInviteBusy(false);
    }
  };

  const handleRevokeTeamInvite = async () => {
    if (!teamInviteToken) return;
    setIsTeamInviteBusy(true);
    try {
      await revokeTeamInvite(db, teamInviteToken);
      setTeamInviteToken(null);
      setTeamInviteUrl(null);
      setSubmissionMessage("Team invite link revoked.");
    } catch (error: unknown) {
      setSubmissionMessage(
        error instanceof Error ? error.message : "Unable to revoke invite."
      );
    } finally {
      setIsTeamInviteBusy(false);
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

  const isReadOnly = selectedHackathon.status === "past";

  return (
    <DashboardLayout
      sessionUser={sessionUser}
      role="participant"
      onSignOut={signOut}
      hackathons={accessibleHackathons}
      selectedHackathonId={selectedHackathonId}
      onHackathonChange={setSelectedHackathonId}
    >
      <ParticipantDashboard
        selectedHackathon={selectedHackathon}
        hackathonSummaries={hackathonSummaries}
        joinableHackathons={joinableHackathons}
        publicSiteUrl={getHackathonPublicUrl(selectedHackathonId)}
        isLoadingWorkspace={isLoadingWorkspace}
        isReadOnly={isReadOnly}
        isJoiningHackathon={isJoiningHackathon}
        onSelectHackathon={setSelectedHackathonId}
        onJoinHackathon={handleJoinHackathon}
        participantForm={participantForm}
        setParticipantForm={setParticipantForm}
        participantSubmissions={participantSubmissions}
        activeSubmissionId={activeSubmissionId}
        onSelectSubmission={handleSelectSubmission}
        participantSubmission={participantSubmission}
        submissionMessage={submissionMessage}
        autosaveStatus={autosaveStatus}
        isSubmittingProject={isSubmittingProject}
        onUploadProjectImage={handleUploadProjectImage}
        onSave={handleParticipantSubmit}
        teammatePosts={teammatePosts}
        isLoadingTeammatePosts={isLoadingTeammatePosts}
        isSavingTeammatePost={isSavingTeammatePost}
        teammatePostMessage={teammatePostMessage}
        currentUserId={sessionUser.id}
        currentUserEmail={sessionUser.email}
        onCreateTeammatePost={handleCreateTeammatePost}
        onCloseTeammatePost={handleCloseTeammatePost}
        onDeleteTeammatePost={handleDeleteTeammatePost}
        teamInviteUrl={teamInviteUrl}
        linkedTeamMembers={linkedTeamMembers}
        isTeamInviteBusy={isTeamInviteBusy}
        onGenerateTeamInvite={handleGenerateTeamInvite}
        onRevokeTeamInvite={handleRevokeTeamInvite}
      />
    </DashboardLayout>
  );
}
