import { Logo } from "@/components/Logo";
import { Segmented } from "@/components/Segmented";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useProject, type UiMode } from "@/state/projectStore";

interface TopBarProps {
  canExport: boolean;
  onExport: () => void;
}

export function TopBar({ canExport, onExport }: TopBarProps) {
  const uiMode = useProject((s) => s.uiMode);
  const setUiMode = useProject((s) => s.setUiMode);

  return (
    <header className="flex items-center justify-between gap-4 border-b border-ink-700/70 bg-ink-850/70 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-ink-850/60 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex-none rounded-[10px]"
          style={{ boxShadow: "0 4px 12px rgba(47,116,224,0.3)" }}
        >
          <Logo size={34} />
        </span>
        <div className="flex items-baseline gap-2 leading-tight">
          <span className="font-display text-lg font-bold tracking-tight text-ink-100">
            Mapwright
          </span>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
            Beta
          </span>
          <span className="hidden text-sm text-ink-400 sm:inline">
            Minecraft Map Art Studio
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Segmented<UiMode>
          options={[
            { value: "quick", label: "Quick", title: "Drag, tweak, download" },
            {
              value: "advanced",
              label: "Advanced",
              title: "Every dial and export option",
            },
          ]}
          value={uiMode}
          onChange={setUiMode}
        />
        <ThemeToggle />
        <button
          type="button"
          className="btn-primary"
          disabled={!canExport}
          onClick={onExport}
        >
          <DownloadIcon />
          <span className="hidden sm:inline">Download</span>
          <span className="font-mono text-xs opacity-80">.litematic</span>
        </button>
      </div>
    </header>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
