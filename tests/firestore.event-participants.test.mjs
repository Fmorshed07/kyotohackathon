import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { initializeTestEnvironment, assertFails as expectDenied, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, collectionGroup, deleteDoc, deleteField, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from "firebase/firestore";

const address = process.env.FIRESTORE_EMULATOR_HOST;
if (!address || !/^(127\.0\.0\.1|localhost):\d+$/.test(address)) {
  throw new Error("Use a local Firestore emulator, never production.");
}
const [host, port] = address.split(":");
const eventId = "impact-osaka-2026";
const otherEventId = "another-hackathon";
const registrationId = createHash("sha256").update(`luma\0${eventId}\0approved@example.com`).digest("hex");
const otherRegistrationId = createHash("sha256").update(`luma\0${eventId}\0other@example.com`).digest("hex");
let env;

const users = {
  admin: { role: "admin" },
  pluralAdmin: { role: "admins" },
  participant: { role: "participant", hackathon_ids: [eventId] },
  judge: { role: "judge", judgeApprovalStatus: "approved", hackathon_ids: [eventId] },
  mentor: { role: "mentor", judgeApprovalStatus: "approved", hackathon_ids: [eventId] },
  pluralJudge: { role: "judges", judgeApprovalStatus: "approved", hackathon_ids: [eventId] },
  pluralMentor: { role: "mentors", judgeApprovalStatus: "approved", hackathon_ids: [eventId] },
  legacyJudge: { role: "judge", judgeApprovalStatus: "approved", hackathon_id: eventId },
  unassigned: { role: "judge", judgeApprovalStatus: "approved", hackathon_ids: [otherEventId] },
  emptyAssignments: { role: "judge", judgeApprovalStatus: "approved", hackathon_id: eventId, hackathon_ids: [] },
  malformedAssignments: { role: "judge", judgeApprovalStatus: "approved", hackathon_id: eventId, hackathon_ids: null },
  pending: { role: "judge", judgeApprovalStatus: "pending", hackathon_ids: [eventId] },
  host: { role: "host", hostApprovalStatus: "approved", hackathon_ids: [eventId] },
};
const db = (uid, claims = {}) => uid
  ? env.authenticatedContext(uid, { email: `${uid}@example.com`, firebase: { sign_in_provider: "password" }, ...claims }).firestore()
  : env.unauthenticatedContext().firestore();
const privateRef = (database, id = registrationId) => doc(database, "participant_registrations", id);
const rosterCollection = (database, id = eventId) => collection(database, "hackathons", id, "participant_roster");
const rosterRef = (database, id = eventId, participantId = registrationId) => doc(rosterCollection(database, id), participantId);
const rosterQuery = (database, id = eventId, count = 500) => query(rosterCollection(database, id), limit(count));
const ownQuery = (database, email = "approved@example.com", count = 100) => query(collection(database, "participant_registrations"), where("email", "==", email), limit(count));
const registration = (patch = {}) => ({
  hackathon_id: eventId,
  email: "approved@example.com",
  display_name: "Aki Example",
  attendance_mode: "online",
  approval_status: "approved",
  source: "luma",
  source_guest_id: "guest-approved",
  registered_at: "2026-10-17T11:30:00.000Z",
  imported_at: serverTimestamp(),
  matched_user_id: null,
  ...patch,
});
const rosterEntry = (patch = {}) => ({
  display_name: "Aki Example",
  attendance_mode: "online",
  approval_status: "approved",
  source: "luma",
  ...patch,
});
async function assertFails(operation) {
  const error = await expectDenied(operation);
  assert.doesNotMatch(error.message, /maximum of 1000 expressions|maximum.*access calls/i);
  return error;
}
async function seed(path, data) {
  await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), path), data));
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
    ...Object.entries(users).map(([uid, data]) => seed(`users/${uid}`, data)),
    seed(`hackathons/${eventId}`, { published: true, createdBy: "host" }),
    seed(`participant_registrations/${registrationId}`, registration()),
    seed(`participant_registrations/${otherRegistrationId}`, registration({ email: "other@example.com", source_guest_id: "guest-other" })),
    seed(`hackathons/${eventId}/participant_roster/${registrationId}`, rosterEntry()),
    seed(`hackathons/${otherEventId}/participant_roster/${registrationId}`, rosterEntry({ display_name: "Another participant" })),
  ]);
});

describe("private imported participant registrations", () => {
  it("lets actual database admins manage validated registrations", async () => {
    for (const uid of ["admin", "pluralAdmin"]) {
      const database = db(uid);
      await assertSucceeds(getDoc(privateRef(database)));
      assert.equal((await assertSucceeds(getDocs(collection(database, "participant_registrations")))).size, 2);
      await assertSucceeds(setDoc(privateRef(database), registration({ attendance_mode: "onsite", matched_user_id: "participant" })));
      await assertSucceeds(updateDoc(privateRef(database), { attendance_mode: "unspecified", imported_at: serverTimestamp() }));
    }
    await assertSucceeds(deleteDoc(privateRef(db("admin"))));
  });

  it("allows only a verified owner to read registrations matching the normalized auth email", async () => {
    const database = db("new-signup-without-portal-profile", { email: "Approved@Example.com", email_verified: true });
    assert.equal((await assertSucceeds(getDoc(privateRef(database)))).data().email, "approved@example.com");
    const result = await assertSucceeds(getDocs(ownQuery(database)));
    assert.equal(result.size, 1);
    assert.equal(result.docs[0].id, registrationId);
    await assertFails(getDoc(privateRef(database, otherRegistrationId)));
    await assertFails(getDocs(ownQuery(database, "other@example.com")));
    await assertFails(getDocs(collection(database, "participant_registrations")));
    await assertFails(getDocs(ownQuery(database, "approved@example.com", 101)));
  });

  it("denies unverified, mismatched, absent and anonymous auth email claims", async () => {
    for (const database of [
      db(null),
      db("claimant", { email: "approved@example.com", email_verified: false }),
      db("claimant", { email: "approved@example.com" }),
      db("claimant", { email: "other-person@example.com", email_verified: true }),
      db("claimant", { email: null, email_verified: true }),
      db("claimant", { email: "approved@example.com", email_verified: true, firebase: { sign_in_provider: "anonymous" } }),
    ]) {
      await assertFails(getDoc(privateRef(database)));
      await assertFails(getDocs(ownQuery(database)));
    }
  });

  it("keeps private emails unreadable to assigned judges, mentors, hosts and participants", async () => {
    for (const uid of ["judge", "mentor", "pluralJudge", "pluralMentor", "host", "participant", "pending", "unassigned"]) {
      const database = db(uid, { email_verified: true });
      await assertFails(getDoc(privateRef(database)));
      await assertFails(getDocs(ownQuery(database)));
    }
  });

  it("does not let a verified registration owner create, claim, edit or delete imported records", async () => {
    const database = db("claimant", { email: "approved@example.com", email_verified: true });
    await assertFails(setDoc(privateRef(database, "c".repeat(64)), registration()));
    await assertFails(updateDoc(privateRef(database), { matched_user_id: "claimant", imported_at: serverTimestamp() }));
    await assertFails(deleteDoc(privateRef(database)));
  });

  it("requires every private field and a bounded opaque hash document ID", async () => {
    for (const field of Object.keys(registration())) {
      const data = registration();
      delete data[field];
      await assertFails(setDoc(privateRef(db("admin")), data));
    }
    for (const id of ["approved@example.com", "a".repeat(63), "b".repeat(65), "A".repeat(64), "g".repeat(64)]) {
      await assertFails(setDoc(privateRef(db("admin"), id), registration()));
    }
  });

  const invalidPrivateFields = {
    "extra data": { raw_csv: "private source" },
    "uppercase email": { email: "Approved@Example.com" },
    "invalid email": { email: "not-an-email" },
    "long email": { email: `${"a".repeat(244)}@example.com` },
    "invalid event": { hackathon_id: "event/other" },
    "long event": { hackathon_id: "a".repeat(129) },
    "blank display name": { display_name: " \n\t " },
    "long display name": { display_name: "a".repeat(121) },
    "invalid attendance": { attendance_mode: "hybrid" },
    "unapproved registration": { approval_status: "pending" },
    "another source": { source: "uploaded" },
    "empty guest id": { source_guest_id: "" },
    "long guest id": { source_guest_id: "a".repeat(129) },
    "long registration timestamp": { registered_at: "a".repeat(81) },
    "non-string registration timestamp": { registered_at: Timestamp.fromMillis(1) },
    "backdated import timestamp": { imported_at: Timestamp.fromMillis(1) },
    "string import timestamp": { imported_at: "2026-10-17" },
    "empty matched user": { matched_user_id: "" },
    "long matched user": { matched_user_id: "a".repeat(129) },
    "wrong matched user type": { matched_user_id: 7 },
  };
  for (const [label, patch] of Object.entries(invalidPrivateFields)) {
    it(`rejects ${label} on both create and update`, async () => {
      await assertFails(setDoc(privateRef(db("admin"), "c".repeat(64)), registration(patch)));
      await assertFails(updateDoc(privateRef(db("admin")), { ...patch, ...(Object.hasOwn(patch, "imported_at") ? {} : { imported_at: serverTimestamp() }) }));
    });
  }

  it("accepts documented private field boundaries and a server-timestamped update", async () => {
    await assertSucceeds(setDoc(privateRef(db("admin")), registration({
      hackathon_id: "a".repeat(128), email: `${"a".repeat(242)}@example.com`, display_name: "名".repeat(120),
      source_guest_id: "a".repeat(128), registered_at: "r".repeat(80), matched_user_id: "u".repeat(128),
    })));
    await assertFails(updateDoc(privateRef(db("admin")), { display_name: "Changed without import time" }));
    await assertSucceeds(updateDoc(privateRef(db("admin")), { display_name: "Changed", imported_at: serverTimestamp() }));
  });
});

describe("email-free event participant rosters", () => {
  it("lets only actual admins write exact safe roster fields and delete them", async () => {
    for (const uid of ["admin", "pluralAdmin"]) {
      await assertSucceeds(setDoc(rosterRef(db(uid)), rosterEntry()));
      await assertSucceeds(updateDoc(rosterRef(db(uid)), { attendance_mode: "onsite", display_name: "Ren Example" }));
      const snapshot = await assertSucceeds(getDoc(rosterRef(db(uid))));
      assert.deepEqual(Object.keys(snapshot.data()).sort(), ["approval_status", "attendance_mode", "display_name", "source"]);
    }
    await assertSucceeds(deleteDoc(rosterRef(db("admin"))));
  });

  for (const uid of ["admin", "pluralAdmin", "judge", "mentor", "pluralJudge", "pluralMentor", "legacyJudge"]) {
    it(`lets ${uid} read the assigned event roster without fetching private registrations`, async () => {
      const result = await assertSucceeds(getDocs(rosterQuery(db(uid))));
      assert.equal(result.size, 1);
      assert.equal(result.docs[0].data().display_name, "Aki Example");
      await assertSucceeds(getDoc(rosterRef(db(uid))));
    });
  }

  it("does not grant roster access through a public parent listing or host ownership", async () => {
    await assertSucceeds(getDoc(doc(db(null), "hackathons", eventId)));
    for (const uid of [null, "participant", "host", "pending", "unassigned", "missing-profile", "emptyAssignments", "malformedAssignments"]) {
      await assertFails(getDoc(rosterRef(db(uid))));
      await assertFails(getDocs(rosterQuery(db(uid))));
    }
  });

  it("preserves event isolation even when another event has a roster and the client supplies claims", async () => {
    const database = db("judge", { role: "admin", admin: true, hackathon_ids: [otherEventId] });
    await assertSucceeds(getDocs(rosterQuery(database)));
    await assertFails(getDoc(rosterRef(database, otherEventId)));
    await assertFails(getDocs(rosterQuery(database, otherEventId)));
    await assertSucceeds(getDocs(rosterQuery(db("unassigned"), otherEventId)));
    await assertFails(getDocs(query(collectionGroup(database, "participant_roster"), limit(500))));
  });

  it("uses stored assignment changes immediately and treats an explicit empty array as authoritative", async () => {
    const database = db("judge");
    await assertSucceeds(getDocs(rosterQuery(database)));
    await seed("users/judge", { ...users.judge, hackathon_id: eventId, hackathon_ids: [] });
    await assertFails(getDocs(rosterQuery(database)));
    await seed("users/judge", { ...users.judge, hackathon_ids: [otherEventId] });
    await assertFails(getDoc(rosterRef(database)));
    await assertSucceeds(getDocs(rosterQuery(database, otherEventId)));
  });

  it("bounds roster queries to 500 and rejects anonymous and forged admin identities", async () => {
    await assertFails(getDocs(rosterCollection(db("judge"))));
    await assertFails(getDocs(rosterQuery(db("judge"), eventId, 501)));
    const anonymousAdmin = db("admin", { firebase: { sign_in_provider: "anonymous" } });
    const forgedAdmin = db("participant", { email: "portal-admin.attacker@firebase.app", role: "admin", admin: true });
    for (const database of [anonymousAdmin, forgedAdmin]) {
      await assertFails(getDoc(privateRef(database)));
      await assertFails(setDoc(privateRef(database), registration()));
      await assertFails(getDoc(rosterRef(database)));
      await assertFails(setDoc(rosterRef(database), rosterEntry()));
      await assertFails(deleteDoc(rosterRef(database)));
    }
  });

  it("denies roster mutations by assigned staff, participants and hosts", async () => {
    for (const uid of ["judge", "mentor", "participant", "host", "pending", "unassigned"]) {
      await assertFails(setDoc(rosterRef(db(uid), eventId, "c".repeat(64)), rosterEntry()));
      await assertFails(updateDoc(rosterRef(db(uid)), { display_name: "Replaced" }));
      await assertFails(deleteDoc(rosterRef(db(uid))));
    }
  });

  it("rejects email-bearing names, extra fields and incomplete entries on creates and updates", async () => {
    for (const patch of [
      { email: "private@example.com" }, { contact: "private@example.com" }, { hackathon_id: eventId },
      { display_name: "Name <private@example.com>" }, { display_name: " \t\n " }, { display_name: "a".repeat(121) },
      { display_name: 10 }, { attendance_mode: "remote" }, { approval_status: "pending" }, { source: "csv" },
    ]) {
      await assertFails(setDoc(rosterRef(db("admin"), eventId, "c".repeat(64)), rosterEntry(patch)));
      await assertFails(updateDoc(rosterRef(db("admin")), patch));
    }
    for (const key of Object.keys(rosterEntry())) {
      const data = rosterEntry();
      delete data[key];
      await assertFails(setDoc(rosterRef(db("admin"), eventId, "c".repeat(64)), data));
      await assertFails(updateDoc(rosterRef(db("admin")), { [key]: deleteField() }));
    }
    for (const id of ["person@example.com", "x".repeat(64), "a".repeat(63), "a".repeat(65)]) {
      await assertFails(setDoc(rosterRef(db("admin"), eventId, id), rosterEntry()));
    }
  });

  it("accepts safe roster boundaries without granting access to private source data", async () => {
    await assertSucceeds(setDoc(rosterRef(db("admin")), rosterEntry({ display_name: "名".repeat(120), attendance_mode: "unspecified" })));
    const snapshot = await assertSucceeds(getDoc(rosterRef(db("judge"))));
    assert.equal(snapshot.data().display_name.length, 120);
    assert.doesNotMatch(JSON.stringify(snapshot.data()), /@|source_guest_id|matched_user_id|registered_at|imported_at/);
    await assertFails(getDoc(privateRef(db("judge"))));
  });
});
