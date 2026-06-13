import { forEachBlock, type BuildPlan } from "../mapart/buildPlan";
import {
  encodeNbt,
  nByteArray,
  nCompound,
  nInt,
  nIntArray,
  nShort,
  nStr,
  type NbtTag,
} from "./nbt";

const AIR = "minecraft:air";

/**
 * WorldEdit "Sponge schematic" v2 (`.schem`). Palette maps blockstate strings
 * to ints; BlockData is unsigned-varint palette indices in YZX order.
 */
export function buildSponge(plan: BuildPlan, dataVersion: number): Uint8Array {
  const W = plan.width;
  const H = plan.height;
  const L = plan.length;

  const palette: Record<string, NbtTag> = { [AIR]: nInt(0) };
  const ids: string[] = [AIR];
  const indexOf = (id: string) => {
    let i = ids.indexOf(id);
    if (i < 0) {
      i = ids.length;
      ids.push(id);
      palette[id] = nInt(i);
    }
    return i;
  };

  // Dense grid (YZX order), default air.
  const grid = new Int32Array(W * H * L); // 0 = air
  forEachBlock(plan, (x, y, z, id) => {
    grid[(y * L + z) * W + x] = indexOf(id);
  });

  // Varint-encode (unsigned LEB128).
  const bytes: number[] = [];
  for (let i = 0; i < grid.length; i++) {
    let v = grid[i];
    do {
      let b = v & 0x7f;
      v >>>= 7;
      if (v !== 0) b |= 0x80;
      bytes.push(b);
    } while (v !== 0);
  }

  const root = nCompound({
    Version: nInt(2),
    DataVersion: nInt(dataVersion),
    Width: nShort(W),
    Height: nShort(H),
    Length: nShort(L),
    Offset: nIntArray([0, 0, 0]),
    PaletteMax: nInt(ids.length),
    Palette: nCompound(palette),
    BlockData: nByteArray(Uint8Array.from(bytes)),
    Metadata: nCompound({ Name: nStr("Mapwright") }),
  });

  return encodeNbt(root, "Schematic");
}
