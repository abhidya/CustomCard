# CustomCard Full-Project Audit ("Roast") — 2026-06-12

Reviewers: product / engineering / UX / security / legal-risk (legal items are risk flags, **not legal advice**).
Method: full repo inventory + four parallel deep-dive reviews (security, UX/copy/a11y, legal/compliance, readiness-metrics honesty) + inline code-quality/deployment pass. Safe fixes applied and pushed in commit `f2fa020`; everything else is documented below with an implementation plan.

Validation baseline: `npm run check` (768 tests, 88 files, build, `npm audit`) green before and after fixes; security/persistence/deployment/localization doctors green; customer-accessibility doctor blocked identically before and after (pre-existing).

**Implementation update (2026-06-12, follow-up commits):** P1, P2, P3, P8, and P10 from §5 are now implemented (commits `e219fd4`, `386c6a7`, `90e29a4`). `npm run check` green after each (773 tests; the audit step is clean again after pinning wrangler's esbuild to 0.28.1). Statuses in §2 updated inline. Still open: P4–P6 and P9 (product/legal decisions), P7 (CSP — do not ship without testing Clerk sign-in on a preview deploy), and the Walgreens upload limiter half of P1 (still per-instance).

---

## 1. Executive roast summary

CustomCard is the most self-aware MVP I've audited — and that's both the compliment and the roast. The security engineering is genuinely strong (parameterized SQL everywhere, bearer-only auth, HMAC-signed artifact URLs, AES-256-GCM token encryption, SSRF allowlists, fail-closed validators). But the product wraps that engine in:

1. **Trust-breaking promises.** The app told guests "everything stays on this device" while persisting nothing — a refresh deleted their sympathy card after promising it was safe. (Fixed: honest copy. Real persistence is a documented product decision — see §5.)
2. **Legal text contradicting the live product.** Terms said "live ordering … remains disabled" while production Walgreens checkout was live. FTC-shaped problem. (Fixed in the draft; still **needs counsel**.)
3. **A readiness system that is honest in content and misleading in form.** Every status confesses "repo-local only" — but ~15 "doctor" scripts print `status: "ready"` after grepping the repo's own files, a green "E2E 100%" chip sits over a hand-typed matrix, and the "evidence ledger" has **no write path**: validators actively forbid recording real proof, so the system is frozen at pessimism and will rot into ignored noise.
4. **A compliance affidavit where the UX writer should be.** Customers were shown env var names, API routes, classifier confidence scores, raw VCALENDAR, and chat replies that ended every message with "This reply stayed local and did not store an outside transcript." (All fixed.)
5. **Two surfaces that should not be reachable:** `?view=business` (internal readiness commentary served to prospects) and the mobile app (every button is `onPress={() => undefined}` over fixture data). Both still shipping — see §5.

## 2. Ranked issue register

Severity / Area / Title / Status. Evidence and fixes are in the sections below or in commit `f2fa020`.

### Critical
| # | Area | Title | Status |
|---|------|-------|--------|
| C1 | Legal | Google `calendar.events.readonly` (sensitive scope) with no Google-compliant, indexed privacy policy; no Limited Use language | Partially fixed (policy draft now names Google + Limited-Use-style commitments); **Needs legal review + Google OAuth verification work** |
| C2 | Legal | Terms/Refunds claimed live ordering disabled while production Walgreens checkout is live | Fixed (draft text now matches reality); **Needs legal review** |
| C3 | UX | `?view=business` serves internal readiness commentary ("live webhooks remain evidence-gated") to any visitor | **Fixed** (admin-only B2B preview; everyone else lands on the customer home, URL rewritten); marketing rewrite still a product decision |
| C4 | Mobile | Mobile app is a non-interactive fixture demo (`onPress={() => undefined}`, hardcoded "Sara and Ahmed", compliance copy at customers) | Needs owner (ship real flow or unship) |
| C5 | A11y | `--ink-faint` ~1.8:1 contrast (alpha-on-cream) used in 52 places incl. mobile nav labels | **Fixed** (solid AA tokens, all 3 themes) |
| C6 | UX/Trust | "Everything stays on this device" promise with zero persistence | **Fixed** (honest copy); real opt-in persistence = product decision |

### High
| # | Area | Title | Status |
|---|------|-------|--------|
| H1 | Security | AI cost-gate + Walgreens rate limits are per-process `Map`s — useless across serverless instances; provider spend effectively uncapped once live AI is enabled | **Fixed for AI spend** (Postgres advisory-locked reserve-then-settle over `provider_call_events`; fails closed when the ledger is down). Walgreens upload limiter still per-instance |
| H2 | Legal | Deletion promised in 3 places; no deletion code path (memory "forget" retains text; DSAR goes to a table; promised follow-up email has no mail provider) | Needs owner + legal review |
| H3 | Legal | Third-party recipient data (incl. health/bereavement context) collected with no point-of-collection notice | Needs legal review |
| H4 | Legal | Personal data flows to up to 7 AI providers; none named in policy; free-tier providers may train on inputs | Partially fixed (policy now mentions AI providers generically); **Needs DPA/no-training review per provider** |
| H5 | Legal | `WALGREENS_AFF_ID` + coupon feeds (FMTC/Rakuten planned) with no FTC material-connection disclosure; "Partner" overstated | Partially **fixed** ("Printed by Walgreens"); disclosure wording **needs legal review** |
| H6 | Legal | Privacy policy missing controller identity, retention, sale/share, children's terms, DSAR mechanics | Needs legal review (register already tracks these as launch-blocked) |
| H7 | Metrics | Doctor scripts print `status:"ready"` for grep-the-repo checks; "0 blockers" means "constants agree with themselves" | **Fixed** (repo-local doctors emit `repo-consistent`/`contract-drift` + `scope: "repo-local"`, report `registerIssues`; "ready" reserved for live doctors) |
| H8 | Metrics | Readiness ledger has no evidence-attachment path; validators forbid recording success (4-file lockstep per status change) | **Fixed** (`docs/evidence/` convention; external-audit register accepts `external-evidence-attached` iff refs follow the convention, doctor verifies the files exist) |
| H9 | Copy | Calendar errors leaked env vars/routes; import showed "Date signal: 20260712"; checkout narrated the API; admin gate documented its own provisioning | **Fixed** (calendar errors, checkout, admin gate, import toast); `freeMvp.buildEvidence` humanization still open |
| H10 | UI | Brand fonts (Fraunces/Instrument Sans) specified but never loaded — everyone saw Georgia/Helvetica | **Fixed** (self-hosted variable woff2, preloaded; 96KB) |
| H11 | UX | Frozen `reviewerReferenceDate` (2026-06-03) stamped real user notes and ZIP timestamps | **Fixed** |
| H12 | UX | Theme choice unlabeled dots, not persisted | Partially fixed (`aria-pressed`); persistence requires updating the localPersistenceAudit attestation chain (5 files) — plan below |
| H13 | UX | Terminology soup: moments/events/occasions/opportunities/notes/details/memories | Needs product decision (pick: Occasions / People / Details / Cards) |
| H14 | UX | No stepper/back-path between Studio → Print; deep-link `?view=handoff` shows placeholder proof page | **Fixed** (labeled 3-step stepper on Studio/Print with clickable back-path, "Back to design" link, empty print deep-links start in the studio) |
| H15 | Copy | Chat replies ended with audit-log disclaimers; safety badges like "No outside transcript" | **Fixed** (chat closing); badges still open |

### Medium (selected)
| # | Area | Title | Status |
|---|------|-------|--------|
| M1 | Security | Prod gating keyed on `NODE_ENV`/`CUSTOMCARD_ENV` only; misconfig falls back to static shared admin token (memory mode) | Needs owner (require explicit insecure-runtime opt-in flag) |
| M2 | Security | Rate-limit key was the proxy IP (one global bucket) or spoofable XFF | **Fixed** (Vercel client-IP headers preferred) |
| M3 | Security | Vercel-served static assets had zero security headers (api-server headers don't apply on Vercel CDN) | **Fixed** (non-CSP headers in vercel.json; COOP `same-origin-allow-popups` to keep Walgreens popup callback). CSP for the SPA still open — needs Clerk domain allowlist testing |
| M4 | Privacy | DSAR `status`/`dueAt` were client-supplied (requester could self-complete) | **Fixed** in both runtimes, tests updated |
| M5 | Privacy | Calendar fetch pulled full event objects (attendees, descriptions) despite "titles and dates only" claim | **Fixed** (`fields` mask); wrong internal scope record fixed |
| M6 | A11y | Toasts invisible to AT; switches/chips/steps had no state semantics; no `:focus-visible` | **Fixed** |
| M7 | UX | "Try an example" dumped raw VCALENDAR | **Fixed** (human-text example, verified parser handles it) |
| M8 | UX | "87% match" classifier score shown to customers | **Fixed** (removed from Events + Studio) |
| M9 | Perf | 23MB of PNGs shipped (hero 1.5MB) | **Fixed** (WebP, 1.1MB total, −95%) |
| M10 | Perf | 670KB main JS bundle (uncompressed) | **Fixed** (main chunk 352KB; Clerk in its own 314KB cacheable chunk; B2B view lazy) |
| M11 | Metrics | "E2E 100%" green chip over a hand-typed matrix; `ciGated` self-attested | Partially **fixed** (chip now amber "29/29 mapped journeys (repo-local)"); `ciGated` self-attestation still open |
| M12 | Metrics | ~10–15% of test suite snapshots constants against themselves | Needs owner (keep validator tests, drop count snapshots) |
| M13 | UX | Magic sentinels ("Someone important") can swallow real input; one chip tap = "In progress" resume card | Open |
| M14 | UX | Checkout collects name/email/phone with no explanation | Open (one sentence + inline validation) |
| M15 | UX | Print page DOM order buries proof approval below partner details on mobile | Open |
| M16 | UX | Offline fallback is unstyled plain-text "Offline" | Open |
| M17 | Copy | Manual-upload "manifest/source SVGs" jargon; "Handled by printer" | **Fixed** |
| M18 | UX | Same-day urgency label applied to events 2 days out | **Fixed** ("Print in the next day or two") |
| M19 | Security | Admin email allowlist ships in client bundle via `VITE_` var | Open (server-derived admin gating; prefer Clerk `publicMetadata.role`) |
| M20 | Security | Clerk `iss`/`aud`/`azp` checks optional | Open (require `CLERK_ISSUER` in durable env validation) |
| M21 | Legal | Admin gallery reuses customer-derived cards with no license/consent terms; AI output ownership unaddressed | Needs legal review |

### Low (selected)
- L1 OAuth callback not bound to browser session (signed+nonce+TTL mitigate) — open.
- L2 Meta description overpromised "no account required" — **fixed**.
- L3 "Back from Walgreens" status chip reads oddly — open.
- L4 Five peer buttons per calendar moment row — open (overflow menu).
- L5 Trust section is 7 bullets of caveats — open (cut to 3).
- L6 ZIP filenames expose draft ids — open (friendly names).
- L7 `?view=opportunities`/`handoff` internal naming in URLs — open.
- L8 LegalView consent toggles are local-state theater (admin-only) — open (label as internal tracker).
- L9 icon-512.png is 245KB — open.

## 3. Fixed in commit `f2fa020` (49 files)

See commit message for the full list. Highlights: contrast tokens ×3 themes; global `:focus-visible`; toast/switch/chip/step ARIA; honest guest-persistence copy ×4; frozen-date removal ×2; legal docs rewritten to match the live product; "Printed by Walgreens"; same-day claim qualified; calendar error/evidence-adjacent dev-leak strings; checkout status copy; admin gate copy; chat disclaimer removal; "% match" removal; human-text example invite; calendar import toast (no textarea overwrite); meta description; Google Calendar `fields` mask + scope record; DSAR server-side status/dueAt (both runtimes) + dead code removal; Vercel security headers; proxy-aware rate-limit keys; self-hosted fonts; PNG→WebP (−22MB). Test pins updated in 5 test files to assert the new, honest behavior (including a new "must NOT contain dev language" assertion).

## 4. Legal-risk checklist (attorney punch list)

1. Google API Limited Use language in a published, indexed privacy policy — **missing** (drafted, needs counsel; remove `noindex` once final).
2. Name all data recipients (Walgreens, Clerk, Vercel, Cloudflare, OpenAI/Gemini/HF/Groq/DeepAI/Featherless, Postgres host) — partially drafted.
3. Working deletion path matching the deletion promise — **missing** (build before promising; purge memory text on "forget").
4. Point-of-collection notice for third-party recipient data — missing.
5. AI subprocessor DPAs / no-training terms — unverified.
6. FTC affiliate disclosure for Walgreens/coupons; Walgreens API ToS branding check — needed.
7. Controller identity, retention schedule, sale/share + GPC, children's/age terms, DSAR mechanics — missing.
8. AI content ownership + gallery-reuse license — missing.
9. Backed claims (keep): "never sees payment details" (hosted checkout), "refresh credential encrypted" (AES-256-GCM), no trackers found.

## 5. Implementation plans for unfixed items

**P1 — Durable AI budget/rate enforcement (H1).** Move reservation/spend to Postgres: `BEGIN; SELECT sum(cost) FROM provider_call_events WHERE month=…; INSERT reservation; COMMIT;` reuse existing idempotency tables. Keep the in-memory gate as per-instance fast-path only. Same store for Walgreens upload limiter.
**P2 — Readiness vocabulary + evidence path (H7/H8).** (a) In `doctor-harness.mjs`, rename emitted statuses `ready/blocked` → `repo-consistent/contract-drift`; reserve `ready` for env-gated live doctors. (b) Create `docs/evidence/` artifact convention (doctor JSON + checksum + date); make register validators accept status upgrades **iff** `evidenceArtifactRefs` resolves to an existing artifact, instead of forbidding upgrades outright. (c) Rename summary `blockers` → `registerIssues`; derive domain blockers from item `blocker` strings. (d) Replace "E2E 100%" chip with "29/29 mapped journeys (repo-local)".
**P3 — Unship or rewrite `?view=business` (C3).** Quickest safe step: redirect `business` → `customer` in `routePolicy`/`App.tsx` until real marketing copy exists. Delete the metric grid and "What this page needs" section when rewriting.
**P4 — Mobile (C4).** Either wire `customerExperience.ts` actions to the real API (bootstrap route exists) and align vendor story to Walgreens, or remove the app from release channels. Delete fixture people and all gate-narration strings.
**P5 — Guest persistence decision (C6).** If product wants it: add opt-in "Keep my draft on this device" that writes `workspace` to `localStorage` under `reviewerWorkspaceKey`, then update `localPersistenceAudit.ts` (item surface/key), its summary status rule (action-required only when `dbRequired > 0`), api-server readiness pins + blocker rule at `api-server.mjs:594`, `persistence-doctor.mjs` pins, and both test files. Same chain applies to theme persistence (key `customcard-theme-v1` is already reserved).
**P6 — Deletion pipeline (H2).** Worker job consuming `data_requests`: hard-delete relationship_memories/events/drafts + crypto-shred refresh tokens; purge memory `text` on forget; integrate a transactional email provider before promising follow-ups; admin-only status transitions.
**P7 — SPA CSP (M3).** Determine the Clerk frontend-API domain from `VITE_CLERK_PUBLISHABLE_KEY`, add CSP to vercel.json with `script-src 'self' https://<clerk-domain>` + `connect-src` for Clerk/API, test sign-in on a preview deploy before production.
**P8 — Create-flow wayfinding (H14).** 3-step labeled stepper component on Studio/Print; "Back to design" link on Print; redirect `handoff` → `studio` when `!hasMeaningfulProgress`.
**P9 — Terminology (H13).** One rename pass: Occasions / People / Details / Cards; align nav labels, headings, URL params (`view=occasions`, `view=print`, `view=cards`); extend `customerVisibleImplementationTermPattern` blocklist with "evidence, signal, metadata, manifest, env, route, OAuth" and run it against `calendarConnectionAdapter` and `freeMvp.buildEvidence`.
**P10 — Bundle (M10).** `manualChunks` for Clerk; verify lucide tree-shaking; lazy-load BusinessLanding/Legal views.

## 6. Validation performed

- `npm run check` ×3 (full suite + coverage + build + audit): final run green — 768/768 tests, 0 vulnerabilities, statements 91.09%.
- `security:doctor`, `persistence:doctor`, `deployment:doctor`, `localization:doctor`: pass post-change.
- `customer:accessibility:doctor`: blocked, byte-identical lanes to pre-change baseline (verified via `git stash` A/B) — pre-existing, by design pending manual screen-reader evidence.
- Parser probe: verified `parseFreeImport` extracts recipient/occasion/date from the new human-text example before shipping it.
- Contrast values computed (not eyeballed): old atelier faint = 1.81:1 effective; new tokens ≥ 4.5:1 on their backgrounds.

## 7. Remaining risks

1. The deployed production site still serves the old bundle until the next deploy; the legal-text contradiction is live until then.
2. CSP for the Vercel-served SPA is still absent (P7) — XSS blast radius is larger than it needs to be.
3. AI spend is uncapped at platform level the day live providers are enabled (P1) — do P1 *before* flipping any provider on.
4. All legal drafts remain drafts; nothing here is counsel-reviewed.
5. The readiness system will keep generating green "ready" doctor lines until P2 lands; treat every CI "Validate X readiness" step name with suspicion in launch reviews.
6. Disk on this dev machine is at 100% (2.6GB free) — builds and benchmarks will start failing unpredictably.
