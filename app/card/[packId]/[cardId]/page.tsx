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
    } catch {
      // ignore
    }
  }, [packId, cardId, marks]);

  const card = useMemo(() => {
    return pack?.cards.find((c) => c.id === cardId) ?? null;
  }, [pack, cardId]);

  function toggle(r: number, c: number, size: number) {
    if (isCenter(r, c, size)) return; // lock the FREE center
    const key = `${r},${c}`;
    setMarks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function clearMarks() {
    setMarks({});
  }

  if (!pack) {
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
              Pack not found on this device
            </div>
            <div>
              packId: <b>{packId}</b>
            </div>
            <div>
              cardId: <b>{cardId}</b>
            </div>
            <div style={{ marginTop: 10, color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
              This is Option 1 (localStorage). Generate the pack on this phone so it saves locally.
              Later we can add share links or server storage so links work for everyone.
            </div>

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
          </div>
        </div>
      </div>
    );
  }

  if (!card) {
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
              Card not found in this pack
            </div>
            <div>
              packId: <b>{packId}</b>
            </div>
            <div>
              cardId: <b>{cardId}</b>
            </div>

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
          </div>
        </div>
      </div>
    );
  }

  const size = card.grid.length;

  const headerTitle = pack.title?.trim() || "Grower Bingo";
  const headerSponsor = pack.sponsorName?.trim() || "";

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
            background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            padding: 16,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 950, marginBottom: 6 }}>
                {headerTitle}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                {headerSponsor ? `${headerSponsor} • ` : ""}
                Pack: <b>{packId}</b> • Card: <b>{cardId}</b>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                Tap squares to mark. Center is FREE and locked. Marks are saved on this phone.
              </div>
            </div>

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
          </div>

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
                const isMarked = center || !!marks[`${r},${c}`];

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => toggle(r, c, size)}
                    disabled={center}
                    style={{
                      position: "relative",
                      minHeight: 74,
                      padding: 10,
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: isMarked
                        ? "rgba(16, 185, 129, 0.14)"
                        : "rgba(255,255,255,0.04)",
                      cursor: center ? "default" : "pointer",
                      textAlign: "center",
                      lineHeight: 1.15,
                      fontWeight: 900,
                      boxShadow: isMarked ? "0 0 0 1px rgba(16,185,129,0.35) inset" : "none",
                      userSelect: "none",
                    }}
                  >
                    <div style={{ fontSize: 13 }}>{label}</div>

                    {center ? (
                      <div style={{ marginTop: 8, fontSize: 11, color: "rgba(167, 243, 208, 0.95)", fontWeight: 950 }}>
                        FREE
                      </div>
                    ) : null}

                    {isMarked && !center ? (
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: 16,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 34,
                          fontWeight: 1000,
                          color: "rgba(167, 243, 208, 0.85)",
                          textShadow: "0 6px 18px rgba(0,0,0,0.45)",
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
        </div>
      </div>
    </div>
  );
}
