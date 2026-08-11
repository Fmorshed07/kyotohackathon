import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { getDashboardPathForUser } from "@/lib/portalRoutes";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { uploadProfileImage } from "@/lib/profileMedia";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useHackathonSelection } from "@/hooks/useHackathonSelection";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ParticipantDashboard } from "@/components/dashboard/ParticipantDashboard";
import {
  buildParticipantHackathonSummaries,
  filterSubmissionsByHackathon,
  getHackathonsByIds,
  getJoinableHackathons,
  getSubmissionHackathonId,
  getUserAllowedHackathonIds,
  HACKATHON_PUBLIC_URLS,
  HACKATHON_STORAGE_KEYS,
  isHackathonId,
  PORTAL_HACKATHONS,
  SITE_HACKATHON_ID,
  type HackathonId,
} from "@/lib/hackathons";
import { queueParticipantEmail } from "@/lib/participantEmail";
import type { Submission, UserProfile } from "@/types/portal";

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
  const db = getFirestoreDb();
  const { selectedHackathonId, selectedHackathon, setSelectedHackathonId } = useHackathonSelection(
    HACKATHON_STORAGE_KEYS.participant
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

  const mapSubmissionToForm = (data: Submission) => ({
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

  const accessibleHackathonIds = useMemo(() => {
    const ids = new Set<HackathonId>();

    for (const id of enrolledHackathonIds) {
      if (isHackathonId(id)) ids.add(id);
    }

    for (const id of sessionUser?.hackathonIds ?? []) {
      if (isHackathonId(id)) ids.add(id);
    }

    if (sessionUser?.hackathonId && isHackathonId(sessionUser.hackathonId)) {
      ids.add(sessionUser.hackathonId);
    }

    for (const submission of allParticipantSubmissions) {
      ids.add(getSubmissionHackathonId(submission));
    }

    // Past events stay visible only when the participant is already enrolled / submitted.
    return PORTAL_HACKATHONS.filter((hackathon) => ids.has(hackathon.id)).map(
      (hackathon) => hackathon.id
    );
  }, [allParticipantSubmissions, enrolledHackathonIds, sessionUser]);

  const accessibleHackathons = useMemo(
    () => getHackathonsByIds(accessibleHackathonIds),
    [accessibleHackathonIds]
  );

  const participantSubmissions = useMemo(
    () =>
      sortSubmissionsNewestFirst(
        filterSubmissionsByHackathon(allParticipantSubmissions, selectedHackathonId)
      ),
    [allParticipantSubmissions, selectedHackathonId]
  );

  const hackathonSummaries = useMemo(
    () => buildParticipantHackathonSummaries(allParticipantSubmissions, enrolledHackathonIds),
    [allParticipantSubmissions, enrolledHackathonIds]
  );

  const joinableHackathons = useMemo(() => {
    const enrolled = new Set(accessibleHackathonIds);
    return getJoinableHackathons().filter((hackathon) => !enrolled.has(hackathon.id));
  }, [accessibleHackathonIds]);

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "participant") return;
    if (accessibleHackathonIds.length === 0) return;
    if (accessibleHackathonIds.includes(selectedHackathonId)) return;
    setSelectedHackathonId(accessibleHackathonIds[0] ?? SITE_HACKATHON_ID);
  }, [
    accessibleHackathonIds,
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
    const scoped = participantSubmissions;
    if (scoped.length > 0) {
      const activeSubmission = scoped[0];
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

  const handleSelectSubmission = (submissionId: string) => {
    const selectedSubmission = participantSubmissions.find(
      (submission) => submission.id === submissionId
    );
    if (!selectedSubmission) return;

    setActiveSubmissionId(selectedSubmission.id);
    setParticipantSubmission(selectedSubmission);
    setParticipantForm((current) => ({
      ...current,
      ...mapSubmissionToForm(selectedSubmission),
    }));
    setSubmissionMessage(null);
  };

  const handleUploadProjectImage = async (file: File, kind: "cover" | "gallery") => {
    if (!sessionUser) throw new Error("Sign in to upload project images.");
    return uploadProfileImage(sessionUser.id, file, kind === "cover" ? "cover" : "gallery");
  };

  const handleJoinHackathon = async (hackathonId: HackathonId) => {
    if (!sessionUser) return;
    const joinable = getJoinableHackathons().some((entry) => entry.id === hackathonId);
    if (!joinable) {
      setSubmissionMessage("That event is not open for new participants.");
      return;
    }

    setIsJoiningHackathon(true);
    setSubmissionMessage(null);
    try {
      const nextHackathonIds = Array.from(new Set<HackathonId>([...enrolledHackathonIds, hackathonId]));
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
      setSubmissionMessage(`Joined ${PORTAL_HACKATHONS.find((h) => h.id === hackathonId)?.name ?? "event"}.`);
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
      const hasScopedSubmission =
        participantSubmission &&
        activeSubmissionId &&
        getSubmissionHackathonId(participantSubmission) === selectedHackathonId;

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
          ? (participantSubmission?.created_at ?? new Date().toISOString())
          : new Date().toISOString(),
      };
      const nextHackathonIds = Array.from(
        new Set<HackathonId>([...enrolledHackathonIds, selectedHackathonId, SITE_HACKATHON_ID])
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
          public_preview_consent: true,
        });
      } else {
        // Always remove the public copy when consent is off — never leave a stale gallery/board card.
        await deleteDoc(publicProjectRef).catch(() => undefined);
      }

      setEnrolledHackathonIds(nextHackathonIds);

      const submissionSnap = await getDoc(submissionRef);
      if (submissionSnap.exists()) {
        const data = {
          id: submissionSnap.id,
          ...(submissionSnap.data() as Omit<Submission, "id">),
        } as Submission;
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
        setSubmissionMessage("Submission saved successfully.");
        queueParticipantEmail({
          type: hasScopedSubmission ? "submission_updated" : "submission_created",
          title: data.title ?? payload.title,
          teamName: data.team_name ?? payload.team_name,
          hackathonName: selectedHackathon.name,
        });
      }
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
        publicSiteUrl={HACKATHON_PUBLIC_URLS[selectedHackathonId]}
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
        isSubmittingProject={isSubmittingProject}
        onUploadProjectImage={handleUploadProjectImage}
        onSave={handleParticipantSubmit}
      />
    </DashboardLayout>
  );
}
