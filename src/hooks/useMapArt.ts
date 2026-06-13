import { useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "@/state/projectStore";
import { usePalette } from "@/hooks/usePalette";
import { renderMapArt, type MapArtResult } from "@/mapart/render";
import { buildPlan } from "@/mapart/staircase";

export type RenderStatus = "idle" | "rendering" | "ready";

/**
 * Recompute the map-art index map whenever the source image or settings change
 * (debounced for smooth slider drags). Stale results are dropped via a sequence
 * guard.
 */
export function useMapArt() {
  const source = useProject((s) => s.source);
  const settings = useProject((s) => s.settings);
  const { palette, error } = usePalette(settings.version);

  const [result, setResult] = useState<MapArtResult | null>(null);
  const [status, setStatus] = useState<RenderStatus>("idle");
  const seq = useRef(0);

  useEffect(() => {
    if (!source || !palette) {
      setResult(null);
      setStatus("idle");
      return;
    }
    const my = ++seq.current;
    setStatus("rendering");
    const timer = setTimeout(() => {
      renderMapArt(source.bitmap, settings, palette)
        .then((r) => {
          if (my === seq.current) {
            setResult(r);
            setStatus("ready");
          }
        })
        .catch(() => {
          if (my === seq.current) setStatus("idle");
        });
    }, 120);
    return () => clearTimeout(timer);
  }, [source, palette, settings]);

  // Derive the 3D build plan from the quantized result (cheap, memoized).
  const plan = useMemo(
    () => (result && palette ? buildPlan(result, palette, settings) : null),
    [result, palette, settings],
  );

  return { result, status, palette, error, plan };
}
