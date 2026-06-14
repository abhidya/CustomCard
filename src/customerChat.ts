import {
  buildCustomerChatTranscript,
  getAdaptersByCapability,
  type ChatMessage,
  type ProviderStatus
} from "./providerCatalog";
import { sanitizeText } from "./providerRuntime";

export type CustomerChatMode = "local-scripted";

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
  adapterId: "local-scripted-customer-chat";
  messages: ChatMessage[];
  providerSummary: CustomerChatProviderSummary;
  redactions: string[];
  liveModelCallsEnabled: false;
  externalNetworkCalls: false;
  noNetworkProof: true;
  blockedProviderReasons: string[];
}

export type CustomerChatFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface CustomerChatSendInput extends CustomerChatInput {
  existingMessages?: ChatMessage[];
}

export interface CustomerChatSendOptions {
  fetchImpl?: CustomerChatFetch;
  route?: string;
  idempotencyKey?: string;
}

export interface CustomerChatSendResult {
  messages: ChatMessage[];
  session: CustomerChatSession;
  usedFallback: boolean;
  assistantMessage?: string;
  errorMessage?: string;
}

export async function sendCustomerChatMessage(
  input: CustomerChatSendInput,
  options: CustomerChatSendOptions = {}
): Promise<CustomerChatSendResult> {
  const customerMessage = input.customerMessage.trim();
  const existingMessages = input.existingMessages ?? [];
  if (!customerMessage) {
    const session = buildCustomerChatSession({ ...input, customerMessage: "" }, existingMessages);
    return { messages: session.messages, session, usedFallback: false };
  }

  const sanitized = sanitizeText(customerMessage);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch?.bind(globalThis);

  try {
    if (!fetchImpl) throw new Error("Customer chat route fetch is unavailable.");
    const response = await fetchImpl(options.route ?? "/api/ai/chat/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.idempotencyKey ? { "X-Idempotency-Key": options.idempotencyKey } : {})
      },
      body: JSON.stringify({
        customer_message: customerMessage,
        recipient_name: input.recipientName,
        approved_memory_notes: input.approvedMemoryNotes,
        locale: input.locale,
        fulfillment_context: input.fulfillmentContext
      })
    });
    if (!response.ok) throw new Error(`Customer chat route returned ${response.status}.`);

    const result = (await response.json()) as { assistant_message?: unknown };
    const assistantText = typeof result.assistant_message === "string" ? result.assistant_message.trim() : "";
    if (!assistantText) throw new Error("Customer chat route returned an empty response.");

    const messages: ChatMessage[] = [
      ...existingMessages,
      { role: "customer", text: sanitized.text },
      { role: "assistant", text: assistantText }
    ];
    const session = {
      ...buildCustomerChatSession({ ...input, customerMessage: "" }, messages),
      redactions: sanitized.redactions
    };

    return { messages, session, usedFallback: false, assistantMessage: assistantText };
  } catch (error) {
    const session = buildCustomerChatSession({ ...input, customerMessage }, existingMessages);
    return {
      messages: session.messages,
      session,
      usedFallback: true,
      errorMessage: error instanceof Error ? error.message : "Customer chat route failed."
    };
  }
}

export function buildCustomerChatSession(
  input: CustomerChatInput,
  existingMessages?: ChatMessage[]
): CustomerChatSession {
  const sanitized = sanitizeText(input.customerMessage);
  const baseMessages = existingMessages ?? buildCustomerChatTranscript(input.recipientName);
  const nextMessages: ChatMessage[] = sanitized.text
    ? [
        ...baseMessages,
        { role: "customer" as const, text: sanitized.text },
        { role: "assistant" as const, text: buildLocalAssistantReply(input, sanitized.text) }
      ]
    : baseMessages;
  const providers = getAdaptersByCapability("text-chat");

  return {
    mode: "local-scripted",
    adapterId: "local-scripted-customer-chat",
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
        return `${provider.label}: ${provider.credentials.join(", ") || "provider credentials required"}`;
      })
  };
}

export function validateCustomerChatSession(session: CustomerChatSession): string[] {
  const issues: string[] = [];

  if (session.adapterId !== "local-scripted-customer-chat") {
    issues.push("Customer chat must use the local scripted session until live model gates pass.");
  }
  if (session.mode !== "local-scripted") {
    issues.push("Customer chat must stay in local scripted mode for the free MVP.");
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
    preferredLocalAdapterId: "",
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
      ? `I can compare ${input.fulfillmentContext}, then help you confirm the final price and pickup before checkout.`
      : undefined,
    normalized.match(/\b(memory|private|personal|approved|use)\b/)
      ? `I will use only ${input.approvedMemoryNotes.length} approved memory note${input.approvedMemoryNotes.length === 1 ? "" : "s"} for ${input.recipientName}.`
      : undefined,
    normalized.match(/\b(image|art|picture|style|generate|ai)\b/)
      ? "Artwork stays template-backed here; generated images wait until you choose and review them."
      : undefined
  ].filter((topic): topic is string => Boolean(topic));

  return [
    topics[0] ?? `I can help turn this into a card plan for ${input.recipientName}.`,
    topics[1] ?? "I'll only use the details you've chosen to share.",
    topics[2] ?? "When the words and artwork feel right, head to print options."
  ].join(" ");
}
