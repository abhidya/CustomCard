export type LegalComplianceRegion = "eu" | "us";
export type LegalComplianceStatus = "repo-local-ready" | "free-tool-required" | "external-review-required";
export type FreeLegalToolCost = "free" | "free-tier" | "open-source";
export type LegalPolicyLinkId = "terms" | "privacy" | "cookies" | "refunds" | "ai-disclosure" | "privacy-choices";
export interface FreeLegalToolOption {
    id: string;
    label: string;
    url: string;
    cost: FreeLegalToolCost;
    covers: string[];
    useBoundary: string;
}
export interface LegalComplianceItem {
    id: string;
    label: string;
    region: LegalComplianceRegion;
    category: "privacy" | "consent" | "ai" | "commerce" | "children" | "marketing" | "payments";
    status: LegalComplianceStatus;
    freeToolIds: string[];
    currentEvidence: string[];
    requiredEvidence: string[];
    externalReviewRequired: boolean;
    publicClaimAllowed: false;
    blocksLaunch: boolean;
    blocker: string;
}
export interface LegalComplianceSummary {
    total: number;
    euRequirements: number;
    usRequirements: number;
    repoLocalReady: number;
    freeToolRequired: number;
    externalReviewRequired: number;
    freeToolOptions: number;
    openSourceToolOptions: number;
    policyGeneratorOptions: number;
    launchBlocked: number;
    publicClaimsAllowed: number;
    requiredEvidence: string[];
    blockers: string[];
}
export interface LegalPolicyLinkDefinition {
    id: LegalPolicyLinkId;
    label: string;
    envVar: string;
    fallbackToolId: string;
}
export interface LegalPolicyLink extends LegalPolicyLinkDefinition {
    configured: boolean;
    url: string;
    fallbackLabel: string;
}
export interface LegalDocumentLink {
    id: LegalPolicyLinkId;
    label: string;
    path: string;
    sourceToolLabel: string;
    sourceToolUrl: string;
    reviewRequired: true;
}
export declare const freeLegalToolOptions: FreeLegalToolOption[];
export declare const legalPolicyLinkDefinitions: LegalPolicyLinkDefinition[];
export declare const legalDocumentPath = "/legal/docs.html";
export declare const legalDocumentLinks: LegalDocumentLink[];
export declare const legalComplianceItems: LegalComplianceItem[];
export declare function summarizeLegalComplianceReadiness(items?: LegalComplianceItem[]): LegalComplianceSummary;
export declare function validateLegalComplianceReadiness(items?: LegalComplianceItem[]): string[];
export declare function buildLegalPolicyLinks(env?: Record<string, unknown>): LegalPolicyLink[];
