"use client";

import { useEffect, useMemo, useState } from "react";

type GeneratedPack = {
  pdfBase64: string;
  csv: string;
  createdAt: number;
  requestKey: string;
};

const FORM_KEY = "grower-bingo:form:v2";

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

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeFileName(s: string) {
  return (
    s
      .trim()
      .replace(/[^\w\-]+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 80) || "bingo_pack"
  );
}

function normalizeLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function cleanNumericString(v: unknown) {
  return String(v ?? "").replace(/[^\d]/g, "");
}

function parseQty(v: unknown) {
  const cleaned = cleanNumericString(v);
  const n = Number.parseInt(cleaned, 10);
  return { cleaned, n };
}

function buildRequestKey(payload: any) {
  return JSON.stringify(payload);
}

async function safeJsonFetch(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, init);
  const text = await res.text();

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || `Server returned empty response (HTTP ${res.status}).`);
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed (HTTP ${res.status}).`);
  }

  return data;
}

export default function HomePage() {
  const [packTitle, setPackTitle] = useState("Harvest Heroes Bingo");
  const [sponsorName, setSponsorName] = useState("Joe’s Grows");
  const [bannerUrl, setBannerUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // keep qty as string for mobile keyboards
  const [qty, setQty] = useState<string>("25");
  const [items, setItems] = useState<string>(DEFAULT_ITEMS);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pack, setPack] = useState<GeneratedPack | null>(null);

  // Load saved form (if any)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FORM_KEY);
      if (!raw) return;
      const f = JSON.parse(raw);

      if (typeof f.packTitle === "string") setPackTitle(f.packTitle);
      if (typeof f.sponsorName === "string") setSponsorName(f.sponsorName);
      if (typeof f.bannerUrl === "string") setBannerUrl(f.bannerUrl);
      if (typeof f.logoUrl === "string") setLogoUrl(f.logoUrl);

      if (f.qty !== undefined) {
        const { cleaned, n } = parseQty(f.qty);
        setQty(cleaned || (Number.isFinite(n) ? String(n) : "25"));
      }

      if (typeof f.items === "string") setItems(f.items);
    } catch {}
  }, []);

  // Save form
  useEffect(() => {
    try {
      localStorage.setItem(
        FORM_KEY,
        JSON.stringify({ packTitle, sponsorName, bannerUrl, logoUrl, qty, items })
      );
    } catch {}
  }, [packTitle, sponsorName, bannerUrl, logoUrl, qty, items]);

  // Clear error when user edits inputs (prevents “stuck” error)
  useEffect(() => {
    setErr(null);
  }, [packTitle, sponsorName, bannerUrl, logoUrl, qty, items]);

  const itemsList = useMemo(() => normalizeLines(items), [items]);
  const { cleaned: qtyCleaned, n: qtyNumParsed } = useMemo(() => parseQty(qty), [qty]);

  const currentRequestKey = useMemo(() => {
    const safeQty = Number.isFinite(qtyNumParsed) ? qtyNumParsed : 0;
    return buildRequestKey({
      packTitle: packTitle.trim(),
      sponsorName: sponsorName.trim(),
      bannerUrl: bannerUrl.trim(),
      logoUrl: logoUrl.trim(),
      qty: safeQty,
      items: itemsList,
    });
  }, [packTitle, sponsorName, bannerUrl, logoUrl, qtyNumParsed, itemsList]);

  const packIsFresh = pack?.requestKey === currentRequestKey;

  function clearSavedSettings() {
    try {
      localStorage.removeItem(FORM_KEY);
    } catch {}
    setPackTitle("Harvest Heroes Bingo");
    setSponsorName("Joe’s Grows");
    setBannerUrl("");
    setLogoUrl("");
    setQty("25");
    setItems(DEFAULT_ITEMS);
    setPack(null);
    setErr(null);
  }

  function validateInputs(): { qtyNum: number; itemsArr: string[] } | null {
    const qtyNum = qtyNumParsed;

    if (!Number.isFinite(qtyNum) || !Number.isInteger(qtyNum) || qtyNum < 1 || qtyNum > 500) {
      setErr("Quantity must be between 1 and 500.");
      return null;
    }

    const itemsArr = itemsList;
    if (itemsArr.length < 24) {
      setErr(`Need at least 24 square items (you have ${itemsArr.length}).`);
      return null;
    }

    return { qtyNum, itemsArr };
  }

  async function generatePack(): Promise<GeneratedPack> {
    const validated = validateInputs();
    if (!validated) throw new Error("Invalid inputs.");

    // IMPORTANT:
    // Backend expects body.items as a STRING (textarea text), not an array.
    // Sending array makes server think "Found 1".
    const payload = {
      packTitle: packTitle.trim(),
      sponsorName: sponsorName.trim(),
      bannerUrl: bannerUrl.trim() || null,
      logoUrl: logoUrl.trim() || null,
      qty: validated.qtyNum,
      items: items, // ✅ FIX: send raw textarea string
    };

    const requestKey = buildRequestKey({
      packTitle: payload.packTitle,
      sponsorName: payload.sponsorName,
      bannerUrl: payload.bannerUrl || "",
      logoUrl: payload.logoUrl || "",
      qty: payload.qty,
      items: itemsList, // fine to keep for "fresh pack" detection
    });

    const data = await safeJsonFetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const pdfBase64 = data?.pdfBase64;
    const csv = data?.csv;

    if (typeof pdfBase64 !== "string" || !pdfBase64) throw new Error("Server did not return pdfBase64.");
    if (typeof csv !== "string") throw new Error("Server did not return csv.");

    const newPack: GeneratedPack = {
      pdfBase64,
      csv,
      createdAt: Date.now(),
      requestKey,
    };

    setPack(newPack);
    return newPack;
  }

  function downloadPdfFromPack(p: GeneratedPack) {
    const bytes = Uint8Array.from(atob(p.pdfBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const filename = `${safeFileName(packTitle)}_${safeFileName(sponsorName)}.pdf`;
    downloadBlob(filename, blob);
  }

  function downloadCsvFromPack(p: GeneratedPack) {
    const blob = new Blob([p.csv], { type: "text/csv;charset=utf-8" });
    const filename = `${safeFileName(packTitle)}_${safeFileName(sponsorName)}_roster.csv`;
    downloadBlob(filename, blob);
  }

  async function onGenerateAndDownloadPdf() {
    setBusy(true);
    setErr(null);
    try {
      const p = await generatePack();
      downloadPdfFromPack(p);
    } catch (e: any) {
      setErr(e?.message || "Failed to generate.");
    } finally {
      setBusy(false);
    }
  }

  async function onDownloadCsvRoster() {
    setErr(null);

    if (pack && packIsFresh) {
      downloadCsvFromPack(pack);
      return;
    }

    setBusy(true);
    try {
      const p = await generatePack();
      downloadCsvFromPack(p);
    } catch (e: any) {
      setErr(e?.message || "Failed to generate.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 780,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 10 }}>
        Grower Bingo Generator
      </h1>

      <button
        onClick={clearSavedSettings}
        disabled={busy}
        style={{
          padding: "10px 14px",
          borderRadius: 999,
          border: "2px solid #b00020",
          background: "white",
          color: "#b00020",
          fontWeight: 700,
          cursor: busy ? "not-allowed" : "pointer",
          marginBottom: 12,
        }}
      >
        Clear saved settings
      </button>

      {/* Debug line */}
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
        Debug qty: raw="{String(qty)}" cleaned="{qtyCleaned}" parsed={String(qtyNumParsed)}
      </div>

      <section style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Pack title</span>
          <input
            value={packTitle}
            onChange={(e) => setPackTitle(e.target.value)}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Sponsor name</span>
          <input
            value={sponsorName}
            onChange={(e) => setSponsorName(e.target.value)}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Banner image URL (top banner)</span>
          <input
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder="https://…"
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Sponsor logo URL (FREE center square)</span>
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…"
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Quantity (1–500)</span>
          <input
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ccc", width: 180 }}
            placeholder="25"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>
            Square pool items (one per line — need 24+). Current: {itemsList.length}
          </span>
          <textarea
            value={items}
            onChange={(e) => setItems(e.target.value)}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ccc",
              minHeight: 240,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            }}
          />
        </label>

        {err ? (
          <div style={{ color: "#b00020", fontSize: 14 }}>
            <b>Error:</b> {err}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
          <button
            onClick={onGenerateAndDownloadPdf}
            disabled={busy}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #111",
              background: "#111",
              color: "white",
              cursor: busy ? "not-allowed" : "pointer",
              minWidth: 220,
            }}
          >
            {busy ? "Generating…" : "Generate + Download PDF"}
          </button>

          <button
            onClick={onDownloadCsvRoster}
            disabled={busy}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #111",
              background: "white",
              color: "#111",
              cursor: busy ? "not-allowed" : "pointer",
              minWidth: 200,
            }}
          >
            Download CSV (Roster)
          </button>
        </div>

        {pack ? (
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
            Last generated: <b>{packTitle}</b> — {new Date(pack.createdAt).toLocaleString()}
          </div>
        ) : null}
      </section>
    </main>
  );
}
