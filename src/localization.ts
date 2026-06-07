import type { LanguageChoice } from "./freeMvp.ts";

export type SupportedLocaleCode = "en-US" | "es-US" | "ur-PK" | "ar-EG";
export type WritingDirection = "ltr" | "rtl";
export type LocalizationReviewState = "ready" | "human-review-required";

export type LocalizationMessageKey =
  | "customerPanelTitle"
  | "adminPanelTitle"
  | "textInterface"
  | "renderChoices"
  | "manualHandoff"
  | "realOrdersDisabled"
  | "sourceBackedPricing"
  | "memoryReview"
  | "copyReviewRequired";

export interface SupportedLocale {
  locale: SupportedLocaleCode;
  label: string;
  region: "North America" | "MENA" | "South Asia";
  writingDirection: WritingDirection;
  cardLanguage: LanguageChoice;
  customerVisible: boolean;
  adminVisible: boolean;
  reviewState: LocalizationReviewState;
  numberFormat: string;
  dateFormat: string;
  requiresRtlLayout: boolean;
  liveTranslationProvider: false;
}

export interface LocalizationReadinessSummary {
  defaultLocale: SupportedLocaleCode;
  supportedLocales: number;
  customerVisible: number;
  adminVisible: number;
  rtlLocales: number;
  copyReviewRequired: number;
  completeBundles: number;
  messageKeys: number;
  liveTranslationProvider: false;
  blockers: string[];
}

export const defaultLocale: SupportedLocaleCode = "en-US";

export const requiredLocalizationKeys: LocalizationMessageKey[] = [
  "customerPanelTitle",
  "adminPanelTitle",
  "textInterface",
  "renderChoices",
  "manualHandoff",
  "realOrdersDisabled",
  "sourceBackedPricing",
  "memoryReview",
  "copyReviewRequired"
];

export const supportedLocales: SupportedLocale[] = [
  {
    locale: "en-US",
    label: "English (US)",
    region: "North America",
    writingDirection: "ltr",
    cardLanguage: "English",
    customerVisible: true,
    adminVisible: true,
    reviewState: "ready",
    numberFormat: "en-US",
    dateFormat: "MMM d, yyyy",
    requiresRtlLayout: false,
    liveTranslationProvider: false
  },
  {
    locale: "es-US",
    label: "Spanish (US)",
    region: "North America",
    writingDirection: "ltr",
    cardLanguage: "Spanish",
    customerVisible: true,
    adminVisible: true,
    reviewState: "human-review-required",
    numberFormat: "es-US",
    dateFormat: "d MMM yyyy",
    requiresRtlLayout: false,
    liveTranslationProvider: false
  },
  {
    locale: "ur-PK",
    label: "Urdu (RTL)",
    region: "South Asia",
    writingDirection: "rtl",
    cardLanguage: "Urdu",
    customerVisible: true,
    adminVisible: true,
    reviewState: "human-review-required",
    numberFormat: "en-US",
    dateFormat: "d MMM yyyy",
    requiresRtlLayout: true,
    liveTranslationProvider: false
  },
  {
    locale: "ar-EG",
    label: "Arabic (RTL)",
    region: "MENA",
    writingDirection: "rtl",
    cardLanguage: "Arabic",
    customerVisible: true,
    adminVisible: true,
    reviewState: "human-review-required",
    numberFormat: "en-US",
    dateFormat: "d MMM yyyy",
    requiresRtlLayout: true,
    liveTranslationProvider: false
  }
];

export const localizationBundles: Record<SupportedLocaleCode, Record<LocalizationMessageKey, string>> = {
  "en-US": {
    customerPanelTitle: "Your cards",
    adminPanelTitle: "Admin panel",
    textInterface: "Text interface",
    renderChoices: "Card proof path",
    manualHandoff: "Checkout confirmation",
    realOrdersDisabled: "Confirm before checkout",
    sourceBackedPricing: "Source-backed pricing",
    memoryReview: "Memory review",
    copyReviewRequired: "Copy review clear"
  },
  "es-US": {
    customerPanelTitle: "Tus tarjetas",
    adminPanelTitle: "Panel de admin",
    textInterface: "Interfaz de texto",
    renderChoices: "Ruta de prueba de tarjeta",
    manualHandoff: "Confirmacion de pago",
    realOrdersDisabled: "Confirmar antes de pagar",
    sourceBackedPricing: "Precios con fuente",
    memoryReview: "Revision de memoria",
    copyReviewRequired: "Revision humana requerida"
  },
  "ur-PK": {
    customerPanelTitle: "Your cards - Urdu review",
    adminPanelTitle: "Admin panel - Urdu review",
    textInterface: "Text interface - Urdu review",
    renderChoices: "Card proof path - Urdu review",
    manualHandoff: "Checkout confirmation - Urdu review",
    realOrdersDisabled: "Confirm before checkout",
    sourceBackedPricing: "Source-backed pricing",
    memoryReview: "Memory review - Urdu review",
    copyReviewRequired: "Human copy review required"
  },
  "ar-EG": {
    customerPanelTitle: "Your cards - Arabic review",
    adminPanelTitle: "Admin panel - Arabic review",
    textInterface: "Text interface - Arabic review",
    renderChoices: "Card proof path - Arabic review",
    manualHandoff: "Checkout confirmation - Arabic review",
    realOrdersDisabled: "Confirm before checkout",
    sourceBackedPricing: "Source-backed pricing",
    memoryReview: "Memory review - Arabic review",
    copyReviewRequired: "Human copy review required"
  }
};

export function getSupportedLocale(locale: SupportedLocaleCode): SupportedLocale {
  return supportedLocales.find((candidate) => candidate.locale === locale) ?? supportedLocales[0];
}

export function translate(locale: SupportedLocaleCode, key: LocalizationMessageKey): string {
  return localizationBundles[locale]?.[key] ?? localizationBundles[defaultLocale][key];
}

export function summarizeLocalizationReadiness(
  locales: SupportedLocale[] = supportedLocales,
  bundles: Record<SupportedLocaleCode, Record<LocalizationMessageKey, string>> = localizationBundles
): LocalizationReadinessSummary {
  const blockers = validateLocalizationReadiness(locales, bundles);

  return {
    defaultLocale,
    supportedLocales: locales.length,
    customerVisible: locales.filter((locale) => locale.customerVisible).length,
    adminVisible: locales.filter((locale) => locale.adminVisible).length,
    rtlLocales: locales.filter((locale) => locale.writingDirection === "rtl").length,
    copyReviewRequired: locales.filter((locale) => locale.reviewState === "human-review-required").length,
    completeBundles: locales.filter((locale) => bundleIsComplete(locale.locale, bundles)).length,
    messageKeys: requiredLocalizationKeys.length,
    liveTranslationProvider: false,
    blockers
  };
}

export function validateLocalizationReadiness(
  locales: SupportedLocale[] = supportedLocales,
  bundles: Record<SupportedLocaleCode, Record<LocalizationMessageKey, string>> = localizationBundles
): string[] {
  const issues: string[] = [];
  const localeCodes = new Set<SupportedLocaleCode>();

  for (const locale of locales) {
    if (localeCodes.has(locale.locale)) issues.push(`Duplicate locale: ${locale.locale}`);
    localeCodes.add(locale.locale);

    if (!locale.customerVisible) issues.push(`Locale ${locale.locale} must stay customer-visible.`);
    if (!locale.adminVisible) issues.push(`Locale ${locale.locale} must stay admin-visible.`);
    if (locale.liveTranslationProvider) issues.push(`Locale ${locale.locale} must not require a live translation provider.`);
    if (locale.writingDirection === "rtl" && !locale.requiresRtlLayout) {
      issues.push(`RTL locale ${locale.locale} must require RTL layout validation.`);
    }
    if (locale.writingDirection === "rtl" && locale.reviewState !== "human-review-required") {
      issues.push(`RTL locale ${locale.locale} must require human copy review.`);
    }
    if (!bundleIsComplete(locale.locale, bundles)) {
      issues.push(`Locale ${locale.locale} must include all required message keys.`);
    }

    for (const text of Object.values(bundles[locale.locale] ?? {})) {
      if (/\b(real orders enabled|live translation active|auto vendor submit|payment active)\b/i.test(text)) {
        issues.push(`Unsafe localization claim for ${locale.locale}: ${text}`);
      }
    }
  }

  if (!localeCodes.has(defaultLocale)) issues.push(`Default locale ${defaultLocale} must be supported.`);
  for (const locale of ["en-US", "es-US", "ur-PK", "ar-EG"] satisfies SupportedLocaleCode[]) {
    if (!localeCodes.has(locale)) issues.push(`Missing required launch locale: ${locale}`);
  }

  return issues;
}

function bundleIsComplete(
  locale: SupportedLocaleCode,
  bundles: Record<SupportedLocaleCode, Record<LocalizationMessageKey, string>>
): boolean {
  const bundle = bundles[locale];
  return Boolean(bundle && requiredLocalizationKeys.every((key) => typeof bundle[key] === "string" && bundle[key].trim().length > 0));
}
