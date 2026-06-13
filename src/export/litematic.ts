import type { BuildPlan } from "../mapart/buildPlan";
import {
  encodeNbt,
  nCompound,
  nInt,
  nIntXYZ,
  nList,
  nLong,
  nLongArray,
  nStr,
  TAG,
  type NbtTag,
} from "./nbt";
import { bitsPerEntry, packBlockStates } from "./litematicaBitArray";

export interface LitematicOptions {
  name: string;
  author: string;
  description: string;
  dataVersion: number;
  regionName?: string;
  /** Epoch milliseconds (caller supplies; keeps this pure/testable). */
  now?: number;
}

const AIR = "minecraft:air";

/**
 * Flatten a BuildPlan into a Litematica `.litematic` (gzip NBT) byte array.
 * Single region. Index stride within the region is y*(w*l) + z*w + x; palette
 * index 0 is always air.
 */
export function buildLitematic(plan: BuildPlan, opts: LitematicOptions): Uint8Array {
  const { width: W, height: H, length: L } = plan;
  const volume = W * H * L;

  // 1. Palette (index 0 = air).
  const palette: string[] = [AIR];
  const paletteIndex = new Map<string, number>([[AIR, 0]]);
  const idxOf = (id: string): number => {
    let i = paletteIndex.get(id);
    if (i === undefined) {
      i = palette.length;
      palette.push(id);
      paletteIndex.set(id, i);
    }
    return i;
  };

  // 2. Block grid (default air).
  const grid = new Int32Array(volume); // 0 = air
  const layerStride = W * L;
  let nonAir = 0;
  for (let p = 0; p < plan.surfaceY.length; p++) {
    const ys = plan.surfaceY[p];
    if (ys >= 0) {
      const blockId = plan.blockByColor.get(plan.colorId[p]);
      if (blockId) {
        grid[ys * layerStride + p] = idxOf(blockId);
        nonAir++;
      }
    }
    const yu = plan.supportY[p];
    if (yu >= 0) {
      grid[yu * layerStride + p] = idxOf(plan.supportBlockId);
      nonAir++;
    }
  }

  // 3. Pack.
  const nbits = bitsPerEntry(palette.length);
  const longs = packBlockStates(grid, nbits);

  // 4. Assemble NBT.
  const now = BigInt(opts.now ?? Date.now());
  const regionName = opts.regionName ?? (opts.name || "Main");

  const region: NbtTag = nCompound({
    Position: nIntXYZ(0, 0, 0),
    Size: nIntXYZ(W, H, L),
    BlockStatePalette: nList(
      TAG.Compound,
      palette.map((id) => nCompound({ Name: nStr(id) })),
    ),
    BlockStates: nLongArray(longs),
    Entities: nList(TAG.Compound, []),
    TileEntities: nList(TAG.Compound, []),
    PendingBlockTicks: nList(TAG.Compound, []),
    PendingFluidTicks: nList(TAG.Compound, []),
  });

  const metadata: NbtTag = nCompound({
    Name: nStr(opts.name),
    Author: nStr(opts.author),
    Description: nStr(opts.description),
    RegionCount: nInt(1),
    TimeCreated: nLong(now),
    TimeModified: nLong(now),
    EnclosingSize: nIntXYZ(W, H, L),
    TotalVolume: nInt(volume),
    TotalBlocks: nInt(nonAir),
    Software: nStr("Mapwright"),
  });

  const root: NbtTag = nCompound({
    MinecraftDataVersion: nInt(opts.dataVersion),
    Version: nInt(6),
    SubVersion: nInt(1),
    Metadata: metadata,
    Regions: nCompound({ [regionName]: region }),
  });

  return encodeNbt(root, "");
}
