/**
 * Live model chat contract — extends customerChat.ts with the typed request/
 * response shape that a real model provider will satisfy.
 *
 * Gate: liveModelCallsEnabled is false. The deterministic local path stays
 * active until this gate is flipped at runtime (requires model API key +
 * prompt audit + spend limits — see D008).
 *
 * The invariants enforced here (PII redaction, memory minimization, no
 * external credential leak) must hold regardless of which model provider
 * is active.
 */

import type { ChatMessage } from "./providerCatalog";

export type LiveModelProvider =
  | "anthropic"
  | "openai"
  | "azure-openai"
  | "aws-bedrock"
  | "google-gemini";

export type LiveChatFinishReason = "stop" | "max_tokens" | "content_filter" | "error";

/**
 * Request sent to a live model provider.
 * Must be pre-validated (PII redacted, memory minimized) before construction.
 */
export interface LiveModelChatRequest {
  provider: LiveModelProvider;
  model: string;
  systemPrompt: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature: number;
  approvedMemoryNotes: string[];
  recipientName: string;
  fulfillmentContext: string;
  piiRedacted: true;
  memoryMinimized: true;
  liveModelCallsEnabled: false;
}

/** Response from a live model provider. */
export interface LiveModelChatResponse {
  provider: LiveModelProvider;
  model: string;
  outputText: string;
  inputTokens: number;
  outputTokens: number;
  finishReason: LiveChatFinishReason;
  liveModelCallsEnabled: false;
}

/** Spend policy enforced before any live model call. */
export interface LiveChatSpendPolicy {
  maxInputTokensPerRequest: number;
  maxOutputTokensPerRequest: number;
  maxDailyInputTokens: number;
  maxDailyOutputTokens: number;
  allowedProviders: LiveModelProvider[];
  allowedModels: Record<LiveModelProvider, string[]>;
  liveModelCallsEnabled: false;
  requiredEnvVars: string[];
}

export const liveChatSpendPolicy: LiveChatSpendPolicy = {
  maxInputTokensPerRequest: 4096,
  maxOutputTokensPerRequest: 512,
  maxDailyInputTokens: 100_000,
  maxDailyOutputTokens: 25_600,
  allowedProviders: ["anthropic", "openai", "azure-openai", "aws-bedrock", "google-gemini"],
  allowedModels: {
    anthropic: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6"],
    openai: ["gpt-4o-mini", "gpt-4o"],
    "azure-openai": ["gpt-4o-mini", "gpt-4o"],
    "aws-bedrock": ["us.amazon.nova-lite-v1:0"],
    "google-gemini": ["gemini-2.0-flash"]
  },
  liveModelCallsEnabled: false,
  requiredEnvVars: ["ANTHROPIC_API_KEY"]
};

/** Build the system prompt injected into every live model call. */
export function buildLiveChatSystemPrompt(params: {
  recipientName: string;
  approvedMemoryNotes: string[];
  fulfillmentContext: string;
}): string {
  const memorySection =
    params.approvedMemoryNotes.length > 0
      ? `Approved memory notes (use these; do not invent others):\n${params.approvedMemoryNotes.map((n) => `- ${n}`).join("\n")}`
      : "No approved memory notes — do not invent personal details.";

  return [
    `You are a greeting card assistant helping create a card for ${params.recipientName}.`,
    "You must not ask for, repeat, or store any personal information beyond what is provided in approved memory notes.",
    "You must not output email addresses, phone numbers, payment card numbers, or other PII.",
    "Your responses must be concise (under 100 words) and focused on card content.",
    memorySection,
    `Fulfillment context: ${params.fulfillmentContext}`,
    "Do not recommend specific vendors, prices, or checkout flows — stay focused on card content.",
    "End every response with: 'This reply was reviewed before being shown to you.'"
  ].join("\n\n");
}

/** Validate a live model chat request before sending to the provider. */
export function validateLiveModelChatRequest(req: LiveModelChatRequest): string[] {
  const issues: string[] = [];

  if (req.liveModelCallsEnabled) {
    issues.push("Live model chat request must not claim liveModelCallsEnabled = true.");
  }
  if (!req.piiRedacted) {
    issues.push("Live model chat request must have piiRedacted = true (pre-validate before building).");
  }
  if (!req.memoryMinimized) {
    issues.push("Live model chat request must have memoryMinimized = true.");
  }
  if (!liveChatSpendPolicy.allowedProviders.includes(req.provider)) {
    issues.push(`Provider ${req.provider} is not in the allowed provider list.`);
  }
  const allowedModels = liveChatSpendPolicy.allowedModels[req.provider] ?? [];
  if (!allowedModels.includes(req.model)) {
    issues.push(`Model ${req.model} is not in the allowed model list for ${req.provider}.`);
  }
  if (req.maxTokens > liveChatSpendPolicy.maxOutputTokensPerRequest) {
    issues.push(
      `maxTokens ${req.maxTokens} exceeds spend policy limit of ${liveChatSpendPolicy.maxOutputTokensPerRequest}.`
    );
  }
  if (!req.systemPrompt?.trim()) {
    issues.push("Live model chat request must include a system prompt.");
  }
  if (req.messages.length === 0) {
    issues.push("Live model chat request must include at least one message.");
  }
  for (const msg of req.messages) {
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(msg.text)) {
      issues.push("Live model chat message contains unreacted email address — pre-validate first.");
    }
    if (/\b(?:\d[ -]*?){13,16}\b/.test(msg.text)) {
      issues.push("Live model chat message contains possible unredacted payment card number.");
    }
  }

  return issues;
}

/** Validate a live model chat response before surfacing to the customer. */
export function validateLiveModelChatResponse(res: LiveModelChatResponse): string[] {
  const issues: string[] = [];

  if (res.liveModelCallsEnabled) {
    issues.push("Live model chat response must preserve liveModelCallsEnabled = false.");
  }
  if (!res.outputText?.trim()) {
    issues.push("Live model chat response has empty output text.");
  }
  if (res.inputTokens < 0 || res.outputTokens < 0) {
    issues.push("Live model chat response token counts must be non-negative.");
  }
  if (res.outputTokens > liveChatSpendPolicy.maxOutputTokensPerRequest) {
    issues.push(
      `Response output tokens ${res.outputTokens} exceeds spend policy limit.`
    );
  }
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(res.outputText)) {
    issues.push("Live model response contains a possible email address — must be post-processed.");
  }
  if (!/reviewed before being shown/i.test(res.outputText)) {
    issues.push("Live model response missing required disclosure footer.");
  }

  return issues;
}

/** Build a live model chat request from validated inputs. */
export function buildLiveModelChatRequest(params: {
  provider: LiveModelProvider;
  model: string;
  recipientName: string;
  customerMessage: string;
  approvedMemoryNotes: string[];
  fulfillmentContext: string;
  existingMessages: ChatMessage[];
}): LiveModelChatRequest {
  return {
    provider: params.provider,
    model: params.model,
    systemPrompt: buildLiveChatSystemPrompt({
      recipientName: params.recipientName,
      approvedMemoryNotes: params.approvedMemoryNotes,
      fulfillmentContext: params.fulfillmentContext
    }),
    messages: [
      ...params.existingMessages,
      { role: "customer" as const, text: params.customerMessage }
    ],
    maxTokens: liveChatSpendPolicy.maxOutputTokensPerRequest,
    temperature: 0.4,
    approvedMemoryNotes: params.approvedMemoryNotes,
    recipientName: params.recipientName,
    fulfillmentContext: params.fulfillmentContext,
    piiRedacted: true,
    memoryMinimized: true,
    liveModelCallsEnabled: false
  };
}
