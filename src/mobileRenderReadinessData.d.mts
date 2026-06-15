export type MobileRenderReadinessStatus = "repo-local-ready" | "evidence-missing" | "artifact-blocked";
export type MobileRenderReadinessLane =
  | "source-render-contract"
  | "customer-flow"
  | "print-proof"
  | "viewport-layout"
  | "rtl-review"
  | "native-profile"
  | "emulator-proof"
  | "signed-artifact";

export interface MobileRenderReadinessItem {
  id: string;
  label: string;
  lane: MobileRenderReadinessLane;
  status: MobileRenderReadinessStatus;
  screenSectionIds: string[];
  viewportProfiles: string[];
  nativeBuildProfileIds: string[];
  requiredSourceSignals: string[];
  deterministicProofBoundary: string;
  blockedLiveProofs: string[];
  evidenceArtifactRefs: string[];
  customerVisible: boolean;
  requiresEmulatorProof: boolean;
  requiresSignedArtifact: boolean;
  emulatorRenderProofAttached: false;
  nativeArtifactSigned: false;
  externalNetworkCalls: false;
  realOrdersEnabled: false;
  liveProviderCalls: false;
  currentEvidence: string[];
  requiredEvidence: string[];
  blocker: string;
}

export interface MobileRenderReadinessSummary {
  total: number;
  repoLocalReady: number;
  evidenceMissing: number;
  artifactBlocked: number;
  customerVisibleItems: number;
  screenSections: number;
  viewportProfiles: number;
  nativeBuildProfiles: number;
  sourceSignals: number;
  deterministicProofBoundaries: number;
  blockedLiveProofs: number;
  evidenceArtifacts: number;
  emulatorSmokeEvidenceArtifacts: number;
  emulatorRequired: number;
  signedArtifactRequired: number;
  emulatorRenderProofs: number;
  signedArtifacts: number;
  externalNetworkCalls: number;
  realOrdersEnabled: number;
  liveProviderCalls: number;
  requiredEvidence: string[];
  blockers: string[];
}

export const mobileRenderReadinessItems: MobileRenderReadinessItem[];
export function summarizeMobileRenderReadiness(items?: MobileRenderReadinessItem[]): MobileRenderReadinessSummary;
export function validateMobileRenderReadiness(items?: MobileRenderReadinessItem[]): string[];
