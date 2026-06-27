import { defineReadinessRegister } from "./readinessRegister.mjs";

export const requiredAccessibilityGateIds = [
  "keyboard-path",
  "labels-and-names",
  "contrast-token-review",
  "responsive-overflow-evidence",
  "screen-reader-landmarks",
  "reduced-motion-policy",
  "external-accessibility-audit"
] as const;

const allowedStatuses = new Set<AccessibilityReadinessStatus>([
  "repo-local-signal",
  "local-evidence-required",
  "external-audit-blocked"
]);

const unsafeAuditClaimPatterns = [
  /\bwcag\s*2(?:\.\d)?\s*(?:a{1,3})?\s*(?:certified|compliant|approved|passed)\b/i,
  /\b(?:external|live)\s+accessibility\s+audit\s+(?:complete|completed|passed|approved|attached)\b/i,
  /\baccessibility\s+(?:certified|certification|auditor\s+approved)\b/i,
  /\baudit\s+signoff\s+attached\b/i
];

export type AccessibilityGateId = (typeof requiredAccessibilityGateIds)[number];
export type AccessibilitySurface = "customer-web" | "admin-web";
export type AccessibilityEvidenceScope = "repo-local" | "external";
export type AccessibilityReadinessStatus =
  | "repo-local-signal"
  | "local-evidence-required"
  | "external-audit-blocked";
export type AccessibilityReadinessSummaryStatus =
  | "ready-for-external-audit-request"
  | "blocked-on-local-and-external-evidence"
  | "invalid-readiness-contract";

export interface AccessibilityReadinessGate {
  id: AccessibilityGateId;
  label: string;
  surfaces: AccessibilitySurface[];
  status: AccessibilityReadinessStatus;
  scope: AccessibilityEvidenceScope;
  currentEvidence: string[];
  requiredEvidence: string[];
  validationCommands: string[];
  blocksExternalClaim: boolean;
  blocksPublicLaunch: boolean;
  publicClaimAllowed: boolean;
  liveAuditClaimed: boolean;
  externalAuditRequired: boolean;
  auditArtifactRefs: string[];
  blocker?: string;
}

export interface AccessibilityReadinessSummary {
  total: number;
  repoLocalSignals: number;
  localEvidenceRequired: number;
  externalAuditBlocked: number;
  customerWebGates: number;
  adminWebGates: number;
  publicLaunchBlocked: number;
  externalAuditRequired: number;
  publicClaimsAllowed: number;
  liveAuditClaims: number;
  auditArtifactsAttached: number;
  requiredGateIds: AccessibilityGateId[];
  requiredEvidence: string[];
  validationCommands: string[];
  blockers: string[];
  validationIssues: string[];
  status: AccessibilityReadinessSummaryStatus;
}

export const accessibilityReadinessGates: AccessibilityReadinessGate[] = [
  {
    id: "keyboard-path",
    label: "Keyboard-only customer and admin path",
    surfaces: ["customer-web", "admin-web"],
    status: "repo-local-signal",
    scope: "repo-local",
    currentEvidence: [
      "App shell exposes a skip link target for main content.",
      "Chrome smoke tests exercise the local customer-to-admin workflow without horizontal overflow."
    ],
    requiredEvidence: [
      "Keyboard-only traversal transcript for customer workspace creation, import, card review, and handoff.",
      "Keyboard-only traversal transcript for admin readiness review and provider status controls.",
      "Focus order capture proving visible focus stays inside active dialogs, panels, and forms."
    ],
    validationCommands: [
      "npm run test -- tests/app-smoke.test.ts",
      "npm run security:doctor"
    ],
    blocksExternalClaim: true,
    blocksPublicLaunch: false,
    publicClaimAllowed: false,
    liveAuditClaimed: false,
    externalAuditRequired: false,
    auditArtifactRefs: []
  },
  {
    id: "labels-and-names",
    label: "Accessible labels and control names",
    surfaces: ["customer-web", "admin-web"],
    status: "repo-local-signal",
    scope: "repo-local",
    currentEvidence: [
      "Security baseline doctor checks app navigation and status aria labels.",
      "Chrome smoke tests locate the customer chat textarea through its aria-label."
    ],
    requiredEvidence: [
      "Complete accessible-name inventory for customer panel buttons, fields, tabs, and generated artifacts.",
      "Complete accessible-name inventory for admin readiness tables, filters, and action controls.",
      "Form error and status announcement review for customer and admin workflows."
    ],
    validationCommands: [
      "npm run test -- tests/app-smoke.test.ts",
      "npm run security:doctor"
    ],
    blocksExternalClaim: true,
    blocksPublicLaunch: false,
    publicClaimAllowed: false,
    liveAuditClaimed: false,
    externalAuditRequired: false,
    auditArtifactRefs: []
  },
  {
    id: "contrast-token-review",
    label: "Contrast token review",
    surfaces: ["customer-web", "admin-web"],
    status: "local-evidence-required",
    scope: "repo-local",
    currentEvidence: [
      "CSS color tokens and component color declarations exist in src/styles.css.",
      "No attached contrast-ratio matrix proves normal text, small text, icon, disabled, focus, and status-token states."
    ],
    requiredEvidence: [
      "Token-level contrast matrix for customer and admin foreground/background pairs.",
      "Manual review of status chips, disabled controls, focus rings, and warning/error states.",
      "Regression fixture that fails when a reviewed token pair drops below the accepted ratio."
    ],
    validationCommands: [
      "npm run accessibility:doctor"
    ],
    blocksExternalClaim: true,
    blocksPublicLaunch: true,
    publicClaimAllowed: false,
    liveAuditClaimed: false,
    externalAuditRequired: false,
    auditArtifactRefs: [],
    blocker: "No contrast-token ratio matrix or reviewer signoff is attached."
  },
  {
    id: "responsive-overflow-evidence",
    label: "Responsive overflow evidence",
    surfaces: ["customer-web", "admin-web"],
    status: "repo-local-signal",
    scope: "repo-local",
    currentEvidence: [
      "Chrome smoke tests check a 390px viewport for no horizontal document overflow.",
      "Chrome smoke tests expose customer and admin panels and assert viewport width stays bounded."
    ],
    requiredEvidence: [
      "Overflow screenshots or logs for customer and admin panels at phone, tablet, and desktop widths.",
      "RTL and long-content overflow review for localized customer and admin surfaces.",
      "Remediation notes for any clipped focus ring, table, or generated-card preview."
    ],
    validationCommands: [
      "npm run test -- tests/app-smoke.test.ts"
    ],
    blocksExternalClaim: true,
    blocksPublicLaunch: false,
    publicClaimAllowed: false,
    liveAuditClaimed: false,
    externalAuditRequired: false,
    auditArtifactRefs: []
  },
  {
    id: "screen-reader-landmarks",
    label: "Screen reader landmarks and page structure",
    surfaces: ["customer-web", "admin-web"],
    status: "repo-local-signal",
    scope: "repo-local",
    currentEvidence: [
      "Security baseline doctor checks skip-link, navigation label, main landmark, and safety status label signals.",
      "Application source includes a main content target shared by customer and admin views."
    ],
    requiredEvidence: [
      "Screen-reader landmark transcript for customer workspace, studio, handoff, and admin readiness views.",
      "Heading-order and region-name inventory for customer and admin panels.",
      "Assistive-technology notes covering dynamic status changes and generated artifact previews."
    ],
    validationCommands: [
      "npm run security:doctor"
    ],
    blocksExternalClaim: true,
    blocksPublicLaunch: false,
    publicClaimAllowed: false,
    liveAuditClaimed: false,
    externalAuditRequired: false,
    auditArtifactRefs: []
  },
  {
    id: "reduced-motion-policy",
    label: "Reduced motion policy",
    surfaces: ["customer-web", "admin-web"],
    status: "local-evidence-required",
    scope: "repo-local",
    currentEvidence: [
      "No committed reduced-motion policy, animation inventory, or prefers-reduced-motion fixture is attached."
    ],
    requiredEvidence: [
      "Animation and transition inventory for customer and admin web surfaces.",
      "prefers-reduced-motion policy covering generated-card previews, loading states, navigation, and status changes.",
      "Regression check proving motion-heavy effects are disabled or shortened when reduced motion is requested."
    ],
    validationCommands: [
      "npm run accessibility:doctor"
    ],
    blocksExternalClaim: true,
    blocksPublicLaunch: true,
    publicClaimAllowed: false,
    liveAuditClaimed: false,
    externalAuditRequired: false,
    auditArtifactRefs: [],
    blocker: "No reduced-motion policy or prefers-reduced-motion regression evidence is attached."
  },
  {
    id: "external-accessibility-audit",
    label: "External accessibility audit gate",
    surfaces: ["customer-web", "admin-web"],
    status: "external-audit-blocked",
    scope: "external",
    currentEvidence: [
      "External audit readiness register already tracks accessibility audit as internal-baseline-only.",
      "This lane only records local readiness evidence and does not attach external audit artifacts."
    ],
    requiredEvidence: [
      "External WCAG audit report covering customer and admin web flows.",
      "Assistive-technology test notes from the external reviewer.",
      "Remediation log and retest signoff for all launch-blocking findings."
    ],
    validationCommands: [
      "npm run external:audit:doctor",
      "npm run accessibility:doctor"
    ],
    blocksExternalClaim: true,
    blocksPublicLaunch: true,
    publicClaimAllowed: false,
    liveAuditClaimed: false,
    externalAuditRequired: true,
    auditArtifactRefs: [],
    blocker: "No live external accessibility audit report, assistive-technology notes, or remediation signoff is attached."
  }
];

const accessibilityReadinessRegister = defineReadinessRegister<AccessibilityReadinessGate>({
  domainLabel: "accessibility",
  items: accessibilityReadinessGates,
  requiredIds: [...requiredAccessibilityGateIds],
  duplicateMessage: (id) => `Duplicate accessibility readiness gate: ${id}.`,
  missingMessage: (id) => `Missing accessibility readiness gate: ${id}.`,
  itemRules(gate) {
    const issues: string[] = [];
    if (!allowedStatuses.has(gate.status)) {
      issues.push(`Accessibility readiness gate ${gate.id} has unsupported status.`);
    }
    if (!gate.surfaces.includes("customer-web") || !gate.surfaces.includes("admin-web")) {
      issues.push(`Accessibility readiness gate ${gate.id} must cover customer and admin web surfaces.`);
    }
    if (gate.requiredEvidence.length < 2) {
      issues.push(`Accessibility readiness gate ${gate.id} must list at least two required evidence items.`);
    }
    if (gate.validationCommands.length < 1) {
      issues.push(`Accessibility readiness gate ${gate.id} must list at least one validation command.`);
    }
    if (gate.status === "repo-local-signal" && gate.currentEvidence.length < 1) {
      issues.push(`Accessibility readiness gate ${gate.id} must list current repo-local evidence.`);
    }
    if (gate.status !== "repo-local-signal" && !gate.blocker) {
      issues.push(`Accessibility readiness gate ${gate.id} must explain the missing readiness evidence.`);
    }
    if (gate.publicClaimAllowed !== false) {
      issues.push(`Accessibility readiness gate ${gate.id} must keep publicClaimAllowed=false until external audit evidence is attached.`);
    }
    if (gate.liveAuditClaimed !== false) {
      issues.push(`Accessibility readiness gate ${gate.id} must keep liveAuditClaimed=false.`);
    }
    if (gate.auditArtifactRefs.length > 0) {
      issues.push(`Accessibility readiness gate ${gate.id} must not claim attached external audit artifacts.`);
    }
    if (gate.blocksExternalClaim !== true) {
      issues.push(`Accessibility readiness gate ${gate.id} must keep blocksExternalClaim=true.`);
    }
    if (gate.status === "local-evidence-required" && gate.blocksPublicLaunch !== true) {
      issues.push(`Accessibility readiness gate ${gate.id} must block public launch until local evidence is attached.`);
    }
    if (gate.status === "external-audit-blocked") {
      if (gate.scope !== "external") {
        issues.push(`Accessibility readiness gate ${gate.id} must use external scope.`);
      }
      if (gate.externalAuditRequired !== true || gate.blocksPublicLaunch !== true) {
        issues.push(`Accessibility readiness gate ${gate.id} must require the blocked external audit before public launch.`);
      }
    }
    if (containsUnsafeAuditClaim(gate)) {
      issues.push(`Accessibility readiness gate ${gate.id} contains unsafe live-audit or certification claim language.`);
    }
    return issues;
  },
  summarize(gates) {
    return {
      repoLocalSignals: gates.filter((gate) => gate.status === "repo-local-signal").length,
      localEvidenceRequired: gates.filter((gate) => gate.status === "local-evidence-required").length,
      externalAuditBlocked: gates.filter((gate) => gate.status === "external-audit-blocked").length,
      customerWebGates: gates.filter((gate) => gate.surfaces.includes("customer-web")).length,
      adminWebGates: gates.filter((gate) => gate.surfaces.includes("admin-web")).length,
      publicLaunchBlocked: gates.filter((gate) => gate.blocksPublicLaunch).length,
      externalAuditRequired: gates.filter((gate) => gate.externalAuditRequired).length,
      publicClaimsAllowed: gates.filter((gate) => gate.publicClaimAllowed).length,
      liveAuditClaims: gates.filter((gate) => gate.liveAuditClaimed).length,
      auditArtifactsAttached: gates.reduce((total, gate) => total + gate.auditArtifactRefs.length, 0),
      requiredGateIds: [...requiredAccessibilityGateIds],
      requiredEvidence: Array.from(new Set(gates.flatMap((gate) => gate.requiredEvidence))).sort(),
      validationCommands: Array.from(new Set(gates.flatMap((gate) => gate.validationCommands))).sort()
    };
  }
});

export function summarizeAccessibilityReadiness(
  gates: AccessibilityReadinessGate[] = accessibilityReadinessGates
): AccessibilityReadinessSummary {
  type AccessibilityRegisterSummary = Omit<
    AccessibilityReadinessSummary,
    "blockers" | "validationIssues" | "status"
  > & { registerIssues: string[] };
  const registerSummary = accessibilityReadinessRegister.summarize(gates) as unknown as AccessibilityRegisterSummary;

  return {
    ...registerSummary,
    blockers: gates.flatMap((gate) => (gate.blocker ? [gate.blocker] : [])),
    validationIssues: registerSummary.registerIssues,
    status:
      registerSummary.registerIssues.length > 0
        ? "invalid-readiness-contract"
        : registerSummary.localEvidenceRequired > 0 || registerSummary.externalAuditBlocked > 0
          ? "blocked-on-local-and-external-evidence"
          : "ready-for-external-audit-request"
  };
}

export function validateAccessibilityReadiness(
  gates: AccessibilityReadinessGate[] = accessibilityReadinessGates
): string[] {
  return accessibilityReadinessRegister.validate(gates);
}

function containsUnsafeAuditClaim(gate: AccessibilityReadinessGate): boolean {
  const searchableText = [
    gate.label,
    gate.blocker ?? "",
    ...gate.currentEvidence,
    ...gate.auditArtifactRefs
  ].join("\n");

  return unsafeAuditClaimPatterns.some((pattern) => pattern.test(searchableText));
}
