// lib/download.ts
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);

  // Must happen from a user gesture (button click handler calls this)
  a.click();

  // Do NOT revoke immediately on Android Chrome
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 30_000); // 30s is safe
}
