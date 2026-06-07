import { describe, expect, it } from "vitest";
import {
  localizationBundles,
  requiredLocalizationKeys,
  summarizeLocalizationReadiness,
  supportedLocales,
  translate,
  validateLocalizationReadiness,
  type SupportedLocale
} from "./localization";

describe("localization readiness", () => {
  it("covers launch locales with complete safe message bundles", () => {
    const summary = summarizeLocalizationReadiness();

    expect(validateLocalizationReadiness()).toEqual([]);
    expect(summary).toMatchObject({
      defaultLocale: "en-US",
      supportedLocales: 4,
      customerVisible: 4,
      adminVisible: 4,
      rtlLocales: 2,
      copyReviewRequired: 3,
      completeBundles: 4,
      messageKeys: requiredLocalizationKeys.length,
      liveTranslationProvider: false,
      blockers: []
    });
    expect(supportedLocales.map((locale) => locale.locale)).toEqual(["en-US", "es-US", "ur-PK", "ar-EG"]);
    expect(supportedLocales.filter((locale) => locale.writingDirection === "rtl").map((locale) => locale.cardLanguage)).toEqual([
      "Urdu",
      "Arabic"
    ]);
  });

  it("translates shell labels with English fallback semantics", () => {
    expect(translate("es-US", "customerPanelTitle")).toBe("Tus tarjetas");
    expect(translate("ar-EG", "copyReviewRequired")).toBe("Human copy review required");
  });

  it("reports missing bundles, unsafe claims, and RTL review gaps", () => {
    const unsafeLocales: SupportedLocale[] = [
      {
        ...supportedLocales[0],
        locale: "ar-EG",
        label: "Arabic unsafe",
        writingDirection: "rtl",
        cardLanguage: "Arabic",
        reviewState: "ready",
        requiresRtlLayout: false
      }
    ];
    const unsafeBundles = {
      ...localizationBundles,
      "ar-EG": {
        ...localizationBundles["ar-EG"],
        customerPanelTitle: "live translation active"
      }
    };

    expect(validateLocalizationReadiness(unsafeLocales, unsafeBundles)).toEqual(
      expect.arrayContaining([
        "RTL locale ar-EG must require RTL layout validation.",
        "RTL locale ar-EG must require human copy review.",
        "Unsafe localization claim for ar-EG: live translation active",
        "Default locale en-US must be supported.",
        "Missing required launch locale: en-US",
        "Missing required launch locale: es-US",
        "Missing required launch locale: ur-PK"
      ])
    );

    expect(
      validateLocalizationReadiness(supportedLocales, {
        ...localizationBundles,
        "es-US": { ...localizationBundles["es-US"], manualHandoff: "" }
      })
    ).toContain("Locale es-US must include all required message keys.");
  });
});
