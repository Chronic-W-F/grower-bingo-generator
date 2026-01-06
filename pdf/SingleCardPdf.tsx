import { NextResponse } from "next/server";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { SingleCardPdf } from "@/pdf/SingleCardPdf";

// react-pdf must run in Node.js on Vercel
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BingoCard = { id: string; grid: string[][] };

type Body = {
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string;
  sponsorLogoUrl?: string;
  card: BingoCard;
};

function sanitizeFilename(name: string) {
  const base = (name || "")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "_")
    .trim();
  return base || "bingo-card.pdf";
}

function bufferToStream(buf: Buffer): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(buf));
      controller.close();
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.card?.id || !Array.isArray(body.card.grid)) {
      return NextResponse.json(
        { error: "Invalid payload. Missing card.id or card.grid." },
        { status: 400 }
      );
    }

    const doc = (
      <SingleCardPdf
        title={body.title || "Bingo Card"}
        sponsorName={body.sponsorName || ""}
        bannerImageUrl={body.bannerImageUrl || ""}
        sponsorLogoUrl={body.sponsorLogoUrl || ""}
        card={body.card}
      />
    );

    const buf = await pdf(doc).toBuffer();

    if (!buf || buf.length < 500) {
      return NextResponse.json(
        { error: `PDF render returned too few bytes (${buf?.length ?? 0}).` },
        { status: 500 }
      );
    }

    const filename = sanitizeFilename(`bingo-card-${body.card.id}.pdf`);

    return new Response(bufferToStream(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    const message = err?.message ? String(err.message) : String(err);
    return NextResponse.json(
      { error: "card-pdf crashed", message },
      { status: 500 }
    );
  }
}
