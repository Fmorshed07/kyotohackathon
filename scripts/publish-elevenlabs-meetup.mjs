import { deleteApp, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { deleteField, doc, getDoc, getFirestore, runTransaction, terminate } from "firebase/firestore";
import {
  ELEVENLABS_MEETUP_ID,
  ELEVENLABS_MEETUP_SOURCE_URL,
  getBundledHackathon,
} from "../src/lib/elevenLabsMeetup.ts";

// Uses only the existing internal administrator. Never creates accounts, host
// operations records, judging weights, tickets or emails. Re-running preserves
// any organiser changes to an existing listing from the same official source.
const args = new Set(process.argv.slice(2));
const allowedArgs = new Set(["--validate", "--dry-run", "--sync-auto-lifecycle"]);
const publicPath = `/events/${ELEVENLABS_MEETUP_ID}`;
const bundled = getBundledHackathon(ELEVENLABS_MEETUP_ID);
let app;
let auth;
let db;
let exitCode = 0;

class PublishError extends Error {
  constructor(result) {
    super(result);
    this.result = result;
  }
}

function report(result, name = bundled?.name ?? "ElevenLabs Meetup Tokyo") {
  console.log(JSON.stringify({ result, id: ELEVENLABS_MEETUP_ID, name, publicPath }));
}

function withTimeout(promise, milliseconds) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new PublishError("timed_out_verify_existing_listing_before_retrying")), milliseconds);
    }),
  ]).finally(() => clearTimeout(timer));
}

function canonicalSource(value) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return "";
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "luma.com" && host !== "lu.ma") return "";
    return `https://luma.com${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return "";
  }
}

function verifySource(record) {
  const sources = [record.sourceUrl, record.lumaUrl].filter((value) => value != null && value !== "");
  if (!sources.length || sources.some((value) => canonicalSource(value) !== ELEVENLABS_MEETUP_SOURCE_URL)) {
    throw new PublishError("source_conflict_existing_listing_preserved");
  }
}

function validateBundledEvent() {
  if (!bundled || bundled.id !== ELEVENLABS_MEETUP_ID || bundled.published !== true) {
    throw new PublishError("invalid_bundled_event");
  }
  verifySource(bundled);
  if (!bundled.name?.trim() || !bundled.eventDate?.trim() ||
      !Number.isFinite(Date.parse(bundled.startAt ?? "")) ||
      !Number.isFinite(Date.parse(bundled.endAt ?? "")) ||
      Date.parse(bundled.endAt) <= Date.parse(bundled.startAt) || bundled.timezone !== "Asia/Tokyo" ||
      !Array.isArray(bundled.schedule) || !Array.isArray(bundled.judgingCriteriaNames)) {
    throw new PublishError("invalid_bundled_event_details");
  }
}

function verifyPersistedEvent(record, created) {
  verifySource(record);
  if (typeof record.published !== "boolean" || !record.name?.trim() || !record.eventDate?.trim() ||
      !canonicalSource(record.lumaUrl)) {
    throw new PublishError("verification_failed_listing_preserved");
  }
  if (created && (record.published !== true || record.name !== bundled.name ||
      record.sourceUrl !== bundled.sourceUrl || record.lumaUrl !== bundled.lumaUrl ||
      record.eventDate !== bundled.eventDate || record.startAt !== bundled.startAt ||
      record.endAt !== bundled.endAt || record.timezone !== bundled.timezone ||
      record.createdBy !== auth.currentUser?.uid)) {
    throw new PublishError("verification_failed_read_listing_before_retrying");
  }
}

async function publish() {
  if ([...args].some((arg) => !allowedArgs.has(arg))) throw new PublishError("unsupported_argument");
  validateBundledEvent();
  if (args.has("--validate")) {
    report("bundled_event_validated_no_cloud_changes");
    return;
  }

  const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };
  if (Object.values(config).some((value) => !value?.trim()) || !/^[a-zA-Z0-9-]+$/.test(config.projectId)) {
    throw new PublishError("firebase_configuration_missing_or_invalid");
  }
  const password = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD;
  if (!password) throw new PublishError("existing_admin_password_not_configured");
  const email = `portal-admin.${config.projectId}@firebase.app`;
  app = initializeApp(config, "publish-elevenlabs-meetup");
  auth = getAuth(app);
  await setPersistence(auth, inMemoryPersistence);
  await signInWithEmailAndPassword(auth, email, password);
  if (auth.currentUser?.email?.toLowerCase() !== email.toLowerCase()) throw new PublishError("administrator_identity_mismatch");

  db = getFirestore(app);
  const ref = doc(db, "hackathons", ELEVENLABS_MEETUP_ID);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const record = existing.data();
    verifyPersistedEvent(record, false);
    if (args.has("--sync-auto-lifecycle")) {
      await runTransaction(db, async (transaction) => {
        const current = (await transaction.get(ref)).data();
        if (!current || current.createdBy !== auth.currentUser.uid || current.name !== bundled.name ||
            current.startAt !== bundled.startAt || current.endAt !== bundled.endAt ||
            current.status !== "upcoming" || current.submissionMode !== "open" ||
            current.sourceImportedAt !== bundled.sourceImportedAt || current.sourceLifecycleAutomatic === false) {
          throw new PublishError("lifecycle_sync_skipped_admin_edits_preserved");
        }
        // Older imported records included the derived open gate. Remove only
        // that initial gate so the event closes naturally after its end time.
        transaction.update(ref, { submissionMode: deleteField(), sourceLifecycleAutomatic: true });
      });
      const synced = (await getDoc(ref)).data();
      if (!synced || synced.submissionMode !== undefined || synced.sourceLifecycleAutomatic !== true) throw new PublishError("lifecycle_sync_verification_failed");
      report("automatic_lifecycle_synced_and_verified");
      return;
    }
    report(record.published ? "already_present_admin_edits_preserved" : "already_present_unpublished_admin_edits_preserved", record.name);
    return;
  }
  report(args.has("--dry-run") ? "ready_to_create_no_cloud_changes" : "ready_to_create");
  if (args.has("--dry-run")) return;

  // The second read and create are atomic, so another administrator publishing
  // between the preview and write cannot have their listing overwritten.
  const created = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      verifySource(snapshot.data());
      return false;
    }
    const { submissionMode: _derivedGate, ...eventFields } = bundled;
    const record = JSON.parse(JSON.stringify({ ...eventFields, createdBy: auth.currentUser.uid }));
    transaction.set(ref, record);
    return true;
  });
  const persisted = await getDoc(ref);
  if (!persisted.exists()) throw new PublishError("verification_failed_listing_missing");
  const record = persisted.data();
  verifyPersistedEvent(record, created);
  report(created ? "published_and_verified" : record.published
    ? "already_present_admin_edits_preserved"
    : "already_present_unpublished_admin_edits_preserved", record.name);
}

try {
  await withTimeout(publish(), 40_000);
} catch (error) {
  exitCode = 1;
  // Error messages can contain request details. Emit only our fixed outcomes or
  // Firebase's non-sensitive error code, never messages, config or tokens.
  const code = typeof error?.code === "string" && /^[a-z/-]+$/.test(error.code) ? error.code : "unknown";
  report(error instanceof PublishError ? error.result : `failed_${code}`);
} finally {
  await withTimeout(Promise.allSettled([
    auth ? signOut(auth) : Promise.resolve(),
    db ? terminate(db) : Promise.resolve(),
  ]).then(() => app ? deleteApp(app) : undefined), 5_000).catch(() => { exitCode = 1; });
}
// Firebase may retain network timers after a failed connection. Cleanup has
// completed (or timed out); guarantee the command returns within 45 seconds.
process.exit(exitCode);
