// app/api/generate/route.ts
import { NextResponse } from "next/server";
import admin from "firebase-admin";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import path from "path";
import { readFile } from "fs/promises";

import BingoPackPdf from "@/pdf/BingoPackPdf";
import { createBingoPack } from "@/lib/bingo";

// Force Node runtime (we use fs + firebase-admin)
export const runtime = "nodejs";

type ReqBody = {
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string; // "/banners/current.png" preferred
  sponsorLogoUrl?: string; // optional
  qty?: number;
  quantity?: number; // allow old/new client shapes
  items?: string[];
};

function safeJsonParse(raw: string | undefined) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeItems(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function uniqCaseSensitive(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    if (seen.has(it)) continue;
    seen.add(it);
    out.push(it);
  }
  return out;
}

function clampQty(n: unknown) {
  const v = Number.parseInt(String(n ?? ""), 10);
  if (!Number.isFinite(v)) return 25;
  return Math.max(1, Math.min(500, v));
}

function toDataUri(mime: string, buf: Buffer) {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function loadBannerAsDataUri(bannerImageUrl?: string): Promise<string | undefined> {
  if (!bannerImageUrl) return undefined;

  // local banners in /public (locked default)
  // Example: "/banners/current.png"
  if (bannerImageUrl.startsWith("/")) {
    const abs = path.join(process.cwd(), "public", bannerImageUrl.replace(/^\//, ""));
    try {
      const buf = await readFile(abs);
      const lower = bannerImageUrl.toLowerCase();
      const mime = lower.endsWith(".png")
        ? "image/png"
        : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
        ? "image/jpeg"
        : lower.endsWith(".webp")
        ? "image/webp"
        : "application/octet-stream";

      return toDataUri(mime, buf);
    } catch {
      // If missing, skip banner instead of failing
      return undefined;
    }
  }

  // If a full https URL is provided, allow react-pdf to fetch it
  return bannerImageUrl;
}

/**
 * Build absolute origin for server-side React-PDF so it can load /public assets like:
 *   /bingo-icons/foxtails.png
 * via:
 *   https://<host>/bingo-icons/foxtails.png
 */
function getRequestOrigin(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (!host) return undefined;
  return `${proto}://${host}`;
}

function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const credsRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credsJson = safeJsonParse(credsRaw);

  if (!credsJson) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var.");
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    credsJson.projectId ||
    credsJson.project_id ||
    undefined;

  admin.initializeApp({
    credential: admin.credential.cert(credsJson),
    ...(projectId ? { projectId } : {}),
  });

  return admin.app();
}

function cardsToFirestore(cards: { id: string; grid: string[][] }[]) {
  // Firestore does NOT allow nested arrays like string[][]
  // Store as flat list + size
  return cards.map((c) => {
    const size = c.grid.length;
    const gridFlat = c.grid.flat();
    return { id: c.id, size, gridFlat };
  });
}

function buildCsv(cards: { id: string; grid: string[][] }[]) {
  const header = ["card_id", ...Array.from({ length: 25 }, (_, i) => `sq_${i + 1}`)].join(",");
  const rows = cards.map((c) => {
    const flat = c.grid.flat().map((x) => `"${String(x).replace(/"/g, '""')}"`);
    return [`"${c.id}"`, ...flat].join(",");
  });
  return [header, ...rows].join("\n");
}

function newPackId() {
  try {
    return `pack_${crypto.randomUUID().slice(0, 12)}`;
  } catch {
    return `pack_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;

    const title = String(body.title ?? "Harvest Heroes Bingo");
    const sponsorName = String(body.sponsorName ?? "");

    // Store the PUBLIC banner path in Firestore so phones can render it
    const bannerImageUrl = String(body.bannerImageUrl || "/banners/current.png");
    const sponsorLogoUrl = String(body.sponsorLogoUrl || "");

    const qty = clampQty(body.qty ?? body.quantity);

    const items = uniqCaseSensitive(normalizeItems(body.items));

    if (items.length < 24) {
      return NextResponse.json(
        { ok: false, error: `Need at least 24 pool items. Got ${items.length}.` },
        { status: 400 }
      );
    }

    const cardsPack = createBingoPack(items, qty);

    const forcedPackId = newPackId();
    const forcedCreatedAt = Date.now();

    // PDF banner: convert local /public path to a data-uri for reliability
    const bannerDataUri = await loadBannerAsDataUri(bannerImageUrl);

    // ✅ NEW: origin for server-side PDF icon loading
    const origin = getRequestOrigin(req);

    const pdfElement = React.createElement(BingoPackPdf as any, {
      cards: cardsPack.cards,
      title,
      sponsorName,
      bannerImageUrl: bannerDataUri,

      // ✅ NEW: pass origin so "/bingo-icons/x.png" becomes "https://host/bingo-icons/x.png"
      origin,
    });

    const pdfBuffer = await renderToBuffer(pdfElement);

    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
    const csv = buildCsv(cardsPack.cards);

    // Save pack to Firestore
    const app = getAdminApp();
    const db = admin.firestore(app);

    const firestorePack = {
      packId: forcedPackId,
      createdAt: forcedCreatedAt,
      title,
      sponsorName,

      // persist these so digital cards match PDF week-to-week
      bannerImageUrl, // keep PUBLIC url/path here
      sponsorLogoUrl,

      usedItems: cardsPack.usedItems ?? [],
      weeklyPool: cardsPack.weeklyPool ?? [],
      cards: cardsToFirestore(cardsPack.cards),
    };

    await db.collection("bingoPacks").doc(forcedPackId).set(firestorePack, { merge: true });

    return NextResponse.json({
      ok: true,
      pdfBase64,
      csv,
      createdAt: forcedCreatedAt,
      requestKey: forcedPackId,
      usedItems: cardsPack.usedItems ?? [],
      cardsPack: {
        packId: forcedPackId,
        createdAt: forcedCreatedAt,
        title,
        sponsorName,

        // return these so localStorage pack has them too
        bannerImageUrl,
        sponsorLogoUrl,

        cards: cardsPack.cards,
      },
    });
  } catch (e: any) {
    const msg = e?.message || "Generate failed.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
