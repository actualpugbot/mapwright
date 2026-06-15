import type { DitherMethod, ColorMetric, RGB } from "../types";
import { ciede2000, distLab2, distRgb2, rgbToLab, type Lab } from "./color";

export interface QuantizeTarget {
  rgb: RGB;
  lab: Lab;
}

export interface QuantizeOptions {
  metric: ColorMetric;
  dither: DitherMethod;
  /** 0..100 */
  strength: number;
  /**
   * When true, fully transparent pixels (alpha 0) are left blank (index -1).
   * When false (default), every pixel becomes a block using its own colour —
   * callers should inpaint transparent areas beforehand (see processImage) so
   * "blank" pixels carry a sensible colour rather than transparent black.
   */
  allowTransparency?: boolean;
}

/** Per-pixel matched target index. -1 for blank cells (transparent or empty palette). */
export type IndexMap = Int16Array;

// --- error-diffusion kernels: [dx, dy, weight], with divisor ----------------

type Kernel = { points: [number, number, number][]; divisor: number };

const KERNELS: Partial<Record<DitherMethod, Kernel>> = {
  "floyd-steinberg": {
    points: [
      [1, 0, 7],
      [-1, 1, 3],
      [0, 1, 5],
      [1, 1, 1],
    ],
    divisor: 16,
  },
  atkinson: {
    points: [
      [1, 0, 1],
      [2, 0, 1],
      [-1, 1, 1],
      [0, 1, 1],
      [1, 1, 1],
      [0, 2, 1],
    ],
    divisor: 8,
  },
  stucki: {
    points: [
      [1, 0, 8],
      [2, 0, 4],
      [-2, 1, 2],
      [-1, 1, 4],
      [0, 1, 8],
      [1, 1, 4],
      [2, 1, 2],
      [-2, 2, 1],
      [-1, 2, 2],
      [0, 2, 4],
      [1, 2, 2],
      [2, 2, 1],
    ],
    divisor: 42,
  },
  burkes: {
    points: [
      [1, 0, 8],
      [2, 0, 4],
      [-2, 1, 2],
      [-1, 1, 4],
      [0, 1, 8],
      [1, 1, 4],
      [2, 1, 2],
    ],
    divisor: 32,
  },
  "sierra-lite": {
    points: [
      [1, 0, 2],
      [-1, 1, 1],
      [0, 1, 1],
    ],
    divisor: 4,
  },
};

const BAYER: Partial<Record<DitherMethod, { n: number; m: number[] }>> = {
  bayer2x2: { n: 2, m: [0, 2, 3, 1] },
  bayer4x4: {
    n: 4,
    m: [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5],
  },
};

// --- nearest-colour ---------------------------------------------------------

function nearest(
  r: number,
  g: number,
  b: number,
  targets: QuantizeTarget[],
  metric: ColorMetric,
): number {
  let best = 0;
  let bestD = Infinity;
  if (metric === "rgb") {
    const c: RGB = [r, g, b];
    for (let i = 0; i < targets.length; i++) {
      const d = distRgb2(c, targets[i].rgb);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }
  const lab = rgbToLab([clamp8(r), clamp8(g), clamp8(b)]);
  if (metric === "ciede2000") {
    for (let i = 0; i < targets.length; i++) {
      const d = ciede2000(lab, targets[i].lab);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
  } else {
    for (let i = 0; i < targets.length; i++) {
      const d = distLab2(lab, targets[i].lab);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
  }
  return best;
}

const clamp8 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

/**
 * Quantize RGBA pixels to the nearest match target, optionally dithering.
 *
 * Opaque and partially transparent pixels are always matched to a block using
 * their own colour. Fully transparent pixels (alpha 0) are left blank (index
 * -1) when `allowTransparency` is set; otherwise they are matched like any
 * other pixel (callers inpaint transparent areas first — see processImage).
 * The result is also -1 wherever the palette has no targets at all.
 */
export function quantizeImage(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  targets: QuantizeTarget[],
  opts: QuantizeOptions,
): IndexMap {
  const out = new Int16Array(width * height);
  if (targets.length === 0) {
    out.fill(-1);
    return out;
  }

  const kernel = KERNELS[opts.dither];
  const bayer = BAYER[opts.dither];
  const strength = Math.max(0, Math.min(100, opts.strength)) / 100;
  const allow = opts.allowTransparency ?? false;

  if (kernel) {
    quantizeErrorDiffusion(pixels, width, height, targets, opts.metric, kernel, strength, allow, out);
  } else if (bayer) {
    quantizeOrdered(pixels, width, height, targets, opts.metric, bayer, strength, allow, out);
  } else {
    quantizeNearest(pixels, width, height, targets, opts.metric, allow, out);
  }
  return out;
}

/**
 * Resolve a pixel to the RGB the quantizer should match, or null for "blank".
 * Every pixel keeps its own colour (so the correct block is chosen, never a
 * flat fallback); only fully transparent pixels are blank, and only when
 * transparency is allowed.
 */
function resolvePixel(
  pixels: Uint8ClampedArray,
  p: number,
  allowTransparency: boolean,
): RGB | null {
  const o = p * 4;
  if (allowTransparency && pixels[o + 3] === 0) return null;
  return [pixels[o], pixels[o + 1], pixels[o + 2]];
}

function quantizeNearest(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  targets: QuantizeTarget[],
  metric: ColorMetric,
  allowTransparency: boolean,
  out: IndexMap,
): void {
  // Cache by packed RGB — flat-colour images have far fewer colours than pixels.
  const cache = new Map<number, number>();
  const n = width * height;
  for (let p = 0; p < n; p++) {
    const c = resolvePixel(pixels, p, allowTransparency);
    if (c === null) {
      out[p] = -1;
      continue;
    }
    const key = (c[0] << 16) | (c[1] << 8) | c[2];
    let idx = cache.get(key);
    if (idx === undefined) {
      idx = nearest(c[0], c[1], c[2], targets, metric);
      cache.set(key, idx);
    }
    out[p] = idx;
  }
}

function quantizeOrdered(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  targets: QuantizeTarget[],
  metric: ColorMetric,
  bayer: { n: number; m: number[] },
  strength: number,
  allowTransparency: boolean,
  out: IndexMap,
): void {
  const amp = 56 * strength; // RGB spread of the threshold nudge
  const { n, m } = bayer;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const c = resolvePixel(pixels, p, allowTransparency);
      if (c === null) {
        out[p] = -1;
        continue;
      }
      const t = (m[(y % n) * n + (x % n)] / (n * n) - 0.5) * amp;
      out[p] = nearest(c[0] + t, c[1] + t, c[2] + t, targets, metric);
    }
  }
}

function quantizeErrorDiffusion(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  targets: QuantizeTarget[],
  metric: ColorMetric,
  kernel: Kernel,
  strength: number,
  allowTransparency: boolean,
  out: IndexMap,
): void {
  // Float working buffer (RGB) carrying accumulated error. Blank pixels stay 0
  // and are skipped below so they neither receive nor emit error.
  const buf = new Float32Array(width * height * 3);
  const n = width * height;
  const blank = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    const c = resolvePixel(pixels, p, allowTransparency);
    if (c === null) {
      blank[p] = 1;
      continue;
    }
    buf[p * 3] = c[0];
    buf[p * 3 + 1] = c[1];
    buf[p * 3 + 2] = c[2];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (blank[p]) {
        out[p] = -1;
        continue;
      }
      const b = p * 3;
      const r = buf[b];
      const g = buf[b + 1];
      const bl = buf[b + 2];
      const idx = nearest(r, g, bl, targets, metric);
      out[p] = idx;

      const [tr, tg, tb] = targets[idx].rgb;
      const er = (r - tr) * strength;
      const eg = (g - tg) * strength;
      const eb = (bl - tb) * strength;

      for (const [dx, dy, w] of kernel.points) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny >= height) continue;
        const nb = (ny * width + nx) * 3;
        const f = w / kernel.divisor;
        buf[nb] += er * f;
        buf[nb + 1] += eg * f;
        buf[nb + 2] += eb * f;
      }
    }
  }
}
