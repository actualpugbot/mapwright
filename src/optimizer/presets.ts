import type { LoadedPalette, PaletteBlock } from "@/mapart/palette";

/**
 * Block-selection presets — the practical form of the "cost optimizer". Each
 * preset picks, per base colour, the best candidate block under a constraint
 * (cheapest, no gravity, opaque-only, …). Colours keep their own colour, so
 * fidelity is preserved; only WHICH block realizes each colour changes.
 */
export interface Preset {
  id: string;
  label: string;
  desc: string;
  /** Choose a block id for a colour's candidates, or null to keep the default. */
  pick: (blocks: PaletteBlock[]) => string | null;
}

const cheapest = (blocks: PaletteBlock[]): PaletteBlock | undefined =>
  blocks.reduce<PaletteBlock | undefined>(
    (best, b) => (!best || b.cost < best.cost ? b : best),
    undefined,
  );

const FAMILY_ORDER = ["concrete", "wool", "terracotta", "planks"];
const familyRank = (id: string) => {
  const i = FAMILY_ORDER.findIndex((f) => id.includes(f));
  return i < 0 ? FAMILY_ORDER.length : i;
};

export const PRESETS: Preset[] = [
  {
    id: "default",
    label: "Recommended",
    desc: "Balanced default — solid, easy blocks",
    pick: () => null,
  },
  {
    id: "cheapest",
    label: "Cheapest",
    desc: "Lowest-effort block for every colour",
    pick: (b) => cheapest(b)?.id ?? null,
  },
  {
    id: "opaque",
    label: "No gravity / glass",
    desc: "Only solid, self-supporting blocks (no sand, glass, ice)",
    pick: (b) => {
      const safe = b.filter((x) => !x.gravity && !x.transparent);
      return cheapest(safe.length ? safe : b)?.id ?? null;
    },
  },
  {
    id: "vibrant",
    label: "Vibrant",
    desc: "Prefer concrete & wool for punchy colour",
    pick: (b) => {
      const sorted = [...b].sort(
        (x, y) => familyRank(x.id) - familyRank(y.id) || x.cost - y.cost,
      );
      return sorted[0]?.id ?? null;
    },
  },
];

/** Apply a preset → a blockChoices override map (only where it differs from default). */
export function applyPreset(palette: LoadedPalette, preset: Preset): Record<number, string> {
  const choices: Record<number, string> = {};
  for (const color of palette.colors) {
    if (color.blocks.length === 0) continue;
    const picked = preset.pick(color.blocks);
    if (picked && picked !== color.blocks[0].id) choices[color.id] = picked;
  }
  return choices;
}
