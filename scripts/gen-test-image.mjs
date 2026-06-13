// Generate a colourful 512×512 test PNG (public/test.png) for QA: a sky-to-grass
// landscape with a sun and hue sweep — good for eyeballing colour matching + dithering.
import fs from "node:fs";
import zlib from "node:zlib";

const W = 512;
const H = 512;
const rgb = Buffer.alloc(W * H * 3);

function set(x, y, r, g, b) {
  const o = (y * W + x) * 3;
  rgb[o] = r;
  rgb[o + 1] = g;
  rgb[o + 2] = b;
}

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const v = y / H;
    let r, g, b;
    if (v < 0.6) {
      // sky: blue → light gradient with a warm horizon
      const t = v / 0.6;
      r = Math.round(90 + 120 * t);
      g = Math.round(150 + 90 * t);
      b = Math.round(230 - 40 * t);
    } else {
      // ground: green grass with depth shading
      const t = (v - 0.6) / 0.4;
      r = Math.round(70 - 30 * t + 40 * Math.sin(x / 24));
      g = Math.round(150 - 60 * t);
      b = Math.round(50 - 20 * t);
    }
    set(x, y, clamp(r), clamp(g), clamp(b));
  }
}

// sun
const cx = 140,
  cy = 130,
  rad = 60;
for (let y = cy - rad; y <= cy + rad; y++) {
  for (let x = cx - rad; x <= cx + rad; x++) {
    if ((x - cx) ** 2 + (y - cy) ** 2 <= rad * rad) set(x, y, 255, 230, 120);
  }
}

// hue sweep strip along the bottom (tests the full palette)
for (let x = 0; x < W; x++) {
  const [r, g, b] = hsv((x / W) * 360, 0.85, 0.95);
  for (let y = H - 40; y < H; y++) set(x, y, r, g, b);
}

function clamp(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}
function hsv(h, s, v) {
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

// --- minimal PNG (truecolor, filter 0) --------------------------------------
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td) >>> 0);
  return Buffer.concat([len, td, crc]);
}
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // colour type 2 = truecolor

const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0; // filter: none
  rgb.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
}

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);

fs.mkdirSync("public", { recursive: true });
fs.writeFileSync("public/test.png", png);
console.log(`wrote public/test.png (${png.length} bytes)`);
