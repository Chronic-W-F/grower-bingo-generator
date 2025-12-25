// lib/caller.ts

export type CallerState = {
  started: boolean;
  deck: string[];
  called: string[];
  round: number;
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildDeck(pool: string[], deckSize: number): string[] {
  const clean = Array.from(
    new Map(
      pool
        .map((s) => (s ?? "").trim())
        .filter(Boolean)
        .map((s) => [s.toLowerCase(), s] as const)
    ).values()
  );

  if (deckSize > clean.length) {
    throw new Error(`Deck size (${deckSize}) is larger than your pool (${clean.length}).`);
  }

  const rand = mulberry32(Date.now() ^ Math.floor(Math.random() * 1e9));
  return shuffle(clean, rand).slice(0, deckSize);
}

export function startGame(pool: string[], deckSize: number): CallerState {
  const deck = buildDeck(pool, deckSize);
  return { started: true, deck, called: [], round: 0 };
}

export function nextDraw(state: CallerState, drawSize: number): { state: CallerState; latest: string[] } {
  if (!state.started) return { state, latest: [] };

  const remaining = state.deck.filter((x) => !state.called.includes(x));
  if (remaining.length === 0) return { state, latest: [] };

  const take = Math.min(drawSize, remaining.length);
  const latest = remaining.slice(0, take);

  const newCalled = [...state.called, ...latest];
  return {
    state: { ...state, called: newCalled, round: state.round + 1 },
    latest,
  };
}
