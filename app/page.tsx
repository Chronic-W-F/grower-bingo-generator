// app/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type BingoCard = { id: string; grid: string[][] };

type CardsPack = {
  packId: string;
  createdAt: number;
  title?: string;
  sponsorName?: string;
  cards: BingoCard[];
};

type GeneratedPack = {
  pdfBase64?: string; // optional because we do not persist it
  csv: string;
  createdAt: number;
  requestKey: string;
  usedItems?: string[];
  cardsPack?: CardsPack;
};

const SHARED_POOL_KEY = "grower-bingo:pool:v1";
const LAST_PACK_META_KEY = "grower-bingo:lastPackMeta:v1";
const ACTIVE_PACK_ID_KEY = "grower-bingo:activePackId:v1";

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
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function safeFileName(s: string) {
  const out = (s || "").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_");
  return out || "bingo-pack";
}

function downloadBase64Pdf(filename: string, base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadTextFile(
  filename: string,
  text: string,
  mime = "text/plain;charset=utf-8"
) {
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

function downloadJsonFile(filename: string, obj: unknown) {
  const text = JSON.stringify(obj, null, 2);
  downloadTextFile(filename, text, "application/json;charset=utf-8");
}

function loadLastPackMeta(): GeneratedPack | null {
  try {
    const raw = window.localStorage.getItem(LAST_PACK_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GeneratedPack;
  } catch {
    return null;
  }
}

function saveLastPackMeta(pack: GeneratedPack) {
  try {
    // Do not store pdfBase64 in localStorage (too large).
    const toStore: GeneratedPack = {
      csv: pack.csv || "",
      createdAt: pack.createdAt,
      requestKey: pack.requestKey,
      usedItems: pack.usedItems,
      cardsPack: pack.cardsPack,
    };
    window.localStorage.setItem(LAST_PACK_META_KEY, JSON.stringify(toStore));
  } catch {
    // ignore
  }
}

export default function Page() {
  const [title, setTitle] = useState("Harvest Heroes Bingo");
  const [sponsorName, setSponsorName] = useState("Joe’s Grows");

  // Locked: always use /banners/current.png
  const [bannerImageUrl, setBannerImageUrl] = useState("/banners/current.png");

  const [sponsorLogoUrl, setSponsorLogoUrl] = useState("");
  const [qtyInput, setQtyInput] = useState("25");
  const [itemsText, setItemsText] = useState(DEFAULT_ITEMS);

  const [isGenerating, setIsGenerating] = useState(false);
  const [pack, setPack] = useState<GeneratedPack | null>(null);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");

  const poolLines = useMemo(() => normalizeLines(itemsText), [itemsText]);
  const poolCount = poolLines.length;

  // Restore last pack meta so buttons stay active when you come back from Caller
  useEffect(() => {
    const last = loadLastPackMeta();
    if (last?.requestKey) {
      setPack(last);
      if (last?.cardsPack?.title) setTitle(last.cardsPack.title);
      if (typeof last?.cardsPack?.sponsorName === "string") {
        setSponsorName(last.cardsPack.sponsorName);
      }
      if (last?.cardsPack?.packId) {
        try {
          window.localStorage.setItem(ACTIVE_PACK_ID_KEY, last.cardsPack.packId);
        } catch {
          // ignore
        }
      }
      setInfo("Restored last generated pack (meta) from this device.");
    }
  }, []);

  // Keep the shared pool synced for Caller reload
  useEffect(() => {
    try {
      window.localStorage.setItem(SHARED_POOL_KEY, poolLines.join("\n"));
    } catch {
      // ignore
    }
  }, [poolLines]);

  function loadDefaults() {
    setItemsText(DEFAULT_ITEMS);
    setError("");
    setInfo("");
  }

  function clampQty(raw: string) {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return 25;
    return Math.max(1, Math.min(500, n));
  }

  async function generateAndDownloadPdf() {
    setError("");
    setInfo("");

    const qty = clampQty(qtyInput);

    if (poolLines.length < 24) {
      setError(
        `Pool too small. Need at least 24 items for a 5x5 card (FREE center). You have ${poolLines.length}.`
      );
      return;
    }

    try {
      window.localStorage.setItem(SHARED_POOL_KEY, poolLines.join("\n"));
    } catch {
      // ignore
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          sponsorName,
          bannerImageUrl,
          sponsorLogoUrl,
          qty,
          items: poolLines,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Generate failed.");
        return;
      }

      if (!data?.pdfBase64) {
        setError("Generate succeeded but PDF was missing from the response.");
        return;
      }

      const nextPack: GeneratedPack = {
        pdfBase64: data.pdfBase64,
        csv: data.csv || "",
        createdAt: data.createdAt || Date.now(),
        requestKey: data.requestKey || String(Date.now()),
        usedItems: data.usedItems,
        cardsPack: data.cardsPack,
      };

      setPack(nextPack);
      saveLastPackMeta(nextPack);

      // Save cardsPack to localStorage for Winners and digital cards
      if (data?.cardsPack?.packId) {
        const pid = data.cardsPack.packId;

        try {
          window.localStorage.setItem(ACTIVE_PACK_ID_KEY, pid);
        } catch {
          // ignore
        }

        try {
          window.localStorage.setItem(
            `grower-bingo:pack:${pid}`,
            JSON.stringify(data.cardsPack)
          );
        } catch {
          // ignore
        }

        // Important: clear any prior draw history for this packId
        try {
          window.localStorage.setItem(`grower-bingo:draws:${pid}`, "");
        } catch {
          // ignore
        }
      }

      // Option B: sync usedItems to caller pool so caller only draws items on cards
      if (Array.isArray(data.usedItems) && data.usedItems.length) {
        try {
          window.localStorage.setItem(SHARED_POOL_KEY, data.usedItems.join("\n"));
        } catch {
          // ignore
        }
      }

      const filename = `${safeFileName(title)}-${nextPack.requestKey}.pdf`;
      setTimeout(() => {
        try {
          downloadBase64Pdf(filename, data.pdfBase64);
          setInfo(
            "PDF download triggered. If nothing happened, use the manual Download PDF button below."
          );
        } catch (e: any) {
          setError(e?.message || "Could not trigger PDF download.");
        }
      }, 150);
    } catch (e: any) {
      setError(e?.message || "Generate failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  function manualDownloadPdf() {
    if (!pack?.pdfBase64) {
      setError("PDF is not stored after refresh. Generate again if you need the PDF button active.");
      return;
    }
    const filename = `${safeFileName(title)}-${pack.requestKey}.pdf`;
    downloadBase64Pdf(filename, pack.pdfBase64);
  }

  function downloadCsv() {
    if (!pack?.csv) return;
    const filename = `${safeFileName(title)}-${pack.requestKey}.csv`;
    downloadTextFile(filename, pack.csv, "text/csv;charset=utf-8");
  }

  function downloadCardsJson() {
    const cardsPack = pack?.cardsPack;
    if (!cardsPack?.packId) {
      setError("No cardsPack found. Generate a pack first.");
      return;
    }
    setError("");
    const filename = `${safeFileName(title)}-${cardsPack.packId}.cards.json`;
    downloadJsonFile(filename, cardsPack);
    setInfo("cards.json downloaded.");
  }

  function openWinnersNewTab() {
    const pid = pack?.cardsPack?.packId;
    if (!pid) {
      setError("No packId found. Generate a pack first.");
      return;
    }
    window.open(`/winners/${encodeURIComponent(pid)}`, "_blank", "noopener,noreferrer");
  }

  function openCallerNewTab() {
    const pid = pack?.cardsPack?.packId;
    if (!pid) {
      setError("Generate a pack first so Caller can bind to a packId.");
      return;
    }
    try {
      window.localStorage.setItem(ACTIVE_PACK_ID_KEY, pid);
    } catch {
      // ignore
    }
    window.open(`/caller?packId=${encodeURIComponent(pid)}`, "_blank", "noopener,noreferrer");
  }

  function clearActivePack() {
    setPack(null);
    setInfo("Cleared active pack. Generate new cards when ready.");
    try {
      window.localStorage.removeItem(LAST_PACK_META_KEY);
      window.localStorage.removeItem(ACTIVE_PACK_ID_KEY);
    } catch {
      // ignore
    }
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
      <h1 style={{ marginTop: 0, fontSize: 32 }}>Grower Bingo Generator</h1>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Pack title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 16,
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Sponsor name</label>
            <input
              value={sponsorName}
              onChange={(e) => setSponsorName(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 16,
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              Banner image URL (top banner)
            </label>
            <input
              value={bannerImageUrl}
              onChange={(e) => setBannerImageUrl(e.target.value)}
              placeholder="/banners/current.png"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 16,
              }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
              Weekly swap: replace <b>public/banners/current.png</b> in GitHub. Keep this value unchanged.
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              Sponsor logo URL (FREE center square)
            </label>
            <input
              value={sponsorLogoUrl}
              onChange={(e) => setSponsorLogoUrl(e.target.value)}
              placeholder="https://..."
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 16,
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Quantity (1 to 500)</label>
            <input
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              inputMode="numeric"
              style={{
                width: "100%",
                maxWidth: 220,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 16,
              }}
            />
          </div>

          <div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 700 }}>
                Square pool items (one per line, need 24+). Current: {poolCount}
              </div>

              <button
                onClick={loadDefaults}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #111827",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Load defaults
              </button>
            </div>

            <textarea
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              rows={12}
              style={{
                marginTop: 10,
                width: "100%",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                padding: 12,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 14,
              }}
            />

            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
              Caller pool sync key: <b>{SHARED_POOL_KEY}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
            <button
              onClick={generateAndDownloadPdf}
              disabled={isGenerating}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: isGenerating ? "#9ca3af" : "#111827",
                color: "white",
                cursor: isGenerating ? "not-allowed" : "pointer",
                minWidth: 240,
              }}
            >
              {isGenerating ? "Generating..." : "Generate + Download PDF"}
            </button>

            <button
              onClick={manualDownloadPdf}
              disabled={!pack?.pdfBase64}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: !pack?.pdfBase64 ? "#9ca3af" : "white",
                cursor: !pack?.pdfBase64 ? "not-allowed" : "pointer",
                minWidth: 180,
              }}
            >
              Download PDF
            </button>

            <button
              onClick={downloadCsv}
              disabled={!pack?.csv}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: !pack?.csv ? "#9ca3af" : "white",
                cursor: !pack?.csv ? "not-allowed" : "pointer",
                minWidth: 220,
              }}
            >
              Download CSV (Roster)
            </button>

            <button
              onClick={downloadCardsJson}
              disabled={!pack?.cardsPack?.packId}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: !pack?.cardsPack?.packId ? "#9ca3af" : "white",
                cursor: !pack?.cardsPack?.packId ? "not-allowed" : "pointer",
                minWidth: 220,
              }}
            >
              Download cards.json
            </button>

            <button
              onClick={openWinnersNewTab}
              disabled={!pack?.cardsPack?.packId}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: !pack?.cardsPack?.packId ? "#9ca3af" : "white",
                cursor: !pack?.cardsPack?.packId ? "not-allowed" : "pointer",
                minWidth: 220,
              }}
            >
              Open Winners (new tab)
            </button>

            <button
              onClick={openCallerNewTab}
              disabled={!pack?.cardsPack?.packId}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: !pack?.cardsPack?.packId ? "#9ca3af" : "white",
                cursor: !pack?.cardsPack?.packId ? "not-allowed" : "pointer",
                minWidth: 220,
              }}
            >
              Open Caller (new tab)
            </button>

            <button
              onClick={clearActivePack}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: "white",
                cursor: "pointer",
                minWidth: 200,
              }}
            >
              Clear active pack
            </button>
          </div>

          {error ? <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 600 }}>{error}</div> : null}
          {info ? <div style={{ marginTop: 10, color: "#111827" }}>{info}</div> : null}
        </div>
      </div>
    </div>
  );
}
