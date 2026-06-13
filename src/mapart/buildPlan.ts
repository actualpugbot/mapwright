/**
 * The BuildPlan data model + pure helpers. Kept free of DOM / palette imports
 * so exporters and Node validation scripts can use it directly.
 */

/** Cheap, common full cube used to prop up gravity / transparent blocks. */
export const DEFAULT_SUPPORT_BLOCK = "minecraft:cobblestone";

/** Sentinel for "no block at this cell" in the per-cell arrays. */
export const NONE = -1;

export interface BuildPlan {
  width: number; // x extent (image width)
  length: number; // z extent (image height, north→south)
  height: number; // y extent (number of layers)

  // Per-cell arrays, index = z * width + x.
  surfaceY: Int32Array; // y of the visible block; -1 = no block (transparent)
  colorId: Int16Array; // base map colour id of the visible block; -1 = none
  brightnessId: Uint8Array; // shade 0..3
  supportY: Int32Array; // y of the support block, or -1

  blockByColor: Map<number, string>; // colorId → chosen block id
  supportBlockId: string;

  peakHeight: number; // tallest column (layers)
  worldFits: boolean; // peakHeight ≤ world span
  visibleCount: number;
  supportCount: number;
}

/** Visit every placed (non-air) block in the plan. */
export function forEachBlock(
  plan: BuildPlan,
  cb: (x: number, y: number, z: number, blockId: string, isSupport: boolean) => void,
): void {
  const W = plan.width;
  for (let p = 0; p < plan.surfaceY.length; p++) {
    const x = p % W;
    const z = (p / W) | 0;
    const ys = plan.surfaceY[p];
    if (ys >= 0) {
      const id = plan.blockByColor.get(plan.colorId[p]);
      if (id) cb(x, ys, z, id, false);
    }
    const yu = plan.supportY[p];
    if (yu >= 0) cb(x, yu, z, plan.supportBlockId, true);
  }
}

/** Aggregate block counts for the materials list, most-used first. */
export function materials(plan: BuildPlan): { blockId: string; count: number }[] {
  const counts = new Map<string, number>();
  const add = (id: string) => counts.set(id, (counts.get(id) ?? 0) + 1);
  for (let p = 0; p < plan.surfaceY.length; p++) {
    if (plan.surfaceY[p] !== NONE) {
      const id = plan.blockByColor.get(plan.colorId[p]);
      if (id) add(id);
    }
    if (plan.supportY[p] !== NONE) add(plan.supportBlockId);
  }
  return [...counts.entries()]
    .map(([blockId, count]) => ({ blockId, count }))
    .sort((a, b) => b.count - a.count);
}
