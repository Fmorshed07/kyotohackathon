import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { collection, deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { getDashboardPathForUser } from "@/lib/portalRoutes";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebaseClient";
import { draftsDiffer, formDraftStorageKey } from "@/lib/formDrafts";
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
  areSubmissionsWritable,
  getHackathonSubmissionMode,
  getSubmissionLockCopy,
  upsertPortalHackathon,
  type HackathonId,
  type PortalHackathon,
} from "@/lib/hackathons";
import {
  assertSubmissionsWritable,
  fetchJoinablePortalHackathons,
  fetchPortalHackathonCatalog,
  hostedToPortalHackathon,
  subscribeHackathon,
} from "@/lib/aiHackathons";
import {
  listAccessibleSubmissions,
  listTeamMembershipsForSubmission,
  loadUserProfiles,
} from "@/lib/portalInvites";
import { buildTeamRoster, rosterDisplayNames } from "@/lib/teamRoster";
import { queueParticipantEmail } from "@/lib/participantEmail";
import { getSubmissionTracks } from "@/lib/impactOsaka";
import type { Submission, TeamMemberRecord, UserProfile } from "@/types/portal";

const initialParticipantForm = {
  trackId: "",
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
  trackId: "",
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

const resolveFormTrackId = (eventId: string, trackId?: string | null) => {
  const tracks = getSubmissionTracks(eventId);
  return tracks.length === 1 ? tracks[0].id : trackId ?? "";
};

const pickProjectDraft = (form: typeof initialParticipantForm, eventId: string): ParticipantProjectDraft => ({
  trackId: resolveFormTrackId(eventId, form.trackId),
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
  const location = useLocation();
  const navigate = useNavigate();
  const db = getFirestoreDb();
  const [eventCatalog, setEventCatalog] = useState<PortalHackathon[]>(PORTAL_HACKATHONS);
  const didApplyPreferredEvent = useRef(false);
  const [liveJoinableHackathons, setLiveJoinableHackathons] = useState<PortalHackathon[]>([]);
  const { selectedHackathonId, setSelectedHackathonId } = useHackathonSelection(
    HACKATHON_STORAGE_KEYS.participant,
    undefined,
    eventCatalog,
    { syncUrl: true, preferCurrent: true },
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
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceLoadAttempt, setWorkspaceLoadAttempt] = useState(0);
  const [isJoiningHackathon, setIsJoiningHackathon] = useState(false);
  const [linkedTeamMembers, setLinkedTeamMembers] = useState<TeamMemberRecord[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile>>({});
  const [autosaveStatus, setAutosaveStatus] = useState<string | null>(null);
  const suppressFormSyncRef = useRef(false);
  const firestoreAutosaveTimerRef = useRef<number | null>(null);
  const isSavingProjectRef = useRef(false);
  const failedAutosaveRef = useRef<{ workspaceKey: string; value: ParticipantProjectDraft } | null>(null);
  const pendingSubmissionRefs = useRef(new Map<string, { reference: ReturnType<typeof doc>; createdAt: string }>());
  const selectedHackathonRef = useRef(selectedHackathon);
  selectedHackathonRef.current = selectedHackathon;
  const isMountedRef = useRef(false);
  const workspaceKey = `${sessionUser?.id}:${selectedHackathonId}:${activeSubmissionId ?? "new"}`;
  const workspaceKeyRef = useRef(workspaceKey);
  workspaceKeyRef.current = workspaceKey;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // An account switch can happen while Firestore is resolving a save.
  const isCurrentAccount = () =>
    Boolean(sessionUser && getFirebaseAuth().currentUser?.uid === sessionUser.id);
  const isCurrentWorkspace = () =>
    isMountedRef.current && isCurrentAccount() && workspaceKeyRef.current === workspaceKey;

  const mapSubmissionToForm = (data: Submission): ParticipantProjectDraft => ({
    trackId: resolveFormTrackId(selectedHackathonId, data.track_id),
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

  const joinedTeamName = searchParams.get("joinedTeam")?.trim() || null;

  useEffect(() => {
    if (!joinedTeamName) return;
    setSubmissionMessage(`You joined ${joinedTeamName}.`);
  }, [joinedTeamName]);

  useEffect(() => {
    const hash = location.hash.replace(/^#/, "");
    if (hash === "find-teammates") {
      navigate("/dashboard/participant/team#find-teammates", { replace: true });
      return;
    }
    if (hash === "team-details") {
      navigate("/dashboard/participant/team", { replace: true });
    }
  }, [location.hash, navigate]);

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
    const unsubscribe = subscribeHackathon(
      db,
      selectedHackathonId,
      (event) => {
        if (!event) return;
        setEventCatalog((current) =>
          upsertPortalHackathon(current, hostedToPortalHackathon(event)),
        );
      },
      () => {
        // Participants cannot read unpublished listings.
      },
    );
    return unsubscribe;
  }, [db, selectedHackathonId]);

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "participant") return;
    if (isLoadingWorkspace) return;
    if (accessibleHackathonIds.length === 0) return;

    if (requestedHackathonId && accessibleHackathonIds.includes(requestedHackathonId)) {
      didApplyPreferredEvent.current = true;
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
    let cancelled = false;

    const loadParticipantWorkspace = async () => {
      setIsLoadingWorkspace(true);
      setWorkspaceError(null);
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

        const submissions = sortSubmissionsNewestFirst(
          await listAccessibleSubmissions(db, sessionUser.id)
        );
        if (cancelled) return;
        setUserProfile(profile ?? null);
        setEnrolledHackathonIds(allowedIds);
        setAllParticipantSubmissions(submissions);
        setParticipantForm((current) => ({
          ...current,
          ...mapUserProfileToForm(profile),
        }));
      } catch {
        if (!cancelled) setWorkspaceError("Could not load your projects. Retry before making changes.");
      } finally {
        if (!cancelled) setIsLoadingWorkspace(false);
      }
    };

    void loadParticipantWorkspace();
    return () => { cancelled = true; };
    // Profile snapshots for this account must not replace a project being edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser?.id, sessionUser?.role, db, workspaceLoadAttempt]);

  useEffect(() => {
    if (!activeSubmissionId) {
      setLinkedTeamMembers([]);
      setMemberProfiles({});
      return;
    }
    let cancelled = false;
    setLinkedTeamMembers(participantSubmission?.team_members ?? []);
    setMemberProfiles({});
    const loadMembers = async () => {
      try {
        const fromSubmission = participantSubmission?.team_members ?? [];
        const fromCollection = await listTeamMembershipsForSubmission(db, activeSubmissionId);
        if (cancelled) return;
        const byId = new Map<string, TeamMemberRecord>();
        for (const member of [...fromSubmission, ...fromCollection]) {
          if (member.user_id) byId.set(member.user_id, member);
        }
        const members = Array.from(byId.values());
        setLinkedTeamMembers(members);
        const profileIds = [
          participantSubmission?.user_id ?? "",
          ...members.map((member) => member.user_id),
        ];
        const profiles = await loadUserProfiles(db, profileIds);
        if (!cancelled) setMemberProfiles(profiles);
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
      const joinedSubmissionId = searchParams.get("joinedSubmission")?.trim() || null;
      const activeSubmission =
        scoped.find((submission) => submission.id === activeSubmissionId) ??
        scoped.find((submission) => joinedSubmissionId && submission.id === joinedSubmissionId) ??
        scoped.find(
          (submission) => joinedTeamName && submission.team_name?.trim() === joinedTeamName
        ) ??
        scoped[0];
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
      trackId: resolveFormTrackId(selectedHackathonId),
      ...mapUserProfileToForm(userProfile),
    }));
  }, [participantSubmissions, selectedHackathonId, userProfile, joinedTeamName]);

  const projectDraftValue = useMemo(
    () => pickProjectDraft(participantForm, selectedHackathonId),
    [participantForm, selectedHackathonId]
  );
  const projectDraftValueRef = useRef(projectDraftValue);
  projectDraftValueRef.current = projectDraftValue;

  const projectDraftBaseline = useMemo(
    () => (participantSubmission ? mapSubmissionToForm(participantSubmission) : {
      ...emptyProjectFields,
      trackId: resolveFormTrackId(selectedHackathonId),
    }),
    [participantSubmission, selectedHackathonId]
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
    enabled: Boolean(sessionUser?.role === "participant") && !isLoadingWorkspace && !workspaceError,
    baseline: projectDraftBaseline,
    debounceMs: 400,
  });

  useUnsavedChangesGuard(isProjectDraftDirty && selectedHackathon.status !== "past");

  useEffect(() => {
    if (!pendingProjectRestore) return;
    const restored = pendingProjectRestore.value as ParticipantProjectDraft;
    setParticipantForm((current) => ({
      ...current,
      ...restored,
      trackId: resolveFormTrackId(selectedHackathonId, restored.trackId),
    }));
    setAutosaveStatus("Restored unsaved draft from this browser.");
    consumeProjectRestore();
  }, [pendingProjectRestore, consumeProjectRestore, selectedHackathonId]);

  useEffect(() => {
    if (!draftSavedAt || !isProjectDraftDirty) return;
    if (failedAutosaveRef.current?.workspaceKey === workspaceKey &&
        !draftsDiffer(failedAutosaveRef.current.value, projectDraftValue)) return;
    setAutosaveStatus("Draft saved on this device.");
  }, [draftSavedAt, isProjectDraftDirty, projectDraftValue, workspaceKey]);

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
    if (!sessionUser || !isCurrentWorkspace() || isLoadingWorkspace || workspaceError) return null;
    const tracks = getSubmissionTracks(selectedHackathonId);
    const trackId = resolveFormTrackId(selectedHackathonId, participantForm.trackId);
    if (tracks.length > 1 && !tracks.some((track) => track.id === trackId)) {
      if (options.announce) throw new Error("Choose your submission track before saving.");
      setAutosaveStatus("Draft saved on this device. Choose a track to save it to the event.");
      return null;
    }
    await assertSubmissionsWritable(db, selectedHackathonId);
    if (!isCurrentWorkspace()) return null;
    if (!areSubmissionsWritable(selectedHackathonRef.current)) {
      throw new Error(
        getSubmissionLockCopy(getHackathonSubmissionMode(selectedHackathonRef.current)) ??
          "Submissions are locked for this hackathon.",
      );
    }

    const hasScopedSubmission =
      participantSubmission &&
      activeSubmissionId &&
      getSubmissionHackathonId(participantSubmission) === selectedHackathonId;
    const pendingCreation = hasScopedSubmission ? undefined : pendingSubmissionRefs.current.get(workspaceKey);

    const ownerId = hasScopedSubmission ? participantSubmission.user_id : sessionUser.id;
    const ownerName =
      ownerId === sessionUser.id
        ? participantForm.fullName.trim() || sessionUser.email.split("@")[0] || "Team creator"
        : participantSubmission?.owner_name?.trim() ||
          participantForm.teamName.trim() ||
          "Team creator";
    const ownerEmail =
      ownerId === sessionUser.id
        ? sessionUser.email
        : participantSubmission?.owner_email?.trim() || "";
    const leaderId =
      participantSubmission?.team_leader_id?.trim() || ownerId;
    const roster = buildTeamRoster({
      owner: { user_id: ownerId, name: ownerName, email: ownerEmail },
      linkedMembers: linkedTeamMembers,
      teamLeaderId: leaderId,
      currentUserId: sessionUser.id,
    });
    const memberNames = rosterDisplayNames(roster);

    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      user_id: ownerId,
      hackathon_id: selectedHackathonId,
      ...(tracks.length ? { track_id: trackId } : {}),
      title: participantForm.title,
      short_description: participantForm.shortDescription,
      project_url: participantForm.projectUrl,
      submission_pdf_url: participantForm.submissionPdfUrl,
      demo_video_url: participantForm.demoVideoUrl,
      public_preview_consent: participantForm.allowPublicPreview,
      cover_url: participantForm.projectCoverUrl,
      gallery_urls: participantForm.projectGalleryUrls,
      team_name: participantForm.teamName,
      member_names: memberNames.join("\n"),
      member_name_list: memberNames,
      team_leader_id: leaderId,
      role: "participant",
      created_at: hasScopedSubmission
        ? (participantSubmission?.created_at ?? now)
        : (pendingCreation?.createdAt ?? now),
      updated_at: now,
    };
    if (ownerId === sessionUser.id) {
      payload.owner_name = ownerName;
      payload.owner_email = ownerEmail;
      const nextMemberIds = Array.from(
        new Set([
          ...(participantSubmission?.member_user_ids ?? []),
          ...linkedTeamMembers.map((member) => member.user_id).filter(Boolean),
        ])
      );
      if (nextMemberIds.length > 0) {
        payload.member_user_ids = nextMemberIds;
      }
      const nextTeamMembers = participantSubmission?.team_members?.length
        ? participantSubmission.team_members
        : linkedTeamMembers;
      if (nextTeamMembers.length > 0) {
        payload.team_members = nextTeamMembers;
      }
    }
    const nextHackathonIds = nextEnrolledHackathonIds(
      enrolledHackathonIds,
      selectedHackathonId
    );

    const submissionRef = hasScopedSubmission
      ? doc(db, "submissions", activeSubmissionId!)
      : pendingCreation?.reference ?? doc(collection(db, "submissions"));
    if (!hasScopedSubmission && !pendingCreation) {
      pendingSubmissionRefs.current.set(workspaceKey, { reference: submissionRef, createdAt: now });
    }
    const userRef = doc(db, "users", sessionUser.id);
    const publicProjectRef = doc(db, "public_projects", submissionRef.id);

    // Remove an existing public preview before reporting withdrawn consent as saved.
    // Missing projections need no delete (their owner cannot be checked by Firestore rules).
    if (!participantForm.allowPublicPreview && (hasScopedSubmission || pendingCreation)) {
      try {
        const publicSnapshot = await getDoc(publicProjectRef);
        if (!isCurrentWorkspace()) return null;
        if (publicSnapshot.exists()) await deleteDoc(publicProjectRef);
      } catch {
        throw new Error("Could not remove the public preview. Your project may still be public. Please retry saving.");
      }
      if (!isCurrentWorkspace()) return null;
    }

    if (hasScopedSubmission || pendingCreation) {
      await setDoc(submissionRef, payload, { merge: true });
    } else {
      await setDoc(submissionRef, payload);
    }
    if (!isCurrentWorkspace()) return null;
    await setDoc(
      userRef,
      {
        hackathon_id: selectedHackathonId,
        hackathon_ids: nextHackathonIds,
      },
      { merge: true }
    );
    if (!isCurrentWorkspace()) return null;

    if (participantForm.allowPublicPreview) {
      await setDoc(publicProjectRef, {
        owner_id: ownerId,
        user_id: ownerId,
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
        member_name_list: payload.member_name_list,
        team_members: participantSubmission?.team_members ?? linkedTeamMembers,
        member_user_ids: Array.from(
          new Set([
            ...(participantSubmission?.member_user_ids ?? []),
            ...linkedTeamMembers.map((member) => member.user_id).filter(Boolean),
          ])
        ),
        team_leader_id: leaderId,
        owner_name: ownerName,
        owner_email: ownerEmail,
        created_at: payload.created_at,
        updated_at: payload.updated_at,
        public_preview_consent: true,
      }, { merge: true });
    }

    if (!isCurrentWorkspace()) return null;
    setEnrolledHackathonIds(nextHackathonIds);

    const submissionSnap = await getDoc(submissionRef);
    if (!isCurrentWorkspace()) return null;
    if (!submissionSnap.exists()) return null;

    const data = {
      id: submissionSnap.id,
      ...(submissionSnap.data() as Omit<Submission, "id">),
    } as Submission;
    pendingSubmissionRefs.current.delete(workspaceKey);

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

    const hasNewerEdits = draftsDiffer(projectDraftValueRef.current, projectDraftValue);
    if (!hasNewerEdits) clearProjectDraft();

    if (options.announce !== false) {
      setSubmissionMessage(hasNewerEdits ? "Submission saved. Your newer edits still need to be saved." : "Submission saved successfully.");
    } else {
      setAutosaveStatus("Draft saved to cloud.");
    }

    if (options.queueEmail) {
      const emailTitle = data.title ?? participantForm.title;
      const emailTeamName = data.team_name ?? participantForm.teamName;
      queueParticipantEmail({
        type: hasScopedSubmission ? "submission_updated" : "submission_created",
        title: emailTitle,
        teamName: emailTeamName,
        hackathonName: selectedHackathon.name,
      });
    }

    return data;
  };

  const handleJoinHackathon = async (hackathonId: HackathonId) => {
    if (!sessionUser || !isCurrentAccount() || isLoadingWorkspace || workspaceError) return;
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
      if (!isMountedRef.current || !isCurrentAccount()) return;
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
    if (!sessionUser || isSavingProjectRef.current) return;

    isSavingProjectRef.current = true;
    failedAutosaveRef.current = null;
    setIsSubmittingProject(true);
    setSubmissionMessage(null);
    try {
      await persistParticipantProject({ announce: true, queueEmail: true });
    } catch (error: unknown) {
      failedAutosaveRef.current = { workspaceKey, value: projectDraftValue };
      flushProjectDraft();
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "An error occurred while saving your submission.";
      setSubmissionMessage(message);
    } finally {
      isSavingProjectRef.current = false;
      setIsSubmittingProject(false);
    }
  };

  // Cloud autosave so drafts survive sudden closes even across devices.
  // Host pause/close must cancel this — never keep writing in the background.
  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "participant") return;
    if (isLoadingWorkspace || workspaceError || !areSubmissionsWritable(selectedHackathon)) {
      if (firestoreAutosaveTimerRef.current) {
        window.clearTimeout(firestoreAutosaveTimerRef.current);
        firestoreAutosaveTimerRef.current = null;
      }
      return;
    }
    if (!isProjectDraftDirty || !projectDraftHasContent(projectDraftValue)) return;
    if (isSubmittingProject || isSavingProjectRef.current) return;
    if (failedAutosaveRef.current?.workspaceKey === workspaceKey &&
        !draftsDiffer(failedAutosaveRef.current.value, projectDraftValue)) return;

    if (firestoreAutosaveTimerRef.current) {
      window.clearTimeout(firestoreAutosaveTimerRef.current);
    }

    firestoreAutosaveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        if (isSavingProjectRef.current || isSubmittingProject) return;
        if (!areSubmissionsWritable(selectedHackathonRef.current)) return;
        isSavingProjectRef.current = true;
        setIsSubmittingProject(true);
        try {
          await persistParticipantProject({ announce: false, queueEmail: false });
        } catch (error: unknown) {
          failedAutosaveRef.current = { workspaceKey, value: projectDraftValue };
          flushProjectDraft();
          if (!areSubmissionsWritable(selectedHackathonRef.current)) {
            setAutosaveStatus(
              getSubmissionLockCopy(getHackathonSubmissionMode(selectedHackathonRef.current)),
            );
          } else {
            setAutosaveStatus(error instanceof Error ? error.message : "Draft saved on this device. Retry saving to sync your changes.");
          }
        } finally {
          isSavingProjectRef.current = false;
          setIsSubmittingProject(false);
        }
      })();
    }, 2500);

    return () => {
      if (firestoreAutosaveTimerRef.current) {
        window.clearTimeout(firestoreAutosaveTimerRef.current);
        firestoreAutosaveTimerRef.current = null;
      }
    };
    // persistParticipantProject closes over latest form state intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sessionUser,
    isLoadingWorkspace,
    workspaceError,
    selectedHackathon,
    isProjectDraftDirty,
    projectDraftValue,
    isSubmittingProject,
    workspaceKey,
  ]);

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

  const isReadOnly = !areSubmissionsWritable(selectedHackathon);

  return (
    <DashboardLayout
      sessionUser={sessionUser}
      role="participant"
      onSignOut={signOut}
      hackathons={accessibleHackathons}
      selectedHackathonId={selectedHackathonId}
      onHackathonChange={setSelectedHackathonId}
    >
      {workspaceError ? (
        <div role="alert" className="mb-4 rounded-lg border border-destructive/40 p-4">
          <p>{workspaceError}</p>
          <button type="button" className="mt-2 underline" onClick={() => setWorkspaceLoadAttempt((attempt) => attempt + 1)}>Retry loading projects</button>
        </div>
      ) : null}
      <ParticipantDashboard
        selectedHackathon={selectedHackathon}
        hackathonSummaries={hackathonSummaries}
        joinableHackathons={joinableHackathons}
        publicSiteUrl={getHackathonPublicUrl(selectedHackathonId)}
        isLoadingWorkspace={isLoadingWorkspace}
        isReadOnly={isReadOnly || Boolean(workspaceError)}
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
        currentUserId={sessionUser.id}
        currentUserEmail={sessionUser.email}
        linkedTeamMembers={linkedTeamMembers}
        teamOwner={{
          user_id: participantSubmission?.user_id ?? sessionUser.id,
          name:
            (participantSubmission?.user_id ?? sessionUser.id) === sessionUser.id
              ? participantForm.fullName.trim() || sessionUser.email.split("@")[0] || "You"
              : participantSubmission?.owner_name?.trim() ||
                participantForm.teamName.trim() ||
                "Team creator",
          email:
            (participantSubmission?.user_id ?? sessionUser.id) === sessionUser.id
              ? sessionUser.email
              : participantSubmission?.owner_email?.trim() || "",
        }}
        teamLeaderId={participantSubmission?.team_leader_id ?? participantSubmission?.user_id ?? sessionUser.id}
        memberProfiles={{
          ...memberProfiles,
          ...(userProfile ? { [sessionUser.id]: userProfile } : {}),
        }}
      />
    </DashboardLayout>
  );
}
