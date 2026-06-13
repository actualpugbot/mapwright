import { forEachBlock, type BuildPlan } from "../mapart/buildPlan";

/**
 * A `.mcfunction` of relative `setblock` commands. Place the function's origin
 * at the north-west-bottom corner; coordinates are relative (`~`) to that.
 * Works on vanilla servers with no mods.
 */
export function buildMcfunction(plan: BuildPlan): string {
  const lines: string[] = [
    `# Mapwright map art — ${plan.width}×${plan.length}, ${plan.height} layers`,
    `# Run at the NW-bottom corner. Coordinates are relative.`,
  ];
  forEachBlock(plan, (x, y, z, id) => {
    lines.push(`setblock ~${x} ~${y} ~${z} ${id}`);
  });
  return lines.join("\n") + "\n";
}
