const requiredCustomerAccessibilityIds = [
  "customer-shell-landmarks",
  "customer-form-labels",
  "customer-action-focus-order",
  "customer-responsive-overflow",
  "mobile-preview-semantics",
  "external-assistive-technology-audit"
];

const allowedStatuses = new Set(["repo-local-ready", "external-evidence-missing"]);

export const customerAccessibilityEvidenceItems = [
  {
    id: "customer-shell-landmarks",
    label: "Customer shell landmarks",
    lane: "landmarks",
    status: "repo-local-ready",
    surface: "web-customer",
    sourceSignals: [
      "className=\"skipLink\"",
      "href=\"#main-content\"",
      "aria-label=\"CustomCard navigation\"",
      "<main id=\"main-content\">",
      "aria-label=\"Print-shop payment status\""
    ],
    currentEvidence: ["security:doctor semantic-app-shell", "app-smoke customer route render", "skip-link focus CSS"],
    requiredEvidence: ["External WCAG audit report", "Screen-reader landmark transcript"],
    customerVisible: true,
    externalAuditRequired: true,
    externalAuditAttached: false,
    manualScreenReaderProofAttached: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    blocker: "Repo-local landmark checks exist, but no external assistive-technology audit is attached."
  },
  {
    id: "customer-form-labels",
    label: "Customer form labels",
    lane: "forms",
    status: "repo-local-ready",
    surface: "web-customer",
    sourceSignals: [
      "aria-label=\"Customer chat message\"",
      "aria-label=\"Customer account workspace options\"",
      "aria-label=\"Calendar onboarding choices\"",
      "input[placeholder], textarea[placeholder]",
      "Customer chat message"
    ],
    currentEvidence: ["app-smoke customer placeholder and composer checks", "customer copy guard", "security:doctor semantic baseline"],
    requiredEvidence: ["Keyboard-only form walkthrough", "Screen-reader form-label transcript"],
    customerVisible: true,
    externalAuditRequired: true,
    externalAuditAttached: false,
    manualScreenReaderProofAttached: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    blocker: "Repo-local labeled-control coverage exists, but manual assistive-technology proof is not attached."
  },
  {
    id: "customer-action-focus-order",
    label: "Customer action focus order",
    lane: "actions",
    status: "repo-local-ready",
    surface: "web-customer",
    sourceSignals: [
      "Customer web experience must expose exactly one primary action.",
      "journeyActionGrid",
      "supportingActionList",
      "primaryButton",
      "supportingAction"
    ],
    currentEvidence: ["customerWebExperience validation", "app-smoke one-primary-action journey", "proof-first print-flow tests"],
    requiredEvidence: ["Keyboard tab-order capture", "External WCAG 2.2 focus-order review"],
    customerVisible: true,
    externalAuditRequired: true,
    externalAuditAttached: false,
    manualScreenReaderProofAttached: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    blocker: "Repo-local action hierarchy is tested, but keyboard tab-order evidence is not attached."
  },
  {
    id: "customer-responsive-overflow",
    label: "Customer responsive overflow",
    lane: "responsive",
    status: "repo-local-ready",
    surface: "web-customer",
    sourceSignals: [
      "keeps the mobile first viewport from overflowing horizontally",
      "scrollWidth",
      "clientWidth",
      "bodyScrollWidth",
      "390"
    ],
    currentEvidence: ["Chrome app-smoke mobile viewport check", "CSS responsive constraints", "full check build"],
    requiredEvidence: ["Responsive visual review screenshots", "External mobile accessibility audit"],
    customerVisible: true,
    externalAuditRequired: true,
    externalAuditAttached: false,
    manualScreenReaderProofAttached: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    blocker: "Repo-local overflow checks exist, but external responsive accessibility evidence is not attached."
  },
  {
    id: "mobile-preview-semantics",
    label: "Mobile preview semantics",
    lane: "mobile-preview",
    status: "repo-local-ready",
    surface: "mobile-preview",
    sourceSignals: [
      "aria-label=\"CustomCard native customer shell\"",
      "aria-label=\"Mobile customer summary\"",
      "aria-label=\"Mobile checkout safeguards\"",
      "mobileRenderSnapshot",
      "Print file checks"
    ],
    currentEvidence: ["mobile preview smoke checks", "mobile contract tests", "mobile render readiness doctor"],
    requiredEvidence: ["Native emulator accessibility tree", "iOS/Android screen-reader walkthrough"],
    customerVisible: true,
    externalAuditRequired: true,
    externalAuditAttached: false,
    manualScreenReaderProofAttached: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    blocker: "Browser preview semantics exist, but native emulator accessibility-tree proof is not attached."
  },
  {
    id: "external-assistive-technology-audit",
    label: "External assistive technology audit",
    lane: "external-audit",
    status: "external-evidence-missing",
    surface: "web-customer",
    sourceSignals: [
      "accessibility-audit",
      "WCAG audit report",
      "Assistive technology test notes",
      "Remediation signoff"
    ],
    currentEvidence: ["external audit readiness register", "security privacy accessibility doctor", "customer accessibility evidence doctor"],
    requiredEvidence: ["External WCAG audit report", "Assistive technology test notes", "Remediation signoff"],
    customerVisible: false,
    externalAuditRequired: true,
    externalAuditAttached: false,
    manualScreenReaderProofAttached: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    blocker: "External WCAG and assistive-technology audit artifacts are not attached."
  }
];

export function summarizeCustomerAccessibilityEvidence(items = customerAccessibilityEvidenceItems) {
  return {
    total: items.length,
    repoLocalReady: items.filter((item) => item.status === "repo-local-ready").length,
    externalEvidenceMissing: items.filter((item) => item.status === "external-evidence-missing").length,
    customerVisibleItems: items.filter((item) => item.customerVisible).length,
    externalAuditRequired: items.filter((item) => item.externalAuditRequired).length,
    externalAuditAttached: items.filter((item) => item.externalAuditAttached).length,
    manualScreenReaderProofAttached: items.filter((item) => item.manualScreenReaderProofAttached).length,
    sourceSignals: [...new Set(items.flatMap((item) => item.sourceSignals))],
    currentEvidence: [...new Set(items.flatMap((item) => item.currentEvidence))],
    requiredEvidence: [...new Set(items.flatMap((item) => item.requiredEvidence))],
    externalNetworkCalls: items.filter((item) => item.externalNetworkCalls).length,
    realOrdersEnabled: items.filter((item) => item.realOrdersEnabled).length,
    liveProviderCalls: items.filter((item) => item.liveProviderCalls).length,
    blockers: validateCustomerAccessibilityEvidence(items)
  };
}

export function validateCustomerAccessibilityEvidence(items = customerAccessibilityEvidenceItems) {
  const issues = [];
  const itemsById = new Map();

  for (const item of items) {
    if (itemsById.has(item.id)) issues.push(`Duplicate customer accessibility evidence item: ${item.id}.`);
    itemsById.set(item.id, item);

    if (!allowedStatuses.has(item.status)) {
      issues.push(`Customer accessibility evidence item ${item.id} has unsupported status.`);
    }
    if (!item.lane) issues.push(`Customer accessibility evidence item ${item.id} must name its lane.`);
    if (!item.surface) issues.push(`Customer accessibility evidence item ${item.id} must name its surface.`);
    if (item.sourceSignals.length < 3) {
      issues.push(`Customer accessibility evidence item ${item.id} must list at least three source signals.`);
    }
    if (item.currentEvidence.length < 2) {
      issues.push(`Customer accessibility evidence item ${item.id} must list repo-local evidence.`);
    }
    if (item.requiredEvidence.length < 2) {
      issues.push(`Customer accessibility evidence item ${item.id} must list at least two required evidence items.`);
    }
    if (!item.blocker) issues.push(`Customer accessibility evidence item ${item.id} must explain its blocker.`);
    if (item.externalAuditRequired !== true) {
      issues.push(`Customer accessibility evidence item ${item.id} must require external accessibility audit evidence.`);
    }
    if (item.externalAuditAttached !== false) {
      issues.push(`Customer accessibility evidence item ${item.id} must not claim externalAuditAttached.`);
    }
    if (item.manualScreenReaderProofAttached !== false) {
      issues.push(`Customer accessibility evidence item ${item.id} must not claim manualScreenReaderProofAttached.`);
    }
    if (item.externalNetworkCalls !== false) {
      issues.push(`Customer accessibility evidence item ${item.id} must not require live external network calls.`);
    }
    if (item.realOrdersEnabled !== false) {
      issues.push(`Customer accessibility evidence item ${item.id} must keep realOrdersEnabled=false.`);
    }
    if (item.liveProviderCalls !== false) {
      issues.push(`Customer accessibility evidence item ${item.id} must keep liveProviderCalls=false.`);
    }
  }

  for (const requiredId of requiredCustomerAccessibilityIds) {
    if (!itemsById.has(requiredId)) issues.push(`Missing customer accessibility evidence item: ${requiredId}.`);
  }

  const shell = itemsById.get("customer-shell-landmarks");
  if (shell) {
    assertIncludes(shell.sourceSignals, "href=\"#main-content\"", issues, "Customer shell landmarks");
    assertIncludes(shell.sourceSignals, "aria-label=\"CustomCard navigation\"", issues, "Customer shell landmarks");
  }

  const action = itemsById.get("customer-action-focus-order");
  if (action) {
    assertIncludes(action.sourceSignals, "Customer web experience must expose exactly one primary action.", issues, "Customer action focus order");
    assertIncludes(action.currentEvidence, "proof-first print-flow tests", issues, "Customer action focus order");
  }

  const mobile = itemsById.get("mobile-preview-semantics");
  if (mobile) {
    assertIncludes(mobile.sourceSignals, "aria-label=\"CustomCard native customer shell\"", issues, "Mobile preview semantics");
    assertIncludes(mobile.requiredEvidence, "Native emulator accessibility tree", issues, "Mobile preview semantics");
  }

  return issues;
}

function assertIncludes(values, expected, issues, label) {
  if (!values.includes(expected)) {
    issues.push(`${label} must include source signal: ${expected}.`);
  }
}
