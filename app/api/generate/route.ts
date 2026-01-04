// app/api/generate/route.ts
import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import BingoPackPdf from "@/pdf/BingoPackPdf";
import path from "path";
import { readFile } from "fs/promises";

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
    const flat = c.grid.flat();
    lines.push([c.id, ...flat].map(csvEscape).join(","));
  }
  return lines.join("\n");
}

function inferMimeFromPath(p: string) {
  const lower = p.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

async function localPublicFileToDataUri(publicPath: string) {
  // publicPath like "/banners/joes-grows.png"
  const rel = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  const abs = path.join(process.cwd(), "public", rel);

  const buf = await readFile(abs);
  const mime = inferMimeFromPath(publicPath);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function fetchAsDataUri(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Banner fetch failed (${res.status})`);
  const contentType = res.headers.get("content-type") || "image/png";
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${contentType};base64,${buf.toString("base64")}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ NEW: stable pack identifiers for this request
    const createdAt = Date.now();
    const requestKey =
      typeof body?.requestKey === "string" && body.requestKey.trim()
        ? body.requestKey.trim()
        : `pack_${createdAt.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const title = typeof body?.title === "string" ? body.title : "Bingo Pack";
    const sponsorName = typeof body?.sponsorName === "string" ? body.sponsorName : "";

    // If blank, default to the banner you uploaded into /public/banners
    const bannerRaw =
      typeof body?.bannerImageUrl === "string" && body.bannerImageUrl.trim()
        ? body.bannerImageUrl.trim()
        : "/banners/joes-grows.png";

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

    // ✅ Banner: prefer local file read for /banners/...
    let bannerDataUri = "";
    try {
      if (bannerRaw.startsWith("/banners/") || bannerRaw.startsWith("banners/")) {
        const normalized = bannerRaw.startsWith("/") ? bannerRaw : `/${bannerRaw}`;
        bannerDataUri = await localPublicFileToDataUri(normalized);
      } else if (bannerRaw.startsWith("http://") || bannerRaw.startsWith("https://")) {
        bannerDataUri = await fetchAsDataUri(bannerRaw);
      } else if (bannerRaw.startsWith("/")) {
        // other public file path
        bannerDataUri = await localPublicFileToDataUri(bannerRaw);
      } else {
        bannerDataUri = "";
      }
    } catch {
      bannerDataUri = "";
    }

    const pdfBuffer = await renderToBuffer(
      React.createElement(BingoPackPdf as any, {
        cards,
        title,
        bannerImageUrl: bannerDataUri, // data URI
      }) as any
    );

    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
    const csv = buildRosterCsv(cards);

    // ✅ NEW: cards.json source of truth
    const cardsPack = {
      packId: requestKey,
      createdAt,
      title,
      sponsorName,
      cards,
    };

    return NextResponse.json({
      requestKey,
      createdAt,
      centerLabel: CENTER_LABEL,
      title,
      sponsorName,
      bannerImageUrl: bannerRaw,
      qty,
      pdfBase64,
      csv,
      usedItems,
      cardsPack, // ✅ NEW
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error generating pack." },
      { status: 500 }
    );
  }
}
