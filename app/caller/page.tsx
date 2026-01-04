"use client";

import React, { useEffect, useMemo, useState } from "react";

type BingoCard = {
  id: string;
  grid: string[][];
};

type BingoPack = {
  packId: string;
  createdAt: number;
  title?: string;
  sponsorName?: string;
  cards: BingoCard[];
  weeklyPool: string[];
  usedItems: string[];
};

const CALLER_STATE_KEY = "grower-bingo:caller:v2";
const LAST_PACK_KEY = "grower-bingo:lastPackId:v1";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function safeParseInt(s: string, fallback: number) {
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

function packStorageKey(packId: string) {
  return `grower-bingo:pack:${packId}`;
}

function drawsStorageKey(packId: string) {
  return `grower-bingo:draws:${packId}`;
}

// Find the latest packId by scanning localStorage keys.
// This is safe because your packs are stored as grower-bingo:pack:<packId>
function findLatestPackId(): string | null {
  try {
    const keys = Object.keys(window.localStorage);
    const packKeys = keys.filter((k) => k.startsWith("grower-bingo:pack:"));
    if (!packKeys.length) return null;

    let bestId: string | null = null;
    let bestCreated = -1;

    for (const k of packKeys) {
      const raw = window.localStorage.getItem(k);
      if (!raw) continue;
      try {
        const p = JSON.parse(raw) as BingoPack;
        if (p?.packId && typeof p.createdAt === "number") {
          if (p.createdAt > bestCreated) {
            bestCreated = p.createdAt;
            bestId = p.packId;
          }
        }
      } catch {
        // ignore bad entries
      }
    }

    return bestId;
  } catch {
    return null;
  }
}

type CallerState = {
  // which pack we are calling for
  packId: string | null;

  // shown in UI but no longer required to edit
  poolText: string;

  // numeric settings
  deckSize: number;
  drawSize: number;

  // inputs
  deckSizeInput: string;
  drawSizeInput: string;

  // game state
  round: number;
  deck: string[];
  called: string[];
  draws: string[][]; // draw batches
};

export default function CallerPage() {
  const [status, setStatus] = useState<string>("Loading latest pack...");
  const [pack, setPack] = useState<BingoPack | null>(null);

  const [poolText, setPoolText] = useState<string>("");

  const poolLines = useMemo(() => normalizeLines(poolText), [poolText]);
  const poolCount = poolLines.length;

  const [deckSize, setDeckSize] = useState<number>(50);
  const [drawSize, setDrawSize] = useState<number>(10);

  const [deckSizeInput, setDeckSizeInput] = useState<string>("50");
  const [drawSizeInput, setDrawSizeInput] = useState<string>("10");

  const [round, setRound] = useState<number>(0);
  const [deck, setDeck] = useState<string[]>([]);
  const [called, setCalled] = useState<string[]>([]);
  const [draws, setDraws] = useState<string[][]>([]);

  // Load caller state + latest pack on mount
  useEffect(() => {
    // 1) restore caller state if present
    const rawState = window.localStorage.getItem(CALLER_STATE_KEY);
    if (rawState) {
      try {
        const s = JSON.parse(rawState) as CallerState;

        setPoolText(s.poolText ?? "");
        setDeckSize(Number.isFinite(s.deckSize) ? s.deckSize : 50);
        setDrawSize(Number.isFinite(s.drawSize) ? s.drawSize : 10);

        setDeckSizeInput((s.deckSizeInput ?? "").trim() || "50");
        setDrawSizeInput((s.drawSizeInput ?? "").trim() || "10");

        setRound(Number.isFinite(s.round) ? s.round : 0);
        setDeck(Array.isArray(s.deck) ? s.deck : []);
        setCalled(Array.isArray(s.called) ? s.called : []);
        setDraws(Array.isArray(s.draws) ? s.draws : []);

        // we still need to load pack for display and correct pool
      } catch {
        // ignore
      }
    }

    // 2) load latest pack (prefer lastPackId, else scan localStorage)
    const remembered = window.localStorage.getItem(LAST_PACK_KEY);
    const latestId = remembered || findLatestPackId();

    if (!latestId) {
      setStatus("No pack found on this device. Generate a pack first.");
      return;
    }

    const rawPack = window.localStorage.getItem(packStorageKey(latestId));
    if (!rawPack) {
      setStatus("Latest packId found, but pack data missing. Generate again.");
      return;
    }

    try {
      const p = JSON.parse(rawPack) as BingoPack;
      setPack(p);

      // Force poolText to the pack’s weeklyPool so you never have to type it.
      const nextPoolText = (p.weeklyPool || []).join("\n");
      setPoolText(nextPoolText);

      // If we don't already have a running deck, initialize defaults based on pool size
      const maxDeck = Math.max(1, p.weeklyPool.length || 1);
      const ds = clamp(safeParseInt(deckSizeInput, deckSize), 1, maxDeck);
      const dr = clamp(safeParseInt(drawSizeInput, drawSize), 1, ds);

      setDeckSize(ds);
      setDrawSize(dr);
      setDeckSizeInput(String(ds));
      setDrawSizeInput(String(dr));

      // If we have no deck yet, auto-start
      setDeck((prev) => {
        if (prev && prev.length) return prev;
        const shuffled = shuffle(p.weeklyPool || []);
        return shuffled.slice(0, ds);
      });

      setStatus("Loaded latest pack + weekly pool automatically.");
    } catch {
      setStatus("Failed to parse pack data. Generate a new pack.");
    }
  }, []);

  // Persist caller state
  useEffect(() => {
    const state: CallerState = {
      packId: pack?.packId ?? null,
      poolText,
      deckSize,
      drawSize,
      deckSizeInput,
      drawSizeInput,
      round,
      deck,
      called,
      draws,
    };
    try {
      window.localStorage.setItem(CALLER_STATE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [pack, poolText, deckSize, drawSize, deckSizeInput, drawSizeInput, round, deck, called, draws]);

  // Persist draws to the pack-specific key so Winners can read them
  useEffect(() => {
    if (!pack?.packId) return;
    try {
      const text = draws
        .map((batch, idx) => {
          const day = idx + 1;
          return `Day ${day}:\n${batch.join("\n")}`;
        })
        .join("\n\n");

      window.localStorage.setItem(drawsStorageKey(pack.packId), text);
    } catch {
      // ignore
    }
  }, [pack, draws]);

  // Clamp ONLY on blur
  function clampDeckOnBlur() {
    const maxDeck = Math.max(1, poolCount || 1);
    const wanted = safeParseInt(deckSizeInput, deckSize);
    const next = clamp(wanted, 1, maxDeck);
    setDeckSize(next);
    setDeckSizeInput(String(next));

    const wantedDraw = safeParseInt(drawSizeInput, drawSize);
    const nextDraw = clamp(wantedDraw, 1, next);
    setDrawSize(nextDraw);
    setDrawSizeInput(String(nextDraw));
  }

  function clampDrawOnBlur() {
    const wanted = safeParseInt(drawSizeInput, drawSize);
    const next = clamp(wanted, 1, Math.max(1, deckSize));
    setDrawSize(next);
    setDrawSizeInput(String(next));
  }

  function startGame() {
    const maxDeck = Math.max(1, poolCount || 1);
    const ds = clamp(safeParseInt(deckSizeInput, deckSize), 1, maxDeck);
    const dr = clamp(safeParseInt(drawSizeInput, drawSize), 1, ds);

    setDeckSize(ds);
    setDrawSize(dr);
    setDeckSizeInput(String(ds));
    setDrawSizeInput(String(dr));

    const shuffled = shuffle(poolLines);
    const newDeck = shuffled.slice(0, ds);

    setDeck(newDeck);
    setCalled([]);
    setDraws([]);
    setRound(0);
  }

  function resetGame() {
    setDeck([]);
    setCalled([]);
    setDraws([]);
    setRound(0);
  }

  function nextDraw() {
    if (!deck.length) return;

    const remaining = deck.filter((x) => !called.includes(x));
    if (!remaining.length) return;

    const wanted = safeParseInt(drawSizeInput, drawSize);
    const n = clamp(wanted, 1, remaining.length);

    const ok = window.confirm(`Draw next ${n} item(s)?`);
    if (!ok) return;

    const batch = remaining.slice(0, n);

    setCalled((prev) => [...prev, ...batch]);
    setDraws((prev) => [...prev, batch]);
    setRound((prev) => prev + 1);
  }

  const calledCount = called.length;
  const remainingCount = Math.max(0, deck.length - called.length);

  const canStart = poolCount > 0;
  const hasGame = deck.length > 0;

  const packId = pack?.packId ?? null;
  const winnersUrl = packId ? `/winners/${encodeURIComponent(packId)}` : "/winners";

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Grower Bingo — Caller</h1>
        <div style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>
          Status: {status}
        </div>

        <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
          Pack: <b>{packId ?? "None"}</b>
          {pack?.title ? (
            <>
              {" "}
              | Title: <b>{pack.title}</b>
            </>
          ) : null}
          {pack?.cards?.length ? (
            <>
              {" "}
              | Cards: <b>{pack.cards.length}</b>
            </>
          ) : null}
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a
            href={winnersUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: "#111827",
              color: "white",
              textDecoration: "none",
            }}
          >
            Open Winners
          </a>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Weekly Pool (auto-loaded) — Count: {poolCount}</h2>

        <textarea
          value={poolText}
          readOnly
          rows={8}
          style={{
            marginTop: 12,
            width: "100%",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            padding: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 14,
            background: "#f9fafb",
          }}
        />
        <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280" }}>
          This pool is taken from the generated pack’s <b>weeklyPool</b>. No manual typing needed.
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Deck size</label>
        <input
          value={deckSizeInput}
          onChange={(e) => setDeckSizeInput(e.target.value)}
          onBlur={clampDeckOnBlur}
          inputMode="numeric"
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 16 }}
        />
        <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>Must be ≤ pool count. (Clamps on blur / Start Game.)</div>

        <div style={{ height: 12 }} />

        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Draw size</label>
        <input
          value={drawSizeInput}
          onChange={(e) => setDrawSizeInput(e.target.value)}
          onBlur={clampDrawOnBlur}
          inputMode="numeric"
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 16 }}
        />
        <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>Must be ≤ deck size. (Clamps on blur / Start Game.)</div>

        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={startGame}
            disabled={!canStart}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: canStart ? "#111827" : "#9ca3af",
              color: "white",
              cursor: canStart ? "pointer" : "not-allowed",
            }}
          >
            Start Game
          </button>

          <button
            onClick={resetGame}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #111827", background: "white" }}
          >
            Reset
          </button>

          <button
            onClick={nextDraw}
            disabled={!hasGame || remainingCount === 0}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: !hasGame || remainingCount === 0 ? "#9ca3af" : "white",
              cursor: !hasGame || remainingCount === 0 ? "not-allowed" : "pointer",
            }}
          >
            Next draw
          </button>
        </div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Round</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{round}</div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Called</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{calledCount} / {deck.length || 0}</div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Remaining</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{remainingCount}</div>
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Draw history</h2>

        {!draws.length ? (
          <div style={{ marginTop: 10, color: "#6b7280" }}>No draws yet. Start a game, then press Next draw.</div>
        ) : (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            {draws.map((batch, idx) => (
              <div key={idx} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Day {idx + 1}</div>
                <div style={{ lineHeight: 1.6 }}>
                  {batch.map((item) => (
                    <div key={item}>{item}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
        This page persists state, so pull-to-refresh restores the current game.
      </div>
    </div>
  );
}
