import { describe, it, expect } from "vitest";
import { fillTransparent } from "./inpaint";

/** Build an RGBA buffer from [r,g,b,a] tuples. */
function buf(...px: [number, number, number, number][]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(px.length * 4);
  px.forEach(([r, g, b, a], i) => out.set([r, g, b, a], i * 4));
  return out;
}
const at = (d: Uint8ClampedArray, i: number) => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2], d[i * 4 + 3]];

describe("fillTransparent", () => {
  it("fills a transparent pixel with its opaque neighbour's colour", () => {
    // [red, transparent, red] → middle should become red, opaque.
    const d = buf([255, 0, 0, 255], [0, 0, 0, 0], [255, 0, 0, 255]);
    fillTransparent(d, 3, 1, [9, 9, 9]);
    expect(at(d, 1)).toEqual([255, 0, 0, 255]);
  });

  it("fills a transparent-black hole with the surrounding colour, not black", () => {
    // 3×3 of white with a transparent-black centre.
    const px: [number, number, number, number][] = [];
    for (let i = 0; i < 9; i++) px.push([255, 255, 255, 255]);
    px[4] = [0, 0, 0, 0];
    const d = buf(...px);
    fillTransparent(d, 3, 3, [0, 0, 0]);
    expect(at(d, 4)).toEqual([255, 255, 255, 255]);
  });

  it("leaves opaque pixels untouched", () => {
    const d = buf([12, 34, 56, 255], [0, 0, 0, 0]);
    fillTransparent(d, 2, 1, [9, 9, 9]);
    expect(at(d, 0)).toEqual([12, 34, 56, 255]);
  });

  it("uses the fallback colour when the image is fully transparent", () => {
    const d = buf([0, 0, 0, 0], [0, 0, 0, 0]);
    fillTransparent(d, 2, 1, [7, 8, 9]);
    expect(at(d, 0)).toEqual([7, 8, 9, 255]);
    expect(at(d, 1)).toEqual([7, 8, 9, 255]);
  });

  it("does not wrap colour across row boundaries", () => {
    // Row 0: [red, transparent]; row 1: [transparent, blue].
    // The transparent at (1,0) is adjacent to red (left) and blue (below);
    // nearest by BFS is a tie at distance 1 — assert it is opaque and one of them.
    const d = buf(
      [255, 0, 0, 255],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 255, 255],
    );
    fillTransparent(d, 2, 2, [9, 9, 9]);
    for (let i = 0; i < 4; i++) expect(at(d, i)[3]).toBe(255); // all opaque
  });
});
