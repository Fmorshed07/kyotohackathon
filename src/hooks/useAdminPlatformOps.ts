import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebaseClient";
import {
  fetchSubmissionsForHackathon,
  filterUsersForHackathon,
  getUserAllowedHackathonIds,
  getUserHackathonId,
  HACKATHON_STORAGE_KEYS,
  type HackathonId,
  type PortalHackathon,
} from "@/lib/hackathons";
import { useHackathonSelection } from "@/hooks/useHackathonSelection";
import { useHackathonCriteria } from "@/hooks/useHackathonCriteria";
import { useAdminHackathonCatalog } from "@/hooks/useAdminHackathonCatalog";
import { calculateTotalFromCriteria } from "@/components/dashboard/judgingCriteria";
import { sendParticipantEmail } from "@/lib/participantEmail";
import {
  emptyPlatformOps,
  evaluateApplicant,
  fetchPlatformOps,
  inferRoleFit,
  matchApplicantsIntoTeams,
  savePlatformOps,
  submissionQuality,
  suggestCriteriaScores,
  type ApplicantOpsStatus,
  type PlatformOpsState,
} from "@/lib/platformOps";
import {
  buildProjectConceptQueue,
  blendScreeningResults,
  compareProjectScreenScores,
  evaluateQueuedConcept,
  toProjectScreenRecord,
} from "@/lib/projectScreening";
import { requestAiProjectScreens, toAiProjectScreenConcept } from "@/lib/projectScreeningAi";
import type { PortalRole, Submission, UserProfile } from "@/types/portal";

type OpsParticipant = {
  id: string;
  email: string;
  role: PortalRole;
  profile?: UserProfile;
  hackathonIds?: HackathonId[];
};

type OpsSubmissionRow = {
  id: string;
  participantId: string;
  participantEmail: string;
  teamName: string | null;
  title: string | null;
  shortDescription: string | null;
  projectUrl: string | null;
  submissionPdfUrl: string | null;
  demoVideoUrl: string | null;
  averageScore: number | null;
};

const normalizePortalRole = (value: unknown): PortalRole | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "judge" || normalized === "judges") return "judge";
  if (normalized === "mentor" || normalized === "mentors") return "mentor";
  if (normalized === "host" || normalized === "hosts") return "host";
  if (normalized === "participant" || normalized === "participants") return "participant";
  if (normalized === "admin" || normalized === "admins") return "admin";
  return undefined;
};

const getStringField = (value: unknown) => (typeof value === "string" ? value : "");

const mapUserProfile = (data: Record<string, unknown>): UserProfile => ({
  fullName: getStringField(data.fullName),
  avatarUrl: getStringField(data.avatarUrl),
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

type UseAdminPlatformOpsOptions = {
  /**
   * When set, skip the live admin catalog and use this list instead
   * (host-owned / host-ops events).
   */
  catalogOverride?: PortalHackathon[];
  /** localStorage key for the event switcher. */
  storageKey?: string;
  /** Clamp selection to these ids when using a scoped catalog. */
  allowedHackathonIds?: HackathonId[];
  /** When false, skip the admin catalog subscription (host portal). */
  useAdminCatalog?: boolean;
};

export function useAdminPlatformOps(options: UseAdminPlatformOpsOptions = {}) {
  const {
    catalogOverride,
    storageKey = HACKATHON_STORAGE_KEYS.admin,
    allowedHackathonIds,
    useAdminCatalog = catalogOverride === undefined,
  } = options;

  const db = getFirestoreDb();
  const { catalog: adminCatalog } = useAdminHackathonCatalog(db, useAdminCatalog);
  const eventCatalog = catalogOverride ?? adminCatalog;
  const { selectedHackathonId, selectedHackathon, setSelectedHackathonId } = useHackathonSelection(
    storageKey,
    allowedHackathonIds,
    eventCatalog,
    { syncUrl: true },
  );
  const { criteria: judgingCriteria } = useHackathonCriteria(selectedHackathonId);

  const [users, setUsers] = useState<OpsParticipant[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [platformOps, setPlatformOps] = useState<PlatformOpsState>(emptyPlatformOps);
  const [isSavingOps, setIsSavingOps] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeOpsProjectId, setActiveOpsProjectId] = useState<string | null>(null);
  const [opsRubric, setOpsRubric] = useState<Record<string, number>>({});
  const [opsCopilotNote, setOpsCopilotNote] = useState("Select a submission, then run the copilot.");

  useEffect(() => {
    let cancelled = false;

    if (catalogOverride !== undefined && catalogOverride.length === 0) {
      setUsers([]);
      setSubmissions([]);
      setPlatformOps(emptyPlatformOps());
      setIsLoading(false);
      setStatusMessage(null);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const [usersSnap, hackathonSubmissions, opsState] = await Promise.all([
          getDocs(collection(db, "users")),
          fetchSubmissionsForHackathon(db, selectedHackathonId),
          fetchPlatformOps(db, selectedHackathonId),
        ]);

        if (cancelled) return;

        const allUsers: OpsParticipant[] = usersSnap.docs
          .map((docSnap): OpsParticipant | null => {
            const data = docSnap.data();
            const role = normalizePortalRole(data.role);
            if (!role || typeof data.email !== "string" || !data.email.trim()) return null;
            const hackathonIds = getUserAllowedHackathonIds({
              hackathon_id: data.hackathon_id,
              hackathon_ids: data.hackathon_ids,
            });
            return {
              id: docSnap.id,
              email: data.email,
              role,
              hackathonIds:
                hackathonIds.length > 0
                  ? hackathonIds
                  : [getUserHackathonId({ hackathon_id: data.hackathon_id })],
              profile: mapUserProfile(data),
            };
          })
          .filter((user): user is OpsParticipant => user !== null);

        setUsers(allUsers);
        setSubmissions(hackathonSubmissions);
        setPlatformOps(opsState);
        setActiveOpsProjectId(null);
        setOpsCopilotNote("Select a submission, then run the copilot.");
        setStatusMessage(null);
      } catch (error: unknown) {
        if (cancelled) return;
        const text =
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "Failed to load platform ops.";
        setStatusMessage(text);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [catalogOverride, db, selectedHackathonId]);

  const hackathonUsers = useMemo(
    () =>
      filterUsersForHackathon(
        users.map((user) => ({
          ...user,
          hackathonId: user.hackathonIds?.[0],
          hackathon_id: user.hackathonIds?.[0],
          hackathon_ids: user.hackathonIds,
          hackathonIds: user.hackathonIds,
        })),
        selectedHackathonId,
        submissions,
      ),
    [selectedHackathonId, submissions, users],
  );

  const participants = useMemo(
    () => hackathonUsers.filter((user) => user.role === "participant"),
    [hackathonUsers],
  );

  const submissionRows: OpsSubmissionRow[] = useMemo(() => {
    const emailById = Object.fromEntries(users.map((user) => [user.id, user.email]));
    return submissions.map((submission) => {
      const judgeScores = Object.values(submission.judge_scores ?? {}).filter(
        (score): score is number => typeof score === "number",
      );
      const averageScore =
        judgeScores.length > 0
          ? Math.round(judgeScores.reduce((sum, score) => sum + score, 0) / judgeScores.length)
          : typeof submission.judge_score === "number"
            ? submission.judge_score
            : null;

      return {
        id: submission.id,
        participantId: submission.user_id,
        participantEmail: emailById[submission.user_id] ?? "",
        teamName: submission.team_name ?? null,
        title: submission.title,
        shortDescription: submission.short_description,
        projectUrl: submission.project_url,
        submissionPdfUrl: submission.submission_pdf_url,
        demoVideoUrl: submission.demo_video_url,
        averageScore,
      };
    });
  }, [submissions, users]);

  const persistPlatformOps = async (next: PlatformOpsState, note?: string) => {
    const withTime = { ...next, updatedAt: new Date().toISOString() };
    await savePlatformOps(db, selectedHackathonId, withTime);
    setPlatformOps(withTime);
    if (note) setStatusMessage(note);
  };

  const handleRunScreening = async () => {
    if (participants.length === 0) {
      setStatusMessage("No participants in this hackathon yet.");
      return;
    }
    setIsSavingOps(true);
    try {
      const applicants = { ...platformOps.applicants };
      participants.forEach((person) => {
        const evaluation = evaluateApplicant(person.profile, person.email);
        const existing = applicants[person.id];
        applicants[person.id] = {
          status:
            existing?.status && existing.status !== "pending"
              ? existing.status
              : evaluation.recommendation === "shortlisted"
                ? "shortlisted"
                : "pending",
          score: evaluation.score,
          teamName: existing?.teamName ?? null,
          checkedIn: existing?.checkedIn ?? false,
        };
      });
      await persistPlatformOps(
        { ...platformOps, applicants, screenedAt: new Date().toISOString() },
        `Screened ${participants.length} applicants for ${selectedHackathon.name}.`,
      );
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to run screening.";
      setStatusMessage(text);
    } finally {
      setIsSavingOps(false);
    }
  };

  const handleSetApplicantStatus = async (userId: string, status: ApplicantOpsStatus) => {
    setIsSavingOps(true);
    try {
      const existing = platformOps.applicants[userId] ?? {
        status: "pending" as const,
        score: null,
        teamName: null,
        checkedIn: false,
      };
      const evaluation = evaluateApplicant(
        participants.find((person) => person.id === userId)?.profile,
        participants.find((person) => person.id === userId)?.email,
      );
      await persistPlatformOps({
        ...platformOps,
        applicants: {
          ...platformOps.applicants,
          [userId]: {
            ...existing,
            status,
            score: existing.score ?? evaluation.score,
          },
        },
      });
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to update applicant.";
      setStatusMessage(text);
    } finally {
      setIsSavingOps(false);
    }
  };

  const handleRunProjectScreening = async () => {
    const queue = buildProjectConceptQueue(submissionRows, participants);
    if (queue.length === 0) {
      setStatusMessage("No project concepts to screen yet.");
      return;
    }

    setIsSavingOps(true);
    try {
      const profileById = Object.fromEntries(participants.map((person) => [person.id, person.profile]));
      const heuristicById = Object.fromEntries(
        queue.map((item) => [item.id, evaluateQueuedConcept(item, selectedHackathon.theme, profileById[item.participantId])]),
      );

      let aiById: Awaited<ReturnType<typeof requestAiProjectScreens>> = {};
      let usedAi = false;
      try {
        aiById = await requestAiProjectScreens({
          theme: selectedHackathon.theme,
          eventName: selectedHackathon.name,
          concepts: queue.map(toAiProjectScreenConcept),
        });
        usedAi = Object.keys(aiById).length > 0;
      } catch (error: unknown) {
        const text =
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "AI screening unavailable.";
        setStatusMessage(`${text} Ranking with the local depth model instead.`);
      }

      const ranked = [...queue].sort((left, right) =>
        compareProjectScreenScores(
          blendScreeningResults(heuristicById[left.id], aiById[left.id]),
          blendScreeningResults(heuristicById[right.id], aiById[right.id]),
        ),
      );

      const projectScreens = { ...(platformOps.projectScreens ?? {}) };
      ranked.forEach((item, index) => {
        const evaluation = blendScreeningResults(heuristicById[item.id], aiById[item.id]);
        const existing = projectScreens[item.id];
        projectScreens[item.id] = toProjectScreenRecord(
          evaluation,
          existing?.status && existing.status !== "pending"
            ? existing.status
            : evaluation.recommendation === "shortlisted"
              ? "shortlisted"
              : "pending",
          index + 1,
        );
      });

      const top = ranked[0] ? blendScreeningResults(heuristicById[ranked[0].id], aiById[ranked[0].id]) : null;
      await persistPlatformOps(
        { ...platformOps, projectScreens, projectsScreenedAt: new Date().toISOString() },
        usedAi
          ? `AI ranked ${ranked.length} concept${ranked.length === 1 ? "" : "s"} against “${selectedHackathon.theme}”. #1 ${ranked[0]?.title ?? ""} (${top?.score ?? "—"}).`
          : `Ranked ${ranked.length} concept${ranked.length === 1 ? "" : "s"} with the local depth model against “${selectedHackathon.theme}”.`,
      );
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to screen project concepts.";
      setStatusMessage(text);
    } finally {
      setIsSavingOps(false);
    }
  };

  const handleSetProjectScreenStatus = async (conceptId: string, status: ApplicantOpsStatus) => {
    const queue = buildProjectConceptQueue(submissionRows, participants);
    const item = queue.find((entry) => entry.id === conceptId);
    const profile = participants.find((person) => person.id === item?.participantId)?.profile;
    const evaluation = item
      ? evaluateQueuedConcept(item, selectedHackathon.theme, profile)
      : null;

    setIsSavingOps(true);
    try {
      const existing = platformOps.projectScreens?.[conceptId] ?? {
        status: "pending" as const,
        score: null,
      };
      await persistPlatformOps({
        ...platformOps,
        projectScreens: {
          ...(platformOps.projectScreens ?? {}),
          [conceptId]: {
            ...existing,
            status,
            score: existing.score ?? evaluation?.score ?? null,
          },
        },
      });
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to update project screen.";
      setStatusMessage(text);
    } finally {
      setIsSavingOps(false);
    }
  };

  const handleMatchTeams = async () => {
    const shortlisted = participants
      .filter((user) => platformOps.applicants[user.id]?.status === "shortlisted")
      .map((user) => ({ id: user.id, role: inferRoleFit(user.profile) }));

    if (shortlisted.length < 2) {
      setStatusMessage("Shortlist at least two people, then match.");
      return;
    }

    setIsSavingOps(true);
    try {
      const formed = matchApplicantsIntoTeams(shortlisted);
      const applicants = { ...platformOps.applicants };
      for (const team of formed) {
        for (const member of team.members) {
          const existing = applicants[member.id];
          applicants[member.id] = {
            status: existing?.status ?? "shortlisted",
            score: existing?.score ?? null,
            teamName: team.name,
            checkedIn: existing?.checkedIn ?? false,
          };
        }
      }

      for (const team of formed) {
        for (const member of team.members) {
          const submission = submissions.find((entry) => entry.user_id === member.id);
          if (!submission) continue;
          await setDoc(doc(db, "submissions", submission.id), { team_name: team.name }, { merge: true });
        }
      }

      setSubmissions((current) =>
        current.map((submission) => {
          const team = formed.find((entry) => entry.members.some((member) => member.id === submission.user_id));
          return team ? { ...submission, team_name: team.name } : submission;
        }),
      );

      await persistPlatformOps(
        { ...platformOps, applicants },
        `Matched ${formed.length} team${formed.length === 1 ? "" : "s"} and updated submissions.`,
      );
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to match teams.";
      setStatusMessage(text);
    } finally {
      setIsSavingOps(false);
    }
  };

  const handleToggleCheckIn = async (teamName: string) => {
    setIsSavingOps(true);
    try {
      const applicants = { ...platformOps.applicants };
      const members = Object.entries(applicants).filter(([, record]) => record.teamName === teamName);
      const nextCheckedIn = !members.every(([, record]) => record.checkedIn);
      for (const [id, record] of members) {
        applicants[id] = { ...record, checkedIn: nextCheckedIn };
      }
      await persistPlatformOps(
        { ...platformOps, applicants },
        nextCheckedIn ? `${teamName} checked in.` : `${teamName} check-in cleared.`,
      );
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to update check-in.";
      setStatusMessage(text);
    } finally {
      setIsSavingOps(false);
    }
  };

  const handleOpsBroadcast = async (messageBody: string) => {
    const recipients = participants.map((user) => user.email.trim()).filter(Boolean);
    if (recipients.length === 0) {
      setStatusMessage("No participants found for this hackathon.");
      return;
    }

    setIsSavingOps(true);
    try {
      const result = await sendParticipantEmail({
        type: "broadcast",
        subject: `Live update · ${selectedHackathon.name}`,
        message: messageBody,
        recipients,
        hackathonName: selectedHackathon.name,
      });
      if (result.ok === false) {
        setStatusMessage(result.error);
        return;
      }
      await persistPlatformOps(
        { ...platformOps, lastBroadcast: messageBody },
        result.preview
          ? `Broadcast logged for ${result.sent ?? recipients.length} participants (SMTP not configured).`
          : `Broadcast sent to ${result.sent ?? recipients.length} participants.`,
      );
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to send broadcast.";
      setStatusMessage(text);
    } finally {
      setIsSavingOps(false);
    }
  };

  const handleRunCopilot = () => {
    const submission =
      submissionRows.find((entry) => entry.id === activeOpsProjectId) ?? submissionRows[0];
    if (!submission) {
      setOpsCopilotNote("No submission to review yet.");
      return;
    }
    const quality = submissionQuality(submission);
    const suggested = suggestCriteriaScores(
      judgingCriteria.map((item) => ({ id: item.id, weight: item.weight })),
      quality,
    );
    setOpsRubric(suggested);
    setActiveOpsProjectId(submission.id);
    setOpsCopilotNote(
      `Copilot suggested marks for “${submission.title?.trim() || "Untitled"}” from demo pack quality.`,
    );
  };

  const handleSaveOpsScore = async () => {
    const submissionId = activeOpsProjectId ?? submissionRows[0]?.id;
    if (!submissionId) {
      setStatusMessage("Select a submission first.");
      return;
    }
    setIsSavingOps(true);
    try {
      const total = calculateTotalFromCriteria(opsRubric, judgingCriteria);
      await persistPlatformOps(
        {
          ...platformOps,
          projectScores: { ...platformOps.projectScores, [submissionId]: total },
          projectCriteria: { ...platformOps.projectCriteria, [submissionId]: opsRubric },
        },
        `Saved ${total} pts for the selected project.`,
      );
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to save score.";
      setStatusMessage(text);
    } finally {
      setIsSavingOps(false);
    }
  };

  const handleCarryForward = async (targetId: HackathonId) => {
    const shortlistedIds = Object.entries(platformOps.applicants)
      .filter(([, record]) => record.status === "shortlisted")
      .map(([id]) => id);

    if (shortlistedIds.length === 0) {
      setStatusMessage("Shortlist applicants before carrying them forward.");
      return;
    }

    setIsSavingOps(true);
    try {
      const targetOps = await fetchPlatformOps(db, targetId);
      const applicants = { ...targetOps.applicants };
      for (const id of shortlistedIds) {
        const source = platformOps.applicants[id];
        applicants[id] = {
          status: "shortlisted",
          score: source?.score ?? null,
          teamName: null,
          checkedIn: false,
        };
      }
      await savePlatformOps(db, targetId, {
        ...targetOps,
        applicants,
        screenedAt: targetOps.screenedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      for (const id of shortlistedIds) {
        const person = users.find((user) => user.id === id);
        if (!person) continue;
        const nextIds = Array.from(new Set([...(person.hackathonIds ?? []), targetId]));
        await setDoc(doc(db, "users", id), { hackathon_ids: nextIds }, { merge: true });
      }

      const nextOps = { ...platformOps, replayedTo: targetId };
      await persistPlatformOps(nextOps, `Carried ${shortlistedIds.length} shortlisted applicants to ${targetId}.`);
      setSelectedHackathonId(targetId);
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to carry applicants forward.";
      setStatusMessage(text);
    } finally {
      setIsSavingOps(false);
    }
  };

  return {
    selectedHackathonId,
    selectedHackathon,
    setSelectedHackathonId,
    hackathons: eventCatalog,
    judgingCriteria,
    participants,
    submissionRows,
    platformOps,
    isLoading,
    isSavingOps,
    statusMessage,
    activeOpsProjectId,
    setActiveOpsProjectId,
    opsRubric,
    setOpsRubric,
    opsCopilotNote,
    handleRunScreening,
    handleSetApplicantStatus,
    handleRunProjectScreening,
    handleSetProjectScreenStatus,
    handleMatchTeams,
    handleToggleCheckIn,
    handleOpsBroadcast,
    handleRunCopilot,
    handleSaveOpsScore,
    handleCarryForward,
  };
}
