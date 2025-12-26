import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import BingoPackPdf from "@/pdf/BingoPackPdf";
import { createBingoPackFromMasterPool, normalizeLines } from "@/lib/bingo";

export const runtime = "nodejs";

function getFreeCenterForGrid(gridSize: 3 | 4 | 5) {
  // Your rule: 3x3 free center ON, 4x4 NO center, 5x5 free center ON
  if (gridSize === 4) return false;
  return true;
}

function requiredUniqueItems(gridSize: 3 | 4 | 5, freeCenter: boolean) {
  return gridSize * gridSize - (freeCenter ? 1 : 0);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const itemsRaw: string = body.items ?? "";
    const qtyRaw: number = Number(body.qty ?? body.quantity ?? 1);
    const gridSizeRaw: number = Number(body.gridSize ?? 5);

    const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.min(500, qtyRaw)) : 1;

    const gridSize =
      gridSizeRaw === 3 || gridSizeRaw === 4 || gridSizeRaw === 5
        ? (gridSizeRaw as 3 | 4 | 5)
        : 5;

    const freeCenter = getFreeCenterForGrid(gridSize);
    const needed = requiredUniqueItems(gridSize, freeCenter);

    const masterPool = normalizeLines(itemsRaw);

    // FIX: validate against what the card actually needs
    if (masterPool.length < needed) {
      return NextResponse.json(
        {
          error: `Not enough items in master pool. Need at least ${needed} for a ${gridSize}x${gridSize} card.`,
          needed,
          gridSize,
          freeCenter,
          have: masterPool.length,
        },
        { status: 400 }
      );
    }

    const pack = createBingoPackFromMasterPool({
      masterPool,
      qty,
      gridSize,
    });

    // IMPORTANT: route.ts must NOT contain JSX
    const doc = React.createElement(BingoPackPdf as any, {
      cards: pack.cards,
      gridSize: pack.meta.gridSize,
    }) as any;

    const pdfBuffer = await renderToBuffer(doc);
    const pdfBase64 = pdfBuffer.toString("base64");

    // CSV roster: CardID + flattened grid
    const rows: string[] = [];
    rows.push(["CardID", "GridSize", "FreeCenter", "Cells"].join(","));

    for (const card of pack.cards) {
      const flat = card.grid
        .flat()
        .map((s) => `"${String(s).replaceAll('"', '""')}"`)
        .join(";");

      rows.push(
        [card.id, String(pack.meta.gridSize), String(pack.meta.freeCenter), `"${flat}"`].join(",")
      );
    }

    const csv = rows.join("\n");

    return NextResponse.json({
      pdfBase64,
      csv,
      weeklyPool: pack.weeklyPool,
      usedItems: pack.usedItems,
      meta: pack.meta,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to generate." }, { status: 500 });
  }
}
