import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import React from "react";
import BingoPackPdf from "@/pdf/BingoPackPdf";

export const runtime = "nodejs";

type BingoCard = {
  id: string;
  grid: string[][];
};

type Body = {
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string; // "/banners/current.png" or https://...
  card: BingoCard;
};

/**
 * Convert relative URLs (like /banners/current.png) into absolute URLs
 * so @react-pdf can fetch them on the server.
 */
function toAbsoluteUrl(reqUrl: string, maybeRelative?: string) {
  if (!maybeRelative) return undefined;

  try {
    // already absolute
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

    /**
     * IMPORTANT:
     * No JSX in .ts route files — use React.createElement
     */
    const doc = React.createElement(BingoPackPdf, {
      cards: [body.card],
      title,
      sponsorName,
      bannerImageUrl,
    });

    /**
     * react-pdf returns a Node Buffer here
     */
    const buffer: Buffer = await pdf(doc).toBuffer();

    /**
     * ✅ CRITICAL FIX
     * Convert Buffer → ArrayBuffer slice
     * This is a valid Web Response BodyInit
     */
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bingo-card-${body.card.id}.pdf"`,
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
