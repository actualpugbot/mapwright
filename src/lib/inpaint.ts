import type { RGB } from "@/types";

/**
 * Fill fully transparent pixels (alpha 0) in an RGBA buffer with the colour of
 * the nearest opaque pixel, then mark them opaque. This turns stray transparent
 * pixels / cut-out regions into solid blocks that match the surrounding image
 * (instead of dropping out as holes or collapsing to a flat fallback colour).
 *
 * Uses a multi-source breadth-first flood from every opaque pixel, so each
 * transparent pixel takes the colour of the closest opaque pixel (Manhattan
 * distance). O(width·height). Operates in place.
 *
 * If the image is entirely transparent there is nothing to sample, so every
 * pixel is set to `fallback`.
 */
export function fillTransparent(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  fallback: RGB,
): void {
  const n = width * height;
  const queue = new Int32Array(n);
  const known = new Uint8Array(n); // 1 once a pixel has a final colour
  let head = 0;
  let tail = 0;

  for (let p = 0; p < n; p++) {
    if (data[p * 4 + 3] !== 0) {
      known[p] = 1;
      queue[tail++] = p;
    }
  }

  if (tail === 0) {
    for (let p = 0; p < n; p++) {
      const o = p * 4;
      data[o] = fallback[0];
      data[o + 1] = fallback[1];
      data[o + 2] = fallback[2];
      data[o + 3] = 255;
    }
    return;
  }

  while (head < tail) {
    const p = queue[head++];
    const so = p * 4;
    const x = p % width;
    // 4-neighbourhood, guarding against horizontal wrap-around.
    if (x > 0) copyInto(p - 1, so);
    if (x < width - 1) copyInto(p + 1, so);
    copyInto(p - width, so);
    copyInto(p + width, so);
  }

  function copyInto(np: number, so: number) {
    if (np < 0 || np >= n || known[np]) return;
    const no = np * 4;
    data[no] = data[so];
    data[no + 1] = data[so + 1];
    data[no + 2] = data[so + 2];
    data[no + 3] = 255;
    known[np] = 1;
    queue[tail++] = np;
  }
}
