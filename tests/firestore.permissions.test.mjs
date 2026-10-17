import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { initializeTestEnvironment, assertFails as expectDenied, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, deleteField, doc, getDoc, getDocs, query, runTransaction, setDoc, updateDoc, where } from "firebase/firestore";

// Never fall back to a production database or credentials.
const address = process.env.FIRESTORE_EMULATOR_HOST;
if (!address || !/^(127\.0\.0\.1|localhost):\d+$/.test(address)) {
  throw new Error("Run with a local Firestore emulator (npm run test:rules).");
}
const [host, port] = address.split(":");
const eventId = "elevenlabs-meetup-tokyo-2026";
let env;
async function assertFails(operation) {
  const error = await expectDenied(operation);
  assert.doesNotMatch(error.message, /maximum of 1000 expressions|maximum.*access calls/i);
  return error;
}
const db = (uid) => uid ? env.authenticatedContext(uid, { email: `${uid}@example.com` }).firestore() : env.unauthenticatedContext().firestore();
const project = (extra = {}) => ({ user_id: "participant", hackathon_id: eventId, title: "ElevenCreative video", ...extra });
const save = (uid, id, data) => setDoc(doc(db(uid), "submissions", id), data);
const edit = (uid, data) => updateDoc(doc(db(uid), "submissions", "entry"), data);
const scoreUpdate = (uid, prefix = "judge") => ({
  [`${prefix}_scores.${uid}`]: 82,
  [`${prefix}_notes_by_judge.${uid}`]: "Clear idea and execution",
  [`${prefix}_criteria_scores_by_judge.${uid}`]: { idea: 42, execution: 40 },
});
async function seed(path, data) {
  await env.withSecurityRulesDisabled((context) => setDoc(doc(context.firestore(), path), data));
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-cognisor-permissions",
    firestore: { host, port: Number(port), rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8") },
  });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await Promise.all([
    seed(`hackathons/${eventId}`, { published: true, status: "upcoming", createdBy: "host" }),
    seed("users/participant", { role: "participant", hackathon_id: eventId }),
    seed("users/teammate", { role: "participant" }),
    seed("users/outsider", { role: "participant" }),
    seed("users/judge", { role: "judge", judgeApprovalStatus: "approved", hackathon_ids: [eventId] }),
    seed("users/other-judge", { role: "judge", judgeApprovalStatus: "approved", hackathon_ids: [eventId] }),
    seed("users/pending", { role: "judge", judgeApprovalStatus: "pending" }),
    seed("users/host", { role: "host", hostApprovalStatus: "approved" }),
    seed("users/admin", { role: "admin" }),
    seed("submissions/entry", project({ member_user_ids: ["teammate"] })),
  ]);
});

describe("participant submissions", () => {
  it("closes past/unpublished listings without an explicit gate for creates and updates", async () => {
    for (const fields of [{ status: "past" }, { published: false }]) {
      await seed(`hackathons/${eventId}`, { published: true, status: "upcoming", ...fields });
      await assertFails(save("participant", "past-entry", project()));
      await assertFails(edit("participant", { title: "Late change" }));
      await assertFails(edit("teammate", { title: "Late team change" }));
    }
  });
  it("honours imported deadlines even when the saved lifecycle is still upcoming", async () => {
    await seed(`hackathons/${eventId}`, {
      published: true, status: "upcoming", sourceLifecycleAutomatic: true, endAtMs: Date.now() - 60_000,
    });
    await assertFails(save("participant", "late-entry", project()));
    await assertFails(edit("participant", { title: "Late change" }));
    await assertFails(edit("teammate", { title: "Late team change" }));
    await assertSucceeds(edit("judge", scoreUpdate("judge")));
  });
  it("keeps future imported events writable and allows an explicit organiser reopening", async () => {
    await seed(`hackathons/${eventId}`, {
      published: true, status: "upcoming", sourceLifecycleAutomatic: true, endAtMs: Date.now() + 60_000,
    });
    await assertSucceeds(save("participant", "future-entry", project()));
    await seed(`hackathons/${eventId}`, {
      published: true, status: "past", sourceLifecycleAutomatic: true, endAtMs: 0, submissionMode: "open",
    });
    await assertSucceeds(edit("participant", { title: "Reopened" }));
    await seed(`hackathons/${eventId}`, { published: true, status: "active", sourceLifecycleAutomatic: false, endAtMs: 0 });
    await assertSucceeds(edit("participant", { title: "Organiser lifecycle override" }));
  });
  it("persists Osaka's video challenge for owners and linked teammates, then locks participant edits", async () => {
    const osaka = "impact-osaka-2026";
    await seed(`hackathons/${osaka}`, { published: true, status: "upcoming", sourceLifecycleAutomatic: true, endAtMs: Date.now() + 60_000 });
    await seed("submissions/entry", project({ hackathon_id: osaka, member_user_ids: ["teammate"] }));
    await assertSucceeds(edit("participant", { track_id: "ai-video", title: "Osaka AI video" }));
    await assertSucceeds(edit("teammate", { track_id: "ai-video", short_description: "Updated team video description" }));
    await seed(`hackathons/${osaka}`, { published: true, submissionMode: "paused" });
    await assertFails(edit("participant", { track_id: "ai-video", title: "Late owner edit" }));
    await assertFails(edit("teammate", { track_id: "ai-video", short_description: "Late teammate edit" }));
    await assertSucceeds(edit("judge", scoreUpdate("judge")));
  });
  it("creates and edits for the imported ElevenLabs listing without submissionMode", async () => {
    await assertSucceeds(save("participant", "new-entry", project()));
    await assertSucceeds(edit("participant", { title: "Updated video" }));
  });
  it("allows a legacy event without a persisted listing", async () => {
    await assertSucceeds(save("participant", "legacy", project({ hackathon_id: "legacy-event" })));
  });
  it("permits legacy submissions without an event field", async () => {
    await assertSucceeds(save("participant", "legacy", { user_id: "participant", title: "Legacy draft" }));
    await assertSucceeds(updateDoc(doc(db("participant"), "submissions", "legacy"), { title: "Edited" }));
  });
  it("allows the portal's legacy Tokyo ID backfill, but not an arbitrary event transfer", async () => {
    await seed("submissions/entry", { user_id: "participant", title: "Legacy draft" });
    await assertFails(edit("participant", { hackathon_id: eventId }));
    await assertSucceeds(edit("participant", { hackathon_id: "impact-tokyo", title: "Updated legacy draft" }));
  });
  for (const mode of ["open", "paused", "closed"]) {
    it(`honours the organiser's ${mode} mode for create and update`, async () => {
      await seed(`hackathons/${eventId}`, { published: true, submissionMode: mode, createdBy: "host" });
      const check = mode === "open" ? assertSucceeds : assertFails;
      await check(save("participant", "new-entry", project()));
      await check(edit("participant", { title: "Changed" }));
      await check(edit("teammate", { title: "Team update" }));
    });
  }
  it("allows linked teammates to edit a project", async () => {
    await assertSucceeds(edit("teammate", { title: "Team video" }));
  });
  it("supports legacy membership reads without member_user_ids", async () => {
    await seed("submissions/entry", project());
    await seed("team_memberships/entry_teammate", { user_id: "teammate", submission_id: "entry" });
    await assertSucceeds(getDoc(doc(db("teammate"), "submissions", "entry")));
  });
  it("allows own and teammate queries but denies the public and unrelated users", async () => {
    await assertSucceeds(getDocs(query(collection(db("participant"), "submissions"), where("user_id", "==", "participant"))));
    await assertSucceeds(getDocs(query(collection(db("teammate"), "submissions"), where("member_user_ids", "array-contains", "teammate"))));
    await assertFails(getDocs(collection(db(), "submissions")));
    await assertFails(getDoc(doc(db("outsider"), "submissions", "entry")));
    await assertFails(edit("outsider", { title: "Hijacked" }));
  });
  it("denies spoofed ownership on create and ownership/event changes on update", async () => {
    await assertFails(save("outsider", "spoofed", project()));
    await assertFails(edit("participant", { user_id: "outsider" }));
    await assertFails(edit("participant", { hackathon_id: "other-event" }));
  });
  for (const field of ["judge_score", "judge_id", "judge_notes", "judge_criteria_scores", "judge_scores", "judge_notes_by_judge", "judge_criteria_scores_by_judge", "final_shortlisted", "final_judge_scores"]) {
    it(`prevents participant injection of ${field} on create and update`, async () => {
      await seed(`hackathons/${eventId}`, { published: true, submissionMode: "open" });
      await assertFails(save("participant", "new-entry", project({ [field]: 99 })));
      await assertFails(edit("participant", { [field]: 99 }));
    });
  }
  it("preserves judge marks during participant project edits", async () => {
    await seed("submissions/entry", project({ judge_scores: { judge: 82 } }));
    await assertSucceeds(edit("participant", { title: "Final title" }));
    await assertFails(edit("participant", { judge_scores: deleteField() }));
    assert.deepEqual((await getDoc(doc(db("participant"), "submissions", "entry"))).data().judge_scores, { judge: 82 });
  });
  it("denies unauthenticated submission creation", async () => {
    await assertFails(save(null, "new-entry", project()));
  });
  it("allows enrollment and opt-in gallery creation without the optional gate field", async () => {
    await assertSucceeds(setDoc(doc(db("participant"), "users", "participant"), { hackathon_ids: [eventId] }, { merge: true }));
    await assertSucceeds(setDoc(doc(db("participant"), "public_projects", "entry"), {
      owner_id: "participant", hackathon_id: eventId, title: "Video", public_preview_consent: true,
    }));
  });
});

describe("judges and organiser marks", () => {
  it("loads event submissions with the dashboard query", async () => {
    await assertSucceeds(getDocs(query(collection(db("judge"), "submissions"), where("hackathon_id", "==", eventId))));
  });
  for (const prefix of ["judge", "final_judge"]) {
    it(`saves and revises only the signed-in judge's ${prefix} maps`, async () => {
      await seed("submissions/entry", project({ final_shortlisted: true }));
      await assertSucceeds(edit("judge", scoreUpdate("judge", prefix)));
      await assertSucceeds(edit("other-judge", scoreUpdate("other-judge", prefix)));
      await assertSucceeds(edit("judge", { [`${prefix}_scores.judge`]: 85 }));
      const saved = (await getDoc(doc(db("judge"), "submissions", "entry"))).data();
      assert.deepEqual(saved[`${prefix}_scores`], { judge: 85, "other-judge": 82 });
      await assertFails(edit("judge", { [`${prefix}_scores.other-judge`]: 1 }));
      await assertFails(edit("judge", { [`${prefix}_notes_by_judge.other-judge`]: "Overwritten" }));
      await assertFails(edit("judge", { [`${prefix}_criteria_scores_by_judge.other-judge`]: {} }));
      await assertFails(edit("judge", { [`${prefix}_scores`]: { judge: 85 } }));
    });
  }
  it("denies pending judges, participants and unrelated users scoring", async () => {
    for (const uid of ["pending", "participant", "teammate", "outsider"]) {
      await assertFails(edit(uid, scoreUpdate(uid)));
    }
  });
  it("does not let judges change project content, ownership or shortlist decisions", async () => {
    for (const data of [{ title: "Changed" }, { user_id: "judge" }, { hackathon_id: "other-event" }, { final_shortlisted: true }]) {
      await assertFails(edit("judge", data));
    }
  });
  it("does not accept final marks before an organiser shortlists the project", async () => {
    await assertFails(edit("judge", scoreUpdate("judge", "final_judge")));
  });
  it("rejects malformed, negative and oversized judge marks", async () => {
    for (const data of [
      { "judge_scores.judge": "82" }, { "judge_scores.judge": -1 },
      { "judge_notes_by_judge.judge": "x".repeat(10001) },
      { "judge_criteria_scores_by_judge.judge": "invalid" },
    ]) await assertFails(edit("judge", data));
  });
  it("still lets judges score and organisers manage paused events", async () => {
    await seed(`hackathons/${eventId}`, { submissionMode: "paused", createdBy: "host" });
    await assertSucceeds(edit("judge", scoreUpdate("judge")));
    await assertSucceeds(edit("admin", { final_shortlisted: true }));
    await assertSucceeds(edit("host", { final_shortlisted: false }));
  });
  it("can read an absent own ballot and save/revise it without touching other judges", async () => {
    const ref = doc(db("judge"), "judge_rankings", `judge_${eventId}`);
    await assertSucceeds(getDoc(ref));
    const ballot = { judge_id: "judge", hackathon_id: eventId, ranks: { first: "a", second: "b", third: "c" }, updated_at: "2026-10-09T10:00:00Z" };
    await assertSucceeds(setDoc(ref, ballot));
    await assertSucceeds(setDoc(ref, { ...ballot, ranks: { first: "c", second: "b", third: "a" } }, { merge: true }));
    await assertFails(setDoc(doc(db("other-judge"), "judge_rankings", `judge_${eventId}`), ballot));
    await assertFails(setDoc(doc(db("participant"), "judge_rankings", `participant_${eventId}`), { ...ballot, judge_id: "participant" }));
  });
});

describe("automatic permissions for newly hosted events", () => {
  for (const id of ["new-community-meetup", "future-creative-challenge"]) {
    it(`supports the complete host/participant/judge workflow for ${id} without per-event rules`, async () => {
      const hostDb = db("host");
      const hostEventId = `ops-${id}`;
      await assertSucceeds(setDoc(doc(hostDb, "host_events", hostEventId), { owner_id: "host", name: id, status: "draft" }));
      await assertSucceeds(getDocs(query(collection(hostDb, "host_events"), where("owner_id", "==", "host"))));
      await assertSucceeds(setDoc(doc(hostDb, "hackathons", id), {
        published: true, status: "upcoming", createdBy: "host", hostEventId,
      }));
      await assertSucceeds(runTransaction(hostDb, async (transaction) => {
        const ref = doc(hostDb, "hackathon_criteria", id);
        if (!(await transaction.get(ref)).exists()) {
          transaction.set(ref, { criteria: [{ id: "idea", weight: 100 }] });
        }
      }));
      await assertSucceeds(setDoc(doc(hostDb, "hackathon_ops", id), { stage: "submissions" }));
      await assertSucceeds(updateDoc(doc(hostDb, "host_events", hostEventId), { public_hackathon_id: id, status: "published" }));
      await assertSucceeds(setDoc(doc(hostDb, "host_tickets", `ticket-${id}`), { host_id: "host", event_id: hostEventId, status: "issued" }));
      await assertSucceeds(updateDoc(doc(hostDb, "host_tickets", `ticket-${id}`), { status: "checked_in" }));
      await assertSucceeds(setDoc(doc(hostDb, "host_judges", `contact-${id}`), { host_id: "host", event_id: hostEventId, name: "Judge" }));
      const inviteToken = `judge-invite-${id}`;
      await assertSucceeds(setDoc(doc(hostDb, "portal_invites", inviteToken), {
        type: "judge", status: "open", created_by: "host", hackathon_ids: [id], use_count: 0, used_by: [],
      }));
      // An invite grants the new judge access; there is no per-event rule edit.
      const invitedDb = db("invited-judge");
      await assertSucceeds(setDoc(doc(invitedDb, "users", "invited-judge"), {
        role: "judge", judgeApprovalStatus: "approved", invite_token: inviteToken,
        hackathon_id: id, hackathon_ids: [id],
      }));
      await assertSucceeds(updateDoc(doc(hostDb, "users", "pending"), {
        judgeApprovalStatus: "approved", hackathon_id: id, hackathon_ids: [id],
      }));
      const participantDb = db("participant");
      await assertSucceeds(setDoc(doc(participantDb, "users", "participant"), { hackathon_id: id, hackathon_ids: [eventId, id] }, { merge: true }));
      await assertSucceeds(save("participant", id, project({ hackathon_id: id })));
      await assertSucceeds(updateDoc(doc(participantDb, "submissions", id), { demo_video_url: "https://example.com/demo" }));
      await assertSucceeds(getDocs(query(collection(invitedDb, "submissions"), where("hackathon_id", "==", id))));
      await assertSucceeds(updateDoc(doc(invitedDb, "submissions", id), scoreUpdate("invited-judge")));
      await assertSucceeds(updateDoc(doc(db("pending"), "submissions", id), scoreUpdate("pending")));
      await assertSucceeds(getDocs(query(collection(hostDb, "submissions"), where("hackathon_id", "==", id))));
      await assertSucceeds(updateDoc(doc(hostDb, "submissions", id), { final_shortlisted: true }));
      await assertSucceeds(updateDoc(doc(invitedDb, "submissions", id), scoreUpdate("invited-judge", "final_judge")));
      // An organiser's pause remains authoritative after publishing.
      await assertSucceeds(updateDoc(doc(hostDb, "hackathons", id), { submissionMode: "paused" }));
      await assertFails(updateDoc(doc(participantDb, "submissions", id), { title: "Too late" }));
      await assertSucceeds(updateDoc(doc(invitedDb, "submissions", id), { "judge_scores.invited-judge": 90 }));
      await assertSucceeds(updateDoc(doc(hostDb, "hackathons", id), { submissionMode: "open" }));
      await assertSucceeds(updateDoc(doc(participantDb, "submissions", id), { title: "Reopened" }));
      await assertSucceeds(updateDoc(doc(hostDb, "hackathons", id), { published: false }));
      await assertSucceeds(getDoc(doc(hostDb, "hackathons", id)));
      await assertFails(getDoc(doc(db(), "hackathons", id)));
    });
  }

  it("retains the original host's management rights when an admin publishes their event", async () => {
    await seed("host_events/admin-assisted", { owner_id: "host", status: "published" });
    await seed("hackathons/admin-assisted", { createdBy: "admin", hostEventId: "admin-assisted", published: false });
    await assertSucceeds(getDoc(doc(db("host"), "hackathons", "admin-assisted")));
    await assertSucceeds(updateDoc(doc(db("host"), "hackathons", "admin-assisted"), { published: true }));
    await assertSucceeds(setDoc(doc(db("host"), "hackathon_criteria", "admin-assisted"), { criteria: [] }));
    await assertSucceeds(setDoc(doc(db("host"), "hackathon_ops", "admin-assisted"), { stage: "judging" }));
  });

  it("allows the linked owner to repair legacy listings missing creator metadata", async () => {
    await seed("host_events/legacy-hosted", { owner_id: "host" });
    await seed("hackathons/legacy-hosted", { hostEventId: "legacy-hosted", published: false });
    await assertSucceeds(getDoc(doc(db("host"), "hackathons", "legacy-hosted")));
    await assertSucceeds(updateDoc(doc(db("host"), "hackathons", "legacy-hosted"), { createdBy: "host", published: true }));
    await assertSucceeds(setDoc(doc(db("host"), "hackathon_criteria", "legacy-hosted"), { criteria: [] }));
  });

  it("does not turn automatic event access into permission to manage someone else's event", async () => {
    await seed("users/other-host", { role: "host", hostApprovalStatus: "approved" });
    await seed("host_events/private-host-event", { owner_id: "host" });
    await seed("hackathons/private-host-event", { createdBy: "host", hostEventId: "private-host-event", published: false });
    const other = db("other-host");
    await assertFails(getDoc(doc(other, "host_events", "private-host-event")));
    await assertFails(getDoc(doc(other, "hackathons", "private-host-event")));
    await assertFails(updateDoc(doc(other, "hackathons", "private-host-event"), { published: true }));
    await assertFails(setDoc(doc(other, "hackathon_criteria", "private-host-event"), { criteria: [] }));
    await assertFails(setDoc(doc(other, "hackathon_ops", "private-host-event"), { stage: "judging" }));
    await assertFails(setDoc(doc(other, "hackathons", "forged-link"), { createdBy: "other-host", hostEventId: "private-host-event", published: true }));
  });

  it("retains approval requirements and prevents ownership transfer", async () => {
    await seed("users/pending-host", { role: "host", hostApprovalStatus: "pending" });
    await assertFails(setDoc(doc(db("pending-host"), "host_events", "unapproved"), { owner_id: "pending-host" }));
    await assertFails(updateDoc(doc(db("pending-host"), "users", "pending-host"), { hostApprovalStatus: "approved" }));
    await seed("host_events/owned", { owner_id: "host" });
    await assertFails(updateDoc(doc(db("host"), "host_events", "owned"), { owner_id: "outsider" }));
    await assertFails(setDoc(doc(db("host"), "hackathons", "forged-owner"), { createdBy: "outsider", hostEventId: "owned", published: true }));
  });
});
