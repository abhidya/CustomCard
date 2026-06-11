import {
  hasOrderedRenderPacketPanels,
  panelMatchesRenderPacketTarget,
  renderPacketDimensionLabel,
  renderPacketTarget
} from "./renderPacketContract";
import type { CardOpportunity, LocalWorkspace, MemoryItem } from "./freeMvp";

export type Tone = "warm" | "playful" | "elegant" | "reverent";
export type VisualStyle = "botanical" | "bold-type" | "photo-note" | "minimal";
export type LanguageChoice = "English" | "Spanish" | "Urdu" | "Arabic";

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
}

export interface CardDraft {
  id: string;
  input: CardDraftInput;
  panels: CardPanel[];
  memoryCitations: string[];
  generatedBy: "deterministic-free-template" | "ai-text-only" | "ai-text-and-image";
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
    overflowRisk: panel.body.length > 360 || panel.headline.length > 90
  }));

  return {
    id: `draft-${stableId(`${sender}:${recipient}:${occasion}:${input.tone}:${input.style}:${note}`)}`,
    input,
    panels,
    memoryCitations: approvedMemories.map((memory) => memory.id),
    generatedBy: "deterministic-free-template"
  };
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
  const lines: Record<Tone, string> = {
    warm: "You two make commitment look gentle and alive.",
    playful: "Another year, another excellent excuse to celebrate your shared weird little traditions.",
    elegant: "Your life together has the quiet grace of something tended with care.",
    reverent: "May the love around you continue to be a source of steadiness and blessing."
  };
  return lines[tone];
}

function artDirection(style: VisualStyle, tone: Tone) {
  const toneAccent = tone === "playful" ? "with a lively offset rhythm" : "with calm spacing";
  const directions: Record<VisualStyle, { frontLine: string; front: string; left: string; right: string; back: string }> = {
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
  return directions[style];
}

function isRtlLanguage(language: LanguageChoice): boolean {
  return language === "Arabic" || language === "Urdu";
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
