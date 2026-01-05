// app/api/generate/route.ts
import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { renderToBuffer } from "@react-pdf/renderer";

import { createBingoPack } from "@/lib/bingo";
import BingoPackPdf from "@/pdf/BingoPackPdf";

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function getFirebaseCreds(): admin.ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var.");

  // Vercel env var is a single string. It might include literal \n in private_key.
  const parsed = JSON.parse(raw) as ServiceAccountJson;

  // Normalize private_key newlines if needed
  if (parsed.private_key && parsed.private_key.includes("\\n")) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Service account JSON missing client_email or private_key.");
  }

  // Admin SDK expects { projectId, clientEmail, privateKey } keys (camelCase)
  // We map from the downloaded JSON shape.
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
  } as admin.ServiceAccount;
}

function getAdminApp(): admin.app.App {
  if (admin.apps.length) return admin.app();

  const creds = getFirebaseCreds();
  return admin.initializeApp({
    credential: admin.credential.cert(creds),
  });
}

function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toInt(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const title = typeof body.title === "string" ? body.title.trim() : "Harvest Heroes Bingo";
    const sponsorName = typeof body.sponsorName === "string" ? body.sponsorName.trim() : "";
    const bannerImageUrl =
      typeof body.bannerImageUrl === "string" ? body.bannerImageUrl.trim() : "";
    const sponsorLogoUrl =
      typeof body.sponsorLogoUrl === "string" ? body.sponsorLogoUrl.trim() : "";

    const gridSize = 5; // locked to 5x5 for now
    const qty = Math.min(Math.max(toInt(body.qty ?? body.quantity, 25), 1), 500);

    // Items can come as a big textarea string, or as an array.
    const items: string[] = Array.isArray(body.items)
      ? body.items.map((x: any) => String(x).trim()).filter(Boolean)
      : typeof body.itemsText === "string"
        ? normalizeLines(body.itemsText)
        : typeof body.items === "string"
          ? normalizeLines(body.items)
          : [];

    if (items.length < 24) {
      return NextResponse.json(
        { ok: false, error: "Need at least 24 items (one per line)." },
        { status: 400 }
      );
    }

    // Center label can be customized from UI later; for now allow optional override.
    const centerLabel =
      typeof body.centerLabel === "string" && body.centerLabel.trim()
        ? body.centerLabel.trim()
        : "Joe’s Grows";

    // Generate pack (your lib/bingo.ts should produce ids + grids + weeklyPool + usedItems)
    const pack = createBingoPack(items, qty);

    // IMPORTANT: Firestore does not allow nested arrays (string[][]),
    // so we store each grid as a flat string[] plus gridSize metadata.
    const cardsForDb = pack.cards.map((c) => ({
      id: c.id,
      // Flatten row-major
      gridFlat: c.grid.flat(),
      gridSize,
      centerLabel,
    }));

    // Generate PDF buffer
    // Props here must match your pdf/BingoPackPdf.tsx prop names.
    const pdfBuffer = await renderToBuffer(
      // If your component is default-exported differently, adjust import.
      // This assumes: export default function BingoPackPdf(props: Props) { ... }
      (
        // @ts-expect-error react-pdf runtime accepts this
        <BingoPackPdf
          title={title}
          sponsorName={sponsorName}
          bannerImageUrl={bannerImageUrl}
          sponsorLogoUrl={sponsorLogoUrl}
          centerLabel={centerLabel}
          cards={pack.cards}
          gridSize={gridSize}
        />
      ) as any
    );

    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
    const createdAt = Date.now();

    // Save pack to Firestore (optional but now enabled)
    const app = getAdminApp();
    const db = admin.firestore(app);

    const packDoc = {
      createdAt,
      title,
      sponsorName,
      bannerImageUrl,
      sponsorLogoUrl,
      centerLabel,
      gridSize,
      qty,
      // weeklyPool is the pool actually used to generate cards (caller should sync to this)
      weeklyPool: pack.weeklyPool,
      // union of items appearing on cards (excluding center)
      usedItems: pack.usedItems,
      cards: cardsForDb,
    };

    // Write. Use server timestamp? You can, but keeping createdAt number is fine.
    const ref = await db.collection("packs").add(packDoc);

    // Minimal CSV roster (Card ID only, you can expand later)
    const csv = ["cardId"].concat(pack.cards.map((c) => c.id)).join("\n");

    return NextResponse.json({
      ok: true,
      packId: ref.id,
      createdAt,
      pdfBase64,
      csv,
      usedItems: pack.usedItems,
      weeklyPool: pack.weeklyPool,
      cards: pack.cards, // client can save locally if needed
    });
  } catch (err: any) {
    const msg = err?.message ? String(err.message) : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// Simple health check for env + firebase init
export async function GET() {
  try {
    getAdminApp();
    return NextResponse.json({ ok: true, at: Date.now() });
  } catch (err: any) {
    const msg = err?.message ? String(err.message) : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
