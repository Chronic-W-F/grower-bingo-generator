// app/api/generate/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type GeneratePayload = {
  packTitle: string;
  sponsorName: string;
  bannerUrl?: string;
  sponsorLogoUrl?: string;
  quantity: number;
  poolItems: string[];
  // Future-proof: optional mappings, etc.
};

function normalizeLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<GeneratePayload>;

    // --- Validate ---
    const packTitle = (body.packTitle ?? "").trim();
    const sponsorName = (body.sponsorName ?? "").trim();
    const bannerUrl = (body.bannerUrl ?? "").trim();
    const sponsorLogoUrl = (body.sponsorLogoUrl ?? "").trim();

    const quantity = Number(body.quantity);
    const poolItems = Array.isArray(body.poolItems) ? body.poolItems : [];

    if (!packTitle) {
      return NextResponse.json(
        { ok: false, error: "Pack title is required." },
        { status: 400 }
      );
    }

    if (!sponsorName) {
      return NextResponse.json(
        { ok: false, error: "Sponsor name is required." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 500) {
      return NextResponse.json(
        { ok: false, error: "Quantity must be between 1 and 500." },
        { status: 400 }
      );
    }

    const cleanedPool = poolItems
      .map((s) => String(s).trim())
      .filter(Boolean);

    if (cleanedPool.length < 24) {
      return NextResponse.json(
        { ok: false, error: `Need at least 24 pool items. You have ${cleanedPool.length}.` },
        { status: 400 }
      );
    }

    // URLs optional but if provided should be http(s)
    if (bannerUrl && !isHttpUrl(bannerUrl)) {
      return NextResponse.json(
        { ok: false, error: "Banner image URL must be a valid http(s) URL." },
        { status: 400 }
      );
    }
    if (sponsorLogoUrl && !isHttpUrl(sponsorLogoUrl)) {
      return NextResponse.json(
        { ok: false, error: "Sponsor logo URL must be a valid http(s) URL." },
        { status: 400 }
      );
    }

    // --- TEMP RESPONSE ---
    // This is the key fix: ALWAYS return JSON, never an empty body.
    // We'll wire real PDF/CSV generation next once we confirm the endpoint is stable.
    return NextResponse.json({
      ok: true,
      message: "API is alive. Next step: wire PDF + CSV generation.",
      echo: {
        packTitle,
        sponsorName,
        bannerUrl: bannerUrl || null,
        sponsorLogoUrl: sponsorLogoUrl || null,
        quantity,
        poolCount: cleanedPool.length,
        first5: cleanedPool.slice(0, 5),
      },
    });
  } catch (err: any) {
    // ALWAYS return JSON on errors so the frontend never hits "Unexpected end of JSON input"
    return NextResponse.json(
      {
        ok: false,
        error: "API crashed while parsing or generating.",
        details: String(err?.message ?? err ?? "unknown"),
      },
      { status: 500 }
    );
  }
}
