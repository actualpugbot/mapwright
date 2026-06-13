import { useProject } from "@/state/projectStore";
import { Section } from "@/components/ui/Section";
import { SizePanel } from "@/components/panels/SizePanel";
import { AdjustPanel } from "@/components/panels/AdjustPanel";
import { StylePanel } from "@/components/panels/StylePanel";
import { BlocksPanel } from "@/components/panels/BlocksPanel";
import { PaletteEditor } from "@/components/panels/PaletteEditor";
import { OutputPanel } from "@/components/panels/OutputPanel";
import { ImageDropzone } from "@/components/ImageDropzone";
import type { BuildPlan } from "@/mapart/buildPlan";
import type { LoadedPalette } from "@/mapart/palette";

interface ControlsRailProps {
  plan: BuildPlan | null;
  palette: LoadedPalette | null;
}

export function ControlsRail({ plan, palette }: ControlsRailProps) {
  const uiMode = useProject((s) => s.uiMode);
  const source = useProject((s) => s.source);
  const advanced = uiMode === "advanced";

  if (!source) {
    return (
      <p className="text-sm text-ink-400">
        Drop an image on the left to start. Switch to{" "}
        <span className="text-ink-200">Advanced</span> for every dial.
      </p>
    );
  }

  return (
    <div className="-my-2">
      <Section title="Image" defaultOpen={advanced}>
        <div className="mb-2 flex items-center gap-2">
          <img
            src={source.url}
            alt=""
            className="h-10 w-10 rounded-md border border-ink-700 object-cover"
          />
          <div className="min-w-0">
            <div className="truncate text-sm text-ink-200">{source.name}</div>
            <div className="font-mono text-xs text-ink-500">
              {source.width}×{source.height}
            </div>
          </div>
        </div>
        <ImageDropzone variant="compact" />
      </Section>

      <Section title="Size">
        <SizePanel />
      </Section>

      <Section title="Style">
        <StylePanel advanced={advanced} />
      </Section>

      {palette && (
        <Section title="Blocks">
          <BlocksPanel palette={palette} />
          {advanced && (
            <div className="mt-3 border-t border-ink-800/70 pt-3">
              <PaletteEditor palette={palette} />
            </div>
          )}
        </Section>
      )}

      {advanced && (
        <Section title="Adjust image" defaultOpen={false}>
          <AdjustPanel />
        </Section>
      )}

      {plan && palette && (
        <Section title="Output">
          <OutputPanel plan={plan} palette={palette} sourceName={source.name} />
        </Section>
      )}
    </div>
  );
}
