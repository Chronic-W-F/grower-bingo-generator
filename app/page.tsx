"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_POOL_TEXT } from "@/lib/defaultItems";
import { POOL_STORAGE_KEY, normalizePoolText, splitPool, countPoolItems } from "@/lib/pool";

type GeneratedPack = {
  pdfBase64: string;
  csv: string;
  createdAt: number;
  requestKey: string;
};

const FORM_KEY = "grower-bingo:form:v3";

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

export default function Page() {
  const defaultItemsText = useMemo(() => DEFAULT_POOL_TEXT, []);

  const [packTitle, setPackTitle] = useState("Harvest Heroes Bingo");
  const [sponsorName, setSponsorName] = useState("Joe’s Grows");
  const [bannerUrl, setBannerUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [qty, setQty] = useState("25");

  // SHARED pool textarea
  const [itemsText, setItemsText] = useState(defaultItemsText);

  const [loading, setLoading] = useState(false);
  const [pack, setPack] = useState<GeneratedPack | null>(null);
  const [error, setError] = useState<string>("");

  // Load saved form + shared pool
  useEffect(() => {
    try {
      const sharedPool = localStorage.getItem(POOL_STORAGE_KEY);
      if (sharedPool && sharedPool.trim().length > 0) {
        setItemsText(normalizePoolText(sharedPool));
      }

      const raw = localStorage.getItem(FORM_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);

      if (typeof saved.packTitle === "string") setPackTitle(saved.packTitle);
      if (typeof saved.sponsorName === "string") setSponsorName(saved.sponsorName);
      if (typeof saved.bannerUrl === "string") setBannerUrl(saved.bannerUrl);
      if (typeof saved.logoUrl === "string") setLogoUrl(saved.logoUrl);
      if (typeof saved.qty === "string") setQty(saved.qty);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist form
  useEffect(() => {
    try {
      localStorage.setItem(
        FORM_KEY,
        JSON.stringify({ packTitle, sponsorName, bannerUrl, logoUrl, qty })
      );
    } catch {
      // ignore
    }
  }, [packTitle, sponsorName, bannerUrl, logoUrl, qty]);

  // Persist shared pool (normalized) every time it changes
  useEffect(() => {
    try {
      localStorage.setItem(POOL_STORAGE_KEY, normalizePoolText(itemsText));
    } catch {
      // ignore
    }
  }, [itemsText]);

  const itemCount = useMemo(() => countPoolItems(itemsText), [itemsText]);

  async function generatePack() {
    setError("");
    setPack(null);

    const items = splitPool(itemsText);
    const quantityParsed = Math.max(1, Math.min(500, Number(String(qty).trim() || "0")));

    if (items.length < 24) {
      setError("Need at least 24 pool items (center is FREE).");
      return;
    }

    setLoading(true);
    try {
      const requestKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKey,
          title: packTitle,
          sponsorName,
          bannerImageUrl: bannerUrl || null,
          sponsorLogoUrl: logoUrl || null,
          qty: quantityParsed,
          items,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to generate pack.");
      }

      const data = (await res.json()) as GeneratedPack;

      const pdfBytes = Uint8Array.from(atob(data.pdfBase64), (c) => c.charCodeAt(0));
      downloadBlob(
        `${packTitle || "bingo-pack"}.pdf`,
        new Blob([pdfBytes], { type: "application/pdf" })
      );

      setPack(data);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    if (!pack) return;
    const csvBlob = new Blob([pack.csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(`${packTitle || "bingo-pack"}-roster.csv`, csvBlob);
  }

  function resetPoolToDefaults() {
    setPack(null);
    setError("");
    setItemsText(defaultItemsText);
    try {
      localStorage.setItem(POOL_STORAGE_KEY, defaultItemsText);
    } catch {}
  }

  function reloadSharedPool() {
    try {
      const shared = localStorage.getItem(POOL_STORAGE_KEY);
      if (shared && shared.trim().length > 0) setItemsText(normalizePoolText(shared));
    } catch {
      // ignore
    }
  }

  return (
    <main style={{ padding: 20, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      {/* NAV */}
      <div
        style={{
          marginBottom: 14,
          padding: 12,
          borderRadius: 10,
          border: "1px solid #ddd",
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18 }}>Grower Bingo Generator</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/caller" style={{ textDecoration: "none" }}>
            <button
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                fontWeight: 800,
              }}
            >
              Open Caller
            </button>
          </Link>
          <a href="/caller" target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <button
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #111",
                background: "#fff",
                color: "#111",
                fontWeight: 800,
              }}
            >
              Caller (new tab)
            </button>
          </a>
        </div>
      </div>

      <h1 style={{ fontSize: 36, marginBottom: 10 }}>Grower Bingo Generator</h1>

      {error ? (
        <div
          style={{
            margin: "12px 0",
            padding: 12,
            borderRadius: 8,
            background: "#ffe9e9",
            border: "1px solid #ffb3b3",
          }}
        >
          {error}
        </div>
      ) : null}

      <label style={{ display: "block", fontWeight: 600, marginTop: 12 }}>Pack title</label>
      <input
        value={packTitle}
        onChange={(e) => setPackTitle(e.target.value)}
        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
      />

      <label style={{ display: "block", fontWeight: 600, marginTop: 12 }}>Sponsor name</label>
      <input
        value={sponsorName}
        onChange={(e) => setSponsorName(e.target.value)}
        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
      />

      <label style={{ display: "block", fontWeight: 600, marginTop: 12 }}>
        Banner image URL (top banner)
      </label>
      <input
        value={bannerUrl}
        onChange={(e) => setBannerUrl(e.target.value)}
        placeholder="https://..."
        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
      />

      <label style={{ display: "block", fontWeight: 600, marginTop: 12 }}>
        Sponsor logo URL (FREE center square)
      </label>
      <input
        value={logoUrl}
        onChange={(e) => setLogoUrl(e.target.value)}
        placeholder="https://..."
        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
      />

      <label style={{ display: "block", fontWeight: 600, marginTop: 12 }}>
        Quantity (1–500)
      </label>
      <input
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        inputMode="numeric"
        style={{ width: 140, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
      />

      <label style={{ display: "block", fontWeight: 600, marginTop: 12 }}>
        Square pool items (one per line — need 24+). Current: {itemCount}
      </label>
      <textarea
        value={itemsText}
        onChange={(e) => setItemsText(e.target.value)}
        rows={14}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ccc",
          fontFamily: "monospace",
          whiteSpace: "pre",
        }}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button
          onClick={generatePack}
          disabled={loading}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "#111",
            color: "white",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Generating..." : "Generate + Download PDF"}
        </button>

        <button
          onClick={downloadCsv}
          disabled={!pack}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "white",
            color: "#111",
            fontWeight: 700,
            cursor: pack ? "pointer" : "not-allowed",
          }}
        >
          Download CSV (
