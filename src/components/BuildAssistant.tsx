import { useEffect, useMemo, useRef, useState } from "react";
import type { BuildPlan } from "@/mapart/buildPlan";
import { materials } from "@/mapart/buildPlan";
import { blockLookup, textureUrl, type LoadedPalette } from "@/mapart/palette";
import {
  layerImageData,
  layerMaterials,
  nonEmptyLayers,
  progressUpTo,
} from "@/assistant/layers";

interface BuildAssistantProps {
  plan: BuildPlan;
  palette: LoadedPalette;
  sourceName: string;
}

export function BuildAssistant({ plan, palette, sourceName }: BuildAssistantProps) {
  const layers = useMemo(() => nonEmptyLayers(plan), [plan]);
  const lookup = useMemo(() => blockLookup(palette), [palette]);
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [plan]);

  const safeIdx = Math.min(idx, layers.length - 1);
  const y = layers[safeIdx] ?? 0;
  const layerMats = useMemo(() => layerMaterials(plan, y), [plan, y]);
  const prog = useMemo(() => progressUpTo(plan, y), [plan, y]);
  const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = plan.width;
    c.height = plan.length;
    c.getContext("2d")!.putImageData(layerImageData(plan, palette, y), 0, 0);
  }, [plan, palette, y]);

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* header: progress + nav */}
      <div className="flex items-center justify-between gap-3 border-b border-ink-800/70 px-4 py-2.5">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink-100">
            Layer {safeIdx + 1}{" "}
            <span className="font-normal text-ink-400">of {layers.length}</span>
            <span className="ml-2 font-mono text-xs text-ink-500">y = {y}</span>
          </div>
          <div className="mt-1 h-1.5 w-44 overflow-hidden rounded-full bg-ink-700">
            <div className="h-full bg-grass" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="btn-ghost px-2.5 py-1.5"
            disabled={safeIdx === 0}
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
          >
            ← Prev
          </button>
          <button
            type="button"
            className="btn-primary px-2.5 py-1.5"
            disabled={safeIdx >= layers.length - 1}
            onClick={() => setIdx((i) => Math.min(layers.length - 1, i + 1))}
          >
            Next →
          </button>
          <button
            type="button"
            className="btn-ghost px-2.5 py-1.5"
            title="Open a printable checklist"
            onClick={() => printChecklist(plan, palette, sourceName)}
          >
            Print
          </button>
        </div>
      </div>

      {/* layer view */}
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          className="pixelated checker max-h-full max-w-full"
          style={{ aspectRatio: `${plan.width} / ${plan.length}` }}
        />
      </div>

      {/* this-layer materials */}
      <div className="border-t border-ink-800/70 px-4 py-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label">Place this layer</span>
          <span className="font-mono text-xs text-ink-500">
            {prog.done.toLocaleString()} / {prog.total.toLocaleString()} blocks
          </span>
        </div>
        <div className="scroll-thin flex gap-2 overflow-x-auto pb-1">
          {layerMats.map((m) => {
            const info = lookup.get(m.blockId);
            const url = info ? textureUrl(palette, info.texture) : null;
            return (
              <div
                key={m.blockId}
                title={info?.label ?? m.blockId}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-700/60 bg-ink-900/50 py-1 pl-1 pr-2"
              >
                <span
                  className="pixelated h-5 w-5 rounded"
                  style={
                    url
                      ? { backgroundImage: `url(${url})`, backgroundSize: "cover" }
                      : { background: `rgb(${info?.rgb.join(",") ?? "80,80,80"})` }
                  }
                />
                <span className="font-mono text-xs tabular-nums text-ink-300">{m.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Open a printable, per-layer build checklist in a new window. */
function printChecklist(plan: BuildPlan, palette: LoadedPalette, sourceName: string) {
  const lookup = blockLookup(palette);
  const layers = nonEmptyLayers(plan);
  const label = (id: string) => lookup.get(id)?.label ?? id.replace("minecraft:", "");
  const total = materials(plan);

  const rows = layers
    .map((y, i) => {
      const mats = layerMaterials(plan, y)
        .map((m) => `<li>${label(m.blockId)} × <b>${m.count}</b></li>`)
        .join("");
      return `<section><h3>Layer ${i + 1} <small>(y=${y})</small></h3><ul>${mats}</ul></section>`;
    })
    .join("");

  const totals = total
    .map((m) => `<li>${label(m.blockId)} × <b>${m.count.toLocaleString()}</b></li>`)
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${sourceName} — build checklist</title>
<style>
  body{font:14px/1.5 system-ui,sans-serif;color:#111;margin:32px;max-width:760px}
  h1{font-size:22px;margin:0 0 4px} h2{margin-top:28px;border-bottom:1px solid #ccc;padding-bottom:4px}
  h3{margin:18px 0 6px;font-size:15px} h3 small{color:#888;font-weight:400}
  ul{margin:0 0 8px 18px;padding:0;columns:2} li{break-inside:avoid}
  section{break-inside:avoid;margin-bottom:8px}
  @media print{a{display:none}}
</style></head><body>
  <h1>${sourceName} — Minecraft map art</h1>
  <div>${plan.width}×${plan.length}, ${plan.height} layers · ${total.reduce((n, m) => n + m.count, 0).toLocaleString()} blocks · made with Mapwright</div>
  <h2>Total materials</h2><ul>${totals}</ul>
  <h2>Layer by layer (build bottom → top)</h2>${rows}
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
