import { describe, expect, it } from "vitest";
import {
  buildCardGenSidecarContract,
  buildStubCardGenResponse,
  cardGenSchemaContract,
  requiredCardPanelIds,
  validateCardGenRequest,
  validateCardGenResponse,
  type CardGenRequest,
  type CardGenResponse
} from "./cardGenContract";
import { renderPacketPanelIds, renderPacketTarget } from "./renderPacketContract";

const baseRequest: CardGenRequest = {
  sender: "Manny",
  recipient: "Sara",
  relationship: "close friend",
  occasion: "birthday",
  tone: "warm and playful",
  style: "botanical watercolour",
  language: "English",
  personalNote: "She loves hiking and coffee.",
  memoryNotes: ["Loves botanical art.", "Prefers mornings."]
};

const validResponse: CardGenResponse = {
  draftId: "abc123",
  cardCopy: {
    panels: [
      {
        id: "front",
        headline: "Happy Birthday Sara",
        body: "Wishing you all the joy today.",
        artDirection: "Botanical watercolour, warm greens and pinks, morning light."
      },
      {
        id: "inside-left",
        headline: "Thinking of you",
        body: "Warmth and good coffee on your special day.",
        artDirection: "Soft interior, fern motif, minimal."
      },
      {
        id: "inside-right",
        headline: "From Manny",
        body: "With love and botanical vibes.",
        artDirection: "Complementary to inside-left, light botanical border."
      },
      {
        id: "back",
        headline: "CustomCard",
        body: "Made with CustomCard · Printed locally.",
        artDirection: "Clean back, logo bottom-right, white background."
      }
    ],
    memoryCitations: ["Loves botanical art."]
  },
  images: [],
  generatedBy: "ai-text-only"
};

describe("buildCardGenSidecarContract", () => {
  it("exports the shared sidecar schema contract", () => {
    expect(cardGenSchemaContract.request.wireFields).toEqual([
      "sender",
      "recipient",
      "relationship",
      "occasion",
      "tone",
      "style",
      "language",
      "personal_note",
      "memory_notes"
    ]);
    expect(cardGenSchemaContract.request.requiredWireFields).toEqual([
      "sender",
      "recipient",
      "relationship",
      "occasion",
      "tone",
      "style"
    ]);
    expect(cardGenSchemaContract.request.fieldLimits.memory_notes).toMatchObject({
      maxItems: 12,
      itemMaxLength: 500
    });
    expect(cardGenSchemaContract.response.generatedBy).toEqual(["ai-text-only", "ai-text-and-image"]);
  });

  it("uses the shared Render Packet panel order and target dimensions", () => {
    expect(requiredCardPanelIds).toEqual(renderPacketPanelIds);
    expect(renderPacketTarget).toMatchObject({ widthPixels: 1500, heightPixels: 2100, dpi: 300 });
  });

  it("returns a contract with liveProviderCallsEnabled false when url is null", () => {
    const contract = buildCardGenSidecarContract({ cardGenUrl: null, imageGenEnabled: false });
    expect(contract.liveProviderCallsEnabled).toBe(false);
    expect(contract.externalNetworkCalls).toBe(false);
    expect(contract.noNetworkProof).toBe(true);
    expect(contract.baseUrl).toBeNull();
  });

  it("returns a contract with liveProviderCallsEnabled still false even when url is set (gate not runtime-flipped)", () => {
    const contract = buildCardGenSidecarContract({
      cardGenUrl: "http://localhost:8001",
      imageGenEnabled: false
    });
    expect(contract.liveProviderCallsEnabled).toBe(false);
    expect(contract.baseUrl).toBe("http://localhost:8001");
  });

  it("reports VITE_CARD_GEN_URL blocker when url is null", () => {
    const contract = buildCardGenSidecarContract({ cardGenUrl: null, imageGenEnabled: false });
    expect(contract.blockedReasons.join(" ")).toContain("VITE_CARD_GEN_URL");
  });

  it("reports image gen blocker when imageGenEnabled is false", () => {
    const contract = buildCardGenSidecarContract({
      cardGenUrl: "http://localhost:8001",
      imageGenEnabled: false
    });
    expect(contract.blockedReasons.join(" ")).toContain("OPENAI_API_KEY");
  });

  it("reports no blockers when url is set and image gen is enabled", () => {
    const contract = buildCardGenSidecarContract({
      cardGenUrl: "http://localhost:8001",
      imageGenEnabled: true
    });
    expect(contract.blockedReasons).toHaveLength(0);
  });

  it("exposes the correct endpoints", () => {
    const contract = buildCardGenSidecarContract({ cardGenUrl: null, imageGenEnabled: false });
    expect(contract.generateEndpoint).toBe("/generate");
    expect(contract.healthEndpoint).toBe("/health");
  });

  it("lists required sidecar env vars", () => {
    const contract = buildCardGenSidecarContract({ cardGenUrl: null, imageGenEnabled: false });
    expect(contract.sidecarRequiredEnv).toContain("ANTHROPIC_API_KEY");
    expect(contract.sidecarRequiredEnv).toContain("CARD_GEN_API_TOKEN");
    expect(contract.sidecarOptionalEnv).toEqual(
      expect.arrayContaining(["CARD_GEN_ALLOWED_ORIGINS", "CARD_GEN_RATE_LIMIT_PER_MINUTE", "CARD_GEN_MAX_BODY_BYTES"])
    );
    expect(contract.frontendRequiredEnv).toContain("VITE_CARD_GEN_URL");
  });
});

describe("validateCardGenRequest", () => {
  it("passes a fully populated request", () => {
    expect(validateCardGenRequest(baseRequest)).toEqual([]);
  });

  it("rejects missing sender", () => {
    const issues = validateCardGenRequest({ ...baseRequest, sender: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("sender")]));
  });

  it("rejects missing recipient", () => {
    const issues = validateCardGenRequest({ ...baseRequest, recipient: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("recipient")]));
  });

  it("rejects missing occasion", () => {
    const issues = validateCardGenRequest({ ...baseRequest, occasion: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("occasion")]));
  });

  it("rejects missing tone", () => {
    const issues = validateCardGenRequest({ ...baseRequest, tone: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("tone")]));
  });

  it("rejects missing style", () => {
    const issues = validateCardGenRequest({ ...baseRequest, style: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("style")]));
  });

  it("rejects blank memory note entry", () => {
    const issues = validateCardGenRequest({ ...baseRequest, memoryNotes: ["valid note", ""] });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("memory notes")]));
  });

  it("passes with no optional fields", () => {
    const minimal: CardGenRequest = {
      sender: "Manny",
      recipient: "Sara",
      relationship: "friend",
      occasion: "birthday",
      tone: "warm",
      style: "minimal"
    };
    expect(validateCardGenRequest(minimal)).toEqual([]);
  });
});

describe("validateCardGenResponse", () => {
  it("passes a valid response", () => {
    expect(validateCardGenResponse(validResponse)).toEqual([]);
  });

  it("requires all 4 panel ids", () => {
    for (const panelId of requiredCardPanelIds) {
      const response: CardGenResponse = {
        ...validResponse,
        cardCopy: {
          ...validResponse.cardCopy,
          panels: validResponse.cardCopy.panels.filter((p) => p.id !== panelId)
        }
      };
      const issues = validateCardGenResponse(response);
      expect(issues).toEqual(expect.arrayContaining([expect.stringContaining(panelId)]));
    }
  });

  it("rejects panel with empty headline", () => {
    const response: CardGenResponse = {
      ...validResponse,
      cardCopy: {
        ...validResponse.cardCopy,
        panels: validResponse.cardCopy.panels.map((p) =>
          p.id === "front" ? { ...p, headline: "" } : p
        )
      }
    };
    const issues = validateCardGenResponse(response);
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("front")]));
    expect(issues.join(" ")).toContain("headline");
  });

  it("rejects panel headline over 120 chars", () => {
    const response: CardGenResponse = {
      ...validResponse,
      cardCopy: {
        ...validResponse.cardCopy,
        panels: validResponse.cardCopy.panels.map((p) =>
          p.id === "front" ? { ...p, headline: "x".repeat(121) } : p
        )
      }
    };
    const issues = validateCardGenResponse(response);
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("120")]));
  });

  it("rejects panel body over 600 chars", () => {
    const response: CardGenResponse = {
      ...validResponse,
      cardCopy: {
        ...validResponse.cardCopy,
        panels: validResponse.cardCopy.panels.map((p) =>
          p.id === "front" ? { ...p, body: "x".repeat(601) } : p
        )
      }
    };
    const issues = validateCardGenResponse(response);
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("600")]));
  });

  it("rejects image result with wrong dimensions", () => {
    const response: CardGenResponse = {
      ...validResponse,
      images: [{ panelId: "front", imageUrl: "https://example.com/img.png", width: 1024, height: 1024 }],
      generatedBy: "ai-text-and-image"
    };
    const issues = validateCardGenResponse(response);
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("1500×2100")]));
  });

  it("rejects ai-text-and-image claim with no images", () => {
    const response: CardGenResponse = { ...validResponse, generatedBy: "ai-text-and-image" };
    const issues = validateCardGenResponse(response);
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("no image")]));
  });

  it("rejects missing draftId", () => {
    const issues = validateCardGenResponse({ ...validResponse, draftId: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("draftId")]));
  });
});

describe("buildStubCardGenResponse", () => {
  it("produces a valid response for any request", () => {
    const response = buildStubCardGenResponse(baseRequest);
    expect(validateCardGenResponse(response)).toEqual([]);
  });

  it("includes all 4 panels", () => {
    const response = buildStubCardGenResponse(baseRequest);
    const panelIds = response.cardCopy.panels.map((p) => p.id);
    for (const id of requiredCardPanelIds) {
      expect(panelIds).toContain(id);
    }
  });

  it("cites memory notes in the response", () => {
    const response = buildStubCardGenResponse(baseRequest);
    expect(response.cardCopy.memoryCitations).toEqual(
      expect.arrayContaining(["Loves botanical art."])
    );
  });

  it("produces ai-text-only (no images in stub)", () => {
    const response = buildStubCardGenResponse(baseRequest);
    expect(response.generatedBy).toBe("ai-text-only");
    expect(response.images).toHaveLength(0);
  });

  it("produces a valid response even with minimal request", () => {
    const response = buildStubCardGenResponse({
      sender: "A",
      recipient: "B",
      relationship: "friend",
      occasion: "birthday",
      tone: "warm",
      style: "minimal"
    });
    expect(validateCardGenResponse(response)).toEqual([]);
  });
});
