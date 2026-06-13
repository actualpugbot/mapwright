import { useState } from "react";
import { useProject } from "@/state/projectStore";
import {
  chosenBlock,
  textureUrl,
  type LoadedPalette,
  type PaletteColor,
} from "@/mapart/palette";

interface PaletteEditorProps {
  palette: LoadedPalette;
}

/** Per-colour block chooser: pick which block realizes each map colour, or exclude it. */
export function PaletteEditor({ palette }: PaletteEditorProps) {
  const settings = useProject((s) => s.settings);
  const patch = useProject((s) => s.patchSettings);
  const [selected, setSelected] = useState<number | null>(null);

  const colors = palette.colors.filter((c) => c.blocks.length > 0);
  const excluded = new Set(settings.excludedColors);
  const active = selected != null ? palette.byId.get(selected) : undefined;

  const swatchStyle = (c: PaletteColor) => {
    const b = chosenBlock(c, settings);
    const url = b ? textureUrl(palette, b.texture) : null;
    return url
      ? { backgroundImage: `url(${url})`, backgroundSize: "cover" }
      : { background: `rgb(${c.shades[1].join(",")})` };
  };

  const toggleExclude = (id: number) => {
    const next = excluded.has(id)
      ? settings.excludedColors.filter((x) => x !== id)
      : [...settings.excludedColors, id];
    patch({ excludedColors: next });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-8 gap-1">
        {colors.map((c) => (
          <button
            key={c.id}
            type="button"
            title={c.label}
            onClick={() => setSelected(c.id === selected ? null : c.id)}
            className={[
              "pixelated aspect-square rounded transition",
              "ring-offset-1 ring-offset-ink-850",
              c.id === selected ? "ring-2 ring-accent" : "ring-1 ring-ink-700/50",
              excluded.has(c.id) ? "opacity-25 grayscale" : "",
            ].join(" ")}
            style={swatchStyle(c)}
          />
        ))}
      </div>

      {active && (
        <div className="rounded-xl border border-ink-700/60 bg-ink-900/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-ink-100">{active.label}</span>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-400">
              <input
                type="checkbox"
                checked={excluded.has(active.id)}
                onChange={() => toggleExclude(active.id)}
                className="accent-accent"
              />
              Exclude colour
            </label>
          </div>
          <div className="scroll-thin flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            {active.blocks.map((b) => {
              const url = textureUrl(palette, b.texture);
              const isChosen = chosenBlock(active, settings)?.id === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  title={`${b.label}${b.gravity ? " · gravity" : ""}${b.transparent ? " · transparent" : ""}`}
                  onClick={() =>
                    patch({ blockChoices: { ...settings.blockChoices, [active.id]: b.id } })
                  }
                  className={[
                    "pixelated h-8 w-8 rounded border",
                    isChosen ? "border-accent ring-1 ring-accent" : "border-ink-700",
                  ].join(" ")}
                  style={
                    url
                      ? { backgroundImage: `url(${url})`, backgroundSize: "cover" }
                      : { background: `rgb(${active.shades[1].join(",")})` }
                  }
                />
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-500">
            {active.blocks.length} option{active.blocks.length === 1 ? "" : "s"} for this colour.
          </p>
        </div>
      )}

      {!active && (
        <p className="text-xs text-ink-500">
          Tap a colour to choose its block or exclude it.
        </p>
      )}
    </div>
  );
}
