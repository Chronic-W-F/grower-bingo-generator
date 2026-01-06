// app/caller/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

const POOL_KEY = "grower-bingo:pool:v1";
const CALLER_STATE_KEY = "grower-bingo:callerState:v1";
const LAST_PACK_KEY = "grower-bingo:lastPackId:v1";
const LAST_GENERATED_PACK_KEY = "grower-bingo:lastGeneratedPack:v1";

function packCallerKey(packId: string) {
  return `grower-bingo:callerState:${packId}`;
}

function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function uniqCaseSensitive(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    if (seen.has(it)) continue;
    seen.add(it);
    out.push(it);
  }
  return out;
}

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

type CallerState = {
  packId: string;
  savedAt: number | null;
  pool: string[];
  remaining: string[];
  called: string[];
  lastBatch: string[];
};

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function saveCallerStateEverywhere(state: CallerState) {
  try {
    window.localStorage.setItem(CALLER_STATE_KEY, JSON.stringify(state));
    window.localStorage.setItem(packCallerKey(state.packId), JSON.stringify(state));
    window.localStorage.setItem(LAST_PACK_KEY, state.packId);
  } catch {
    // ignore
  }
}

function formatSavedAt(ts: number | null) {
  if (!ts) return "Never";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "Saved";
  }
}

function resolveBestPackId(): string {
  const lp = window.localStorage.getItem(LAST_PACK_KEY) || "";

  // Prefer the last generated pack (fixes "stuck packId" after regenerating)
  const restored = safeJsonParse<any>(window.localStorage.getItem(LAST_GENERATED_PACK_KEY));
  const restoredPackId = restored?.cardsPack?.packId || restored?.requestKey || "";

  return restoredPackId || lp || "pack_unknown";
}

export default function CallerPage() {
  const [packId, setPackId] = useState<string>("");

  // Let mobile type freely; clamp only when drawing / blur.
  const [drawCountInput, setDrawCountInput] = useState<string>("10");

  const [poolText, setPoolText] = useState<string>("");
  const [poolItems, setPoolItems] = useState<string[]>([]);

  const [remaining, setRemaining] = useState<string[]>([]);
  const [called, setCalled] = useState<string[]>([]);
  const [lastBatch, setLastBatch] = useState<string[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const [statusMsg, setStatusMsg] = useState<string>("");
  const [error, setError] = useState<string>("");

  // confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCount, setConfirmCount] = useState<number>(0);
  const [confirmPreview, setConfirmPreview] = useState<string[]>([]);

  const uniqueCount = poolItems.length;

  const drawCount = useMemo(() => {
    const raw = Number.parseInt(drawCountInput, 10);
    if (!Number.isFinite(raw)) return 10;
    return Math.max(1, Math.min(50, raw));
  }, [drawCountInput]);

  // initial load
  useEffect(() => {
    const resolvedPackId = resolveBestPackId();
    setPackId(resolvedPackId);

    // Load pool
    const rawPool = window.localStorage.getItem(POOL_KEY) || "";
    const normalized = uniqCaseSensitive(normalizeLines(rawPool));
    setPoolText(normalized.join("\n"));
    setPoolItems(normalized);

    // Load caller state (prefer per-pack)
    const byPack = safeJsonParse<CallerState>(
      window.localStorage.getItem(packCallerKey(resolvedPackId))
    );
    const global = safeJsonParse<CallerState>(
      window.localStorage.getItem(CALLER_STATE_KEY)
    );

    const state =
      (byPack && byPack.packId === resolvedPackId ? byPack : null) ||
      (global && global.packId === resolvedPackId ? global : null);

    if (state) {
      setRemaining(state.remaining || []);
      setCalled(state.called || []);
      setLastBatch(state.lastBatch || []);
      setLastSavedAt(state.savedAt ?? null);
      setStatusMsg(`Loaded caller state for pack ${resolvedPackId}.`);
      return;
    }

    // No state yet: initialize
    const initRemaining = shuffle(normalized);
    setRemaining(initRemaining);
    setCalled([]);
    setLastBatch([]);
    setLastSavedAt(null);
    setStatusMsg(`Loaded pool from ${POOL_KEY}. Shuffled and ready.`);
  }, []);

  // keep poolItems synced with text
  useEffect(() => {
    const normalized = uniqCaseSensitive(normalizeLines(poolText));
    setPoolItems(normalized);
  }, [poolText]);

  function persistPoolOnly(items: string[]) {
    try {
      window.localStorage.setItem(POOL_KEY, items.join("\n"));
    } catch {
      // ignore
    }
  }

  function ensurePackId() {
    const resolved = resolveBestPackId();
    setPackId(resolved);
    return resolved;
  }

  function handleSavePoolAndReshuffle() {
    setError("");
    const normalized = uniqCaseSensitive(normalizeLines(poolText));

    if (normalized.length < 24) {
      setError("Pool too small. Need at least 24 unique items.");
      return;
    }

    const thisPackId = ensurePackId();
    const shuffled = shuffle(normalized);

    persistPoolOnly(normalized);

    const nextState: CallerState = {
      packId: thisPackId,
      savedAt: Date.now(),
      pool: normalized,
      remaining: shuffled,
      called: [],
      lastBatch: [],
    };

    setPoolItems(normalized);
    setRemaining(shuffled);
    setCalled([]);
    setLastBatch([]);
    setLastSavedAt(nextState.savedAt);

    saveCallerStateEverywhere(nextState);

    setStatusMsg(
      `Saved pool and reshuffled. Saved caller state for pack ${thisPackId}. (${normalized.length} items)`
    );
  }

  function openConfirmNextDraw() {
    setError("");

    const thisPackId = ensurePackId();

    if (poolItems.length < 24) {
      setError("Pool too small. Need at least 24 unique items.");
      return;
    }
    if (remaining.length === 0) {
      setError("No remaining items. Game is exhausted.");
      return;
    }

    const count = Math.min(drawCount, remaining.length);
    const preview = remaining.slice(0, Math.min(count, 12));
    setConfirmCount(count);
    setConfirmPreview(preview);
    setConfirmOpen(true);

    setStatusMsg(`Ready to draw ${count}. (Will save under pack ${thisPackId})`);
  }

  function doNextDrawConfirmed() {
    setConfirmOpen(false);
    setError("");

    const thisPackId = ensurePackId();

    const count = Math.min(drawCount, remaining.length);
    const batch = remaining.slice(0, count);
    const nextRemaining = remaining.slice(count);
    const nextCalled = [...called, ...batch];

    setRemaining(nextRemaining);
    setCalled(nextCalled);
    setLastBatch(batch);

    const nextState: CallerState = {
      packId: thisPackId,
      savedAt: Date.now(),
      pool: poolItems,
      remaining: nextRemaining,
      called: nextCalled,
      lastBatch: batch,
    };

    setLastSavedAt(nextState.savedAt);
    saveCallerStateEverywhere(nextState);

    setStatusMsg(`Drew ${count}. Saved caller state for pack ${thisPackId}.`);
  }

  function undoLastBatch() {
    setError("");
    if (!lastBatch.length) return;

    const thisPackId = ensurePackId();

    const nextCalled = called.slice(0, Math.max(0, called.length - lastBatch.length));
    const nextRemaining = [...lastBatch, ...remaining];

    setCalled(nextCalled);
    setRemaining(nextRemaining);
    setLastBatch([]);

    const nextState: CallerState = {
      packId: thisPackId,
      savedAt: Date.now(),
      pool: poolItems,
      remaining: nextRemaining,
      called: nextCalled,
      lastBatch: [],
    };

    setLastSavedAt(nextState.savedAt);
    saveCallerStateEverywhere(nextState);
    setStatusMsg("Undid last batch. Saved.");
  }

  function resetGame() {
    setError("");

    const thisPackId = ensurePackId();

    if (poolItems.length < 24) {
      setError("Pool too small. Need at least 24 unique items.");
      return;
    }

    const reshuffled = shuffle(poolItems);

    const nextState: CallerState = {
      packId: thisPackId,
      savedAt: Date.now(),
      pool: poolItems,
      remaining: reshuffled,
      called: [],
      lastBatch: [],
    };

    setRemaining(reshuffled);
    setCalled([]);
    setLastBatch([]);
    setLastSavedAt(nextState.savedAt);

    saveCallerStateEverywhere(nextState);
    setStatusMsg(`Game reset and reshuffled. Saved for pack ${thisPackId}.`);
  }

  // Clamp only on blur (mobile-friendly)
  function onDrawCountBlur() {
    const n = Number.parseInt(drawCountInput, 10);
    if (!Number.isFinite(n)) {
      setDrawCountInput("10");
      return;
    }
    const clamped = Math.max(1, Math.min(50, n));
    setDrawCountInput(String(clamped));
  }

  const winnersHref = packId ? `/winners/${encodeURIComponent(packId)}` : "/winners";

  return (
    <div
      style={{
        maxWidth: 820,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 40 }}>Caller</h1>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <a
            href="/"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: "white",
              textDecoration: "none",
              color: "#111827",
              display: "inline-block",
            }}
          >
            Back to Generator
          </a>

          <a
            href={winnersHref}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: "white",
              textDecoration: "none",
              color: "#111827",
              display: "inline-block",
            }}
          >
            Open Winners
          </a>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
        Pool key: <b>{POOL_KEY}</b> | Caller state: <b>{CALLER_STATE_KEY}</b> | Active packId:{" "}
        <b>{packId || "None"}</b>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Draw count (per click)</div>
            <input
              value={drawCountInput}
              onChange={(e) => setDrawCountInput(e.target.value)}
              onBlur={onDrawCountBlur}
              inputMode="numeric"
              placeholder="10"
              style={{
                width: 180,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 16,
              }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>Min 1, max 50</div>
          </div>

          <div style={{ fontSize: 20, fontWeight: 700 }}>
            Remaining: {remaining.length} | Called: {called.length}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={openConfirmNextDraw}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: "#111827",
                color: "white",
                cursor: "pointer",
                minWidth: 220,
              }}
            >
              Next draw
            </button>

            <button
              onClick={undoLastBatch}
              disabled={!lastBatch.length}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: !lastBatch.length ? "#9ca3af" : "white",
                cursor: !lastBatch.length ? "not-allowed" : "pointer",
                minWidth: 220,
              }}
            >
              Undo last batch
            </button>

            <button
              onClick={resetGame}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #b91c1c",
                background: "white",
                color: "#b91c1c",
                cursor: "pointer",
                minWidth: 220,
              }}
            >
              Reset game
            </button>
          </div>

          <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
            Last saved: <b>{formatSavedAt(lastSavedAt)}</b>
          </div>

          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>
                  Caller pool (one per line). Items: {uniqueCount}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  This saves to localStorage on this device.
                </div>
              </div>

              <button
                onClick={handleSavePoolAndReshuffle}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #111827",
                  background: "white",
                  cursor: "pointer",
                  minWidth: 220,
                }}
              >
                Save pool and reshuffle
              </button>
            </div>

            <textarea
              value={poolText}
              onChange={(e) => setPoolText(e.target.value)}
              rows={10}
              style={{
                marginTop: 10,
                width: "100%",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                padding: 12,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 14,
              }}
            />

            {statusMsg ? (
              <div style={{ marginTop: 10, border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" }}>
                {statusMsg}
              </div>
            ) : null}

            {error ? (
              <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 700 }}>{error}</div>
            ) : null}
          </div>

          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Called items (latest first)</div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              {called.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No calls yet.</div>
              ) : (
                <ol style={{ margin: 0, paddingLeft: 22 }}>
                  {[...called].reverse().map((item, idx) => (
                    <li key={`${item}-${idx}`}>{item}</li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* confirm modal */}
      {confirmOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div style={{ width: "100%", maxWidth: 520, background: "white", borderRadius: 16, padding: 16, border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Confirm next draw</div>
            <div style={{ color: "#374151", marginBottom: 12 }}>
              You are about to draw <b>{confirmCount}</b> item{confirmCount === 1 ? "" : "s"}.
              This will be saved under pack <b>{packId}</b>.
            </div>

            {confirmPreview.length ? (
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Preview (first up)</div>
                <ol style={{ margin: 0, paddingLeft: 22 }}>
                  {confirmPreview.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ol>
                {confirmCount > confirmPreview.length ? (
                  <div style={{ marginTop: 8, color: "#6b7280", fontSize: 12 }}>
                    Plus {confirmCount - confirmPreview.length} more...
                  </div>
                ) : null}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmOpen(false)}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #111827", background: "white", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={doNextDrawConfirmed}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "white", cursor: "pointer" }}
              >
                Draw now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
      }
