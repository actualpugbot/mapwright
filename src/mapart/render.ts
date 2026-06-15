import { processImage, targetDimensions } from "@/lib/image";
import {
  buildMatchTargets,
  type LoadedPalette,
  type MatchTarget,
} from "@/mapart/palette";
import type { QuantizeOptions } from "@/mapart/quantize";
import type { Settings } from "@/types";

export interface MapArtResult {
  width: number;
  height: number;
  /** Candidate (colour, shade) swatches the index map points into. */
  targets: MatchTarget[];
  /** Per-pixel target index, or -1 for transparent. Row-major (y*width+x). */
  index: Int16Array;
}

// --- worker plumbing --------------------------------------------------------

let _worker: Worker | null = null;
let _seq = 0;
const _pending = new Map<number, (buf: ArrayBuffer) => void>();

function getWorker(): Worker {
  if (!_worker) {
    _worker = new Worker(new URL("../workers/render.worker.ts", import.meta.url), {
      type: "module",
    });
    _worker.onmessage = (e: MessageEvent<{ reqId: number; index: ArrayBuffer }>) => {
      const resolve = _pending.get(e.data.reqId);
      if (resolve) {
        _pending.delete(e.data.reqId);
        resolve(e.data.index);
      }
    };
  }
  return _worker;
}

function quantizeInWorker(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  targets: MatchTarget[],
  opts: QuantizeOptions,
): Promise<Int16Array> {
  return new Promise((resolve) => {
    const reqId = ++_seq;
    _pending.set(reqId, (buf) => resolve(new Int16Array(buf)));
    const copy = pixels.slice().buffer; // own a transferable copy
    getWorker().postMessage(
      {
        reqId,
        pixels: copy,
        width,
        height,
        targets: targets.map((t) => ({ rgb: t.rgb, lab: t.lab })),
        opts,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      [copy],
    );
  });
}

/** Run the full pipeline: orient/adjust/resize → quantize → index map. */
export async function renderMapArt(
  bitmap: ImageBitmap,
  settings: Settings,
  palette: LoadedPalette,
  sourceHasTransparency = false,
): Promise<MapArtResult> {
  const { width, height } = targetDimensions(settings);
  // "Leave blank" only applies when the source genuinely has an alpha channel.
  // An opaque image can never be left blank — so canvas resampling artefacts
  // (stray transparent pixels from the downscale) are always filled, never
  // dropped. This is what guarantees an opaque image never has empty cells.
  const allowTransparency = settings.adjust.allowTransparency && sourceHasTransparency;
  const imageData = processImage(bitmap, settings.adjust, width, height, allowTransparency);
  const targets = buildMatchTargets(palette, settings);
  const index = await quantizeInWorker(imageData.data, width, height, targets, {
    metric: settings.metric,
    dither: settings.dither,
    strength: settings.ditherStrength,
    allowTransparency,
  });
  return { width, height, targets, index };
}
