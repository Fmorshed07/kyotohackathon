import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from "firebase/firestore";

const address = process.env.FIRESTORE_EMULATOR_HOST;
if (!address || !/^(127\.0\.0\.1|localhost):\d+$/.test(address)) throw new Error("Use a local Firestore emulator, never production.");
const [host, port] = address.split(":");
let env;
const users = {
  participant: { role: "participant", fullName: "Aki" },
  judge: { role: "judge", judgeApprovalStatus: "approved" },
  mentor: { role: "mentor", judgeApprovalStatus: "approved" },
  host: { role: "host", hostApprovalStatus: "approved" },
  admin: { role: "admin" },
  pending: { role: "judge", judgeApprovalStatus: "pending" },
  pendingHost: { role: "host", hostApprovalStatus: "pending" },
  outsider: { role: "participant" },
  pluralJudge: { role: "judges", judgeApprovalStatus: "approved" },
};
const displayRoles = { pending: "member", pendingHost: "member", pluralJudge: "judge", outsider: "participant" };
const db = uid => uid ? env.authenticatedContext(uid, { email: `${uid}@example.com`, firebase: { sign_in_provider: "password" } }).firestore() : env.unauthenticatedContext().firestore();
const seed = (path, data) => env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), path), data));
function prepare(uid, channel = "general", patch = {}) {
  const database = db(uid);
  const reference = doc(collection(database, "community_channels", channel, "messages"));
  const data = { user_id: uid, author_name: "Community member", author_role: displayRoles[uid] ?? uid, body: "Hello, looking for a designer.\nLet's build together.", created_at: serverTimestamp(), ...patch };
  return { database, reference, data, limiter: doc(database, "community_chat_limits", uid || "guest"), limitData: { channel_id: channel, message_id: reference.id, last_sent_at: serverTimestamp() } };
}
function post(prepared, { limiter = true, limitPatch = {} } = {}) {
  const batch = writeBatch(prepared.database);
  batch.set(prepared.reference, prepared.data);
  if (limiter) batch.set(prepared.limiter, { ...prepared.limitData, ...limitPatch });
  return batch.commit();
}
const messages = (database, channel = "general", count = 100) => query(collection(database, "community_channels", channel, "messages"), orderBy("created_at", "desc"), limit(count));

before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-cognisor-permissions", firestore: { host, port: Number(port), rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8") } });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await Promise.all(Object.entries(users).map(([id, data]) => seed(`users/${id}`, data)));
});

describe("community channels: isolated authentication and immutable messages", () => {
  for (const uid of Object.keys(users)) {
    it(`allows ${uid} to network without event membership`, async () => {
      const prepared = prepare(uid);
      await assertSucceeds(post(prepared));
      await assertSucceeds(getDoc(prepared.reference));
      await assertSucceeds(getDocs(messages(db("participant"))));
      await assertSucceeds(getDocs(messages(db("judge"))));
      assert.equal((await getDoc(prepared.reference)).data().body, prepared.data.body);
    });
  }

  for (const channel of ["general", "teams", "judges"]) {
    it(`allows the exact live query and paired write in ${channel}`, async () => {
      await assertSucceeds(post(prepare("participant", channel)));
      assert.equal((await assertSucceeds(getDocs(messages(db("judge"), channel)))).size, 1);
    });
  }

  it("blocks signed-out, anonymous, missing-profile and unknown-role users", async () => {
    const prepared = prepare("participant");
    await post(prepared);
    await seed("users/unknown", { role: "visitor" });
    const anonymous = env.authenticatedContext("participant", { firebase: { sign_in_provider: "anonymous" } }).firestore();
    for (const database of [db(null), db("missing"), db("unknown"), anonymous]) {
      await assertFails(getDocs(messages(database)));
      await assertFails(getDoc(doc(database, prepared.reference.path)));
      await assertFails(setDoc(doc(collection(database, "community_channels/general/messages")), prepared.data));
    }
  });

  it("blocks unlimited queries, oversized queries and undeclared rooms", async () => {
    await assertFails(getDocs(collection(db("participant"), "community_channels/general/messages")));
    await assertFails(getDocs(messages(db("participant"), "general", 101)));
    await assertFails(getDocs(messages(db("participant"), "staff-private")));
    await assertFails(post(prepare("participant", "staff-private")));
    await assertFails(setDoc(doc(db("participant"), "community_channels", "general"), { name: "Renamed" }));
  });

  for (const [label, patch] of Object.entries({
    "different owner": { user_id: "judge" },
    "forged role": { author_role: "admin" },
    "empty body": { body: "" },
    "whitespace body": { body: " \n\t " },
    "long body": { body: "a".repeat(2001) },
    "wrong body type": { body: 123 },
    "long name": { author_name: "a".repeat(81) },
    "empty name": { author_name: "" },
    "wrong name type": { author_name: ["Aki"] },
    "extra email": { author_email: "private@example.com" },
    "backdated timestamp": { created_at: Timestamp.fromMillis(1) },
    "future timestamp": { created_at: Timestamp.fromMillis(Date.now() + 86400000) },
    "string timestamp": { created_at: new Date().toISOString() },
  })) {
    it(`rejects ${label}`, async () => { await assertFails(post(prepare("participant", "general", patch))); });
  }

  it("requires every declared message field", async () => {
    for (const key of ["user_id", "author_name", "author_role", "body", "created_at"]) {
      const prepared = prepare("participant");
      delete prepared.data[key];
      await assertFails(post(prepared));
    }
  });

  it("prevents self-promoted badges while allowing pending members to chat", async () => {
    await assertFails(post(prepare("pending", "general", { author_role: "judge" })));
    await assertFails(post(prepare("pendingHost", "general", { author_role: "host" })));
    await assertSucceeds(post(prepare("pending")));
  });

  it("denies all updates, including owner, admin, huge body, owner changes and field removal", async () => {
    const prepared = prepare("participant");
    await post(prepared);
    for (const uid of ["participant", "judge", "admin"]) {
      for (const patch of [{ body: "Rewrite" }, { body: "x".repeat(10000) }, { user_id: uid }, { created_at: serverTimestamp() }, { body: deleteField() }, { extra: true }]) {
        await assertFails(updateDoc(doc(db(uid), prepared.reference.path), patch));
      }
    }
  });

  it("allows only the author to delete, even for judges and admins", async () => {
    const prepared = prepare("participant");
    await post(prepared);
    for (const uid of [null, "judge", "outsider", "admin"]) await assertFails(deleteDoc(doc(db(uid), prepared.reference.path)));
    await assertSucceeds(deleteDoc(prepared.reference));
  });
});

describe("community posting limits", () => {
  it("requires the matching rate-limit document in the same batch", async () => {
    await assertFails(post(prepare("participant"), { limiter: false }));
    for (const limitPatch of [{ channel_id: "teams" }, { message_id: "x".repeat(20) }, { last_sent_at: Timestamp.fromMillis(1) }, { extra: true }]) {
      await assertFails(post(prepare("participant"), { limitPatch }));
    }
  });

  it("prevents independent limiter creation, replacement, reset and cross-user access", async () => {
    const prepared = prepare("participant");
    await assertFails(setDoc(prepared.limiter, prepared.limitData));
    await post(prepared);
    await assertSucceeds(getDoc(prepared.limiter));
    await assertFails(setDoc(prepared.limiter, prepared.limitData));
    await assertFails(deleteDoc(prepared.limiter));
    await assertFails(getDoc(doc(db("outsider"), prepared.limiter.path)));
    await assertFails(setDoc(doc(db("outsider"), prepared.limiter.path), prepared.limitData));
    await assertFails(getDocs(collection(db("admin"), "community_chat_limits")));
  });

  it("enforces the cooldown across rooms, even after deleting the last message", async () => {
    const prepared = prepare("participant");
    await post(prepared);
    await assertFails(post(prepare("participant", "teams")));
    await deleteDoc(prepared.reference);
    await assertFails(post(prepare("participant", "judges")));
    await seed("community_chat_limits/participant", { channel_id: "general", message_id: prepared.reference.id, last_sent_at: Timestamp.fromMillis(Date.now() - 60000) });
    await assertSucceeds(post(prepare("participant", "teams")));
  });

  it("cannot pair several messages with one limiter update", async () => {
    const first = prepare("participant");
    const second = doc(collection(first.database, "community_channels/general/messages"));
    const batch = writeBatch(first.database);
    batch.set(first.reference, first.data);
    batch.set(second, first.data);
    batch.set(first.limiter, first.limitData);
    await assertFails(batch.commit());
    assert.equal((await getDocs(messages(db("participant")))).size, 0);
  });
});
