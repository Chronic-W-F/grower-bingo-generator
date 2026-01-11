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
  cards: BingoCard[];
};

function packStorageKey(packId: string) {
  return `grower-bingo:pack:${packId}`;
}

function marksStorageKey(packId: string, cardId: string) {
  return `grower-bingo:marks:${packId}:${cardId}`;
}

function loadPack(packId: string): CardsPack | null {
  try {
    const raw = window.localStorage.getItem(packStorageKey(packId));
    if (!raw) return null;
    return JSON.parse(raw) as CardsPack;
  } catch {
    return null;
  }
}

function loadMarks(packId: string, cardId: string): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(marksStorageKey(packId, cardId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function isCenter(r: number, c: number, size: number) {
  const mid = Math.floor(size / 2);
  return r === mid && c === mid;
}

function calcFontSize(label: string) {
  const len = (label || "").trim().length;
  if (len <= 12) return 15;
  if (len <= 18) return 13.5;
  if (len <= 26) return 12.2;
  if (len <= 34) return 11.2;
  return 10.4;
}

export default function CardPage({
  params,
}: {
  params: { packId: string; cardId: string };
}) {
  const { packId, cardId } = params;

  const [pack, setPack] = useState<CardsPack | null>(null);
  const [marks, setMarks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const p = loadPack(packId);
    setPack(p);
    setMarks(loadMarks(packId, cardId));
  }, [packId, cardId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        marksStorageKey(packId, cardId),
        JSON.stringify(marks)
      );
    } catch {}
  }, [packId, cardId, marks]);

  const card = useMemo(() => {
    return pack?.cards.find((c) => c.id === cardId) ?? null;
  }, [pack, cardId]);

  function toggle(r: number, c: number, size: number) {
    if (isCenter(r, c, size)) return;
    const key = `${r},${c}`;
    setMarks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (!pack || !card) {
    return (
      <div style={{ padding: 20, fontFamily: "system-ui" }}>
        <h2>Harvest Heroes Bingo</h2>
        <p>This card is not available on this device.</p>
      </div>
    );
  }

  const size = card.grid.length;
  const sponsor = pack.sponsorName || "Joe’s Grows";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        padding: 14,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        {/* Header mirrors PDF */}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>{sponsor}</div>
          <div style={{ fontSize: 26, fontWeight: 950 }}>
            Harvest Heroes Bingo
          </div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            Card ID: <b>{cardId}</b>
          </div>
        </div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${size}, 1fr)`,
            gap: 10,
          }}
        >
          {card.grid.map((row, r) =>
            row.map((label, c) => {
              const center = isCenter(r, c, size);
              const marked = center || !!marks[`${r},${c}`];

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => toggle(r, c, size)}
                  disabled={center}
                  style={{
                    minHeight: 84,
                    padding: 10,
                    borderRadius: 14,
                    border: "2px solid #111827",
                    background: "#ffffff",
                    cursor: center ? "default" : "pointer",
                    fontWeight: 900,
                    fontSize: calcFontSize(label),
                    position: "relative",
                    userSelect: "none",
                  }}
                >
                  {label}
                  {center && (
                    <div style={{ fontSize: 12, marginTop: 6 }}>FREE</div>
                  )}
                  {marked && !center && (
                    <div
                      style={{
                        position: "absolute",
                        right: 8,
                        bottom: 6,
                        fontSize: 28,
                        color: "rgba(0,0,0,0.25)",
                      }}
                    >
                      ✓
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 10,
            fontSize: 12,
          }}
        >
          <div>Grower Bingo</div>
          <div>Center is FREE</div>
        </div>
      </div>
    </div>
  );
}
