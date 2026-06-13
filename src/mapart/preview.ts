import type { MapArtResult } from "@/mapart/render";
import type { BuildPlan } from "@/mapart/buildPlan";
import type { LoadedPalette } from "@/mapart/palette";

/** Convert an index map to an ImageData of the rendered map colours. */
export function resultToImageData(result: MapArtResult): ImageData {
  const { width, height, index, targets } = result;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < index.length; p++) {
    const idx = index[p];
    const o = p * 4;
    if (idx < 0) {
      data[o + 3] = 0;
      continue;
    }
    const [r, g, b] = targets[idx].rgb;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = 255;
  }
  return new ImageData(data, width, height);
}

/** Render a build plan's top-down map colours to ImageData (for PNG export). */
export function planToImageData(plan: BuildPlan, palette: LoadedPalette): ImageData {
  const { width, length } = plan;
  const data = new Uint8ClampedArray(width * length * 4);
  for (let p = 0; p < plan.colorId.length; p++) {
    const cid = plan.colorId[p];
    const o = p * 4;
    if (cid < 0) {
      data[o + 3] = 0;
      continue;
    }
    const color = palette.byId.get(cid);
    if (!color) continue;
    const [r, g, b] = color.shades[plan.brightnessId[p]];
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = 255;
  }
  return new ImageData(data, width, length);
}
