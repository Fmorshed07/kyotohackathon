import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { doc, getDoc, getFirestore, increment, setDoc, writeBatch } from "firebase/firestore";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const email = "star-check-20260814@example.com";
const projectId = "14Sfv1cPjGdU2SAXREmE";
const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
const voterId = Array.from(new Uint8Array(digest))
  .map((byte) => byte.toString(16).padStart(2, "0"))
  .join("")
  .slice(0, 32);
const now = new Date().toISOString();
const results = [];

try {
  await setDoc(doc(db, "hackathon_subscribers", email), {
    email,
    created_at: now,
    source: "project-star",
  });
  results.push("subscriber_create: ok");
} catch (error) {
  results.push(`subscriber_create: FAIL ${error instanceof Error ? error.message : error}`);
}

try {
  const ratingRef = doc(db, "project_stars", `${projectId}_${voterId}`);
  const statsRef = doc(db, "project_star_stats", projectId);
  const existing = await getDoc(ratingRef);
  if (existing.exists()) {
    results.push("star_create: already exists (previous run)");
  } else {
    const batch = writeBatch(db);
    batch.set(ratingRef, {
      project_id: projectId,
      user_id: voterId,
      stars: 5,
      email,
      created_at: now,
      updated_at: now,
    });
    batch.set(
      statsRef,
      {
        star_sum: increment(5),
        star_count: increment(1),
        updated_at: now,
        last_voter_id: voterId,
      },
      { merge: true },
    );
    await batch.commit();
    results.push("star_create: ok");
  }
} catch (error) {
  results.push(`star_create: FAIL ${error instanceof Error ? error.message : error}`);
}

try {
  await getDoc(doc(db, "hackathon_subscribers", email));
  results.push("subscriber_public_read: unexpectedly allowed");
} catch (error) {
  results.push(
    `subscriber_public_read: denied as expected (${error instanceof Error ? error.message : error})`,
  );
}

console.log(results.join("\n"));
console.log(`voterId=${voterId}`);
