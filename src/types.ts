// ---------------------------------------------------------------------------
// Core domain types for Mapwright.
// ---------------------------------------------------------------------------

export type RGB = readonly [number, number, number];

/**
 * Minecraft map "brightness" (shade) levels. Verified against MapColor.Brightness:
 *   id 0 = LOW    (×180)  — block is LOWER than its north neighbour  → "dark"
 *   id 1 = NORMAL (×220)  — block is the SAME height                 → "normal" (flat maps use this)
 *   id 2 = HIGH   (×255)  — block is HIGHER than its north neighbour → "light"
 *   id 3 = LOWEST (×135)  — water-depth special; not used for solid staircasing
 */
export type BrightnessId = 0 | 1 | 2 | 3;
export const BRIGHTNESS_MULTIPLIER = [180, 220, 255, 135] as const;
/** The three shades reachable by staircasing solid blocks, in dark→light order. */
export const STAIRCASE_SHADES: BrightnessId[] = [0, 1, 2];
export const FLAT_SHADE: BrightnessId = 1;

/** A candidate block that produces a given map base color. */
export interface BlockOption {
  /** Namespaced id, e.g. "minecraft:white_wool". */
  id: string;
  /** Human-friendly label, e.g. "White Wool". */
  label: string;
  /** Relative path (under /data/textures/<version>/) to the representative face texture. */
  texture: string;
  /** Affected by gravity (sand/gravel/concrete powder/anvil) — needs support under it. */
  gravity: boolean;
  /** Non-occluding / see-through (glass, ice, slabs as full?, leaves) — needs support. */
  transparent: boolean;
  /** A full opaque cube suitable for flat map art without supports. */
  fullCube: boolean;
  /** Source-derived rarity ("common" | "uncommon" | "rare" | "epic"). */
  rarity?: string;
  /** Max stack size (usually 64). */
  stackSize?: number;
  /** Cheap heuristic cost score (lower = easier to obtain) used by presets/optimizer. */
  cost?: number;
}

/** One of Minecraft's map base colors plus the blocks that can produce it. */
export interface MapBaseColor {
  /** Base color id (0..N). 0 is always transparent/none. */
  id: number;
  /** MapColor enum name from mc-datahub, e.g. "grass", "color_orange". */
  name: string;
  /** Human label, e.g. "Grass". */
  label: string;
  /** The raw MapColor value (== the ×255 variant), floored ints. */
  baseRgb: RGB;
  /** The 4 shade variants, indexed by BrightnessId. */
  shades: RGB[];
  /** Blocks that map to this base color, best-first. Empty for NONE. */
  blocks: BlockOption[];
}

export interface PaletteData {
  version: string;
  /** Minecraft data version for schematic headers. */
  dataVersion: number;
  /** Texture directory served under /data/textures/<version>/. */
  textureBase: string;
  colors: MapBaseColor[];
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export type DitherMethod =
  | "none"
  | "floyd-steinberg"
  | "atkinson"
  | "bayer2x2"
  | "bayer4x4"
  | "stucki"
  | "burkes"
  | "sierra-lite";

export type ColorMetric = "lab" | "ciede2000" | "rgb";

export type BuildMode = "flat" | "staircase";
export type StaircaseMode = "classic" | "valley" | "fullLight" | "fullDark";
export type SupportMode = "none" | "important" | "allOptimized";

export type SizeMode = "maps" | "free";

export interface ImageAdjustments {
  brightness: number; // -100..100
  contrast: number; // -100..100
  saturation: number; // -100..100
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  /** Background color for transparent pixels (hex), or null to keep transparent → NONE. */
  background: string | null;
}

export interface Settings {
  version: string;

  sizeMode: SizeMode;
  mapsWide: number; // maps along X
  mapsTall: number; // maps along Z
  freeWidth: number; // blocks (free mode)
  freeHeight: number; // blocks (free mode)

  adjust: ImageAdjustments;

  dither: DitherMethod;
  ditherStrength: number; // 0..100
  metric: ColorMetric;

  buildMode: BuildMode;
  staircaseMode: StaircaseMode;
  supportMode: SupportMode;
  /** Vanilla overworld build ceiling used for validation. */
  worldTop: number;

  /** Per base-color block override: baseColorId -> blockId. */
  blockChoices: Record<number, string>;
  /** Base color ids the user excluded (matched to nearest enabled instead). */
  excludedColors: number[];
}

export const MAP_SIZE = 128; // pixels (blocks) per single map

export const DEFAULT_ADJUST: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  rotate: 0,
  flipH: false,
  flipV: false,
  background: null,
};

export const DEFAULT_SETTINGS: Settings = {
  version: "26.1.1",
  sizeMode: "maps",
  mapsWide: 1,
  mapsTall: 1,
  freeWidth: MAP_SIZE,
  freeHeight: MAP_SIZE,
  adjust: { ...DEFAULT_ADJUST },
  dither: "floyd-steinberg",
  ditherStrength: 100,
  metric: "lab",
  buildMode: "staircase",
  staircaseMode: "valley",
  supportMode: "important",
  worldTop: 319,
  blockChoices: {},
  excludedColors: [],
};
