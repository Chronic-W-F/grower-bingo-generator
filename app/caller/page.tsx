"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_POOL_TEXT } from "@/lib/defaultItems";

const SHARED_POOL_KEY = "grower-bingo:pool:v1";
const CALLER_STATE_KEY = "grower-bingo:caller:v1";

type CallerState = {
  poolText: string;
  deckSize: number;
  drawSize: number;
  round: number;
  deck: string[];
  called: string[];
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

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

const styles = {
  page: { padding: 16, maxWidth: 920, margin: "0 auto" } as React.CSSProperties,
  card: {
    border: "1px solid #ddd",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    background: "#fff",
  } as React.CSSProperties,
  headerRow: { display: "flex", gap: 12, flexWrap: "wrap" } as React.CSSProperties,
  title: { margin: 0, fontSize: 22 } as React.CSSProperties,
  buttonRow: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 } as React.CSSProperties,
  primaryBtn: {
    padding: "10px 14px",
    border: "1px solid #000",
    borderRadius: 12,
    background: "#000",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  } as React.CSSProperties,
  outlineBtn: {
    padding: "10px 14px",
    border: "1px solid #000",
    borderRadius: 12,
    background: "transparent",
    color: "#000",
    fontWeight: 700,
    cursor: "pointer",
  } as React.CSSProperties,
  smallBtn: {
    padding: "8px 12px",
    border: "1px solid #000",
    borderRadius: 10,
    background: "transparent",
    color: "#000",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  label: { display: "block", fontWeight: 700, marginBottom: 6 } as React.CSSProperties,
  input: {
    width: 240,
    padding: 10,
    borderRadius: 10,
    border: "1px solid #ccc",
    fontSize: 16,
  } as React.CSSProperties,
  textarea: { width: "100%", marginTop: 8, fontFamily: "monospace", padding: 10 } as React.CSSProperties,
  stats: { fontWeight: 800, lineHeight: 1.7 } as React.CSSProperties,
  hint: { fontSize: 12, color: "#555", marginTop: 6 } as React.CSSProperties,
  danger: { color: "#b00020", fontWeight: 800 } as React.CSSProperties,
};

export default function CallerPage() {
  const [poolText, setPoolText] = useState<string>("");

  const [deckSize, setDeckSize] = useState<number>(50);
  const [drawSize, setDrawSize] = useState<number>(10);

  // These are string inputs so mobile typing works normally
  const [deckSizeInput, setDeckSizeInput] = useState<string>("50");
  const [drawSizeInput, setDrawSizeInput] = useState<string>("10");

  const [round, setRound] = useState<number>(0);
  const [deck, setDeck] = useState<string[]>([]);
  const [called, setCalled] = useState<string[]>([]);

  const pool = useMemo(() => normalizeLines(poolText), [poolText]);
  const poolCount = pool.length;

  const remaining = Math.max(0, deck.length - called.length);

  // Load state
  useEffect(() => {
    const saved = safeParse<CallerState>(localStorage.getItem(CALLER_STATE_KEY));
    if (saved) {
      setPoolText(saved.poolText ?? "");
      setDeckSize(saved.deckSize ?? 50);
      setDrawSize(saved.drawSize ?? 10);
      setDeckSizeInput(String(saved.deckSize ?? 50));
      setDrawSizeInput(String(saved.drawSize ?? 10));
      setRound(saved.round ?? 0);
      setDeck(Array.isArray(saved.deck) ? saved.deck : []);
      setCalled(Array.isArray(saved.called) ? saved.called : []);
      return;
    }

    const shared = localStorage.getItem(SHARED_POOL_KEY);
    if (shared && shared.trim()) setPoolText(shared);
    else setPoolText(DEFAULT_POOL_TEXT);

    // default inputs
    setDeckSize(50);
    setDrawSize(10);
    setDeckSizeInput("50");
    setDrawSizeInput("10");
  }, []);

  // Persist state
  useEffect(() => {
    const state: CallerState = { poolText, deckSize, drawSize, round, deck, called };
    localStorage.setItem(CALLER_STATE_KEY, JSON.stringify(state));
  }, [poolText, deckSize, drawSize, round, deck, called]);

  // When poolCount changes, clamp the stored numbers (not the text inputs)
  useEffect(() => {
    if (poolCount <= 0) return;

    const clampedDeck = clamp(deckSize, 1, poolCount);
    if (clampedDeck !== deckSize) {
      setDeckSize(clampedDeck);
      setDeckSizeInput(String(clampedDeck));
    }

    const clampedDraw = clamp(drawSize, 1, clampedDeck);
    if (clampedDraw !== drawSize) {
      setDrawSize(clampedDraw);
      setDrawSizeInput(String(clampedDraw));
    }

    // If a game is already started, keep it consistent with pool edits
    if (deck.length > 0 && deck.length > poolCount) {
      const newDeck = deck.filter((x) => pool.includes(x)).slice(0, poolCount);
      const newCalled = called.filter((x) => newDeck.includes(x));
      setDeck(newDeck);
      setCalled(newCalled);
      setRound(Math.ceil(newCalled.length / Math.max(1, drawSize)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolCount]);

  function goBackToGenerator() {
    // Hard navigation so it always works even on mobile weirdness
    window.location.href = "/";
  }

  function loadDefaults() {
    setPoolText(DEFAULT_POOL_TEXT);
  }

  function reloadSharedPool() {
    const shared = localStorage.getItem(SHARED_POOL_KEY);
    if (shared && shared.trim()) setPoolText(shared);
  }

  function clearSavedCallerState() {
    localStorage.removeItem(CALLER_STATE_KEY);
    // reload page to reset clean
    window.location.reload();
  }

  function commitDeckSizeFromInput() {
    const n = Number(deckSizeInput);
    const max = Math.max(1, poolCount);
    const nextDeck = Number.isFinite(n) ? clamp(Math.floor(n), 1, max) : clamp(deckSize, 1, max);
    setDeckSize(nextDeck);
    setDeckSizeInput(String(nextDeck));

    const nextDraw = clamp(drawSize, 1, nextDeck);
    setDrawSize(nextDraw);
    setDrawSizeInput(String(nextDraw));
  }

  function commitDrawSizeFromInput() {
    const n = Number(drawSizeInput);
    const max = Math.max(1, Math.min(deckSize, Math.max(1, poolCount)));
    const nextDraw = Number.isFinite(n) ? clamp(Math.floor(n), 1, max) : clamp(drawSize, 1, max);
    setDrawSize(nextDraw);
    setDrawSizeInput(String(nextDraw));
  }

  function startGame() {
    if (poolCount === 0) return;

    // Commit any half-typed numbers before starting
    commitDeckSizeFromInput();
    commitDrawSizeFromInput();

    const finalDeckSize = clamp(Number(deckSizeInput), 1, poolCount);
    const newDeck = shuffle(pool).slice(0, finalDeckSize);

    setDeck(newDeck);
    setCalled([]);
    setRound(0);
  }

  function resetGame() {
    setDeck([]);
    setCalled([]);
    setRound(0);
  }

  function nextDraw() {
    if (deck.length === 0) return;
    const stillRemaining = deck.length - called.length;
    if (stillRemaining <= 0) return;

    // Commit any half-typed draw size
    commitDrawSizeFromInput();

    const n = clamp(Number(drawSizeInput), 1, deck.length);
    const toTake = Math.min(n, stillRemaining);

    const ok = window.confirm(`Draw the next ${toTake} item(s)?`);
    if (!ok) return;

    const next = deck.slice(called.length, called.length + toTake);
    const updatedCalled = [...called, ...next];
    setCalled(updatedCalled);
    setRound((r) => r + 1);
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <h1 style={styles.title}>Grower Bingo — Caller</h1>
        </div>

        <div style={styles.buttonRow}>
          <button onClick={goBackToGenerator} style={styles.primaryBtn}>
            ← Back to Generator
          </button>
          <button onClick={reloadSharedPool} style={styles.outlineBtn}>
            Reload shared pool
          </button>
          <button onClick={clearSavedCallerState} style={styles.outlineBtn}>
            Clear saved caller state
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>
            Topic Pool (one per line) — Current: {poolCount}
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={loadDefaults} style={styles.smallBtn}>
              Load defaults
            </button>
            <button onClick={reloadSharedPool} style={styles.smallBtn}>
              Reload shared pool
            </button>
          </div>
        </div>

        <textarea
          value={poolText}
          onChange={(e) => setPoolText(e.target.value)}
          rows={10}
          style={styles.textarea}
        />

        {poolCount === 0 ? (
          <div style={{ marginTop: 10, ...styles.danger }}>Pool is empty. Add at least 1 line.</div>
        ) : null}
      </div>

      <div style={styles.card}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <label style={styles.label}>Deck size</label>
            <input
              value={deckSizeInput}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) => setDeckSizeInput(e.target.value.replace(/[^\d]/g, ""))}
              onBlur={commitDeckSizeFromInput}
              style={styles.input}
            />
            <div style={styles.hint}>Must be ≤ pool count. (Clamps when you leave the field)</div>
          </div>

          <div>
            <label style={styles.label}>Draw size</label>
            <input
              value={drawSizeInput}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) => setDrawSizeInput(e.target.value.replace(/[^\d]/g, ""))}
              onBlur={commitDrawSizeFromInput}
              style={styles.input}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <button onClick={startGame} style={styles.smallBtn}>
            Start Game
          </button>
          <button onClick={resetGame} style={styles.smallBtn}>
            Reset
          </button>
          <button onClick={nextDraw} style={styles.smallBtn}>
            Next draw
          </button>
        </div>

        <div style={{ marginTop: 14, ...styles.stats }}>
          <div>Round: {round}</div>
          <div>
            Called: {called.length} / {deck.length}
          </div>
          <div>Remaining: {remaining}</div>
        </div>

        {called.length > 0 ? (
          <div style={{ marginTop: 14 }}>
            <h3 style={{ marginBottom: 8 }}>Called so far</h3>
            <ol>
              {called.map((x, i) => (
                <li key={`${x}-${i}`}>{x}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </div>
  );
}
