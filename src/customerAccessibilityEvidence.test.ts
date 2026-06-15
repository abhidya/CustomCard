import { describe, expect, it } from "vitest";
import {
  customerAccessibilityEvidenceItems,
  summarizeCustomerAccessibilityEvidence,
  validateCustomerAccessibilityEvidence,
  type CustomerAccessibilityEvidenceItem
} from "./customerAccessibilityEvidence";

describe("customer accessibility evidence", () => {
  it("tracks repo-local customer accessibility proof without claiming external audit evidence", () => {
    const summary = summarizeCustomerAccessibilityEvidence();

    expect(validateCustomerAccessibilityEvidence()).toEqual([]);
    expect(summary).toMatchObject({
      total: 6,
      repoLocalReady: 5,
      externalEvidenceMissing: 1,
      customerVisibleItems: 5,
      externalAuditRequired: 6,
      externalAuditAttached: 0,
      manualScreenReaderProofAttached: 0,
      externalNetworkCalls: 0,
      realOrdersEnabled: 0,
      liveProviderCalls: 0,
      blockers: []
    });
    expect(summary.sourceSignals).toEqual(
      expect.arrayContaining([
        "href=\"#main-content\"",
        "aria-label=\"CustomCard navigation\"",
        "aria-label=\"Customer chat message\"",
        "Customer web experience must expose exactly one primary action.",
        "aria-label=\"CustomCard native customer shell\""
      ])
    );
    expect(summary.requiredEvidence).toEqual(
      expect.arrayContaining([
        "External WCAG audit report",
        "Screen-reader landmark transcript",
        "Keyboard tab-order capture",
        "Native emulator accessibility tree",
        "Assistive technology test notes",
        "Remediation signoff"
      ])
    );
  });

  it("keeps customer and mobile accessibility signals explicit at the Module Interface", () => {
    const shell = customerAccessibilityEvidenceItems.find((item) => item.id === "customer-shell-landmarks");
    const forms = customerAccessibilityEvidenceItems.find((item) => item.id === "customer-form-labels");
    const actions = customerAccessibilityEvidenceItems.find((item) => item.id === "customer-action-focus-order");
    const mobile = customerAccessibilityEvidenceItems.find((item) => item.id === "mobile-preview-semantics");
    const external = customerAccessibilityEvidenceItems.find((item) => item.id === "external-assistive-technology-audit");

    expect(shell).toMatchObject({
      lane: "landmarks",
      status: "repo-local-ready",
      customerVisible: true,
      externalAuditAttached: false
    });
    expect(shell?.sourceSignals).toEqual(expect.arrayContaining(["className=\"skipLink\"", "<main id=\"main-content\">"]));
    expect(forms?.sourceSignals).toEqual(expect.arrayContaining(["aria-label=\"Customer chat message\"", "input[placeholder], textarea[placeholder]"]));
    expect(actions?.currentEvidence).toEqual(expect.arrayContaining(["customerWebExperience validation", "proof-first print-flow tests"]));
    expect(mobile?.sourceSignals).toEqual(
      expect.arrayContaining(["aria-label=\"CustomCard native customer shell\"", "aria-label=\"Mobile checkout safeguards\""])
    );
    expect(external).toMatchObject({
      status: "external-evidence-missing",
      customerVisible: false,
      externalAuditRequired: true,
      externalAuditAttached: false
    });
  });

  it("flags unsafe accessibility claims before doctors or admin surfaces expose them", () => {
    const unsafeItems: CustomerAccessibilityEvidenceItem[] = [
      {
        ...customerAccessibilityEvidenceItems[0],
        externalAuditAttached: true,
        manualScreenReaderProofAttached: true,
        externalNetworkCalls: true,
        realOrdersEnabled: true,
        liveProviderCalls: true,
        sourceSignals: ["one"],
        currentEvidence: [],
        requiredEvidence: ["one"],
        blocker: ""
      } as unknown as CustomerAccessibilityEvidenceItem,
      {
        ...customerAccessibilityEvidenceItems[0]
      }
    ];

    expect(validateCustomerAccessibilityEvidence(unsafeItems)).toEqual(
      expect.arrayContaining([
        "Duplicate customer accessibility evidence item: customer-shell-landmarks.",
        "Customer accessibility evidence item customer-shell-landmarks must list at least three source signals.",
        "Customer accessibility evidence item customer-shell-landmarks must list repo-local evidence.",
        "Customer accessibility evidence item customer-shell-landmarks must list at least two required evidence items.",
        "Customer accessibility evidence item customer-shell-landmarks must explain its blocker.",
        "Customer accessibility evidence item customer-shell-landmarks must not claim externalAuditAttached.",
        "Customer accessibility evidence item customer-shell-landmarks must not claim manualScreenReaderProofAttached.",
        "Customer accessibility evidence item customer-shell-landmarks must not require live external network calls.",
        "Customer accessibility evidence item customer-shell-landmarks must keep realOrdersEnabled=false.",
        "Customer accessibility evidence item customer-shell-landmarks must keep liveProviderCalls=false.",
        "Missing customer accessibility evidence item: customer-form-labels.",
        "Missing customer accessibility evidence item: external-assistive-technology-audit."
      ])
    );
  });
});
