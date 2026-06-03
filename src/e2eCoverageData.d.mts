export type E2eCoverageSurface =
  | "web-customer"
  | "web-admin"
  | "adapters"
  | "api"
  | "identity"
  | "mobile"
  | "infra"
  | "governance";
export type E2eAutomationType = "browser-smoke" | "contract-test" | "doctor" | "ci-workflow";
export type E2eCoverageStatus = "covered";

export interface E2eCoverageItem {
  id: string;
  label: string;
  surface: E2eCoverageSurface;
  automationType: E2eAutomationType;
  status: E2eCoverageStatus;
  ciGated: true;
  testCommands: string[];
  evidence: string[];
  liveProductionProof: false;
  realOrdersEnabled: false;
  externalNetworkCalls: false;
}

export interface E2eCoverageSummary {
  total: number;
  covered: number;
  repoLocalCoveragePercent: number;
  browserSmokeCovered: number;
  contractTestCovered: number;
  doctorCovered: number;
  ciGated: number;
  surfaces: E2eCoverageSurface[];
  liveProductionProofs: number;
  realOrdersEnabled: number;
  externalNetworkCalls: number;
  requiredCommandCount: number;
  blockers: string[];
}

export const e2eCoverageItems: E2eCoverageItem[];
export function summarizeE2eCoverage(items?: E2eCoverageItem[]): E2eCoverageSummary;
export function validateE2eCoverage(items?: E2eCoverageItem[]): string[];
