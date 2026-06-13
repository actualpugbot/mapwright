import type { BuildPlan } from "@/mapart/staircase";
import type { LoadedPalette } from "@/mapart/palette";
import { planToImageData } from "@/mapart/preview";
import { buildLitematic } from "@/export/litematic";
import { buildStructureNbt } from "@/export/structureNbt";
import { buildSponge } from "@/export/sponge";
import { buildMcfunction } from "@/export/mcfunction";
import { baseName, saveBytes, saveText, saveBlob } from "@/export/download";

export function exportLitematic(plan: BuildPlan, palette: LoadedPalette, name: string): void {
  const base = baseName(name);
  const bytes = buildLitematic(plan, {
    name: base,
    author: "Mapwright",
    description: `Map art (${plan.width}×${plan.length}, ${plan.height} layers) — made with Mapwright`,
    dataVersion: palette.dataVersion,
  });
  saveBytes(bytes, `${base}.litematic`);
}

export function exportStructure(plan: BuildPlan, palette: LoadedPalette, name: string): void {
  saveBytes(buildStructureNbt(plan, palette.dataVersion), `${baseName(name)}.nbt`);
}

export function exportSchem(plan: BuildPlan, palette: LoadedPalette, name: string): void {
  saveBytes(buildSponge(plan, palette.dataVersion), `${baseName(name)}.schem`);
}

export function exportMcfunction(plan: BuildPlan, name: string): void {
  saveText(buildMcfunction(plan), `${baseName(name)}.mcfunction`);
}

export function exportPng(
  plan: BuildPlan,
  palette: LoadedPalette,
  name: string,
  scale = 4,
): void {
  const img = planToImageData(plan, palette);
  const tmp = document.createElement("canvas");
  tmp.width = img.width;
  tmp.height = img.height;
  tmp.getContext("2d")!.putImageData(img, 0, 0);

  const out = document.createElement("canvas");
  out.width = img.width * scale;
  out.height = img.height * scale;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, out.width, out.height);
  out.toBlob((blob) => blob && saveBlob(blob, `${baseName(name)}.png`));
}

export interface ExportFormat {
  id: string;
  label: string;
  ext: string;
  hint: string;
  primary?: boolean;
  run: (plan: BuildPlan, palette: LoadedPalette, name: string) => void;
}

export const FORMATS: ExportFormat[] = [
  {
    id: "litematic",
    label: "Litematica",
    ext: ".litematic",
    hint: "For the Litematica mod — recommended",
    primary: true,
    run: exportLitematic,
  },
  {
    id: "nbt",
    label: "Structure",
    ext: ".nbt",
    hint: "Vanilla structure block / /place",
    run: exportStructure,
  },
  {
    id: "schem",
    label: "WorldEdit",
    ext: ".schem",
    hint: "Sponge schematic for WorldEdit",
    run: exportSchem,
  },
  {
    id: "mcfunction",
    label: "Datapack",
    ext: ".mcfunction",
    hint: "setblock commands, no mods needed",
    run: (plan, _palette, name) => exportMcfunction(plan, name),
  },
  {
    id: "png",
    label: "Image",
    ext: ".png",
    hint: "Picture of the finished map",
    run: exportPng,
  },
];
