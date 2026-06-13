import { useProject } from "@/state/projectStore";
import { Segmented } from "@/components/Segmented";
import { MAP_SIZE, type SizeMode } from "@/types";
import { targetDimensions } from "@/lib/image";

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div className="flex items-center rounded-lg border border-ink-700/70 bg-ink-900/70">
      <button
        type="button"
        className="px-2.5 py-1.5 text-ink-300 hover:text-ink-100"
        onClick={() => onChange(clamp(value - 1))}
      >
        −
      </button>
      <span className="min-w-7 text-center font-mono text-sm tabular-nums">{value}</span>
      <button
        type="button"
        className="px-2.5 py-1.5 text-ink-300 hover:text-ink-100"
        onClick={() => onChange(clamp(value + 1))}
      >
        +
      </button>
    </div>
  );
}

export function SizePanel() {
  const settings = useProject((s) => s.settings);
  const patch = useProject((s) => s.patchSettings);
  const { width, height } = targetDimensions(settings);
  const maps = Math.ceil(width / MAP_SIZE) * Math.ceil(height / MAP_SIZE);

  return (
    <div className="space-y-3">
      <Segmented<SizeMode>
        options={[
          { value: "maps", label: "By maps" },
          { value: "free", label: "Free size" },
        ]}
        value={settings.sizeMode}
        onChange={(sizeMode) => patch({ sizeMode })}
        size="sm"
      />

      {settings.sizeMode === "maps" ? (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-400">W</span>
            <Stepper
              value={settings.mapsWide}
              min={1}
              max={16}
              onChange={(mapsWide) => patch({ mapsWide })}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-400">H</span>
            <Stepper
              value={settings.mapsTall}
              min={1}
              max={16}
              onChange={(mapsTall) => patch({ mapsTall })}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="field"
            min={1}
            max={2048}
            value={settings.freeWidth}
            onChange={(e) => patch({ freeWidth: Number(e.target.value) })}
          />
          <span className="text-ink-500">×</span>
          <input
            type="number"
            className="field"
            min={1}
            max={2048}
            value={settings.freeHeight}
            onChange={(e) => patch({ freeHeight: Number(e.target.value) })}
          />
        </div>
      )}

      <p className="font-mono text-xs text-ink-500">
        {width} × {height} blocks · {maps} map{maps === 1 ? "" : "s"}
      </p>
    </div>
  );
}
