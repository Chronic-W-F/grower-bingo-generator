// app/api/generate/route.ts
import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import BingoPackPdf from "@/pdf/BingoPackPdf";

export const runtime = "nodejs";

type BingoCard = {
  id: string;
  grid: string[][];
};

const CENTER_LABEL = "Joe’s Grows";

function normalizeItems(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeInt(x: unknown, fallback: number) {
  const n = typeof x === "number" ? x : Number.parseInt(String(x ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeId(prefix = "card") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeGridFrom24(items24: string[]): string[][] {
  const grid: string[][] = Array.from({ length: 5 }, () => Array(5).fill(""));
  let k = 0;

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) {
        grid[r][c] = CENTER_LABEL;
      } else {
        grid[r][c] = items24[k++] ?? "";
      }
    }
  }
  return grid;
}

function buildRosterCsv(cards: BingoCard[]) {
  const header = ["cardId", ...Array.from({ length: 25 }, (_, i) => `cell${i + 1}`)];
  const lines: string[] = [];
  lines.push(header.join(","));

  const csvEscape = (s: string) => {
    const needs = /[,"\n\r]/.test(s);
    const out = String(s).replace(/"/g, '""');
    return needs ? `"${out}"` : out;
  };

  for (const c of cards) {
    const flat = c.grid.flat(); // 25
    lines.push([c.id, ...flat].map(csvEscape).join(","));
  }
  return lines.join("\n");
}

function toAbsoluteUrl(req: Request, maybeUrl: string): string {
  const raw = (maybeUrl || "").trim();
  if (!raw) return "";

  // already absolute
  if (raw.startsWith("https://") || raw.startsWith("http://")) return raw;

  // handle "/banners/..." from public folder
  if (raw.startsWith("/")) {
    const origin = new URL(req.url).origin;
    return `${origin}${raw}`;
  }

  // handle "banners/..." (missing leading slash)
  if (raw.startsWith("banners/")) {
    const origin = new URL(req.url).origin;
    return `${origin}/${raw}`;
  }

  return raw;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = typeof body?.title === "string" ? body.title : "Bingo Pack";
    const sponsorName = typeof body?.sponsorName === "string" ? body.sponsorName : "";
    const bannerImageUrl = typeof body?.bannerImageUrl === "string" ? body.bannerImageUrl : "";
    const sponsorLogoUrl = typeof body?.sponsorLogoUrl === "string" ? body.sponsorLogoUrl : "";

    const qty = clamp(safeInt(body?.qty, 25), 1, 500);

    const pool = normalizeItems(body?.items);

    if (pool.length < 24) {
      return NextResponse.json(
        {
          error: `Pool too small. Need at least 24 items for a 5x5 card (FREE center). You have ${pool.length}.`,
        },
        { status: 400 }
      );
    }

    const cards: BingoCard[] = [];
    const usedSet = new Set<string>();

    for (let i = 0; i < qty; i++) {
      const pick = shuffle(pool).slice(0, 24);
      for (const it of pick) usedSet.add(it);

      cards.push({
        id: makeId(`card${i + 1}`),
        grid: makeGridFrom24(pick),
      });
    }

    const usedItems = Array.from(usedSet);

    // IMPORTANT: make banner URL absolute so react-pdf can fetch it on the server
    const bannerAbs = toAbsoluteUrl(req, bannerImageUrl);

    // render PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(BingoPackPdf as any, {
        cards,
        title,
        bannerImageUrl: bannerAbs,
      }) as any
    );

    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
    const csv = buildRosterCsv(cards);

    return NextResponse.json({
      requestKey: `${Date.now()}`,
      title,
      sponsorName,
      bannerImageUrl: bannerAbs,
      sponsorLogoUrl,
      qty,
      pdfBase64,
      csv,
      usedItems,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error generating pack." },
      { status: 500 }
    );
  }
}
