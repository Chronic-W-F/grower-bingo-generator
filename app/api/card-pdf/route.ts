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
  sponsorLogoUrl?: string; // optional if your PDF supports it
  card: BingoCard;
};

function toAbsoluteUrl(reqUrl: string, maybeRelative?: string) {
  if (!maybeRelative) return undefined;

  // already absolute?
  try {
    const u = new URL(maybeRelative);
    return u.toString();
  } catch {
    const base = new URL(reqUrl);
    return new URL(maybeRelative, `${base.protocol}//${base.host}`).toString();
  }
}

// Read a WHATWG ReadableStream<Uint8Array> into one Uint8Array
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

// Convert Uint8Array into a NEW ArrayBuffer (not SharedArrayBuffer-ish typing)
function toPureArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  // Slice creates a standalone ArrayBuffer with the exact bytes
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
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

    // No JSX in .ts route: use React.createElement
    const doc = React.createElement(BingoPackPdf as any, {
      // Render a 1-page PDF by passing a single card
      cards: [body.card],
      title,
      sponsorName,
      bannerImageUrl,
      sponsorLogoUrl,
    });

    // react-pdf's toBuffer() can return Buffer OR a ReadableStream depending on build/runtime.
    const result = await (pdf(doc) as any).toBuffer();

    let bytes: Uint8Array;

    // Buffer is a Uint8Array subclass in Node, so this covers Buffer too.
    if (result instanceof Uint8Array) {
      bytes = result;
    } else if (result && typeof result.getReader === "function") {
      bytes = await readStreamToUint8Array(result as ReadableStream<Uint8Array>);
    } else if (result && typeof result.arrayBuffer === "function") {
      // extremely defensive fallback
      const ab = await result.arrayBuffer();
      bytes = new Uint8Array(ab);
    } else {
      // last resort (may throw if result is weird)
      bytes = new Uint8Array(result);
    }

    // ✅ TS-safe BodyInit: ArrayBuffer (not Buffer, not Uint8Array<ArrayBufferLike>)
    const arrayBuffer = toPureArrayBuffer(bytes);

    const filename =
      sanitizeFilename(`bingo-card-${body.card.id}.pdf`) || "bingo-card.pdf";

    return new Response(arrayBuffer, {
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
