// app/api/generate/route.ts

import { NextResponse } from "next/server";
import { createBingoPack } from "@/lib/bingo";
import { renderBingoPackPdf, type BingoPack } from "@/pdf/BingoPackPdf";

export const runtime = "nodejs";

function normalizeLines(text: unknown) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function csvEscape(v: string) {
  // Wrap in quotes and escape quotes
  return `"${v.replace(/"/g, '""')}"`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const packTitle = String(body?.packTitle ?? "Grower Bingo").trim();
    const sponsorName = String(body?.sponsorName ?? "Sponsor").trim();

    const bannerUrlRaw = body?.bannerUrl ?? null;
    const logoUrlRaw = body?.logoUrl ?? null;

    const bannerUrl =
      typeof bannerUrlRaw === "string" && bannerUrlRaw.trim()
        ? bannerUrlRaw.trim()
        : null;

    const logoUrl =
      typeof logoUrlRaw === "string" && logoUrlRaw.trim()
        ? logoUrlRaw.trim()
        : null;

    const qty = Number(body?.qty ?? 0);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty < 1 || qty > 500) {
      return NextResponse.json(
        { error: "Quantity must be an integer between 1 and 500." },
        { status: 400 }
      );
    }

    // items can come in as an array (preferred) or as textarea string
    let items: string[] = [];
    if (Array.isArray(body?.items)) {
      items = body.items.map((x: any) => String(x).trim()).filter(Boolean);
    } else {
      items = normalizeLines(body?.items);
    }

    if (items.length < 24) {
      return NextResponse.json(
        { error: `Need at least 24 items. You have ${items.length}.` },
        { status: 400 }
      );
    }

    // Create UNIQUE cards pack (core logic)
    const generated = createBingoPack(items, qty
