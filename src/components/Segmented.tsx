interface Option<T extends string> {
  value: T;
  label: string;
  title?: string;
}

interface SegmentedProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}

/** Minimal segmented (pill) control used throughout the UI. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: SegmentedProps<T>) {
  return (
    <div className="seg" role="tablist">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={[
              "seg-item",
              size === "sm" ? "px-2.5 py-1 text-xs" : "",
              active ? "seg-item-active" : "",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
