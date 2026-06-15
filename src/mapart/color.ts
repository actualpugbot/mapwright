import type { RGB } from "../types";

export type Lab = readonly [number, number, number];

// --- sRGB -> CIE Lab (D65) --------------------------------------------------

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

const D65 = { x: 95.047, y: 100.0, z: 108.883 };

function pivot(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

/** Convert an 8-bit sRGB triple to CIE L*a*b*. */
export function rgbToLab([r, g, b]: RGB): Lab {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  // linear sRGB -> XYZ (scaled to 0..100)
  const x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) * 100;
  const y = (rl * 0.2126 + gl * 0.7152 + bl * 0.0722) * 100;
  const z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) * 100;

  const fx = pivot(x / D65.x);
  const fy = pivot(y / D65.y);
  const fz = pivot(z / D65.z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Parse a #rgb / #rrggbb hex string to an 8-bit RGB triple (defaults to black). */
export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = Number.parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// --- distances --------------------------------------------------------------

/** Squared Euclidean distance in RGB. */
export function distRgb2(a: RGB, b: RGB): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

/** Squared Euclidean distance in Lab (ΔE76²). Fast, perceptually decent. */
export function distLab2(a: Lab, b: Lab): number {
  const dl = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return dl * dl + da * da + db * db;
}

/**
 * CIEDE2000 color difference (ΔE00). More perceptually accurate than ΔE76,
 * ~10× costlier. Returns the (non-squared) ΔE00 value.
 */
export function ciede2000(lab1: Lab, lab2: Lab): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;

  const kL = 1,
    kC = 1,
    kH = 1;

  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;

  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + 6103515625))); // 25^7
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;

  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);

  const h1p = hueAngle(b1, a1p);
  const h2p = hueAngle(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deg2rad(dhp) / 2);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;

  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) {
      hbarp += h1p + h2p < 360 ? 360 : -360;
    }
    hbarp /= 2;
  }

  const T =
    1 -
    0.17 * Math.cos(deg2rad(hbarp - 30)) +
    0.24 * Math.cos(deg2rad(2 * hbarp)) +
    0.32 * Math.cos(deg2rad(3 * hbarp + 6)) -
    0.2 * Math.cos(deg2rad(4 * hbarp - 63));

  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
  const Cbarp7 = Math.pow(Cbarp, 7);
  const Rc = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + 6103515625));
  const Sl = 1 + (0.015 * Math.pow(Lbarp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbarp - 50, 2));
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(deg2rad(2 * dTheta)) * Rc;

  const termL = dLp / (kL * Sl);
  const termC = dCp / (kC * Sc);
  const termH = dHp / (kH * Sh);

  return Math.sqrt(
    termL * termL + termC * termC + termH * termH + Rt * termC * termH,
  );
}

function hueAngle(b: number, ap: number): number {
  if (ap === 0 && b === 0) return 0;
  let h = rad2deg(Math.atan2(b, ap));
  if (h < 0) h += 360;
  return h;
}

const deg2rad = (d: number) => (d * Math.PI) / 180;
const rad2deg = (r: number) => (r * 180) / Math.PI;
