import type { Settings } from "@/types";
import type { MapArtResult } from "@/mapart/render";
import { chosenBlock, type LoadedPalette } from "@/mapart/palette";
import { DEFAULT_SUPPORT_BLOCK, NONE, type BuildPlan } from "@/mapart/buildPlan";

export type { BuildPlan } from "@/mapart/buildPlan";
export { DEFAULT_SUPPORT_BLOCK, forEachBlock, materials } from "@/mapart/buildPlan";

/** Vanilla overworld build span (worldTop 319 down to -64) = 384 blocks. */
const WORLD_SPAN = 384;

function deltaFor(brightnessId: number): number {
  // 0 = lower than north (dark), 1 = same (normal), 2 = higher (light)
  if (brightnessId === 0) return -1;
  if (brightnessId === 2) return 1;
  return 0;
}

/**
 * Turn a quantized map-art result into a 3D build plan: assign a Y to every
 * visible block so the staircasing rule reproduces the chosen shades, insert
 * support blocks, and normalize to a non-negative, minimal-height layout.
 */
export function buildPlan(
  result: MapArtResult,
  palette: LoadedPalette,
  settings: Settings,
): BuildPlan {
  const W = result.width;
  const L = result.height;
  const n = W * L;

  const colorId = new Int16Array(n).fill(NONE);
  const brightnessId = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    const idx = result.index[p];
    if (idx < 0) continue;
    const t = result.targets[idx];
    colorId[p] = t.colorId;
    brightnessId[p] = t.brightnessId;
  }

  // Resolve the chosen block + flags per colour once.
  const blockByColor = new Map<number, string>();
  const gravityByColor = new Map<number, boolean>();
  const transparentByColor = new Map<number, boolean>();
  for (const color of palette.colors) {
    const b = chosenBlock(color, settings);
    if (b) {
      blockByColor.set(color.id, b.id);
      gravityByColor.set(color.id, b.gravity);
      transparentByColor.set(color.id, b.transparent);
    }
  }

  const surfaceY = new Int32Array(n).fill(NONE);
  const supportY = new Int32Array(n).fill(NONE);

  const staircaseMode = settings.buildMode === "staircase" ? settings.staircaseMode : null;
  const perColumnNormalize = staircaseMode !== "classic"; // valley/light/dark = compact

  // 1. Per-column cumulative heights (relative to a noobline at 0).
  let globalMin = 0;
  let globalMax = 0;
  for (let x = 0; x < W; x++) {
    let h = 0;
    let started = false;
    let colMin = Infinity;
    for (let z = 0; z < L; z++) {
      const p = z * W + x;
      if (colorId[p] < 0) continue; // transparent: no block, height carries
      h = started ? h + deltaFor(brightnessId[p]) : deltaFor(brightnessId[p]);
      started = true;
      surfaceY[p] = h;
      if (h < colMin) colMin = h;
    }
    if (perColumnNormalize && colMin !== Infinity) {
      // shift this column so its lowest block sits at y=0. Presence is keyed on
      // colorId (≥0), NOT surfaceY — a valid height can legitimately be -1, the
      // same value as the NONE sentinel, so testing surfaceY would drop it.
      for (let z = 0; z < L; z++) {
        const p = z * W + x;
        if (colorId[p] >= 0) surfaceY[p] -= colMin;
      }
    }
  }

  // 2. Support blocks. Track presence separately (supportY can be -1 too).
  const hasSupport = new Uint8Array(n);
  const needsSupport = (cid: number): boolean => {
    if (settings.supportMode === "none") return false;
    if (settings.supportMode === "allOptimized") return true;
    return Boolean(gravityByColor.get(cid) || transparentByColor.get(cid));
  };
  for (let p = 0; p < n; p++) {
    if (colorId[p] < 0) continue;
    if (needsSupport(colorId[p])) {
      supportY[p] = surfaceY[p] - 1;
      hasSupport[p] = 1;
    }
  }

  // 3. Global normalization → all Y ≥ 0. Keyed on colorId / hasSupport, never
  // on the height value (see note above).
  for (let p = 0; p < n; p++) {
    if (colorId[p] >= 0) {
      if (surfaceY[p] < globalMin) globalMin = surfaceY[p];
      if (surfaceY[p] > globalMax) globalMax = surfaceY[p];
    }
    if (hasSupport[p] && supportY[p] < globalMin) globalMin = supportY[p];
  }
  if (globalMin !== 0) {
    for (let p = 0; p < n; p++) {
      if (colorId[p] >= 0) surfaceY[p] -= globalMin;
      if (hasSupport[p]) supportY[p] -= globalMin;
    }
    globalMax -= globalMin;
  }

  // stats
  let visibleCount = 0;
  let supportCount = 0;
  for (let p = 0; p < n; p++) {
    if (colorId[p] >= 0) visibleCount++;
    if (hasSupport[p]) supportCount++;
  }
  const peakHeight = globalMax + 1;

  return {
    width: W,
    length: L,
    height: peakHeight,
    surfaceY,
    colorId,
    brightnessId,
    supportY,
    blockByColor,
    supportBlockId: DEFAULT_SUPPORT_BLOCK,
    peakHeight,
    worldFits: peakHeight <= WORLD_SPAN,
    visibleCount,
    supportCount,
  };
}
