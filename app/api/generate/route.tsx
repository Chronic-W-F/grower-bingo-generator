// app/api/generate/route.tsx
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { createBingoPackFromMasterPool } from "@/lib/bingo";
import BingoPackPdf, { type BingoCard } from "@/pdf/BingoPackPdf";

export const runtime = "nodejs";

type GenerateRequest = {
  items?: string[]; // master pool (optional)
  qty?: number;
  quantity?: number; // legacy
  gridSize?: 3 | 4 | 5;

  // optional “skin” props (safe to ignore if your PDF component doesn’t use them)
  packTitle?: string;
  sponsorName?: string;
  bannerUrl?: string;
  logoUrl?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateRequest;

    const qtyRaw = body.qty ?? body.quantity ?? 1;
    const qty = clamp(Number(qtyRaw) || 1, 1, 500);

    const gridSize = (body.gridSize ?? 5) as 3 | 4 | 5;

    // Master pool: either supplied, or empty -> pack generator can still run
    // but you SHOULD pass items from the frontend.
    const masterPool = Array.isArray(body.items) ? body.items : [];

    const pack = createBingoPackFromMasterPool({
      masterPool,
      qty,
      gridSize,
    });

    const packTitle = body.packTitle ?? "Grower Bingo Pack";
    const sponsorName = body.sponsorName ?? "";
    const bannerUrl = body.bannerUrl ?? "";
    const logoUrl = body.logoUrl ?? "";

    // Your PDF expects cards shaped like {id, grid}
    const cards: BingoCard[] = pack.cards;

    const doc = (
      <BingoPackPdf
        cards={cards}
        packTitle={packTitle}
        sponsorName={sponsorName}
        bannerUrl={bannerUrl}
        logoUrl={logoUrl}
      />
    );

    const pdfBuffer = await renderToBuffer(doc);

    // If you also return a CSV, do it here (optional)
    // For now just return minimal response needed by your app.
    return NextResponse.json({
      pdfBase64: Buffer.from(pdfBuffer).toString("base64"),
      usedItems: pack.usedItems,
      weeklyPool: pack.weeklyPool,
      meta: pack.meta,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
