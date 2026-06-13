import { describe, it, expect } from "vitest";
import { bitsPerEntry, packBlockStates, unpackBlockStates } from "./litematicaBitArray";

describe("bitsPerEntry", () => {
  it("clamps to a minimum of 2", () => {
    expect(bitsPerEntry(1)).toBe(2);
    expect(bitsPerEntry(2)).toBe(2);
    expect(bitsPerEntry(4)).toBe(2);
  });
  it("uses ceil(log2(size)) above 4", () => {
    expect(bitsPerEntry(5)).toBe(3);
    expect(bitsPerEntry(62)).toBe(6);
    expect(bitsPerEntry(64)).toBe(6);
    expect(bitsPerEntry(65)).toBe(7);
    expect(bitsPerEntry(184)).toBe(8);
    expect(bitsPerEntry(256)).toBe(8);
  });
});

describe("packBlockStates", () => {
  it("packs LSB-first within a long (known vector)", () => {
    // indices 0,1,2,3 at 2 bits → 0b11_10_01_00 = 0xE4 = 228
    const longs = packBlockStates([0, 1, 2, 3], 2);
    expect(longs.length).toBe(1);
    expect(longs[0]).toBe(228n);
  });

  it("round-trips across long boundaries (entries straddle longs)", () => {
    for (const nbits of [2, 3, 5, 6, 8]) {
      const volume = 500; // forces many longs + straddling
      const max = (1 << nbits) - 1;
      const indices = Array.from({ length: volume }, (_, i) => (i * 37 + 11) & max);
      const longs = packBlockStates(indices, nbits);
      const back = unpackBlockStates(longs, nbits, volume);
      expect(Array.from(back)).toEqual(indices);
    }
  });

  it("long count = ceil(nbits*volume/64)", () => {
    expect(packBlockStates(new Array(64).fill(0), 8).length).toBe(8); // 512/64
    expect(packBlockStates(new Array(10).fill(0), 5).length).toBe(1); // 50/64 → 1
    expect(packBlockStates(new Array(13).fill(0), 5).length).toBe(2); // 65/64 → 2
  });
});
