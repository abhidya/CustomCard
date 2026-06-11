import { useEffect, useState } from "react";

export type ThemeId = "atelier" | "studio" | "gallery";

export const themes: Array<{ id: ThemeId; label: string }> = [
  { id: "atelier", label: "Atelier — warm letterpress" },
  { id: "studio", label: "Studio — focused tool" },
  { id: "gallery", label: "Gallery — quiet minimal" }
];

const storageKey = "customcard-theme-v1";

function readStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === "atelier" || raw === "studio" || raw === "gallery") return raw;
  } catch {
    /* storage unavailable */
  }
  return "atelier";
}

export function useTheme(): [ThemeId, (theme: ThemeId) => void] {
  const [theme, setTheme] = useState<ThemeId>(() => readStoredTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  return [theme, setTheme];
}
