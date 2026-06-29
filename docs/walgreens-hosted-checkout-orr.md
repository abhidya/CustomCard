# Walgreens Hosted Checkout ORR

Status: approved for local-contract checkout handoff only.
Owner: CustomCard operations.
Last reviewed: 2026-06-11.

## Scope

The hosted checkout exception covers only:

- `POST /api/walgreens/checkout/upload`
- `POST /api/walgreens/checkout/session`
- `GET|POST /api/walgreens/checkout/callback`

Upload and session routes require `customer-session` auth in the API contract.
The callback is public because Walgreens redirects the customer browser back to
the app and does not carry a CustomCard session credential.

## Risk Decision

Walgreens hosted checkout is allowed to make a vendor network call while direct
order placement remains disabled. The route is not a direct-order API: payment,
tax, pickup slot selection, and final order submission happen on Walgreens-hosted
pages under customer control.

This exception exists to support a customer-visible handoff flow without storing
card image bytes or customer checkout fields in CustomCard.

## Required Controls

- Customer auth is required before upload/session requests.
- Admin safety controls must keep Walgreens disabled until operator
  certification is recorded.
- Real orders remain disabled in route contracts and readiness summaries.
- Upload accepts card image bytes only and forwards them to Walgreens write-only
  photo storage.
- Session creation sanitizes the customer contact payload and forwards it once
  to the Walgreens hosted checkout service.
- No checkout customer identity fields are persisted locally.
- The upload route enforces a 6 MB body cap.
- The session route enforces a 256 KB body cap.
- A per-instance IP rate limit fences abuse.
- Trusted image URL allowlisting stays in the hosted checkout service.
- The callback route must stay network-free.

## Rejected Alternatives

- Direct Walgreens order placement: rejected until retailer certification,
  payment scope, recovery drills, and kill-switch evidence are complete.
- Public unauthenticated upload/session routes: rejected because hosted checkout
  still forwards customer/card data to a vendor service.
- Persisting checkout contact payloads locally: rejected because the handoff does
  not need CustomCard-side retention.

## Verification

Required checks:

- `npm run test -- --run src/apiContracts.test.ts tests/api-server.test.ts`
- `npm run hosted:api:doctor`
- `npm run security:doctor`

If any route in this scope starts storing customer checkout fields, placing
orders directly, or bypassing `customer-session` auth, this ORR must be reopened
before deployment.
