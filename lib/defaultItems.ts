// lib/defaultItems.ts
// Single source of truth for the default pool used by BOTH:
// - PDF Generator (home page)
// - Caller page (/caller)

import { BINGO_ITEMS } from "@/lib/bingo";

// Primary exports (new standard)
export const DEFAULT_POOL: string[] = BINGO_ITEMS;
export const DEFAULT_POOL_TEXT: string = BINGO_ITEMS.join("\n");

// Backwards compatibility (prevents build breaks)
export const DEFAULT_TOPIC_POOL: string[] = DEFAULT_POOL;
export const DEFAULT_ITEMS = DEFAULT_POOL_TEXT;
