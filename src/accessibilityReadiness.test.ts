import { describe, expect, it } from "vitest";
import {
  accessibilityReadinessGates,
  requiredAccessibilityGateIds,
  summarizeAccessibilityReadiness,
  validateAccessibilityReadiness,
  type AccessibilityReadinessGate
} from "./accessibilityReadiness";

describe("accessibility readiness", () => {
  it("validates the local readiness summary without claiming a live external audit", () => {
    const summary = summarizeAccessibilityReadiness();

    expect(validateAccessibilityReadiness()).toEqual([]);
    expect(summary).toMatchObject({
      total: 7,
      repoLocalSignals: 4,
      localEvidenceRequired: 2,
      externalAuditBlocked: 1,
      customerWebGates: 7,
      adminWebGates: 7,
      publicLaunchBlocked: 3,
      externalAuditRequired: 1,
      publicClaimsAllowed: 0,
      liveAuditClaims: 0,
      auditArtifactsAttached: 0,
      status: "blocked-on-local-and-external-evidence"
    });
    expect(summary.requiredGateIds).toEqual([...requiredAccessibilityGateIds]);
    expect(summary.requiredEvidence).toEqual(
      expect.arrayContaining([
        "Keyboard-only traversal transcript for customer workspace creation, import, card review, and handoff.",
        "Token-level contrast matrix for customer and admin foreground/background pairs.",
        "Screen-reader landmark transcript for customer workspace, studio, handoff, and admin readiness views.",
        "prefers-reduced-motion policy covering generated-card previews, loading states, navigation, and status changes.",
        "External WCAG audit report covering customer and admin web flows."
      ])
    );
    expect(summary.validationCommands).toEqual(
      expect.arrayContaining([
        "npm run accessibility:doctor",
        "npm run external:audit:doctor",
        "npm run security:doctor",
        "npm run test -- tests/app-smoke.test.ts"
      ])
    );
    expect(summary.blockers).toEqual(
      expect.arrayContaining([
        "No contrast-token ratio matrix or reviewer signoff is attached.",
        "No reduced-motion policy or prefers-reduced-motion regression evidence is attached.",
        "No live external accessibility audit report, assistive-technology notes, or remediation signoff is attached."
      ])
    );
  });

  it("keeps every gate scoped to customer and admin web with no public audit claims", () => {
    for (const gate of accessibilityReadinessGates) {
      expect(gate.surfaces).toEqual(expect.arrayContaining(["customer-web", "admin-web"]));
      expect(gate.publicClaimAllowed).toBe(false);
      expect(gate.liveAuditClaimed).toBe(false);
      expect(gate.blocksExternalClaim).toBe(true);
      expect(gate.auditArtifactRefs).toEqual([]);
      expect(gate.requiredEvidence.length).toBeGreaterThanOrEqual(2);
      expect(gate.validationCommands.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("fails unsafe live audit claims and missing required gates", () => {
    const unsafeGate: AccessibilityReadinessGate = {
      ...accessibilityReadinessGates[0],
      label: "WCAG 2.2 AA compliant keyboard path",
      surfaces: ["customer-web"],
      currentEvidence: ["Live accessibility audit passed for the keyboard path."],
      requiredEvidence: ["Keyboard transcript"],
      blocksExternalClaim: false,
      publicClaimAllowed: true,
      liveAuditClaimed: true,
      auditArtifactRefs: ["docs/audits/fake-wcag-report.pdf"]
    };

    const issues = validateAccessibilityReadiness([unsafeGate, accessibilityReadinessGates[0]]);

    expect(issues).toEqual(
      expect.arrayContaining([
        "Duplicate accessibility readiness gate: keyboard-path.",
        "Accessibility readiness gate keyboard-path must cover customer and admin web surfaces.",
        "Accessibility readiness gate keyboard-path must list at least two required evidence items.",
        "Accessibility readiness gate keyboard-path must keep publicClaimAllowed=false until external audit evidence is attached.",
        "Accessibility readiness gate keyboard-path must keep liveAuditClaimed=false.",
        "Accessibility readiness gate keyboard-path must not claim attached external audit artifacts.",
        "Accessibility readiness gate keyboard-path must keep blocksExternalClaim=true.",
        "Accessibility readiness gate keyboard-path contains unsafe live-audit or certification claim language.",
        "Missing accessibility readiness gate: reduced-motion-policy.",
        "Missing accessibility readiness gate: external-accessibility-audit."
      ])
    );
  });
});
