import type { BlockInfo } from "@/mapart/palette";

export interface Acquisition {
  method: string;
  renewable: boolean;
}

interface Rule {
  test: (id: string) => boolean;
  method: string;
  renewable: boolean;
}

const has = (...needles: string[]) => (id: string) => needles.some((n) => id.includes(n));
const ends = (...sfx: string[]) => (id: string) => sfx.some((s) => id.endsWith(s));

// Ordered: first match wins.
const RULES: Rule[] = [
  { test: ends("_wool"), method: "Shear sheep (dye + craft from wool/string)", renewable: true },
  { test: ends("_carpet"), method: "Craft from wool", renewable: true },
  { test: has("concrete_powder"), method: "Sand + gravel + dye", renewable: false },
  { test: has("concrete"), method: "Concrete powder + water", renewable: false },
  { test: has("glazed_terracotta"), method: "Smelt dyed terracotta", renewable: false },
  { test: has("terracotta"), method: "Dye + smelt clay", renewable: false },
  { test: has("stained_glass"), method: "Glass + dye", renewable: false },
  { test: has("glass"), method: "Smelt sand", renewable: false },
  { test: ends("_planks"), method: "Craft from logs (tree farm)", renewable: true },
  { test: has("mushroom"), method: "Bonemeal mushrooms", renewable: true },
  { test: has("snow"), method: "Snowballs (snow golem farm)", renewable: true },
  { test: has("packed_ice", "blue_ice", "ice"), method: "Freeze water", renewable: true },
  { test: has("iron_block"), method: "Iron farm → 9 ingots", renewable: true },
  { test: has("gold_block"), method: "Gold (piglin/zombified) → 9 ingots", renewable: true },
  { test: has("copper_block", "copper"), method: "Mine + smelt copper", renewable: true },
  { test: has("diamond_block"), method: "Mine 9 diamonds", renewable: false },
  { test: has("emerald_block"), method: "Villager trades", renewable: true },
  { test: has("lapis"), method: "Mine lapis", renewable: false },
  { test: has("redstone_block"), method: "Mine + craft redstone", renewable: true },
  { test: has("netherrack", "nether_brick", "nether_wart", "crimson", "warped", "magma", "soul"), method: "Gather in the Nether", renewable: false },
  { test: has("prismarine", "sea_lantern"), method: "Ocean monument", renewable: false },
  { test: has("quartz"), method: "Mine nether quartz", renewable: false },
  { test: has("deepslate", "tuff", "calcite", "amethyst"), method: "Mine (deep underground)", renewable: false },
  { test: has("sand", "sandstone"), method: "Dig sand (desert / beach)", renewable: false },
  { test: ends("water"), method: "Water bucket", renewable: true },
  { test: has("dirt", "podzol", "mycelium", "grass_block", "mud", "clay"), method: "Dig / collect", renewable: false },
  { test: has("stone", "cobble", "andesite", "diorite", "granite", "basalt", "blackstone"), method: "Mine (cobblestone generator)", renewable: true },
];

export function acquisition(blockId: string): Acquisition {
  const id = blockId.replace(/^minecraft:/, "");
  for (const r of RULES) if (r.test(id)) return { method: r.method, renewable: r.renewable };
  return { method: "Mine or craft", renewable: false };
}

export interface GatherSummary {
  totalBlocks: number;
  stacks: number;
  shulkers: number;
  /** Effort score = Σ cost × count (cheaper palette → lower). */
  effort: number;
  /** Fraction of blocks made of renewable materials (0..1). */
  renewablePct: number;
}

const STACK = 64;
const SHULKER = STACK * 27;

export function gatherSummary(
  mats: { blockId: string; count: number }[],
  lookup: Map<string, BlockInfo>,
): GatherSummary {
  let totalBlocks = 0;
  let stacks = 0;
  let shulkers = 0;
  let effort = 0;
  let renewable = 0;
  for (const m of mats) {
    totalBlocks += m.count;
    stacks += Math.ceil(m.count / STACK);
    shulkers += Math.ceil(m.count / SHULKER);
    effort += (lookup.get(m.blockId)?.cost ?? 1) * m.count;
    if (acquisition(m.blockId).renewable) renewable += m.count;
  }
  return {
    totalBlocks,
    stacks,
    shulkers,
    effort,
    renewablePct: totalBlocks ? renewable / totalBlocks : 0,
  };
}
