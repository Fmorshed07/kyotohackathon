import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export type AuthUser = {
  uid: string;
  email: string | null;
};

function getProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    "hackathon-tokyo"
  );
}

export async function verifyFirebaseIdToken(authorizationHeader: string | undefined): Promise<AuthUser> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw Object.assign(new Error("Missing Authorization bearer token."), { status: 401 });
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw Object.assign(new Error("Missing Authorization bearer token."), { status: 401 });
  }

  const projectId = getProjectId();
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  const uid = typeof payload.user_id === "string" ? payload.user_id : typeof payload.sub === "string" ? payload.sub : null;
  if (!uid) {
    throw Object.assign(new Error("Invalid Firebase token."), { status: 401 });
  }

  return {
    uid,
    email: typeof payload.email === "string" ? payload.email : null,
  };
}

type FirestoreFields = Record<string, { stringValue?: string }>;

export async function getUserRoleFromFirestore(uid: string, idToken: string): Promise<string | null> {
  const projectId = getProjectId();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw Object.assign(new Error("Unable to verify account role."), { status: 403 });
  }

  const data = (await response.json()) as { fields?: FirestoreFields };
  const role = data.fields?.role?.stringValue;
  return role ? role.trim().toLowerCase() : null;
}

export function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "admins";
}

export function isPortalAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return /^portal-admin\..+@firebase\.app$/i.test(email.trim());
}
