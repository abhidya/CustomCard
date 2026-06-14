# Accessibility Evidence Readiness

This is a bounded repo-local readiness lane for customer and admin web accessibility evidence. It is not a live external accessibility audit, WCAG certification, assistive-technology signoff, or public launch claim.

## What is proven

- `src/accessibilityReadiness.ts` defines the required customer/admin web gates for keyboard path, labels, contrast token review, responsive overflow evidence, screen reader landmarks, reduced motion policy, and external accessibility audit.
- `src/accessibilityReadiness.test.ts` validates the readiness summary and fails unsafe live-audit, certification, public-claim, duplicate-gate, and missing-gate edits.
- `scripts/accessibility-readiness-doctor.mjs` exits nonzero when the required gate inventory, safety fields, tests, docs, or npm script wiring are missing.
- Existing repo signals are referenced honestly: app-shell landmarks and skip-link signals are covered by `npm run security:doctor`, and responsive overflow smoke coverage is covered by `npm run test -- tests/app-smoke.test.ts`.

## What remains blocked

- Keyboard-only traversal evidence is not attached for the full customer workspace/import/review/handoff path or admin readiness path.
- A contrast-ratio matrix is not attached for customer/admin foreground, background, icon, status, focus, and disabled token pairs.
- Screen-reader landmark transcripts and assistive-technology notes are not attached.
- A reduced-motion policy and prefers-reduced-motion regression check are not attached.
- No external WCAG audit report, remediation log, retest signoff, or auditor-approved public claim is attached.

## Local Gate Summary

| Gate | Status | Current evidence boundary | Remaining evidence |
| --- | --- | --- | --- |
| Keyboard path | Repo-local signal | Skip-link/main-content signals and customer/admin smoke paths exist. | Keyboard-only traversal transcripts and focus-order capture. |
| Labels and names | Repo-local signal | App-shell aria labels and chat textarea label are covered by existing checks. | Complete accessible-name inventory and dynamic status review. |
| Contrast token review | Local evidence required | CSS color declarations exist. | Token contrast matrix and reviewer signoff. |
| Responsive overflow evidence | Repo-local signal | Chrome smoke tests cover no horizontal overflow for mobile and customer/admin panels. | Tablet/desktop, RTL, long-content, and focus-ring overflow evidence. |
| Screen reader landmarks | Repo-local signal | Skip link, navigation label, main landmark, and status label signals exist. | Screen-reader transcript, heading-order review, and dynamic announcement notes. |
| Reduced motion policy | Local evidence required | No committed policy or regression fixture is attached. | Animation inventory and prefers-reduced-motion regression check. |
| External accessibility audit | External audit blocked | External audit readiness register tracks this as internal-baseline-only. | External WCAG audit report, assistive-technology notes, remediation log, and retest signoff. |

## Validation

Exact validation command:

```sh
npm run test -- src/accessibilityReadiness.test.ts && npm run accessibility:doctor
```
