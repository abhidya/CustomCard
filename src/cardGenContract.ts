/**
 * TypeScript contract for the card generation sidecar (card_gen/).
 *
 * Mirrors card_gen/card_gen/domain.py — keep these in sync when domain.py changes.
 *
 * Gate: liveProviderCallsEnabled is false. The sidecar is wired but won't be
 * called until VITE_CARD_GEN_URL is set in the environment. Set it to the
 * sidecar URL (e.g. http://localhost:8001) to enable.
 *
 * Sidecar startup:
 *   cd card_gen
 *   ANTHROPIC_API_KEY=sk-... CARD_GEN_API_TOKEN=... uv run uvicorn card_gen.app:app --reload --port 8001
 */

import {
  isRenderPacketPanelId,
  renderPacketCopyLimits,
  renderPacketPanelIds,
  renderPacketTarget,
  type RenderPacketPanelId
} from "./renderPacketContract";
import cardGenSchemaContractData from "../card-gen-contract.json";

export type CardPanelId = RenderPacketPanelId;
export type CardGenMode = "ai-text-only" | "ai-text-and-image";

export const cardGenSchemaContract = cardGenSchemaContractData;

/** POST /generate request body — mirrors CardDraftInput in domain.py */
export interface CardGenRequest {
  sender: string;
  recipient: string;
  relationship: string;
  occasion: string;
  tone: string;
  style: string;
  language?: string;
  personalNote?: string;
  memoryNotes?: string[];
}

/** Single panel copy — mirrors PanelCopy in domain.py */
export interface CardPanelCopy {
  id: CardPanelId;
  headline: string;
  body: string;
  artDirection: string;
}

/** Text generation output — mirrors CardCopyOutput in domain.py */
export interface CardCopyOutput {
  panels: CardPanelCopy[];
  memoryCitations: string[];
}

export type CardImageNormalizationStatus = "normalized-to-render-packet" | "verified-render-packet";
export type CardImageNormalizationOperation = "resize-crop" | "verified-target-size";

export interface CardImageNormalization {
  status: CardImageNormalizationStatus;
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  operation: CardImageNormalizationOperation;
}

/** Image generation result per panel — mirrors CardImageResult in domain.py */
export interface CardImageResult {
  panelId: CardPanelId;
  imageUrl: string;
  revisedPrompt?: string;
  width: number;
  height: number;
  normalization: CardImageNormalization;
}

/** POST /generate response — mirrors CardGenerationResult in domain.py */
export interface CardGenResponse {
  draftId: string;
  cardCopy: CardCopyOutput;
  images: CardImageResult[];
  generatedBy: CardGenMode;
}

/** GET /health response */
export interface CardGenHealthResponse {
  status: "ok";
  imageGen: "enabled" | "disabled";
}

/**
 * Integration contract between the React app and the card gen sidecar.
 * liveProviderCallsEnabled and externalNetworkCalls are false — gates that
 * must be flipped at runtime by setting VITE_CARD_GEN_URL.
 */
export interface CardGenSidecarContract {
  generateEndpoint: "/generate";
  healthEndpoint: "/health";
  baseUrl: string | null;
  liveProviderCallsEnabled: false;
  externalNetworkCalls: false;
  imageGenEnabled: boolean;
  noNetworkProof: true;
  frontendRequiredEnv: ["VITE_CARD_GEN_URL"];
  sidecarRequiredEnv: ["ANTHROPIC_API_KEY", "CARD_GEN_API_TOKEN"];
  sidecarOptionalEnv: [
    "CARD_GEN_ALLOWED_ORIGINS",
    "CARD_GEN_RATE_LIMIT_PER_MINUTE",
    "CARD_GEN_MONTHLY_BUDGET_CENTS",
    "CARD_GEN_PER_REQUEST_BUDGET_CENTS",
    "CARD_GEN_MAX_BODY_BYTES",
    "CARD_GEN_ALLOW_UNAUTHENTICATED_LOCAL",
    "OPENAI_API_KEY",
    "CARD_IMAGE_ENABLED",
    "CARD_TEXT_MODEL",
    "CARD_TEXT_MAX_TOKENS",
    "CARD_TEXT_REQUEST_LIMIT",
    "CARD_TEXT_UNIT_COST_CENTS",
    "CARD_IMAGE_UNIT_COST_CENTS",
    "CARD_IMAGE_MODEL"
  ];
  blockedReasons: string[];
}

export const requiredCardPanelIds: CardPanelId[] = [...renderPacketPanelIds];
const cardGenGeneratedByModes = new Set<string>(cardGenSchemaContract.response.generatedBy);

/** Build the sidecar contract from env. baseUrl null = gate closed. */
export function buildCardGenSidecarContract(env: {
  cardGenUrl: string | null;
  imageGenEnabled: boolean;
}): CardGenSidecarContract {
  return {
    generateEndpoint: "/generate",
    healthEndpoint: "/health",
    baseUrl: env.cardGenUrl,
    liveProviderCallsEnabled: false,
    externalNetworkCalls: false,
    imageGenEnabled: env.imageGenEnabled,
    noNetworkProof: true,
    frontendRequiredEnv: ["VITE_CARD_GEN_URL"],
    sidecarRequiredEnv: ["ANTHROPIC_API_KEY", "CARD_GEN_API_TOKEN"],
    sidecarOptionalEnv: [
      "CARD_GEN_ALLOWED_ORIGINS",
      "CARD_GEN_RATE_LIMIT_PER_MINUTE",
      "CARD_GEN_MONTHLY_BUDGET_CENTS",
      "CARD_GEN_PER_REQUEST_BUDGET_CENTS",
      "CARD_GEN_MAX_BODY_BYTES",
      "CARD_GEN_ALLOW_UNAUTHENTICATED_LOCAL",
      "OPENAI_API_KEY",
      "CARD_IMAGE_ENABLED",
      "CARD_TEXT_MODEL",
      "CARD_TEXT_MAX_TOKENS",
      "CARD_TEXT_REQUEST_LIMIT",
      "CARD_TEXT_UNIT_COST_CENTS",
      "CARD_IMAGE_UNIT_COST_CENTS",
      "CARD_IMAGE_MODEL"
    ],
    blockedReasons: [
      ...(env.cardGenUrl ? [] : ["VITE_CARD_GEN_URL is not set — sidecar URL required to enable AI generation."]),
      ...(env.imageGenEnabled ? [] : ["Image generation disabled — set OPENAI_API_KEY and CARD_IMAGE_ENABLED=true on the sidecar."])
    ]
  };
}

/** Validate a CardGenRequest before sending to the sidecar. */
export function validateCardGenRequest(req: CardGenRequest): string[] {
  const issues: string[] = [];

  if (!req.sender?.trim()) issues.push("Card gen request requires a sender name.");
  if (!req.recipient?.trim()) issues.push("Card gen request requires a recipient name.");
  if (!req.relationship?.trim()) issues.push("Card gen request requires a relationship.");
  if (!req.occasion?.trim()) issues.push("Card gen request requires an occasion.");
  if (!req.tone?.trim()) issues.push("Card gen request requires a tone.");
  if (!req.style?.trim()) issues.push("Card gen request requires a style.");
  if (req.memoryNotes && req.memoryNotes.some((note) => !note.trim())) {
    issues.push("Card gen memory notes must not contain blank entries.");
  }

  return issues;
}

/** Validate a CardGenResponse returned by the sidecar. */
export function validateCardGenResponse(response: CardGenResponse): string[] {
  const issues: string[] = [];

  if (!response.draftId?.trim()) issues.push("Card gen response missing draftId.");

  const panelIds = response.cardCopy.panels.map((p) => p.id);
  for (const requiredId of requiredCardPanelIds) {
    if (!panelIds.includes(requiredId)) {
      issues.push(`Card gen response missing required panel: ${requiredId}.`);
    }
  }
  if (response.cardCopy.panels.length !== 4) {
    issues.push(`Card gen response must have exactly 4 panels, got ${response.cardCopy.panels.length}.`);
  }

  for (const panel of response.cardCopy.panels) {
    if (!panel.headline?.trim()) {
      issues.push(`Panel ${panel.id} missing headline.`);
    }
    if (panel.headline && panel.headline.length > renderPacketCopyLimits.headlineMaxCharacters) {
      issues.push(`Panel ${panel.id} headline exceeds ${renderPacketCopyLimits.headlineMaxCharacters} characters.`);
    }
    if (!panel.body?.trim()) {
      issues.push(`Panel ${panel.id} missing body.`);
    }
    if (panel.body && panel.body.length > renderPacketCopyLimits.bodyMaxCharacters) {
      issues.push(`Panel ${panel.id} body exceeds ${renderPacketCopyLimits.bodyMaxCharacters} characters.`);
    }
    if (!panel.artDirection?.trim()) {
      issues.push(`Panel ${panel.id} missing artDirection.`);
    }
  }

  for (const image of response.images) {
    if (!isRenderPacketPanelId(image.panelId)) {
      issues.push(`Image result has unknown panelId: ${image.panelId}.`);
    }
    if (!image.imageUrl?.trim()) {
      issues.push(`Image result for panel ${image.panelId} missing imageUrl.`);
    }
    if (image.width !== renderPacketTarget.widthPixels || image.height !== renderPacketTarget.heightPixels) {
      issues.push(
        `Image result for panel ${image.panelId} must be ${renderPacketTarget.widthPixels}×${renderPacketTarget.heightPixels}, got ${image.width}×${image.height}.`
      );
    }
    if (!image.normalization) {
      issues.push(`Image result for panel ${image.panelId} missing normalization proof.`);
    } else {
      if (
        image.normalization.targetWidth !== renderPacketTarget.widthPixels ||
        image.normalization.targetHeight !== renderPacketTarget.heightPixels
      ) {
        issues.push(
          `Image result for panel ${image.panelId} normalization target must be ${renderPacketTarget.widthPixels}×${renderPacketTarget.heightPixels}.`
        );
      }
      if (image.normalization.status === "verified-render-packet") {
        if (
          image.normalization.sourceWidth !== renderPacketTarget.widthPixels ||
          image.normalization.sourceHeight !== renderPacketTarget.heightPixels ||
          image.normalization.operation !== "verified-target-size"
        ) {
          issues.push(`Image result for panel ${image.panelId} cannot claim verified Render Packet size without matching source dimensions.`);
        }
      } else if (image.normalization.status === "normalized-to-render-packet") {
        if (image.normalization.operation !== "resize-crop") {
          issues.push(`Image result for panel ${image.panelId} normalized proof must use resize-crop operation.`);
        }
      } else {
        issues.push(`Image result for panel ${image.panelId} has unknown normalization status.`);
      }
    }
  }

  if (!cardGenGeneratedByModes.has(response.generatedBy)) {
    issues.push(`Card gen generatedBy must be ai-text-only or ai-text-and-image, got: ${response.generatedBy}.`);
  }
  if (response.generatedBy === "ai-text-and-image" && response.images.length === 0) {
    issues.push("Card gen response claims ai-text-and-image but has no image results.");
  }

  return issues;
}

function truncateSentence(value: string, maxLength: number): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}.`;
}

function primaryMemory(req: CardGenRequest): string {
  return (
    req.memoryNotes?.find((note) => note.trim())?.trim() ||
    req.personalNote?.trim() ||
    `the real history between ${req.sender} and ${req.recipient}`
  );
}

function emotionalJob(req: CardGenRequest): string {
  const source = `${req.occasion} ${req.tone}`.toLowerCase();
  if (source.includes("sympathy") || source.includes("condolence")) return "comfort";
  if (source.includes("thank")) return "gratitude";
  if (source.includes("sorry") || source.includes("belated") || source.includes("apology")) return "repair";
  if (source.includes("graduation") || source.includes("congrat")) return "pride";
  if (source.includes("get well") || source.includes("encourage")) return "encouragement";
  return "celebration";
}

function stubArtDirection(req: CardGenRequest, composition: string): string {
  return truncateSentence(
    `${req.style} custom 5x7 card art anchored in this remembered detail: ${primaryMemory(req)}. ` +
      `Emotional job: ${emotionalJob(req)} for a ${req.relationship}. Composition: ${composition}, with a clean text-safe zone. ` +
      "Avoid generic balloons, hearts, caps, rings, fake handwriting, logos, people, faces, and hands.",
    390
  );
}

/** Build a stub CardGenResponse for local testing (no sidecar required). */
export function buildStubCardGenResponse(req: CardGenRequest): CardGenResponse {
  const memory = primaryMemory(req);
  const job = emotionalJob(req);
  const panels: CardPanelCopy[] = [
    {
      id: "front",
      headline: `For ${req.recipient}`,
      body: truncateSentence(`A ${job} card shaped around ${memory}.`, 120),
      artDirection: stubArtDirection(req, "one strong remembered object near the edge, calm center for exact front copy")
    },
    {
      id: "inside-left",
      headline: "Thinking of you",
      body: truncateSentence(
        `This is not just a ${req.occasion} note. It remembers ${memory} and the way that detail belongs to you.`,
        220
      ),
      artDirection: stubArtDirection(req, "quiet interior texture with the remembered object repeated as a small margin motif")
    },
    {
      id: "inside-right",
      headline: "From the heart",
      body: truncateSentence(
        `From ${req.sender}, with ${req.tone || "care"} care for the part no shelf card would know.`,
        180
      ),
      artDirection: stubArtDirection(req, "lighter companion panel with generous blank space for handwritten signature")
    },
    {
      id: "back",
      headline: "CustomCard",
      body: "Made with CustomCard · Printed locally.",
      artDirection: stubArtDirection(req, "minimal back panel, small production mark area, mostly paper grain")
    }
  ];

  return {
    draftId: `stub-${req.recipient.toLowerCase().replace(/\s+/g, "-")}`,
    cardCopy: { panels, memoryCitations: req.memoryNotes?.slice(0, 3) ?? [] },
    images: [],
    generatedBy: "ai-text-only"
  };
}
