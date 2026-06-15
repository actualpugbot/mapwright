import { useProject } from "@/state/projectStore";
import { Slider } from "@/components/ui/Slider";
import type { ImageAdjustments } from "@/types";

export function AdjustPanel() {
  const adjust = useProject((s) => s.settings.adjust);
  const patchAdjust = useProject((s) => s.patchAdjust);
  const source = useProject((s) => s.source);

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

      {(() => {
        // "Leave blank" only does anything when the source actually has an alpha
        // channel. For an opaque image every pixel always becomes a block.
        const opaque = !!source && !source.hasTransparency;
        return (
          <>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-ink-300">Transparent areas</span>
              <div className="flex items-center overflow-hidden rounded-md border border-ink-700 text-xs">
                <button
                  type="button"
                  onClick={() => patchAdjust({ allowTransparency: false })}
                  title="Fill transparent areas with nearby colours"
                  className={`h-7 px-2.5 ${
                    !adjust.allowTransparency
                      ? "bg-accent/15 text-ink-100"
                      : "text-ink-300 hover:bg-ink-800/60"
                  }`}
                >
                  Fill
                </button>
                <button
                  type="button"
                  disabled={opaque}
                  onClick={() => patchAdjust({ allowTransparency: true })}
                  title={
                    opaque
                      ? "This image is fully opaque — nothing to leave blank"
                      : "Leave transparent areas blank (no blocks)"
                  }
                  className={`h-7 border-l border-ink-700 px-2.5 ${
                    opaque
                      ? "cursor-not-allowed text-ink-600"
                      : adjust.allowTransparency
                        ? "bg-accent/15 text-ink-100"
                        : "text-ink-300 hover:bg-ink-800/60"
                  }`}
                >
                  Leave blank
                </button>
              </div>
            </div>
            {source && (
              <p className="text-xs text-ink-500">
                {opaque
                  ? "Fully opaque image — every pixel becomes a block."
                  : adjust.allowTransparency
                    ? "Transparent areas are left blank."
                    : "Transparent areas are filled with nearby colours."}
              </p>
            )}
          </>
        );
      })()}
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
