// app/card/[packId]/[cardId]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ICON_MAP } from "@/lib/iconMap";

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
  sponsorLogoUrl?: string;
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

// ✅ Normalize label so ICON_MAP works even if pool text has extra spaces/newlines
function normalizeIconKey(label: string) {
  return (label || "").trim().replace(/\s+/g, " ");
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

      if (!packId || !cardId) {
        setError("Missing packId or cardId.");
        setLoading(false);
        return;
      }

      const local = loadPackFromLocalStorage(packId);
      if (local) {
        const found = local.cards.find((c) => c.id === cardId) || null;
        if (!cancelled) {
          setPack(local);
          setCard(found);
        }
      }

      const remote = await fetchPackFromApi(packId);
      if (cancelled) return;

      if (!remote) {
        setError("Could not load this pack.");
        setPack(null);
        setCard(null);
        setLoading(false);
        return;
      }

      savePackToLocalStorage(packId, remote);

      const found = remote.cards.find((c) => c.id === cardId) || null;
      if (!found) {
        setError("Card not found in this pack.");
        setPack(remote);
        setCard(null);
        setLoading(false);
        return;
      }

      setPack(remote);
      setCard(found);
      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [packId, cardId]);

  const title = pack?.title || "Harvest Heroes Bingo";
  const sponsorName = pack?.sponsorName || "Joe’s Grows";
  const bannerUrl = pack?.bannerImageUrl || "/banners/current.png";

  // Background image
  const bgUrl = "/banners/bud-light.png";

  const size = card?.grid?.length || 5;
  const center = Math.floor(size / 2);

  const grid = useMemo(() => {
    return card?.grid || Array.from({ length: 5 }, () => Array(5).fill(""));
  }, [card]);

  function toggleMark(r: number, c: number) {
    if (r === center && c === center) return;
    const k = cellKey(r, c);

    setMarks((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      saveMarks(packId, cardId, next);
      return next;
    });
  }

  function clearMarks() {
    setMarks({});
    saveMarks(packId, cardId, {});
  }

  function isMarked(r: number, c: number) {
    if (r === center && c === center) return true;
    return !!marks[cellKey(r, c)];
  }

  if (loading) return <div style={{ padding: 16 }}>Loading card…</div>;
  if (error || !pack || !card)
    return <div style={{ padding: 16 }}>{error || "Error loading card."}</div>;

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        padding: 12,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        {/* Banner */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
          <div
            style={{
              width: "min(680px, 94vw)",
              aspectRatio: "3.6 / 1",
              overflow: "hidden",
              borderRadius: 18,
              position: "relative",
              boxShadow: "0 12px 34px rgba(0,0,0,0.28)",
            }}
          >
            <img
              src={bannerUrl}
              alt="Weekly banner"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
              }}
            />
          </div>
        </div>

        {/* Title */}
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              color: "white",
              textShadow: "0 4px 14px rgba(0,0,0,0.85)",
            }}
          >
            <h1 style={{ margin: "0 0 6px 0", fontSize: 44, lineHeight: 1.05 }}>
              {title}
            </h1>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Sponsor: {sponsorName}</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              Card ID: <span style={{ fontWeight: 900 }}>{card.id}</span>
            </div>
          </div>

          <button
            onClick={clearMarks}
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.55)",
              background: "rgba(0,0,0,0.55)",
              color: "white",
              fontWeight: 800,
              textShadow: "0 2px 10px rgba(0,0,0,0.8)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              cursor: "pointer",
            }}
          >
            Clear marks
          </button>
        </div>

        {/* Grid */}
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
              gap: 10,
              width: "100%",
              maxWidth: 760,
              margin: "0 auto",
            }}
          >
            {grid.map((row, r) =>
              row.map((label, c) => {
                const marked = isMarked(r, c);
                const isCenter = r === center && c === center;

                // ✅ FIX: normalize before lookup
                const iconKey = normalizeIconKey(label);
                const iconSrc = ICON_MAP[iconKey];

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => toggleMark(r, c)}
                    style={{
                      aspectRatio: "1 / 1",
                      borderRadius: 18,
                      border: marked ? "2px solid #10b981" : "1px solid rgba(255,255,255,0.18)",
                      background: marked ? "#065f46" : "rgba(0,0,0,0.82)",
                      color: "white",
                      fontWeight: 850,
                      padding: 10,
                      lineHeight: 1.12,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      overflow: "hidden",
                      wordBreak: "break-word",
                      boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
                      cursor: "pointer",
                    }}
                  >
                    {/* ICON watermark layer */}
                    {iconSrc && !isCenter && (
                      <img
                        src={iconSrc}
                        alt=""
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          opacity: 0.28,
                          transform: "scale(1.03)",
                          pointerEvents: "none",
                        }}
                      />
                    )}

                    {/* readability overlay */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.65))",
                        pointerEvents: "none",
                      }}
                    />

                    {/* TEXT proof layer */}
                    <div
                      style={{
                        position: "relative",
                        zIndex: 1,
                        padding: "0 6px",
                        fontSize: 14,
                        textShadow: "0 2px 10px rgba(0,0,0,0.85)",
                      }}
                    >
                      {label}
                      {isCenter && (
                        <div style={{ fontSize: 12, marginTop: 6, opacity: 0.95 }}>
                          FREE
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
