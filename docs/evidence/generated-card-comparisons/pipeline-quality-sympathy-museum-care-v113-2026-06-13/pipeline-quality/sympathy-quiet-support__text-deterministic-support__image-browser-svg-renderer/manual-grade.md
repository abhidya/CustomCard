# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Deterministic browser SVG renderer with AIC museum-source art route (deterministic-svg)
- Pipeline: full card generation service (pipeline-quality)
- User story: returning consumer; sympathy/support; memory load medium
- Contact sheet: [open](./contact-sheet.png)

## User Input

- Sender: Jordan
- Recipient: Eli
- Relationship: friend
- Brief: A quiet card for Eli after losing his father. Mention that I am here for the practical stuff too: meals, rides, calls, silence. No cliches.
- Must include: Eli, father, practical support, meals, rides, calls, silence
- Must avoid: religious claims, platitudes, bright celebration visuals, overdesigned ornament

## Rubric

- Product quality score /100: 63
- Prompt/pipeline contract score /100: 98
- Tier: C rough proof
- Dimension scores:
  - Prompt adherence and panel contract /15: 15
  - Occasion and user-story fit /15: 12
  - Copy quality and emotional calibration /15: 14
  - Visual composition and print readiness /15: 12
  - Theme coherence across panels /10: 8
  - Text/name fidelity strategy /10: 10
  - Domain/cultural sensitivity /10: 9
  - Commercial usefulness /5: 2
  - Originality and taste /5: 4
- Raw dimension sum /100: 86
- Hard failure caps triggered: no formal hard cap below 63, but visible product is capped at 63 because the card still needs a real art-direction pass before it could be sold as premium. It no longer reads as crude local clipart, but it is still repeated museum-wash stationery rather than bespoke four-panel art.
- Best panel: front. It has the strongest mood, readable title, and a real art-source texture instead of local care-object clipart.
- Worst panel: inside-right. Copy is correct and readable, but it repeats the inside-left background and depends on a large pale wash instead of a distinct practical-care composition.
- Blocking failures: repeated interior art; front/back are too dark at thumbnail size; practical-care evidence from the still-life source is faint; no panel feels custom enough for a premium sympathy product; AIC art is used as atmosphere rather than a composed four-panel artwork set.
- Smallest prompt/config fix: do not keep ghosting one museum background across all panels. Next run needs panel-specific source artwork or a native image provider that can make four flat, text-safe, non-mockup panels.
- Prompt-side or model-capability-side: art-source/layout-system side.
- Estimated cost per 4-panel card: $0 provider cost; local fallback only.

## Notes

V113 replaces procedural gouache/clipart emphasis with public-domain Art Institute of Chicago source art: Sargent thistles for grief texture and Pieter Claesz still life for practical meal/table imagery. It improves over v112's local generated objects, but only from 60 to 63. It is not close to the requested 109 target and should not be called production quality.
