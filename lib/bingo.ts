export type BingoGrid = string[][];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeCardId(prefix: string) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${out}`;
}

export function generateGrid(items: string[]): BingoGrid {
  if (items.length < 24) {
    throw new Error("At least 24 items required");
  }

  const picked = shuffle(items).slice(0, 24);
  const grid: BingoGrid = Array.from({ length: 5 }, () => Array(5).fill(""));
  let i = 0;

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) {
        grid[r][c] = "FREE";
      } else {
        grid[r][c] = picked[i++];
      }
    }
  }
  return grid;
}
