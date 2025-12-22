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

function cleanNumericString(v: unknown) {
  const s = String(v ?? "");
  return s.replace(/[^\d]/g, "");
}

function parseQty(v: unknown) {
  const cleaned = cleanNumericString(v);
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
  const [qty, setQty] = useState("25");
  const [items, setItems] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pack, setPack] = useState<GeneratedPack | null>(null);

  const [skins, setSkins] = useState<SponsorSkin[]>([]);
  const [selectedSkinId, setSelectedSkinId] = useState("");
  const [newSkinLabel, setNewSkinLabel] = useState("");

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
      if (f.qty !== undefined) setQty(cleanNumericString(f.qty) || "25");
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

  // ✅ FIX: clear stale errors when inputs change
  useEffect(() => {
    if (err) setErr(null);
  }, [qty, items, packTitle, sponsorName, bannerUrl, logoUrl]);

  const itemsList = useMemo(() => normalizeLines(items), [items]);
  const { cleaned: qtyCleaned, n: qtyNumParsed } = useMemo(() => parseQty(qty), [qty]);

  const currentRequestKey = useMemo(() => {
    return buildRequestKey({
      packTitle: packTitle.trim(),
      sponsorName: sponsorName.trim(),
      bannerUrl: bannerUrl.trim(),
      logoUrl: logoUrl.trim(),
      qty: qtyNumParsed,
      items: itemsList,
    });
  }, [packTitle, sponsorName, bannerUrl, logoUrl, qtyNumParsed, itemsList]);

  const packIsFresh = pack?.requestKey === currentRequestKey;

  function validateInputs() {
    if (!Number.isInteger(qtyNumParsed) || qtyNumParsed < 1 || qtyNumParsed > 500) {
      setErr("Quantity must be between 1 and 500.");
      return null;
    }

    if (itemsList.length < 24) {
      setErr(`Need at least 24 square items (you have ${itemsList.length}).`);
      return null;
    }

    return { qtyNum: qtyNumParsed, itemsArr: itemsList };
  }

  async function generatePack() {
    const validated = validateInputs();
    if (!validated) throw new Error("Invalid inputs.");

    const payload = {
      packTitle,
      sponsorName,
      bannerUrl: bannerUrl || null,
      logoUrl: logoUrl || null,
      qty: validated.qtyNum,
      items: validated.itemsArr,
    };

    const data = await safeJsonFetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const newPack: GeneratedPack = {
      packTitle,
      sponsorName,
      pdfBase64: data.pdfBase64,
      csv: data.csv,
      createdAt: Date.now(),
      requestKey: currentRequestKey,
    };

    setPack(newPack);
    return newPack;
  }

  function downloadPdf(p: GeneratedPack) {
    const bytes = Uint8Array.from(atob(p.pdfBase64), (c) => c.charCodeAt(0));
    downloadBlob(
      `${safeFileName(p.packTitle)}_${safeFileName(p.sponsorName)}.pdf`,
      new Blob([bytes], { type: "application/pdf" })
    );
  }

  function downloadCsv(p: GeneratedPack) {
    downloadBlob(
      `${safeFileName(p.packTitle)}_${safeFileName(p.sponsorName)}_roster.csv`,
      new Blob([p.csv], { type: "text/csv;charset=utf-8" })
    );
  }

  return (
    <main style={{ maxWidth: 740, margin: "0 auto", padding: 16 }}>
      <h1>Grower Bingo Generator</h1>

      <div style={{ fontSize: 12 }}>
        Debug qty: raw="{qty}" cleaned="{qtyCleaned}" parsed={qtyNumParsed}
      </div>

      <label>Quantity (1–500)</label>
      <input value={qty} onChange={(e) => setQty(e.target.value)} />

      <label>Square pool items (one per line — need 24+)</label>
      <textarea value={items} onChange={(e) => setItems(e.target.value)} />

      {err && <div style={{ color: "red" }}>{err}</div>}

      <button onClick={async () => downloadPdf(await generatePack())}>
        Generate + Download PDF
      </button>
      <button onClick={async () => downloadCsv(packIsFresh && pack ? pack : await generatePack())}>
        Download CSV (Roster)
      </button>
    </main>
  );
}
