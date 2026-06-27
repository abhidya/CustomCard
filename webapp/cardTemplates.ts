import type { CardImagePlacement, CardTextLayout, VisualStylePreset } from "../src/customerWorkflow";
import { storyImageByCategory, storyThemeCards } from "./storyThemes";

export interface CardTemplateChoice {
  id: string;
  label: string;
  category: string;
  detail: string;
  imageUrl: string;
  previewImageUrl: string;
  proofContactSheetUrl: string;
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
  ...storyImageByCategory,
  birthday: storyImageByCategory.birthday,
  graduation: storyImageByCategory.graduation,
  wedding: storyImageByCategory.wedding,
  anniversary: storyImageByCategory.anniversary,
  "thank-you": storyImageByCategory["thank-you"],
  sympathy: storyImageByCategory["get-well"],
  friendship: storyImageByCategory.friendship,
  "get-well": storyImageByCategory["get-well"],
  "new-baby": storyImageByCategory.custom,
  belated: storyImageByCategory.anniversary,
  congratulations: storyImageByCategory.congratulations,
  business: storyImageByCategory.business,
  custom: storyImageByCategory.custom
};

export const cardTemplates: CardTemplateChoice[] = storyThemeCards.map((story) => ({
  id: story.id,
  label: story.templateLabel,
  category: story.category,
  detail: story.templateDetail,
  imageUrl: story.imageUrl,
  previewImageUrl: story.proof.assets.front,
  proofContactSheetUrl: story.proof.assets.contactSheet,
  occasion: story.occasion,
  styleId: story.styleId,
  artDirection: [
    story.relationship,
    `Remembered object: ${story.memoryObject}.`,
    `Emotional job: ${story.emotionalTruth}.`,
    `Art move: ${story.artBrief}.`,
    "Keep the artwork text-free with a clean app-rendered copy zone.",
    `Avoid: ${story.avoid}.`
  ].join(" "),
  imagePlacement: fillCenter,
  textLayout: story.styleId === "photo-note" ? lowerPhotoText : centeredDarkText
}));

export const exampleCards = cardTemplates.map((template) => ({
  label: template.category === "thank-you" ? "Thank you" : template.label.replace(/ .*/, ""),
  category: template.category,
  imageUrl: template.previewImageUrl
}));
