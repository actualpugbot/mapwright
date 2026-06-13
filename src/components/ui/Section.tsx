import { useState, type ReactNode } from "react";

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  right?: ReactNode;
  children: ReactNode;
}

/** Collapsible labelled section used to group controls in the rail. */
export function Section({ title, defaultOpen = true, right, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-ink-800/70 py-4 first:pt-0 last:border-0">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-300 hover:text-ink-100"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            className={`transition-transform ${open ? "" : "-rotate-90"}`}
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {title}
        </button>
        {right}
      </div>
      {open && <div className="space-y-3">{children}</div>}
    </section>
  );
}
