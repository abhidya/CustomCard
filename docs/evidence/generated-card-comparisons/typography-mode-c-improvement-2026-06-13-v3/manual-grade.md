# Manual Grade: Mode C Hybrid Reserved Layout v3

- Run: `typography-mode-c-improvement-2026-06-13-v3`
- Contact sheet: `typography/folded-card-sunburst-typography__mode-c-hybrid-reserved-layout__image-deepai-text2img/contact-sheet.png`
- Image model: DeepAI `text2img`
- Strategy: artwork-only image prompts plus deterministic text overlay

## Score

- Total: 77/100
- Tier: B, promising but still needs prompt/layout repair
- Previous comparable Mode C v2 visual estimate: 65/100
- Delta: +12 points

## Dimension Scores

- Four-panel prompt adherence and panel contract: 10/10
- Front exact text and typography: 17/20
- Inside-left/right exact text and readability: 15/20
- Inside-left/right visual cohesion as opened spread: 9/15
- Back no-text discipline and coordinating mark: 8/10
- Overall folded-card theme coherence: 7/10
- Print readiness and margins: 11/15

## What Improved

- Front text now sits on a mostly opaque dark field and is readable.
- Inside-left and inside-right text fields are protected by near-opaque deterministic overlay fields.
- Back panel remains clean and text-free.
- Auto-checks passed: four panels, all images materialized, copy text suppressed from image prompts, back no-text contract, inside-spread cohesion prompt.

## Remaining Failures

- Inside panels still generate large radial bursts around the text fields, so visual cohesion is noisy and not quiet stationery.
- Inside-left and inside-right do not read as two halves of one opened spread; they share palette but differ in motif placement and density.
- Body text is legible but small in contact-sheet scale; print proofing should inspect full-size preview files.
- Back mark is clean but larger/centered compared with the intended tiny lower coordinating mark.

## Prompt Lesson

The v3 prompt improvement worked only because deterministic overlay became visually stronger. DeepAI still tends to satisfy "sunburst" with centered radial motifs even when the prompt forbids rays behind the field. Next prompt attempt should avoid central-radial language for text panels entirely:

- Use "corner ornaments", "thin border", "edge-only rays", and "no central motif".
- For interiors, say "plain note sheet with small outer-edge accent only" instead of "sunburst".
- Keep deterministic overlay as default; do not return to full AI typography for this provider.

## Best-Practice Inputs Used

- OpenAI image prompting guide: treat image prompts like specs and explicitly say not to add extra elements/text.
- Cloudflare JSON Mode docs: structured output can still fail and must be handled.
- Gemini structured output docs: schema support is a subset; keep schema demands bounded.
- fal queue docs: queue-backed image generation is a better fit for high-quality future model lanes than synchronous live customer paths.
