import { useCallback, useRef, useState } from "react";
import { useProject } from "@/state/projectStore";
import { loadImageFromFile, loadImageFromUrl } from "@/lib/image";

interface ImageDropzoneProps {
  variant?: "full" | "compact";
}

export function ImageDropzone({ variant = "full" }: ImageDropzoneProps) {
  const setSource = useProject((s) => s.setSource);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);
      try {
        setSource(await loadImageFromFile(file));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load image");
      } finally {
        setBusy(false);
      }
    },
    [setSource],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file?.type.startsWith("image/")) void handleFile(file);
      else if (file) setError("That file isn't an image.");
    },
    [handleFile],
  );

  const loadUrl = useCallback(async () => {
    if (!url.trim()) return;
    setError(null);
    setBusy(true);
    try {
      setSource(await loadImageFromUrl(url.trim()));
      setUrl("");
    } catch {
      setError("Couldn't fetch that URL (the site may block cross-origin loads).");
    } finally {
      setBusy(false);
    }
  }, [url, setSource]);

  const compact = variant === "compact";

  return (
    <div className={compact ? "" : "flex w-full max-w-lg flex-col items-stretch gap-4"}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={[
          "group flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed text-center transition-colors",
          compact ? "px-4 py-5" : "px-8 py-12",
          dragging
            ? "border-accent bg-accent/10"
            : "border-ink-600 hover:border-ink-500 hover:bg-ink-800/40",
        ].join(" ")}
      >
        <div className="rounded-xl border border-ink-600/70 bg-ink-900/60 p-3 text-ink-300 transition-colors group-hover:text-accent-glow">
          <UploadIcon />
        </div>
        <div>
          <div className={compact ? "text-sm font-medium" : "text-lg font-semibold"}>
            {busy ? "Loading…" : dragging ? "Drop it" : "Drop an image"}
          </div>
          {!compact && (
            <div className="mt-1 text-sm text-ink-400">
              or click to browse · paste from clipboard · PNG, JPG, WebP, GIF
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
      </button>

      <div className="flex items-center gap-2">
        <input
          type="url"
          value={url}
          placeholder="…or paste an image URL"
          className="field"
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadUrl()}
        />
        <button
          type="button"
          className="btn-ghost shrink-0"
          onClick={loadUrl}
          disabled={busy || !url.trim()}
        >
          Load
        </button>
      </div>

      {!compact && (
        <button
          type="button"
          className="self-center text-xs text-ink-400 underline-offset-2 hover:text-accent-glow hover:underline"
          onClick={async () => {
            setBusy(true);
            try {
              setSource(
                await loadImageFromUrl(`${import.meta.env.BASE_URL}sample.png`),
              );
            } catch {
              setError("Couldn't load the example image.");
            } finally {
              setBusy(false);
            }
          }}
        >
          or try an example image
        </button>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 16V4m0 0 4 4m-4-4L8 8M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
