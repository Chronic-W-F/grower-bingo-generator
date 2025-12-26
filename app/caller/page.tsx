// app/caller/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_POOL_TEXT } from "@/lib/defaultItems";

const SHARED_POOL_KEY = "grower-bingo:pool:v1";
const CALLER_STATE_KEY = "grower-bingo:caller:v1";
const CALLER_MIGRATION_KEY = "grower-bingo:caller:migrated:v1";

type CallerState = {
  poolText: string;
  deckSize: number;
  drawSize: number;
  round: number;
  deck: string[];
  called: string[];
};

function safeParse<T>(raw: string | null): T | null {
  try {
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
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

export default function CallerPage() {
  const router = useRouter();

  // Text area (pool)
  const [poolText, setPoolText] = useState<string>("");

  // Numeric UI values as both string + number (prevents weird "auto-clamp while typing")
  const [deckSize, setDeckSize] = useState<number>(50);
  const [drawSize, setDrawSize] = useState<number>(10);
  const [deckSizeInput, setDeckSizeInput] = useState<string>("50");
  const [drawSizeInput, setDrawSizeInput] = useState<string>("10");

  // Game state
  const [round, setRound] = useState<number>(0);
  const [deck, setDeck] = useState<string[]>([]);
  const [called, setCalled] = useState<string[]>([]);

  const pool = useMemo(() => normalizeLines(poolText), [poolText]);
  const poolCount = pool.length;

  // One-time migration to stop "stuck at 1/25" caused by bad saved localStorage state.
  // This clears ONLY if we haven't migrated yet OR saved state is obviously invalid.
  useEffect(() => {
    const migrated = localStorage.getItem(CALLER_MIGRATION_KEY) === "1";
    const saved = safeParse<CallerState>(localStorage.getItem(CALLER_STATE_KEY));

    const shared = localStorage.getItem(SHARED_POOL_KEY);
    const sharedText = shared && shared.trim() ? shared : DEFAULT_POOL_TEXT;

    const savedLooksBad =
      !saved ||
      typeof saved.deckSize !== "number" ||
      typeof saved.drawSize !== "number" ||
      saved.deckSize < 1 ||
      saved.drawSize < 1;

    if (!migrated || savedLooksBad) {
      // Reset to sane defaults
      setPoolText(sharedText);
      setDeckSize(50);
      setDrawSize(10);
      setDeckSizeInput("50");
      setDrawSizeInput("10");
      setRound(0);
      setDeck([]);
      setCalled([]);

      localStorage.removeItem(CALLER_STATE_KEY);
      localStorage.setItem(CALLER_MIGRATION_KEY, "1");
      return;
    }

    // Load saved state (good)
    setPoolText(saved.poolText || sharedText);

    const initialPool = normalizeLines(saved.poolText || sharedText);
    const maxDeck = Math.max(1, initialPool.length);

    const ds = clamp(saved.deckSize ?? 50, 1, maxDeck);
    const dr = clamp(saved.drawSize ?? 10, 1, ds);

    setDeckSize(ds);
    setDrawSize(dr);
    setDeckSizeInput(String(ds));
    setDrawSizeInput(String(dr));

    setRound(saved.round ?? 0);
    setDeck(Array.isArray(saved.deck) ? saved.deck : []);
    setCalled(Array.isArray(saved.called) ? saved.called : []);

    localStorage.setItem(CALLER_MIGRATION_KEY, "1");
  }, []);

  // Persist state (so pull-to-refresh doesn't lose the game)
  useEffect(() => {
    // Don’t persist until we have a pool loaded
    if (!poolText.trim()) return;

    const state: CallerState = {
      poolText,
      deckSize,
      drawSize,
      round,
      deck,
      called,
    };
    try {
      localStorage.setItem(CALLER_STATE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [poolText, deckSize, drawSize, round, deck, called]);

  function goBackToGenerator() {
    // Robust: try router first, then hard navigation.
    try {
      router.push("/");
      router.refresh();
    } catch {
      // ignore
    }
    window.location.assign("/");
  }

  function loadDefaults() {
    setPoolText(DEFAULT_POOL_TEXT);
  }

  function reloadSharedPool() {
    const shared = localStorage.getItem(SHARED_POOL_KEY);
    if (shared && shared.trim()) setPoolText(shared);
  }

  function applyDeckSizeInput(next: string) {
    setDeckSizeInput(next);

    const n = Number(next);
    if (!Number.isFinite(n)) return;

    const maxDeck = Math.max(1, poolCount);
    const ds = clamp(Math.floor(n), 1, maxDeck);
    setDeckSize(ds);

    // Keep drawSize <= deckSize
    if (drawSize > ds) {
      setDrawSize(ds);
      setDrawSizeInput(String(ds));
    }
  }

  function applyDrawSizeInput(next: string) {
    setDrawSizeInput(next);

    const n = Number(next);
    if (!Number.isFinite(n)) return;

    const dr = clamp(Math.floor(n), 1, deckSize);
    setDrawSize(dr);
  }

  function startGame() {
    if (poolCount < 1) return;

    const ds = clamp(deckSize, 1, poolCount);
    const dr = clamp(drawSize, 1, ds);

    // Build a shuffled deck of ds items from pool
    const shuffled = shuffle(pool);
    const newDeck = shuffled.slice(0, ds);

    setDeckSize(ds);
    setDrawSize(dr);
    setDeckSizeInput(String(ds));
    setDrawSizeInput(String(dr));

    setDeck(newDeck);
    setCalled([]);
    setRound(0);
  }

  function resetGame() {
    const ok = window.confirm("Reset the current game? This clears called items.");
    if (!ok) return;

    setDeck([]);
    setCalled([]);
    setRound(0);
  }

  function nextDraw() {
    if (deck.length === 0) return;
    if (called.length >= deck.length) return;

    const ok = window.confirm("Draw the next set of items?");
    if (!ok) return;

    const remaining = deck.slice(called.length);
    const take = Math.min(drawSize, remaining.length);
    const next = remaining.slice(0, take);

    setCalled((prev) => [...prev, ...next]);
    setRound((r) => r + 1);
  }

  const remainingCount = Math.max(0, deck.length - called.length);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Grower Bingo — Caller</h1>
        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={goBackToGenerator} style={btnPrimary}>
            Back to Generator
          </button>
          <button onClick={reloadSharedPool} style={btn}>
            Reload shared pool
          </button>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "
