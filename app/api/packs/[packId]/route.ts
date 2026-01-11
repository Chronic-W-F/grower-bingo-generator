// app/api/packs/[packId]/route.ts
import { NextResponse } from "next/server";
import admin from "firebase-admin";

// Force Node runtime (firebase-admin)
export const runtime = "nodejs";

function safeJsonParse(raw: string | undefined) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const credsRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credsJson = safeJsonParse(credsRaw);

  if (!credsJson) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var.");
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    credsJson.projectId ||
    credsJson.project_id ||
    undefined;

  admin.initializeApp({
    credential: admin.credential.cert(credsJson),
    ...(projectId ? { projectId } : {}),
  });

  return admin.app();
}

type FirestoreCard = {
  id: string;
  size: number;
  gridFlat: string[];
};

function unflattenGrid(size: number, flat: string[]) {
  const out: string[][] = [];
  for (let r = 0; r < size; r++) {
    out.push(flat.slice(r * size, (r + 1) * size));
  }
  return out;
}

export async function GET(
  _req: Request,
  { params }: { params: { packId: string } }
) {
  try {
    const packId = String(params.packId || "").trim();
    if (!packId) {
      return NextResponse.json({ ok: false, error: "Missing packId." }, { status: 400 });
    }

    const app = getAdminApp();
    const db = admin.firestore(app);

    const snap = await db.collection("bingoPacks").doc(packId).get();
    if (!snap.exists) {
      return NextResponse.json({ ok: false, error: "Pack not found." }, { status: 404 });
    }

    const data = snap.data() as any;

    const cards: FirestoreCard[] = Array.isArray(data.cards) ? data.cards : [];
    const cardsExpanded = cards.map((c) => ({
      id: c.id,
      grid: unflattenGrid(Number(c.size || 5), Array.isArray(c.gridFlat) ? c.gridFlat : []),
    }));

    // Return in the same shape your client expects
    return NextResponse.json({
      ok: true,
      pack: {
        packId: data.packId || packId,
        createdAt: data.createdAt || Date.now(),
        title: data.title || "Harvest Heroes Bingo",
        sponsorName: data.sponsorName || "",
        cards: cardsExpanded,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed." }, { status: 500 });
  }
}
