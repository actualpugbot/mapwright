import { useProject } from "@/state/projectStore";
import { Slider } from "@/components/ui/Slider";
import type { ImageAdjustments } from "@/types";

export function AdjustPanel() {
  const adjust = useProject((s) => s.settings.adjust);
  const patchAdjust = useProject((s) => s.patchAdjust);

  return (
    <div className="space-y-3">
      <Slider label="Brightness" value={adjust.brightness} min={-100} max={100} resetTo={0} onChange={(v) => patchAdjust({ brightness: v })} />
      <Slider label="Contrast" value={adjust.contrast} min={-100} max={100} resetTo={0} onChange={(v) => patchAdjust({ contrast: v })} />
      <Slider label="Saturation" value={adjust.saturation} min={-100} max={100} resetTo={0} onChange={(v) => patchAdjust({ saturation: v })} />

      <div className="flex items-center justify-between pt-1">
        <span className="text-sm text-ink-300">Orient</span>
        <div className="flex items-center gap-1.5">
          <IconBtn label="Rotate" onClick={() => patchAdjust({ rotate: (((adjust.rotate + 90) % 360) as ImageAdjustments["rotate"]) })}>
            <RotateIcon />
          </IconBtn>
          <IconBtn label="Flip horizontal" active={adjust.flipH} onClick={() => patchAdjust({ flipH: !adjust.flipH })}>
            <span className="font-mono text-xs">⇋</span>
          </IconBtn>
          <IconBtn label="Flip vertical" active={adjust.flipV} onClick={() => patchAdjust({ flipV: !adjust.flipV })}>
            <span className="font-mono text-xs">⇅</span>
          </IconBtn>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-300">Transparency</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => patchAdjust({ background: null })}
            className={`checker h-7 w-7 rounded-md border ${adjust.background === null ? "border-accent" : "border-ink-700"}`}
            title="Keep transparent (maps to nothing)"
          />
          <input
            type="color"
            value={adjust.background ?? "#000000"}
            onChange={(e) => patchAdjust({ background: e.target.value })}
            className="h-7 w-7 cursor-pointer rounded-md border border-ink-700 bg-transparent"
            title="Fill transparent areas with a colour"
          />
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md border text-ink-200 ${
        active ? "border-accent bg-accent/15" : "border-ink-700 hover:bg-ink-800/60"
      }`}
    >
      {children}
    </button>
  );
}

function RotateIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M21 12a9 9 0 1 1-3-6.7M21 4v4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
