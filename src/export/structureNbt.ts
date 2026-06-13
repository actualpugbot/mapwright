import { forEachBlock, type BuildPlan } from "../mapart/buildPlan";
import { encodeNbt, nCompound, nInt, nList, nStr, TAG, type NbtTag } from "./nbt";

/**
 * Vanilla structure-block `.nbt` (the format structure blocks / `/place`
 * read). One entry per placed block. Loadable by most schematic tools.
 */
export function buildStructureNbt(plan: BuildPlan, dataVersion: number): Uint8Array {
  const palette: string[] = [];
  const map = new Map<string, number>();
  const idx = (id: string) => {
    let i = map.get(id);
    if (i === undefined) {
      i = palette.length;
      palette.push(id);
      map.set(id, i);
    }
    return i;
  };

  const blocks: NbtTag[] = [];
  forEachBlock(plan, (x, y, z, id) => {
    blocks.push(
      nCompound({
        state: nInt(idx(id)),
        pos: nList(TAG.Int, [nInt(x), nInt(y), nInt(z)]),
      }),
    );
  });

  const root = nCompound({
    DataVersion: nInt(dataVersion),
    size: nList(TAG.Int, [nInt(plan.width), nInt(plan.height), nInt(plan.length)]),
    palette: nList(
      TAG.Compound,
      palette.map((id) => nCompound({ Name: nStr(id) })),
    ),
    blocks: nList(TAG.Compound, blocks),
    entities: nList(TAG.Compound, []),
  });

  return encodeNbt(root, "");
}
