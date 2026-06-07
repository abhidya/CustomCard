import { describe, expect, it } from "vitest";
import {
  buildCustomerChatSession,
  validateCustomerChatSession,
  type CustomerChatSession
} from "./customerChat";

const baseInput = {
  recipientName: "Sara and Ahmed",
  customerMessage:
    "Can you make the art botanical and pick the cheapest pickup? My email is sara@example.com and card 4111 1111 1111 1111 must not leak.",
  approvedMemoryNotes: ["They like botanical cards."],
  locale: "en-US",
  fulfillmentContext: "$1.42 Walmart pickup or $22.99 FedEx shipping"
};

describe("customer chat contract", () => {
  it("builds a sendable local chat session without live model calls", () => {
    const session = buildCustomerChatSession(baseInput);

    expect(validateCustomerChatSession(session)).toEqual([]);
    expect(session).toMatchObject({
      mode: "local-deterministic",
      adapterId: "deterministic-customer-chat",
      liveModelCallsEnabled: false,
      externalNetworkCalls: false,
      noNetworkProof: true
    });
    expect(session.providerSummary.readyLocal).toBeGreaterThanOrEqual(1);
    expect(session.providerSummary.credentialGated).toBeGreaterThanOrEqual(13);
    expect(session.providerSummary.previewProviderIds).toEqual(
      expect.arrayContaining(["openai-responses-chat", "azure-openai-chat", "aws-bedrock-converse-chat"])
    );
    expect(session.redactions).toEqual(expect.arrayContaining(["email", "possible-card-number"]));
    expect(session.messages.at(-2)).toMatchObject({
      role: "customer",
      text: expect.stringContaining("[redacted-email]")
    });
    expect(session.messages.at(-2)?.text).toContain("[redacted-payment]");
    expect(session.messages.at(-2)?.text).not.toContain("sara@example.com");
    expect(session.messages.at(-2)?.text).not.toContain("4111 1111 1111 1111");
    expect(session.messages.at(-1)).toMatchObject({
      role: "assistant",
      text: expect.stringContaining("This reply stayed local")
    });
    expect(session.messages.at(-1)?.text).toContain("generated images wait until you choose and review them");
    expect(session.blockedProviderReasons.join(" ")).toContain("OPENAI_API_KEY");
  });

  it("keeps a blank draft as the seeded transcript", () => {
    const session = buildCustomerChatSession({ ...baseInput, customerMessage: "" });

    expect(validateCustomerChatSession(session)).toEqual([]);
    expect(session.messages).toHaveLength(4);
    expect(session.messages[0]).toMatchObject({
      role: "customer",
      text: "I need a warm card for Sara and Ahmed, and I want pickup to stay manual."
    });
  });

  it("rejects unsafe chat completion claims", () => {
    const session = buildCustomerChatSession(baseInput);
    const unsafe: CustomerChatSession = {
      ...session,
      adapterId: "openai-responses-chat" as "deterministic-customer-chat",
      mode: "live-provider" as "local-deterministic",
      liveModelCallsEnabled: true as unknown as false,
      externalNetworkCalls: true as unknown as false,
      noNetworkProof: false as unknown as true,
      providerSummary: {
        ...session.providerSummary,
        readyLocal: 0,
        credentialGated: 0
      },
      messages: [
        { role: "customer", text: "I emailed sara@example.com and charged 4111 1111 1111 1111." }
      ]
    };

    expect(validateCustomerChatSession(unsafe)).toEqual(
      expect.arrayContaining([
        "Customer chat must use the deterministic local adapter until live model gates pass.",
        "Customer chat must stay in local deterministic mode for the free MVP.",
        "Customer chat must not enable live model calls.",
        "Customer chat must not make external network calls.",
        "Customer chat must expose a no-network proof flag.",
        "Customer chat must include at least one ready local provider.",
        "Customer chat must preserve credential-gated provider visibility for admin review.",
        "Customer chat must include an assistant response.",
        "Customer chat messages must redact email addresses.",
        "Customer chat messages must redact possible payment card numbers."
      ])
    );
  });
});
