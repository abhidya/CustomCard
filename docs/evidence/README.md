# Evidence artifacts

This directory is the write path for the readiness ledger. A readiness item may
only upgrade its status when the proof is recorded here and referenced from the
item's `evidenceArtifactRefs`.

## Convention

```
docs/evidence/<domain>/<YYYY-MM-DD>-<slug>.<ext>
```

- `<domain>` — the register the artifact belongs to (`external-audit`, `e2e`,
  `payment`, `hosted-api`, ...), lowercase with hyphens.
- `<YYYY-MM-DD>` — the date the evidence was captured, not the date it was
  filed.
- `<slug>` — what the artifact is (`security-assessment-report`,
  `coverage-doctor`, `walgreens-checkout-orr`), lowercase with hyphens.
- `<ext>` — `json` for doctor output, `md`/`txt` for reviewer notes and
  transcripts, `pdf`/`png`/`jpg` for external reports and screenshots.

The accepted pattern is enforced by `evidenceArtifactRefPattern` in
`src/readinessRegister.mjs`.

## Doctor-run artifacts (`.json`)

Capture the full doctor report plus a checksum of the report body:

```bash
npm run -s e2e:coverage:doctor > docs/evidence/e2e/2026-06-12-coverage-doctor.json
sha256sum docs/evidence/e2e/2026-06-12-coverage-doctor.json
```

Record the checksum and the command in the commit message or an adjacent `.md`
note so the artifact can be re-verified.

## How upgrades work

1. Capture the artifact here following the convention above.
2. Reference it from the readiness item's `evidenceArtifactRefs`.
3. Upgrade the item's status (for the external-audit register:
   `external-evidence-attached`).

Validators accept the upgrade only if every ref matches the convention, and the
domain doctor (Node-side) additionally fails when a referenced file does not
exist on disk. An upgrade claim without a resolvable artifact is a contract
drift, not a status.

## Vocabulary

Repo-local doctors report `repo-consistent` / `contract-drift` — they prove the
repository agrees with itself, nothing more. `ready` is reserved for env-gated
live doctors that exercise real deployments, providers, or databases.
