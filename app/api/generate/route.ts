// app/api/generate/route.ts
// Accepts: items (newline string), qty, gridSize (3|4|5)
// Returns: pdfBase64, csv, usedItems, weeklyPool, meta
import { NextResponse } from "next/server";
import { createBingoPackFromMasterPool, normalizeLines } from "@/lib/bingo";
import { renderToBuffer } from "@react-pdf/renderer";
import BingoPackPdf from "@/pdf/BingoPackPdf"; // adjust if your default export differs

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const itemsRaw: string = body.items ?? "";
    const qtyRaw: number = Number(body.qty ?? body.quantity ?? 1);
    const gridSizeRaw: number = Number(body.gridSize ?? 5);

    const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.min(500, qtyRaw)) : 1;
    const gridSize = (gridSizeRaw === 3 || gridSizeRaw === 4 || gridSizeRaw === 5
      ? gridSizeRaw
      : 5) as 3 | 4 | 5;

    const masterPool = normalizeLines(itemsRaw);
    if (masterPool.length < 10) {
      return NextResponse.json({ error: "Not enough items in master pool." }, { status: 400 });
    }

    const pack = createBingoPackFromMasterPool({
      masterPool,
      qty,
      gridSize,
    });

    // PDF
    const pdfBuffer = await renderToBuffer(
      // Keep your existing props here (banner/sponsor etc) when you re-add them
      <BingoPackPdf cards={pack.cards} />
    );
    const pdfBase64 = pdfBuffer.toString("base64");

    // CSV roster: CardID + flattened grid
    const rows: string[] = [];
    rows.push(["CardID", "GridSize", "FreeCenter", "Cells"].join(","));
    for (const card of pack.cards) {
      const flat = card.grid.flat().map((s) => `"${String(s).replaceAll('"', '""')}"`).join(";");
      rows.push([card.id, String(pack.meta.gridSize), String(pack.meta.freeCenter), `"${flat}"`].join(","));
    }
    const csv = rows.join("\n");

    return NextResponse.json({
      pdfBase64,
      csv,
      usedItems: pack.usedItems,
      weeklyPool: pack.weeklyPool,
      meta: pack.meta,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to generate." },
      { status: 500 }
    );
  }
}
