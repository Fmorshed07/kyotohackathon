import { describe, it, expect } from "vitest";
import {
  buildAdminTop3RankingSummary,
  buildJudgeRankingDocId,
  createEmptyTop3Ranks,
  isTop3RankingComplete,
  parseTop3RankingFromFirestore,
  validateTop3Ranks,
} from "@/lib/judgeTop3Rankings";

describe("judgeTop3Rankings", () => {
  it("builds stable doc ids", () => {
    expect(buildJudgeRankingDocId("judge-1", "kyoto-2026")).toBe("judge-1_kyoto-2026");
  });

  it("validates complete unique ranks", () => {
    const ranks = { first: "s1", second: "s2", third: "s3" };
    expect(validateTop3Ranks(ranks, ["s1", "s2", "s3"])).toBeNull();
    expect(isTop3RankingComplete(ranks)).toBe(true);
  });

  it("rejects duplicate ranks", () => {
    const ranks = { first: "s1", second: "s1", third: "s3" };
    expect(validateTop3Ranks(ranks, ["s1", "s3"])).toMatch(/different submission/i);
  });

  it("parses firestore payloads", () => {
    const parsed = parseTop3RankingFromFirestore(
      {
        judge_id: "j1",
        hackathon_id: "h1",
        ranks: { first: "a", second: "b", third: "c" },
        updated_at: "2026-07-04T00:00:00.000Z",
      },
      "j1",
      "h1"
    );
    expect(parsed.ranks.first).toBe("a");
    expect(parsed.updated_at).toBe("2026-07-04T00:00:00.000Z");
  });

  it("aggregates ballot points across judges", () => {
    const summary = buildAdminTop3RankingSummary(
      [
        {
          judge_id: "j1",
          hackathon_id: "h1",
          ranks: { first: "s1", second: "s2", third: "s3" },
          updated_at: "2026-07-04T00:00:00.000Z",
        },
        {
          judge_id: "j2",
          hackathon_id: "h1",
          ranks: { first: "s1", second: "s3", third: "s2" },
          updated_at: "2026-07-04T01:00:00.000Z",
        },
      ],
      [
        { id: "s1", title: "Alpha", team_name: "Team A", participantEmail: "a@test.com" },
        { id: "s2", title: "Beta", team_name: "Team B", participantEmail: "b@test.com" },
        { id: "s3", title: "Gamma", team_name: "Team C", participantEmail: "c@test.com" },
      ],
      [
        { id: "j1", email: "judge1@test.com" },
        { id: "j2", email: "judge2@test.com" },
      ]
    );

    expect(summary.judgesSubmitted).toBe(2);
    expect(summary.leaderboard[0]?.submissionId).toBe("s1");
    expect(summary.leaderboard[0]?.ballotPoints).toBe(6);
    expect(summary.leaderboard[0]?.firstPlaceVotes).toBe(2);
    expect(summary.ballotWinners).toHaveLength(1);
    expect(summary.judgeRows).toHaveLength(2);
  });

  it("marks judges without rankings as pending", () => {
    const summary = buildAdminTop3RankingSummary(
      [],
      [{ id: "s1", title: "Alpha", participantEmail: "a@test.com" }],
      [{ id: "j1", email: "judge1@test.com" }]
    );

    expect(summary.judgesSubmitted).toBe(0);
    expect(summary.judgeRows[0]?.isComplete).toBe(false);
    expect(summary.judgeRows[0]?.ranks).toEqual(createEmptyTop3Ranks());
  });
});
