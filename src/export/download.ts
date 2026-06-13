/** Trigger a browser download of raw bytes. */
export function saveBytes(
  bytes: Uint8Array,
  filename: string,
  mime = "application/octet-stream",
): void {
  // Copy into a fresh ArrayBuffer so Blob gets a clean, non-shared buffer.
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const blob = new Blob([copy], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Trigger a browser download of a Blob. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Trigger a browser download of text. */
export function saveText(text: string, filename: string, mime = "text/plain"): void {
  saveBlob(new Blob([text], { type: mime }), filename);
}

/** Strip a file extension and any path, for use as an export base name. */
export function baseName(name: string): string {
  return (name.split(/[\\/]/).pop() || "mapart").replace(/\.[^.]+$/, "") || "mapart";
}
