/**
 * Canonical greeting-card categories shared by the API runtime, admin
 * curation surface, and the public featured-cards gallery.
 */

export const cardCategoryIds = [
  "birthday",
  "graduation",
  "wedding",
  "anniversary",
  "thank-you",
  "sympathy",
  "get-well",
  "new-baby",
  "holiday",
  "custom"
];

export const cardCategoryLabels = {
  birthday: "Birthday",
  graduation: "Graduation",
  wedding: "Wedding",
  anniversary: "Anniversary",
  "thank-you": "Thank you",
  sympathy: "Sympathy",
  "get-well": "Get well",
  "new-baby": "New baby",
  holiday: "Holiday",
  custom: "Custom"
};

/** Categories shown on the public landing gallery, in display order. */
export const publicCardCategories = [
  "birthday",
  "graduation",
  "wedding",
  "thank-you",
  "sympathy",
  "anniversary",
  "get-well",
  "new-baby",
  "holiday",
  "custom"
];

const occasionAliases = {
  birthday: ["birthday", "bday", "birth day", "turning"],
  graduation: ["graduation", "graduate", "grad", "commencement", "diploma"],
  wedding: ["wedding", "marriage", "engagement", "bridal"],
  anniversary: ["anniversary", "anniversaries"],
  "thank-you": ["thank-you", "thank you", "thanks", "thankyou", "appreciation", "gratitude"],
  sympathy: ["sympathy", "condolence", "condolences", "memorial", "funeral", "loss"],
  "get-well": ["get-well", "get well", "getwell", "recovery", "feel better", "surgery"],
  "new-baby": ["new-baby", "new baby", "baby shower", "newborn", "baby"],
  holiday: [
    "holiday",
    "christmas",
    "hanukkah",
    "eid",
    "diwali",
    "new year",
    "thanksgiving",
    "easter",
    "ramadan",
    "valentine"
  ]
};

/**
 * Map a free-form occasion (draft input, opportunity title, admin override)
 * onto one canonical category. Unknown occasions become "custom".
 */
export function normalizeCardCategory(occasion) {
  const text = String(occasion ?? "").trim().toLowerCase();
  if (!text) return "custom";
  if (cardCategoryIds.includes(text)) return text;
  for (const [category, aliases] of Object.entries(occasionAliases)) {
    if (aliases.some((alias) => text.includes(alias))) return category;
  }
  return "custom";
}

export function isCardCategory(value) {
  return cardCategoryIds.includes(String(value ?? "").trim().toLowerCase());
}
