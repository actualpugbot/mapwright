/**
 * verify-render — run the real quantizer against the generated palette and
 * write viewable PNGs, so the colour engine can be eyeballed without a browser.
 *   npm run build:palette  (first, to ensure palette exists)
 *   npx tsx scripts/verify-render.ts
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

import { quantizeImage, type QuantizeTarget } from "../src/mapart/quantize";
import type { DitherMethod } from "../src/types";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const palette = JSON.parse(
  fs.readFileSync(path.join(ROOT, "public/data/palette-26.1.1.json"), "utf8"),
) as {
  colors: { id: number; name: string; shades: number[][]; lab: number[][] }[];
};

const W = 128;
const H = 128;

// --- source: same landscape as gen-test-image, sampled to W×H RGBA ----------
function clamp(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)));
}
function hsv(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return [clamp((r + m) * 255), clamp((g + m) * 255), clamp((b + m) * 255)];
}
function srcPixel(px: number, py: number): [number, number, number] {
  const x = (px / W) * 512;
  const y = (py / H) * 512;
  const v = y / 512;
  if (y > 512 - 40) return hsv((x / 512) * 360, 0.85, 0.95);
  if (v < 0.6) {
    const t = v / 0.6;
    return [clamp(90 + 120 * t), clamp(150 + 90 * t), clamp(230 - 40 * t)];
  }
  const t = (v - 0.6) / 0.4;
  return [
    clamp(70 - 30 * t + 40 * Math.sin(x / 24)),
    clamp(150 - 60 * t),
    clamp(50 - 20 * t),
  ];
}
const pixels = new Uint8ClampedArray(W * H * 4);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const [r, g, b] = srcPixel(x, y);
    const o = (y * W + x) * 4;
    pixels[o] = r;
    pixels[o + 1] = g;
    pixels[o + 2] = b;
    pixels[o + 3] = 255;
  }

// --- targets ----------------------------------------------------------------
function targets(brights: number[]): QuantizeTarget[] {
  const out: QuantizeTarget[] = [];
  for (const c of palette.colors)
    for (const b of brights)
      out.push({ rgb: c.shades[b] as [number, number, number], lab: c.lab[b] as [number, number, number] });
  return out;
}
const flat = targets([1]);
const stair = targets([0, 1, 2]);

// --- PNG writer (truecolor) -------------------------------------------------
function writePng(file: string, rgb: Buffer) {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    let c = ~0;
    for (let i = 0; i < td.length; i++) {
      c ^= td[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(~c >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    rgb.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
}

function render(name: string, tg: QuantizeTarget[], dither: DitherMethod) {
  const idx = quantizeImage(pixels, W, H, tg, { metric: "lab", dither, strength: 100 });
  const rgb = Buffer.alloc(W * H * 3);
  const used = new Set<number>();
  for (let p = 0; p < idx.length; p++) {
    const i = idx[p];
    used.add(i);
    const [r, g, b] = i < 0 ? [0, 0, 0] : tg[i].rgb;
    rgb[p * 3] = r;
    rgb[p * 3 + 1] = g;
    rgb[p * 3 + 2] = b;
  }
  const dir = path.join(ROOT, "qa");
  fs.mkdirSync(dir, { recursive: true });
  writePng(path.join(dir, `${name}.png`), rgb);
  console.log(`${name}: ${used.size} distinct swatches used`);
}

render("flat-none", flat, "none");
render("flat-fs", flat, "floyd-steinberg");
render("stair-fs", stair, "floyd-steinberg");
render("stair-bayer", stair, "bayer4x4");
console.log("wrote qa/*.png");
