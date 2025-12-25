"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_POOL_TEXT } from "@/lib/defaultItems";

const POOL_STORAGE_KEY = "grower-bingo:pool:v1";

type GeneratedPack = {
  pdfBase64: string;
  csv: string;
  createdAt: number;
  requestKey: string;
};

const FORM_KEY = "grower-bingo:form:v2";

const DEFAULT_ITEMS = DEFAULT_POOL_TEXT;

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HomePage() {
  const [title, setTitle] = useState("Harvest Heroes Bingo");
  const [sponsorName, setSponsorName] = useState("Joe’s Grows");
  const [bannerUrl, setBannerUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [qtyInput, setQtyInput] = useState("25");

  // ✅ THIS is the shared pool (saved + re-used by Caller)
  const [itemsText, setItemsText] = useState(DEFAULT_ITEMS);

  const qty = useMemo(() => {
    const cleaned = (qtyInput || "").replace(/[^\d]/g, "");
    const parsed = Math.max(1, Math.min(500, Number(cleaned || "1")));
    return parsed;
  }, [qtyInput]);

  const currentCount = useMemo(() => {
    return itemsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean).length;
  }, [itemsText]);

  // Load saved form + saved pool on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FORM_KEY);
      if (raw) {
        const v = JSON.parse(raw);
        if (typeof v?.title === "string") setTitle(v.title);
        if (typeof v?.sponsorName === "string") setSponsorName(v.sponsorName);
        if (typeof v?.bannerUrl === "string") setBannerUrl(v.bannerUrl);
        if (typeof v?.logoUrl === "string") setLogoUrl(v.logoUrl);
        if (typeof v?.qtyInput === "string") setQtyInput(v.qtyInput);
        if (typeof v?.itemsText === "string") setItemsText(v.itemsText);
      }

      // ✅ If pool was saved separately, prefer it
      const pool = localStorage.getItem(POOL_STORAGE_KEY);
      if (pool && pool.trim().length > 0) {
        setItemsText(pool);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save form state whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        FORM_KEY,
        JSON.stringify({ title, sponsorName, bannerUrl, logoUrl, qtyInput, itemsText })
      );
    } catch {
      // ignore
    }
  }, [title, sponsorName, bannerUrl, logoUrl, qtyInput, itemsText]);

  // ✅ AUTO-SAVE POOL so caller can use it
  useEffect(() => {
    try {
      localStorage.setItem(POOL_STORAGE_KEY, itemsText);
    } catch {
      // ignore
    }
  }, [itemsText]);

  async function generatePdf() {
    const body = {
      title,
      sponsorName,
      bannerUrl,
      logoUrl,
      qty,
      itemsText,
    };

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      alert("Generate failed. Check your items list + try again.");
      return;
    }

    const data = (await res.json()) as GeneratedPack;

    const pdfBytes = Uint8Array.from(atob(data.pdfBase64), (c) => c.charCodeAt(0));
    downloadBlob(
      `GrowerBingo-${Date.now()}.pdf`,
      new Blob([pdfBytes], { type: "application/pdf" })
    );
  }

  async function downloadCsv() {
    const body = {
      title,
      sponsorName,
      bannerUrl,
      logoUrl,
      qty,
      itemsText,
      csvOnly: true,
    };

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      alert("CSV failed. Try again.");
      return;
    }

    const data = (await res.json()) as GeneratedPack;
    downloadBlob(`GrowerBingoRoster-${Date.now()}.csv`, new Blob([data.csv], { type: "text/csv" }));
  }

  function resetPoolToDefaults() {
    setItemsText(DEFAULT_ITEMS);
    try {
      localStorage.setItem(POOL_STORAGE_KEY, DEFAULT_ITEMS);
    } catch {}
  }

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-8 space-y-4">
      <h1 className="text-3xl font-bold">Grower Bingo Generator</h1>

      <label className="block space-y-1">
        <div className="font-semibold">Pack title</div>
        <input
          className="w-full rounded border p-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className="block space-y-1">
        <div className="font-semibold">Sponsor name</div>
        <input
          className="w-full rounded border p-2"
          value={sponsorName}
          onChange={(e) => setSponsorName(e.target.value)}
        />
      </label>

      <label className="block space-y-1">
        <div className="font-semibold">Banner image URL (top banner)</div>
        <input
          className="w-full rounded border p-2"
          placeholder="https://..."
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
        />
      </label>

      <label className="block space-y-1">
        <div className="font-semibold">Sponsor logo URL (FREE center square)</div>
        <input
          className="w-full rounded border p-2"
          placeholder="https://..."
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
        />
      </label>

      <label className="block space-y-1">
        <div className="font-semibold">Quantity (1–500)</div>
        <input
          className="w-40 rounded border p-2"
          value={qtyInput}
          onChange={(e) => setQtyInput(e.target.value)}
        />
      </label>

      <label className="block space-y-1">
        <div className="font-semibold">
          Square pool items (one per line — need 24+). Current: {currentCount}
        </div>
        <textarea
          className="h-64 w-full rounded border p-2 font-mono"
          value={itemsText}
          onChange={(e) => setItemsText(e.target.value)}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded bg-black px-4 py-2 font-semibold text-white"
          onClick={generatePdf}
        >
          Generate + Download PDF
        </button>

        <button className="rounded border px-4 py-2 font-semibold" onClick={downloadCsv}>
          Download CSV (Roster)
        </button>

        <button className="rounded border px-4 py-2 font-semibold" onClick={resetPoolToDefaults}>
          Reset pool to defaults
        </button>

        <a className="rounded border px-4 py-2 font-semibold" href="/caller">
          Open Caller
        </a>
      </div>

      <p className="text-sm opacity-80">
        Note: The pool is auto-saved. The Caller page will use the same pool.
      </p>
    </main>
  );
}
