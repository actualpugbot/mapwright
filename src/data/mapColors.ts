import type { RGB } from "../types";
import { BRIGHTNESS_MULTIPLIER, type BrightnessId } from "../types";

/**
 * The 62 canonical Minecraft map base colors (MapColor / MaterialColor).
 * `rgb` is the raw `col` value (== the ×255 / HIGH shade). Index in the array
 * is the base color id; map color id on disk is `baseId * 4 + brightnessId`.
 *
 * Values are the well-known MaterialColor constants (Minecraft Wiki: Map item
 * format). mc-datahub gives us each block's `mapColor` *name*; this table turns
 * that name into RGB.
 */
export interface MapColorDef {
  id: number;
  name: string;
  label: string;
  rgb: RGB;
}

export const MAP_COLORS: readonly MapColorDef[] = [
  { id: 0, name: "none", label: "None", rgb: [0, 0, 0] },
  { id: 1, name: "grass", label: "Grass", rgb: [127, 178, 56] },
  { id: 2, name: "sand", label: "Sand", rgb: [247, 233, 163] },
  { id: 3, name: "wool", label: "Wool", rgb: [199, 199, 199] },
  { id: 4, name: "fire", label: "Fire", rgb: [255, 0, 0] },
  { id: 5, name: "ice", label: "Ice", rgb: [160, 160, 255] },
  { id: 6, name: "metal", label: "Metal", rgb: [167, 167, 167] },
  { id: 7, name: "plant", label: "Plant", rgb: [0, 124, 0] },
  { id: 8, name: "snow", label: "Snow", rgb: [255, 255, 255] },
  { id: 9, name: "clay", label: "Clay", rgb: [164, 168, 184] },
  { id: 10, name: "dirt", label: "Dirt", rgb: [151, 109, 77] },
  { id: 11, name: "stone", label: "Stone", rgb: [112, 112, 112] },
  { id: 12, name: "water", label: "Water", rgb: [64, 64, 255] },
  { id: 13, name: "wood", label: "Wood", rgb: [143, 119, 72] },
  { id: 14, name: "quartz", label: "Quartz", rgb: [255, 252, 245] },
  { id: 15, name: "color_orange", label: "Orange", rgb: [216, 127, 51] },
  { id: 16, name: "color_magenta", label: "Magenta", rgb: [178, 76, 216] },
  { id: 17, name: "color_light_blue", label: "Light Blue", rgb: [102, 153, 216] },
  { id: 18, name: "color_yellow", label: "Yellow", rgb: [229, 229, 51] },
  { id: 19, name: "color_light_green", label: "Light Green", rgb: [127, 204, 25] },
  { id: 20, name: "color_pink", label: "Pink", rgb: [242, 127, 165] },
  { id: 21, name: "color_gray", label: "Gray", rgb: [76, 76, 76] },
  { id: 22, name: "color_light_gray", label: "Light Gray", rgb: [153, 153, 153] },
  { id: 23, name: "color_cyan", label: "Cyan", rgb: [76, 127, 153] },
  { id: 24, name: "color_purple", label: "Purple", rgb: [127, 63, 178] },
  { id: 25, name: "color_blue", label: "Blue", rgb: [51, 76, 178] },
  { id: 26, name: "color_brown", label: "Brown", rgb: [102, 76, 51] },
  { id: 27, name: "color_green", label: "Green", rgb: [102, 127, 51] },
  { id: 28, name: "color_red", label: "Red", rgb: [153, 51, 51] },
  { id: 29, name: "color_black", label: "Black", rgb: [25, 25, 25] },
  { id: 30, name: "gold", label: "Gold", rgb: [250, 238, 77] },
  { id: 31, name: "diamond", label: "Diamond", rgb: [92, 219, 213] },
  { id: 32, name: "lapis", label: "Lapis", rgb: [74, 128, 255] },
  { id: 33, name: "emerald", label: "Emerald", rgb: [0, 217, 58] },
  { id: 34, name: "podzol", label: "Podzol", rgb: [129, 86, 49] },
  { id: 35, name: "nether", label: "Nether", rgb: [112, 2, 0] },
  { id: 36, name: "terracotta_white", label: "Terracotta White", rgb: [209, 177, 161] },
  { id: 37, name: "terracotta_orange", label: "Terracotta Orange", rgb: [159, 82, 36] },
  { id: 38, name: "terracotta_magenta", label: "Terracotta Magenta", rgb: [149, 87, 108] },
  { id: 39, name: "terracotta_light_blue", label: "Terracotta Light Blue", rgb: [112, 108, 138] },
  { id: 40, name: "terracotta_yellow", label: "Terracotta Yellow", rgb: [186, 133, 36] },
  { id: 41, name: "terracotta_light_green", label: "Terracotta Light Green", rgb: [103, 117, 53] },
  { id: 42, name: "terracotta_pink", label: "Terracotta Pink", rgb: [160, 77, 78] },
  { id: 43, name: "terracotta_gray", label: "Terracotta Gray", rgb: [57, 41, 35] },
  { id: 44, name: "terracotta_light_gray", label: "Terracotta Light Gray", rgb: [135, 107, 98] },
  { id: 45, name: "terracotta_cyan", label: "Terracotta Cyan", rgb: [87, 92, 92] },
  { id: 46, name: "terracotta_purple", label: "Terracotta Purple", rgb: [122, 73, 88] },
  { id: 47, name: "terracotta_blue", label: "Terracotta Blue", rgb: [76, 62, 92] },
  { id: 48, name: "terracotta_brown", label: "Terracotta Brown", rgb: [76, 50, 35] },
  { id: 49, name: "terracotta_green", label: "Terracotta Green", rgb: [76, 82, 42] },
  { id: 50, name: "terracotta_red", label: "Terracotta Red", rgb: [142, 60, 46] },
  { id: 51, name: "terracotta_black", label: "Terracotta Black", rgb: [37, 22, 16] },
  { id: 52, name: "crimson_nylium", label: "Crimson Nylium", rgb: [189, 48, 49] },
  { id: 53, name: "crimson_stem", label: "Crimson Stem", rgb: [148, 63, 97] },
  { id: 54, name: "crimson_hyphae", label: "Crimson Hyphae", rgb: [92, 25, 29] },
  { id: 55, name: "warped_nylium", label: "Warped Nylium", rgb: [22, 126, 134] },
  { id: 56, name: "warped_stem", label: "Warped Stem", rgb: [58, 142, 140] },
  { id: 57, name: "warped_hyphae", label: "Warped Hyphae", rgb: [86, 44, 62] },
  { id: 58, name: "warped_wart_block", label: "Warped Wart", rgb: [20, 180, 133] },
  { id: 59, name: "deepslate", label: "Deepslate", rgb: [100, 100, 100] },
  { id: 60, name: "raw_iron", label: "Raw Iron", rgb: [216, 175, 147] },
  { id: 61, name: "glow_lichen", label: "Glow Lichen", rgb: [127, 167, 150] },
];

export const MAP_COLOR_BY_NAME: Record<string, MapColorDef> = Object.fromEntries(
  MAP_COLORS.map((c) => [c.name, c]),
);

/**
 * Normalize mc-datahub's noisy `mapColor` names to canonical names.
 *
 * - Bare DyeColor names (concrete / concrete_powder / glazed_terracotta) →
 *   their DyeColor.getMapColor() equivalent.
 * - "white" maps to SNOW and "lime" to COLOR_LIGHT_GREEN, matching vanilla.
 */
export const MAP_COLOR_ALIASES: Record<string, string> = {
  white: "snow",
  orange: "color_orange",
  magenta: "color_magenta",
  light_blue: "color_light_blue",
  yellow: "color_yellow",
  lime: "color_light_green",
  pink: "color_pink",
  gray: "color_gray",
  light_gray: "color_light_gray",
  cyan: "color_cyan",
  purple: "color_purple",
  blue: "color_blue",
  brown: "color_brown",
  green: "color_green",
  red: "color_red",
  black: "color_black",
};

/** Dye prefixes used to recover stained_glass etc. from a block id. */
export const DYE_PREFIXES = Object.keys(MAP_COLOR_ALIASES);

/**
 * Resolve a (possibly noisy) mapColor name + block id to a canonical name,
 * or null if it can't be trusted.
 */
export function resolveMapColorName(
  rawMapColor: string | undefined,
  blockId: string,
): string | null {
  if (rawMapColor && MAP_COLOR_BY_NAME[rawMapColor]) return rawMapColor;
  if (rawMapColor && MAP_COLOR_ALIASES[rawMapColor]) {
    return MAP_COLOR_ALIASES[rawMapColor];
  }
  // Noisy ("color"/"olor"/…): recover from a dye prefix in the block name.
  const id = blockId.replace(/^minecraft:/, "");
  for (const dye of DYE_PREFIXES) {
    if (id.startsWith(dye + "_")) return MAP_COLOR_ALIASES[dye];
  }
  return null;
}

/** Compute one shade variant of a base color (floored per channel). */
export function shadeRgb(base: RGB, brightnessId: BrightnessId): RGB {
  const m = BRIGHTNESS_MULTIPLIER[brightnessId];
  return [
    Math.floor((base[0] * m) / 255),
    Math.floor((base[1] * m) / 255),
    Math.floor((base[2] * m) / 255),
  ];
}

/** All four shade variants of a base color, indexed by BrightnessId. */
export function allShades(base: RGB): RGB[] {
  return [0, 1, 2, 3].map((b) => shadeRgb(base, b as BrightnessId));
}
