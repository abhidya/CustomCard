export const OCCASIONS = [
  "birthday",
  "anniversary",
  "thank you",
  "congratulations",
  "thinking of you"
];
export const TONES = ["warm", "playful", "heartfelt", "formal"];
export const STYLES = ["botanical", "minimal", "bold", "classic"];

export const LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "es-US", label: "Español (US)" },
  { code: "ur-PK", label: "اردو" },
  { code: "ar-EG", label: "العربية" }
];

export const CARD_LANGUAGE_BY_CODE: Record<string, string> = {
  "en-US": "English",
  "es-US": "Spanish",
  "ur-PK": "Urdu",
  "ar-EG": "Arabic"
};

export const CODE_BY_CARD_LANGUAGE: Record<string, string> = Object.fromEntries(
  Object.entries(CARD_LANGUAGE_BY_CODE).map(([code, language]) => [language, code])
);

export const LANGUAGE_CODES = LANGUAGES.map((entry) => entry.code);
export const LANGUAGE_LABELS = Object.fromEntries(
  LANGUAGES.map((entry) => [entry.code, entry.label])
);

export function cardLanguageForCode(code: string): string {
  return CARD_LANGUAGE_BY_CODE[code] ?? "English";
}

export function codeForCardLanguage(language: string | undefined, localeCode?: string): string {
  if (localeCode && LANGUAGE_CODES.includes(localeCode)) return localeCode;
  return CODE_BY_CARD_LANGUAGE[String(language ?? "").trim()] ?? "en-US";
}

export function panelLabel(id: string): string {
  const labels: Record<string, string> = {
    front: "Front",
    "inside-left": "Inside left",
    "inside-right": "Inside right",
    back: "Back"
  };
  return labels[id] ?? id;
}
