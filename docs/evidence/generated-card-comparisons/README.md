# Generated Card Comparisons

Store CustomCard-generated benchmark outputs here when comparing against
`../competitor-card-examples/`.

Recommended file set per benchmark:

- `<category>-customcard-export.png`
- `<category>-customcard-editor-desktop.png`
- `<category>-customcard-editor-mobile.png`
- `<category>-scorecard.md`

For the live benchmark harness, run:

```bash
npm run card:benchmark -- --live
```

Use `--image-adapter cloudflare-workers-ai-image` for the preferred live
Cloudflare image path. Use `--image-adapter browser-svg-renderer` when the RCA
focus is deterministic flat SVG artwork, no-network debugging, or isolating R2
persistence from provider-image behavior.

Do not copy competitor images into generated outputs. Keep competitor references
in `../competitor-card-examples/` and generate all CustomCard art, copy, layout,
and screenshots from our own prompts and product flows.

Current production-text research status:
`production-text-research-findings-2026-06-26.md`.

Current generated production-text research rollup:
`production-text-research-rollup-20260626-current/production-text-research-rollup.md`.

Current production-text evidence index:
`production-text-evidence-index-20260626-current/production-text-evidence-index.md`.

Current production-text planner preflight:
`production-text-planner-preflight-20260626-current/production-text-planner-preflight.md`.

Current production-text rerun plan:
`production-text-rerun-plan-20260626-current/production-text-rerun-plan.md`.

Current production-text manual grade checklist:
`production-text-manual-grade-checklist-20260626-current/production-text-manual-grade-checklist.md`.

Current production-text promotion gate:
`production-text-promotion-gate-20260626-current/production-text-promotion-gate.md`.

Latest LLM-planned production-text matrix:
`benchmark-aggregate-2026-06-26-production-text-llm-planner-live/benchmark-rankings.md`.

That aggregate is failure evidence from Qwen3-4B, not promotion evidence. Use
`tools/start-local-card-planner.ps1` or a hosted/self-hosted larger planner for
the full-quality prompt, and keep `-AllowSmallPlanner` reserved for exploratory
failure runs.
