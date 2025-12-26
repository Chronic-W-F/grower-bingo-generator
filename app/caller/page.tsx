// app/caller/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_POOL_TEXT } from "@/lib/defaultItems";

const SHARED_POOL_KEY = "grower-bingo:pool:v1";
const CALLER_STATE_KEY = "grower-bingo:caller:v1";
const CALLER_MIGRATION_KEY = "grower-bingo:caller:migrated:v1";

type CallerState = {
  poolText: string;
  deckSize: number;
  drawSize: number;
  round: number;
  deck: string[];
  called: string[];
};

function safeParse<T>(raw: string | null): T | null {
  try {
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    maxWidth: 720,
    margin: "0 auto",
    padding: 16,
    fontFamily:
      "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  btn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #111827",
    background: "#fff",
    cursor: "pointer",
  },
  btnPrimary: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #111827",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
  },
  btnDanger: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #991b1b",
    background: "#fff",
    color: "#991b1b",
    cursor: "pointer",
  },
  input: {
    width: "100%",
    marginTop: 8,
    padding: "12px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 16,
  },
  mono: {
    width: "100%",
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
    fontSize: 14,
  },
};

export default function CallerPage() {
  const router = useRouter();

  const [poolText, setPoolText] = useState<string>("");

  const [deckSize, setDeckSize] = useState<number>(50);
  const [drawSize, setDrawSize] = useState<number>(10);
  const [deckSizeInput, setDeckSizeInput] = useState<string>("50");
  const [drawSizeInput,
