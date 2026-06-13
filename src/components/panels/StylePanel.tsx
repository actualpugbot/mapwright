import { useProject } from "@/state/projectStore";
import { Segmented } from "@/components/Segmented";
import { Slider } from "@/components/ui/Slider";
import type {
  BuildMode,
  ColorMetric,
  DitherMethod,
  StaircaseMode,
  SupportMode,
} from "@/types";

const DITHER_OPTIONS: { value: DitherMethod; label: string }[] = [
  { value: "none", label: "None (crisp)" },
  { value: "floyd-steinberg", label: "Floyd–Steinberg" },
  { value: "atkinson", label: "Atkinson" },
  { value: "bayer4x4", label: "Ordered 4×4" },
  { value: "bayer2x2", label: "Ordered 2×2" },
  { value: "stucki", label: "Stucki" },
  { value: "burkes", label: "Burkes" },
  { value: "sierra-lite", label: "Sierra Lite" },
];

interface StylePanelProps {
  advanced?: boolean;
}

export function StylePanel({ advanced = false }: StylePanelProps) {
  const settings = useProject((s) => s.settings);
  const patch = useProject((s) => s.patchSettings);
  const staircase = settings.buildMode === "staircase";

  return (
    <div className="space-y-3">
      <div>
        <div className="label mb-1.5">Build mode</div>
        <Segmented<BuildMode>
          options={[
            { value: "flat", label: "Flat", title: "Single floor — easy to build, ~61 colours" },
            { value: "staircase", label: "Staircase", title: "Height variation — ~3× colours, richer" },
          ]}
          value={settings.buildMode}
          onChange={(buildMode) => patch({ buildMode })}
        />
      </div>

      {staircase && (
        <div>
          <div className="label mb-1.5">Staircase style</div>
          <Segmented<StaircaseMode>
            options={[
              { value: "valley", label: "Compact", title: "Per-column floor — lowest possible build" },
              { value: "classic", label: "Aligned", title: "Shared floor across columns — taller but level base" },
            ]}
            value={settings.staircaseMode === "classic" ? "classic" : "valley"}
            onChange={(staircaseMode) => patch({ staircaseMode })}
            size="sm"
          />
        </div>
      )}

      <div>
        <div className="label mb-1.5">Colour match</div>
        <Segmented<ColorMetric>
          options={[
            { value: "lab", label: "Balanced", title: "CIE Lab — best general results" },
            { value: "ciede2000", label: "Best", title: "CIEDE2000 — most accurate, slower" },
            { value: "rgb", label: "Fast", title: "Raw RGB — quickest" },
          ]}
          value={settings.metric}
          onChange={(metric) => patch({ metric })}
          size="sm"
        />
      </div>

      <div>
        <div className="label mb-1.5">Dithering</div>
        <select
          className="field"
          value={settings.dither}
          onChange={(e) => patch({ dither: e.target.value as DitherMethod })}
        >
          {DITHER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {settings.dither !== "none" && (
        <Slider
          label="Dither strength"
          value={settings.ditherStrength}
          min={0}
          max={100}
          suffix="%"
          resetTo={100}
          onChange={(ditherStrength) => patch({ ditherStrength })}
        />
      )}

      {advanced && staircase && (
        <div>
          <div className="label mb-1.5">Support blocks</div>
          <Segmented<SupportMode>
            options={[
              { value: "none", label: "None" },
              { value: "important", label: "Important" },
              { value: "allOptimized", label: "All" },
            ]}
            value={settings.supportMode}
            onChange={(supportMode) => patch({ supportMode })}
            size="sm"
          />
          <p className="mt-1.5 text-xs text-ink-500">
            Adds blocks under gravity / transparent blocks so the build stands up.
          </p>
        </div>
      )}
    </div>
  );
}
