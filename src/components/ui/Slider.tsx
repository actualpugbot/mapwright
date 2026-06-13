interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  /** Double-click the value to reset here. */
  resetTo?: number;
  onChange: (v: number) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  resetTo,
  onChange,
}: SliderProps) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-ink-300">{label}</span>
        <span
          className="cursor-pointer font-mono text-xs text-ink-400 tabular-nums hover:text-ink-200"
          onDoubleClick={() => resetTo !== undefined && onChange(resetTo)}
          title={resetTo !== undefined ? "Double-click to reset" : undefined}
        >
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
