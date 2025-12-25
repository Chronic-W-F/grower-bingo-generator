"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_TOPIC_POOL } from "@/lib/defaultItems";

type CallerState = {
  started: boolean;
  round: number;
  deck: string[];       // chosen deck for THIS game
  remaining: string[];  // what is left to call
  called: string[];     // everything called so far
  latestDraw: string[]; // latest draw results
};

const LS_KEY = "grower-bingo:caller:v1";

function poolToTextarea(pool: string[]) {
  return pool.join("\n");
}

function cleanLines(text: string) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeckFromPool(pool: string[], deckSize: number) {
  const unique = Array.from(new Set(pool.map((x) => x.trim()).filter(Boolean)));

  if (unique.length < 1) throw new Error("Paste at least one topic.");
  if (deckSize < 1) throw new Error("Deck size must be at least 1.");
  if (deckSize > unique.length) {
    throw new Error(
      `Deck size (${deckSize}) is larger than your pool (${unique.length}). Reduce deck size or add more topics.`
    );
  }

  const shuffled = shuffle(unique);
  return shuffled.slice(0, deckSize);
}

function createNewGame(poolText: string, deckSize: number): CallerState {
  const pool = cleanLines(poolText);
  const deck = buildDeckFromPool(pool, deckSize);
  return {
    started: true,
    round: 0,
    deck,
    remaining: shuffle(deck), // call order
    called: [],
    latestDraw: [],
  };
}

function nextDraw(state: CallerState, drawSize: number): CallerState {
  if (!state.started) throw new Error("Start the game first.");
  if (drawSize < 1) throw new Error("Draw size must be at least 1.");

  if (state.remaining.length === 0) {
    throw new Error("Deck exhausted — game over.");
  }

  const take = Math.min(drawSize, state.remaining.length);
  const latest = state.remaining.slice(0, take);
  const remaining = state.remaining.slice(take);
  const called = [...state.called, ...latest];

  return {
    ...state,
    round: state.round + 1,
    latestDraw: latest,
    remaining,
    called,
  };
}

export default function CallerPage() {
  const defaultText = useMemo(() => poolToTextarea(DEFAULT_TOPIC_POOL), []);

  const [poolText, setPoolText] = useState(defaultText);
  const [deckSize, setDeckSize] = useState("50");
  const [drawSize, setDrawSize] = useState("10");
  const [error, setError] = useState("");

  const [state, setState] = useState<CallerState>({
    started: false,
    round: 0,
    deck: [],
    remaining: [],
    called: [],
    latestDraw: [],
  });

  // Load saved state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);

      if (typeof saved.poolText === "string") setPoolText(saved.poolText);
      if (typeof saved.deckSize === "string") setDeckSize(saved.deckSize);
      if (typeof saved.drawSize === "string") setDrawSize(saved.drawSize);
      if (saved.state && typeof saved.state === "object") setState(saved.state);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ poolText, deckSize, drawSize, state })
      );
    } catch {
      // ignore
    }
  }, [poolText, deckSize, drawSize, state]);

  const poolCount = useMemo(() => cleanLines(poolText).length, [poolText]);

  const parsedDeckSize = Math.max(1, Math.floor(Number(deckSize || "0")));
  const parsedDrawSize = Math.max(1, Math.floor(Number(drawSize || "0")));

  function onLoadDefaults() {
    setError("");
    setPoolText(defaultText);
  }

  function onClear() {
    setError("");
    setPoolText("");
  }

  function onStart() {
    setError("");
    try {
      const newGame = createNewGame(poolText, parsedDeckSize);
      setState(newGame);
    } catch (e: any) {
      setError(e?.message || "Could not start game.");
    }
  }

  function onReset() {
    setError("");
    setState({
      started: false,
      round: 0,
      deck: [],
      remaining: [],
      called: [],
      latestDraw: [],
    });
  }

  function onNextDraw() {
    setError("");
    try {
      const updated = nextDraw(state, parsedDrawSize);
      setState(updated);
    } catch (e: any) {
      setError(e?.message || "Could not draw.");
    }
  }

  async function onCopyLatestDraw() {
    setError("");
    const lines = state.latestDraw.map((x, i) => `${i + 1}. ${x}`).join("\n");
    try {
      await navigator.clipboard.writeText(lines);
    } catch {
      const el = document.createElement("textarea");
      el.value = lines;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
  }

  return (
    <main style={{ padding: 20, maxWidth: 900, margin: "0 auto", fontFamily: "system-ui" }}>
      {/* NAV */}
      <div
        style={{
          marginBottom: 14,
          padding: 12,
          borderRadius: 10,
          border: "1px solid #ddd",
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18 }}>Grower Bingo — Caller</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <button style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff", fontWeight: 800 }}>
              ⬅ Back to Generator
            </button>
          </Link>
          <a href="/" target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <button style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #111", background: "#fff", color: "#111", fontWeight: 800 }}>
              Generator (new tab)
            </button>
          </a>
        </div>
      </div>

      {error ? (
        <div
          style={{
            margin: "12px 0",
            padding: 12,
            borderRadius: 8,
            background: "#ffe9e9",
            border: "1px solid #ffb3b3",
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 360px" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Topic Pool (one per line) — Current: {poolCount}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <button onClick={onLoadDefaults} style={{ padding: "8px 10px" }}>
              Load defaults
            </button>
            <button onClick={onClear} style={{ padding: "8px 10px" }}>
              Clear
            </button>
          </div>

          <textarea
            value={poolText}
            onChange={(e) => setPoolText(e.target.value)}
            rows={12}
            placeholder="Paste topics here..."
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
              fontFamily: "monospace",
              whiteSpace: "pre",
            }}
          />
        </div>

        <div style={{ flex: "1 1 320px" }}>
          <label style={{ display: "block", fontWeight: 700 }}>Deck size</label>
          <input
            value={deckSize}
            onChange={(e) => setDeckSize(e.target.value)}
            inputMode="numeric"
            style={{ width: 160, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
          <div style={{ margin: "6px 0 14px", opacity: 0.7 }}>
            How many items to pull from the pool for this game.
          </div>

          <label style={{ display: "block", fontWeight: 700 }}>Draw size</label>
          <input
            value={drawSize}
            onChange={(e) => setDrawSize(e.target.value)}
            inputMode="numeric"
            style={{ width: 160, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
          <div style={{ margin: "6px 0 14px", opacity: 0.7 }}>
            How many to call each time you press “Next draw”.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={onStart} style={{ padding: "10px 12px" }}>
              Start Game
            </button>
            <button onClick={onReset} style={{ padding: "10px 12px" }}>
              Reset
            </button>
            <button onClick={onNextDraw} style={{ padding: "10px 12px" }}>
              Next draw
            </button>
          </div>

          <div style={{ marginTop: 14, lineHeight: 1.6 }}>
            <div><b>Round:</b> {state.started ? state.round : 0}</div>
            <div><b>Called:</b> {state.called.length} / {state.deck.length || parsedDeckSize}</div>
            <div><b>Remaining:</b> {state.remaining.length}</div>
          </div>
        </div>
      </div>

      <hr style={{ margin: "18px 0" }} />

      <h2 style={{ fontSize: 30, margin: "0 0 10px" }}>
        Latest draw {state.started ? `(Round ${state.round})` : ""}
      </h2>

      {state.latestDraw.length ? (
        <>
          <ol style={{ fontSize: 22, marginTop: 0 }}>
            {state.latestDraw.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>

          <button onClick={onCopyLatestDraw} style={{ padding: "10px 12px" }}>
            Copy latest draw
          </button>
        </>
      ) : (
        <div style={{ opacity: 0.7 }}>
          Start the game, then press “Next draw” to generate your calls.
        </div>
      )}

      <p style={{ marginTop: 18, opacity: 0.75 }}>
        Defaults are shared from <code>lib/defaultItems.ts</code>.
      </p>
    </main>
  );
}
