import { describe, expect, it } from "vitest";
import { agents } from "./domain";
import { agentNames, defaultAgentPolicy, type AgentEnvelope, type PrintRendererInput } from "./agentContracts";

describe("agent orchestration contracts", () => {
  it("keeps the typed agent names aligned with the visible domain pipeline", () => {
    expect(agentNames).toEqual([
      "source_extraction",
      "event_understanding",
      "relationship_memory",
      "adaptive_interview",
      "card_copy",
      "print_renderer",
      "quality_gate",
      "fulfillment_adapter"
    ]);
    expect(agents.map((agent) => agent.id)).toEqual(agentNames);
  });

  it("defaults every agent envelope to fail-closed external sharing and ordering", () => {
    expect(defaultAgentPolicy).toEqual({
      allowExternalSharing: false,
      requireHumanApproval: true,
      untrustedContentIsSandboxed: true,
      realOrdersEnabled: false
    });
  });

  it("can wrap print-render work in a versioned approval envelope", () => {
    const envelope: AgentEnvelope<PrintRendererInput> = {
      schemaVersion: "cc.v2",
      taskId: "render-front-panel",
      agent: "print_renderer",
      input: {
        panels: [
          {
            role: "front",
            copy: "Warm anniversary cover"
          }
        ],
        adapter: {
          targetPixels: { width: 1500, height: 2100, dpi: 300 },
          panels: ["front", "inside_left", "inside_right", "back"],
          invariants: ["1500x2100", "300dpi", "safe-zone"]
        }
      },
      policy: defaultAgentPolicy
    };

    expect(envelope.schemaVersion).toBe("cc.v2");
    expect(envelope.agent).toBe("print_renderer");
    expect(envelope.input.adapter.targetPixels).toEqual({ width: 1500, height: 2100, dpi: 300 });
    expect(envelope.policy.realOrdersEnabled).toBe(false);
  });
});
