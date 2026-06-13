import { useProject } from "@/state/projectStore";
import { PRESETS, applyPreset } from "@/optimizer/presets";
import type { LoadedPalette } from "@/mapart/palette";

interface BlocksPanelProps {
  palette: LoadedPalette;
}

/** Cost-optimizer presets: re-pick the block for every colour under a constraint. */
export function BlocksPanel({ palette }: BlocksPanelProps) {
  const patch = useProject((s) => s.patchSettings);
  const choices = useProject((s) => s.settings.blockChoices);
  const overrideCount = Object.keys(choices).length;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.desc}
            className="btn-ghost text-xs"
            onClick={() =>
              patch({ blockChoices: p.id === "default" ? {} : applyPreset(palette, p) })
            }
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-500">
        {overrideCount === 0
          ? "Using the recommended block for each colour."
          : `${overrideCount} colour${overrideCount === 1 ? "" : "s"} re-assigned.`}
      </p>
    </div>
  );
}
