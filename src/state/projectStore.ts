import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_SETTINGS,
  type ImageAdjustments,
  type Settings,
} from "@/types";

export type UiMode = "quick" | "advanced";
export type Theme = "light" | "dark";

/**
 * Initial theme before any persisted value loads. The boot script in
 * index.html already resolves light/dark (persisted choice or system
 * preference) and reflects it on <html>, so we read back from there.
 */
function initialTheme(): Theme {
  if (typeof document !== "undefined") {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }
  return "light";
}

/** A loaded source image, decoded to an ImageBitmap-friendly form. */
export interface SourceImage {
  name: string;
  /** Object URL or data URL for display. */
  url: string;
  width: number;
  height: number;
  /** Decoded pixels for processing (kept out of persistence). */
  bitmap: ImageBitmap;
}

interface ProjectState {
  uiMode: UiMode;
  setUiMode: (m: UiMode) => void;

  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;

  settings: Settings;
  /** Shallow-merge a partial settings patch. */
  patchSettings: (patch: Partial<Settings>) => void;
  /** Patch the nested image-adjustments object. */
  patchAdjust: (patch: Partial<ImageAdjustments>) => void;
  resetSettings: () => void;

  source: SourceImage | null;
  setSource: (img: SourceImage | null) => void;
}

export const useProject = create<ProjectState>()(
  persist(
    (set) => ({
      uiMode: "quick",
      setUiMode: (uiMode) => set({ uiMode }),

      theme: initialTheme(),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),

  settings: { ...DEFAULT_SETTINGS, adjust: { ...DEFAULT_SETTINGS.adjust } },
  patchSettings: (patch) =>
    set((s) => ({ settings: { ...s.settings, ...patch } })),
  patchAdjust: (patch) =>
    set((s) => ({
      settings: { ...s.settings, adjust: { ...s.settings.adjust, ...patch } },
    })),
  resetSettings: () =>
    set({
      settings: { ...DEFAULT_SETTINGS, adjust: { ...DEFAULT_SETTINGS.adjust } },
    }),

  source: null,
  setSource: (source) =>
    set((s) => {
      // Release the previous object URL + bitmap to avoid leaks.
      if (s.source && s.source.url !== source?.url) {
        if (s.source.url.startsWith("blob:")) URL.revokeObjectURL(s.source.url);
        s.source.bitmap.close?.();
      }
      return { source };
    }),
  }),
  {
    name: "mapwright",
    // Persist only serializable config — never the decoded image/bitmap.
    partialize: (s) => ({ settings: s.settings, uiMode: s.uiMode, theme: s.theme }),
  },
  ),
);
