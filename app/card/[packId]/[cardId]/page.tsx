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
  return safeJsonParse<CardsPack>(window.localStorage.getItem(packStorageKey(packId)));
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
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
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

export default function CardPage({
  params,
}: {
  params: { packId: string; cardId: string };
}) {
  const packId = String(params.packId || "").trim();
  const cardId = String(params.cardId || "").trim();

  const [pack, setPack] = useState<CardsPack | null>(null);
  const [card, setCard] = useState<BingoCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marks, setMarks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!packId || !cardId) return;
    setMarks(loadMarks(packId, cardId));
  }, [packId, cardId]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");

      const local = loadPackFromLocalStorage(packId);
      if (local && !cancelled) {
        setPack(local);
        setCard(local.cards.find((c) => c.id === cardId) || null);
      }

      const remote = await fetchPackFromApi(packId);
      if (cancelled || !remote) return;

      savePackToLocalStorage(packId, remote);
      setPack(remote);
      setCard(remote.cards.find((c) => c.id === cardId) || null);
      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [packId, cardId]);

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (error || !pack || !card) return <div style={{ padding: 16 }}>Error loading card.</div>;

  const title = pack.title || "Harvest Heroes Bingo";
  const sponsorName = pack.sponsorName || "Joe’s Grows";
  const bannerUrl = pack.bannerImageUrl || "/banners/current.png";
  const bgUrl = "/banners/bud-light.png";

  const size = card.grid.length;
  const center = Math.floor(size / 2);

  const grid = useMemo(() => card.grid, [card]);

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
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <div
          style={{
            background: "#fff",
            padding: 2,              // 👈 barely outside the banner
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
              maxWidth: "100%",
              objectFit: "contain",
              borderRadius: 10,
            }}
          />
        </div>
      </div>

      {/* Title */}
      <h1 style={{ color: "#fff", marginBottom: 4 }}>{title}</h1>
      <div style={{ color: "#fff" }}>Sponsor: {sponsorName}</div>
      <div style={{ color: "#fff", marginBottom: 8 }}>
        Card ID: <b>{card.id}</b>
      </div>

      <button
        onClick={clearMarks}
        style={{
          marginBottom: 12,
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.4)",
          background: "rgba(0,0,0,0.45)",
          color: "#fff",
          fontWeight: 700,
        }}
      >
        Clear marks
      </button>

      {/* Bingo Grid */}
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
          row.map((label, c) => {
            const marked = isMarked(r, c);
            const isCenter = r === center && c === center;

            return (
              <button
                key={`${r}-${c}`}
                onClick={() => toggleMark(r, c)}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: 16,
                  border: marked ? "2px solid #10b981" : "1px solid rgba(255,255,255,0.25)",
                  background: marked ? "#065f46" : "rgba(0,0,0,0.72)",
                  color: "#fff",
                  fontWeight: 700,
                  padding: 8,
                  lineHeight: 1.15,
                }}
              >
                {label}
                {isCenter && <div style={{ fontSize: 12, marginTop: 6 }}>FREE</div>}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
