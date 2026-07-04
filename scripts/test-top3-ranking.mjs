import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "hackathon-tokyo";
const hackathonId = "impact-kyoto";
const adminEmail = `portal-admin.${projectId}@firebase.app`;
const adminPassword = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD;

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);

function report(label, ok, detail = "") {
  const status = ok ? "PASS" : "FAIL";
  console.log(`${status} ${label}${detail ? `: ${detail}` : ""}`);
}

try {
  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD is not set in .env.local");
  }

  await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  report("Admin sign-in", true, adminEmail);

  const rankingsQuery = query(
    collection(db, "judge_rankings"),
    where("hackathon_id", "==", hackathonId)
  );
  const rankingsSnap = await getDocs(rankingsQuery);
  report("Admin can list judge_rankings", true, `${rankingsSnap.size} document(s)`);

  const submissionsQuery = query(
    collection(db, "submissions"),
    where("hackathon_id", "==", hackathonId)
  );
  const submissionsSnap = await getDocs(submissionsQuery);
  report("Admin can read submissions", true, `${submissionsSnap.size} submission(s)`);

  if (rankingsSnap.size > 0) {
    const first = rankingsSnap.docs[0].data();
    report(
      "Ranking document shape",
      Boolean(first.ranks?.first && first.judge_id),
      `judge=${first.judge_id}`
    );
  } else {
    report("Ranking documents present", false, "No judge ballots saved yet");
  }

  const probeDocId = `smoke-test-judge_${hackathonId}`;
  try {
    await setDoc(doc(db, "judge_rankings", probeDocId), {
      judge_id: "smoke-test-judge",
      hackathon_id: hackathonId,
      ranks: { first: null, second: null, third: null },
      updated_at: new Date().toISOString(),
    });
    report("Admin write blocked on judge_rankings", false, "Admin was able to write");
  } catch (error) {
    report(
      "Admin write blocked on judge_rankings",
      true,
      error instanceof Error ? error.message : String(error)
    );
  }

  console.log("\nSmoke test finished.");
} catch (error) {
  report("Smoke test", false, error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
