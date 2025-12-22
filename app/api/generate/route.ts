// app/api/generate/route.ts
import { NextResponse } from "next/server";
import { createBingoPack } from "@/lib/bingo";
import { renderBingoPackPdf, type BingoPack } from "@/pdf/BingoPackPdf";

export const runtime = "nodejs";

function normalizeLines(text: unknown) {
  if (typeof text !== "string") return [];
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseQty(raw: unknown) {
  const s = String(raw ?? "").trim();
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return Math.floor(n);
}

function cleanUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  return t ? t : undefined;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const packTitle = typeof body.packTitle === "string" ? body.packTitle.trim() : "Bingo Pack";
    const sponsorName =
      typeof body.sponsorName === "string" ? body.sponsorName.trim() : "Sponsor";

    const bannerUrl = cleanUrl(body.bannerUrl); // ✅ string | undefined (never null)
    const logoUrl = cleanUrl(body.logoUrl);     // ✅ string | undefined (never null)

    const qty = parseQty(body.quantity);
    if (qty < 1 || qty > 500) {
      return NextResponse.json(
        { error: "Quantity must be between 1 and 500." },
        { status: 400 }
      );
    }

    const items = normalizeLines(body.items);
    if (items.length < 24) {
      return NextResponse.json(
        { error: "Need at least 24 square pool items." },
        { status: 400 }
      );
    }

    // ✅ Unique pack generation
    const generated = createBingoPack(items, qty);

    // ✅ Build the pack with correct types
    const pack: BingoPack = {
      packTitle,
      sponsorName,
      bannerUrl, // undefined is OK
      logoUrl,   // undefined is OK
      cards: generated.cards,
    };

    const pdfBuf = await renderBingoPackPdf(pack);

    return new NextResponse(pdfBuf as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${packTitle.replace(
          /[^a-z0-9_-]+/gi,
          "_"
        )}.pdf"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}
