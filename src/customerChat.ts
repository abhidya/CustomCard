import {
  buildCustomerChatTranscript,
  getAdaptersByCapability,
  type ChatMessage,
  type ProviderStatus
} from "./providerCatalog";
import { buildTextChatRuntime, getProviderRuntimeReadiness, sanitizeText } from "./providerRuntime";

export type CustomerChatMode = "local-deterministic";

export interface CustomerChatInput {
  recipientName: string;
  customerMessage: string;
  approvedMemoryNotes: string[];
  locale: string;
  fulfillmentContext: string;
}

export interface CustomerChatProviderSummary {
  total: number;
  readyLocal: number;
  credentialGated: number;
  contractOnly: number;
  blocked: number;
  preferredLocalAdapterId: string;
  previewProviderIds: string[];
}

export interface CustomerChatSession {
  mode: CustomerChatMode;
  adapterId: "deterministic-customer-chat";
  messages: ChatMessage[];
  providerSummary: CustomerChatProviderSummary;
  redactions: string[];
  liveModelCallsEnabled: false;
  externalNetworkCalls: false;
  noNetworkProof: true;
  blockedProviderReasons: string[];
}

export function buildCustomerChatSession(
  input: CustomerChatInput,
  existingMessages?: ChatMessage[]
): CustomerChatSession {
  const localRuntime = buildTextChatRuntime("deterministic-customer-chat", {
    customerMessage: input.customerMessage,
    recipientName: input.recipientName,
    approvedMemoryNotes: input.approvedMemoryNotes,
    locale: input.locale
  });
  const sanitized = sanitizeText(input.customerMessage);
  const baseMessages = existingMessages ?? localRuntime.localResult ?? buildCustomerChatTranscript(input.recipientName);
  const nextMessages: ChatMessage[] = sanitized.text
    ? [
        ...baseMessages,
        { role: "customer" as const, text: sanitized.text },
        { role: "assistant" as const, text: buildLocalAssistantReply(input, sanitized.text) }
      ]
    : baseMessages;
  const providers = getAdaptersByCapability("text-chat");

  return {
    mode: "local-deterministic",
    adapterId: "deterministic-customer-chat",
    messages: nextMessages,
    providerSummary: summarizeChatProviders(providers.map((provider) => provider.status)),
    redactions: sanitized.redactions,
    liveModelCallsEnabled: false,
    externalNetworkCalls: false,
    noNetworkProof: true,
    blockedProviderReasons: providers
      .filter((provider) => provider.status === "credential-gated")
      .slice(0, 4)
      .map((provider) => {
        const readiness = getProviderRuntimeReadiness(provider.id);
        return `${provider.label}: ${readiness.missingCredentials.join(", ") || "provider credentials required"}`;
      })
  };
}

export function validateCustomerChatSession(session: CustomerChatSession): string[] {
  const issues: string[] = [];

  if (session.adapterId !== "deterministic-customer-chat") {
    issues.push("Customer chat must use the deterministic local adapter until live model gates pass.");
  }
  if (session.mode !== "local-deterministic") {
    issues.push("Customer chat must stay in local deterministic mode for the free MVP.");
  }
  if (session.liveModelCallsEnabled) {
    issues.push("Customer chat must not enable live model calls.");
  }
  if (session.externalNetworkCalls) {
    issues.push("Customer chat must not make external network calls.");
  }
  if (!session.noNetworkProof) {
    issues.push("Customer chat must expose a no-network proof flag.");
  }
  if (session.providerSummary.readyLocal < 1) {
    issues.push("Customer chat must include at least one ready local provider.");
  }
  if (session.providerSummary.credentialGated < 1) {
    issues.push("Customer chat must preserve credential-gated provider visibility for admin review.");
  }
  if (!session.messages.some((message) => message.role === "assistant")) {
    issues.push("Customer chat must include an assistant response.");
  }
  if (session.messages.some((message) => /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(message.text))) {
    issues.push("Customer chat messages must redact email addresses.");
  }
  if (session.messages.some((message) => /\b(?:\d[ -]*?){13,16}\b/.test(message.text))) {
    issues.push("Customer chat messages must redact possible payment card numbers.");
  }

  return issues;
}

function summarizeChatProviders(statuses: ProviderStatus[]): CustomerChatProviderSummary {
  return {
    total: statuses.length,
    readyLocal: statuses.filter((status) => status === "ready-local").length,
    credentialGated: statuses.filter((status) => status === "credential-gated").length,
    contractOnly: statuses.filter((status) => status === "contract-only").length,
    blocked: statuses.filter((status) => status === "blocked").length,
    preferredLocalAdapterId: "deterministic-customer-chat",
    previewProviderIds: getAdaptersByCapability("text-chat")
      .filter((provider) => provider.status === "credential-gated")
      .slice(0, 4)
      .map((provider) => provider.id)
  };
}

function buildLocalAssistantReply(input: CustomerChatInput, sanitizedMessage: string): string {
  const normalized = sanitizedMessage.toLowerCase();
  const topics = [
    normalized.match(/\b(price|cheap|cost|pickup|ship|shipping|fulfillment|order|walgreens|cvs|fedex|walmart)\b/)
      ? `I can compare ${input.fulfillmentContext}, but live quotes and direct ordering stay off until certification passes.`
      : undefined,
    normalized.match(/\b(memory|private|personal|approved|use)\b/)
      ? `I will use only ${input.approvedMemoryNotes.length} approved memory note${input.approvedMemoryNotes.length === 1 ? "" : "s"} for ${input.recipientName}.`
      : undefined,
    normalized.match(/\b(image|art|picture|style|generate|ai)\b/)
      ? "Artwork remains template-backed locally; AI image providers are adapter-ready but credential-gated."
      : undefined
  ].filter((topic): topic is string => Boolean(topic));

  return [
    topics[0] ?? `I can help turn this into a card plan for ${input.recipientName}.`,
    topics[1] ?? "I will keep private data out of the draft unless it is explicitly approved memory.",
    topics[2] ?? "The next safe step is reviewing copy, artwork direction, and manual handoff before checkout.",
    "No live model call or external transcript storage was used."
  ].join(" ");
}
