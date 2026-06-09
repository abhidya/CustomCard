import { describe, expect, it } from "vitest";
import {
  buildLiveChatSystemPrompt,
  buildLiveModelChatRequest,
  liveChatSpendPolicy,
  validateLiveModelChatRequest,
  validateLiveModelChatResponse,
  type LiveModelChatRequest,
  type LiveModelChatResponse
} from "./liveChatContract";

const baseRequest: LiveModelChatRequest = {
  provider: "anthropic",
  model: "claude-haiku-4-5-20251001",
  systemPrompt: "You are a greeting card assistant. This reply was reviewed before being shown to you.",
  messages: [{ role: "customer", text: "Make it botanical please." }],
  maxTokens: 512,
  temperature: 0.4,
  approvedMemoryNotes: ["Loves botanical art."],
  recipientName: "Sara",
  fulfillmentContext: "$1.42 Walmart pickup",
  piiRedacted: true,
  memoryMinimized: true,
  liveModelCallsEnabled: false
};

const baseResponse: LiveModelChatResponse = {
  provider: "anthropic",
  model: "claude-haiku-4-5-20251001",
  outputText:
    "I can help make a botanical card for Sara. The front panel could feature watercolour ferns. This reply was reviewed before being shown to you.",
  inputTokens: 120,
  outputTokens: 40,
  finishReason: "stop",
  liveModelCallsEnabled: false
};

describe("liveChatSpendPolicy", () => {
  it("keeps liveModelCallsEnabled false", () => {
    expect(liveChatSpendPolicy.liveModelCallsEnabled).toBe(false);
  });

  it("caps output tokens per request", () => {
    expect(liveChatSpendPolicy.maxOutputTokensPerRequest).toBeGreaterThan(0);
    expect(liveChatSpendPolicy.maxOutputTokensPerRequest).toBeLessThanOrEqual(1024);
  });

  it("allows anthropic and openai providers", () => {
    expect(liveChatSpendPolicy.allowedProviders).toContain("anthropic");
    expect(liveChatSpendPolicy.allowedProviders).toContain("openai");
  });

  it("lists at least one allowed model per provider", () => {
    for (const provider of liveChatSpendPolicy.allowedProviders) {
      expect(liveChatSpendPolicy.allowedModels[provider].length).toBeGreaterThan(0);
    }
  });

  it("requires ANTHROPIC_API_KEY", () => {
    expect(liveChatSpendPolicy.requiredEnvVars).toContain("ANTHROPIC_API_KEY");
  });
});

describe("buildLiveChatSystemPrompt", () => {
  it("includes the recipient name", () => {
    const prompt = buildLiveChatSystemPrompt({
      recipientName: "Sara",
      approvedMemoryNotes: [],
      fulfillmentContext: "$1.42 pickup"
    });
    expect(prompt).toContain("Sara");
  });

  it("includes approved memory notes", () => {
    const prompt = buildLiveChatSystemPrompt({
      recipientName: "Sara",
      approvedMemoryNotes: ["Loves botanical art.", "Morning person."],
      fulfillmentContext: "$1.42 pickup"
    });
    expect(prompt).toContain("Loves botanical art.");
    expect(prompt).toContain("Morning person.");
  });

  it("states no memory notes when list is empty", () => {
    const prompt = buildLiveChatSystemPrompt({
      recipientName: "Sara",
      approvedMemoryNotes: [],
      fulfillmentContext: "$1.42 pickup"
    });
    expect(prompt).toContain("No approved memory notes");
  });

  it("instructs the model not to invent personal details", () => {
    const prompt = buildLiveChatSystemPrompt({
      recipientName: "Sara",
      approvedMemoryNotes: [],
      fulfillmentContext: "$1.42 pickup"
    });
    expect(prompt.toLowerCase()).toContain("do not invent");
  });

  it("includes the fulfillment context", () => {
    const prompt = buildLiveChatSystemPrompt({
      recipientName: "Sara",
      approvedMemoryNotes: [],
      fulfillmentContext: "$22.99 FedEx shipping"
    });
    expect(prompt).toContain("$22.99 FedEx shipping");
  });

  it("prohibits outputting PII", () => {
    const prompt = buildLiveChatSystemPrompt({
      recipientName: "Sara",
      approvedMemoryNotes: [],
      fulfillmentContext: ""
    });
    expect(prompt.toLowerCase()).toContain("email");
    expect(prompt.toLowerCase()).toContain("pii");
  });
});

describe("validateLiveModelChatRequest", () => {
  it("passes a valid request", () => {
    expect(validateLiveModelChatRequest(baseRequest)).toEqual([]);
  });

  it("rejects disallowed provider", () => {
    const issues = validateLiveModelChatRequest({
      ...baseRequest,
      provider: "unknown-llm" as "anthropic"
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("allowed provider list")]));
  });

  it("rejects disallowed model for provider", () => {
    const issues = validateLiveModelChatRequest({
      ...baseRequest,
      provider: "anthropic",
      model: "gpt-4o"
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("allowed model list")]));
  });

  it("rejects maxTokens over spend policy limit", () => {
    const issues = validateLiveModelChatRequest({
      ...baseRequest,
      maxTokens: 9999
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("spend policy")]));
  });

  it("rejects request with email in message text", () => {
    const issues = validateLiveModelChatRequest({
      ...baseRequest,
      messages: [{ role: "customer", text: "my email is sara@example.com" }]
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("email address")]));
  });

  it("rejects request with possible card number in message text", () => {
    const issues = validateLiveModelChatRequest({
      ...baseRequest,
      messages: [{ role: "customer", text: "card 4111 1111 1111 1111" }]
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("payment card")]));
  });

  it("rejects empty message list", () => {
    const issues = validateLiveModelChatRequest({ ...baseRequest, messages: [] });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("message")]));
  });

  it("rejects missing system prompt", () => {
    const issues = validateLiveModelChatRequest({ ...baseRequest, systemPrompt: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("system prompt")]));
  });
});

describe("validateLiveModelChatResponse", () => {
  it("passes a valid response", () => {
    expect(validateLiveModelChatResponse(baseResponse)).toEqual([]);
  });

  it("rejects empty output text", () => {
    const issues = validateLiveModelChatResponse({ ...baseResponse, outputText: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("empty output")]));
  });

  it("rejects response missing disclosure footer", () => {
    const issues = validateLiveModelChatResponse({
      ...baseResponse,
      outputText: "Here is a botanical card idea for Sara."
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("disclosure footer")]));
  });

  it("rejects response containing email address", () => {
    const issues = validateLiveModelChatResponse({
      ...baseResponse,
      outputText: "Contact sara@example.com for more. This reply was reviewed before being shown to you."
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("email address")]));
  });

  it("rejects response with token count over spend policy", () => {
    const issues = validateLiveModelChatResponse({
      ...baseResponse,
      outputTokens: 9999
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("spend policy")]));
  });

  it("keeps liveModelCallsEnabled false in response", () => {
    expect(baseResponse.liveModelCallsEnabled).toBe(false);
  });
});

describe("buildLiveModelChatRequest", () => {
  it("builds a valid request", () => {
    const req = buildLiveModelChatRequest({
      provider: "anthropic",
      model: "claude-haiku-4-5-20251001",
      recipientName: "Sara",
      customerMessage: "Make it botanical please.",
      approvedMemoryNotes: ["Loves botanical art."],
      fulfillmentContext: "$1.42 Walmart pickup",
      existingMessages: []
    });
    expect(validateLiveModelChatRequest(req)).toEqual([]);
    expect(req.liveModelCallsEnabled).toBe(false);
    expect(req.piiRedacted).toBe(true);
    expect(req.memoryMinimized).toBe(true);
  });

  it("appends customer message to existing thread", () => {
    const existing = [{ role: "assistant" as const, text: "Welcome! Let me help you with Sara's card." }];
    const req = buildLiveModelChatRequest({
      provider: "anthropic",
      model: "claude-haiku-4-5-20251001",
      recipientName: "Sara",
      customerMessage: "Make it botanical please.",
      approvedMemoryNotes: [],
      fulfillmentContext: "$1.42 pickup",
      existingMessages: existing
    });
    expect(req.messages).toHaveLength(2);
    expect(req.messages[0].role).toBe("assistant");
    expect(req.messages[1].role).toBe("customer");
    expect(req.messages[1].text).toBe("Make it botanical please.");
  });

  it("includes recipient name in system prompt", () => {
    const req = buildLiveModelChatRequest({
      provider: "anthropic",
      model: "claude-haiku-4-5-20251001",
      recipientName: "Sara",
      customerMessage: "Hi",
      approvedMemoryNotes: [],
      fulfillmentContext: "",
      existingMessages: []
    });
    expect(req.systemPrompt).toContain("Sara");
  });

  it("caps maxTokens at spend policy limit", () => {
    const req = buildLiveModelChatRequest({
      provider: "anthropic",
      model: "claude-haiku-4-5-20251001",
      recipientName: "Sara",
      customerMessage: "Hi",
      approvedMemoryNotes: [],
      fulfillmentContext: "",
      existingMessages: []
    });
    expect(req.maxTokens).toBeLessThanOrEqual(liveChatSpendPolicy.maxOutputTokensPerRequest);
  });
});
