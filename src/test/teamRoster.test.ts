import { describe, expect, it } from "vitest";
import {
  buildTeamRoster,
  collectTeamDisplayNames,
  countTeamBuilders,
  formatTeamMemberNames,
  isSubmissionCollaborator,
} from "@/lib/teamRoster";
import type { Submission } from "@/types/portal";

const submission: Submission = {
  id: "sub-1",
  user_id: "owner-1",
  title: "Bridge",
  short_description: null,
  project_url: null,
  submission_pdf_url: null,
  demo_video_url: null,
  created_at: null,
  judge_score: null,
  judge_notes: null,
  team_name: "BridgeRevolution",
  member_names: "Fatima",
  member_name_list: ["Fatima", "Alex"],
  team_members: [
    {
      user_id: "teammate-1",
      name: "Alex",
      email: "alex@example.com",
      joined_at: "2026-08-13T00:00:00.000Z",
    },
  ],
  member_user_ids: ["teammate-1"],
  team_leader_id: "teammate-1",
};

describe("team roster", () => {
  it("counts the creator plus joined portal accounts", () => {
    expect(countTeamBuilders(submission)).toBe(2);
    expect(collectTeamDisplayNames(submission)).toEqual(["Fatima", "Alex"]);
    expect(formatTeamMemberNames(submission)).toBe("Fatima\nAlex");
  });

  it("treats invite joiners as collaborators who can edit", () => {
    expect(isSubmissionCollaborator(submission, "owner-1")).toBe(true);
    expect(isSubmissionCollaborator(submission, "teammate-1")).toBe(true);
    expect(isSubmissionCollaborator(submission, "stranger")).toBe(false);
  });

  it("uses live people profiles on the roster", () => {
    const roster = buildTeamRoster({
      owner: { user_id: "owner-1", name: "Fatima", email: "fatima@example.com" },
      linkedMembers: submission.team_members ?? [],
      teamLeaderId: "teammate-1",
      currentUserId: "teammate-1",
      profiles: {
        "teammate-1": {
          fullName: "Alex Rivera",
          headline: "Full-stack builder",
          skills: "React, Firebase",
        },
      },
    });
    const alex = roster.find((entry) => entry.user_id === "teammate-1");
    expect(alex?.name).toBe("Alex Rivera");
    expect(alex?.profile?.headline).toBe("Full-stack builder");
  });
});
