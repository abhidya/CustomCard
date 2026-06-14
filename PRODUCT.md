# Product

## Register

product

## Users

**Primary — the consumer sending a personal card.** One person turning a real
moment into a card that feels written, not bought. They are time-poor and
emotionally invested: a busy adult managing family and social obligations, a
parent or caregiver who wants help saying the right thing, someone in a
multilingual or multicultural family, a frequent event-attendee who wants cards
to feel personal over time, or a last-minute user who needs a printable card
today. First contact is usually mobile, often under time pressure. The job to be
done: take a card-worthy moment to a personal, print-ready 5x7 card and a safe
path to a printed copy — without writing from a blank page, fighting file
formats, or getting burned at checkout.

**Secondary surfaces, same product:**
- *Returning customer* managing card history and people notes (desktop studio review).
- *Small-business / operator* reviewing lifecycle card opportunities (B2B landing + queue).
- *Admin* validating production readiness behind gated operations surfaces.

Consumer needs win when priorities conflict; operator and admin surfaces are
real but secondary.

## Product Purpose

CustomCard is a relationship-aware greeting-card CRM and print-production engine.
It notices when a card is warranted (an **Opportunity**), asks only the
relationship context that improves the card, generates inspectable deterministic
**Card Drafts** (copy + visual direction), renders print-safe 5x7 panels (a
**Render Packet** of four **Panels** plus a PDF proof and checksum manifest), and
prepares a safe retail-print **Handoff** — without placing a live order until
vendor certification exists.

It exists because the three existing options each fail: a generic store card is
fast but impersonal; a hand-written card is meaningful but happens under time
pressure; retail print shops can produce a nice card but still leave the user to
write the message, design the panels, format the files, and avoid checkout
surprises. CustomCard is the wedge between them.

Success looks like: the first screen explains value in under five seconds; the
user can start from an occasion *or* an invite; the studio makes
proof / edit / review obvious; the print handoff cleanly separates CustomCard
export from Walgreens checkout; and operator/admin surfaces stay honestly gated.

## Brand Personality

Three words: **warm, careful, tactile.** The product should feel like a calm
stationery desk with software discipline underneath — warm and personal at the
surface, rigorous and trustworthy beneath it.

Voice is plain, warm, confidence-bounded, and specific. It never reaches for "AI
magic," never overclaims, and never lets internal vocabulary leak to the
customer. Emotionally, the consumer should feel two things at once: *this card
will be personal* and *this process is trustworthy* — my data, my approval, my
edits, my call.

Trust is carried out loud: explicit review before checkout, no live-order claim
without proof, privacy notes placed next to account/calendar actions, visible
print/export proof status, and honest Walgreens handoff wording.

## Anti-references

What this must not look or feel like:

- **Placeholder recipient copy in polished or public surfaces** — no "Card for
  Someone important." Public examples are real-feeling and specific, or honestly
  framed as a starting point.
- **Fake sample data pretending to be the user's real data or moments.** Empty
  states teach; they never impersonate identity.
- **Dense AI ornament** and decorative overload.
- **Fake readable text, signatures, logos, or watermarks baked into generated
  card art.** Customer-visible wording lives in app/export overlays only.
- **Stock-photo sentimentality** — generic happy-family stock standing in for
  genuine emotion.
- **Adapter / provider / vendor jargon in customer flows** ("vendor handoff",
  "provider runtime"). That language belongs only in admin/operator surfaces.
- **Production claims without attached evidence**, and "AI magic" framing where
  proof and review are what actually matter.
- **Beige monotony** — every section collapsing into the same cream/tan weight.
  Warmth is the brand, sameness is the failure.

A competitor note: rivals that win on first impression do it by being
generic-pretty. CustomCard's edge is trust + relationship memory; do not sand
those off chasing flash.

## Design Principles

1. **Product proof first (show, don't tell).** Lead with a real card, proof,
   queue, or handoff state — not generic marketing illustration. Empty states
   teach the interface; they never fake data or preload an identity.

2. **Evidence honesty.** Always label what is local, gated, estimated, or
   external, and never claim a production integration before its gate is proven.
   In the studio this shows up as a hard rule: deterministic, exact text lives in
   app overlays and the export SVG; AI generates *art*, not the words — and never
   makes a hidden, irreversible decision.

3. **Helpful, never creepy.** Ask only the context that improves the card.
   Relationship memory stays user-visible, editable, and deletable. Names,
   relationships, religion, culture, and grief are high-care content and get
   explicit review, never silent assumption.

4. **One primary action per stage, next to its object.** Landing starts a
   card / import; the studio reviews and generates near the details it acts on;
   print exports or continues; admin rows ask for evidence. On mobile the
   customer always keeps a visible path back to Create, My cards, People, and
   Settings.

5. **Register split, balanced per surface.** The consumer and business *landings*
   are brand surfaces — they earn an emotional arc and a strong first impression.
   The studio, print, and admin surfaces are product surfaces — calm, dense,
   familiar, and out of the way of the task. Resolve the tension between
   distinctiveness and restraint per surface, not globally, with the consumer as
   the north star.

## Accessibility & Inclusion

Target: **WCAG 2.1 AA intent** across contrast, keyboard operation, labels, focus
flow, and reduced motion.

- **Contrast:** protect small copy on warm cream backgrounds (the warm-paper base
  is the easiest place to fall below 4.5:1); generated art must never reduce
  contrast behind deterministic text overlays.
- **Keyboard & focus:** native buttons/inputs/selects stay reachable, the skip
  link stays available, and carousel/category controls are manually operated and
  labeled with a visible focus flow.
- **Reduced motion:** reveal/pulse states respect `prefers-reduced-motion`; no
  auto-advancing galleries; no motion-critical interaction.
- **Touch & responsive:** 320px through wide desktop; touch targets ≥40px; hover
  is never the only affordance; customer navigation recovery stays visible below
  600px.
- **Inclusion:** multilingual and right-to-left typography quality is a
  first-class concern (multicultural-family persona), and high-care cultural,
  religious, and grief content is handled with explicit review rather than
  assumption.
