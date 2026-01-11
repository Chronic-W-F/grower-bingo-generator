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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function calcFontSize(label: string) {
  const len = (label || "").trim().length;
  // tuned for mobile: keep readable but prevent overflow
  if (len <= 10) return 15;
  if (len <= 16) return 13.5;
  if (len <= 22) return 12.5;
  if (len <= 30) return 11.5;
  return 10.5;
}

export default function CardPage({
  params,
}: {
  params: { packId: string; cardId: string };
}) {
  const { packId, cardId } = params;

  const [pack, setPack] = useState<CardsPack | null>(null);
  const [marks, setMarks] = useState<Record<string, boolean>>({});

  const isAdmin = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get("admin") === "1";
    } catch {
      return false;
    }
  }, []);

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
    } catch {
      // ignore
    }
  }, [packId, cardId, marks]);

  const card = useMemo(() => {
    return pack?.cards.find((c) => c.id === cardId) ?? null;
  }, [pack, cardId]);

  function toggle(r: number, c: number, size: number) {
    if (isCenter(r, c, size)) return; // FREE is locked
    const key = `${r},${c}`;
    setMarks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function clearMarks() {
    setMarks({});
  }

  if (!pack || !card) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0b0b10",
          color: "white",
          padding: 16,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h1 style={{ marginTop: 0, marginBottom: 10 }}>Digital Bingo Card</h1>

          <div
            style={{
              padding: 14,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 8 }}>
              {!pack ? "Pack not found on this device" : "Card not found in this pack"}
            </div>
            <div>
              packId: <b>{packId}</b>
            </div>
            <div>
              cardId: <b>{cardId}</b>
            </div>

            {isAdmin ? (
              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a
                  href="/"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "white",
                    textDecoration: "none",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  Back to Generator
                </a>
                <a
                  href="/caller"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "white",
                    textDecoration: "none",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  Caller
                </a>
              </div>
            ) : (
              <div style={{ marginTop: 10, color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
                If you’re the organizer, open this link with <b>?admin=1</b>.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const size = card.grid.length;

  const title = (pack.title?.trim() || "Grower Bingo").trim();
  const sponsor = (pack.sponsorName?.trim() || "").trim();

  // Responsive cell sizing: keep square-ish, but don’t get tiny
  const cellMinH = clamp(Math.floor(380 / size), 72, 98); // tuned for 5x5 on mobile

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b10",
        color: "white",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            padding: 16,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ minWidth: 260 }}>
              <div style={{ fontSize: 28, fontWeight: 950, marginBottom: 6 }}>
                {title}
              </div>

              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                {sponsor ? `${sponsor} • ` : ""}
                Card: <b>{cardId}</b>
              </div>

              <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                Tap squares to mark. Center is <b>FREE</b>.
              </div>
            </div>

            {/* Organizer-only controls */}
            {isAdmin ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <a
                  href="/"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "white",
                    textDecoration: "none",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  Generator
                </a>

                <a
                  href="/caller"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "white",
                    textDecoration: "none",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  Caller
                </a>

                <a
                  href={`/winners/${encodeURIComponent(packId)}`}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "white",
                    textDecoration: "none",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  Winners
                </a>

                <button
                  onClick={clearMarks}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: "rgba(255,255,255,0.10)",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
                >
                  Clear marks
                </button>
              </div>
            ) : null}
          </div>

          {/* Grid */}
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
              gap: 10,
            }}
          >
            {card.grid.map((row, r) =>
              row.map((label, c) => {
                const center = isCenter(r, c, size);
                const marked = center || !!marks[`${r},${c}`];
                const fontSize = calcFontSize(label);

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => toggle(r, c, size)}
                    disabled={center}
                    style={{
                      position: "relative",
                      minHeight: cellMinH,
                      padding: 10,
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: marked
                        ? "rgba(16, 185, 129, 0.14)"
                        : "rgba(255,255,255,0.04)",
                      cursor: center ? "default" : "pointer",
                      textAlign: "center",
                      lineHeight: 1.15,
                      fontWeight: 900,
                      boxShadow: marked
                        ? "0 0 0 1px rgba(16,185,129,0.35) inset"
                        : "none",
                      userSelect: "none",
                      overflow: "hidden",
                    }}
                  >
                    {/* label */}
                    <div
                      style={{
                        fontSize,
                        padding: "0 2px",
                        color: "rgba(255,255,255,0.92)",
                        textWrap: "balance" as any,
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {label}
                    </div>

                    {/* center FREE */}
                    {center ? (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          color: "rgba(167, 243, 208, 0.95)",
                          fontWeight: 950,
                        }}
                      >
                        FREE
                      </div>
                    ) : null}

                    {/* subtle mark overlay (doesn't kill readability) */}
                    {marked && !center ? (
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          right: 8,
                          bottom: 6,
                          fontSize: 26,
                          fontWeight: 1000,
                          color: "rgba(167, 243, 208, 0.60)",
                          textShadow: "0 4px 14px rgba(0,0,0,0.55)",
                          pointerEvents: "none",
                        }}
                      >
                        ✓
                      </div>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          {/* Footnote */}
          <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
            Tip: If you’re the organizer, add <b>?admin=1</b> to show navigation and tools.
          </div>
        </div>
      </div>
    </div>
  );
}
