// lib/bingo.ts
export type BingoGrid = string[][];
export type BingoCard = { id: string; grid: BingoGrid };

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makeCardId() {
  // short-ish, readable
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out.slice(0, 4) + "-" + out.slice(4);
}

function normalizeItems(items: string[]) {
  return items
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .map((s) => s.replace(/\s+/g, " "));
}

function shuffle<T>(arr: T[], rand: () => number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Make ONE 5x5 grid with center FREE.
// Uses 24 unique items from pool.
export function generateGrid(items: string[], seedKey: string): BingoGrid {
  const clean = normalizeItems(items);
  if (clean.length < 24) throw new Error("Need at least 24 items.");

  const rand = mulberry32(hashStringToSeed(seedKey));
  const picked = shuffle(clean, rand).slice(0, 24);

  const grid: BingoGrid = [];
  let k = 0;
  for (let r = 0; r < 5; r++) {
    const row: string[] = [];
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) row.push("FREE");
      else row.push(picked[k++]);
    }
    grid.push(row);
  }
  return grid;
}

function gridSignature(grid: BingoGrid) {
  // signature used to guarantee unique layouts
  return grid.map((r) => r.join("|")).join("||");
}

/**
 * Create a pack of UNIQUE cards (no duplicate grids).
 * Will attempt to generate until it has `qty` unique grids or hits a max attempt limit.
 */
export function createBingoPack(items: string[], qty: number) {
  const clean = normalizeItems(items);
  if (qty < 1 || qty > 500) throw new Error("Quantity must be between 1 and 500.");
  if (clean.length < 24) throw new Error("Need at least 24 items.");

  const cards: BingoCard[] = [];
  const seen = new Set<string>();

  // With small pools (like 25–60 items), uniqueness will eventually cap out.
  // This limit prevents infinite loops.
  const maxAttempts = Math.max(5000, qty * 200);

  let attempts = 0;
  while (cards.length < qty && attempts < maxAttempts) {
    attempts++;

    const id = makeCardId();
    const grid = generateGrid(clean, `${id}-${attempts}-${Date.now()}`);

    const sig = gridSignature(grid);
    if (seen.has(sig)) continue;

    seen.add(sig);
    cards.push({ id, grid });
  }

  if (cards.length < qty) {
    throw new Error(
      `Could only generate ${cards.length} unique cards from this item pool. Increase pool size for higher quantities.`
    );
  }

  return { cards };
}
