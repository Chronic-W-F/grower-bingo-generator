// app/api/generate/route.ts
import { NextResponse } from "next/server";
import { createBingoPackUnique } from "@/lib/bingo";
import { renderBingoPackPdf, type BingoPack } from "@/pdf/BingoPackPdf";

export const runtime = "nodejs";

function normalizeLines(text: unknown): string[] {
  if (typeof text !== "string") return [];
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const packTitle = String(body.packTitle ?? "Harvest Heroes Bingo").trim();
    const sponsorName = String(body.sponsorName ?? "Joe’s Grows").trim();
    const bannerUrlRaw = String(body.bannerUrl ?? "").trim();
    const logoUrlRaw = String(body.logoUrl ?? "").trim();

    const bannerUrl = bannerUrlRaw.length ? bannerUrlRaw : undefined;
    const logoUrl = logoUrlRaw.length ? logoUrlRaw : undefined;

    const qty = Number(body.quantity ?? 25);
    const items = normalizeLines(body.items);

    const generated = createBingoPackUnique(items, qty);

    const pack: BingoPack = {
      packTitle,
      sponsorName,
      bannerUrl,
      logoUrl,
      cards: generated.cards,
    };

    const pdfBuf = await renderBingoPackPdf(pack);

    // roster CSV
    const csv = ["card_id", ...pack.cards.map((c) => c.id)].join("\n");

    // We return JSON with base64 for PDF + CSV text, so the frontend can download both.
    return NextResponse.json({
      ok: true,
      pdfBase64: pdfBuf.toString("base64"),
      csv,
      cardCount: pack.cards.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unknown error",
      },
      { status: 400 }
    );
  }
}
