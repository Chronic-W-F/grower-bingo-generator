import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import BingoPackPdf from "@/pdf/BingoPackPdf";
import { createBingoPackUnique } from "@/lib/bingo";

function asString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function normalizeLines(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map(String).map(s => s.trim()).filter(Boolean);
  }

  if (typeof input === "string") {
    return input
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  return [];
}

async function streamToUint8Array(stream: ReadableStream): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const packTitle = asString(body.packTitle) || "Grower Bingo";
    const sponsorName = asString(body.sponsorName) || "Sponsor";
    const bannerUrl = asString(body.bannerUrl);
    const logoUrl = asString(body.logoUrl);

    const qtyNum = Number(body.qty);
    const qty = Number.isFinite(qtyNum) ? Math.max(1, Math.min(500, qtyNum)) : 1;

    const items = normalizeLines(body.items);

    if (items.length < 24) {
      return NextResponse.json(
        { ok: false, error: `Need at least 24 items. Found ${items.length}.` },
        { status: 400 }
      );
    }

    // Generate unique cards
    const generated = createBingoPackUnique({ items, qty });

    // Build PDF document
    const doc = (
      <BingoPackPdf
        packTitle={packTitle}
        sponsorName={sponsorName}
        bannerUrl={bannerUrl || undefined}
        logoUrl={logoUrl || undefined}
        cards={generated.cards}
      />
    );

    // 🔥 CRITICAL FIX: handle ReadableStream correctly
    const instance = pdf(doc);
    const stream = await instance.toStream();
    const uint8 = await streamToUint8Array(stream);
    const pdfBase64 = Buffer.from(uint8).toString("base64");

    return NextResponse.json({
      ok: true,
      pdfBase64,
      csv: generated.csv,
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err?.message || "PDF generation failed" },
      { status: 500 }
    );
  }
}
