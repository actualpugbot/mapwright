# Mapwright

A clean, modern Minecraft **map-art studio** that runs entirely in your browser.
Drag in any image and export a buildable **`.litematic`** schematic — plus structure
`.nbt`, WorldEdit `.schem`, a datapack `.mcfunction`, and a PNG.

Approachable enough for a first-timer (drop → download), deep enough for veterans
(per-colour palette editing, staircase modes, dithering, survival cost optimization, a
live 3D preview, and a layer-by-layer build guide).

## Features

**The essentials**
- Drag-and-drop, paste, file-pick, or URL image input, with brightness / contrast /
  saturation / rotate / flip / transparency-fill adjustments.
- Size by maps (128 px each, 1–16 wide/tall) or a free pixel size.
- **Flat** and **staircase** builds. Staircase unlocks ~3× the colours via height; choose
  **Compact** (per-column floor, lowest build) or **Aligned** (shared floor).
- 7 dithering algorithms (Floyd–Steinberg, Atkinson, ordered Bayer, Stucki, Burkes,
  Sierra-Lite, none) with adjustable strength.
- Colour matching in CIE Lab (default), CIEDE2000 (best), or RGB (fast).
- Materials list with texture swatches, stack/shulker counts, and renewable indicators.
- Exports: `.litematic`, `.nbt` (structure), `.schem` (WorldEdit/Sponge v2),
  `.mcfunction`, `.png`.

**Standout features**
- **Live 3D build preview** — orbit a voxel render of the actual staircased build with
  real block textures and shade-correct lighting; slice by layer and toggle supports.
- **Survival cost optimizer** — one-click presets (Cheapest, No-gravity/glass, Vibrant)
  that re-pick the block for every colour under a constraint, plus a gather planner with
  per-block acquisition hints and a renewability estimate.
- **Guided build assistant** — step through the build layer by layer with a progress bar,
  per-layer block counts, and a printable checklist.

## Running it

Requires Node 18+.

```bash
npm install
npm run build:palette   # generate the block palette from mc-datahub (see below)
npm run dev             # http://localhost:5173
npm run build           # production build → dist/
npm test                # unit tests (bit-packing + .litematic round-trip)
```

## Data pipeline

Block data (which blocks make which map colour, textures, rarity, behaviour flags) is
generated from a local **[mc-datahub](../mc-datahub)** dataset — no external services.

```bash
npm run build:palette -- <version> [path-to-mc-datahub]
# default: 26.1.1, ../mc-datahub
```

It reads `workspace/datasets/<version>/{block-properties,blocks,models,textures,item-stats}.json`,
maps each block's `mapColor` enum to its RGB (62 base colours × 4 shades), keeps the
full-cube solid blocks, copies their face textures, and writes
`public/data/palette-<version>.json` + `public/data/textures/<version>/`.

## Tech

React + TypeScript + Vite + Tailwind, Zustand for state, Three.js (`@react-three/fiber`)
for the 3D view. Image quantization runs in a Web Worker. The `.litematic` writer is a
hand-rolled NBT encoder with Litematica's bit-packed long array (verified against the
[litemapy](https://github.com/SmylerMC/litemapy) reference reader).

```
scripts/build-palette.ts     data pipeline (mc-datahub → palette JSON + textures)
src/data/mapColors.ts        62 map base colours + enum→RGB table
src/mapart/                  palette, quantize (+dither), staircase, buildPlan, color math
src/export/                  litematic, structureNbt, sponge, mcfunction, nbt encoder
src/three/BuildPreview.tsx   instanced voxel 3D preview
src/optimizer/               cost presets + gather planner
src/assistant/               layer-by-layer build guide
src/components/               UI (dropzone, controls rail, preview stage, panels)
```

Not affiliated with Mojang or Microsoft.
