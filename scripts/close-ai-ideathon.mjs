import { deleteApp, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, getFirestore, runTransaction, terminate } from "firebase/firestore";

// Close only the verified August 13–15, 2026 AI Ideathon and its linked host
// record. Remove only the two exact obsolete registration paragraphs below;
// preserve publication, all other content, projects, people and external URLs.
const knownId = "ai-ideathon-2026-q9pxii";
const expectedName = "ai ideathon 2026";
const obsoleteRegistrationSentences = [
  "For international participants, register at https://www.cognisorai.com/events/hackathon",
  "Regular registration has officially closed. Limited slots are now available through late registration.",
];
const descriptionFields = ["summary", "description", "sourceDescription", "highlightNote"];
const closure = {
  status: "past",
  registrationStatus: "closed",
  submissionMode: "closed",
  registrationNote: "This event has ended. Registration is closed.",
};
const args = new Set(process.argv.slice(2));
let app;
let auth;
let db;
let selected;
let exitCode = 0;

class ClosureError extends Error {
  constructor(result) {
    super(result);
    this.result = result;
  }
}

const normalized = (value) => typeof value === "string"
  ? value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase() : "";

function report(result, data = selected?.data) {
  console.log(JSON.stringify({
    result,
    id: selected?.id ?? knownId,
    name: typeof data?.name === "string" ? data.name : "AI Ideathon 2026",
    ...(data ? {
      status: data.status ?? null,
      registrationStatus: data.registrationStatus ?? null,
      submissionMode: data.submissionMode ?? null,
    } : {}),
  }));
}

function withTimeout(promise, milliseconds) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new ClosureError("timed_out_verify_closure_before_retrying")), milliseconds);
    }),
  ]).finally(() => clearTimeout(timer));
}

function matchesIdentity(id, record) {
  const exactName = normalized(record.name) === expectedName;
  const knownIdentity = id === knownId && normalized(record.theme) === "ai for real world impact";
  return exactName || knownIdentity;
}

function registrationCopyMatches(record) {
  const matches = [];
  for (const field of descriptionFields) {
    const value = record?.[field];
    if (typeof value !== "string") continue;
    for (const sentence of obsoleteRegistrationSentences) {
      const index = value.indexOf(sentence);
      if (index >= 0) matches.push({ field, exactMatch: value.slice(Math.max(0, index - 2), index + sentence.length + 2) });
    }
  }
  return matches;
}

function cleanRegistrationCopy(record) {
  const patch = {};
  for (const field of descriptionFields) {
    const original = record?.[field];
    if (typeof original !== "string") continue;
    let cleaned = original;
    for (const sentence of obsoleteRegistrationSentences) {
      for (const variant of [`**${sentence}**`, sentence]) {
        // Remove the paragraph and its own separator without changing other
        // prose or formatting. Exact inline copies are removed as sentences.
        for (const separator of ["\r\n\r\n", "\n\n"]) {
          cleaned = cleaned.replaceAll(`${separator}${variant}${separator}`, separator);
          if (cleaned.startsWith(`${variant}${separator}`)) cleaned = cleaned.slice(variant.length + separator.length);
          if (cleaned.endsWith(`${separator}${variant}`)) cleaned = cleaned.slice(0, -variant.length - separator.length);
        }
        cleaned = cleaned.replaceAll(variant, "");
      }
    }
    if (cleaned !== original) patch[field] = cleaned.trim() ? cleaned : "";
  }
  return patch;
}

function matchesDates(record, hostRecord) {
  const label = normalized(record.eventDate);
  if (/\b2026\b/.test(label) && /\b(?:aug(?:ust)?|08)\b/.test(label) &&
      /\b13(?:th)?\b/.test(label) && /\b15(?:th)?\b/.test(label)) return true;
  const start = Date.parse(record.startAt ?? hostRecord?.start_at ?? "");
  const end = Date.parse(record.endAt ?? hostRecord?.end_at ?? "");
  // The source may store any local timezone as UTC. These bounds cover the
  // official Aug 13 start and Aug 15 finish, including UTC offset conversion.
  return start >= Date.parse("2026-08-12T10:00:00Z") && start <= Date.parse("2026-08-14T11:59:59Z") &&
    end >= Date.parse("2026-08-14T10:00:00Z") && end <= Date.parse("2026-08-17T11:59:59Z") &&
    end - start >= 36 * 60 * 60 * 1000 && end - start <= 96 * 60 * 60 * 1000;
}

function verifiedHostId(record) {
  if (record.hostEventId == null || record.hostEventId === "") return null;
  if (typeof record.hostEventId !== "string" || !record.hostEventId.trim() || record.hostEventId.includes("/")) {
    throw new ClosureError("invalid_linked_host_event_no_changes");
  }
  return record.hostEventId;
}

function verifyLinkedHost(id, record, hostRecord) {
  if (!hostRecord || hostRecord.public_hackathon_id !== id ||
      normalized(hostRecord.name) !== expectedName ||
      (typeof record.createdBy === "string" && typeof hostRecord.owner_id === "string" &&
        record.createdBy !== hostRecord.owner_id && record.createdBy !== auth.currentUser.uid)) {
    throw new ClosureError("linked_host_identity_conflict_no_changes");
  }
}

async function closeIdeathon() {
  if ([...args].some((arg) => arg !== "--dry-run" && arg !== "--inspect-registration-copy")) throw new ClosureError("unsupported_argument");
  const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };
  if (Object.values(config).some((value) => !value?.trim()) || !/^[a-zA-Z0-9-]+$/.test(config.projectId)) {
    throw new ClosureError("firebase_configuration_missing_or_invalid");
  }
  const password = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD;
  if (!password) throw new ClosureError("existing_admin_password_not_configured");
  const email = `portal-admin.${config.projectId}@firebase.app`;
  app = initializeApp(config, "close-ai-ideathon");
  auth = getAuth(app);
  await setPersistence(auth, inMemoryPersistence);
  await signInWithEmailAndPassword(auth, email, password);
  if (auth.currentUser?.email?.toLowerCase() !== email.toLowerCase()) throw new ClosureError("administrator_identity_mismatch");
  db = getFirestore(app);

  const catalog = await getDocs(collection(db, "hackathons"));
  const candidates = catalog.docs.map((item) => ({ id: item.id, data: item.data() }))
    .filter((item) => matchesIdentity(item.id, item.data));
  const verified = [];
  for (const candidate of candidates) {
    const hostId = verifiedHostId(candidate.data);
    const hostRecord = hostId ? (await getDoc(doc(db, "host_events", hostId))).data() : null;
    if (hostId) verifyLinkedHost(candidate.id, candidate.data, hostRecord);
    if (matchesDates(candidate.data, hostRecord)) verified.push({ ...candidate, hostId, hostRecord });
  }
  if (!verified.length) throw new ClosureError(candidates.length ? "event_dates_not_verified_no_changes" : "exact_event_not_found_no_changes");
  const current = verified.filter((item) => item.data.published === true || item.id === knownId);
  if (current.length !== 1) throw new ClosureError("event_identity_ambiguous_no_changes");
  selected = current[0];
  if (args.has("--inspect-registration-copy")) {
    report("registration_copy_inspected_no_changes");
    console.log(JSON.stringify({
      id: selected.id,
      publicListingMatches: registrationCopyMatches(selected.data),
      linkedHostMatches: registrationCopyMatches(selected.hostRecord),
    }));
    return;
  }
  if (args.has("--dry-run")) {
    report("verified_ready_to_close_no_changes");
    console.log(JSON.stringify({
      id: selected.id,
      obsoletePublicCopyFields: Object.keys(cleanRegistrationCopy(selected.data)),
      obsoleteLinkedHostCopyFields: Object.keys(cleanRegistrationCopy(selected.hostRecord)),
    }));
    return;
  }

  const eventRef = doc(db, "hackathons", selected.id);
  let originalPublished;
  let expectedPublicCopy;
  let expectedHostCopy;
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(eventRef);
    if (!snapshot.exists()) throw new ClosureError("event_changed_before_closure_no_changes");
    const record = snapshot.data();
    const hostId = verifiedHostId(record);
    if (hostId !== selected.hostId || !matchesIdentity(selected.id, record)) {
      throw new ClosureError("event_changed_before_closure_no_changes");
    }
    const hostRef = hostId ? doc(db, "host_events", hostId) : null;
    const hostRecord = hostRef ? (await transaction.get(hostRef)).data() : null;
    if (hostId) verifyLinkedHost(selected.id, record, hostRecord);
    if (!matchesDates(record, hostRecord)) throw new ClosureError("event_dates_changed_no_changes");
    originalPublished = record.published;
    expectedPublicCopy = cleanRegistrationCopy(record);
    expectedHostCopy = cleanRegistrationCopy(hostRecord);
    if (Object.entries(closure).some(([key, value]) => record[key] !== value) || Object.keys(expectedPublicCopy).length) {
      transaction.update(eventRef, { ...closure, ...expectedPublicCopy });
    }
    if (hostRef && (hostRecord.status !== "closed" || Object.keys(expectedHostCopy).length)) {
      transaction.update(hostRef, { status: "closed", ...expectedHostCopy });
    }
  });

  const persisted = (await getDoc(eventRef)).data();
  if (!persisted || Object.entries(closure).some(([key, value]) => persisted[key] !== value) ||
      persisted.published !== originalPublished || !matchesIdentity(selected.id, persisted)) {
    throw new ClosureError("closure_readback_failed_verify_before_retrying");
  }
  const persistedHost = selected.hostId ? (await getDoc(doc(db, "host_events", selected.hostId))).data() : null;
  if (selected.hostId && persistedHost?.status !== "closed") {
    throw new ClosureError("linked_host_readback_failed_verify_before_retrying");
  }
  if (registrationCopyMatches(persisted).length || registrationCopyMatches(persistedHost).length ||
      Object.entries(expectedPublicCopy).some(([field, value]) => persisted[field] !== value) ||
      Object.entries(expectedHostCopy).some(([field, value]) => persistedHost?.[field] !== value)) {
    throw new ClosureError("obsolete_registration_copy_readback_failed");
  }
  report("closed_and_verified", persisted);
  console.log(JSON.stringify({
    id: selected.id,
    result: "obsolete_registration_sentences_absent_verified",
    cleanedPublicCopyFields: Object.keys(expectedPublicCopy),
    cleanedLinkedHostCopyFields: Object.keys(expectedHostCopy),
  }));
}

try {
  await withTimeout(closeIdeathon(), 40_000);
} catch (error) {
  exitCode = 1;
  const code = typeof error?.code === "string" && /^[a-z/-]+$/.test(error.code) ? error.code : "unknown";
  report(error instanceof ClosureError ? error.result : `failed_${code}`);
} finally {
  await withTimeout(Promise.allSettled([
    auth ? signOut(auth) : Promise.resolve(),
    db ? terminate(db) : Promise.resolve(),
  ]).then(() => app ? deleteApp(app) : undefined), 5_000).catch(() => { exitCode = 1; });
}
process.exit(exitCode);
