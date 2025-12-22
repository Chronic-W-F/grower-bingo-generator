// app/api/generate/route.ts
import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import BingoPackPdf from "@/pdf/BingoPackPdf";
import { createBingoPackUnique, type BingoCard } from "@/lib/bingo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function normalizeLines(input: unknown): string[] {
  // Accept either array of strings or a big textarea string.
  if (Array.isArray(input)) {
    return input.map((x) => String(x).trim()).filter(Boolean);
  }
  const text = String(input ?? "");
  return text
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const packTitle = asString(body.packTitle).trim() || "Harvest Heroes Bingo";
    const sponsorName = asString(body.sponsorName).trim() || "Sponsor";

    const bannerUrlRaw = asString(body.bannerUrl).trim();
    const logoUrlRaw = asString(body.logoUrl).trim();
    const bannerUrl = bannerUrlRaw.length ? bannerUrlRaw : undefined;
    const logoUrl = logoUrlRaw.length ? logoUrlRaw : undefined;

    const qtyNum = Number(body.qty);
    const qty = Number.isFinite(qtyNum) ? Math.max(1, Math.min(500, Math.floor(qtyNum))) : 25;

    const items = normalizeLines(body.items);

    if (items.length < 24) {
      return NextResponse.json(
        { ok: false, error: `Need at least 24 items. Found ${items.length}.` },
        { status: 400 }
      );
    }

    // Create UNIQUE cards
    const generated = createBingoPackUnique({ items, qty });

    // Build PDF element WITHOUT JSX (keeps this file .ts)
    const doc = React.createElement(BingoPackPdf, {
      packTitle,
      sponsorName,
      bannerUrl,
      logoUrl,
      cards: generated.cards as BingoCard[],
    });

    // Render to Buffer (Node runtime)
    const pdfBuffer = await renderToBuffer(doc);

    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    // Roster CSV
    const csvLines = ["card_id"];
    for (const c of generated.cards) csvLines.push(c.id);
    const csv = csvLines.join("\n");

    return NextResponse.json({
      ok: true,
      pdfBase64,
      csv,
      createdAt: Date.now(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
