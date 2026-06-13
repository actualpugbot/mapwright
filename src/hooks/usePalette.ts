import { useEffect, useState } from "react";
import { loadPalette, type LoadedPalette } from "@/mapart/palette";

const cache = new Map<string, Promise<LoadedPalette>>();

/** Load (and cache) the block palette for a Minecraft version. */
export function usePalette(version: string) {
  const [palette, setPalette] = useState<LoadedPalette | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    if (!cache.has(version)) cache.set(version, loadPalette(version));
    cache
      .get(version)!
      .then((p) => alive && setPalette(p))
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
        cache.delete(version);
      });
    return () => {
      alive = false;
    };
  }, [version]);

  return { palette, error };
}
