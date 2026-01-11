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

function savePack(packId: string, pack: CardsPack) {
  try {
    window.localStorage.setItem(packStorageKey(packId), JSON.stringify(pack));
  } catch {
    // ignore
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

async function fetchPackFromServer(packId: string): Promise<CardsPack | null> {
  try {
    const res = await fetch(`/api/packs/${encodeURIComponent(packId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;

    const json = await res.json();
    if (!json?.ok || !json?.pack) return null;

    return json.pack as CardsPack;
  } catch {
    return null;
  }
}

export default function CardPage({
  params,
}: {
  params: { packId: string; cardId: string };
}) {
  const { packId, cardId } = params;

  const [pack, setPack] = useState<CardsPack | null>(null);
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Load pack: localStorage first, then server fallback (Firestore via /api/packs/[packId])
  useEffect(() => {
    let cancelled = false;

    async function go() {
      setLoading(true);

      // 1) local fast path
      const local = loadPack(packId);
      if (local) {
        if (cancelled) return;
        setPack(local);
        setMarks(loadMarks(packId, cardId));
        setLoading(false);
        return;
      }

      // 2) server fallback
      const remote = await fetchPackFromServer(packId);
      if (cancelled) return;

      if (remote) {
        savePack(packId, remote);
        setPack(remote);
        setMarks(loadMarks(packId, cardId));
        setLoading(false);
        return;
      }

      // not found anywhere
      setPack(null);
      setLoading(false);
    }

    go();
    return () => {
      cancelled = true;
    };
  }, [packId, cardId]);

  // Persist marks to this device
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

  function toggle(r: number, c: number) {
    // Center is locked FREE
    const size = card?.grid.length ?? 5;
    const center = Math.floor(size / 2);
    if (r === center && c === center) return;

    const key = `${r},${c}`;
    setMarks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function clearMarks() {
    setMarks({});
  }

  const title = pack?.title || "Harvest Heroes Bingo";
  const sponsor = pack?.sponsorName || "";

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: 16,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        }}
      >
        <h1 style={{ marginTop: 0 }}>{title}</h1>
        <div style={{ color: "#6b7280" }}>Loading card…</div>
      </div>
    );
  }

  if (!pack) {
    return (
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: 16,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        }}
      >
        <h1 style={{ marginTop: 0 }}>{title}</h1>
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            This card is not available on this device.
          </div>
          <div style={{ fontSize: 14 }}>
            packId: <b>{packId}</b>
          </div>
          <div style={{ fontSize: 14 }}>
            cardId: <b>{cardId}</b>
          </div>
          <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
            If you are a contestant, ask the organizer to regenerate the pack or
            resend your link. (Server storage is required for universal links.)
          </div>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: 16,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        }}
      >
        <h1 style={{ marginTop: 0 }}>{title}</h1>
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            Card not found in this pack.
          </div>
          <div style={{ fontSize: 14 }}>
            packId: <b>{packId}</b>
          </div>
          <div style={{ fontSize: 14 }}>
            cardId: <b>{cardId}</b>
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
        maxWidth: 900,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      {/* Minimal header like the PDF vibe */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 6 }}>
          {title}
        </div>

        {sponsor ? (
          <div style={{ fontSize: 16, color: "#374151" }}>
            Sponsor: <b>{sponsor}</b>
          </div>
        ) : null}

        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
          Card ID: <b>{cardId}</b>
        </div>

        <div style={{ marginTop: 10 }}>
          <button
            onClick={clearMarks}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #111827",
              background: "white",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Clear marks
          </button>
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gap: 10,
        }}
      >
        {card.grid.map((row, r) =>
          row.map((label, c) => {
            const isCenter = r === center && c === center;
            const isMarked = isCenter ? true : !!marks[`${r},${c}`];

            return (
              <button
                key={`${r}-${c}`}
                onClick={() => toggle(r, c)}
                style={{
                  position: "relative",
                  minHeight: 86,
                  padding: 10,
                  borderRadius: 14,
                  border: "1px solid #d1d5db",
                  background: isCenter ? "#0f2d24" : "white",
                  cursor: isCenter ? "default" : "pointer",
                  textAlign: "center",
                  lineHeight: 1.15,
                  fontWeight: 900,
                  overflow: "hidden",
                }}
              >
                {/* label */}
                <div
                  style={{
                    fontSize: 14,
                    color: isCenter ? "white" : "#111827",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                    hyphens: "auto",
                  }}
                >
                  {isCenter ? (
                    <>
                      <div style={{ opacity: 0.9 }}>{label}</div>
                      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
                        FREE
                      </div>
                    </>
                  ) : (
                    label
                  )}
                </div>

                {/* Mark overlay */}
                {isMarked ? (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 14,
                      background: isCenter
                        ? "rgba(0,0,0,0.10)"
                        : "rgba(0,0,0,0.18)",
                    }}
                  />
                ) : null}

                {/* Big check */}
                {isMarked ? (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 42,
                      fontWeight: 900,
                      color: isCenter ? "rgba(255,255,255,0.7)" : "rgba(17,24,39,0.6)",
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
  );
}
