import type { CardImagePlacement, CardTextLayout, VisualStylePreset } from "../src/customerWorkflow";

export interface CardTemplateChoice {
  id: string;
  label: string;
  category: string;
  detail: string;
  imageUrl: string;
  occasion: string;
  styleId: VisualStylePreset;
  artDirection: string;
  imagePlacement: CardImagePlacement;
  textLayout: CardTextLayout;
}

const centeredDarkText: CardTextLayout = {
  headlineZone: "upper",
  bodyZone: "center",
  alignment: "center",
  fontPairing: "soft-serif",
  colorMode: "dark-ink",
  scale: "standard"
};

const lowerPhotoText: CardTextLayout = {
  headlineZone: "lower",
  bodyZone: "bottom",
  alignment: "center",
  fontPairing: "serif-sans",
  colorMode: "dark-ink",
  scale: "standard"
};

const fillCenter: CardImagePlacement = { frame: "fill", focus: "center" };

export const cardImageByCategory: Record<string, string> = {
  birthday: "/generated/theme-inventory/study-dad-tomato-garden.webp",
  graduation: "/generated/theme-inventory/study-maya-blue-pencil-thesis.webp",
  wedding: "/generated/card-wedding-anniversary.webp",
  anniversary: "/generated/card-wedding-anniversary.webp",
  "thank-you": "/generated/theme-inventory/study-lena-basil-thanks.webp",
  sympathy: "/generated/theme-inventory/study-foil-covered-casserole.webp",
  friendship: "/generated/theme-inventory/study-coffee-rings-apart.webp",
  "get-well": "/generated/theme-inventory/card-get-well-window-tea.webp",
  "new-baby": "/generated/card-default-botanical.webp",
  belated: "/generated/card-default-botanical.webp",
  congratulations: "/generated/theme-inventory/card-congratulations-confetti-arch.webp",
  business: "/generated/theme-inventory/study-client-sample-swatches.webp",
  custom: "/generated/card-default-botanical.webp"
};

export const cardTemplates: CardTemplateChoice[] = [
  {
    id: "birthday-candle",
    label: "Memory birthday",
    category: "birthday",
    detail: "Celebration anchored in one real detail.",
    imageUrl: cardImageByCategory.birthday,
    occasion: "birthday",
    styleId: "botanical",
    artDirection: "Custom birthday card art anchored in one remembered object, celebratory but not generic, open text-safe center, avoid balloons and cake clipart.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "birthday-dinner-table",
    label: "Dinner memory",
    category: "birthday",
    detail: "A real table, not party wallpaper.",
    imageUrl: cardImageByCategory.birthday,
    occasion: "birthday",
    styleId: "botanical",
    artDirection: "Birthday dinner-table card front with one concrete table memory, candle glow, clean app-text center, avoid generic confetti and balloons.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "thank-you-citrus",
    label: "Specific thanks",
    category: "thank-you",
    detail: "Gratitude tied to a real act.",
    imageUrl: cardImageByCategory["thank-you"],
    occasion: "thank-you",
    styleId: "botanical",
    artDirection: "Thank-you art anchored in a remembered practical act, citrus and leaf corner artwork, blank center for exact app text, avoid generic thank-you script.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "thank-you-neighbor",
    label: "Basil neighbor",
    category: "thank-you",
    detail: "Small help, remembered as an object.",
    imageUrl: cardImageByCategory["thank-you"],
    occasion: "thank-you",
    styleId: "botanical",
    artDirection: "Neighbor thank-you background with windowsill herb, citrus, and one practical-care object, generous center for direct grateful copy.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "graduation-navy",
    label: "Earned margin",
    category: "graduation",
    detail: "Pride in the private work.",
    imageUrl: cardImageByCategory.graduation,
    occasion: "graduation",
    styleId: "minimal",
    artDirection: "Graduation background anchored in private work marks, navy and soft gold, no school marks, avoid diploma and cap-as-whole-concept.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "graduation-next-chapter",
    label: "Next chapter",
    category: "graduation",
    detail: "Formal without school logos.",
    imageUrl: cardImageByCategory.graduation,
    occasion: "graduation",
    styleId: "minimal",
    artDirection: "Graduation card with navy edge details, soft gold accents, and no school or organization marks.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "wedding-vellum",
    label: "Wedding vellum",
    category: "wedding",
    detail: "Elegant, soft, text-safe.",
    imageUrl: cardImageByCategory.wedding,
    occasion: "wedding",
    styleId: "minimal",
    artDirection: "Wedding card background with soft botanical corners and a quiet ivory center for names and date.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "anniversary-ribbon",
    label: "Anniversary ribbon",
    category: "anniversary",
    detail: "Romantic but modern.",
    imageUrl: cardImageByCategory.anniversary,
    occasion: "anniversary",
    styleId: "botanical",
    artDirection: "Anniversary card with restrained ribbon movement, warm paper texture, and a clean message field.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "photo-milestone",
    label: "Photo milestone",
    category: "anniversary",
    detail: "Built for a personal photo.",
    imageUrl: "/generated/card-photo-milestone.webp",
    occasion: "anniversary",
    styleId: "photo-note",
    artDirection: "Photo-card layout with blank photo frames and clean caption-safe zones.",
    imagePlacement: fillCenter,
    textLayout: lowerPhotoText
  },
  {
    id: "get-well-window",
    label: "Window light",
    category: "get-well",
    detail: "Gentle support, not clinical.",
    imageUrl: cardImageByCategory["get-well"],
    occasion: "get-well",
    styleId: "minimal",
    artDirection: "Get-well card with soft window-light feeling, calm botanical details, and open center copy space.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "quiet-sympathy",
    label: "Quiet sympathy",
    category: "sympathy",
    detail: "Soft botanical, careful tone.",
    imageUrl: cardImageByCategory.sympathy,
    occasion: "sympathy",
    styleId: "minimal",
    artDirection: "Quiet sympathy botanical line art with calm blank center.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "practical-sympathy",
    label: "Practical care",
    category: "sympathy",
    detail: "Steady, careful, useful.",
    imageUrl: cardImageByCategory.sympathy,
    occasion: "sympathy",
    styleId: "minimal",
    artDirection: "Quiet sympathy card with low-saturation botanical line art and space for practical support copy.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "friendship-stars",
    label: "Coffee rings",
    category: "friendship",
    detail: "A shared ritual across distance.",
    imageUrl: cardImageByCategory.friendship,
    occasion: "friendship",
    styleId: "botanical",
    artDirection: "Friendship card anchored in two coffee rings and a long-distance line, warm paper, open center, avoid best-friend slogans and stars.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "friendship-coffee",
    label: "Coffee note",
    category: "friendship",
    detail: "Everyday, specific, warm.",
    imageUrl: cardImageByCategory.friendship,
    occasion: "friendship",
    styleId: "botanical",
    artDirection: "Everyday friendship card with warm paper texture, small coffee-note energy, and clean center space.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "new-baby-soft",
    label: "New baby soft",
    category: "new-baby",
    detail: "Tender without faces.",
    imageUrl: cardImageByCategory["new-baby"],
    occasion: "new-baby",
    styleId: "botanical",
    artDirection: "Gentle new-baby card direction with soft paper, calm botanical accents, and no people or faces.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "belated-open-note",
    label: "Belated note",
    category: "belated",
    detail: "Sincere, a little human.",
    imageUrl: cardImageByCategory.belated,
    occasion: "belated card",
    styleId: "minimal",
    artDirection: "Belated apology card with open note energy, restrained accents, and a clean text-safe middle.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "congrats-confetti",
    label: "Confetti arch",
    category: "congratulations",
    detail: "Bright, disciplined celebration.",
    imageUrl: cardImageByCategory.congratulations,
    occasion: "congratulations",
    styleId: "botanical",
    artDirection: "Congratulations card with a disciplined confetti arch and generous editable copy area.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "business-anniversary",
    label: "Customer anniversary",
    category: "business",
    detail: "Professional, still personal.",
    imageUrl: cardImageByCategory.business,
    occasion: "business customer anniversary",
    styleId: "minimal",
    artDirection: "Business relationship card with editorial stationery details and no logos or customer data.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  }
];

export const exampleCards = cardTemplates.map((template) => ({
  label: template.category === "thank-you" ? "Thank you" : template.label.replace(/ .*/, ""),
  category: template.category,
  imageUrl: template.imageUrl
}));
