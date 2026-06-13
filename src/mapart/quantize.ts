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
}

/** Per-pixel matched target index, or -1 for transparent/skipped pixels. */
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
 * Returns a per-pixel target index (or -1 for transparent pixels).
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

  if (kernel) {
    quantizeErrorDiffusion(pixels, width, height, targets, opts.metric, kernel, strength, out);
  } else if (bayer) {
    quantizeOrdered(pixels, width, height, targets, opts.metric, bayer, strength, out);
  } else {
    quantizeNearest(pixels, width, height, targets, opts.metric, out);
  }
  return out;
}

function isTransparent(pixels: Uint8ClampedArray, p: number): boolean {
  return pixels[p * 4 + 3] < 128;
}

function quantizeNearest(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  targets: QuantizeTarget[],
  metric: ColorMetric,
  out: IndexMap,
): void {
  // Cache by packed RGB — flat-colour images have far fewer colours than pixels.
  const cache = new Map<number, number>();
  const n = width * height;
  for (let p = 0; p < n; p++) {
    if (isTransparent(pixels, p)) {
      out[p] = -1;
      continue;
    }
    const o = p * 4;
    const key = (pixels[o] << 16) | (pixels[o + 1] << 8) | pixels[o + 2];
    let idx = cache.get(key);
    if (idx === undefined) {
      idx = nearest(pixels[o], pixels[o + 1], pixels[o + 2], targets, metric);
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
  out: IndexMap,
): void {
  const amp = 56 * strength; // RGB spread of the threshold nudge
  const { n, m } = bayer;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (isTransparent(pixels, p)) {
        out[p] = -1;
        continue;
      }
      const o = p * 4;
      const t = (m[(y % n) * n + (x % n)] / (n * n) - 0.5) * amp;
      out[p] = nearest(pixels[o] + t, pixels[o + 1] + t, pixels[o + 2] + t, targets, metric);
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
  out: IndexMap,
): void {
  // Float working buffer (RGB) carrying accumulated error.
  const buf = new Float32Array(width * height * 3);
  const n = width * height;
  for (let p = 0; p < n; p++) {
    buf[p * 3] = pixels[p * 4];
    buf[p * 3 + 1] = pixels[p * 4 + 1];
    buf[p * 3 + 2] = pixels[p * 4 + 2];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (isTransparent(pixels, p)) {
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
