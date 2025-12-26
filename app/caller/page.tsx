"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const SHARED_POOL_KEY = "grower-bingo:pool:v1";
const CALLER_STATE_KEY = "grower-bingo:caller:v1";

type CallerState = {
  poolText: string;
  deckSize: number;
  drawSize: number;
  round: number;
  deck: string[];
  called: string[];
  draws: string[][]; // history of each draw (round)
};

function normalizeLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

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

function safeParseInt(s: string, fallback: number) {
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

export default function CallerPage() {
  const router = useRouter();

  const [poolText, setPoolText] = useState<string>("");
  const poolLines = useMemo(() => normalizeLines(poolText), [poolText]);
  const poolCount = poolLines.length;

  // Numeric state (source of truth)
  const [deckSize, setDeckSize] = useState<number>(50);
  const [drawSize, setDrawSize] = useState<number>(10);

  // Input strings (so typing "1" doesn't instantly jump to 25, etc.)
  const [deckSizeInput, setDeckSizeInput] = useState<string>("50");
  const [drawSizeInput, setDrawSizeInput] = useState<string>("10");

  const [round, setRound] = useState<number>(0);
  const [deck, setDeck] = useState<string[]>([]);
  const [called, setCalled] = useState<string[]>([]);
  const [draws, setDraws] = useState<string[][]>([]);

  // -------- Load on mount (defaults: shared pool, then saved caller state) --------
  useEffect(() => {
    // 1) Start from shared pool if present
    const shared = typeof window !== "undefined" ? window.localStorage.getItem(SHARED_POOL_KEY) : null;
    const sharedText = shared ?? "";

    // 2) If we have saved caller state, restore it
    const rawState = typeof window !== "undefined" ? window.localStorage.getItem(CALLER_STATE_KEY) : null;
    if (rawState) {
      try {
        const s = JSON.parse(rawState) as CallerState;

        // restore pool first (if empty, fall back to shared)
        const restoredPoolText = (s.poolText ?? "").trim() || sharedText;
        setPoolText(restoredPoolText);

        // restore sizes + inputs
        const restoredDeckSize = Number.isFinite(s.deckSize) ? s.deckSize : 50;
        const restoredDrawSize = Number.isFinite(s.drawSize) ? s.drawSize : 10;

        setDeckSize(restoredDeckSize);
        setDrawSize(restoredDrawSize);
        setDeckSizeInput(String(restoredDeckSize));
        setDrawSizeInput(String(restoredDrawSize));

        // restore game state
        setRound(Number.isFinite(s.round) ? s.round : 0);
        setDeck(Array.isArray(s.deck) ? s.deck : []);
        setCalled(Array.isArray(s.called) ? s.called : []);
        setDraws(Array.isArray(s.draws) ? s.draws : []);
        return;
      } catch {
        // If state is corrupted, ignore and fall through to shared defaults
      }
    }

    // No saved state: just load shared pool and keep default sizes
    setPoolText(sharedText);
  }, []);

  // -------- Persist to localStorage whenever state changes --------
  useEffect(() => {
    const state: CallerState = {
      poolText,
      deckSize,
      drawSize,
      round,
      deck,
      called,
      draws,
    };
    try {
      window.localStorage.setItem(CALLER_STATE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }, [poolText, deckSize, drawSize, round, deck, called, draws]);

  // -------- Helpers: apply clamp only on blur / start game --------
  function applyDeckSizeFromInput() {
    const wanted = safeParseInt(deckSizeInput, deckSize);
    const max = Math.max(1, poolCount || 1);
    const next = clamp(wanted, 1, max);
    setDeckSize(next);
    setDeckSizeInput(String(next));
  }

  function applyDrawSizeFromInput(nextDeckSizeOverride?: number) {
    const currentDeckSize = nextDeckSizeOverride ?? deckSize;
    const wanted = safeParseInt(drawSizeInput, drawSize);
    const max = Math.max(1, currentDeckSize);
    const next = clamp(wanted, 1, max);
    setDrawSize(next);
    setDrawSizeInput(String(next));
  }

  function reloadSharedPool() {
    const shared = window.localStorage.getItem(SHARED_POOL_KEY) ?? "";
    setPoolText(shared);
  }

  function startGame() {
    // clamp sizes right before starting
    const maxDeck = Math.max(1, poolCount || 1);
    const ds = clamp(safeParseInt(deckSizeInput, deckSize), 1, maxDeck);
    const dr = clamp(safeParseInt(drawSizeInput, drawSize), 1, ds);

    setDeckSize(ds);
    setDrawSize(dr);
    setDeckSizeInput(String(ds));
    setDrawSizeInput(String(dr));

    // Create deck from pool
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

    const n = clamp(drawSize, 1, remaining.length);
    const batch = remaining.slice(0, n);

    // confirm before doing it (prevents accidental extra call)
    const ok = window.confirm(`Draw next ${n} item(s)?`);
    if (!ok) return;

    setCalled((prev) => [...prev, ...batch]);
    setDraws((prev) => [...prev, batch]);
    setRound((prev) => prev + 1);
  }

  const calledCount = called.length;
  const remainingCount = Math.max(0, deck.length - called.length);

  const canStart = poolCount > 0;
  const hasGame = deck.length > 0;

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Grower Bingo — Caller</h1>

        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => router.push("/")}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "white" }}
          >
            ← Back to Generator
          </button>

          <button
            onClick={reloadSharedPool}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #111827", background: "white" }}
          >
            Reload shared pool
          </button>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            Topic Pool (one per line) — Current: {poolCount}
          </h2>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => setPoolText(window.localStorage.getItem(SHARED_POOL_KEY) ?? poolText)}
              style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "white" }}
            >
              Reload shared pool
            </button>
          </div>
        </div>

        <textarea
          value={poolText}
          onChange={(e) => setPoolText(e.target.value)}
          rows={10}
          style={{
            marginTop: 12,
            width: "100%",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            padding: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 14,
          }}
          placeholder="One item per line"
        />

        <div style={{ marginTop: 12, fontSize: 13, color: "#374151" }}>
          Note: This page reads the shared pool from localStorage key <b>{SHARED_POOL_KEY}</b>. When you generate a pack, the Generator syncs the caller pool automatically.
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Deck size</label>
        <input
          value={deckSizeInput}
          onChange={(e) => setDeckSizeInput(e.target.value)}
          onBlur={() => {
            applyDeckSizeFromInput();
            // drawSize can't exceed deckSize, clamp it too
            const nextDeck = clamp(safeParseInt(deckSizeInput, deckSize), 1, Math.max(1, poolCount || 1));
            applyDrawSizeFromInput(nextDeck);
          }}
          inputMode="numeric"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: "1px solid #d1d5db",
            fontSize: 16,
          }}
        />
        <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
          Must be ≤ pool count. (We clamp on blur / Start Game, not while you type.)
        </div>

        <div style={{ height: 12 }} />

        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Draw size</label>
        <input
          value={drawSizeInput}
          onChange={(e) => setDrawSizeInput(e.target.value)}
          onBlur={() => applyDrawSizeFromInput()}
          inputMode="numeric"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: "1px solid #d1d5db",
            fontSize: 16,
          }}
        />
        <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
          Must be ≤ deck size. (We clamp on blur / Start Game.)
        </div>

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
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {calledCount} / {deck.length || 0}
            </div>
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
          <div style={{ marginTop: 10, color: "#6b7280" }}>
            No draws yet. Start a game, then press Next draw.
          </div>
        ) : (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            {draws.map((batch, idx) => (
              <div key={idx} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Round {idx + 1}</div>
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
        This page persists state, so pull-to-refresh will restore the current game.
      </div>
    </div>
  );
}
