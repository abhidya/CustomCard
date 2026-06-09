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
 *   ANTHROPIC_API_KEY=sk-... uv run uvicorn card_gen.app:app --reload --port 8001
 */

export type CardPanelId = "front" | "inside-left" | "inside-right" | "back";
export type CardGenMode = "ai-text-only" | "ai-text-and-image";

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

/** Image generation result per panel — mirrors CardImageResult in domain.py */
export interface CardImageResult {
  panelId: CardPanelId;
  imageUrl: string;
  revisedPrompt?: string;
  width: number;
  height: number;
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
  sidecarRequiredEnv: ["ANTHROPIC_API_KEY"];
  sidecarOptionalEnv: ["OPENAI_API_KEY", "CARD_IMAGE_ENABLED", "CARD_TEXT_MODEL", "CARD_IMAGE_MODEL"];
  blockedReasons: string[];
}

export const requiredCardPanelIds: CardPanelId[] = ["front", "inside-left", "inside-right", "back"];

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
    sidecarRequiredEnv: ["ANTHROPIC_API_KEY"],
    sidecarOptionalEnv: ["OPENAI_API_KEY", "CARD_IMAGE_ENABLED", "CARD_TEXT_MODEL", "CARD_IMAGE_MODEL"],
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
    if (panel.headline && panel.headline.length > 120) {
      issues.push(`Panel ${panel.id} headline exceeds 120 characters.`);
    }
    if (!panel.body?.trim()) {
      issues.push(`Panel ${panel.id} missing body.`);
    }
    if (panel.body && panel.body.length > 600) {
      issues.push(`Panel ${panel.id} body exceeds 600 characters.`);
    }
    if (!panel.artDirection?.trim()) {
      issues.push(`Panel ${panel.id} missing artDirection.`);
    }
  }

  for (const image of response.images) {
    if (!requiredCardPanelIds.includes(image.panelId)) {
      issues.push(`Image result has unknown panelId: ${image.panelId}.`);
    }
    if (!image.imageUrl?.trim()) {
      issues.push(`Image result for panel ${image.panelId} missing imageUrl.`);
    }
    if (image.width !== 1500 || image.height !== 2100) {
      issues.push(`Image result for panel ${image.panelId} must be 1500×2100, got ${image.width}×${image.height}.`);
    }
  }

  if (!["ai-text-only", "ai-text-and-image"].includes(response.generatedBy)) {
    issues.push(`Card gen generatedBy must be ai-text-only or ai-text-and-image, got: ${response.generatedBy}.`);
  }
  if (response.generatedBy === "ai-text-and-image" && response.images.length === 0) {
    issues.push("Card gen response claims ai-text-and-image but has no image results.");
  }

  return issues;
}

/** Build a stub CardGenResponse for local testing (no sidecar required). */
export function buildStubCardGenResponse(req: CardGenRequest): CardGenResponse {
  const panels: CardPanelCopy[] = [
    {
      id: "front",
      headline: `For ${req.recipient}`,
      body: `A card made with care${req.occasion ? ` for ${req.occasion}` : ""}.`,
      artDirection: `${req.style} style, warm palette, suitable for ${req.occasion || "celebration"}.`
    },
    {
      id: "inside-left",
      headline: "Thinking of you",
      body: `With ${req.tone || "warm"} thoughts${req.personalNote ? `: ${req.personalNote.slice(0, 80)}` : "."}.`,
      artDirection: `${req.style} interior panel, soft texture, minimal.`
    },
    {
      id: "inside-right",
      headline: "From the heart",
      body: `From ${req.sender}${req.memoryNotes && req.memoryNotes.length > 0 ? ` — inspired by what matters to ${req.recipient}` : ""}.`,
      artDirection: `${req.style} panel, complementary to inside-left.`
    },
    {
      id: "back",
      headline: "CustomCard",
      body: "Made with CustomCard · Printed locally.",
      artDirection: "Clean back panel, logo placement, minimal."
    }
  ];

  return {
    draftId: `stub-${req.recipient.toLowerCase().replace(/\s+/g, "-")}`,
    cardCopy: { panels, memoryCitations: req.memoryNotes?.slice(0, 3) ?? [] },
    images: [],
    generatedBy: "ai-text-only"
  };
}
