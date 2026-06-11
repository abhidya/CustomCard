# Competitor Card Asset Categories

This is a research-only benchmark set for CustomCard. Competitor images in
`docs/evidence/competitor-card-examples/` are downloaded only for internal
comparison and must not be reused, remixed, shipped, or used as production art.
CustomCard examples should be generated from our own prompts, brand system,
templates, and user-provided memories.

## Downloaded References

| Category | Competitor | Source link | Local reference |
|---|---|---|---|
| AI prompt-to-card generation | Adobe Express | https://www.adobe.com/express/create/ai/card | `docs/evidence/competitor-card-examples/adobe-express-ai-card-og.jpeg` |
| Small business thank-you AI card | Adobe Express | https://www.adobe.com/express/create/ai/card | `docs/evidence/competitor-card-examples/adobe-express-small-business-thanks.png` |
| Personalized physical card catalog | Hallmark | https://www.hallmark.com/customized-cards/ | `docs/evidence/competitor-card-examples/hallmark-custom-birthday-category.jpg` |
| Free template card maker | Greetings Island | https://www.greetingsisland.com/ | `docs/evidence/competitor-card-examples/greetings-island-fathers-day-preview.jpeg` |
| Mail-for-you blank card flow | Postable | https://www.postable.com/cards | `docs/evidence/competitor-card-examples/postable-blank-card-placeholder.png` |
| Photo-card print product | Shutterfly | https://www.shutterfly.com/cards-stationery/ | `docs/evidence/competitor-card-examples/shutterfly-grad-card-preview.webp` |
| Digital card delivery and tracking | Paperless Post | https://www.paperlesspost.com/cards/section/online-cards | `docs/evidence/competitor-card-examples/paperless-post-online-card-preview.png` |
| Broad drag-and-drop template editor | Canva | https://www.canva.com/create/greeting-cards/ | Source-linked only; public fetch was blocked. |
| Premium artist marketplace | Minted | https://www.minted.com/personalized-greeting-cards | Source-linked only; public fetch was blocked. |
| 3D / keepsake card product | Lovepop | https://www.lovepop.com/ | Source-linked only; example assets were not needed for the first visual set. |
| Ecard subscription and AI message help | American Greetings | https://www.americangreetings.com/ | Source-linked only; use for messaging/delivery benchmark. |

## Asset Categories To Generate For CustomCard

| Our asset category | Competitor pressure | CustomCard generation recipe | Website validation |
|---|---|---|---|
| AI starter card | Adobe Express turns a text prompt into editable card options. | Generate 3 editable 5x7 concepts from `occasion`, `recipient`, `relationship`, `tone`, and 2-4 memory facts. Output front SVG/PNG, inside message, color palette, and editable text slots. | Prompt form accepts structured fields; generated cards render in the studio; user can edit title/message/photo; export passes safe-zone and text-overflow checks. |
| Occasion template shelf | Canva, Greetings Island, Hallmark win on fast browsing by occasion. | Generate canonical shelves for birthday, thank-you, sympathy, Father/Mother's Day, graduation, anniversary, and just-because. Each shelf needs one photo card, one typographic card, one funny card, and one sentimental card. | Template shelf loads on desktop/mobile; filters do not overlap; every card has alt text, occasion metadata, and a one-click "make this personal" action. |
| Recipient-aware card | Most competitors personalize layout/text, but not relationship context. | Use saved relationship memories and event context to generate a card that mentions a specific shared detail without exposing private raw notes. | Memory consent gate appears; generated text shows the chosen memory reason; rejection/edit controls are visible; no hidden memory text leaks into export metadata. |
| Photo milestone card | Shutterfly leads with photo-forward milestone cards. | Generate photo-grid layouts for graduation, new baby, wedding, and family update cards with crop-safe masks and caption options. | Uploaded images keep aspect ratio; no face crop crosses safe zone; export includes print dimensions and 300 DPI render metadata. |
| Mail-for-you handoff | Hallmark and Postable reduce friction by printing, stamping, and mailing. | Generate a fulfillment-ready packet: front art, inside message, recipient address intent, print checklist, and store/provider handoff. | Manual vendor handoff route accepts the render packet; artifact links persist; copy explains approval before external sharing. |
| Digital send card | Paperless Post and American Greetings win on instant delivery, scheduling, and open tracking. | Generate an email/text-friendly card preview with share title, message, optional photo/video block, and scheduled send timestamp. | Digital preview has email/link/mobile views; scheduling UI stores timezone; delivery tracking remains clearly marked as gated until implemented. |
| Business recurring card | Postable has birthday/anniversary automation and mass mail. | Generate customer/employee birthday, anniversary, thank-you, and reactivation card templates with merge fields. | CSV/contact import preview validates names/dates; batch preview shows personalization diffs; no send happens while live-order kill switch is disabled. |
| Keepsake / premium card | Minted and Lovepop differentiate with artist/premium/3D feel. | Generate a premium visual lane: paper texture mockups, foil-like accent option, illustrated cut-paper or pop-up-inspired front art without copying competitor mechanics. | Premium label maps to our own asset style tokens; export still produces normal flat print assets unless a true 3D vendor path exists. |

## Comparison Workflow

1. Pick one competitor reference from `docs/evidence/competitor-card-examples/`.
2. Generate a CustomCard counterpart from the matching recipe above.
3. Save our generated export under `docs/evidence/generated-card-comparisons/`.
4. Capture desktop and mobile website screenshots showing the card in the editor.
5. Score competitor vs CustomCard on:
   - first-screen clarity;
   - personalization depth;
   - editability;
   - print/export readiness;
   - digital or physical delivery path;
   - trust signals around privacy, consent, and external sharing.
6. Keep the winning insight, not the competitor asset. If a competitor example is
   "funny dad repair card," our comparable card should use our own copy,
   illustration style, palette, and layout.

## Initial CustomCard Generation Briefs

Use these to make comparable but original examples:

1. **Adobe-style AI starter**: "Create a warm modern birthday card for a
   coworker named Manny who helped ship a hard project. Tone: grateful, witty,
   not cheesy. Colors: teal, warm yellow, charcoal."
2. **Hallmark/Postable physical card**: "Create a folded 5x7 birthday card for
   a dad who fixes everything around the house. Avoid copying repair-tool jokes;
   make it about steady presence and practical love."
3. **Greetings Island free template**: "Create a bright printable thank-you card
   for a neighbor who watered plants during a trip. Simple, cheerful, printable
   at home."
4. **Shutterfly photo card**: "Create a graduation photo card with one hero
   image, three small memory thumbnails, class-year typography, and a short
   proud-family message."
5. **Paperless Post digital card**: "Create an online thank-you card with email
   subject, preview text, share-link title, and a clean mobile view."
6. **Postable business automation**: "Create a recurring customer anniversary
   card using merge fields for first name, company, anniversary year, and one
   product memory."

## Validation Checklist For Our Website

- **Visual**: no overlapping text, mobile fit checked, 5x7 card aspect ratio,
  safe zone visible, print export not blurry.
- **Copy**: generated text matches occasion and relationship, avoids generic
  filler, and offers at least two tone alternatives.
- **Privacy**: any relationship memory used is explicitly selected or consented
  to; raw private notes do not appear in downloadable metadata.
- **Persistence**: generated card can be saved, reloaded, and exported; render
  packet artifacts have signed URLs when object-store persistence is enabled.
- **Accessibility**: editor controls are keyboard reachable, card preview has a
  text alternative, contrast is acceptable for foreground text.
- **Comparison evidence**: each benchmark run stores competitor source link,
  competitor local reference, CustomCard export, screenshots, and score notes.
