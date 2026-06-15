import { MAP_SIZE, type ImageAdjustments, type Settings } from "@/types";
import type { SourceImage } from "@/state/projectStore";
import { hexToRgb } from "@/mapart/color";
import { fillTransparent } from "@/lib/inpaint";

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export async function loadImageFromBlob(
  blob: Blob,
  name: string,
): Promise<SourceImage> {
  const bitmap = await createImageBitmap(blob);
  const url = URL.createObjectURL(blob);
  return {
    name,
    url,
    width: bitmap.width,
    height: bitmap.height,
    bitmap,
    hasTransparency: detectTransparency(bitmap),
  };
}

/** True if the image contains any fully transparent pixel (alpha 0). */
function detectTransparency(bitmap: ImageBitmap): boolean {
  const c = makeCanvas(bitmap.width, bitmap.height);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) return true;
  }
  return false;
}

export async function loadImageFromFile(file: File): Promise<SourceImage> {
  return loadImageFromBlob(file, file.name);
}

export async function loadImageFromUrl(url: string): Promise<SourceImage> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  const blob = await res.blob();
  const name = url.split("/").pop()?.split("?")[0] || "image";
  return loadImageFromBlob(blob, name);
}

// ---------------------------------------------------------------------------
// Target dimensions
// ---------------------------------------------------------------------------

export function targetDimensions(settings: Settings): {
  width: number;
  height: number;
} {
  if (settings.sizeMode === "maps") {
    return {
      width: settings.mapsWide * MAP_SIZE,
      height: settings.mapsTall * MAP_SIZE,
    };
  }
  return {
    width: Math.max(1, Math.round(settings.freeWidth)),
    height: Math.max(1, Math.round(settings.freeHeight)),
  };
}

// ---------------------------------------------------------------------------
// Processing (orient → adjust → resize → ImageData)
// ---------------------------------------------------------------------------

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Apply rotation + flips, returning a canvas at the oriented source resolution. */
function orient(
  bitmap: ImageBitmap,
  rotate: ImageAdjustments["rotate"],
  flipH: boolean,
  flipV: boolean,
): HTMLCanvasElement {
  const swap = rotate === 90 || rotate === 270;
  const w = swap ? bitmap.height : bitmap.width;
  const h = swap ? bitmap.width : bitmap.height;
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d")!;
  ctx.translate(w / 2, h / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  return c;
}

function filterString(a: ImageAdjustments): string {
  const br = 1 + a.brightness / 100;
  const co = 1 + a.contrast / 100;
  const sa = 1 + a.saturation / 100;
  return `brightness(${br}) contrast(${co}) saturate(${sa})`;
}

/**
 * Produce the processed ImageData at the target block dimensions: oriented,
 * colour-adjusted, scaled to fit (cover).
 *
 * When `allowTransparency` is true, the source's alpha is preserved so the
 * quantizer can leave transparent areas blank. Otherwise every transparent
 * pixel is inpainted with the nearest image colour, so every cell becomes a
 * solid block of the right colour. Callers pass `allowTransparency` only when
 * the source genuinely has an alpha channel — this also scrubs the stray
 * transparent pixels the canvas downscaler can fabricate from an opaque image.
 */
export function processImage(
  bitmap: ImageBitmap,
  adjust: ImageAdjustments,
  targetW: number,
  targetH: number,
  allowTransparency = false,
): ImageData {
  const oriented = orient(bitmap, adjust.rotate, adjust.flipH, adjust.flipV);

  const out = makeCanvas(targetW, targetH);
  const ctx = out.getContext("2d", { willReadFrequently: true })!;

  // "cover" fit: scale so the image fills the target, centre-cropped.
  const scale = Math.max(targetW / oriented.width, targetH / oriented.height);
  const dw = oriented.width * scale;
  const dh = oriented.height * scale;
  const dx = (targetW - dw) / 2;
  const dy = (targetH - dh) / 2;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.filter = filterString(adjust);
  ctx.drawImage(oriented, dx, dy, dw, dh);
  ctx.filter = "none";

  const data = ctx.getImageData(0, 0, targetW, targetH);
  if (!allowTransparency) {
    fillTransparent(data.data, targetW, targetH, hexToRgb(adjust.background ?? "#000000"));
  }
  return data;
}

/** Render an ImageData to a fresh canvas (used for displaying processed source). */
export function imageDataToCanvas(data: ImageData): HTMLCanvasElement {
  const c = makeCanvas(data.width, data.height);
  c.getContext("2d")!.putImageData(data, 0, 0);
  return c;
}
