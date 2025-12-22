// /app/api/generate/route.ts

import { NextResponse } from "next/server";
import { generateGrid, makeCardId } from "@/lib/bingo";
import { renderBingoPackPdf, type BingoPack } from "@/pdf/BingoPackPdf";

export const runtime = "nodejs";

function normalizeLines(text: unknown) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function cleanNumericString(v: unknown) {
  return String(v ?? "").replace(/[^\d]/g, "");
}

function parseQty(v: unknown) {
  const cleaned = cleanNumericString(v);
  const n = Number.parseInt(cleaned, 10);
  return { cleaned, n };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const packTitle = String(body?.packTitle ?? "").trim() || "Grower Bingo";
    const sponsorName = String(body?.sponsorName ?? "").trim() || "Sponsor";
    const bannerUrlRaw = String(body?.bannerUrl ?? "").trim();
    const logoUrlRaw = String(body?.logoUrl ?? "").trim();

    const bannerUrl = bannerUrlRaw ? bannerUrlRaw : null;
    const logoUrl = logoUrlRaw ? logoUrlRaw : null;

    const items = Array.isArray(body?.items)
      ? body.items.map((x: any) => String(x ?? "").trim()).filter(Boolean)
      : normalizeLines(body?.items);

    const { n: qtyNum } = parseQty(body?.qty);

    if (!Number.isFinite(qtyNum) || !Number.isInteger(qtyNum) || qtyNum < 1 || qtyNum > 500) {
      return NextResponse.json(
        { error: "Quantity must be between 1 and 500." },
        { status: 400 }
      );
    }

    if (items.length < 24) {
      return NextResponse.json(
        { error: `Need at least 24 square items (you have ${items.length}).` },
        { status: 400 }
      );
    }

    // Build cards
    const cards = Array.from({ length: qtyNum }, () => {
      const id = makeCardId();
      const grid = generateGrid(items);
      return { id, grid };
    });

    const pack: BingoPack = {
      packTitle,
      sponsorName,
      bannerUrl,
      logoUrl,
      cards,
    };

    // PDF
    const pdfBuffer = await renderBingoPackPdf(pack);
    const pdfBase64 = pdfBuffer.toString("base64");

    // CSV roster
    const csvLines = ["cardId"];
    for (const c of cards) csvLines.push(c.id);
    const csv = csvLines.join("\n");

    return NextResponse.json({ pdfBase64, csv });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error." },
      { status: 500 }
    );
  }
}
