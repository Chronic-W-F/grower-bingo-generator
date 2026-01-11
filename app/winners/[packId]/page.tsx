// app/winners/[packId]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

const CALLER_STATE_KEY = "grower-bingo:callerState:v1";
const LAST_PACK_KEY = "grower-bingo:lastPackId:v1";
const LAST_GENERATED_PACK_KEY = "grower-bingo:lastGeneratedPack:v1";

function packCallerKey(packId: string) {
  return `grower-bingo:callerState:${packId}`;
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function formatSavedAt(ts: number | null) {
  if (!ts) return "Never";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "Saved";
  }
}

function resolveBestPackId(): string {
  const lp = window.localStorage.getItem(LAST_PACK_KEY) || "";

  // Prefer the last generated pack (fixes "stuck packId" after regenerating)
  const restored = safeJsonParse<any>(window.localStorage.getItem(LAST_GENERATED_PACK_KEY));
  const restoredPackId = restored?.cardsPack?.packId || restored?.requestKey || "";

  return restoredPackId || lp || "pack_unknown";
}

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

type CallerState = {
  packId: string;
  savedAt: number | null;
  pool: string[];
  remaining: string[];
  called: string[];
  lastBatch: string[];
};

function packStorageKey(packId: string) {
  return `grower-bingo:pack:${packId}`;
}

function loadPackFromLocalStorage(packId: string): CardsPack | null {
  try {
    const raw = window.localStorage.getItem(packStorageKey(packId));
    if (!raw) return null;
    return JSON.parse(raw) as CardsPack;
  } catch {
    return null;
  }
}

function savePackToLocalStorage(packId: string, pack: CardsPack) {
  try {
    window.localStorage.setItem(packStorageKey(packId), JSON.stringify(pack));
  } catch {
    // ignore
  }
}

async function fetchPackFromApi(packId: string): Promise<CardsPack | null> {
  try {
    const res = await fetch(`/api/packs/${encodeURIComponent(packId)}`, { cache: "no-store" });
    const data = await res.json();
    if (!data?.ok || !data?.pack) return null;
    return data.pack as CardsPack;
  } catch {
    return null;
  }
}

// Assignment tracking (local only)
type Assignment = {
  assignedTo: string;
  sent: boolean;
  note?: string;
  updatedAt: number;
};

function assignmentKey(packId: string, cardId: string) {
  return `grower-bingo:assign:${packId}:${cardId}`;
}

function loadAssignment(packId: string, cardId: string): Assignment {
  try {
    const raw = window.localStorage.getItem(assignmentKey(packId, cardId));
    if (!raw) return { assignedTo: "", sent: false, note: "", updatedAt: 0 };
    const parsed = JSON.parse(raw) as Partial<Assignment>;
    return {
      assignedTo: String(parsed.assignedTo ?? ""),
      sent: !!parsed.sent,
      note: String(parsed.note ?? ""),
      updatedAt: Number(parsed.updatedAt ?? 0),
    };
  } catch {
    return { assignedTo: "", sent: false, note: "", updatedAt: 0 };
  }
}

function saveAssignment(packId: string, cardId: string, a: Assignment) {
  try {
    window.localStorage.setItem(assignmentKey(packId, cardId), JSON.stringify(a));
  } catch {
    // ignore
  }
}

function buildCardUrl(origin: string, packId: string, cardId: string) {
  return `${origin}/card/${encodeURIComponent(packId)}/${encodeURIComponent(cardId)}`;
}

// This is only for the "Expected completion" display you already have.
// We will compute "x/24 called matches on this card", ignoring center.
function computeCalledMatches(card: BingoCard, called: string[]) {
  const size = card.grid.length;
  const center = Math.floor(size / 2);
  const calledSet = new Set(called);
  let hits = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (r === center && c === center) continue; // center is FREE
      const label = card.grid[r]?.[c] ?? "";
      if (calledSet.has(label)) hits++;
    }
  }
  return hits; // out of 24 for 5x5
}

export default function WinnersPage({
  params,
}: {
  params: { packId: string };
}) {
  const [origin, setOrigin] = useState<string>("");
  const [packId, setPackId] = useState<string>("");
  const [pack, setPack] = useState<CardsPack | null>(null);

  const [callerState, setCallerState] = useState<CallerState | null>(null);

  // copy box state
  const [activeCopyCardId, setActiveCopyCardId] = useState<string>("");
  const [activeCopyUrl, setActiveCopyUrl] = useState<string>("");

  // assignment state map (in-memory) for fast UI
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});

  useEffect(() => {
    try {
      setOrigin(window.location.origin);
    } catch {
      setOrigin("");
    }
  }, []);

  // load pack + caller state
  useEffect(() => {
    const pId = String(params.packId || "").trim() || resolveBestPackId();
    setPackId(pId);

    const byPack = safeJsonParse<CallerState>(window.localStorage.getItem(packCallerKey(pId)));
    const global = safeJsonParse<CallerState>(window.localStorage.getItem(CALLER_STATE_KEY));

    const state =
      (byPack && byPack.packId === pId ? byPack : null) ||
      (global && global.packId === pId ? global : null) ||
      null;

    setCallerState(state);

    // Pack: try localStorage first, then API fallback
    const local = loadPackFromLocalStorage(pId);
    if (local) {
      setPack(local);
      // preload assignments
      const next: Record<string, Assignment> = {};
      for (const c of local.cards || []) next[c.id] = loadAssignment(pId, c.id);
      setAssignments(next);
      return;
    }

    (async () => {
      const remote = await fetchPackFromApi(pId);
      if (remote) {
        setPack(remote);
        savePackToLocalStorage(pId, remote);

        const next: Record<string, Assignment> = {};
        for (const c of remote.cards || []) next[c.id] = loadAssignment(pId, c.id);
        setAssignments(next);
      } else {
        setPack(null);
        setAssignments({});
      }
    })();
  }, [params.packId]);

  const title = pack?.title || "Harvest Heroes Bingo";
  const sponsorName = pack?.sponsorName || "Joe’s Grows";

  const called = callerState?.called || [];
  const remaining = callerState?.remaining || [];
  const savedAt = callerState?.savedAt ?? null;

  const rows = useMemo(() => {
    const cards = pack?.cards || [];
    return cards.map((card) => {
      const hits = computeCalledMatches(card, called);
      return { card, hits };
    });
  }, [pack, called]);

  const completedCount = useMemo(() => {
    // "complete" means hits == 24 (for 5x5)
    return rows.filter((r) => r.hits >= 24).length;
  }, [rows]);

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback: selectable textarea will still work
      return false;
    }
  }

  function handleShowAndCopyLink(cardId: string) {
    const o = origin || "https://grower-bingo-generator.vercel.app";
    const url = buildCardUrl(o, packId, cardId);

    setActiveCopyCardId(cardId);
    setActiveCopyUrl(url);

    copyText(url);
  }

  function updateAssignment(cardId: string, patch: Partial<Assignment>) {
    setAssignments((prev) => {
      const current = prev[cardId] || { assignedTo: "", sent: false, note: "", updatedAt: 0 };
      const next: Assignment = {
        assignedTo: typeof patch.assignedTo === "string" ? patch.assignedTo : current.assignedTo,
        sent: typeof patch.sent === "boolean" ? patch.sent : current.sent,
        note: typeof patch.note === "string" ? patch.note : current.note,
        updatedAt: Date.now(),
      };

      saveAssignment(packId, cardId, next);
      return { ...prev, [cardId]: next };
    });
  }

  return (
    <div
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 8 }}>Winners</h1>
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            PackId: <b>{packId}</b> | Caller state: <b>{callerState ? "Loaded" : "Not found"}</b> | Saved:{" "}
            <b>{formatSavedAt(savedAt)}</b> | Called: <b>{called.length}</b> | Remaining: <b>{remaining.length}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <a
            href="/caller"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: "white",
              textDecoration: "none",
              color: "#111827",
              display: "inline-block",
            }}
          >
            Back to Caller
          </a>
          <a
            href="/"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: "white",
              textDecoration: "none",
              color: "#111827",
              display: "inline-block",
            }}
          >
            Back to Generator
          </a>
        </div>
      </div>

      <div style={{ marginTop: 14, border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}>
        <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 18, color: "#6b7280" }}>Sponsor: {sponsorName}</div>
      </div>

      <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>Completion summary</div>
        <div style={{ fontSize: 18 }}>
          Cards complete: <b>{completedCount}</b> / <b>{rows.length}</b>
        </div>
      </div>

      {/* Copy box */}
      {activeCopyUrl ? (
        <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Digital card link (copy + send)</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
            Card: <b>{activeCopyCardId}</b>
          </div>
          <textarea
            value={activeCopyUrl}
            readOnly
            rows={2}
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              padding: 12,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 14,
            }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => copyText(activeCopyUrl)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #111827",
                background: "#111827",
                color: "white",
                cursor: "pointer",
              }}
            >
              Copy link
            </button>
            <button
              onClick={() => {
                setActiveCopyCardId("");
                setActiveCopyUrl("");
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #111827",
                background: "white",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>Should-have-won timeline</div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Card ID</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Expected completion</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Digital link</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Assignment</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Single card PDF</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(({ card, hits }) => {
                const a = assignments[card.id] || { assignedTo: "", sent: false, note: "", updatedAt: 0 };
                const doneText = hits >= 24 ? "Complete (24/24)" : `Not complete yet (${hits}/24)`;

                // NOTE: your existing PDF download logic lives elsewhere.
                // Keep your current handler/endpoint here — replace this placeholder if needed.
                const pdfDownloadHref = `/api/card-pdf?packId=${encodeURIComponent(packId)}&cardId=${encodeURIComponent(card.id)}`;

                return (
                  <tr key={card.id}>
                    <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6", fontWeight: 800 }}>
                      {card.id}
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>{doneText}</td>

                    <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>
                      <button
                        onClick={() => handleShowAndCopyLink(card.id)}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: "1px solid #111827",
                          background: "white",
                          cursor: "pointer",
                          minWidth: 170,
                        }}
                      >
                        Copy link
                      </button>
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <input
                          value={a.assignedTo}
                          onChange={(e) => updateAssignment(card.id, { assignedTo: e.target.value })}
                          placeholder="Assigned to (name)"
                          style={{
                            width: 220,
                            padding: 10,
                            borderRadius: 10,
                            border: "1px solid #d1d5db",
                            fontSize: 14,
                          }}
                        />

                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                          <input
                            type="checkbox"
                            checked={a.sent}
                            onChange={(e) => updateAssignment(card.id, { sent: e.target.checked })}
                          />
                          Sent
                        </label>
                      </div>
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>
                      {/* IMPORTANT:
                          Replace this <a href> with your existing working download handler if needed.
                          If your Winners page already uses a JS fetch -> blob download, keep that exact code instead.
                      */}
                      <a
                        href={pdfDownloadHref}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: "1px solid #111827",
                          background: "white",
                          textDecoration: "none",
                          color: "#111827",
                          display: "inline-block",
                        }}
                      >
                        Download PDF
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
          Completion is computed from official calls only (blackout). Center is treated as FREE.
        </div>
      </div>
    </div>
  );
}
