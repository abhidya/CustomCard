# CustomCard Context

CustomCard is an AI-assisted greeting-card CRM and print-production engine: it
notices when a card is needed, helps compose a relationship-aware card, renders
deterministic print-ready panels, and routes the card to a retail printer —
without ever placing a real order until certification exists. This file fixes the
vocabulary so code, docs, and reviews use one word per concept.

The architecture vocabulary (module, interface, depth, seam, adapter, leverage,
locality) lives in the architecture review tooling, not here. This file is the
**domain** language. See [docs/decisions.md](docs/decisions.md) for the standing
decisions (D001–D008) that these terms assume.

## Card lifecycle

**Opportunity**:
A detected moment that a card is warranted for a recipient, with the evidence and
matched memories that justify it. The user approves, snoozes, or dismisses it.
_Avoid_: event, trigger, lead, notification.

**Relationship Memory**:
A user-approved structured fact about a recipient (provenance and deletion
visible), used to make a card relevant. Structured, not vector (D004).
_Avoid_: profile, embedding, context, note.

**Card Draft**:
The deterministic copy and visual direction generated for an Opportunity before
any paid AI call.
_Avoid_: design, template instance, content.

**Render Packet**:
The print-ready output: four 1500×2100 SVG **Panels** (front, inside-left,
inside-right, back), a combined 5×7 PDF proof, and a checksum manifest. Produced
only after layout-safe validation (D005).
_Avoid_: artwork, asset bundle, export, file set.

**Panel**:
One of the four faces of a folded card. The unit the renderer and image prompts
work in.
_Avoid_: page, side, face, image.

## Fulfillment

**Vendor Adapter**:
The boundary to one retail printer (Walgreens, CVS, FedEx Office, …). Live
ordering is hard-gated behind certification; an adapter prepares a **Handoff**,
it does not place orders (D002).
_Avoid_: integration, connector, vendor client, provider.

**Handoff**:
The manual checkout package handed to the user (or, once certified, to a vendor)
to complete a print order outside the app.
_Avoid_: checkout, order submission, fulfillment call.

**Order**:
A draft print order tracked through an explicit lifecycle with recovery paths
(cancellation, wrong-store, event-moved-up, one-hour pickup). Real placement stays
disabled (D002).
_Avoid_: purchase, transaction, job.

**Fulfillment Recommendation**:
The customer-facing pick set derived from a pricing comparison: lowest current
estimate, fastest pickup, cheapest shipped. Estimate-only until same-cart coupon
proof exists.
_Avoid_: quote, best price, deal.

## Coupons & pricing

**Coupon Offer**:
A retailer discount code with its source evidence and an evidence status. A
discount only affects ranking after portal proof for the same cart.
_Avoid_: promo, discount, deal, voucher.

**Cart Terms**:
The exact cart context a Coupon Offer must match to apply — vendor, product kind,
size, quantity, fulfillment mode, account state. The single fact both ranking and
portal-evidence import check.
_Avoid_: cart state, conditions, line items.

**Provider Portal Evidence**:
Operator-attested proof, captured from a retailer's portal with no order placed,
that a coupon worked for a given Cart Terms. The gate between "listed" and
"applied".
_Avoid_: receipt, screenshot, confirmation.

## Providers & readiness

**Provider Adapter**:
One entry in the **Provider Catalog** describing an external capability provider
(an AI model, CRM, payment processor, …): its id, capability, status, credentials,
and safety gates. Carries metadata; the **Provider Runtime** builds its no-network
request contract.
_Avoid_: plugin, driver, service, integration.

**Provider Catalog**:
The registry of all Provider Adapters, indexed by capability. A capability is a
real seam only where two or more adapters vary across it.
_Avoid_: registry, config, provider list.

**Provider Runtime**:
The module that turns a chosen Provider Adapter plus input into a gated, redacted,
no-network request contract. Never makes live calls in this stage (D003, D008).
_Avoid_: client, dispatcher, executor.

**Readiness Register**:
An evidence ledger for one production concern (payment, observability, hosted API,
…): a list of readiness items, a summary, and a validator that fails closed when an
item would overclaim live capability. All registers share one kernel,
`defineReadinessRegister` in [src/readinessRegister.mjs](src/readinessRegister.mjs);
each domain supplies its item rules and summary fields.
_Avoid_: checklist, status board, audit, gate list.

**Doctor**:
An executable script (`npm run <area>:doctor`) that asserts a Readiness Register —
or another contract — is wired into app, API, docs, and tests, and reports a JSON
`ready`/`blocked` verdict. The CI proof that a claim is real.
_Avoid_: linter, validator, check script, test.

**Evidence** / **Proof**:
A concrete, attached artifact (transcript, screenshot, signed report) that backs a
readiness claim. Until it is attached, the claim stays blocked and `publicClaimAllowed`
is false. **Evidence** is the artifact; **Proof** is evidence sufficient to flip a gate.
_Avoid_: validation, confirmation, verification (those are activities, not artifacts).
