"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_POOL_TEXT } from "@/lib/defaultItems";
import { POOL_STORAGE_KEY, normalizePoolText, splitPool, countPoolItems } from "@/lib/pool";

type CallerState = {
  started: boolean;
  deck: string[];
  called: string[];
  round: number;
};

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function copyText(text: string) {
  return navigator.clipboard.writeText(text);
}

export default function CallerPage() {
  const defaultText = useMemo(() => DEFAULT_POOL_TEXT, []);

  const [poolText, setPoolText] = useState(defaultText);
  const [deckSize, setDeckSize] = useState("50");
  const [drawSize, setDrawSize] = useState("10");

  const [state, setState] = useState<CallerState>({
    started: false,
    deck: [],
    called: [],
    round: 0,
  });

  const [latest, setLatest] = useState<string[]>([]);
  const [error, setError] = useState("");

  // Load shared pool on mount
  useEffect(() => {
    try {
      const shared = localStorage.getItem(POOL_STORAGE_KEY);
      if (shared && shared.trim()) setPoolText(normalizePoolText(shared));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist shared pool whenever textarea changes
  useEffect(() => {
    try {
      localStorage.setItem(POOL_STORAGE_KEY, normalizePoolText(poolText));
    } catch {}
  }, [poolText]);

  const poolCount = useMemo(() => countPoolItems(poolText), [poolText]);

  const deckSizeNum = useMemo(() => {
    const n = Number(deckSize || "0");
    if (!Number.isFinite(n)) return 0;
    return Math.max(1, Math.floor(n));
  }, [deckSize]);

  const drawSizeNum = useMemo(() => {
    const n = Number(drawSize || "0");
    if (!Number.isFinite(n)) return 0;
    return Math.max(1, Math.floor(n));
  }, [drawSize]);

  const remaining = useMemo(() => {
    if (!state.started) return 0;
    return Math.max(0, state.deck.length);
  }, [state]);

  function loadDefaults() {
    setError("");
    setLatest([]);
    setPoolText(defaultText);
    try {
      localStorage.setItem(POOL_STORAGE_KEY, defaultText);
    } catch {}
  }

  function reloadSharedPool() {
    setError("");
    setLatest([]);
    try {
      const shared = localStorage.getItem(POOL_STORAGE_KEY);
      if (shared && shared.trim()) setPoolText(normalizePoolText(shared));
    } catch {}
  }

  function clearPool() {
    setError("");
    setLatest([]);
    setPoolText("");
    try {
      localStorage.setItem(POOL_STORAGE_KEY, "");
    } catch {}
  }

  function startGame() {
    setError("");
    setLatest([]);

    const pool = splitPool(poolText);
    if (pool.length < 2) {
      setError("Add at least 2 topics to start.");
      return;
    }
    if (deckSizeNum > pool.length) {
      setError(`Deck size (${deckSizeNum}) is larger than your pool (${pool.length}). Reduce deck size or add more topics.`);
      return;
    }

    const selected = shuffle(pool).slice(0, deckSizeNum);
    setState({
      started: true,
      deck: selected,
      called: [],
      round: 0,
    });
  }

  function resetGame() {
    setError("");
    setLatest([]);
    setState({
      started: false,
      deck: [],
      called: [],
      round: 0,
    });
  }

  function nextDraw() {
    setError("");

    if (!state.started) {
      setError("Press Start Game first.");
      return;
    }
    if (state.deck.length === 0) {
      alert("Deck exhausted — game over.");
      return;
    }

    const take = Math.min(drawSizeNum, state.deck.length);
    const drawn = state.deck.slice(0, take);
    const rest = state.deck.slice(take);

    const newRound = state.round + 1;
    setLatest(drawn);

    setState({
      started: true,
      deck: rest,
      called: [...state.called, ...drawn],
      round: newRound,
    });

    if (rest.length === 0) {
      // show final exhaustion alert after state updates
      setTimeout(() => alert("Deck exhausted — game over."), 50);
    }
  }

  async function copyLatest() {
    if (!latest.length) return;
    const text = latest.map((x, i) => `${i + 1}. ${x}`).join("\n");
    try {
      await copyText(text);
    } catch {
      // ignore
    }
  }

  const calledCount = state.started ? state.called.length : 0;

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-8">
      {/* HEADER */}
      <div className="mb-6 rounded-lg border p-4 space-y-3">
        <h1 className="text-3xl font-bold">Grower Bingo — Caller</h1>

        <div className="flex flex-wrap gap-2">
          <Link href="/" className="no-underline">
            <button className="rounded-lg border border-black bg-black px-4 py-2 font-bold text-white">
              ← Back to Generator
            </button>
          </Link>

          <button
            onClick={reloadSharedPool}
            className="rounded-lg border px-4 py-2 font-bold"
          >
            Reload shared pool
          </button>
        </div>

        <p className="text-sm opacity-80">
          Draw items in rounds (10 at a time, or whatever you choose). No repeats until the deck is exhausted.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm">
          {error}
        </div>
      ) : null}

      <div className="mb-4 rounded-lg border p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={loadDefaults} className="rounded-lg border px-3 py-2 font-semibold">
            Load defaults
          </button>
          <button onClick={clearPool} className="rounded-lg border px-3 py-2 font-semibold">
            Clear
          </button>
          <button onClick={reloadSharedPool} className="rounded-lg border px-3 py-2 font-semibold">
            Reload shared pool
          </button>
        </div>

        <
