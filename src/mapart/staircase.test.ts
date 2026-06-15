import { describe, it, expect } from "vitest";
import { buildPlan } from "./staircase";
import { DEFAULT_SETTINGS, type Settings } from "../types";
import type { LoadedPalette } from "./palette";
import type { MapArtResult } from "./render";

const palette: LoadedPalette = {
  version: "test",
  dataVersion: 0,
  textureBase: "",
  colors: [
    {
      id: 5,
      name: "x",
      label: "X",
      baseRgb: [10, 10, 10],
      shades: [
        [8, 8, 8],
        [10, 10, 10],
        [12, 12, 12],
      ],
      lab: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      blocks: [
        {
          id: "minecraft:stone",
          label: "Stone",
          texture: null,
          gravity: false,
          transparent: false,
          fullCube: true,
          rarity: "common",
          stackSize: 64,
          cost: 1,
        },
      ],
    },
  ],
  byId: new Map(),
};
palette.byId = new Map(palette.colors.map((c) => [c.id, c]));

const target = (brightnessId: number) => ({
  colorId: 5,
  brightnessId: brightnessId as 0 | 1 | 2 | 3,
  rgb: [10, 10, 10] as [number, number, number],
  lab: [0, 0, 0] as const,
});

/** Build a single column whose per-cell brightness drives the staircase. */
function run(brightness: number[], staircaseMode: "valley" | "classic") {
  const targets = [target(0), target(1), target(2)];
  const index = new Int16Array(brightness); // brightness id == target index here
  const result: MapArtResult = { width: 1, height: brightness.length, targets, index };
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    buildMode: "staircase",
    staircaseMode,
    supportMode: "none",
  };
  return buildPlan(result, palette, settings);
}

describe("buildPlan staircase presence", () => {
  // dark, light, light → raw heights -1, 0, 1. The -1 cell collides with the
  // NONE sentinel and used to be dropped; every cell must survive.
  it("keeps a cell whose staircase height is exactly -1 (valley/compact)", () => {
    const plan = run([0, 2, 2], "valley");
    expect(plan.visibleCount).toBe(3);
    expect([...plan.surfaceY].every((y) => y >= 0)).toBe(true);
  });

  it("keeps a cell whose staircase height is exactly -1 (classic/aligned)", () => {
    const plan = run([0, 2, 2], "classic");
    expect(plan.visibleCount).toBe(3);
    expect([...plan.surfaceY].every((y) => y >= 0)).toBe(true);
  });

  it("every opaque cell becomes a block (no holes)", () => {
    // A longer noisy column that crosses -1 several times.
    const plan = run([0, 0, 2, 0, 2, 2, 0, 0, 2, 0], "valley");
    expect(plan.visibleCount).toBe(10);
  });
});
