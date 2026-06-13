import { Logo } from "@/components/Logo";
import { Segmented } from "@/components/Segmented";
import { useProject, type UiMode } from "@/state/projectStore";

interface TopBarProps {
  canExport: boolean;
  onExport: () => void;
}

export function TopBar({ canExport, onExport }: TopBarProps) {
  const uiMode = useProject((s) => s.uiMode);
  const setUiMode = useProject((s) => s.setUiMode);

  return (
    <header className="flex items-center justify-between gap-4 border-b border-ink-800/70 px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        <Logo />
        <div className="leading-tight">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold tracking-tight text-ink-100">
              Mapwright
            </span>
            <span className="hidden text-xs text-ink-400 sm:inline">
              Minecraft Map Art Studio
            </span>
          </div>
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
