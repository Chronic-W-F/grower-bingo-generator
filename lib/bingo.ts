// lib/bingo.ts
import crypto from "crypto";

export type BingoCell = { text: string; icon?: string };
export type BingoGrid = BingoCell[][];
export type BingoCard = { id: string; grid: BingoGrid };

export type CreatePackResult = {
  cards: BingoCard[];
};

function uuid() {
  // crypto.randomUUID exists in Node 18+, fallback just in case
  // Vercel Node runtime supports randomUUID
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickUnique(items: string[], count: number): string[] {
  if (items.length < count) throw new Error(`Need at least ${count} items to build a grid.`);
  return shuffle(items).slice(0, count);
}

function gridSignature(grid: BingoGrid) {
  // signature for uniqueness check
  return grid.map((r) => r.map((c) => c.text).join("|")).join("||");
}

export function createBingoCard(items: string[]): BingoCard {
  // 5x5 with FREE center => 24 items
  const picks = pickUnique(items, 24);
  const grid: BingoGrid = [];
  let idx = 0;

  for (let r = 0; r < 5; r++) {
    const row: BingoCell[] = [];
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) row.push({ text: "FREE" });
      else row.push({ text: picks[idx++] });
    }
    grid.push(row);
  }

  return { id: uuid(), grid };
}

export function createBingoPackUnique(opts: { items: string[]; qty: number; maxAttempts?: number }): CreatePackResult {
  const { items, qty, maxAttempts = 20000 } = opts;
  const seen = new Set<string>();
  const cards: BingoCard[] = [];

  let attempts = 0;
  while (cards.length < qty) {
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error(
        `Could not generate ${qty} unique cards from ${items.length} items (attempted ${attempts}). Add more items.`
      );
    }
    const card = createBingoCard(items);
    const sig = gridSignature(card.grid);
    if (seen.has(sig)) continue;
    seen.add(sig);
    cards.push(card);
  }

  return { cards };
}
