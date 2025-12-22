export type BingoGrid = string[][];

export type BingoCard = {
  id: string;
  grid: BingoGrid; // 5x5, center is "FREE"
};

export type BingoPack = {
  cards: BingoCard[];
};

function makeId() {
  // short, readable, unique enough for packs
  return (
    Math.random().toString(36).slice(2, 8).toUpperCase() +
    "-" +
    Date.now().toString(36).slice(4).toUpperCase()
  );
}

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// center is FREE at (2,2). We need 24 other items.
function buildGrid(items: string[]): BingoGrid {
  const picks = shuffle(items).slice(0, 24);
  const grid: string[][] = [];
  let k = 0;

  for (let r = 0; r < 5; r++) {
    const row: string[] = [];
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) {
        row.push("FREE");
      } else {
        row.push(picks[k++]);
      }
    }
    grid.push(row);
  }
  return grid;
}

function gridKey(grid: BingoGrid) {
  // stable signature to enforce uniqueness
  return grid.map((row) => row.join("|")).join("||");
}

/**
 * Create a pack of UNIQUE grids (no duplicate card layouts in the pack).
 * - items: pool of square labels
 * - qty: number of cards
 */
export function createBingoPack(items: string[], qty: number): BingoPack {
  const unique = new Set<string>();
  const cards: BingoCard[] = [];

  // Prevent infinite loops when qty is too high for a small pool
  // This is a generous cap; collisions rise as qty increases.
  const maxAttempts = Math.max(5000, qty * 500);

  let attempts = 0;
  while (cards.length < qty) {
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error(
        `Could not generate ${qty} unique cards from ${items.length} items. ` +
          `Increase item pool or reduce quantity.`
      );
    }

    const grid = buildGrid(items);
    const key = gridKey(grid);

    if (unique.has(key)) continue;
    unique.add(key);

    cards.push({
      id: makeId(),
      grid,
    });
  }

  return { cards };
}
