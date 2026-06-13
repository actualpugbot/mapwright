import { useMemo } from "react";
import { materials, type BuildPlan } from "@/mapart/buildPlan";
import { blockLookup, textureUrl, type LoadedPalette } from "@/mapart/palette";
import { exportLitematic, FORMATS } from "@/export";
import { acquisition, gatherSummary } from "@/optimizer/gather";

interface OutputPanelProps {
  plan: BuildPlan;
  palette: LoadedPalette;
  sourceName: string;
}

const STACK = 64;

export function OutputPanel({ plan, palette, sourceName }: OutputPanelProps) {
  const mats = useMemo(() => materials(plan), [plan]);
  const lookup = useMemo(() => blockLookup(palette), [palette]);
  const summary = useMemo(() => gatherSummary(mats, lookup), [mats, lookup]);
  const total = summary.totalBlocks;
  const shulkers = summary.shulkers;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => exportLitematic(plan, palette, sourceName)}
        >
          Download .litematic
        </button>
        <div className="grid grid-cols-2 gap-1.5">
          {FORMATS.filter((f) => !f.primary).map((f) => (
            <button
              key={f.id}
              type="button"
              title={f.hint}
              className="btn-ghost justify-between text-xs"
              onClick={() => f.run(plan, palette, sourceName)}
            >
              <span>{f.label}</span>
              <span className="font-mono text-ink-500">{f.ext}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat label="Size" value={`${plan.width}×${plan.length}`} />
        <Stat label="Layers" value={`${plan.height}`} />
        <Stat label="Blocks" value={compact(total)} />
        <Stat label="Renewable" value={`${Math.round(summary.renewablePct * 100)}%`} />
      </div>

      {!plan.worldFits && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This build is {plan.height} blocks tall — taller than the world. Reduce the
          size or split it into separate schematics.
        </p>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="label">Materials · {mats.length} types</span>
          <span className="font-mono text-xs text-ink-500">
            ~{shulkers} shulker{shulkers === 1 ? "" : "s"}
          </span>
        </div>
        <ul className="scroll-thin max-h-72 space-y-1 overflow-y-auto pr-1">
          {mats.map((m) => {
            const info = lookup.get(m.blockId);
            const url = info ? textureUrl(palette, info.texture) : null;
            const acq = acquisition(m.blockId);
            const stacks = Math.floor(m.count / STACK);
            const rem = m.count % STACK;
            return (
              <li
                key={m.blockId}
                title={`${info?.label ?? m.blockId} — ${acq.method}`}
                className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-ink-800/50"
              >
                <span
                  className="pixelated h-6 w-6 shrink-0 rounded border border-ink-700"
                  style={
                    url
                      ? { backgroundImage: `url(${url})`, backgroundSize: "cover" }
                      : info
                        ? { background: `rgb(${info.rgb.join(",")})` }
                        : { background: "#333" }
                  }
                />
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="truncate text-sm text-ink-200">
                    {info?.label ?? m.blockId.replace("minecraft:", "")}
                  </span>
                  {acq.renewable && (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-grass"
                      title="Renewable"
                    />
                  )}
                </span>
                <span className="shrink-0 text-right font-mono text-xs tabular-nums text-ink-400">
                  {m.count.toLocaleString()}
                  <span className="ml-1 text-ink-600">
                    {stacks > 0 ? `${stacks}×64${rem ? `+${rem}` : ""}` : ""}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function compact(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-700/60 bg-ink-900/50 px-2 py-1.5">
      <div className="font-mono text-sm text-ink-100 tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-ink-500">{label}</div>
    </div>
  );
}
