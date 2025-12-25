// lib/caller.ts

export type CallerState = {
  pool: string[];      // all available topics (deduped/trimmed)
  deckSize: number;    // how many topics are used this game
  drawSize: number;    // how many to call each round
  deck: string[];      // the chosen deck (shuffled)
  called: string[];    // everything called so far
  remaining: string[]; // what is left to call
  round: number;       // starts at 0, increments each draw
};

export type DrawResult = {
  drawn: string[];
  state: CallerState;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizePool(pool: string[]): string[] {
  // Trim, drop blanks, and dedupe while preserving first-seen order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of pool) {
    const s = String(raw ?? "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/**
 * Pick a deck (unique, shuffled) from a larger pool.
 * - If deckSize >= pool size, it uses the whole pool (shuffled).
 * - No duplicates, ever.
 */
export function buildDeck(pool: string[], deckSize: number): string[] {
  const clean = normalizePool(pool);
  if (clean.length === 0) return [];

  const size = Math.max(1, Math.min(Math.floor(deckSize || 1), clean.length));

  // Shuffle pool, then take first N
  const shuffled = shuffle(clean);
  return shuffled.slice(0, size);
}

/**
 * Draw next batch (no repeats). Stops naturally when remaining is empty.
 */
export function drawNext(state: CallerState): DrawResult {
  if (!state) {
    return { drawn: [], state: state as unknown as CallerState };
  }

  if (state.remaining.length === 0) {
    return { drawn: [], state };
  }

  const drawCount = Math.max(
    1,
    Math.min(Math.floor(state.drawSize || 1), state.remaining.length)
  );

  const drawn = state.remaining.slice(0, drawCount);
  const remaining = state.remaining.slice(drawCount);

  const nextState: CallerState = {
    ...state,
    called: [...state.called, ...drawn],
    remaining,
    round: state.round + 1,
  };

  return { drawn, state: nextState };
}
