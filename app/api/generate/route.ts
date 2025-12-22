import { NextResponse } from "next/server";
import { createBingoPack } from "@/lib/bingo";
import { renderBingoPackPdf, type BingoPack } from "@/pdf/BingoPackPdf";

export const runtime = "nodejs";

function normalizeLines(text: unknown) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function csvEscape(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const packTitle = String(body?.packTitle ?? "Grower Bingo").trim();
    const sponsorName = String(body?.sponsorName ?? "Sponsor").trim();

    const bannerUrlRaw = body?.bannerUrl ?? null;
    const logoUrlRaw = body?.logoUrl ?? null;

    const bannerUrl =
      typeof bannerUrlRaw === "string" && bannerUrlRaw.trim()
        ? bannerUrlRaw.trim()
        : null;

    const logoUrl =
      typeof logoUrlRaw === "string" && logoUrlRaw.trim()
        ? logoUrlRaw.trim()
        : null;

    const qty = Number(body?.qty ?? 0);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty < 1 || qty > 500) {
      return NextResponse.json(
        { error: "Quantity must be an integer between 1 and 500." },
        { status: 400 }
      );
    }

    // items can come in as an array (preferred) or as textarea string
    let items: string[] = [];
    if (Array.isArray(body?.items)) {
      items = body.items.map((x: any) => String(x).trim()).filter(Boolean);
    } else {
      items = normalizeLines(body?.items);
    }

    if (items.length < 24) {
      return NextResponse.json(
        { error: `Need at least 24 items. You have ${items.length}.` },
        { status: 400 }
      );
    }

    // ✅ Create UNIQUE cards pack (core logic)
    const generated = createBingoPack(items, qty);

    // ✅ Keep BingoCell objects so BingoPackPdf types match
    const packForPdf: BingoPack = {
      packTitle,
      sponsorName,
      bannerUrl,
      logoUrl,
      cards: generated.cards.map((c) => ({
        id: c.id,
        grid: c.grid, // <-- IMPORTANT: don't convert to string/null
      })),
    };

    // Render PDF buffer
    const pdfBuffer = await renderBingoPackPdf(packForPdf);
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    // CSV roster: Card ID + the 24 items on that card (FREE omitted)
    const csvLines: string[] = [];
    csvLines.push(
      ["card_id", "pack_title", "sponsor_name", "items_on_card"]
        .map(csvEscape)
        .join(",")
    );

    for (const card of packForPdf.cards) {
      const flat = card.grid
        .flat()
        .map((cell) => cell.text)
        .filter((t) => t !== "FREE");
      csvLines.push(
        [card.id, packTitle, sponsorName, flat.join(" | ")]
          .map(csvEscape)
          .join(",")
      );
    }

    const csv = csvLines.join("\n");

    return NextResponse.json({ pdfBase64, csv });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown server error" },
      { status: 500 }
    );
  }
}
