// app/api/generate/route.tsx

import { NextResponse } from "next/server";
import { createBingoPack } from "@/lib/bingo";

// ⚠️ Keep your existing PDF generator imports if you already have them.
// If your project already has BingoPackPdf + renderToBuffer working,
// leave those parts the same and ONLY make sure createBingoPack is called correctly.

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = String(body.title || "Bingo Pack");
    const sponsorName = String(body.sponsorName || "Joe’s Grows");
    const qty = Number(body.qty || 25);
    const items = Array.isArray(body.items) ? body.items : [];

    // ✅ This returns { cards }
    const pack = createBingoPack(items, qty, sponsorName || "Joe’s Grows");

    // If your existing route already renders PDF, keep it.
    // For now we just return a clear error if PDF render section differs.
    // Replace the section below with your existing working PDF render code.

    return NextResponse.json({
      error:
        "Your /api/generate route was replaced. Paste your existing PDF render code back in, and only keep the createBingoPack() line + pack.cards usage.",
      cardsCount: pack.cards.length,
    }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 400 });
  }
}
