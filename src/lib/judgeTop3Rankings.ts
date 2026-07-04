import {
  collection,
  getDocs,
  query,
  where,
  type Firestore,
} from "firebase/firestore";
import type { JudgeTop3Ranking, JudgeTop3Ranks, Top3RankSlot } from "@/types/portal";

export const TOP3_RANK_SLOTS: Top3RankSlot[] = ["first", "second", "third"];

export const TOP3_SLOT_LABELS: Record<Top3RankSlot, string> = {
  first: "1st place",
  second: "2nd place",
  third: "3rd place",
};

export const TOP3_SLOT_POINTS: Record<Top3RankSlot, number> = {
  first: 3,
  second: 2,
  third: 1,
};

export function buildJudgeRankingDocId(judgeId: string, hackathonId: string): string {
  return `${judgeId}_${hackathonId}`;
}

export function createEmptyTop3Ranks(): JudgeTop3Ranks {
  return { first: null, second: null, third: null };
}

export function createEmptyTop3Ranking(judgeId: string, hackathonId: string): JudgeTop3Ranking {
  return {
    judge_id: judgeId,
    hackathon_id: hackathonId,
    ranks: createEmptyTop3Ranks(),
    updated_at: null,
  };
}

export function isTop3RankingComplete(ranks: JudgeTop3Ranks): boolean {
  return ranks.first != null && ranks.second != null && ranks.third != null;
}

export function hasDuplicateTop3Ranks(ranks: JudgeTop3Ranks): boolean {
  const ids = [ranks.first, ranks.second, ranks.third].filter(Boolean) as string[];
  return new Set(ids).size !== ids.length;
}

export function validateTop3Ranks(
  ranks: JudgeTop3Ranks,
  validSubmissionIds: string[]
): string | null {
  if (!isTop3RankingComplete(ranks)) {
    return "Select a submission for all three ranks before saving.";
  }
  if (hasDuplicateTop3Ranks(ranks)) {
    return "Each rank must be a different submission.";
  }
  const validSet = new Set(validSubmissionIds);
  for (const slot of TOP3_RANK_SLOTS) {
    const id = ranks[slot];
    if (id && !validSet.has(id)) {
      return "One or more selected submissions are no longer available.";
    }
  }
  return null;
}

export function parseTop3RankingFromFirestore(
  data: Record<string, unknown> | undefined,
  judgeId: string,
  hackathonId: string
): JudgeTop3Ranking {
  const empty = createEmptyTop3Ranking(judgeId, hackathonId);
  if (!data) return empty;

  const ranksRaw = data.ranks;
  if (!ranksRaw || typeof ranksRaw !== "object") return empty;

  const ranks = ranksRaw as Record<string, unknown>;
  return {
    judge_id: typeof data.judge_id === "string" ? data.judge_id : judgeId,
    hackathon_id: typeof data.hackathon_id === "string" ? data.hackathon_id : hackathonId,
    ranks: {
      first: typeof ranks.first === "string" ? ranks.first : null,
      second: typeof ranks.second === "string" ? ranks.second : null,
      third: typeof ranks.third === "string" ? ranks.third : null,
    },
    updated_at: typeof data.updated_at === "string" ? data.updated_at : null,
  };
}

export function buildTop3RankingFirestorePayload(
  judgeId: string,
  hackathonId: string,
  ranks: JudgeTop3Ranks
): JudgeTop3Ranking {
  return {
    judge_id: judgeId,
    hackathon_id: hackathonId,
    ranks: {
      first: ranks.first,
      second: ranks.second,
      third: ranks.third,
    },
    updated_at: new Date().toISOString(),
  };
}

export type Top3BallotLeaderboardEntry = {
  submissionId: string;
  title: string;
  teamName: string | null;
  participantEmail: string;
  ballotPoints: number;
  firstPlaceVotes: number;
  secondPlaceVotes: number;
  thirdPlaceVotes: number;
};

export type AdminJudgeTop3Row = {
  judgeId: string;
  judgeEmail: string;
  ranks: JudgeTop3Ranks;
  isComplete: boolean;
  updatedAt: string | null;
};

export type AdminTop3RankingSummary = {
  leaderboard: Top3BallotLeaderboardEntry[];
  judgeRows: AdminJudgeTop3Row[];
  judgesSubmitted: number;
  registeredJudges: number;
  ballotWinners: Top3BallotLeaderboardEntry[];
  topBallotScore: number | null;
};

type SubmissionLookup = {
  id: string;
  title: string | null;
  team_name?: string | null;
  participantEmail: string;
};

export async function fetchJudgeRankingsForHackathon(
  db: Firestore,
  hackathonId: string
): Promise<JudgeTop3Ranking[]> {
  const rankingsRef = collection(db, "judge_rankings");
  const rankingsQuery = query(rankingsRef, where("hackathon_id", "==", hackathonId));
  const snapshot = await getDocs(rankingsQuery);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    const judgeId =
      typeof data.judge_id === "string"
        ? data.judge_id
        : docSnap.id.replace(`_${hackathonId}`, "");
    return parseTop3RankingFromFirestore(data, judgeId, hackathonId);
  });
}

export function buildAdminTop3RankingSummary(
  rankings: JudgeTop3Ranking[],
  submissions: SubmissionLookup[],
  staffJudges: Array<{ id: string; email: string }>
): AdminTop3RankingSummary {
  const submissionById = new Map(submissions.map((submission) => [submission.id, submission]));
  const tally = new Map<
    string,
    { first: number; second: number; third: number; points: number }
  >();

  for (const ranking of rankings) {
    if (!isTop3RankingComplete(ranking.ranks)) continue;

    for (const slot of TOP3_RANK_SLOTS) {
      const submissionId = ranking.ranks[slot];
      if (!submissionId) continue;

      const current = tally.get(submissionId) ?? {
        first: 0,
        second: 0,
        third: 0,
        points: 0,
      };
      current.points += TOP3_SLOT_POINTS[slot];
      if (slot === "first") current.first += 1;
      if (slot === "second") current.second += 1;
      if (slot === "third") current.third += 1;
      tally.set(submissionId, current);
    }
  }

  const leaderboard: Top3BallotLeaderboardEntry[] = Array.from(tally.entries())
    .map(([submissionId, counts]) => {
      const submission = submissionById.get(submissionId);
      return {
        submissionId,
        title: submission?.title?.trim() || "Untitled Project",
        teamName: submission?.team_name?.trim() || null,
        participantEmail: submission?.participantEmail ?? "Unknown participant",
        ballotPoints: counts.points,
        firstPlaceVotes: counts.first,
        secondPlaceVotes: counts.second,
        thirdPlaceVotes: counts.third,
      };
    })
    .sort((left, right) => {
      if (right.ballotPoints !== left.ballotPoints) {
        return right.ballotPoints - left.ballotPoints;
      }
      if (right.firstPlaceVotes !== left.firstPlaceVotes) {
        return right.firstPlaceVotes - left.firstPlaceVotes;
      }
      return left.title.localeCompare(right.title);
    });

  const rankingByJudgeId = new Map(rankings.map((ranking) => [ranking.judge_id, ranking]));
  const judgeRows: AdminJudgeTop3Row[] = staffJudges.map((judge) => {
    const ranking = rankingByJudgeId.get(judge.id);
    return {
      judgeId: judge.id,
      judgeEmail: judge.email,
      ranks: ranking?.ranks ?? createEmptyTop3Ranks(),
      isComplete: ranking ? isTop3RankingComplete(ranking.ranks) : false,
      updatedAt: ranking?.updated_at ?? null,
    };
  });

  const judgesSubmitted = judgeRows.filter((row) => row.isComplete).length;
  const topBallotScore = leaderboard[0]?.ballotPoints ?? null;
  const ballotWinners =
    topBallotScore == null
      ? []
      : leaderboard.filter((entry) => entry.ballotPoints === topBallotScore);

  return {
    leaderboard,
    judgeRows,
    judgesSubmitted,
    registeredJudges: staffJudges.length,
    ballotWinners,
    topBallotScore,
  };
}

export function getSubmissionLabelForRank(
  submissionId: string | null,
  submissionById: Map<string, SubmissionLookup>
): string {
  if (!submissionId) return "—";
  const submission = submissionById.get(submissionId);
  if (!submission) return "Unknown submission";
  const title = submission.title?.trim() || "Untitled Project";
  const team = submission.team_name?.trim();
  return team ? `${title} — ${team}` : title;
}
