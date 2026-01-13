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

  // Your uploaded image
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
  if (error || !pack || !card) return <div style={{ padding: 16 }}>{error || "Error loading card."}</div>;

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
      {/* No big translucent panel anymore — just a centered content column */}
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        {/* Banner stays like a “white card” */}
        <div
          style={{
            borderRadius: 22,
            overflow: "hidden",
            background: "rgba(255,255,255,0.82)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow: "0 14px 44px rgba(0,0,0,0.22)",
            backdropFilter: "blur(3px)",
            padding: 12,
          }}
        >
          <img
            src={bannerUrl}
            alt="Weekly banner"
            style={{
              width: "100%",
              height: "clamp(110px, 22vw, 170px)",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        {/* Title area: use small “white plates” behind text instead of one big panel */}
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.78)",
              border: "1px solid rgba(255,255,255,0.55)",
              borderRadius: 18,
              padding: "12px 14px",
              backdropFilter: "blur(3px)",
              boxShadow: "0 10px 34px rgba(0,0,0,0.18)",
              flex: "1 1 280px",
              minWidth: 260,
            }}
          >
            <h1 style={{ margin: "0 0 6px 0", fontSize: 40, lineHeight: 1.05 }}>{title}</h1>
            <div style={{ fontSize: 18 }}>Sponsor: {sponsorName}</div>
            <div style={{ fontSize: 18 }}>
              Card ID: <b>{card.id}</b>
            </div>
          </div>

          <button
            onClick={clearMarks}
            style={{
              background: "rgba(255,255,255,0.84)",
              border: "1px solid rgba(255,255,255,0.55)",
              borderRadius: 16,
              padding: "12px 14px",
              fontWeight: 800,
              backdropFilter: "blur(3px)",
              boxShadow: "0 10px 34px rgba(0,0,0,0.18)",
              cursor: "pointer",
            }}
          >
            Clear marks
          </button>
        </div>

        {/* Grid — each cell has a white “frame” like the banner */}
        <div style={{ marginTop: 14 }}>
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

                // Outer white “frame” (barely bigger than the inner dark square)
                const frameStyle: React.CSSProperties = {
                  borderRadius: 22,
                  padding: 5,
                  background: "rgba(255,255,255,0.82)",
                  border: "1px solid rgba(255,255,255,0.55)",
                  boxShadow: "0 10px 32px rgba(0,0,0,0.18)",
                  backdropFilter: "blur(2px)",
                };

                // Inner square
                const innerStyle: React.CSSProperties = {
                  width: "100%",
                  aspectRatio: "1 / 1",
                  borderRadius: 18,
                  border: marked ? "2px solid #10b981" : "1px solid rgba(255,255,255,0.12)",
                  background: marked ? "#065f46" : "rgba(0,0,0,0.84)",
                  color: "white",
                  fontWeight: 800,
                  padding: 10,
                  lineHeight: 1.12,
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  wordBreak: "break-word",
                };

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => toggleMark(r, c)}
                    style={{
                      ...frameStyle,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <div style={innerStyle}>
                      {/* Optional micro “label plate” behind text:
                          If you want MORE background showing through the square itself, uncomment this and
                          set inner background slightly lower. Right now it’s not needed. */}
                      {/* <div style={{ background:"rgba(255,255,255,0.10)", padding:"6px 8px", borderRadius:12 }}> */}
                      {label}
                      {/* </div> */}

                      {isCenter && <div style={{ fontSize: 12, marginTop: 6, opacity: 0.95 }}>FREE</div>}
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
