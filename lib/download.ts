// lib/download.ts (or paste into your page/component)
// Fixes Android/Chrome "Download error" by delaying revokeObjectURL.

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  // ✅ Do NOT revoke immediately on Android Chrome
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60_000);
}
