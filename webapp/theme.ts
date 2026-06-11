import { useEffect, useState } from "react";

export type ThemeId = "atelier" | "studio" | "gallery";

export const themes: Array<{ id: ThemeId; label: string }> = [
  { id: "atelier", label: "Atelier — warm letterpress" },
  { id: "studio", label: "Studio — focused tool" },
  { id: "gallery", label: "Gallery — quiet minimal" }
];

function isThemeId(value: string | null): value is ThemeId {
  return value === "atelier" || value === "studio" || value === "gallery";
}

function readStoredTheme(): ThemeId {
  if (typeof window !== "undefined") {
    const fromUrl = new URLSearchParams(window.location.search).get("theme");
    if (isThemeId(fromUrl)) return fromUrl;
  }
  return "atelier";
}

export function useTheme(): [ThemeId, (theme: ThemeId) => void] {
  const [theme, setTheme] = useState<ThemeId>(() => readStoredTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return [theme, setTheme];
}
