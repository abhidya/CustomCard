export interface PanelTextLayout {
  headline_zone: "top" | "upper" | "center" | "lower";
  body_zone: "upper" | "center" | "lower" | "bottom";
  alignment: "left" | "center" | "right";
  font_pairing: "serif-sans" | "bold-editorial" | "minimal-sans" | "soft-serif";
  color_mode: "dark-ink" | "light-ink" | "accent-ink" | "high-contrast";
  scale: "compact" | "standard" | "large";
}

export const panelTextLayoutEnums: {
  headline_zone: PanelTextLayout["headline_zone"][];
  body_zone: PanelTextLayout["body_zone"][];
  alignment: PanelTextLayout["alignment"][];
  font_pairing: PanelTextLayout["font_pairing"][];
  color_mode: PanelTextLayout["color_mode"][];
  scale: PanelTextLayout["scale"][];
};

export const panelTextLayoutDefaults: Record<string, PanelTextLayout>;

export interface PanelTextLayoutPlan {
  x: number;
  anchor: "start" | "middle" | "end";
  headlineFont: string;
  headlineSize: number;
  headlineWeight: number;
  headlineStyle: "normal" | "italic";
  headlineLeading: number;
  headlineY: number;
  headlineFill: string;
  headlineMaxChars: number;
  headlineMaxLines: number;
  bodyFont: string;
  bodySize: number;
  bodyWeight: number;
  bodyStyle: "normal" | "italic";
  bodyLeading: number;
  bodyY: number;
  bodyFill: string;
  bodyMaxChars: number;
  bodyMaxLines: number;
  layout?: PanelTextLayout;
}

export function normalizePanelTextLayout(
  value: unknown,
  options?: { panelId?: string; sourceText?: string; fallback?: PanelTextLayout }
): PanelTextLayout;

export function panelTextLayoutFallbackForSource(panelId?: string, sourceText?: string): PanelTextLayout;

export function buildPanelTextLayoutPlan(args?: {
  panelId?: string;
  textLayout?: unknown;
  headlineFormat?: { bold?: boolean; italic?: boolean; accent?: boolean };
  bodyFormat?: { bold?: boolean; italic?: boolean; accent?: boolean };
  accent?: string;
  hasArtwork?: boolean;
  imageFrame?: string;
  rtl?: boolean;
  styleId?: string;
  legacyLayout?: object;
  fontSystem?: "render" | "preview";
}): PanelTextLayoutPlan;

export function buildLocalComfyTypographyPlan(args?: {
  panelId?: string;
  panelCopy?: {
    headline?: string;
    body?: string;
    text_layout?: Record<string, unknown>;
    textLayout?: Record<string, unknown>;
  };
  width?: number;
  height?: number;
}): Record<string, unknown>;

export function sourceTextFromCardInput(input?: Record<string, unknown>): string;

export function cleanPanelText(value: unknown): string;
