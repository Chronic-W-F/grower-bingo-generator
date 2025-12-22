// app/api/generate/route.ts
import { NextResponse } from "next/server";
import { normalizeLines, createBingoPackUnique, type BingoPack } from "@/lib/bingo";
import { renderBingoPackPdf } from "@/pdf/BingoPackPdf";

export const runtime = "nodejs";

function asString(v: unknown) {
  return typeof v === "string" ? v : "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const packTitle = asString(body.packTitle) || "Harvest Heroes Bingo";
    const sponsorName = asString(body.sponsorName) || "Joe’s Grows";

    const bannerUrlRaw = asString(body.bannerUrl).trim();
    const logoUrlRaw = asString(body.logoUrl).trim();
    const bannerUrl = bannerUrlRaw.length ? bannerUrlRaw : undefined;
    const logoUrl = logoUrlRaw.length ? logoUrlRaw : undefined;

    const qtyNum = Number(body.qty);
    const qty = Number.isFinite(qtyNum) ? Math.max(1, Math.min(500, Math.floor(qtyNum))) : 25;

    // ✅ Mobile-safe normalization happens here (real fix for your “26 items but says <24” bug)
    const items = normalizeLines(body.items);

    if (items.length < 24) {
      return NextResponse.json(
        { ok: false, error: `Need at least 24 items. Found ${items.length}.` },
        { status: 400 }
      );
    }

    // Create UNIQUE cards
    const generated = createBingoPackUnique({ items, qty });

    const pack: BingoPack = {
      packTitle,
      sponsorName,
      bannerUrl,
      logoUrl,
      cards: generated.cards.map((c) => ({ id: c.id, grid: c.grid })),
    };

    const pdfBuf = await renderBingoPackPdf(pack);
    const pdfBase64 = Buffer.from(pdfBuf).toString("base64");

    // roster CSV
    const csvLines = ["card_id"];
    for (const c of pack.cards) csvLines.push(c.id);
    const csv = csvLines.join("\n");

    return NextResponse.json({
      ok: true,
      pdfBase64,
      csv,
      meta: { requestedQty: qty, generatedQty: pack.cards.length },
    });
  } catch (err: any) {
    const msg = err?.message ? String(err.message) : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
