// app/winners/[packId]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

const CALLER_STATE_KEY = "grower-bingo:callerState:v1";

function packCallerKey(packId: string) {
  return `grower-bingo:callerState:${packId}`;
}

function packStorageKey(packId: string) {
  return `grower-bingo:pack:${packId}`;
}

const CENTER_LABEL = "Joe’s Grows";

type BingoCard = {
  id: string;
  grid: string[][];
};

type StoredPack = {
  packId: string;
  createdAt: number;
  title?: string;
  sponsorName?: string;
  cards: BingoCard[];
  weeklyPool?: string[];
  usedItems?: string[];
};

type CallerState = {
  packId: string;
  savedAt: number | null;
  pool: string[];
  remaining: string[];
  called: string[];
  lastBatch: string[];
};

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function norm(s: string) {
  return (s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[’‘]/g, "'")
    .toLowerCase();
}

function isCenter(label: string) {
  return norm(label) === norm(CENTER_LABEL);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function WinnersPage({ params }: { params: { packId: string } }) {
  const packId = decodeURIComponent(params.packId);

  const [pack, setPack] = useState<StoredPack | null>(null);
  const [caller, setCaller] = useState<CallerState | null>(null);
  const [callerWarning, setCallerWarning] = useState<string>("");

  const [uiError, setUiError] = useState<string>("");
  const [uiInfo, setUiInfo] = useState<string>("");
  const [downloadingCardId, setDownloadingCardId] = useState<string>("");

  useEffect(() => {
    const p = safeJsonParse<StoredPack>(
      window.localStorage.getItem(packStorageKey(packId))
    );
    setPack(p || null);

    // 1) try per-pack caller state
    const byPack = safeJsonParse<CallerState>(
      window.localStorage.getItem(packCallerKey(packId))
    );

    // 2) try global caller state
    const global = safeJsonParse<CallerState>(
      window.localStorage.getItem(CALLER_STATE_KEY)
    );

    // Prefer exact match
    if (byPack?.packId === packId) {
      setCaller(byPack);
      setCallerWarning("");
      return;
    }

    // Fallback: if global exists but packId differs, show warning instead of "not loaded"
    if (global) {
      setCaller(global);
      if (global.packId !== packId) {
        setCallerWarning(
          `Loaded global caller state for pack ${global.packId}, but you are viewing pack ${packId}. Go back to Caller and run one draw to resave under this pack.`
        );
      } else {
        setCallerWarning("");
      }
      return;
    }

    setCaller(null);
    setCallerWarning("");
  }, [packId]);

  const calledSet = useMemo(() => {
    const set = new Set<string>();
    for (const c of caller?.called || []) set.add(norm(c));
    return set;
  }, [caller]);

  const completion = useMemo(() => {
    const cards = pack?.cards || [];
    const called = caller?.called || [];

    return cards.map((card) => {
      const needed = new Set<string>();
      let totalNeeded = 0;

      for (const row of card.grid) {
        for (const cell of row) {
          if (!cell) continue;
          if (isCenter(cell)) continue;
          totalNeeded += 1;
          needed.add(norm(cell));
        }
      }

      let matched = 0;
      for (const key of needed) {
        if (calledSet.has(key)) matched += 1;
      }

      let completeAt: number | null = null;
      if (matched === totalNeeded && totalNeeded > 0) {
        const running = new Set<string>();
        for (let i = 0; i < called.length; i++) {
          running.add(norm(called[i]));
          let ok = true;
          for (const key of needed) {
            if (!running.has(key)) {
              ok = false;
              break;
            }
          }
          if (ok) {
            completeAt = i + 1;
            break;
          }
        }
      }

      return {
        cardId: card.id,
        matched,
        totalNeeded,
        isComplete: matched === totalNeeded && totalNeeded > 0,
        completeAtCall: completeAt,
      };
    });
  }, [pack, caller, calledSet]);

  const summary = useMemo(() => {
    const total = pack?.cards?.length || 0;
    const complete = completion.filter((c) => c.isComplete).length;
    return { total, complete };
  }, [pack, completion]);

  const title = pack?.title || "Winners";
  const sponsorName = pack?.sponsorName || "";

  async function downloadSingleCardPdf(card: BingoCard) {
    setUiError("");
    setUiInfo("");
    setDownloadingCardId(card.id);

    try {
      // IMPORTANT: banner lives in /public/banners/current.png
      // We send the relative path; API should convert it to absolute.
      const bannerImageUrl = "/banners/current.png";

      const res = await fetch("/api/card-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pack?.title || "Harvest Heroes Bingo",
          sponsorName: pack?.sponsorName || "",
          bannerImageUrl,
          card,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`card-pdf failed (${res.status}): ${text.slice(0, 200)}`);
      }

      const blob = await res.blob();

      // sanity check: if API returned JSON/html error page, blob is often tiny
      if (blob.size < 800) {
        const t = await blob.text().catch(() => "");
        throw new Error(`card-pdf returned tiny blob (${blob.size}): ${t.slice(0, 200)}`);
      }

      downloadBlob(`bingo-card-${card.id}.pdf`, blob);
      setUiInfo(`Downloaded card ${card.id}.`);
    } catch (e: any) {
      setUiError(e?.message || "Single card download failed.");
    } finally {
      setDownloadingCardId("");
    }
  }

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 34 }}>Winners</h1>
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

      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
        PackId: <b>{packId}</b> | Caller state: <b>{caller ? "Loaded" : "Not loaded"}</b>
        {caller?.savedAt ? (
          <>
            {" "}
            | Saved: <b>{new Date(caller.savedAt).toLocaleString()}</b> | Called:{" "}
            <b>{caller.called.length}</b> | Remaining: <b>{caller.remaining.length}</b>
          </>
        ) : null}
      </div>

      {callerWarning ? (
        <div style={{ marginBottom: 14, color: "#b45309", fontWeight: 700 }}>
          {callerWarning}
        </div>
      ) : null}

      {uiError ? (
        <div style={{ marginBottom: 12, color: "#b91c1c", fontWeight: 700 }}>
          {uiError}
        </div>
      ) : null}
      {uiInfo ? (
        <div style={{ marginBottom: 12, color: "#111827" }}>
          {uiInfo}
        </div>
      ) : null}

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 900 }}>{title}</div>
        {sponsorName ? (
          <div style={{ color: "#6b7280", marginTop: 4 }}>Sponsor: {sponsorName}</div>
        ) : null}
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Completion summary</div>

        {!pack?.cards?.length ? (
          <div style={{ color: "#b91c1c", fontWeight: 700 }}>
            No pack loaded for this packId. Generate a pack first, then open Winners.
          </div>
        ) : !caller ? (
          <div style={{ color: "#b91c1c", fontWeight: 700 }}>
            No caller state loaded for this pack. Go to Caller, run one draw, and confirm “Saved for pack …”
          </div>
        ) : (
          <div>
            Cards complete: <b>{summary.complete}</b> / <b>{summary.total}</b>
          </div>
        )}
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Should-have-won timeline</div>

        {pack?.cards?.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Card ID</th>
                  <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Expected completion</th>
                  <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Single card PDF</th>
                </tr>
              </thead>
              <tbody>
                {completion.map((c) => {
                  const card = pack.cards.find((x) => x.id === c.cardId);
                  return (
                    <tr key={c.cardId}>
                      <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6", fontWeight: 700 }}>
                        {c.cardId}
                      </td>

                      <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>
                        {c.isComplete ? (
                          <span>Complete at call #{c.completeAtCall ?? "?"}</span>
                        ) : (
                          <span>
                            Not complete yet ({c.matched}/{c.totalNeeded})
                          </span>
                        )}
                      </td>

                      <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>
                        <button
                          disabled={!card || downloadingCardId === c.cardId}
                          onClick={() => card && downloadSingleCardPdf(card)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: "1px solid #111827",
                            background: !card ? "#9ca3af" : "white",
                            cursor: !card ? "not-allowed" : "pointer",
                            fontWeight: 700,
                          }}
                        >
                          {downloadingCardId === c.cardId ? "Downloading..." : "Download PDF"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
              Completion is computed from official calls only (blackout). Center is treated as FREE.
            </div>
          </div>
        ) : (
          <div style={{ color: "#6b7280" }}>No cards found for this pack.</div>
        )}
      </div>
    </div>
  );
}
