# card-gen-benchmark-2026-06-12T03-45-28-134Z

Live benchmark run for CustomCard card generation against research-only competitor fixtures.

| Fixture | Category | QA | Panels | Contact sheet | Scorecard | Persistence |
|---|---|---:|---:|---|---|---|
| small-business-thank-you | Small business thank-you AI card | 97/100 needs-improvement | 4 | [open](small-business-thank-you/contact-sheet.png) | [open](small-business-thank-you/qa-scorecard.md) | stored |
| medical-graduation | Medical school graduation folded card | 97/100 needs-improvement | 4 | [open](medical-graduation/contact-sheet.png) | [open](medical-graduation/qa-scorecard.md) | stored |
| dad-fix-anything | Father's Day repair-themed card | 100/100 pass | 4 | [open](dad-fix-anything/contact-sheet.png) | [open](dad-fix-anything/qa-scorecard.md) | stored |

Each fixture now includes an explicit target bar plus `qa-scorecard.json` / `qa-scorecard.md` checks for copy, prompts, and deterministic SVG visual markers.
Secrets are redacted in `debug-log.json`; provider image data URLs are stored as files instead of inline payloads.
