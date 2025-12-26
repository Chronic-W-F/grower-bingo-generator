// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type ApiPack = {
  pdfBase64: string;
  csv: string;
  usedItems: string[];
  weeklyPool: string[];
  meta: {
    gridSize: number;
    freeCenter: boolean;
    squaresPerCard: number;
    weeklyPoolSize: number;
    qty: number;
  };
};

const FORM_KEY = "grower-bingo:form:v2";
const POOL_KEY = "grower-bingo:pool:v1"; // caller reads this
const META_KEY = "grower-bingo:poolmeta:v1";

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

function downloadBase64(filename: string, base64: string, mime: string) {
  const bin = atob(base64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Page() {
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [qty, setQty] = useState<number>(25);
  const [gridSize, setGridSize] = useState<3 | 4 | 5>(5);

  const [pack, setPack] = useState<ApiPack | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(FORM_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.items === "string") setItems(parsed.items);
      if (typeof parsed.qty === "number") setQty(parsed.qty);
      if (parsed.gridSize === 3 || parsed.gridSize === 4 || parsed.gridSize === 5) setGridSize(parsed.gridSize);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(
      FORM_KEY,
      JSON.stringify({ items, qty, gridSize })
    );
  }, [items, qty, gridSize]);

  const masterCount = useMemo(() => {
    return items
      .split(/\r?\n/g)
      .map((s) => s.trim())
      .filter(Boolean).length;
  }, [items]);

  async function generate() {
    setError(null);
    setIsBusy(true);
    setPack(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, qty, gridSize }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");

      const p = data as ApiPack;
      setPack(p);

      // OPTION B UPDATED: store WEEKLY POOL (not full master pool)
      localStorage.setItem(POOL_KEY, p.weeklyPool.join("\n"));
      localStorage.setItem(META_KEY, JSON.stringify(p.meta));
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Grower Bingo Generator</h1>

      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        <label>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Master Pool (one per line)</div>
          <textarea
            value={items}
            onChange={(e) => setItems(e.target.value)}
            rows={12}
            style={{ width: "100%", fontFamily: "monospace" }}
          />
          <div style={{ marginTop: 6, opacity: 0.8 }}>
            Master pool items: {masterCount}
          </div>
        </label>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Card Size</div>
            <select
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value) as 3 | 4 | 5)}
            >
              <option value={3}>3×3</option>
              <option value={4}>4×4</option>
              <option value={5}>5×5</option>
            </select>
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              Defaults: 3×3 free center ON, 4×4 no center, 5×5 free center ON
            </div>
          </label>

          <label>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Quantity (cards)</div>
            <input
              type="number"
              value={qty}
              min={1}
              max={500}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </label>

          <div style={{ alignSelf: "end" }}>
            <button onClick={generate} disabled={isBusy}>
              {isBusy ? "Generating..." : "Generate Pack"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ color: "crimson", fontWeight: 600 }}>{error}</div>
        )}

        {pack && (
          <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Pack Ready</div>
            <div style={{ opacity: 0.85 }}>
              Grid: {pack.meta.gridSize}×{pack.meta.gridSize} • Free center:{" "}
              {String(pack.meta.freeCenter)} • Weekly pool size:{" "}
              {pack.meta.weeklyPoolSize}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => downloadBase64(`grower-bingo-${Date.now()}.pdf`, pack.pdfBase64, "application/pdf")}
              >
                Download PDF
              </button>
              <button onClick={() => downloadText(`grower-bingo-${Date.now()}.csv`, pack.csv, "text/csv")}>
                Download CSV (Roster)
              </button>
            </div>

            <div style={{ marginTop: 10, opacity: 0.85 }}>
              Caller pool has been synced to localStorage key <code>{POOL_KEY}</code>.
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
