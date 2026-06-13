import { lazy, Suspense, useEffect, useState } from "react";
import { Segmented } from "@/components/Segmented";
import { MapPreview2D } from "@/components/MapPreview2D";
import { BuildAssistant } from "@/components/BuildAssistant";
import { useProject } from "@/state/projectStore";
import type { MapArtResult } from "@/mapart/render";
import type { BuildPlan } from "@/mapart/buildPlan";
import type { LoadedPalette } from "@/mapart/palette";

// Three.js is heavy — only load it when the 3D view is opened.
const BuildPreview3D = lazy(() =>
  import("@/three/BuildPreview").then((m) => ({ default: m.BuildPreview3D })),
);

type View = "2d" | "3d" | "build";

interface PreviewStageProps {
  result: MapArtResult;
  plan: BuildPlan;
  palette: LoadedPalette;
}

export function PreviewStage({ result, plan, palette }: PreviewStageProps) {
  const sourceName = useProject((s) => s.source?.name ?? "mapart");
  const [view, setView] = useState<View>("2d");
  const [showSupports, setShowSupports] = useState(true);
  const [slice, setSlice] = useState<number | null>(null);

  // Reset the layer slice whenever the build height changes.
  useEffect(() => setSlice(null), [plan.height]);
  const sliceMax = slice ?? plan.height - 1;
  const sliced = sliceMax < plan.height - 1;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {view === "2d" && (
        <div className="flex h-full w-full items-center justify-center p-4">
          <MapPreview2D result={result} />
        </div>
      )}

      {view === "3d" && (
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-sm text-ink-400">
              Loading 3D…
            </div>
          }
        >
          <BuildPreview3D
            plan={plan}
            palette={palette}
            sliceMax={sliceMax}
            showSupports={showSupports}
          />
        </Suspense>
      )}

      {view === "build" && (
        <BuildAssistant plan={plan} palette={palette} sourceName={sourceName} />
      )}

      {/* view toggle */}
      <div className="absolute left-3 top-3 z-10">
        <Segmented<View>
          options={[
            { value: "2d", label: "Map" },
            { value: "3d", label: "3D build" },
            { value: "build", label: "Guide" },
          ]}
          value={view}
          onChange={setView}
          size="sm"
        />
      </div>

      {/* dims (map / 3d only — guide has its own header) */}
      {view !== "build" && (
        <div className="absolute bottom-3 right-3 z-10 rounded-lg bg-ink-950/70 px-2.5 py-1 font-mono text-xs text-ink-300 backdrop-blur">
          {result.width} × {result.height}
          {view === "3d" ? ` × ${plan.height}` : ""}
        </div>
      )}

      {/* 3D controls */}
      {view === "3d" && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 rounded-xl bg-ink-950/70 px-3 py-2 text-xs text-ink-300 backdrop-blur">
          {plan.height > 1 && (
            <label className="flex items-center gap-2">
              <span>Layers</span>
              <input
                type="range"
                min={0}
                max={plan.height - 1}
                value={sliceMax}
                onChange={(e) => setSlice(Number(e.target.value))}
                className="w-28"
              />
              <span className="w-12 font-mono tabular-nums">
                {sliced ? `≤${sliceMax + 1}` : "all"}
              </span>
            </label>
          )}
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={showSupports}
              onChange={(e) => setShowSupports(e.target.checked)}
              className="accent-accent"
            />
            <span>Supports</span>
          </label>
          <span className="text-ink-500">drag to orbit · scroll to zoom</span>
        </div>
      )}
    </div>
  );
}
