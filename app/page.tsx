"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

type ApiResponse = {
  pdfBase64: string; // base64 string (no data: prefix)
  csv: string;
  usedItems?: string[];
  weeklyPool?: string[];
  createdAt?: number;
  requestKey?: string;
  error?: string;
};

type GeneratedPack = {
  pdfBase64: string;
  csv: string;
  usedItems: string[];
  createdAt: number;
  requestKey: string;
};

const SHARED_POOL_KEY = "grower-bingo:pool:v1";

const DEFAULT_ITEMS = `Trellis net
Lollipop
Defoliate
Stretch week
Dryback
Runoff EC
VPD off
Heat stress
Herm watch
Foxtails
Amber trichomes
Cloudy trichomes
Flush debate
Leaf taco
Stunted growth
Light burn
Cal-Mag
pH swing
Overwatered
Underwatered
Powdery mildew
Fungus gnats
Bud rot
Nute lockout
Late flower fade`;

function normalizeLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadBase64Pdf(filename: string, base64: string) {
  // base64 -> bytes
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
  downloadBlob(filename, blob);
}

export default function GeneratorPage() {
  const [packTitle, setPackTitle] = useState("Harvest Heroes Bingo");
  const [sponsorName, setSponsorName] = useState("Joe’s Grows");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState("");

  const [quantity, setQuantity] = useState<string>("25");
  const qtyParsed = useMemo(() => {
    const n = Number.parseInt((quantity || "").trim(), 10);
    if (!Number.isFinite(n)) return 25;
    return Math.max(1, Math.min(500, n));
  }, [quantity]);

  const [itemsText, setItemsText] = useState(DEFAULT_ITEMS);
  const itemsCount = useMemo(() => normalizeLines(itemsText).length, [itemsText]);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [pack, setPack] = useState<GeneratedPack | null>(null);

  async function generatePack() {
    setMsg("");
    setBusy(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: packTitle,
          sponsorName,
          bannerImageUrl,
          sponsorLogoUrl,
          qty: qtyParsed,
          itemsText,
        }),
      });

      const data = (await res.json()) as ApiResponse;

      if (!res.ok || data.error) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const usedItems = Array.isArray(data.usedItems) ? data.usedItems : [];
      const createdAt = typeof data.createdAt === "number" ? data.createdAt : Date.now();
      const requestKey = typeof data.requestKey === "string" ? data.requestKey : String(Date.now());

      // Option B: Sync caller pool to EXACT items on generated cards
      try {
        window.localStorage.setItem(SHARED_POOL_KEY, usedItems.join("\n"));
      } catch {
        // ignore
      }

      const nextPack: GeneratedPack = {
        pdfBase64: data.pdfBase64,
        csv: data.csv,
        usedItems,
        createdAt,
        requestKey,
      };

      setPack(nextPack);
      setMsg(`Generated ${qtyParsed} card(s). Caller pool synced (${usedItems.length} unique items).`);
    } catch (e: any) {
      setMsg(e?.message || "Failed to generate.");
    } finally {
      setBusy(false);
    }
  }

  function downloadPdf() {
    if (!pack) return;
    const safeTitle = (packTitle || "bingo-pack").replace(/[^a-z0-9\-_\s]/gi, "").trim() || "bingo-pack";
    downloadBase64Pdf(`${safeTitle}-${pack.requestKey}.pdf`, pack.pdfBase64);
  }

  function downloadCsv() {
    if (!pack) return;
    const safeTitle = (packTitle || "bingo-roster").replace(/[^a-z0-9\-_\s]/gi, "").trim() || "bingo-roster";
    const blob = new Blob([pack.csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(`${safeTitle}-${pack.requestKey}.csv`, blob);
  }

  return (
    <div
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>Grower Bingo Generator</h1>
        <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/caller"
            style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: "#111827",
              color: "white",
              textDecoration: "none",
            }}
          >
            Open Caller →
          </Link>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Pack title</label>
        <input
          value={packTitle}
          onChange={(e) => setPackTitle(e.target.value)}
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 16 }}
        />

        <div style={{ height: 12 }} />

        <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Sponsor name</label>
        <input
          value={sponsorName}
          onChange={(e) => setSponsorName(e.target.value)}
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 16 }}
        />

        <div style={{ height: 12 }} />

        <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Banner image URL (top banner)</label>
        <input
          value={bannerImageUrl}
          onChange={(e) => setBannerImageUrl(e.target.value)}
          placeholder="https://..."
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 16 }}
        />

        <div style={{ height: 12 }}
