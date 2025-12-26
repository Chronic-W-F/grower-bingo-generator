"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const FORM_KEY = "grower-bingo:form:v3";
const SHARED_POOL_KEY = "grower-bingo:pool:v1";

type GeneratedPack = {
  pdfBase64: string;
  csv: string;
  createdAt: number;
  requestKey: string;
  meta?: {
    gridSize: number;
    freeCenter: boolean;
    weeklyPoolSize?: number;
  };
};

function normalizeLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadPdfBase64(filename: string, base64: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "application/pdf" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function GeneratorPage() {
  const [itemsText, setItemsText] = useState<string>("");

  const [gridSize, setGridSize] = useState<3 | 4 | 5>(5);
  const [qty, setQty] = useState<number>(1);

  // Sponsor fields (UI restored now; we’ll re-wire to PDF + squares after grids)
  const [sponsorName, setSponsorName] = useState<string>("");
  const [bannerImageUrl, setBannerImageUrl] = useState<string>("");
  const [sponsorSquareText, setSponsorSquareText] = useState<string>("");

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [pack, setPack] = useState<GeneratedPack | null>(null);

  const poolCount = useMemo(() => normalizeLines(itemsText).length, [itemsText]);

  // Load saved form on mount
  useEffect(() => {
    const saved = safeParse<{
      itemsText: string;
      gridSize: 3 | 4 | 5;
      qty: number;
      sponsorName: string;
      bannerImageUrl: string;
      sponsorSquareText: string;
    }>(localStorage.getItem(FORM_KEY));

    if (saved) {
      setItemsText(saved.itemsText ?? "");
      setGridSize((saved.gridSize ?? 5) as 3 | 4 | 5);
      setQty(Number(saved.qty ?? 1));

      setSponsorName(saved.sponsorName ?? "");
      setBannerImageUrl(saved.bannerImageUrl ?? "");
      setSponsorSquareText(saved.sponsorSquareText ?? "");
      return;
    }

    // If no saved form, try to seed from shared pool if any
    const shared = localStorage.getItem(SHARED_POOL_KEY);
    if (shared && shared.trim()) {
      setItemsText(shared);
    } else {
      // Leave blank by default; user can paste or you can add a Load Defaults button later
      setItemsText("");
    }
  }, []);

  // Persist form
  useEffect(() => {
    localStorage.setItem(
      FORM_KEY,
      JSON.stringify({
        itemsText,
        gridSize,
        qty,
        sponsorName,
        bannerImageUrl,
        sponsorSquareText,
      })
    );
  }, [itemsText, gridSize, qty, sponsorName, bannerImageUrl, sponsorSquareText]);

  async function generatePack() {
    setError("");
    setLoading(true);

    try {
      const requestKey = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsText,
          qty,
          gridSize,

          // keep passing these for later wiring
          sponsorName,
          bannerImageUrl,
          sponsorSquareText,
          requestKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Failed to generate.");
        setPack(null);
        return;
      }

      // Sync Caller pool (Option B): use items actually used on cards
      // If API returns usedItems, prefer that. Otherwise fall back to weeklyPool or the whole pool.
      const used = Array.isArray(data?.usedItems) ? data.usedItems : null;
      const weeklyPool = Array.isArray(data?.weeklyPool) ? data.weeklyPool : null;

      const callerPoolText =
        used?.length ? used.join("\n") : weeklyPool?.length ? weeklyPool.join("\n") : itemsText;

      localStorage.setItem(SHARED_POOL_KEY, callerPoolText);

      setPack({
        pdfBase64: data.pdfBase64,
        csv: data.csv,
        createdAt: Date.now(),
        requestKey,
        meta: data?.meta,
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to generate.");
      setPack(null);
    } finally {
      setLoading(false);
    }
  }

  const metaLine = pack?.meta
    ? `Grid: ${pack.meta.gridSize}×${pack.meta.gridSize} • Free center: ${String(
        pack.meta.freeCenter
      )} • Weekly pool size: ${String(pack.meta.weeklyPoolSize ?? "")}`.trim()
    : "";

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <h1 style={{ margin: 0 }}>Grower Bingo Generator</h1>

        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <Link
            href="/caller"
            style={{
              padding: "10px 14px",
              border: "1px solid #000",
              borderRadius: 10,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Go to Caller
          </Link>

          <button
            onClick={() => downloadText("master-pool.txt", itemsText)}
            style={{ padding: "10px 14px", border: "1px solid #000", borderRadius: 10 }}
            type="button"
          >
            Export Pool (.txt)
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <h2 style={{ marginBottom: 8 }}>Master Pool (one per line)</h2>
        <textarea
          value={itemsText}
          onChange={(e) => setItemsText(e.target.value)}
          rows={10}
          style={{ width: "100%", fontFamily: "monospace" }}
          placeholder="Paste your full master pool here (one item per line)."
        />
        <div style={{ marginTop: 8, color: "#444" }}>Master pool items: {poolCount}</div>
      </div>

      <div style={{ display: "grid", gap: 14, marginBottom: 14 }}>
        <div>
          <h2 style={{ marginBottom: 8 }}>Sponsor (optional)</h2>

          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontWeight: 600 }}>Sponsor name</label>
              <input
                value={sponsorName}
                onChange={(e) => setSponsorName(e.target.value)}
                style={{ width: "100%", padding: 8 }}
                placeholder="Example: Joe’s Grows"
              />
            </div>

            <div>
              <label style={{ display: "block", fontWeight: 600 }}>Banner image URL</label>
              <input
                value={bannerImageUrl}
                onChange={(e) => setBannerImageUrl(e.target.value)}
                style={{ width: "100%", padding: 8 }}
                placeholder="https://..."
              />
              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                We will wire this back into the PDF once grids + caller are stable.
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontWeight: 600 }}>Sponsor square text</label>
              <input
                value={sponsorSquareText}
                onChange={(e) => setSponsorSquareText(e.target.value)}
                style={{ width: "100%", padding: 8 }}
                placeholder="Example: Sponsor shoutout / square label"
              />
              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                We will wire this into card generation next (replace one square per card).
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 style={{ marginBottom: 8 }}>Card Settings</h2>

          <div style={{ display: "grid", gap: 10, maxWidth: 360 }}>
            <div>
              <label style={{ display: "block", fontWeight: 600 }}>Card Size</label>
              <select
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value) as 3 | 4 | 5)}
                style={{ width: "100%", padding: 8 }}
              >
                <option value={3}>3×3</option>
                <option value={4}>4×4</option>
                <option value={5}>5×5</option>
              </select>
              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                Defaults: 3×3 free center ON, 4×4 no center, 5×5 free center ON
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontWeight: 600 }}>Quantity (cards)</label>
              <input
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                type="number"
                min={1}
                style={{ width: "100%", padding: 8 }}
              />
            </div>

            <button
              onClick={generatePack}
              disabled={loading}
              style={{ padding: "10px 14px", border: "1px solid #000", borderRadius: 10 }}
              type="button"
            >
              {loading ? "Generating..." : "Generate Pack"}
            </button>

            {error ? <div style={{ color: "#b00020", fontWeight: 700 }}>{error}</div> : null}
          </div>
        </div>
      </div>

      {pack ? (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 16,
            marginTop: 12,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Pack Ready</h2>
          <div style={{ color: "#444", marginBottom: 10 }}>
            {metaLine || "Pack generated."}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => downloadPdfBase64("grower-bingo-pack.pdf", pack.pdfBase64)}
              style={{ padding: "10px 14px", border: "1px solid #000", borderRadius: 10 }}
              type="button"
            >
              Download PDF
            </button>

            <button
              onClick={() => downloadText("grower-bingo-roster.csv", pack.csv, "text/csv")}
              style={{ padding: "10px 14px", border: "1px solid #000", borderRadius: 10 }}
              type="button"
            >
              Download CSV (Roster)
            </button>
          </div>

          <div style={{ marginTop: 10, color: "#555" }}>
            Caller pool has been synced to localStorage key <b>{SHARED_POOL_KEY}</b>.
          </div>

          <div style={{ marginTop: 10 }}>
            <Link href="/caller">Open Caller</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
