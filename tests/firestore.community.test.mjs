import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { initializeTestEnvironment, assertFails as expectDenied, assertSucceeds } from "@firebase/rules-unit-testing";
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
async function assertFails(operation) {
  const error = await expectDenied(operation);
  assert.doesNotMatch(error.message, /maximum of 1000 expressions|maximum.*access calls/i);
  return error;
}
function prepare(uid, channel = "general", patch = {}, database = db(uid)) {
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
const channelData = (patch = {}, uid = "admin") => ({
  name: "builders", title: "Build something together", description: "Share ideas and questions.",
  placeholder: "What are you building?", section: "Community", type: "discussion", status: "open", order: 10,
  updated_by: uid, updated_at: serverTimestamp(), ...patch,
});
const channelReference = (uid = "admin", channel = "builders") => doc(db(uid), "community_channels", channel);
const channels = (database, count = 100) => query(collection(database, "community_channels"), limit(count));

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

  it("allows the author to delete while denying unrelated members and judges", async () => {
    const prepared = prepare("participant");
    await post(prepared);
    for (const uid of [null, "judge", "outsider"]) await assertFails(deleteDoc(doc(db(uid), prepared.reference.path)));
    await assertSucceeds(deleteDoc(prepared.reference));
  });
});

describe("admin-managed community channel metadata", () => {
  it("lets a database admin create and update a custom discussion that registered members can discover and use", async () => {
    await assertSucceeds(setDoc(channelReference(), channelData()));
    await assertSucceeds(updateDoc(channelReference(), {
      name: "builders-and-designers", section: "Networking", order: 20,
      updated_by: "admin", updated_at: serverTimestamp(),
    }));

    const listed = await assertSucceeds(getDocs(channels(db("participant"))));
    assert.equal(listed.size, 1);
    assert.equal(listed.docs[0].data().section, "Networking");
    await assertSucceeds(getDoc(channelReference("pending")));
    const prepared = prepare("participant", "builders");
    await assertSucceeds(post(prepared));
    assert.equal((await assertSucceeds(getDocs(messages(db("judge"), "builders")))).size, 1);
  });

  it("accepts the documented field and channel-ID boundaries", async () => {
    const id = `A${"b".repeat(63)}`;
    await assertSucceeds(setDoc(channelReference("admin", id), channelData({
      name: "n".repeat(48), title: "t".repeat(120), description: "d".repeat(300), placeholder: "p".repeat(200),
      section: "s".repeat(48), order: 999,
    })));
    await assertSucceeds(setDoc(channelReference("admin", "Room_1-test"), channelData({ description: "", placeholder: "", order: 0 })));
    assert.equal((await assertSucceeds(getDocs(channels(db("judge"))))).size, 2);
  });

  it("does not let non-admin members create, edit, or delete channel metadata", async () => {
    await seed("community_channels/builders", channelData());
    for (const uid of ["participant", "judge", "mentor", "host", "pending", "pendingHost", "outsider"]) {
      await assertFails(setDoc(channelReference(uid, "new-room"), channelData({}, uid)));
      await assertFails(updateDoc(channelReference(uid), { name: "Hijacked", updated_by: uid, updated_at: serverTimestamp() }));
      await assertFails(deleteDoc(channelReference(uid)));
    }
    await assertFails(setDoc(channelReference("participant", "forged-role"), channelData({ role: "admin" }, "participant")));
  });

  it("ignores request claims and the legacy portal-admin email shortcut when granting community administration", async () => {
    await seed("community_channels/builders", channelData({ type: "announcement" }));
    const attacker = env.authenticatedContext("participant", {
      email: "portal-admin.attacker@firebase.app", role: "admin", admin: true,
      firebase: { sign_in_provider: "password" },
    }).firestore();
    await assertFails(setDoc(doc(attacker, "community_channels/new-room"), channelData({}, "participant")));
    await assertFails(updateDoc(doc(attacker, "community_channels/builders"), { status: "open", updated_by: "participant", updated_at: serverTimestamp() }));
    await assertFails(post(prepare("participant", "builders", {}, attacker)));
    const prepared = prepare("judge");
    await post(prepared);
    await assertFails(deleteDoc(doc(attacker, prepared.reference.path)));
  });

  it("allows plural database admins but does not treat an anonymous admin profile as a registered administrator", async () => {
    await seed("users/plural-admin", { role: "admins" });
    await assertSucceeds(setDoc(channelReference("plural-admin"), channelData({}, "plural-admin")));
    await assertSucceeds(post(prepare("plural-admin", "announcements", { author_role: "admin" })));

    const anonymousAdmin = env.authenticatedContext("admin", { firebase: { sign_in_provider: "anonymous" } }).firestore();
    await assertFails(getDocs(channels(anonymousAdmin)));
    await assertFails(setDoc(doc(anonymousAdmin, "community_channels/new-room"), channelData()));
    await assertFails(post(prepare("admin", "announcements", {}, anonymousAdmin)));
  });

  it("limits channel discovery to registered accounts and bounded queries", async () => {
    await seed("community_channels/builders", channelData());
    await seed("users/unknown", { role: "visitor" });
    for (const database of [db(null), db("missing"), db("unknown")]) {
      await assertFails(getDocs(channels(database)));
      await assertFails(getDoc(doc(database, "community_channels/builders")));
    }
    await assertFails(getDocs(collection(db("participant"), "community_channels")));
    await assertFails(getDocs(channels(db("admin"), 101)));
    await assertSucceeds(getDocs(channels(db("participant"), 100)));
  });

  it("requires admins to archive metadata instead of deleting it", async () => {
    await seed("community_channels/builders", channelData());
    await assertFails(deleteDoc(channelReference()));
    await assertSucceeds(updateDoc(channelReference(), { status: "archived", updated_by: "admin", updated_at: serverTimestamp() }));
    assert.equal((await assertSucceeds(getDoc(channelReference("participant")))).data().status, "archived");
  });

  it("rejects unsafe or oversized channel identifiers even for an admin", async () => {
    for (const id of ["-prefix", "_prefix", "bad space", "bad.dot", "a".repeat(65), "bad@room"]) {
      await assertFails(setDoc(channelReference("admin", id), channelData()));
      await assertFails(post(prepare("admin", id)));
    }
  });

  const invalidChannelFields = {
    "blank name": { name: " \n\t " },
    "empty name": { name: "" },
    "oversized name": { name: "n".repeat(49) },
    "non-string name": { name: ["builders"] },
    "empty title": { title: "" },
    "oversized title": { title: "t".repeat(121) },
    "non-string title": { title: true },
    "oversized description": { description: "d".repeat(301) },
    "non-string description": { description: [] },
    "oversized placeholder": { placeholder: "p".repeat(201) },
    "non-string placeholder": { placeholder: 5 },
    "empty section": { section: "" },
    "blank section": { section: " \n " },
    "oversized section": { section: "s".repeat(49) },
    "non-string section": { section: false },
    "unknown type": { type: "private" },
    "non-string type": { type: ["discussion"] },
    "unknown status": { status: "deleted" },
    "non-string status": { status: ["open"] },
    "negative order": { order: -1 },
    "oversized order": { order: 1000 },
    "fractional order": { order: 0.5 },
    "non-number order": { order: "1" },
    "forged updater": { updated_by: "participant" },
    "empty updater": { updated_by: "" },
    "non-string updater": { updated_by: ["admin"] },
    "backdated timestamp": { updated_at: Timestamp.fromMillis(1) },
    "future timestamp": { updated_at: Timestamp.fromMillis(Date.now() + 86400000) },
    "non-timestamp update time": { updated_at: "2026-10-18" },
    "extra privilege field": { isAdmin: true },
  };
  for (const [label, patch] of Object.entries(invalidChannelFields)) {
    it(`rejects ${label} on both metadata create and update`, async () => {
      await seed("community_channels/builders", channelData());
      await assertFails(setDoc(channelReference("admin", "new-room"), channelData(patch)));
      await assertFails(updateDoc(channelReference(), { updated_by: "admin", updated_at: serverTimestamp(), ...patch }));
    });
  }

  it("requires every metadata field on create and prevents removing fields during update", async () => {
    await seed("community_channels/builders", channelData());
    for (const key of Object.keys(channelData())) {
      const incomplete = channelData();
      delete incomplete[key];
      await assertFails(setDoc(channelReference("admin", "new-room"), incomplete));
      await assertFails(updateDoc(channelReference(), { updated_by: "admin", updated_at: serverTimestamp(), [key]: deleteField() }));
    }
  });
});

describe("community channel lifecycle, announcements, and moderation", () => {
  it("keeps default announcements readable while allowing only database admins to post", async () => {
    for (const uid of ["participant", "judge", "mentor", "host", "pending"]) {
      await assertFails(post(prepare(uid, "announcements")));
    }
    const announcement = prepare("admin", "announcements");
    await assertSucceeds(post(announcement));
    await assertSucceeds(getDoc(doc(db("participant"), announcement.reference.path)));
    assert.equal((await assertSucceeds(getDocs(messages(db("pending"), "announcements")))).size, 1);
  });

  it("uses a custom announcement's stored type instead of allowing members to post as a discussion", async () => {
    await assertSucceeds(setDoc(channelReference("admin", "event-news"), channelData({ type: "announcement" })));
    await assertFails(post(prepare("participant", "event-news")));
    await assertFails(post(prepare("judge", "event-news")));
    await assertSucceeds(post(prepare("admin", "event-news")));
    await assertSucceeds(getDocs(messages(db("participant"), "event-news")));
  });

  for (const status of ["closed", "archived"]) {
    it(`keeps ${status} history readable but rejects posting by members and admins until reopened`, async () => {
      await setDoc(channelReference(), channelData());
      const prepared = prepare("participant", "builders");
      await post(prepared);
      await assertSucceeds(updateDoc(channelReference(), { status, updated_by: "admin", updated_at: serverTimestamp() }));

      await assertSucceeds(getDoc(doc(db("judge"), prepared.reference.path)));
      assert.equal((await assertSucceeds(getDocs(messages(db("judge"), "builders")))).size, 1);
      await assertFails(post(prepare("judge", "builders")));
      await assertFails(post(prepare("admin", "builders")));
      assert.equal((await getDoc(doc(db("judge"), "community_chat_limits/judge"))).exists(), false);

      await assertSucceeds(updateDoc(channelReference(), { status: "open", updated_by: "admin", updated_at: serverTimestamp() }));
      await assertSucceeds(post(prepare("judge", "builders")));
    });
  }

  it("applies lifecycle settings to a default virtual channel once metadata is added", async () => {
    await assertSucceeds(setDoc(channelReference("admin", "general"), channelData({ status: "closed" })));
    await assertFails(post(prepare("participant", "general")));
    await assertFails(post(prepare("admin", "general")));
    await assertSucceeds(getDocs(messages(db("participant"), "general")));
    await assertSucceeds(updateDoc(channelReference("admin", "general"), { status: "open", updated_by: "admin", updated_at: serverTimestamp() }));
    await assertSucceeds(post(prepare("participant", "general")));
  });

  for (const channel of ["general", "builders"]) {
    it(`cannot pair a ${channel} metadata close with a new message in the same atomic batch`, async () => {
      if (channel === "builders") await setDoc(channelReference(), channelData());
      const prepared = prepare("admin", channel);
      const batch = writeBatch(prepared.database);
      batch.set(doc(prepared.database, "community_channels", channel), channelData({ status: "closed" }));
      batch.set(prepared.reference, prepared.data);
      batch.set(prepared.limiter, prepared.limitData);

      await assertFails(batch.commit());
      assert.equal((await getDocs(messages(db("participant"), channel))).size, 0);
    });
  }

  it("can create a valid announcement channel and its first admin message atomically", async () => {
    const prepared = prepare("admin", "new-announcements");
    const batch = writeBatch(prepared.database);
    batch.set(doc(prepared.database, "community_channels/new-announcements"), channelData({ type: "announcement" }));
    batch.set(prepared.reference, prepared.data);
    batch.set(prepared.limiter, prepared.limitData);
    await assertSucceeds(batch.commit());
    assert.equal((await assertSucceeds(getDocs(messages(db("participant"), "new-announcements")))).size, 1);
  });

  it("fails closed for malformed stored metadata, including overrides of a virtual default", async () => {
    for (const channel of ["general", "malformed-room"]) {
      await seed(`community_channels/${channel}`, { name: "Invalid", type: "discussion", status: "open" });
      await seed(`community_channels/${channel}/messages/${"m".repeat(20)}`, {
        user_id: "participant", author_name: "Aki", author_role: "participant", body: "History", created_at: Timestamp.fromMillis(1),
      });
      await assertFails(getDocs(messages(db("participant"), channel)));
      await assertFails(getDoc(doc(db("participant"), `community_channels/${channel}/messages/${"m".repeat(20)}`)));
      await assertFails(post(prepare("participant", channel)));
      await assertFails(post(prepare("admin", channel)));
    }
  });

  it("allows registered database admins to moderate another author's message in archived history", async () => {
    await setDoc(channelReference(), channelData());
    const prepared = prepare("participant", "builders");
    await post(prepared);
    await updateDoc(channelReference(), { status: "archived", updated_by: "admin", updated_at: serverTimestamp() });
    await assertFails(deleteDoc(doc(db("judge"), prepared.reference.path)));
    await assertFails(deleteDoc(doc(db("outsider"), prepared.reference.path)));
    await assertSucceeds(deleteDoc(doc(db("admin"), prepared.reference.path)));
    assert.equal((await getDoc(doc(db("judge"), prepared.reference.path))).exists(), false);
  });

  it("does not allow admin moderation to edit messages or reset another member's cooldown", async () => {
    const prepared = prepare("participant");
    await post(prepared);
    await assertFails(updateDoc(doc(db("admin"), prepared.reference.path), { body: "Rewritten by admin" }));
    await assertFails(deleteDoc(doc(db("admin"), prepared.limiter.path)));
    await assertFails(setDoc(doc(db("admin"), prepared.limiter.path), { ...prepared.limitData, last_sent_at: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(db("admin"), prepared.reference.path)));
    await assertFails(post(prepare("participant", "teams")));
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
