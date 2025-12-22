// lib/bingo.ts
export type BingoCell = string | null;        // null = FREE center
export type BingoRow = BingoCell[];
export type BingoGrid = BingoRow[];           // 5 rows of 5 cells

export type BingoCard = {
  id: string;
  grid: BingoGrid;
};

export type BingoPack = {
  title: string;
  sponsorName: string;
  bannerUrl?: string;
  logoUrl?: string;
  cards: BingoCard[];
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeCardId(): string {
  // short readable id like "U604-3PCZ"
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${pick(4)}-${pick(4)}`;
}

/**
 * Generates a 5x5 grid with center = null (FREE),
 * using 24 unique items sampled from the pool.
 */
export function generateGrid(items: string[], rand = Math.random): BingoGrid {
  if (items.length < 24) throw new Error("Need at least 24 items to build a 5x5 grid.");

  const picked = shuffle(items, rand).slice(0, 24);

  // Fill row-major with a hole at center (r=2,c=2)
  const grid: BingoGrid = [];
  let k = 0;

  for (let r = 0; r < 5; r++) {
    const row: BingoRow = [];
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) row.push(null); // FREE center
      else row.push(picked[k++]);
    }
    grid.push(row);
  }

  return grid;
}

function gridSignature(grid: BingoGrid): string {
  // include positions; treat null as "FREE"
  return grid
    .map((row) => row.map((cell) => (cell == null ? "FREE" : cell)).join("|"))
    .join("||");
}

/**
 * Step 1 (DONE here): create a pack where ALL card grids are unique.
 *
 * If qty is high and the pool is too small, uniqueness can become impossible.
 * We’ll attempt up to (qty * 200) tries and then throw a helpful error.
 */
export function createBingoPack(
  items: string[],
  qty: number,
  opts?: { seed?: number }
): { cards: BingoCard[] } {
  if (!Number.isFinite(qty) || qty < 1 || qty > 500) {
    throw new Error("Quantity must be between 1 and 500.");
  }
  if (items.length < 24) {
    throw new Error(`Need at least 24 items. Got ${items.length}.`);
  }

  const rand = opts?.seed != null ? mulberry32(opts.seed) : Math.random;

  const seen = new Set<string>();
  const cards: BingoCard[] = [];

  const maxTries = Math.max(200, qty * 200);
  let tries = 0;

  while (cards.length < qty) {
    tries++;
    if (tries > maxTries) {
      throw new Error(
        `Could not generate ${qty} unique cards with only ${items.length} pool items.\n` +
          `Try increasing your item list (recommended 60–100 items for large packs).`
      );
    }

    const grid = generateGrid(items, rand);
    const sig = gridSignature(grid);

    if (seen.has(sig)) continue;
    seen.add(sig);

    cards.push({
      id: makeCardId(),
      grid,
    });
  }

  return { cards };
}
