// lib/defaultItems.ts
import { BINGO_ITEMS } from "@/lib/bingo";

// Defaults as an array
export const DEFAULT_POOL: string[] = BINGO_ITEMS;

// Defaults as textarea text (one per line)
export const DEFAULT_POOL_TEXT: string = BINGO_ITEMS.join("\n");
