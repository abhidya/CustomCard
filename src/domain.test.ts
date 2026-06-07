import { describe, expect, it } from "vitest";
import { agentNames } from "./agentContracts";
import {
  adapterBlocksRealOrders,
  agents,
  architectureProfiles,
  buildMilestones,
  computeBlueprintCoverage,
  getBlockingGates,
  getRunMode,
  runOperationalExtraction,
  storyboards,
  type PrintAdapterContract,
  walgreensAdapter
} from "./domain";

describe("CustomCard blueprint domain", () => {
  it("covers every required storyboard chapter from the pasted brief", () => {
    expect(computeBlueprintCoverage()).toBe(100);
    expect(storyboards.length).toBeGreaterThanOrEqual(12);
    expect(storyboards.some((story) => story.id === "walgreens-adapter")).toBe(true);
  });

  it("keeps real Walgreens ordering disabled until certification gates exist", () => {
    expect(walgreensAdapter.name).toBe("WalgreensFiveBySevenDoubleSidedCardAdapter");
    expect(walgreensAdapter.targetPixels).toEqual({ width: 1500, height: 2100, dpi: 300 });
    expect(adapterBlocksRealOrders(walgreensAdapter)).toBe(true);
  });

  it("rejects adapters that look disabled but are missing hard ordering gates", () => {
    const unsafeAdapter = {
      ...walgreensAdapter,
      realOrdersEnabled: true
    } as unknown as PrintAdapterContract;
    const missingPhysicalGate = {
      ...walgreensAdapter,
      requiredCertificationGateIds: walgreensAdapter.requiredCertificationGateIds.filter(
        (gateId) => gateId !== "physical-two-store-print"
      )
    };
    const vaguePolicy = {
      ...walgreensAdapter,
      realOrderPolicy: "Disabled by default."
    };
    const missingLiveQuote = {
      ...walgreensAdapter,
      liveQuoteRequired: false
    } as unknown as PrintAdapterContract;
    const missingApproval = {
      ...walgreensAdapter,
      explicitApprovalRequired: false
    } as unknown as PrintAdapterContract;

    expect(adapterBlocksRealOrders(unsafeAdapter)).toBe(false);
    expect(adapterBlocksRealOrders(missingPhysicalGate)).toBe(false);
    expect(adapterBlocksRealOrders(vaguePolicy)).toBe(false);
    expect(adapterBlocksRealOrders(missingLiveQuote)).toBe(false);
    expect(adapterBlocksRealOrders(missingApproval)).toBe(false);
  });

  it("runs source extraction into facts, storyboard matches, and a local proof print manifest", () => {
    const weddingRun = runOperationalExtraction(
      "Sara and Ahmed have a wedding tomorrow. Use Walgreens pickup, 5x7, 1500x2100, 300 DPI, and consider regional privacy."
    );
    const genericRun = runOperationalExtraction("Please make something nice.");

    expect(weddingRun.id).not.toBe(genericRun.id);
    expect(weddingRun.facts.map((fact) => fact.id)).toEqual(
      expect.arrayContaining(["event-type", "people", "vendor", "print-spec", "trust"])
    );
    expect(weddingRun.matchedStoryboardIds).toEqual(
      expect.arrayContaining(["origin-cvs-wedding", "deterministic-renderer", "walgreens-adapter"])
    );
    expect(genericRun.matchedStoryboardIds).toEqual([]);
    expect(weddingRun.printPacket.valid).toBe(true);
    expect(weddingRun.printPacket.kind).toBe("local_proof_manifest");
    expect(weddingRun.handoff).toMatchObject({ mode: "local_proof_packet", canPlaceRealOrder: false });
    expect(weddingRun.printPacket.assets).toHaveLength(walgreensAdapter.panels.length);
    for (const asset of weddingRun.printPacket.assets) {
      expect(asset).toMatchObject({ width: 1500, height: 2100, dpi: 300, localProofSafeZonePassed: true });
      expect(asset.localProofChecksum).toMatch(/^[0-9a-f]{8}$/);
      expect(asset.svg).toContain('width="1500"');
      expect(asset.svg).toContain('height="2100"');
    }
  });

  it("blocks weak extraction from creating a fake successful print packet", () => {
    const genericRun = runOperationalExtraction("Please make something nice.");
    const emptyRun = runOperationalExtraction("");

    for (const run of [genericRun, emptyRun]) {
      expect(run.printPacket).toMatchObject({
        kind: "blocked",
        assets: [],
        valid: false,
        missingFactIds: ["people", "print-spec"]
      });
      expect(run.handoff).toMatchObject({
        mode: "blocked",
        canPlaceRealOrder: false,
        nextGate: "source-extraction-required"
      });
      expect(run.handoff.reason).toContain("Cannot create a local proof packet");
      expect(run.memoryProposal.text).toContain("blocked");
    }
  });

  it("keeps the visible agent pipeline aligned with typed agent envelopes", () => {
    expect(agents.map((agent) => agent.id)).toEqual(agentNames);
  });

  it("documents the small droplet and SaaS architecture modes", () => {
    const modes = architectureProfiles.map((profile) => profile.id);

    expect(modes).toContain("five-dollar-droplet");
    expect(modes).toContain("saas-scale");
    expect(getRunMode("five-dollar-droplet").stack.length).toBeGreaterThan(2);
  });

  it("requires every milestone to have implementation evidence and an exit gate", () => {
    for (const milestone of buildMilestones) {
      expect(milestone.deliverables.length).toBeGreaterThan(0);
      expect(milestone.testEvidence.length).toBeGreaterThan(0);
      expect(milestone.exitGate.length).toBeGreaterThan(20);
    }
  });

  it("surfaces physical print certification as a blocking gate", () => {
    const blocking = getBlockingGates();

    expect(blocking.map((gate) => gate.id)).toContain("physical-print");
  });
});
