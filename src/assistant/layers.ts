import type { BuildPlan } from "@/mapart/buildPlan";
import { forEachBlock } from "@/mapart/buildPlan";
import type { LoadedPalette } from "@/mapart/palette";

const SUPPORT_RGB: [number, number, number] = [120, 120, 120];
const BUILT_RGB: [number, number, number] = [58, 64, 72];

/** Layer indices (Y) that actually contain blocks, ascending (build order). */
export function nonEmptyLayers(plan: BuildPlan): number[] {
  const present = new Set<number>();
  forEachBlock(plan, (_x, y) => present.add(y));
  return [...present].sort((a, b) => a - b);
}

/** Block counts for a single Y layer, most-used first. */
export function layerMaterials(
  plan: BuildPlan,
  y: number,
): { blockId: string; count: number }[] {
  const counts = new Map<string, number>();
  forEachBlock(plan, (_x, by, _z, id) => {
    if (by === y) counts.set(id, (counts.get(id) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([blockId, count]) => ({ blockId, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Top-down image of one layer: blocks placed AT this Y are bright, blocks
 * already built BELOW are dimmed for context, everything else transparent.
 */
export function layerImageData(
  plan: BuildPlan,
  palette: LoadedPalette,
  y: number,
): ImageData {
  const { width: W, length: L } = plan;
  const data = new Uint8ClampedArray(W * L * 4);
  for (let p = 0; p < W * L; p++) {
    const o = p * 4;
    const sy = plan.surfaceY[p];
    const uy = plan.supportY[p];
    let rgb: readonly [number, number, number] | null = null;
    let alpha = 255;

    if (sy === y) {
      const c = palette.byId.get(plan.colorId[p]);
      rgb = c ? c.shades[plan.brightnessId[p]] : null;
    } else if (uy === y) {
      rgb = SUPPORT_RGB;
    } else if ((sy >= 0 && sy < y) || (uy >= 0 && uy < y)) {
      rgb = BUILT_RGB;
      alpha = 150;
    }

    if (rgb) {
      data[o] = rgb[0];
      data[o + 1] = rgb[1];
      data[o + 2] = rgb[2];
      data[o + 3] = alpha;
    }
  }
  return new ImageData(data, W, L);
}

/** Blocks placed up to and including layer Y, vs total. */
export function progressUpTo(plan: BuildPlan, y: number): { done: number; total: number } {
  let done = 0;
  let total = 0;
  forEachBlock(plan, (_x, by) => {
    total++;
    if (by <= y) done++;
  });
  return { done, total };
}
