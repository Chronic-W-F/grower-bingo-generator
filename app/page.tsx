"use client";

import { useEffect, useMemo, useState } from "react";

type GeneratedPack = {
  packTitle: string;
  sponsorName: string;
  pdfBase64: string;
  csv: string;
  createdAt: number;
  requestKey: string;
};

type SponsorSkin = {
  id: string;
  label: string;
  bannerUrl: string;
  logoUrl: string;
};

const SKINS_KEY = "grower-bingo:sponsor-skins:v1";
const FORM_KEY = "grower-bingo:form:v1";

type FormState = {
  packTitle: string;
  sponsorName: string;
  bannerUrl: string;
  logoUrl: string;
  qty: string;
  items: string;
  selectedSkinId: string;
  newSkinLabel: string;
};

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

function makeLocalId() {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

function normalizeLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// Keep ONLY digits (mobile sometimes inserts invisible chars, spaces, etc.)
function digitsOnly(v: unknown) {
  const s = String(v ?? "");
  return s.replace(/[^\d]/g, "");
}

function parseQty(v: unknown) {
  const cleaned = digitsOnly(v);
  const n = Number.parseInt(cleaned, 10);
  return { cleaned, n };
}

function buildRequestKey(payload: {
  packTitle: string;
  sponsorName: string;
  bannerUrl: string;
  logoUrl: string;
  qty: number;
  items: string[];
}) {
  return JSON.stringify(payload);
}

async function safeJsonFetch(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, init);
  const text = await res.text();

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || `Server returned an empty response (HTTP ${res.status}).`);
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

  // Store qty as string, but keep it digits-only
  const [qty, setQty] = useState<string>("25");

  const [items, setItems] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pack, setPack] = useState<GeneratedPack | null>(null);

  const [skins, setSkins] = useState<SponsorSkin[]>([]);
  const [selectedSkinId, setSelectedSkinId] = useState<string>("");
  const [newSkinLabel, setNewSkinLabel] = useState<string>("");

  // Load skins
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SKINS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setSkins(parsed);
    } catch {}
  }, []);

  // Persist skins
  useEffect(() => {
    try {
      localStorage.setItem(SKINS_KEY, JSON.stringify(skins));
    } catch {}
  }, [skins]);

  // Load form
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FORM_KEY);
      if (!raw) return;

      const f: any = JSON.parse(raw);

      if (typeof f.packTitle === "string") setPackTitle(f.packTitle);
      if (typeof f.sponsorName === "string") setSponsorName(f.sponsorName);
      if (typeof f.bannerUrl === "string") setBannerUrl(f.bannerUrl);
      if (typeof f.logoUrl === "string") setLogoUrl(f.logoUrl);

      // qty might be string OR number OR junk
      if (f.qty !== undefined) {
        const { cleaned, n } = parseQty(f.qty);
        // If it’s unusable, fall back to "25"
        if (Number.isFinite(n) && n > 0) setQty(String(n));
        else setQty(cleaned || "25");
      }

      if (typeof f.items === "string") setItems(f.items);
      if (typeof f.selectedSkinId === "string") setSelectedSkinId(f.selectedSkinId);
      if (typeof f.newSkinLabel === "string") setNewSkinLabel(f.newSkinLabel);
    } catch {}
  }, []);

  // Persist form
  useEffect(() => {
    try {
      const form: FormState = {
        packTitle,
        sponsorName,
        bannerUrl,
        logoUrl,
        qty,
        items,
        selectedSkinId,
        newSkinLabel,
      };
      localStorage.setItem(FORM_KEY, JSON.stringify(form));
    } catch {}
  }, [packTitle, sponsorName, bannerUrl, logoUrl, qty, items, selectedSkinId, newSkinLabel]);

  const itemsList = useMemo(() => normalizeLines(items), [items]);

  // For display/debug only
  const { cleaned: qtyCleaned, n: qtyParsed } = useMemo(() => parseQty(qty), [qty]);

  const currentRequestKey = useMemo(() => {
    const safeQty = Number.isFinite(qtyParsed) ? qtyParsed : 0;
    return buildRequestKey({
      packTitle: packTitle.trim(),
      sponsorName: sponsorName.trim(),
      bannerUrl: bannerUrl.trim(),
      logoUrl: logoUrl.trim(),
      qty: safeQty,
      items: itemsList,
    });
  }, [packTitle, sponsorName, bannerUrl, logoUrl, qtyParsed, itemsList]);

  const packIsFresh = pack?.requestKey === currentRequestKey;

  function applySkin(id: string) {
    setSelectedSkinId(id);
    const skin = skins.find((s) => s.id === id);
    if (!skin) return;
    setSponsorName(skin.label);
    setBannerUrl(skin.bannerUrl);
    setLogoUrl(skin.logoUrl);
  }

  function saveCurrentAsSkin() {
    setErr(null);
    const label = (newSkinLabel || sponsorName || "Sponsor").trim();
    if (!label) {
      setErr("Enter a sponsor name (or a Skin label) first.");
      return;
    }

    const skin: SponsorSkin = {
      id: makeLocalId(),
      label,
      bannerUrl: bannerUrl.trim(),
      logoUrl: logoUrl.trim(),
    };

    setSkins((prev) => [skin, ...prev]);
    setSelectedSkinId(skin.id);
    setNewSkinLabel("");
  }

  function deleteSelectedSkin() {
    setErr(null);
    if (!selectedSkinId) return;
    setSkins((prev) => prev.filter((s) => s.id !== selectedSkinId));
    setSelectedSkinId("");
  }

  function clearSavedSettings() {
    try {
      localStorage.removeItem(FORM_KEY);
      localStorage.removeItem(SKINS_KEY);
    } catch {}
    // Reset state
    setPackTitle("Harvest Heroes Bingo");
    setSponsorName("Joe’s Grows");
    setBannerUrl("");
    setLogoUrl("");
    setQty("25");
    setItems("");
    setSelectedSkinId("");
    setNewSkinLabel("");
    setSkins([]);
    setPack(null);
    setErr(null);
  }

  function validateInputs(): { qtyNum: number; itemsArr: string[] } | null {
    setErr(null);

    // IMPORTANT: re-parse qty RIGHT NOW (no stale memo / weird mobile timing)
    const { cleaned, n } = parseQty(qty);

    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 500) {
      setErr(`Quantity must be between 1 and 500. (raw="${String(qty)}" cleaned="${cleaned}" parsed="${String(n)}")`);
      return null;
    }

    const itemsArr = itemsList;
    if (itemsArr.length < 24) {
      setErr(`Need at least 24 square items (you have ${itemsArr.length}).`);
      return null;
    }

    return { qtyNum: n, itemsArr };
  }

  async function generatePack(): Promise<GeneratedPack> {
    const validated = validateInputs();
    if (!validated) throw new Error("Invalid inputs.");

    const payload = {
      packTitle: packTitle.trim(),
      sponsorName: sponsorName.trim(),
      bannerUrl: bannerUrl.trim() || null,
      logoUrl: logoUrl.trim() || null,
      qty: validated.qtyNum,
      items: validated.itemsArr,
    };

    const requestKey = buildRequestKey({
      packTitle: payload.packTitle,
      sponsorName: payload.sponsorName,
      bannerUrl: payload.bannerUrl || "",
      logoUrl: payload.logoUrl || "",
      qty: payload.qty,
      items: payload.items,
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
      packTitle: payload.packTitle,
      sponsorName: payload.sponsorName,
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
    const filename = `${safeFileName(p.packTitle)}_${safeFileName(p.sponsorName)}.pdf`;
    downloadBlob(filename, blob);
  }

  function downloadCsvFromPack(p: GeneratedPack) {
    const blob = new Blob([p.csv], { type: "text/csv;charset=utf-8" });
    const filename = `${safeFileName(p.packTitle)}_${safeFileName(p.sponsorName)}_roster.csv`;
    downloadBlob(filename, blob);
  }

  async function onGenerateAndDownloadPdf() {
    setErr(null);
    setBusy(true);
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
        maxWidth: 740,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Grower Bingo Generator</h1>

      {/* REAL DEBUG LINE */}
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
        Debug qty: raw=<b>{String(qty)}</b> cleaned=<b>{qtyCleaned}</b> parsed=<b>{String(qtyParsed)}</b>
      </div>

      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={selectedSkinId}
            onChange={(e) => applySkin(e.target.value)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc", minWidth: 220 }}
          >
            <option value="">Select a saved skin…</option>
            {skins.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <input
            value={newSkinLabel}
            onChange={(e) => setNewSkinLabel(e.target.value)}
            placeholder="Skin label (optional)"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc", minWidth: 200 }}
          />

          <button
            onClick={saveCurrentAsSkin}
            disabled={busy}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid #000",
              background: "#000",
              color: "#fff",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            Save current as skin
          </button>

          <button
            onClick={deleteSelectedSkin}
            disabled={busy || !selectedSkinId}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid #ccc",
              background: "#fff",
              cursor: busy || !selectedSkinId ? "not-allowed" : "pointer",
            }}
          >
            Delete selected skin
          </button>

          <button
            onClick={clearSavedSettings}
            disabled={busy}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid #cc0000",
              background: "#fff",
              color: "#cc0000",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            Clear saved settings
          </button>
        </div>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Pack title</span>
          <input value={packTitle} onChange={(e) => setPackTitle(e.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #ccc" }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Sponsor name</span>
          <input value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #ccc" }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Banner image URL (top banner)</span>
          <input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://…" style={{ padding: 12, borderRadius: 12, border: "1px solid #ccc" }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Sponsor logo URL (FREE center square)</span>
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" style={{ padding: 12, borderRadius: 12, border: "1px solid #ccc" }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Quantity (1–500)</span>
          <input
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(digitsOnly(e.target.value))}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ccc", width: 180 }}
            placeholder="25"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Square pool items (one per line — need 24+). Current: {itemsList.length}</span>
          <textarea
            value={items}
            onChange={(e) => setItems(e.target.value)}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ccc", minHeight: 220, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
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
            style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid #111", background: "#111", color: "white", cursor: busy ? "not-allowed" : "pointer" }}
          >
            {busy ? "Generating…" : "Generate + Download PDF"}
          </button>

          <button
            onClick={onDownloadCsvRoster}
            disabled={busy}
            style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid #111", background: "white", color: "#111", cursor: busy ? "not-allowed" : "pointer" }}
          >
            Download CSV (Roster)
          </button>
        </div>

        {pack ? (
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
            Last generated: <b>{pack.packTitle}</b> — {new Date(pack.createdAt).toLocaleString()}
          </div>
        ) : null}
      </section>
    </main>
  );
}
