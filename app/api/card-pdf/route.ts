// app/api/card-pdf/route.ts
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import SingleCardPdf from "@/pdf/SingleCardPdf";

export const runtime = "nodejs";

type BingoCard = {
  id: string;
  grid: string[][];
};

type Body = {
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string;
  sponsorLogoUrl?: string;
  card: BingoCard;
};

function sanitizeFilename(name: string) {
  return (name || "bingo-card")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.card?.id || !Array.isArray(body.card.grid)) {
      return Response.json(
        { error: "Missing or invalid card payload" },
        { status: 400 }
      );
    }

    const doc = React.createElement(SingleCardPdf, {
      title: body.title || "Bingo Card",
      sponsorName: body.sponsorName || "",
      bannerImageUrl: body.bannerImageUrl || "",
      sponsorLogoUrl: body.sponsorLogoUrl || "",
      card: body.card,
    });

    const buffer = await renderToBuffer(doc);

    const filename = `${sanitizeFilename(
      body.title || "bingo-card"
    )}-${body.card.id}.pdf`;

    // ✅ Convert Buffer -> Uint8Array for Response body typing
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "card-pdf failed" },
      { status: 500 }
    );
  }
}
