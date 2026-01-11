// lib/cardShare.ts

export type SharedCardPayload = {
  v: 1;
  packId: string;
  cardId: string;
  grid: string[][];
  title?: string;
  sponsorName?: string;
};

function b64EncodeUnicode(str: string) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

function b64DecodeUnicode(b64: string) {
  const bin = atob(b64);
  const esc = Array.from(bin, (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(
    ""
  );
  return decodeURIComponent(esc);
}

export function encodeCardPayload(payload: SharedCardPayload) {
  const json = JSON.stringify(payload);
  return b64EncodeUnicode(json);
}

export function decodeCardPayload(raw: string): SharedCardPayload | null {
  try {
    const json = b64DecodeUnicode(raw);
    const obj = JSON.parse(json) as SharedCardPayload;

    if (!obj || obj.v !== 1) return null;
    if (!obj.packId || !obj.cardId) return null;
    if (!Array.isArray(obj.grid)) return null;

    return obj;
  } catch {
    return null;
  }
}
