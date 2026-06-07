import type {
  PrintAdapterContract,
  Storyboard,
  GateStatus
} from "./domain";

export type AgentStatus = "ok" | "needs_review" | "blocked" | "failed";

export type AgentName =
  | "source_extraction"
  | "event_understanding"
  | "relationship_memory"
  | "adaptive_interview"
  | "card_copy"
  | "print_renderer"
  | "fulfillment_adapter"
  | "quality_gate";

export const agentNames: AgentName[] = [
  "source_extraction",
  "event_understanding",
  "relationship_memory",
  "adaptive_interview",
  "card_copy",
  "print_renderer",
  "quality_gate",
  "fulfillment_adapter"
];

export interface AgentPolicy {
  allowExternalSharing: false;
  requireHumanApproval: true;
  untrustedContentIsSandboxed: true;
  realOrdersEnabled: false;
}

export interface AgentEnvelope<TInput> {
  schemaVersion: "cc.v2";
  taskId: string;
  agent: AgentName;
  input: TInput;
  policy: AgentPolicy;
}

export interface AgentFinding {
  code: string;
  status: GateStatus;
  message: string;
  evidenceIds: string[];
}

export interface AgentResult<TOutput> {
  status: AgentStatus;
  output?: TOutput;
  findings: AgentFinding[];
}

export interface SourceExtractionInput {
  rawText: string;
  sourceKind: "paste" | "gmail" | "calendar" | "manual";
}

export interface SourceExtractionOutput {
  storyboards: Storyboard[];
  extractedFacts: Array<{
    id: string;
    text: string;
    confidence: number;
    sourceSpan?: [number, number];
  }>;
}

export interface PrintRendererInput {
  panels: Array<{
    role: "front" | "inside_left" | "inside_right" | "back";
    copy: string;
    backgroundAssetId?: string;
  }>;
  adapter: Pick<PrintAdapterContract, "targetPixels" | "panels" | "invariants">;
}

export interface PrintRendererOutput {
  assetManifest: Array<{
    panel: string;
    width: 1500;
    height: 2100;
    dpi: 300;
    sha256: string;
  }>;
}

export interface FulfillmentAdapterInput {
  adapter: PrintAdapterContract;
  assetManifest: PrintRendererOutput["assetManifest"];
  userApprovedExternalShare: boolean;
}

export interface FulfillmentAdapterOutput {
  mode: "contractReview" | "vendorDryRun" | "certifiedLive";
  canPlaceRealOrder: false;
  requiredNextGate: string;
}

export const defaultAgentPolicy: AgentPolicy = {
  allowExternalSharing: false,
  requireHumanApproval: true,
  untrustedContentIsSandboxed: true,
  realOrdersEnabled: false
};
