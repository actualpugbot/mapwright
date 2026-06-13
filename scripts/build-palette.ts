/**
 * build-palette — generate Mapwright's per-version block palette from a local
 * mc-datahub processed dataset.
 *
 * Usage (via WSL node):
 *   npm run build:palette -- [version] [pathToMcDatahub]
 *
 * Reads  <datahub>/workspace/datasets/<version>/{block-properties,blocks,models,textures,item-stats}.json
 * Writes public/data/palette-<version>.json  and  public/data/textures/<version>/*.png
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MAP_COLORS, resolveMapColorName, allShades } from "../src/data/mapColors";
import { rgbToLab } from "../src/mapart/color";
import type { RGB } from "../src/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const VERSION = process.argv[2] || "26.1.1";
const DATAHUB =
  process.argv[3] ||
  process.env.MC_DATAHUB ||
  // sibling of this project under dev/ (e.g. dev/mapwright + dev/mc-datahub)
  path.resolve(PROJECT_ROOT, "../mc-datahub");
const DS = path.join(DATAHUB, "workspace", "datasets", VERSION);

// --- load -------------------------------------------------------------------

function load<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DS, file), "utf8")) as T;
}

interface BlockProp {
  id: string;
  mapColor?: string;
}
interface BlockDef {
  id: string;
  modelRefs?: string[];
  textureRefs?: string[];
}
interface ModelDef {
  id: string;
  parent?: string;
  raw?: { textures?: Record<string, string | { sprite?: string }> };
}
interface TextureDef {
  id: string;
  imagePath?: string;
}

const blockProps = load<BlockProp[]>("block-properties.json");
const blocks = load<BlockDef[]>("blocks.json");
const models = load<ModelDef[]>("models.json");
const textures = load<TextureDef[]>("textures.json");
const itemStats = load<{ id: string; rarity?: string; stackSize?: number }[]>(
  "item-stats.json",
);

const blockById = new Map(blocks.map((b) => [b.id, b]));
const modelById = new Map(models.map((m) => [m.id, m]));
const texById = new Map(textures.map((t) => [t.id, t]));
const statById = new Map(itemStats.map((s) => [s.id, s]));

// --- classification ---------------------------------------------------------

const CUBE_PARENTS = new Set([
  "minecraft:block/cube",
  "minecraft:block/cube_all",
  "minecraft:block/cube_column",
  "minecraft:block/cube_column_horizontal",
  "minecraft:block/cube_bottom_top",
  "minecraft:block/cube_top",
  "minecraft:block/cube_mirrored",
  "minecraft:block/cube_mirrored_all",
  "minecraft:block/cube_directional",
  "minecraft:block/template_glazed_terracotta",
  "minecraft:block/leaves",
]);

/** Natural full cubes that use a bespoke model (so template detection misses). */
const CUBE_ALLOWLIST = new Set(
  [
    "grass_block", "mycelium", "podzol", "dirt_path", "crimson_nylium",
    "warped_nylium", "sculk", "redstone_block", "slime_block", "honey_block",
    "snow_block", "magma_block", "mushroom_stem", "red_mushroom_block",
    "brown_mushroom_block", "ochre_froglight", "verdant_froglight",
    "pearlescent_froglight",
  ].map((s) => `minecraft:${s}`),
);

/** Blocks to never offer: unobtainable, special, or non-buildable. */
const DENYLIST = new Set(
  [
    "barrier", "light", "structure_void", "structure_block", "jigsaw",
    "command_block", "chain_command_block", "repeating_command_block",
    "moving_piston", "piston_head", "spawner", "trial_spawner", "vault",
    "end_portal_frame", "end_gateway", "nether_portal", "bedrock",
    "budding_amethyst", "reinforced_deepslate", "infested_stone",
    "infested_cobblestone", "infested_stone_bricks", "infested_mossy_stone_bricks",
    "infested_cracked_stone_bricks", "infested_chiseled_stone_bricks",
    "infested_deepslate", "powder_snow", "dried_ghast",
  ].map((s) => `minecraft:${s}`),
);

// Inherently partial/oriented blocks. Their blockstates include a full-cube
// variant (double slab, snow layers=8) that fools model-based cube detection,
// but their DEFAULT state isn't a usable map-art cube. Their colors are always
// covered by a full-block counterpart, so excluding them loses no coverage.
// (mushroom_stem / sea_lantern / froglights deliberately NOT matched.)
const PARTIAL = (id: string): boolean => {
  const n = id.replace(/^minecraft:/, "");
  if (n === "snow") return true; // the thin snow layer
  return /(_slab|_stairs|_wall|_fence|_pane|_bars|_carpet|_door|_trapdoor|_button|_pressure_plate|_rail|_sign|_banner|_bed)$/.test(
    n,
  );
};

const GRAVITY = (id: string) =>
  /_(concrete_powder)$/.test(id) ||
  [
    "minecraft:sand", "minecraft:red_sand", "minecraft:gravel",
    "minecraft:suspicious_sand", "minecraft:suspicious_gravel",
    "minecraft:anvil", "minecraft:chipped_anvil", "minecraft:damaged_anvil",
    "minecraft:dragon_egg", "minecraft:pointed_dripstone",
  ].includes(id);

// Note: packed_ice / blue_ice are fully opaque solids and are intentionally NOT
// treated as transparent — only see-through/non-occluding blocks are.
const TRANSPARENT = (id: string) =>
  /glass$/.test(id) ||
  [
    "minecraft:ice", "minecraft:frosted_ice", "minecraft:slime_block",
    "minecraft:honey_block", "minecraft:tinted_glass",
  ].includes(id);

const RARITY_COST: Record<string, number> = {
  common: 1,
  uncommon: 4,
  rare: 8,
  epic: 16,
};

function resolveModel(modelId: string): {
  tex: Record<string, string | { sprite?: string }>;
  isCube: boolean;
} {
  let cur: ModelDef | undefined = modelById.get(modelId);
  let tex: Record<string, string | { sprite?: string }> = {};
  let isCube = false;
  let guard = 0;
  while (cur && guard++ < 24) {
    if (cur.raw?.textures) tex = { ...cur.raw.textures, ...tex };
    if (CUBE_PARENTS.has(cur.id)) isCube = true;
    if (cur.parent && CUBE_PARENTS.has(cur.parent)) isCube = true;
    cur = cur.parent ? modelById.get(cur.parent) : undefined;
  }
  return { tex, isCube };
}

function spriteOf(v: string | { sprite?: string } | undefined): string | undefined {
  if (v == null) return undefined;
  return typeof v === "string" ? v : v.sprite;
}

/** Resolve the top-face texture id for a block, following #variable refs. */
function topTextureId(blockId: string): string | undefined {
  const b = blockById.get(blockId);
  if (!b?.modelRefs?.length) return undefined;
  const { tex } = resolveModel(b.modelRefs[0]);

  // Resolve a value (string | {sprite}) to a concrete texture id, following
  // "#variable" references, returning undefined for unresolved/hash refs.
  const deref = (val: string | { sprite?: string } | undefined): string | undefined => {
    let v = spriteOf(val);
    let guard = 0;
    while (typeof v === "string" && v.startsWith("#") && guard++ < 10) {
      v = spriteOf(tex[v.slice(1)]);
    }
    return typeof v === "string" && !v.startsWith("#") ? v : undefined;
  };

  // Prefer the top-facing texture; "particle" is a poor last resort.
  for (const key of ["up", "top", "end", "all"]) {
    const r = deref(tex[key]);
    if (r) return r;
  }
  for (const [key, val] of Object.entries(tex)) {
    if (key === "particle") continue;
    const r = deref(val);
    if (r) return r;
  }
  return deref(tex.particle) ?? b.textureRefs?.[0];
}

function isFullCube(blockId: string): boolean {
  if (CUBE_ALLOWLIST.has(blockId)) return true;
  const b = blockById.get(blockId);
  if (!b?.modelRefs?.length) return false;
  return resolveModel(b.modelRefs[0]).isCube;
}

// --- build ------------------------------------------------------------------

interface OutBlock {
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

const texOutDir = path.join(PROJECT_ROOT, "public", "data", "textures", VERSION);
fs.mkdirSync(texOutDir, { recursive: true });
const copiedTextures = new Set<string>();

function copyTexture(textureId: string | undefined): string | null {
  if (!textureId) return null;
  const norm = textureId.startsWith("minecraft:") ? textureId : `minecraft:${textureId}`;
  const t = texById.get(norm) ?? texById.get(textureId);
  if (!t?.imagePath) return null;
  const base = path.basename(t.imagePath);
  if (!copiedTextures.has(base)) {
    const src = path.join(DS, t.imagePath);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(texOutDir, base));
      copiedTextures.add(base);
    } else {
      return null;
    }
  }
  return base;
}

const labelize = (id: string) =>
  id
    .replace(/^minecraft:/, "")
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

// group candidate blocks by canonical color name
const byColor = new Map<string, OutBlock[]>();

for (const bp of blockProps) {
  if (DENYLIST.has(bp.id) || PARTIAL(bp.id)) continue;
  const colorName = resolveMapColorName(bp.mapColor, bp.id);
  if (!colorName || colorName === "none") continue;
  if (!isFullCube(bp.id)) continue;

  const gravity = GRAVITY(bp.id);
  const transparent = TRANSPARENT(bp.id);
  const stat = statById.get(bp.id);
  const rarity = stat?.rarity ?? "common";
  let cost = RARITY_COST[rarity] ?? 1;
  if (gravity) cost += 2;
  if (transparent) cost += 2;

  const block: OutBlock = {
    id: bp.id,
    label: labelize(bp.id),
    texture: copyTexture(topTextureId(bp.id)),
    gravity,
    transparent,
    fullCube: true,
    rarity,
    stackSize: stat?.stackSize ?? 64,
    cost,
  };

  if (!byColor.has(colorName)) byColor.set(colorName, []);
  byColor.get(colorName)!.push(block);
}

// WATER has no solid block — a water source block renders the WATER map color.
// Offer it explicitly (fluid: needs a container/support, flagged transparent).
const waterCandidate: OutBlock = {
  id: "minecraft:water",
  label: "Water",
  texture: copyTexture("minecraft:block/water_still"),
  gravity: false,
  transparent: true,
  fullCube: false,
  rarity: "common",
  stackSize: 1,
  cost: 3,
};
byColor.set("water", [waterCandidate, ...(byColor.get("water") ?? [])]);

// sort candidates: solid+cheap first
const candidateRank = (b: OutBlock) =>
  (b.gravity ? 100 : 0) + (b.transparent ? 100 : 0) + b.cost;

const outColors = MAP_COLORS.filter((c) => c.id !== 0).map((c) => {
  const list = (byColor.get(c.name) ?? []).sort(
    (a, b) => candidateRank(a) - candidateRank(b) || a.label.localeCompare(b.label),
  );
  const shades = allShades(c.rgb);
  return {
    id: c.id,
    name: c.name,
    label: c.label,
    baseRgb: c.rgb,
    shades,
    lab: shades.map((s) => rgbToLab(s as RGB)),
    blocks: list,
  };
});

// --- data version (best-effort) ---------------------------------------------

function findDataVersion(): number {
  const versionDir = path.join(DATAHUB, "workspace", "versions", VERSION);
  const candidates = [
    // The JAR's version.json carries the authoritative data version as world_version.
    path.join(versionDir, "decompiled", "client", "version.json"),
    path.join(versionDir, "metadata.json"),
    path.join(DS, "dataset.json"),
  ];
  for (const f of candidates) {
    try {
      const j = JSON.parse(fs.readFileSync(f, "utf8"));
      const dv =
        j.world_version ?? j.dataVersion ?? j.worldVersion ?? j?.meta?.dataVersion;
      if (typeof dv === "number") return dv;
    } catch {
      /* ignore */
    }
  }
  return 4788; // fallback: 26.1.1 world_version
}

const palette = {
  version: VERSION,
  dataVersion: findDataVersion(),
  textureBase: `/data/textures/${VERSION}/`,
  generatedAt: new Date().toISOString(),
  colors: outColors,
};

const outDir = path.join(PROJECT_ROOT, "public", "data");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `palette-${VERSION}.json`);
fs.writeFileSync(outFile, JSON.stringify(palette));

// --- report -----------------------------------------------------------------

const noOpaque = outColors.filter(
  (c) => !c.blocks.some((b) => !b.gravity && !b.transparent),
);
const empty = outColors.filter((c) => c.blocks.length === 0);
const noTexture = outColors.flatMap((c) =>
  c.blocks.filter((b) => !b.texture).map((b) => b.id),
);

console.log(`palette-${VERSION}.json written → ${outFile}`);
console.log(`  colors: ${outColors.length}, textures copied: ${copiedTextures.size}`);
console.log(`  dataVersion: ${palette.dataVersion}`);
console.log(`  total candidate blocks: ${outColors.reduce((n, c) => n + c.blocks.length, 0)}`);
if (empty.length) console.log(`  ⚠ EMPTY colors: ${empty.map((c) => c.name).join(", ")}`);
if (noOpaque.length)
  console.log(`  ⚠ colors with no opaque/non-gravity block: ${noOpaque.map((c) => c.name).join(", ")}`);
if (noTexture.length)
  console.log(
    `  ⚠ blocks missing texture (${noTexture.length}): ${noTexture
      .map((id) => id.replace("minecraft:", ""))
      .slice(0, 30)
      .join(", ")}`,
  );
