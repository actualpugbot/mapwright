import { useEffect, useRef } from "react";
import type { MapArtResult } from "@/mapart/render";
import { resultToImageData } from "@/mapart/preview";
import { MAP_SIZE } from "@/types";

interface MapPreview2DProps {
  result: MapArtResult;
  showGrid?: boolean;
}

/** Pixel-perfect render of the map-art result, fit to its container. */
export function MapPreview2D({ result, showGrid = true }: MapPreview2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(resultToImageData(result), 0, 0);
  }, [result]);

  const mapsWide = Math.ceil(result.width / MAP_SIZE);
  const mapsTall = Math.ceil(result.height / MAP_SIZE);

  return (
    <div className="relative flex max-h-full max-w-full items-center justify-center">
      <div className="checker relative">
        <canvas
          ref={canvasRef}
          className="pixelated block max-h-[70vh] max-w-full"
          style={{ aspectRatio: `${result.width} / ${result.height}` }}
        />
        {showGrid && (mapsWide > 1 || mapsTall > 1) && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(28,39,48,0.28) 1px, transparent 1px)," +
                "linear-gradient(to bottom, rgba(28,39,48,0.28) 1px, transparent 1px)",
              backgroundSize: `${100 / mapsWide}% ${100 / mapsTall}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}
