// app/api/card-pdf/route.ts
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

function toAbsoluteUrl(reqUrl: string, maybeRelative?: string) {
  if (!maybeRelative) return undefined;

  // Already absolute?
  try {
    const u = new URL(maybeRelative);
    return u.toString();
  } catch {
    const base = new URL(reqUrl);
    return new URL(maybeRelative, `${base.protocol}//${base.host}`).toString();
  }
}

async function readStreamToUint8Array(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
    }
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
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

    // No JSX in .ts route: React.createElement
    const doc = React.createElement(BingoPackPdf, {
      cards: [body.card],
      title,
      sponsorName,
      bannerImageUrl,
    });

    // Some builds return Buffer/Uint8Array, others return ReadableStream
    const result = await (pdf(doc) as any).toBuffer();

    let bytes: Uint8Array;

    // Buffer is a Uint8Array subclass in Node
    if (result instanceof Uint8Array) {
      bytes = result;
    } else if (result && typeof result.getReader === "function") {
      bytes = await readStreamToUint8Array(result as ReadableStream<Uint8Array>);
    } else {
      // last-resort: try to wrap arrayBuffer-like
      bytes = new Uint8Array(result);
    }

    return new NextResponse(bytes, {
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
