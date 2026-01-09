"use client";

export type BingoCard = {
  id: string;
  grid: string[][];
};

function safeFileName(s: string) {
  const out = (s || "").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_");
  return out || "bingo-card";
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }, 15000);
}

export async function downloadSingleCardPdf(payload: {
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string;
  sponsorLogoUrl?: string;
  card: BingoCard;
}) {
  const res = await fetch("/api/card-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`card-pdf failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const blob = await res.blob();

  // Quick sanity: if we got a tiny "error" response as a blob
  if (blob.size < 800) {
    const t = await blob.text().catch(() => "");
    throw new Error(`card-pdf returned tiny blob (${blob.size}): ${t.slice(0, 300)}`);
  }

  const filename = `${safeFileName(payload.title || "bingo-card")}-${payload.card.id}.pdf`;
  downloadBlob(filename, blob);
}
