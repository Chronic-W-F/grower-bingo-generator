// lib/firebaseAdmin.ts
import admin from "firebase-admin";

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var.");

  // Vercel env var is usually pasted as a JSON string; parse it.
  // Handle accidental escaping/newlines safely.
  const parsed = JSON.parse(raw);

  // Firebase private keys sometimes contain literal \n in env vars.
  if (parsed?.private_key && typeof parsed.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }
  return parsed;
}

export function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const serviceAccount = getServiceAccount();

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export function getDb() {
  const app = getAdminApp();
  return admin.firestore(app);
}
