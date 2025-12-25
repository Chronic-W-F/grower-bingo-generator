// lib/defaultItems.ts
// Single source of truth for the default pool used by BOTH:
// - PDF Generator (home page)
// - Caller page (/caller)

import { BINGO_ITEMS } from "@/lib/bingo";

// Export as an array (best for code)
export const DEFAULT_POOL: string[] = BINGO_ITEMS;

// Also export as a textarea-friendly string (one per line)
export const DEFAULT_POOL_TEXT: string = BINGO_ITEMS.join("\n");
