// lib/download.ts
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;

  // Helps some mobile browsers
  a.rel = "noopener";
  a.style.display = "none";

  document.body.appendChild(a);

  // Must happen in the same tick as user gesture when possible
  a.click();

  // Cleanup
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {}
    try {
      a.remove();
    } catch {}
  }, 1500); // critical: don't revoke immediately on Android Chrome
}
