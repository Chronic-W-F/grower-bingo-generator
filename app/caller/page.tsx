"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const SHARED_POOL_KEY = "grower-bingo:pool:v1";
const CALLER_STATE_KEY = "grower-bingo:caller:v1";

type CallerState = {
  poolText: string;
  deckSize: number;
  drawSize: number;
  deck: string[];
  called: string[];
  draws: string[][];
};

function lines(text: string) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toInt(s: string, fallback: number) {
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

export default function CallerPage() {
  const router = useRouter();

  const [poolText, setPoolText] = useState("");
  const pool = useMemo(() => lines(poolText), [poolText]);
  const poolCount = pool.length;

  const [deckSize, setDeckSize] = useState(50);
  const [drawSize, setDrawSize] = useState(10);
  const [deckSizeInput, setDeckSizeInput] = useState("50");
  const [drawSizeInput, setDrawSizeInput] = useState("10");

  const [deck, setDeck] = useState<string[]>([]);
  const [called, setCalled] = useState<string[]>([]);
  const [draws, setDraws] = useState<string[][]>([]);

  // Load saved state (keeps game on refresh)
  useEffect(() => {
    const shared = window.localStorage.getItem(SHARED_POOL_KEY) ?? "";
    const raw = window.localStorage.getItem(CALLER_STATE_KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw) as CallerState;
        const pt = (s.poolText ?? "").trim() || shared;
        setPoolText(pt);

        const maxDeck = Math.max(1, lines(pt).length);
        const ds = clamp(Number(s.deckSize ?? 50), 1, maxDeck);
        const dr = clamp(Number(s.drawSize ?? 10), 1, ds);

        setDeckSize(ds);
        setDrawSize(dr);
        setDeckSizeInput(String(ds));
        setDrawSizeInput(String(dr));

        setDeck(Array.isArray(s.deck) ? s.deck : []);
        setCalled(Array.isArray(s.called) ? s.called : []);
        setDraws(Array.isArray(s.draws) ? s.draws : []);
        return;
      } catch {
        // fall through
      }
    }
    setPoolText(shared);
  }, []);

  // Persist
  useEffect(() => {
    const state: CallerState = {
      poolText,
      deckSize,
      drawSize,
      deck,
      called,
      draws,
    };
    try {
      window.localStorage.setItem(CALLER_STATE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [poolText, deckSize, drawSize, deck, called, draws]);

  function reloadSharedPool() {
    const shared = window.localStorage.getItem(SHARED_POOL_KEY) ?? "";
    setPoolText(shared);
  }

  function applySizesOnBlur() {
    const maxDeck = Math.max(1, poolCount || 1);
    const ds = clamp(toInt(deckSizeInput, deckSize), 1, maxDeck);
    const dr = clamp(toInt(drawSizeInput, drawSize), 1, ds);
    setDeckSize(ds);
    setDrawSize(dr);
    setDeckSizeInput(String(ds));
    setDrawSizeInput(String(dr));
  }

  function startGame() {
    applySizesOnBlur();

    const maxDeck = Math.max(1, poolCount || 1);
    const ds = clamp(toInt(deckSizeInput, deckSize), 1, maxDeck);
    const dr = clamp(toInt(drawSizeInput, drawSize), 1, ds);

    const newDeck = shuffle(pool).slice(0, ds);

    setDeckSize(ds);
    setDrawSize(dr);
    setDeckSizeInput(String(ds));
    setDrawSizeInput(String(dr));

    setDeck(newDeck);
    setCalled([]);
    setDraws([]);
  }

  function resetGame() {
    const ok = window.confirm("Reset game? This clears called items.");
    if (!ok) return;
    setDeck([]);
    setCalled([]);
    setDraws([]);
  }

  function nextDraw() {
    if (!deck.length) return;

    const remaining = deck.filter((x) => !called.includes(x));
    if (!remaining.length) return;

    const n = clamp(drawSize, 1, remaining.length);
    const batch = remaining.slice(0, n);

    const ok = window.confirm("Draw next set?");
    if (!ok) return;

    setCalled((prev) => [...prev, ...batch]);
    setDraws((prev) => [...prev, batch]);
  }

  const remainingCount = Math.max(0, deck.length - called.length);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Grower Bingo - Caller</h1>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>BUILD TAG: CALLER-VERIFY-003</div>

        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={() => window.location.assign("/")} style={btnPrimary}>
            Back to Generator
          </button>
          <button onClick={reloadSharedPool} style={btn}>
            Reload shared pool
          </button>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 700 }}>Topic Pool (one per line) - Current: {poolCount}</div>
        <textarea
          value={poolText}
          onChange={(e) => setPoolText(e.target.value)}
          rows={10}
          style={mono}
          placeholder="One item per line"
        />
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>Deck size</div>
            <input
              value={deckSizeInput}
              onChange={(e) => setDeckSizeInput(e.target.value)}
              onBlur={applySizesOnBlur}
              inputMode="numeric"
              style={input}
            />
          </div>

          <div>
            <div style={{ fontWeight: 700 }}>Draw size</div>
            <input
              value={drawSizeInput}
              onChange={(e) => setDrawSizeInput(e.target.value)}
              onBlur={applySizesOnBlur}
              inputMode="numeric"
              style={input}
            />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={startGame} style={btnPrimary} disabled={poolCount < 1}>
              Start Game
            </button>
            <button onClick={resetGame} style={btn}>
              Reset
            </button>
            <button onClick={nextDraw} style={btn} disabled={!deck.length || remainingCount === 0}>
              Next draw
            </button>
          </div>

          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
            <div>Called: {called.length} / {deck.length}</div>
            <div>Remaining: {remainingCount}</div>
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Draw history</div>
        {!draws.length ? (
          <div style={{ opacity: 0.75 }}>No draws yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {draws.map((batch, idx) => (
              <div key={idx} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Round {idx + 1}</div>
                {batch.map((item, j) => (
                  <div key={idx + "-" + j}>{item}</div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111827",
  background: "white",
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111827",
  background: "#111827",
  color: "white",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 16,
};

const mono: React.CSSProperties = {
  width: "100%",
  marginTop: 12,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 14,
};
