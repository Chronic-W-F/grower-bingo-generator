// lib/bingo.ts
// Supports 3x3, 4x4, 5x5 cards + auto weekly pool selection + unique-grid generation.

export const CENTER_LABEL = "Joe’s Grows";

export type BingoCard = {
  id: string;
  grid: string[][];
};

export type BingoPack = {
  packId: string;
  createdAt: number;
  title?: string;
  sponsorName?: string;

  cards: BingoCard[];

  // The weekly pool actually used to generate these cards (caller should use this)
  weeklyPool: string[];

  // All unique items appearing across all cards (excluding center if used)
  usedItems: string[];

  meta: {
    gridSize: number;
    freeCenter: boolean;
    squaresPerCard: number;
    weeklyPoolSize: number;
    qty: number;
  };
};

function cryptoId() {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

function packId() {
  return "pack_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36).slice(-5);
}

export function normalizeLines(input: string): string[] {
  return input
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const key = it.trim();
    if (!key) continue;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

function shuffle<T>(arr: T[], seed?: number): T[] {
  // Fisher-Yates; deterministic if seed provided (optional)
  const a = arr.slice();
  let s = seed ?? 0;

  function rand() {
    if (seed == null) return Math.random();
    // LCG
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  }

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sampleUnique<T>(items: T[], n: number, seed?: number): T[] {
  if (n <= 0) return [];
  if (n >= items.length) return items.slice();
  const shuffled = shuffle(items, seed);
  return shuffled.slice(0, n);
}

export function getCardConfig(gridSize: 3 | 4 | 5) {
  const freeCenter = gridSize === 3 || gridSize === 5; // default behavior
  const squaresPerCard = gridSize * gridSize - (freeCenter ? 1 : 0);

  // Auto weekly pool sizing:
  // 5x5 -> 50, 4x4 -> 32, 3x3 (with free center) -> 16
  let weeklyPoolSize = 2 * squaresPerCard;
  if (gridSize === 5) weeklyPoolSize = 50;
  if (gridSize === 4) weeklyPoolSize = 32;
  if (gridSize === 3) weeklyPoolSize = 16;

  return { gridSize, freeCenter, squaresPerCard, weeklyPoolSize };
}

function flattenGrid(grid: string[][]): string[] {
  const out: string[] = [];
  for (const row of grid) for (const cell of row) out.push(cell);
  return out;
}

function gridSignature(grid: string[][]): string {
  // stable signature to enforce no duplicate grids in a pack
  return flattenGrid(grid).join("||");
}

export function createCardFromPool(args: {
  pool: string[];
  gridSize: 3 | 4 | 5;
  freeCenter: boolean;
  centerLabel?: string;
  seed?: number;
}): BingoCard {
  const { pool, gridSize, freeCenter, centerLabel = CENTER_LABEL, seed } = args;

  const squaresPerCard = gridSize * gridSize - (freeCenter ? 1 : 0);
  if (pool.length < squaresPerCard) {
    throw new Error(
      `Pool too small. Need at least ${squaresPerCard} items for a ${gridSize}x${gridSize} card (freeCenter=${freeCenter}).`
    );
  }

  const picks = sampleUnique(pool, squaresPerCard, seed);

  const grid: string[][] = [];
  let idx = 0;

  for (let r = 0; r < gridSize; r++) {
    const row: string[] = [];
    for (let c = 0; c < gridSize; c++) {
      if (freeCenter && r === Math.floor(gridSize / 2) && c === Math.floor(gridSize / 2)) {
        row.push(centerLabel);
      } else {
        row.push(picks[idx++]);
      }
    }
    grid.push(row);
  }

  return { id: cryptoId(), grid };
}

export function createBingoPackFromMasterPool(args: {
  masterPool: string[];
  qty: number;
  gridSize: 3 | 4 | 5;
  seed?: number;
  title?: string;
  sponsorName?: string;
}): BingoPack {
  const { masterPool, qty, gridSize, seed, title, sponsorName } = args;

  const uniquePool = uniqueStrings(masterPool);
  const cfg = getCardConfig(gridSize);

  const weeklyPoolSize = Math.min(cfg.weeklyPoolSize, uniquePool.length);
  const weeklyPool = sampleUnique(uniquePool, weeklyPoolSize, seed);

  // generate cards with guaranteed unique grids
  const cards: BingoCard[] = [];
  const sigs = new Set<string>();

  const maxAttempts = Math.max(1000, qty * 50);
  let attempts = 0;
  let localSeed = seed ?? Math.floor(Math.random() * 1_000_000_000);

  while (cards.length < qty) {
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error(
        `Could not generate ${qty} unique grids from weekly pool size ${weeklyPool.length}. Increase pool size or lower qty.`
      );
    }

    localSeed = (localSeed * 1103515245 + 12345) >>> 0;
    const card = createCardFromPool({
      pool: weeklyPool,
      gridSize,
      freeCenter: cfg.freeCenter,
      seed: localSeed,
    });

    const sig = gridSignature(card.grid);
    if (sigs.has(sig)) continue;
    sigs.add(sig);
    cards.push(card);
  }

  // usedItems = union across cards excluding center label
  const used = new Set<string>();
  for (const c of cards) {
    for (const row of c.grid) {
      for (const cell of row) {
        if (cfg.freeCenter && cell === CENTER_LABEL) continue;
        used.add(cell);
      }
    }
  }

  return {
    packId: packId(),
    createdAt: Date.now(),
    title,
    sponsorName,
    cards,
    weeklyPool,
    usedItems: Array.from(used),
    meta: {
      gridSize,
      freeCenter: cfg.freeCenter,
      squaresPerCard: cfg.squaresPerCard,
      weeklyPoolSize,
      qty,
    },
  };
}

// Convenience wrapper for your current app: 5x5 with free center
export function createBingoPack(allItems: string[], qty: number): BingoPack {
  return createBingoPackFromMasterPool({
    masterPool: allItems,
    qty,
    gridSize: 5,
  });
}
