// app/card/[cardId]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { decodeCardPayload, type SharedCardPayload } from "@/lib/cardShare";

const LAST_GENERATED_PACK_KEY = "grower-bingo:lastGeneratedPack:v1";

type BingoCard = { id: string; grid: string[][] };

type StoredPack = {
  cardsPack?: {
    packId?: string;
    title?: string;
    sponsorName?: string;
    cards?: BingoCard[];
  };
  requestKey?: string;
};

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isCenter(r: number, c: number, n: number) {
  const mid = Math.floor(n / 2);
  return r === mid && c === mid;
}

function markKey(packId: string, cardId: string) {
  return `grower-bingo:cardMarks:v1:${packId}:${cardId}`;
}

export default function CardPage() {
  const params = useParams<{ cardId: string }>();
  const searchParams = useSearchParams();

  const routeCardId = params?.cardId || "";
  const sharedRaw = searchParams.get("d") || "";

  const [payload, setPayload] = useState<SharedCardPayload | null>(null);
  const [error, setError] = useState<string>("");
  const [marks, setMarks] = useState<Record<string, boolean>>({});

  // Load card: prefer URL payload, else pull from last generated pack on this device
  useEffect(() => {
    setError("");

    // 1) From share link (?d=...)
    if (sharedRaw) {
      const decoded = decodeCardPayload(sharedRaw);
      if (!decoded) {
        setError("This card link is invalid or corrupted.");
        return;
      }
      if (decoded.cardId !== routeCardId) {
        setError("Card ID mismatch. This link does not match the cardId in the URL.");
        return;
      }
      setPayload(decoded);
      return;
    }

    // 2) From organizer device (localStorage pack)
    const stored = safeJsonParse<StoredPack>(window.localStorage.getItem(LAST_GENERATED_PACK_KEY));
    const packId = stored?.cardsPack?.packId || stored?.requestKey || "";
    const cards = stored?.cardsPack?.cards || [];
    const found = cards.find((c) => c.id === routeCardId);

    if (!packId || !found) {
      setError(
        "Card not found on this device. Ask the organizer for a share link, or open this card from the Generator after creating a pack."
      );
      return;
    }

    setPayload({
      v: 1,
      packId,
      cardId: found.id,
      grid: found.grid,
      title: stored?.cardsPack?.title,
      sponsorName: stored?.cardsPack?.sponsorName,
    });
  }, [routeCardId, sharedRaw]);

  // Load marks for this pack+card on this device
  useEffect(() => {
    if (!payload) return;
    const raw = window.localStorage.getItem(markKey(payload.packId, payload.cardId));
    const saved = safeJsonParse<Record<string, boolean>>(raw) || {};
    setMarks(saved);
  }, [payload?.packId, payload?.cardId]);

  function persist(next: Record<string, boolean>) {
    if (!payload) return;
    setMarks(next);
    try {
      window.localStorage.setItem(markKey(payload.packId, payload.cardId), JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  const grid = payload?.grid || [];
  const n = grid.length || 5;

  const headerTitle = useMemo(() => {
    if (!payload) return "Bingo Card";
    return (payload.title?.trim() || "Grower Bingo").trim();
  }, [payload]);

  const subTitle = useMemo(() => {
    if (!payload) return "";
    const parts: string[] = [];
    if (payload.sponsorName) parts.push(payload.sponsorName);
    parts.push(`Card ID: ${payload.cardId}`);
    return parts.join(" • ");
  }, [payload]);

  function toggleCell(r: number, c: number) {
    if (!payload) return;
    if (isCenter(r, c, n)) return;

    const key = `${r}-${c}`;
    const next = { ...marks, [key]: !marks[key] };
    persist(next);
  }

  function clearMarks() {
    persist({});
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow">
          <div className="text-2xl font-black">Card</div>
          <div className="mt-3 text-zinc-300">{error}</div>
          <div className="mt-4 text-sm text-zinc-400">
            Tip: The organizer can share a link that contains this card’s data.
          </div>
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow">
          <div className="text-2xl font-black">Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl p-5">
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/70 to-zinc-950/60 p-5 shadow">
          <div className="flex flex-col gap-2">
            <div className="text-3xl font-black tracking-tight">{headerTitle}</div>
            <div className="text-sm text-zinc-300">{subTitle}</div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={clearMarks}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-zinc-800"
            >
              Clear marks
            </button>

            <a
              href="/"
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-zinc-800"
            >
              Back to Generator
            </a>

            <a
              href={`/winners/${encodeURIComponent(payload.packId)}`}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-zinc-800"
            >
              Winners
            </a>
          </div>

          <div className="mt-5 grid gap-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
              >
                {grid.map((row, r) =>
                  row.map((text, c) => {
                    const center = isCenter(r, c, n);
                    const k = `${r}-${c}`;
                    const marked = center || !!marks[k];

                    return (
                      <button
                        key={`${r}-${c}`}
                        onClick={() => toggleCell(r, c)}
                        className={[
                          "aspect-square w-full rounded-2xl border p-2 transition",
                          "flex items-center justify-center",
                          marked
                            ? "border-emerald-400/60 bg-emerald-500/15"
                            : "border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900/50",
                          center ? "ring-1 ring-emerald-400/40" : "",
                        ].join(" ")}
                      >
                        <div className="w-full">
                          <div className="text-[11px] leading-snug text-zinc-100 font-semibold text-center">
                            {text}
                          </div>
                          {marked && !center ? (
                            <div className="mt-2 text-center text-[10px] text-emerald-300 font-bold">
                              MARKED
                            </div>
                          ) : null}
                          {center ? (
                            <div className="mt-2 text-center text-[10px] text-emerald-300 font-bold">
                              FREE
                            </div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="text-xs text-zinc-400">
              Tap a square to mark it. Marks are saved on this device for this card.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
