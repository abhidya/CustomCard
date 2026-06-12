export type {
  FreeLegalToolCost,
  FreeLegalToolOption,
  LegalComplianceItem,
  LegalComplianceRegion,
  LegalComplianceStatus,
  LegalComplianceSummary,
  LegalDocumentLink,
  LegalPolicyLink,
  LegalPolicyLinkDefinition,
  LegalPolicyLinkId
} from "./legalComplianceData.mjs";

export {
  buildLegalPolicyLinks,
  freeLegalToolOptions,
  legalComplianceItems,
  legalDocumentLinks,
  legalDocumentPath,
  legalPolicyLinkDefinitions,
  summarizeLegalComplianceReadiness,
  validateLegalComplianceReadiness
} from "./legalComplianceData.mjs";
