// app/api/card-pdf/route.ts
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import path from "path";
import { readFile } from "fs/promises";

import SingleCardPdf from "@/pdf/SingleCardPdf";

export const runtime = "nodejs";

type BingoCard = {
  id: string;
  grid: string[][];
};

type Body = {
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string; // expects "/banners/current.png"
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

function toDataUri(mime: string, buf: Buffer) {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function loadBannerAsDataUri(bannerImageUrl?: string): Promise<string | undefined> {
  // locked default if caller passes blank
  const url = bannerImageUrl && bannerImageUrl.trim() ? bannerImageUrl.trim() : "/banners/current.png";

  // We only guarantee local banners in /public
  if (url.startsWith("/")) {
    const abs = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    try {
      const buf = await readFile(abs);
      const lower = url.toLowerCase();
      const mime =
        lower.endsWith(".png")
          ? "image/png"
          : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
          ? "image/jpeg"
          : lower.endsWith(".webp")
          ? "image/webp"
          : "application/octet-stream";
      return toDataUri(mime, buf);
    } catch {
      return undefined;
    }
  }

  // If you ever pass a full https URL, you can return it here
  // (data-uri is still more reliable in react-pdf)
  return url;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.card?.id || !Array.isArray(body.card.grid)) {
      return Response.json({ error: "Missing or invalid card payload" }, { status: 400 });
    }

    const bannerDataUri = await loadBannerAsDataUri(body.bannerImageUrl);

    const doc = React.createElement(SingleCardPdf as any, {
      title: body.title || "Bingo Card",
      sponsorName: body.sponsorName || "",
      bannerImageUrl: bannerDataUri || "",
      sponsorLogoUrl: body.sponsorLogoUrl || "",
      card: body.card,
    });

    const buffer = await renderToBuffer(doc);

    const filename = `${sanitizeFilename(body.title || "bingo-card")}-${body.card.id}.pdf`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return Response.json({ error: err?.message || "card-pdf failed" }, { status: 500 });
  }
}
