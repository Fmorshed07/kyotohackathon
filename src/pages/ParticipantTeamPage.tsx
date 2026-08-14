import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { TeamManagementWorkspace } from "@/components/dashboard/TeamManagementWorkspace";
import { Button } from "@/components/ui/button";
import { useHackathonSelection } from "@/hooks/useHackathonSelection";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { fetchPortalHackathonCatalog, hostedToPortalHackathon, subscribeHackathon } from "@/lib/aiHackathons";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { buildInviteUrl } from "@/lib/inviteTokens";
import {
  collectAccessibleHackathonIds,
  filterSubmissionsByHackathon,
  getHackathonsByIds,
  getHackathonPublicUrl,
  getSubmissionHackathonId,
  getUserAllowedHackathonIds,
  HACKATHON_STORAGE_KEYS,
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
  createTeamInvite,
  listAccessibleSubmissions,
  listTeamMembershipsForSubmission,
  loadUserProfiles,
  revokeTeamInvite,
  setTeamLeader,
} from "@/lib/portalInvites";
import { getDashboardPathForUser } from "@/lib/portalRoutes";
import { buildTeamRoster, rosterDisplayNames } from "@/lib/teamRoster";
import {
  closeOwnOpenPosts,
  createTeammatePost,
  deleteTeammatePost,
  listTeammatePosts,
  updateTeammatePost,
} from "@/lib/teammatePosts";
import type { Submission, TeamMemberRecord, TeammatePost, UserProfile } from "@/types/portal";

const getStringField = (value: unknown) => (typeof value === "string" ? value : "");

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

export default function ParticipantTeamPage() {
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const location = useLocation();
  const db = getFirestoreDb();
  const [eventCatalog, setEventCatalog] = useState<PortalHackathon[]>(PORTAL_HACKATHONS);
  const { selectedHackathonId, setSelectedHackathonId } = useHackathonSelection(
    HACKATHON_STORAGE_KEYS.participant,
    undefined,
    eventCatalog,
    { preferCurrent: true }
  );
  const selectedHackathon = useMemo(
    () => resolvePortalHackathon(selectedHackathonId, eventCatalog),
    [eventCatalog, selectedHackathonId]
  );

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [enrolledHackathonIds, setEnrolledHackathonIds] = useState<HackathonId[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [linkedTeamMembers, setLinkedTeamMembers] = useState<TeamMemberRecord[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile>>({});
  const [teamInviteUrl, setTeamInviteUrl] = useState<string | null>(null);
  const [teamInviteToken, setTeamInviteToken] = useState<string | null>(null);
  const [isTeamInviteBusy, setIsTeamInviteBusy] = useState(false);
  const [teammatePosts, setTeammatePosts] = useState<TeammatePost[]>([]);
  const [isLoadingTeammatePosts, setIsLoadingTeammatePosts] = useState(false);
  const [isSavingTeammatePost, setIsSavingTeammatePost] = useState(false);
  const [teammatePostMessage, setTeammatePostMessage] = useState<string | null>(null);

  const accessibleHackathonIds = useMemo(
    () =>
      collectAccessibleHackathonIds({
        enrolledIds: enrolledHackathonIds,
        sessionHackathonId: sessionUser?.hackathonId,
        sessionHackathonIds: sessionUser?.hackathonIds,
        submissions: allSubmissions,
      }),
    [allSubmissions, enrolledHackathonIds, sessionUser]
  );

  const accessibleHackathons = useMemo(
    () => getHackathonsByIds(accessibleHackathonIds, eventCatalog),
    [accessibleHackathonIds, eventCatalog]
  );

  const participantSubmissions = useMemo(
    () =>
      sortSubmissionsNewestFirst(
        filterSubmissionsByHackathon(allSubmissions, selectedHackathonId)
      ),
    [allSubmissions, selectedHackathonId]
  );

  const activeSubmission =
    participantSubmissions.find((submission) => submission.id === activeSubmissionId) ?? null;

  const displayName =
    userProfile?.fullName?.trim() || sessionUser?.email.split("@")[0] || "You";

  const teamOwner = {
    user_id: activeSubmission?.user_id ?? sessionUser?.id ?? "",
    name:
      (activeSubmission?.user_id ?? sessionUser?.id) === sessionUser?.id
        ? displayName
        : activeSubmission?.owner_name?.trim() || teamName.trim() || "Team creator",
    email:
      (activeSubmission?.user_id ?? sessionUser?.id) === sessionUser?.id
        ? sessionUser?.email ?? ""
        : activeSubmission?.owner_email?.trim() || "",
  };

  const teamLeaderId =
    activeSubmission?.team_leader_id ?? activeSubmission?.user_id ?? sessionUser?.id ?? null;

  const savedTeamName = activeSubmission?.team_name ?? "";
  const isTeamNameDirty = teamName.trim() !== savedTeamName.trim();
  const isReadOnly = !areSubmissionsWritable(selectedHackathon);
  const isTeamNameDirtyRef = useRef(isTeamNameDirty);
  const isAutosavingTeamRef = useRef(false);
  const teamNameAutosaveTimerRef = useRef<number | null>(null);
  isTeamNameDirtyRef.current = isTeamNameDirty;

  useEffect(() => {
    const id = location.hash.replace(/^#/, "").trim();
    if (!id) return;
    const attempts = [80, 250, 500];
    for (const delay of attempts) {
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, delay);
    }
  }, [location.hash]);

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
    if (accessibleHackathonIds.includes(selectedHackathonId)) return;
    const fallback = pickPreferredHackathonId(accessibleHackathonIds, {
      storedId: selectedHackathonId,
      primaryId: sessionUser.hackathonId,
      submissionHackathonIds: allSubmissions.map(getSubmissionHackathonId),
    });
    if (fallback) setSelectedHackathonId(fallback);
  }, [
    accessibleHackathonIds,
    allSubmissions,
    isLoadingWorkspace,
    selectedHackathonId,
    sessionUser,
    setSelectedHackathonId,
  ]);

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "participant") return;

    const loadWorkspace = async () => {
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
        const submissions = sortSubmissionsNewestFirst(
          await listAccessibleSubmissions(db, sessionUser.id)
        );
        setAllSubmissions(submissions);
      } catch {
        // keep empty workspace
      } finally {
        setIsLoadingWorkspace(false);
      }
    };

    void loadWorkspace();
  }, [sessionUser, db]);

  useEffect(() => {
    if (participantSubmissions.length === 0) {
      setActiveSubmissionId(null);
      return;
    }
    setActiveSubmissionId((currentId) => {
      const next =
        participantSubmissions.find((submission) => submission.id === currentId) ??
        participantSubmissions[0];
      return next.id;
    });
  }, [participantSubmissions, selectedHackathonId]);

  useEffect(() => {
    const nextName =
      participantSubmissions.find((submission) => submission.id === activeSubmissionId)?.team_name ??
      "";
    if (!isTeamNameDirtyRef.current) {
      setTeamName(nextName);
    }
    setTeamInviteUrl(null);
    setTeamInviteToken(null);
    // Don't clobber a name the participant is still typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubmissionId]);

  useEffect(() => {
    if (!activeSubmissionId) {
      setLinkedTeamMembers([]);
      setMemberProfiles({});
      return;
    }
    let cancelled = false;
    const loadMembers = async () => {
      try {
        const fromSubmission = activeSubmission?.team_members ?? [];
        const fromCollection = await listTeamMembershipsForSubmission(db, activeSubmissionId);
        if (cancelled) return;
        const byId = new Map<string, TeamMemberRecord>();
        for (const member of [...fromSubmission, ...fromCollection]) {
          if (member.user_id) byId.set(member.user_id, member);
        }
        const members = Array.from(byId.values());
        setLinkedTeamMembers(members);
        const profileIds = [
          activeSubmission?.user_id ?? "",
          ...members.map((member) => member.user_id),
        ];
        const profiles = await loadUserProfiles(db, profileIds);
        if (!cancelled) setMemberProfiles(profiles);
      } catch {
        if (!cancelled) setLinkedTeamMembers(activeSubmission?.team_members ?? []);
      }
    };
    void loadMembers();
    return () => {
      cancelled = true;
    };
  }, [activeSubmission, activeSubmissionId, db]);

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

  const persistTeamName = async (nextName = teamName) => {
    if (!sessionUser) return null;
    if (!areSubmissionsWritable(selectedHackathon)) {
      throw new Error(
        getSubmissionLockCopy(getHackathonSubmissionMode(selectedHackathon)) ??
          "Submissions are locked for this hackathon.",
      );
    }
    const trimmed = nextName.trim();
    if (!trimmed) return null;

    if (activeSubmissionId && activeSubmission) {
      const ownerId = activeSubmission.user_id;
      const ownerName =
        ownerId === sessionUser.id
          ? displayName
          : activeSubmission.owner_name?.trim() || trimmed || "Team creator";
      const ownerEmail =
        ownerId === sessionUser.id
          ? sessionUser.email
          : activeSubmission.owner_email?.trim() || "";
      const leaderId = activeSubmission.team_leader_id?.trim() || ownerId;
      const roster = buildTeamRoster({
        owner: { user_id: ownerId, name: ownerName, email: ownerEmail },
        linkedMembers: linkedTeamMembers,
        teamLeaderId: leaderId,
        currentUserId: sessionUser.id,
      });
      const memberNames = rosterDisplayNames(roster);
      const now = new Date().toISOString();
      const payload = {
        team_name: trimmed,
        member_names: memberNames.join("\n"),
        member_name_list: memberNames,
        updated_at: now,
      };
      await setDoc(doc(db, "submissions", activeSubmissionId), payload, { merge: true });
      if (activeSubmission.public_preview_consent) {
        await setDoc(doc(db, "public_projects", activeSubmissionId), payload, { merge: true });
      }
      const updated = { ...activeSubmission, ...payload };
      setAllSubmissions((current) =>
        current.map((submission) =>
          submission.id === activeSubmissionId ? { ...submission, ...payload } : submission
        )
      );
      return updated;
    }

    const now = new Date().toISOString();
    const ownerName = displayName;
    const payload = {
      user_id: sessionUser.id,
      hackathon_id: selectedHackathonId,
      title: "",
      short_description: "",
      project_url: "",
      submission_pdf_url: "",
      demo_video_url: "",
      public_preview_consent: false,
      team_name: trimmed,
      member_names: ownerName,
      member_name_list: [ownerName],
      team_leader_id: sessionUser.id,
      owner_name: ownerName,
      owner_email: sessionUser.email,
      role: "participant",
      created_at: now,
      updated_at: now,
    };
    const submissionRef = doc(collection(db, "submissions"));
    await setDoc(submissionRef, payload);
    const nextHackathonIds = nextEnrolledHackathonIds(enrolledHackathonIds, selectedHackathonId);
    await setDoc(
      doc(db, "users", sessionUser.id),
      {
        hackathon_id: selectedHackathonId,
        hackathon_ids: nextHackathonIds,
      },
      { merge: true }
    );
    setEnrolledHackathonIds(nextHackathonIds);

    const submissionSnap = await getDoc(submissionRef);
    const created = (
      submissionSnap.exists()
        ? { id: submissionSnap.id, ...(submissionSnap.data() as Omit<Submission, "id">) }
        : { id: submissionRef.id, ...payload }
    ) as Submission;
    setActiveSubmissionId(created.id);
    setAllSubmissions((current) => [created, ...current]);
    return created;
  };

  const handleSaveTeam = async (nextName = teamName) => {
    const trimmed = nextName.trim();
    if (!trimmed || isReadOnly || isAutosavingTeamRef.current) return;
    isAutosavingTeamRef.current = true;
    setIsSavingTeam(true);
    try {
      await persistTeamName(trimmed);
      setSaveMessage("Saved");
    } catch (error: unknown) {
      setSaveMessage(error instanceof Error ? error.message : "Unable to save team name.");
    } finally {
      isAutosavingTeamRef.current = false;
      setIsSavingTeam(false);
    }
  };

  useEffect(() => {
    if (isReadOnly || isLoadingWorkspace) return;
    if (!isTeamNameDirty || !teamName.trim()) return;
    if (isSavingTeam || isAutosavingTeamRef.current) return;

    if (teamNameAutosaveTimerRef.current) {
      window.clearTimeout(teamNameAutosaveTimerRef.current);
    }
    teamNameAutosaveTimerRef.current = window.setTimeout(() => {
      void handleSaveTeam(teamName);
    }, 700);

    return () => {
      if (teamNameAutosaveTimerRef.current) {
        window.clearTimeout(teamNameAutosaveTimerRef.current);
      }
    };
    // persistTeamName closes over the latest roster/submission on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingWorkspace, isReadOnly, isSavingTeam, isTeamNameDirty, teamName]);

  const handleSelectSubmission = (submissionId: string) => {
    const selected = participantSubmissions.find((submission) => submission.id === submissionId);
    if (!selected) return;
    setActiveSubmissionId(selected.id);
    setTeamName(selected.team_name ?? "");
    setSaveMessage(null);
    setTeamInviteUrl(null);
    setTeamInviteToken(null);
  };

  const handleAssignTeamLeader = async (userId: string) => {
    if (!activeSubmissionId || !sessionUser) return;
    setIsTeamInviteBusy(true);
    setSaveMessage(null);
    try {
      await setTeamLeader(db, activeSubmissionId, userId);
      setAllSubmissions((current) =>
        current.map((submission) =>
          submission.id === activeSubmissionId
            ? { ...submission, team_leader_id: userId }
            : submission
        )
      );
      setSaveMessage("Team leader updated.");
    } catch (error: unknown) {
      setSaveMessage(error instanceof Error ? error.message : "Unable to assign a team leader.");
    } finally {
      setIsTeamInviteBusy(false);
    }
  };

  const handleGenerateTeamInvite = async () => {
    if (!sessionUser || !activeSubmissionId) {
      setSaveMessage("Save a team name first, then create an invite link.");
      return;
    }
    setIsTeamInviteBusy(true);
    setSaveMessage(null);
    try {
      if (isTeamNameDirty) {
        await persistTeamName();
      }
      if (teamInviteToken) {
        await revokeTeamInvite(db, teamInviteToken).catch(() => undefined);
      }
      const invite = await createTeamInvite(db, {
        submissionId: activeSubmissionId,
        ownerId: activeSubmission?.user_id ?? sessionUser.id,
        hackathonId: selectedHackathonId,
        teamName: teamName || activeSubmission?.title || "My team",
        ownerName: displayName,
        ownerEmail: sessionUser.email,
      });
      setTeamInviteToken(invite.token);
      setTeamInviteUrl(buildInviteUrl("team", invite.token));
      setSaveMessage("Team invite link ready — share it with teammates.");
    } catch (error: unknown) {
      setSaveMessage(error instanceof Error ? error.message : "Unable to create team invite.");
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
      setSaveMessage("Team invite link revoked.");
    } catch (error: unknown) {
      setSaveMessage(error instanceof Error ? error.message : "Unable to revoke invite.");
    } finally {
      setIsTeamInviteBusy(false);
    }
  };

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
        author_name: input.author_name || displayName || sessionUser.email,
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
      setTeammatePostMessage(error instanceof Error ? error.message : "Unable to close request.");
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
      setTeammatePostMessage(error instanceof Error ? error.message : "Unable to delete request.");
    } finally {
      setIsSavingTeammatePost(false);
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

      <TeamManagementWorkspace
        selectedHackathon={selectedHackathon}
        publicSiteUrl={getHackathonPublicUrl(selectedHackathonId)}
        isLoading={isLoadingWorkspace}
        isReadOnly={isReadOnly}
        teamName={teamName}
        onTeamNameChange={(value) => {
          setTeamName(value);
          setSaveMessage(null);
        }}
        onTeamNameBlur={() => {
          if (isTeamNameDirty) void handleSaveTeam(teamName);
        }}
        isTeamNameDirty={isTeamNameDirty}
        isSavingTeam={isSavingTeam}
        saveMessage={saveMessage}
        participantSubmissions={participantSubmissions}
        activeSubmissionId={activeSubmissionId}
        onSelectSubmission={handleSelectSubmission}
        currentUserId={sessionUser.id}
        currentUserEmail={sessionUser.email}
        displayName={displayName}
        linkedTeamMembers={linkedTeamMembers}
        teamOwner={teamOwner}
        teamLeaderId={teamLeaderId}
        memberProfiles={{
          ...memberProfiles,
          ...(userProfile && sessionUser ? { [sessionUser.id]: userProfile } : {}),
        }}
        teamInviteUrl={teamInviteUrl}
        isTeamInviteBusy={isTeamInviteBusy}
        canAssignTeamLeader={Boolean(activeSubmissionId)}
        onGenerateTeamInvite={handleGenerateTeamInvite}
        onRevokeTeamInvite={handleRevokeTeamInvite}
        onAssignTeamLeader={handleAssignTeamLeader}
        teammatePosts={teammatePosts}
        isLoadingTeammatePosts={isLoadingTeammatePosts}
        isSavingTeammatePost={isSavingTeammatePost}
        teammatePostMessage={teammatePostMessage}
        onCreateTeammatePost={handleCreateTeammatePost}
        onCloseTeammatePost={handleCloseTeammatePost}
        onDeleteTeammatePost={handleDeleteTeammatePost}
      />
    </DashboardLayout>
  );
}
