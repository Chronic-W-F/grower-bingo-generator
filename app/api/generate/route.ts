import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { createBingoPack } from "@/lib/bingo";
import { renderToBuffer } from "@react-pdf/renderer";
import BingoPackPdf from "@/pdf/BingoPackPdf";

// ---------- Firebase Init (safe for Vercel) ----------
if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var.");
  }

  const creds = JSON.parse(raw);

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: creds.project_id,
      clientEmail: creds.client_email,
      privateKey: String(creds.private_key).replace(/\\n/g, "\n"),
    }),
  });
}

// ---------- Helpers ----------
function normalizeLines(input: string): string[] {
  return input
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------- POST ----------
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Quantity
    const qtyRaw = body.qty ?? body.quantity ?? 1;
    const qty = Math.max(1, Math.min(500, Number(qtyRaw) || 1));

    // Metadata
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title
        : "Harvest Heroes Bingo";

    const sponsorName =
      typeof body.sponsorName === "string" && body.sponsorName.trim()
        ? body.sponsorName
        : "Joe’s Grows";

    const bannerImageUrl =
      typeof body.bannerImageUrl === "string" && body.bannerImageUrl.trim()
        ? body.bannerImageUrl.trim()
        : undefined;

    // ---------- Pool input (accept ANY UI variant) ----------
    let itemsText = "";

    const candidates = [
      body.itemsText,
      body.items,
      body.pool,
      body.poolText,
      body.squarePool,
      body.squarePoolText,
      body.square_pool,
      body.square_pool_text,
    ];

    for (const v of candidates) {
      if (typeof v === "string" && v.trim()) {
        itemsText = v;
        break;
      }
      if (Array.isArray(v) && v.every((x: any) => typeof x === "string")) {
        itemsText = v.join("\n");
        break;
      }
    }

    const pool = normalizeLines(itemsText);

    if (pool.length < 24) {
      return NextResponse.json(
        {
          ok: false,
          error: `Need at least 24 pool items (one per line). Got: ${pool.length}`,
          debug: {
            receivedKeys: Object.keys(body ?? {}),
            preview: itemsText.slice(0, 180),
          },
        },
        { status: 400 }
      );
    }

    // ---------- Generate cards ----------
    const pack = createBingoPack(pool, qty);

    // ---------- Render PDF ----------
    const pdfBuffer = await renderToBuffer(
      BingoPackPdf({
        cards: pack.cards,
        title,
        sponsorName,
        bannerImageUrl,
      })
    );

    // ✅ Fix for TS/Vercel: wrap Buffer in Blob (BodyInit-safe)
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bingo-cards.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
