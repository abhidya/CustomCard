import {
  hasOrderedRenderPacketPanels,
  panelMatchesRenderPacketTarget,
  renderPacketDimensionLabel,
  renderPacketTarget
} from "./renderPacketContract";
import type { CardOpportunity, LocalWorkspace, MemoryItem } from "./freeMvp";

export type TonePreset = "warm" | "funny" | "elegant" | "simple" | "reverent" | "sentimental";
export type LegacyTonePreset = "playful";
export type Tone = TonePreset | LegacyTonePreset | (string & {});
export type VisualStylePreset = "botanical" | "bold-type" | "photo-note" | "minimal";
export type VisualStyle = VisualStylePreset | (string & {});
export type LanguageChoice = "English" | "Spanish" | "Urdu" | "Arabic";

export type TextZone = "top" | "upper" | "center" | "lower" | "bottom";
export type TextAlignment = "left" | "center" | "right";
export type TextFontPairing = "serif-sans" | "bold-editorial" | "minimal-sans" | "soft-serif";
export type TextColorMode = "dark-ink" | "light-ink" | "accent-ink" | "high-contrast";
export type TextScale = "compact" | "standard" | "large";
export type CardImageFrame = "fill" | "fit" | "photo-window";
export type CardImageFocus = "center" | "top" | "bottom" | "left" | "right";
export type CardImageRenderingMode = "artwork-layer" | "final-text-composited";

export interface CardTextLayout {
  headlineZone: Exclude<TextZone, "bottom">;
  bodyZone: Exclude<TextZone, "top">;
  alignment: TextAlignment;
  fontPairing: TextFontPairing;
  colorMode: TextColorMode;
  scale: TextScale;
}

export interface CardImagePlacement {
  frame: CardImageFrame;
  focus: CardImageFocus;
}

export interface CardTextStyle {
  bold?: boolean;
  italic?: boolean;
  accent?: boolean;
}

export interface CardTextFormat {
  headline?: CardTextStyle;
  body?: CardTextStyle;
}

export interface CardDraftInput {
  sender: string;
  recipient: string;
  relationship: string;
  occasion: string;
  tone: Tone;
  style: VisualStyle;
  language: LanguageChoice;
  personalNote: string;
  useMemory: boolean;
}

export interface CardPanel {
  id: "front" | "inside-left" | "inside-right" | "back";
  label: string;
  headline: string;
  body: string;
  artDirection: string;
  width: 1500;
  height: 2100;
  dpi: 300;
  rtl: boolean;
  overflowRisk: boolean;
  imageUrl?: string;
  imageRendering?: CardImageRenderingMode;
  imagePlacement?: CardImagePlacement;
  textLayout?: CardTextLayout;
  textFormat?: CardTextFormat;
  /** Visual style the renderer uses for layout/decoration. Older panels omit it; renderer defaults to botanical. */
  styleId?: VisualStylePreset;
}

export interface CardDraft {
  id: string;
  input: CardDraftInput;
  panels: CardPanel[];
  memoryCitations: string[];
  generatedBy: "deterministic-free-template" | "user-content-only" | "ai-text-only" | "ai-text-and-image";
}

export interface ValidationCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface CardValidation {
  passed: boolean;
  checks: ValidationCheck[];
  errors: string[];
}

export function getDefaultDraftInput(
  workspace: LocalWorkspace | undefined,
  opportunity: CardOpportunity
): CardDraftInput {
  return {
    sender: workspace?.name ?? "Local User",
    recipient: opportunity.recipient,
    relationship: "Friends",
    occasion: opportunity.occasion,
    tone: "warm",
    style: "botanical",
    language: "English",
    personalNote: "",
    useMemory: opportunity.memoryIds.length > 0
  };
}

export function generateCardDraft(input: CardDraftInput, memories: MemoryItem[]): CardDraft {
  const recipient = cleanText(input.recipient) || "Someone important";
  const sender = cleanText(input.sender) || "Local User";
  const occasion = cleanText(input.occasion) || "card";
  const approvedMemories = input.useMemory
    ? memories.filter((memory) => memory.approved && namesOverlap(memory.recipient, recipient))
    : [];
  const memoryLine = approvedMemories[0]?.note ?? "The best details are the small ones you both recognize.";
  const rtl = isRtlLanguage(input.language);
  const stylePreset = normalizeVisualStylePreset(input.style);
  const voice = toneLine(input.tone);
  const visual = artDirection(input.style, input.tone);
  const note = cleanText(input.personalNote) || "Keep it simple, specific, and sincere.";

  const basePanels: Array<Omit<CardPanel, "overflowRisk">> = [
    {
      id: "front",
      label: "Front",
      headline: `${titleCase(occasion)} for ${recipient}`,
      body: visual.frontLine,
      artDirection: visual.front,
      width: renderPacketTarget.widthPixels,
      height: renderPacketTarget.heightPixels,
      dpi: renderPacketTarget.dpi,
      rtl
    },
    {
      id: "inside-left",
      label: "Inside left",
      headline: "The part that feels like them",
      body: `${memoryLine} ${note}`,
      artDirection: visual.left,
      width: renderPacketTarget.widthPixels,
      height: renderPacketTarget.heightPixels,
      dpi: renderPacketTarget.dpi,
      rtl
    },
    {
      id: "inside-right",
      label: "Message",
      headline: "Message",
      body: `${voice} May this ${occasion} feel generous, grounded, and unmistakably yours.`,
      artDirection: visual.right,
      width: renderPacketTarget.widthPixels,
      height: renderPacketTarget.heightPixels,
      dpi: renderPacketTarget.dpi,
      rtl
    },
    {
      id: "back",
      label: "Back",
      headline: `From ${sender}`,
      body: "Made with reviewed memories, local files, and final human approval.",
      artDirection: visual.back,
      width: renderPacketTarget.widthPixels,
      height: renderPacketTarget.heightPixels,
      dpi: renderPacketTarget.dpi,
      rtl
    }
  ];
  const panels: CardPanel[] = basePanels.map((panel) => ({
    ...panel,
    styleId: stylePreset,
    overflowRisk: panelOverflowRisk(panel.headline, panel.body)
  }));

  return {
    id: `draft-${stableId(`${sender}:${recipient}:${occasion}:${input.tone}:${input.style}:${note}`)}`,
    input,
    panels,
    memoryCitations: approvedMemories.map((memory) => memory.id),
    generatedBy: "deterministic-free-template"
  };
}

/** Shared overflow rule so panel edits and template generation agree on print fit. */
export function panelOverflowRisk(headline: string, body: string): boolean {
  return body.length > 360 || headline.length > 90;
}

export function validateCardDraft(draft: CardDraft): CardValidation {
  const checks: ValidationCheck[] = [
    {
      label: "Four panels",
      passed: hasOrderedRenderPacketPanels(draft.panels),
      detail: `${draft.panels.length}/4 panels present`
    },
    {
      label: "5x7 print size",
      passed: draft.panels.every(panelMatchesRenderPacketTarget),
      detail: renderPacketDimensionLabel()
    },
    {
      label: "Text fit",
      passed: draft.panels.every((panel) => !panel.overflowRisk),
      detail: "Template copy stays inside conservative safe areas"
    },
    {
      label: "Human gate",
      passed: true,
      detail: "User must approve before opening a printer upload page"
    },
    {
      label: "No paid services",
      passed: true,
      detail: "No outside account, payment, or printer checkout is required in CustomCard"
    }
  ];
  const errors = checks.filter((check) => !check.passed).map((check) => check.label);

  return {
    passed: errors.length === 0,
    checks,
    errors
  };
}

function toneLine(tone: Tone): string {
  const lines: Record<TonePreset, string> = {
    warm: "You two make commitment look gentle and alive.",
    funny: "Another year, another excellent excuse to celebrate your shared weird little traditions.",
    elegant: "Your life together has the quiet grace of something tended with care.",
    simple: "Thinking of you today, and glad you're in my life.",
    reverent: "May the love around you continue to be a source of steadiness and blessing.",
    sentimental: "Some people make ordinary days feel worth keeping \u2014 you're one of them."
  };
  const preset = normalizeTonePreset(tone);
  const normalized = cleanText(tone).toLowerCase();
  if (normalized === preset || (preset === "funny" && normalized === "playful")) return lines[preset];
  const customTone = cleanText(tone).toLowerCase();
  return `A ${customTone || lines[preset].toLowerCase()} note, personal and specific.`;
}

function artDirection(style: VisualStyle, tone: Tone) {
  const tonePreset = normalizeTonePreset(tone);
  const stylePreset = normalizeVisualStylePreset(style);
  const toneAccent = tonePreset === "funny" ? "with a lively offset rhythm" : "with calm spacing";
  const directions: Record<VisualStylePreset, { frontLine: string; front: string; left: string; right: string; back: string }> = {
    botanical: {
      frontLine: "Soft stems, small blooms, and a hand-lettered center.",
      front: `Botanical border ${toneAccent}`,
      left: "Pressed-flower margin with generous writing space",
      right: "Single vine crossing the fold edge",
      back: "Tiny leaf mark with sender attribution"
    },
    "bold-type": {
      frontLine: "Confident type, warm color blocking, no clutter.",
      front: `Large editorial type ${toneAccent}`,
      left: "Two-column message grid",
      right: "Wide headline and calm body copy",
      back: "Small publisher-style footer"
    },
    "photo-note": {
      frontLine: "Photo-safe frame, handwritten caption, clean border.",
      front: `Photo note layout ${toneAccent}`,
      left: "Caption strip and open note field",
      right: "Soft frame for the main message",
      back: "Simple archive label"
    },
    minimal: {
      frontLine: "One line, one accent, plenty of breathing room.",
      front: `Minimal field ${toneAccent}`,
      left: "Fine rule and short note",
      right: "Centered message composition",
      back: "Small signature lockup"
    }
  };
  const direction = directions[stylePreset];
  if (style === stylePreset && tone === tonePreset) return direction;

  const customStyle = cleanText(style);
  const customTone = cleanText(tone);
  const customPhrase = [customStyle, customTone].filter(Boolean).join(", ");
  if (!customPhrase) return direction;

  return {
    ...direction,
    frontLine: `${direction.frontLine} ${titleCase(customPhrase)}.`,
    front: `${direction.front}; custom direction: ${customPhrase}`,
    left: `${direction.left}; custom direction: ${customPhrase}`,
    right: `${direction.right}; custom direction: ${customPhrase}`,
    back: `${direction.back}; custom direction: ${customPhrase}`
  };
}

function isRtlLanguage(language: LanguageChoice): boolean {
  return language === "Arabic" || language === "Urdu";
}

export function normalizeTonePreset(tone: Tone): TonePreset {
  const normalized = cleanText(tone).toLowerCase();
  if (["warm", "funny", "elegant", "simple", "reverent", "sentimental"].includes(normalized)) {
    return normalized as TonePreset;
  }
  if (/\b(funny|playful|witty|humou?r)\b/.test(normalized)) return "funny";
  if (/\b(elegant|formal|polished|premium)\b/.test(normalized)) return "elegant";
  if (/\b(simple|plain|direct|minimal)\b/.test(normalized)) return "simple";
  if (/\b(reverent|spiritual|solemn|sacred)\b/.test(normalized)) return "reverent";
  if (/\b(sentimental|nostalgic|emotional|tender)\b/.test(normalized)) return "sentimental";
  return "warm";
}

export function normalizeVisualStylePreset(style: VisualStyle): VisualStylePreset {
  const normalized = cleanText(style).toLowerCase();
  if (["botanical", "bold-type", "photo-note", "minimal"].includes(normalized)) {
    return normalized as VisualStylePreset;
  }
  if (/\b(botanical|floral|flower|leaf|garden)\b/.test(normalized)) return "botanical";
  if (/\b(bold|type|typographic|poster|editorial)\b/.test(normalized)) return "bold-type";
  if (/\b(photo|note|scrapbook|caption|polaroid)\b/.test(normalized)) return "photo-note";
  return "minimal";
}

function namesOverlap(left: string, right: string): boolean {
  const leftTokens = nameTokens(left);
  const rightTokens = nameTokens(right);
  return leftTokens.some((token) => rightTokens.includes(token));
}

function nameTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && token !== "and" && token !== "the");
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function titleCase(value: string): string {
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
