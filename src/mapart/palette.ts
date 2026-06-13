import {
  STAIRCASE_SHADES,
  FLAT_SHADE,
  type BrightnessId,
  type RGB,
  type Settings,
} from "@/types";
import type { Lab } from "@/mapart/color";

// ---------------------------------------------------------------------------
// On-disk palette shape (produced by scripts/build-palette.ts)
// ---------------------------------------------------------------------------

export interface PaletteBlock {
  id: string;
  label: string;
  texture: string | null;
  gravity: boolean;
  transparent: boolean;
  fullCube: boolean;
  rarity: string;
  stackSize: number;
  cost: number;
}

export interface PaletteColor {
  id: number;
  name: string;
  label: string;
  baseRgb: RGB;
  shades: RGB[]; // indexed by BrightnessId
  lab: Lab[]; // indexed by BrightnessId
  blocks: PaletteBlock[];
}

export interface LoadedPalette {
  version: string;
  dataVersion: number;
  textureBase: string;
  colors: PaletteColor[];
  byId: Map<number, PaletteColor>;
}

export async function loadPalette(version: string): Promise<LoadedPalette> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/palette-${version}.json`);
  if (!res.ok) throw new Error(`Missing palette for version ${version}`);
  const raw = (await res.json()) as Omit<LoadedPalette, "byId">;
  return { ...raw, byId: new Map(raw.colors.map((c) => [c.id, c])) };
}

// ---------------------------------------------------------------------------
// Match targets — the candidate (colour, shade) swatches the quantizer picks
// from, given current settings.
// ---------------------------------------------------------------------------

export interface MatchTarget {
  colorId: number;
  brightnessId: BrightnessId;
  rgb: RGB;
  lab: Lab;
}

/** Resolve a texture filename to a servable URL (honours Vite base path). */
export function textureUrl(palette: LoadedPalette, texture: string | null): string | null {
  if (!texture) return null;
  return `${import.meta.env.BASE_URL}data/textures/${palette.version}/${texture}`;
}

export interface BlockInfo {
  label: string;
  texture: string | null;
  rgb: RGB; // representative (normal-shade) colour for the swatch
  cost: number;
  rarity: string;
  gravity: boolean;
  transparent: boolean;
}

/** Map every candidate block id → display info, for materials lists. */
export function blockLookup(palette: LoadedPalette): Map<string, BlockInfo> {
  const map = new Map<string, BlockInfo>();
  for (const color of palette.colors) {
    for (const b of color.blocks) {
      if (!map.has(b.id)) {
        map.set(b.id, {
          label: b.label,
          texture: b.texture,
          rgb: color.shades[1],
          cost: b.cost,
          rarity: b.rarity,
          gravity: b.gravity,
          transparent: b.transparent,
        });
      }
    }
  }
  return map;
}

/** The block chosen for a base colour given current overrides (or null). */
export function chosenBlock(
  color: PaletteColor,
  settings: Settings,
): PaletteBlock | null {
  const override = settings.blockChoices[color.id];
  if (override) {
    const found = color.blocks.find((b) => b.id === override);
    if (found) return found;
  }
  return color.blocks[0] ?? null;
}

/**
 * Build the set of (colour, shade) targets the quantizer matches against,
 * honouring build mode (flat = 1 shade, staircase = 3), excluded colours, and
 * colours that have no usable block.
 */
export function buildMatchTargets(
  palette: LoadedPalette,
  settings: Settings,
): MatchTarget[] {
  const excluded = new Set(settings.excludedColors);
  const shades: BrightnessId[] =
    settings.buildMode === "staircase" ? STAIRCASE_SHADES : [FLAT_SHADE];

  const targets: MatchTarget[] = [];
  for (const color of palette.colors) {
    if (excluded.has(color.id)) continue;
    if (!chosenBlock(color, settings)) continue;
    for (const b of shades) {
      targets.push({
        colorId: color.id,
        brightnessId: b,
        rgb: color.shades[b],
        lab: color.lab[b],
      });
    }
  }
  return targets;
}
