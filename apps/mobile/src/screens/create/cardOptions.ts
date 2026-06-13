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

export const LANGUAGE_CODES = LANGUAGES.map((entry) => entry.code);
export const LANGUAGE_LABELS = Object.fromEntries(
  LANGUAGES.map((entry) => [entry.code, entry.label])
);

export function panelLabel(id: string): string {
  const labels: Record<string, string> = {
    front: "Front",
    "inside-left": "Inside left",
    "inside-right": "Inside right",
    back: "Back"
  };
  return labels[id] ?? id;
}
