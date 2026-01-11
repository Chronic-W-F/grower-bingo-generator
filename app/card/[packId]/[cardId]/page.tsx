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

/**
 * Display-only shortening.
 * IMPORTANT: Do NOT change the underlying card.grid labels unless you also change
 * caller matching logic. This map only affects what players SEE.
 */
const DISPLAY_LABEL_MAP: Record<string, string> = {
  "Herm confirmed": "Herm confirm’d",
  "Carbon filter swap": "Carbon swap",
  "Potassium deficiency": "K def.",
  "Phosphorus deficiency": "P def.",
  "Magnesium deficiency": "Mg def.",
  "Calcium deficiency": "Ca def.",
  "Molybdenum deficiency": "Mo def.",
  "Copper deficiency": "Cu def.",
  "Sulfur deficiency": "S def.",
  "pH swing": "pH swing",
  "Res change day": "Res change",
  "Overfed tips": "Overfed tips",
  "Slime roots": "Slime roots",
  "Bud stacking": "Bud stack",
  "Bud rot": "Bud rot",
  "Bud was h": "Bud wash", // if you have weird truncated items in pool, fix them at the source later
  "Pistils orange": "Orange pistils",
  "Chlorosis spreading": "Chlorosis",
  "Stunted growth": "Stunted growth",
  "Air pump fail": "Air pump fail",
  "Flush debate": "Flush debate",
  "H2O2 debate": "H2O2 debate",
  "Pythium spreading": "Pythium",
  "Leaf taco": "Leaf taco",
  "Taco leaf": "Taco leaf",
  "Tent zip open": "Zip open",
  "Scope pics": "Scope pics",
  "Stretch week": "Stretch week",
  "Flower fade": "Fade",
  "Beneficials added": "Bennies",
  "Predator mites": "Pred mites",
  "Spinosa talk": "Spinosad",
  "Aircube flood cycle": "Aircube flood",
};

function displayLabel(raw: string) {
  const s = String(raw ?? "").trim();
  return DISPLAY_LABEL_MAP[s] ?? s;
}

// scale font based on display label length
function fontSizeFor(label: string) {
  const n = (label || "").trim().length;
  if (n <= 9) return 16;
  if (n <= 14) return 15;
  if (n <= 20) return 14;
  if (n <= 26) return 13;
  if (n <= 34) return 12;
  return 11;
}

export default function CardPage({
  params,
}: {
  params: { packId: string; cardId: string };
}) {
  const { packId, cardId } = params;

  const [pack, setPack] = useState<CardsPack | null>(null);
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      setIsAdmin(sp.get("admin") === "1");
    } catch {
      setIsAdmin(false);
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

  const title = pack?.title || "Harvest Heroes Bingo";
  const sponsorName = pack?.sponsorName || "Joe's Grows";

  function toggle(r: number, c: number) {
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
          maxWidth: 900,
          margin: "0 auto",
          padding: 16,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 10 }}>
          {title}
        </div>
        <div style={{ color: "#6b7280", fontSize: 16, marginBottom: 18 }}>
          Sponsor: {sponsorName}
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 14,
            border: "1px solid #e5e7eb",
            background: "white",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>
            This card is not available on this device.
          </div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            Open the digital card link on the same phone you will use during the
            game.
          </div>
        </div>
      </div>
    );
  }

  const size = card.grid.length;
  const center = Math.floor(size / 2);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        background:
          "radial-gradient(900px 520px at 50% -120px, rgba(34,197,94,0.22), transparent 60%), #070b0f",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div
          style={{
            borderRadius: 22,
            padding: 18,
            background: "rgba(10,15,22,0.78)",
            border: "1px solid rgba(34,197,94,0.30)",
            boxShadow:
              "0 18px 60px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.06) inset",
          }}
        >
          {/* Header */}
          <div style={{ display: "grid", gap: 8 }}>
            <div
              style={{
                fontSize: 34,
                fontWeight: 950,
                color: "white",
                letterSpacing: 0.2,
              }}
            >
              {title}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ color: "rgba(255,255,255,0.78)", fontSize: 16 }}>
                Sponsor: <b style={{ color: "white" }}>{sponsorName}</b>
              </div>

              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 16 }}>
                •
              </div>

              <div style={{ color: "rgba(255,255,255,0.78)", fontSize: 16 }}>
                Card ID: <b style={{ color: "white" }}>{cardId}</b>
              </div>
            </div>

            {/* Admin-only nav (hidden from contestants by default) */}
            {isAdmin ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a
                  href="/"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    textDecoration: "none",
                    color: "white",
                    fontWeight: 800,
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
                    background: "rgba(255,255,255,0.06)",
                    textDecoration: "none",
                    color: "white",
                    fontWeight: 800,
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
                    background: "rgba(255,255,255,0.06)",
                    textDecoration: "none",
                    color: "white",
                    fontWeight: 800,
                  }}
                >
                  Winners
                </a>
              </div>
            ) : null}

            {/* Only control contestants see */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 4,
              }}
            >
              <button
                onClick={clearMarks}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Clear marks
              </button>
            </div>
          </div>

          {/* Grid */}
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
                gap: 12,
              }}
            >
              {card.grid.map((row, r) =>
                row.map((rawLabel, c) => {
                  const isCenter = r === center && c === center;
                  const isMarked = !!marks[`${r},${c}`];

                  const shown = isCenter ? rawLabel : displayLabel(rawLabel);

                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => toggle(r, c)}
                      title={String(rawLabel ?? "").trim()} // long-press shows full text on most phones
                      style={{
                        position: "relative",
                        minHeight: 92,
                        padding: 10,
                        borderRadius: 18,
                        border: isCenter
                          ? "1px solid rgba(34,197,94,0.55)"
                          : "1px solid rgba(255,255,255,0.14)",
                        background: isCenter
                          ? "rgba(34,197,94,0.14)"
                          : "rgba(255,255,255,0.04)",
                        cursor: "pointer",
                        textAlign: "center",
                        color: "white",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: isCenter ? 14 : fontSizeFor(shown),
                          fontWeight: 950,
                          lineHeight: 1.05,
                          padding: "0 4px",
                          // The key changes to prevent ugly mid-word stacking:
                          wordBreak: "keep-all",
                          overflowWrap: "break-word", // only breaks if needed
                          whiteSpace: "normal",
                        }}
                      >
                        {shown}
                      </div>

                      {isCenter ? (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 8,
                            left: 0,
                            right: 0,
                            fontSize: 12,
                            fontWeight: 950,
                            color: "rgba(255,255,255,0.85)",
                          }}
                        >
                          FREE
                        </div>
                      ) : null}

                      {isMarked ? (
                        <>
                          <div
                            aria-hidden
                            style={{
                              position: "absolute",
                              inset: 0,
                              borderRadius: 18,
                              background: "rgba(34,197,94,0.22)",
                            }}
                          />
                          <div
                            aria-hidden
                            style={{
                              position: "absolute",
                              fontSize: 46,
                              fontWeight: 950,
                              color: "rgba(255,255,255,0.92)",
                              transform: "rotate(-10deg)",
                              textShadow: "0 10px 30px rgba(0,0,0,0.65)",
                            }}
                          >
                            ✓
                          </div>
                        </>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer like PDF */}
          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "space-between",
              color: "rgba(255,255,255,0.45)",
              fontSize: 12,
            }}
          >
            <div>Grower Bingo</div>
            <div>Center is FREE</div>
          </div>
        </div>
      </div>
    </div>
  );
}
