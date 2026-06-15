// Shared design tokens. Colors mirror the web customer panel and meet WCAG AA
// contrast on their intended surfaces (dark ink on light surfaces, light text
// on the deep-green brand surface).
export const colors = {
  brand: "#b3472c",
  brandSoft: "#b3472c1a",
  brandInkOnSoft: "#93351e",
  background: "#f6f1e6",
  surface: "#fdfaf3",
  surfaceMuted: "#f9f4e9",
  border: "#d9cfb9",
  ink: "#231d12",
  inkMuted: "#5c5343",
  inkSubtle: "#6e6553",
  inkFaint: "#6e6553",
  danger: "#8c2f23",
  dangerSurface: "#fff1ee",
  success: "#33685a",
  warning: "#7a4a12",
  warningSurface: "#fdf3e4",
  textOnBrand: "#fff6ec",
  textOnBrandMuted: "#f5d8c8"
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
} as const;

export const radius = {
  sm: 7,
  md: 8,
  lg: 12
} as const;

export const typography = {
  title: { fontSize: 26, fontWeight: "900" as const, color: colors.ink },
  heading: { fontSize: 18, fontWeight: "900" as const, color: colors.ink },
  body: { fontSize: 15, lineHeight: 21, color: colors.inkMuted },
  label: { fontSize: 12, fontWeight: "800" as const, color: colors.inkSubtle },
  eyebrow: {
    fontSize: 12,
    fontWeight: "900" as const,
    textTransform: "uppercase" as const,
    color: colors.inkSubtle
  }
} as const;

/** Cross-platform elevation (iOS shadow + Android elevation) for surfaces. */
export const elevation = {
  card: {
    shadowColor: "#0d1f1c",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  raised: {
    shadowColor: "#0d1f1c",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6
  }
} as const;

/** Minimum accessible touch target size (iOS HIG 44pt / Android 48dp). */
export const minTouchTarget = 44;
