import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  "hackathon-tokyo";
const email =
  process.env.ADMIN_EMAIL ||
  `portal-admin.${projectId}@firebase.app`;
const password = process.env.ADMIN_PASSWORD || "Impact@26";

function getCredential() {
  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (serviceAccountPath && existsSync(resolve(serviceAccountPath))) {
    const serviceAccount = JSON.parse(readFileSync(resolve(serviceAccountPath), "utf8"));
    return cert(serviceAccount);
  }

  return applicationDefault();
}

if (!getApps().length) {
  initializeApp({
    credential: getCredential(),
    projectId,
  });
}

const auth = getAuth();

try {
  const user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, { password });
  console.log(`Updated password for ${email} (uid: ${user.uid})`);
} catch (error) {
  if (error?.code === "auth/user-not-found") {
    const created = await auth.createUser({ email, password, emailVerified: true });
    console.log(`Created admin user ${email} (uid: ${created.uid})`);
  } else {
    console.error("Failed to reset admin password:", error?.message || error);
    process.exit(1);
  }
}
