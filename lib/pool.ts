// lib/pool.ts

export const POOL_STORAGE_KEY = "grower-bingo:pool:v1";

export function normalizePoolText(text: string): string {
  const lines = (text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];

  for (const line of lines) {
    const key = line.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(line);
    }
  }

  return out.join("\n");
}

export function countPoolItems(text: string): number {
  const norm = normalizePoolText(text);
  if (!norm) return 0;
  return norm.split("\n").filter(Boolean).length;
}

export function textToPool(text: string): string[] {
  const norm = normalizePoolText(text);
  if (!norm) return [];
  return norm.split("\n").filter(Boolean);
}
