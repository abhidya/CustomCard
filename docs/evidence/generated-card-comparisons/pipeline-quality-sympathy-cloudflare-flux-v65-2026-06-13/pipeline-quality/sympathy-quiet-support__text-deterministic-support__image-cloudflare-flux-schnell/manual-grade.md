# Manual Grade - v65 Cloudflare FLUX Flat Screenprint Retry

- product_quality_score: 8/100
- prompt_pipeline_contract_score: 58/100
- tier: F route failure
- graded_by: main agent visual review
- contact_sheet: `contact-sheet.png`

## Panel Notes

Cloudflare FLUX returned `400` on `inside-right` with `Input prompt contains NSFW content`, so this route cannot be promoted even though fallback produced a complete contact sheet.

The visible sheet also drifted into folded-paper/mockup line work. Reject this branch; the shared prompt wording created reliability risk without improving product quality.
