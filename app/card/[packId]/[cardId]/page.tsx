"use client";

import React, { useEffect, useMemo, useState } from "react";

type BingoCard = {
  id: string;
  grid: string[][];
};

type CardsPack = {
  packId: string;
  createdAt: number;
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string;
  cards: BingoCard[];
};

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function packStorageKey(packId: string) {
  return `grower-bingo:pack:${packId}`;
}

function loadPackFromLocalStorage(packId: string): CardsPack | null {
  try {
    return safeJsonParse<CardsPack>(window.localStorage.getItem(packStorageKey(packId)));
  } catch {
    return null;
  }
}

function savePackToLocalStorage(packId: string, pack: CardsPack) {
  try {
    window.localStorage.setItem(packStorageKey(packId), JSON.stringify(pack));
  } catch {}
}

async function fetchPackFromApi(packId: string): Promise<CardsPack | null> {
  try {
    const res = await fetch(`/api/packs/${encodeURIComponent(packId)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (!data?.ok || !data?.pack) return null;
    return data.pack as CardsPack;
  } catch {
    return null;
  }
}

function marksKey(packId: string, cardId: string) {
  return `grower-bingo:marks:${packId}:${cardId}`;
}

function loadMarks(packId: string, cardId: string): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(marksKey(packId, cardId));
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveMarks(packId: string, cardId: string, marks: Record<string, boolean>) {
  try {
    window.localStorage.setItem(marksKey(packId, cardId), JSON.stringify(marks));
  } catch {}
}

function cellKey(r: number, c: number) {
  return `${r}_${c}`;
}

function makeEmptyGrid(n = 5) {
  return Array.from({ length: n }, () => Array.from({ length: n }, () => ""));
}

// Ensures we ALWAYS have a safe NxN string grid
function coerceGrid(input: unknown, n = 5): string[][] {
  if (!Array.isArray(input)) return makeEmptyGrid(n);

  const rows = input.slice(0, n).map((row) => {
    if (!Array.isArray(row)) return Array.from({ length: n }, () => "");
    return row.slice(0, n).map((cell) => (typeof cell === "string" ? cell : ""));
  });

  while (rows.length < n) rows.push(Array.from({ length: n }, () => ""));
  for (let i = 0; i < rows.length; i++) {
    while (rows[i].length < n) rows[i].push("");
  }

  return rows;
}

export default function CardPage({
  params,
}: {
  params: { packId: string; cardId: string };
}) {
  const packId = String(params?.packId || "").trim();
  const cardId = String(params?.cardId || "").trim();

  const [pack, setPack] = useState<CardsPack | null>(null);
  const [card, setCard] = useState<BingoCard | null>(null);
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!packId || !cardId) return;
    setMarks(loadMarks(packId, cardId));
  }, [packId, cardId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      if (!packId || !cardId) {
        setError("Missing packId or cardId.");
        setLoading(false);
        return;
      }

      // Try local first
      const local = loadPackFromLocalStorage(packId);
      if (local && Array.isArray(local.cards)) {
        const foundLocal = local.cards.find((c) => c?.id === cardId) || null;
        if (!cancelled) {
          setPack(local);
          setCard(foundLocal);
        }
      }

      // Then remote
      const remote = await fetchPackFromApi(packId);
      if (cancelled) return;

      if (!remote || !Array.isArray(remote.cards)) {
        setError("Could not load this pack.");
        setPack(null);
        setCard(null);
        setLoading(false);
        return;
      }

      savePackToLocalStorage(packId, remote);

      const foundRemote = remote.cards.find((c) => c?.id === cardId) || null;
      if (!foundRemote) {
        setPack(remote);
        setCard(null);
        setError("Card not found in this pack.");
        setLoading(false);
        return;
      }

      setPack(remote);
      setCard(foundRemote);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [packId, cardId]);

  if (loading) {
    return <div style={{ padding: 20 }}>Loading card…</div>;
  }

  if (error) {
    return <div style={{ padding: 20 }}>{error}</div>;
  }

  if (!pack || !card) {
    return <div style={{ padding: 20 }}>Error loading card.</div>;
  }

  const title = pack.title || "Harvest Heroes Bingo";
  const sponsorName = pack.sponsorName || "Joe’s Grows";
  const bannerUrl = pack.bannerImageUrl || "/banners/current.png";
  const bgUrl = "/banners/bud-light.png";

  // ✅ Always safe 5x5 grid (prevents crashes forever)
  const grid = useMemo(() => coerceGrid((card as any)?.grid, 5), [card]);
  const size = 5;
  const center = 2;

  function toggleMark(r: number, c: number) {
    if (r === center && c === center) return;
    const k = cellKey(r, c);
    setMarks((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      saveMarks(packId, cardId, next);
      return next;
    });
  }

  function isMarked(r: number, c: number) {
    if (r === center && c === center) return true;
    return !!marks[cellKey(r, c)];
  }

  function clearMarks() {
    setMarks({});
    saveMarks(packId, cardId, {});
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        padding: 14,
      }}
    >
      {/* Banner */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <div
          style={{
            background: "#fff",
            padding: 1, // ✅ smaller white box (barely outside)
            borderRadius: 12,
            boxShadow: "0 12px 34px rgba(0,0,0,0.28)",
          }}
        >
          <img
            src={bannerUrl}
            alt="Joe’s Grows"
            style={{
              display: "block",
              height: 120,
              borderRadius: 11,
            }}
          />
        </div>
      </div>

      <h1 style={{ color: "#fff", margin: "0 0 6px 0" }}>{title}</h1>
      <div style={{ color: "#fff" }}>Sponsor: {sponsorName}</div>
      <div style={{ color: "#fff", marginBottom: 10 }}>
        Card ID: <b>{card.id}</b>
      </div>

      <button
        onClick={clearMarks}
        style={{
          marginBottom: 14,
          padding: "8px 12px",
          borderRadius: 10,
          background: "rgba(0,0,0,0.45)",
          color: "#fff",
          fontWeight: 700,
          border: "1px solid rgba(255,255,255,0.35)",
        }}
      >
        Clear marks
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gap: 8,
          maxWidth: 680,
          margin: "0 auto",
        }}
      >
        {grid.map((row, r) =>
          row.map((label, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => toggleMark(r, c)}
              style={{
                aspectRatio: "1 / 1",
                borderRadius: 16,
                background: isMarked(r, c) ? "#065f46" : "rgba(0,0,0,0.72)",
                color: "#fff",
                fontWeight: 700,
                border: isMarked(r, c)
                  ? "2px solid #10b981"
                  : "1px solid rgba(255,255,255,0.25)",
              }}
            >
              {label}
              {r === center && c === center && (
                <div style={{ fontSize: 12, marginTop: 6 }}>FREE</div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
