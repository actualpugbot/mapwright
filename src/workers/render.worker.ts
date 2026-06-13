import {
  quantizeImage,
  type QuantizeOptions,
  type QuantizeTarget,
} from "@/mapart/quantize";

interface RenderRequest {
  reqId: number;
  pixels: ArrayBuffer;
  width: number;
  height: number;
  targets: QuantizeTarget[];
  opts: QuantizeOptions;
}

self.onmessage = (e: MessageEvent<RenderRequest>) => {
  const { reqId, pixels, width, height, targets, opts } = e.data;
  const arr = new Uint8ClampedArray(pixels);
  const index = quantizeImage(arr, width, height, targets, opts);
  (self as unknown as Worker).postMessage({ reqId, index: index.buffer }, [
    index.buffer,
  ]);
};
