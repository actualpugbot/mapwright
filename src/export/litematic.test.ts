import { describe, it, expect } from "vitest";
import { buildLitematic } from "./litematic";
import { decodeNbt } from "./nbt";
import { bitsPerEntry, unpackBlockStates } from "./litematicaBitArray";
import type { BuildPlan } from "@/mapart/staircase";

function tinyPlan(): BuildPlan {
  // 2×2 flat: grass, grass / snow, snow  (index p = z*2 + x)
  return {
    width: 2,
    length: 2,
    height: 1,
    surfaceY: Int32Array.from([0, 0, 0, 0]),
    colorId: Int16Array.from([1, 1, 8, 8]),
    brightnessId: new Uint8Array([1, 1, 1, 1]),
    supportY: Int32Array.from([-1, -1, -1, -1]),
    blockByColor: new Map([
      [1, "minecraft:grass_block"],
      [8, "minecraft:snow_block"],
    ]),
    supportBlockId: "minecraft:cobblestone",
    peakHeight: 1,
    worldFits: true,
    visibleCount: 4,
    supportCount: 0,
  };
}

describe("buildLitematic", () => {
  it("produces a gzip'd NBT with the correct header + metadata", () => {
    const bytes = buildLitematic(tinyPlan(), {
      name: "Test",
      author: "Mapwright",
      description: "unit test",
      dataVersion: 4788,
      now: 1700000000000,
    });
    expect(bytes[0]).toBe(0x1f); // gzip magic
    expect(bytes[1]).toBe(0x8b);

    const { name, value } = decodeNbt(bytes);
    expect(name).toBe(""); // anonymous root
    expect(value.Version).toBe(6);
    expect(value.MinecraftDataVersion).toBe(4788);
    expect(value.Metadata.TotalBlocks).toBe(4);
    expect(value.Metadata.TotalVolume).toBe(4); // 2 * 1 * 2
    expect(value.Metadata.EnclosingSize).toEqual({ x: 2, y: 1, z: 2 });
    expect(value.Metadata.RegionCount).toBe(1);
  });

  it("writes a single region whose blockstates decode back to the grid", () => {
    const { value } = decodeNbt(
      buildLitematic(tinyPlan(), {
        name: "T",
        author: "a",
        description: "d",
        dataVersion: 4788,
        now: 1,
      }),
    );
    const region = Object.values(value.Regions)[0] as Record<string, unknown>;
    expect(region.Size).toEqual({ x: 2, y: 1, z: 2 });

    const palette = (region.BlockStatePalette as { Name: string }[]).map((c) => c.Name);
    expect(palette[0]).toBe("minecraft:air");
    expect(palette).toContain("minecraft:grass_block");
    expect(palette).toContain("minecraft:snow_block");

    const longs = region.BlockStates as bigint[];
    const grid = unpackBlockStates(longs, bitsPerEntry(palette.length), 4);
    // y=0 layer, index = z*2 + x: grass, grass, snow, snow
    const grass = palette.indexOf("minecraft:grass_block");
    const snow = palette.indexOf("minecraft:snow_block");
    expect(Array.from(grid)).toEqual([grass, grass, snow, snow]);
  });
});
