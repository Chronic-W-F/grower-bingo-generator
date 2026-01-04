// app/api/generate/route.ts
import { NextResponse } from "next/server";
import { createBingoPackFromMasterPool } from "@/lib/bingo";
import { renderToBuffer } from "@react-pdf/renderer";
import BingoPackPdf from "@/pdf/BingoPackPdf";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

type Body = {
  title?: string;
  qty?: number;
  quantity?: number;
  items?: string[]; // master pool lines
  gridSize?: 3 | 4 | 5; // optional, default 5

  sponsorName?: string;

  // Generator sends these
  bannerImageUrl?: string; // e.g. "/banners/current.png"
  sponsorLogoUrl?: string; // e.g. "https://..." (not used yet in PDF)
};

// Reads a file under /public and returns a data URI string (best for react-pdf Image)
async function readPublicAsDataUri(publicPath: string): Promise<string | null> {
  try {
    const clean = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
    const abs = path.join(process.cwd(), "public", clean);
    const buf = await fs.readFile(abs);

    const ext = path.extname(clean).toLowerCase();
    const mime =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
            ? "image/webp"
            : "application/octet-stream";

    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const title = (body.title ?? "Harvest Heroes Bingo").toString();

    const qtyRaw =
      Number.isFinite(body.qty) ? Number(body.qty) : Number(body.quantity);
    const safeQty = Math.max(
      1,
      Math.min(500, Number.isFinite(qtyRaw) ? qtyRaw : 25)
    );

    const gridSize = (body.gridSize ?? 5) as 3 | 4 | 5;

    const items = Array.isArray(body.items) ? body.items : [];
    if (gridSize === 5 && items.length < 24) {
      return NextResponse.json(
        { error: `Need at least 24 items for 5x5. Got ${items.length}.` },
        { status: 400 }
      );
    }

    // Generate pack (cards + weeklyPool + usedItems)
    const pack = createBingoPackFromMasterPool({
      masterPool: items,
      qty: safeQty,
      gridSize,
    });

    // Stable ids for storage + URLs
    const packId = `pack_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    const createdAt = Date.now();

    // --- Banner restore ---
    // Default workflow: replace public/banners/current.png weekly
    const bannerUrl = (body.bannerImageUrl ?? "/banners/current.png").toString();

    // Convert /public paths to data URI for react-pdf reliability
    let bannerDataOrUrl: string | undefined = undefined;

    if (bannerUrl.startsWith("/")) {
      bannerDataOrUrl = (await readPublicAsDataUri(bannerUrl)) ?? undefined;
    } else if (bannerUrl.startsWith("https://") || bannerUrl.startsWith("http://")) {
      bannerDataOrUrl = bannerUrl;
    }

    // IMPORTANT:
    // - app/page.tsx expects pdfBase64 to be RAW base64 (no data: prefix)
    const pdfBuffer = await renderToBuffer(
      BingoPackPdf({
        title,
        sponsorName: body.sponsorName,

        // ✅ Correct prop name for the updated PDF component:
        bannerImageUrl: bannerDataOrUrl,

        // ✅ Back-compat fallback (PDF also accepts this):
        sponsorImage: bannerDataOrUrl,

        cards: pack.cards,
        gridSize,
      }) as any
    );

    const pdfBase64 = pdfBuffer.toString("base64");

    // Optional CSV roster
    const csvLines = ["cardId"];
    for (const c of pack.cards) csvLines.push(c.id);
    const csv = csvLines.join("\n");

    const cardsPack = {
      packId,
      createdAt,
      title,
      sponsorName: body.sponsorName,
      cards: pack.cards,
      weeklyPool: pack.weeklyPool,
      usedItems: pack.usedItems,
    };

    const requestKey = packId;

    return NextResponse.json({
      requestKey,
      createdAt,

      packId,
      title,

      pdfBase64,
      csv,
      usedItems: pack.usedItems,
      cardsPack,

      weeklyPool: pack.weeklyPool,
      cards: pack.cards,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Generate failed." },
      { status: 500 }
    );
  }
}
