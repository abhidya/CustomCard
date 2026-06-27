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
  birthday: "/generated/theme-inventory/card-birthday-candle-table.webp",
  graduation: "/generated/card-graduation.jpg",
  wedding: "/generated/card-wedding-anniversary.jpg",
  anniversary: "/generated/card-wedding-anniversary.jpg",
  "thank-you": "/generated/card-thank-you.jpg",
  sympathy: "/generated/card-sympathy.jpg",
  friendship: "/generated/card-friendship.jpg",
  custom: "/generated/card-default-botanical.webp"
};

export const cardTemplates: CardTemplateChoice[] = [
  {
    id: "birthday-candle",
    label: "Birthday glow",
    category: "birthday",
    detail: "Warm, celebratory, open center.",
    imageUrl: cardImageByCategory.birthday,
    occasion: "birthday",
    styleId: "botanical",
    artDirection: "Refined birthday background with candle-glow dots and open text-safe center.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "thank-you-citrus",
    label: "Thank-you citrus",
    category: "thank-you",
    detail: "Sage leaves, citrus, generous space.",
    imageUrl: cardImageByCategory["thank-you"],
    occasion: "thank-you",
    styleId: "botanical",
    artDirection: "Premium thank-you citrus and leaf corner artwork with blank center for exact app text.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  },
  {
    id: "graduation-navy",
    label: "Graduation navy",
    category: "graduation",
    detail: "Milestone-ready navy and gold.",
    imageUrl: cardImageByCategory.graduation,
    occasion: "graduation",
    styleId: "minimal",
    artDirection: "Graduation background with navy and soft gold accents, no school marks.",
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
    id: "friendship-stars",
    label: "Friendship stars",
    category: "friendship",
    detail: "Everyday encouragement.",
    imageUrl: cardImageByCategory.friendship,
    occasion: "friendship",
    styleId: "botanical",
    artDirection: "Friendship encouragement background with watercolor stars, leaves, ribbons, and open center.",
    imagePlacement: fillCenter,
    textLayout: centeredDarkText
  }
];

export const exampleCards = cardTemplates.map((template) => ({
  label: template.category === "thank-you" ? "Thank you" : template.label.replace(/ .*/, ""),
  category: template.category,
  imageUrl: template.imageUrl
}));
