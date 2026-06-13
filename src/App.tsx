import { useCallback, useEffect } from "react";
import { TopBar } from "@/components/TopBar";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ControlsRail } from "@/components/ControlsRail";
import { PreviewStage } from "@/components/PreviewStage";
import { useProject } from "@/state/projectStore";
import { useMapArt } from "@/hooks/useMapArt";
import { loadImageFromBlob } from "@/lib/image";
import { exportLitematic } from "@/export";

export default function App() {
  const source = useProject((s) => s.source);
  const setSource = useProject((s) => s.setSource);
  const { result, status, error, palette, plan } = useMapArt();

  const canExport = Boolean(plan && palette && source);
  const onExport = useCallback(() => {
    if (plan && palette && source) exportLitematic(plan, palette, source.name);
  }, [plan, palette, source]);

  // Paste an image from the clipboard anywhere in the app.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (file) void loadImageFromBlob(file, "pasted-image").then(setSource);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [setSource]);

  return (
    <div className="flex h-full flex-col">
      <TopBar canExport={canExport} onExport={onExport} />

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_360px]">
        <section className="panel relative flex min-h-[60vh] items-center justify-center overflow-hidden p-4 lg:min-h-0">
          {error ? (
            <div className="max-w-sm text-center text-sm text-red-600">
              Couldn't load the block palette: {error}
            </div>
          ) : !source ? (
            <ImageDropzone variant="full" />
          ) : result && plan && palette ? (
            <>
              <PreviewStage result={result} plan={plan} palette={palette} />
              {status === "rendering" && <RenderingBadge />}
            </>
          ) : (
            <Spinner />
          )}
        </section>

        <aside className="panel panel-pad scroll-thin overflow-y-auto">
          <ControlsRail plan={plan} palette={palette} />
        </aside>
      </main>

      <footer className="px-4 pb-3 text-center text-[11px] text-ink-600 sm:px-6">
        Mapwright · block data from mc-datahub · not affiliated with Mojang or Microsoft
      </footer>
    </div>
  );
}

function RenderingBadge() {
  return (
    <div className="absolute right-3 top-3 flex items-center gap-2 rounded-lg bg-ink-950/70 px-2.5 py-1 text-xs text-ink-300 backdrop-blur">
      <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
      Rendering…
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3 text-ink-400">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink-600 border-t-accent" />
      <span className="text-sm">Preparing…</span>
    </div>
  );
}
