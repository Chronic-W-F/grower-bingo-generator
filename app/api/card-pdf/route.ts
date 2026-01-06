// app/api/card-pdf/route.ts
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type BingoCard = {
  id: string;
  grid: string[][];
};

type Body = {
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string; // "/banners/current.png" or https://...
  sponsorLogoUrl?: string; // optional if your PDF supports it
  card: BingoCard;
};

function sanitizeFilename(input: string) {
  return (input || "")
    .replace(/[^\w\-\. ]+/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

function toAbsoluteUrl(reqUrl: string, maybeRelative?: string) {
  if (!maybeRelative) return "";
  try {
    // already absolute?
    return new URL(maybeRelative).toString();
  } catch {
    const base = new URL(reqUrl);
    return new URL(maybeRelative, `${base.protocol}//${base.host}`).toString();
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.card?.id || !Array.isArray(body.card.grid)) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid card payload." },
        { status: 400 }
      );
    }

    const title = body.title || "Harvest Heroes Bingo";
    const sponsorName = body.sponsorName || "";
    const bannerImageUrl = toAbsoluteUrl(req.url, body.bannerImageUrl);
    const sponsorLogoUrl = toAbsoluteUrl(req.url, body.sponsorLogoUrl);

    // If your BingoPackPdf is default export (it is, based on your import)
    const mod = await import("@/pdf/BingoPackPdf");
    const BingoPackPdf = (mod as any).default ?? (mod as any).BingoPackPdf;

    if (!BingoPackPdf) {
      return NextResponse.json(
        { ok: false, error: "BingoPackPdf export not found." },
        { status: 500 }
      );
    }

    // No JSX in route.ts: use createElement
    const doc = React.createElement(BingoPackPdf, {
      cards: [body.card],
      title,
      sponsorName,
      bannerImageUrl: bannerImageUrl || undefined,
      sponsorLogoUrl: sponsorLogoUrl || undefined,
    });

    const buffer = await renderToBuffer(doc);

    const filename =
      sanitizeFilename(`bingo-card-${body.card.id}.pdf`) || "bingo-card.pdf";

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Single card PDF failed." },
      { status: 500 }
    );
  }
}
