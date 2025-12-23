// app/api/generate/route.ts
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import fs from "node:fs";
import path from "node:path";

import BingoPackPdf from "@/pdf/BingoPackPdf";
import { ICON_MAP } from "@/lib/iconMap";
import { generateBingoPack } from "@/lib/bingo";

// ✅ Force Node runtime (prevents ReadableStream edge behavior)
export const runtime = "nodejs";

type GenerateRequest = {
  quantity?: number;
  sponsorImage?: string; // "/sponsors/joes-grows.png"
  accentColor?: string;  // "#2ecc71"
};

function publicFileToDataUri(publicPath: string) {
  const rel = publicPath.replace(/^\/+/, "");
  const abs = path.join(process.cwd(), "public", rel);

  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();

  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".webp"
      ? "image/webp"
      : "application/octet-stream";

  return `data:${mime};base64,${buf.toString("base64")}`;
}

function safeTryDataUri(publicPath?: string) {
  if (!publicPath) return undefined;
  try {
    return publicFileToDataUri(publicPath);
  } catch {
    return publicPath; // fallback (local dev might still resolve)
  }
}

function buildIconDataMap() {
  const out: Record<string, string> = {};
  for (const [label, iconPath] of Object.entries(ICON_MAP)) {
    try {
      out[label] = publicFileToDataUri(iconPath);
    } catch {
      out[label] = iconPath;
    }
  }
  return out;
}

function toRosterCsv(cards: { id: string }[]) {
  return ["CardID", ...cards.map((c) => c.id)].join("\n");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as GenerateRequest;

    const quantity = Math.max(1, Math.min(500, Number(body.quantity ?? 1)));
    const accentColor = body.accentColor ?? "#000000";

    const pack = generateBingoPack(quantity);
    const cards = pack.cards;

    const sponsorSrc = safeTryDataUri(body.sponsorImage);
    const iconMap = buildIconDataMap();

    const pdfBuffer = await renderToBuffer(
      <BingoPackPdf
        cards={cards}
        sponsorImage={sponsorSrc}
        accentColor={accentColor}
        iconMap={iconMap}
      />
    );

    return NextResponse.json({
      ok: true,
      pdfBase64: pdfBuffer.toString("base64"),
      csv: toRosterCsv(cards),
      cardCount: cards.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to generate bingo pack" },
      { status: 500 }
    );
  }
}
