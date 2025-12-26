
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { createBingoPack } from "@/lib/bingo";
import BingoPackPdf, { type BingoCard } from "@/pdf/BingoPackPdf";

export const runtime = "nodejs";

function normalizeLines(text: unknown) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const packTitle = String(body?.packTitle ?? "Grower Bingo Pack").trim();
    const sponsorName = String(body?.sponsorName ?? "Sponsor").trim();

    // allow null/undefined safely
    const bannerUrl: string | undefined =
      typeof body?.bannerUrl === "string" && body.bannerUrl.trim()
        ? body.bannerUrl.trim()
        : undefined;

    const logoUrl: string | undefined =
      typeof body?.logoUrl === "string" && body.logoUrl.trim()
        ? body.logoUrl.trim()
        : undefined;

    const qty = Number(body?.qty ?? 25);
    const items = Array.isArray(body?.items)
      ? body.items.map((x: any) => String(x).trim()).filter(Boolean)
      : normalizeLines(body?.items);

    if (!Number.isFinite(qty) || qty < 1 || qty > 500) {
      return NextResponse.json({ error: "qty must be between 1 and 500" }, { status: 400 });
    }

    if (items.length < 24) {
      return NextResponse.json({ error: `Need at least 24 items (got ${items.length})` }, { status: 400 });
    }

    // ✅ Unique-grid pack generation
    const generated = createBingoPack(items, qty);

    const cards: BingoCard[] = generated.cards.map((c) => ({
      id: c.id,
      grid: c.grid, // string[][]
    }));

    // ✅ Build PDF document (component returns <Document/>)
    const doc = (
      <BingoPackPdf
        packTitle={packTitle}
        sponsorName={sponsorName}
        bannerUrl={bannerUrl}
        logoUrl={logoUrl}
        cards={cards}
      />
    );

    // ✅ FIX: TS typing mismatch in @react-pdf/renderer
    const pdfBuffer = await renderToBuffer(doc as any);

    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    // roster CSV (card ids)
    const csvLines = ["card_id", ...cards.map((c) => c.id)];
    const csv = csvLines.join("\n");

    return NextResponse.json({ pdfBase64, csv });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown server error" },
      { status: 500 }
    );
  }
}
