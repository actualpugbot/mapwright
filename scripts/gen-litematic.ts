/**
 * gen-litematic — build a real .litematic from the test palette (flat 64×64)
 * and write qa/test.litematic, so litemapy (the reference reader) can validate
 * the format end-to-end. Run: npx tsx scripts/gen-litematic.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { quantizeImage, type QuantizeTarget } from "../src/mapart/quantize";
import { buildLitematic } from "../src/export/litematic";
import { buildStructureNbt } from "../src/export/structureNbt";
import { buildSponge } from "../src/export/sponge";
import { buildMcfunction } from "../src/export/mcfunction";
import { decodeNbt } from "../src/export/nbt";
import type { BuildPlan } from "../src/mapart/buildPlan";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const palette = JSON.parse(
  fs.readFileSync(path.join(ROOT, "public/data/palette-26.1.1.json"), "utf8"),
) as {
  dataVersion: number;
  colors: { id: number; shades: number[][]; lab: number[][]; blocks: { id: string }[] }[];
};

const W = 64;
const H = 64;

// targets (flat = normal shade) carrying colour id
const usable = palette.colors.filter((c) => c.blocks.length > 0);
const targets: QuantizeTarget[] = usable.map((c) => ({
  rgb: c.shades[1] as [number, number, number],
  lab: c.lab[1] as [number, number, number],
}));
const colorIdByTarget = usable.map((c) => c.id);
const blockByColor = new Map<number, string>(usable.map((c) => [c.id, c.blocks[0].id]));

// gradient source
const pixels = new Uint8ClampedArray(W * H * 4);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    pixels[o] = (x / W) * 255;
    pixels[o + 1] = (y / H) * 255;
    pixels[o + 2] = 180;
    pixels[o + 3] = 255;
  }

const index = quantizeImage(pixels, W, H, targets, {
  metric: "lab",
  dither: "floyd-steinberg",
  strength: 100,
});

const n = W * H;
const colorId = new Int16Array(n).fill(-1);
for (let p = 0; p < n; p++) if (index[p] >= 0) colorId[p] = colorIdByTarget[index[p]];

const plan: BuildPlan = {
  width: W,
  length: H,
  height: 1,
  surfaceY: Int32Array.from({ length: n }, (_, p) => (colorId[p] >= 0 ? 0 : -1)),
  colorId,
  brightnessId: new Uint8Array(n).fill(1),
  supportY: new Int32Array(n).fill(-1),
  blockByColor,
  supportBlockId: "minecraft:cobblestone",
  peakHeight: 1,
  worldFits: true,
  visibleCount: n,
  supportCount: 0,
};

const bytes = buildLitematic(plan, {
  name: "mapwright-test",
  author: "Mapwright",
  description: "format validation",
  dataVersion: palette.dataVersion,
  now: 1700000000000,
});

const dir = path.join(ROOT, "qa");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "test.litematic"), bytes);
console.log(`wrote qa/test.litematic (${bytes.length} bytes), palette colours: ${usable.length}`);

// --- validate the other formats parse back correctly -----------------------
const dv = palette.dataVersion;

const structure = buildStructureNbt(plan, dv);
fs.writeFileSync(path.join(dir, "test.nbt"), structure);
const sd = decodeNbt(structure).value;
console.log(
  `structure.nbt: ${structure.length}b · size=${JSON.stringify(sd.size)} · palette=${sd.palette.length} · blocks=${sd.blocks.length}`,
);

const schem = buildSponge(plan, dv);
fs.writeFileSync(path.join(dir, "test.schem"), schem);
const sp = decodeNbt(schem);
console.log(
  `schem: ${schem.length}b · root='${sp.name}' · ${sp.value.Width}x${sp.value.Height}x${sp.value.Length} · paletteMax=${sp.value.PaletteMax} · blockData=${sp.value.BlockData.length}b`,
);

const fn = buildMcfunction(plan);
fs.writeFileSync(path.join(dir, "test.mcfunction"), fn);
console.log(`mcfunction: ${fn.split("\n").length} lines`);
console.log("ALL FORMATS OK");
