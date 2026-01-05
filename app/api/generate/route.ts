// app/api/generate/route.ts
import { NextResponse } from "next/server";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import admin from "firebase-admin";
import { readFile } from "fs/promises";
import path from "path";

import BingoPackPdf from "@/pdf/BingoPackPdf";
import { createBingoPack } from "@/lib/bingo";

// IMPORTANT:
// Firestore does NOT allow nested arrays, so we store grid as a flat array + gridSize.
// That fixes: "INVALID_ARGUMENT: Nested arrays are not allowed"

// ---- Firebase Admin init (from env var) ----
function getFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var.");

  const creds = JSON.parse(raw);

  admin.initializeApp({
    credential: admin.credential.cert(creds),
    // projectId is optional; firebase-admin usually infers it from credentials
    projectId: process.env.FIREBASE_PROJECT_ID || creds.project_id || creds.projectId,
  });

  return admin;
}

// ---- Banner from /public/current.png as a data URI (server-safe for react-pdf) ----
async function publicPngToDataUri(filename: string) {
  const filePath = path.join(process.cwd(), "public", filename);
  const buf = await readFile(filePath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

// ---- Helpers ----
function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function csvEscape(value: string) {
  const needsQuotes = /[",\n\r]/.test(value);
  const v = value.replace(/"/g, '""');
  return needsQuotes ? `"${v}"` : v;
}

function buildRosterCsv(cards: { id: string }[]) {
  // Simple: Card ID only (you can add "Name" later)
  const lines = ["cardId", ...cards.map((c) => csvEscape(c.id))];
  return lines.join("\n");
}

function flattenGrid(grid: string[][]) {
  return grid.flat();
}

// ---- Route ----
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // Inputs
    const qtyRaw = body.qty ?? body.quantity ?? 1;
    const qty = Math.max(1, Math.min(500, Number(qtyRaw) || 1)); // cap for safety

    const title = typeof body.title === "string" ? body.title : "Harvest Heroes Bingo";
    const sponsorName = typeof body.sponsorName === "string" ? body.sponsorName : "Joe’s Grows";

    const itemsText =
      typeof body.itemsText === "string"
        ? body.itemsText
        : typeof body.items === "string"
          ? body.items
          : "";

    const pool = normalizeLines(itemsText);
    if (pool.length < 24) {
      return NextResponse.json(
        { ok: false, error: "Need at least 24 pool items (one per line)." },
        { status: 400 },
      );
    }

    // Generate pack (uses your existing lib/bingo.ts logic)
    // Expected shape: { packId, createdAt, cards:[{id, grid}], weeklyPool, usedItems }
    const pack = createBingoPack(pool, qty);

    // Banner
    // If you want to optionally disable: wrap in try/catch and allow undefined
    const bannerImageUrl = await publicPngToDataUri("current.png");

    // Build PDF bytes WITHOUT JSX (important inside .ts)
    const docEl = React.createElement(BingoPackPdf as any, {
      cards: pack.cards,
      title,
      sponsorName,
      bannerImageUrl,
    });

    const pdfBlob = await pdf(docEl).toBlob();
    const pdfArrayBuffer = await pdfBlob.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfArrayBuffer).toString("base64");

    const csv = buildRosterCsv(pack.cards);

    // Persist to Firestore
    // NOTE: nested arrays not allowed, so store gridFlat + gridSize.
    const fb = getFirebaseAdmin();
    const db = fb.firestore();

    const packDoc = db.collection("packs").doc(pack.packId);

    await packDoc.set(
      {
        packId: pack.packId,
        createdAt: pack.createdAt,
        title,
        sponsorName,
        qty: pack.cards.length,
        weeklyPool: pack.weeklyPool,
        usedItems: pack.usedItems,
        // Optional: store the banner choice used for this pack (not the whole base64)
        bannerKey: "current.png",
      },
      { merge: true },
    );

    // Cards as subcollection
    const batch = db.batch();
    for (const card of pack.cards) {
      const gridSize = card.grid.length;
      const gridFlat = flattenGrid(card.grid);

      const cardRef = packDoc.collection("cards").doc(card.id);
      batch.set(cardRef, {
        cardId: card.id,
        packId: pack.packId,
        createdAt: pack.createdAt,
        gridSize,
        gridFlat, // <-- NOT nested
      });
    }
    await batch.commit();

    // Optional: return a machine-readable copy too
    const cardsJson = JSON.stringify(
      {
        packId: pack.packId,
        createdAt: pack.createdAt,
        title,
        sponsorName,
        weeklyPool: pack.weeklyPool,
        usedItems: pack.usedItems,
        cards: pack.cards.map((c) => ({
          id: c.id,
          gridSize: c.grid.length,
          gridFlat: flattenGrid(c.grid),
        })),
      },
      null,
      2,
    );

    return NextResponse.json({
      ok: true,
      packId: pack.packId,
      createdAt: pack.createdAt,
      qty: pack.cards.length,
      weeklyPool: pack.weeklyPool,
      usedItems: pack.usedItems,
      pdfBase64,
      csv,
      cardsJson,
    });
  } catch (err: any) {
    const msg = typeof err?.message === "string" ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
