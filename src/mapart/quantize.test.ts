import { describe, it, expect } from "vitest";
import { quantizeImage, type QuantizeTarget } from "./quantize";
import { rgbToLab, type Lab } from "./color";
import type { RGB } from "../types";

const target = (rgb: RGB): QuantizeTarget => ({ rgb, lab: rgbToLab(rgb) as Lab });
const TARGETS = [target([0, 0, 0]), target([255, 255, 255])]; // black, white

/** Build a 1×n RGBA buffer from [r,g,b,a] tuples. */
function pixels(...px: [number, number, number, number][]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(px.length * 4);
  px.forEach(([r, g, b, a], i) => out.set([r, g, b, a], i * 4));
  return out;
}

const base = { metric: "rgb" as const, dither: "none" as const, strength: 100 };
const allow = { ...base, allowTransparency: true };
const fill = { ...base, allowTransparency: false };

describe("quantizeImage transparency handling", () => {
  it("leaves fully transparent pixels blank when transparency is allowed", () => {
    const idx = quantizeImage(pixels([123, 200, 50, 0]), 1, 1, TARGETS, allow);
    expect(idx[0]).toBe(-1);
  });

  it("places a block for fully transparent pixels when not allowed", () => {
    const idx = quantizeImage(pixels([255, 255, 255, 0]), 1, 1, TARGETS, fill);
    expect(idx[0]).toBeGreaterThanOrEqual(0);
  });

  it("matches semi-transparent pixels by their own colour, never a fallback", () => {
    // A faint white pixel must map to white (1), not collapse to black.
    const a = quantizeImage(pixels([255, 255, 255, 40]), 1, 1, TARGETS, allow);
    const f = quantizeImage(pixels([255, 255, 255, 40]), 1, 1, TARGETS, fill);
    expect(a[0]).toBe(1);
    expect(f[0]).toBe(1);
  });

  it("never blanks opaque or semi-transparent pixels", () => {
    const idx = quantizeImage(
      pixels([10, 20, 30, 255], [200, 200, 200, 90]),
      2,
      1,
      TARGETS,
      allow,
    );
    expect([...idx].some((v) => v === -1)).toBe(false);
  });

  it("matches opaque pixels to the nearest swatch", () => {
    const idx = quantizeImage(
      pixels([0, 0, 0, 255], [255, 255, 255, 255]),
      2,
      1,
      TARGETS,
      allow,
    );
    expect(idx[0]).toBe(0); // black
    expect(idx[1]).toBe(1); // white
  });

  it("returns -1 only when the palette is empty", () => {
    const idx = quantizeImage(pixels([10, 20, 30, 255]), 1, 1, [], allow);
    expect(idx[0]).toBe(-1);
  });
});
