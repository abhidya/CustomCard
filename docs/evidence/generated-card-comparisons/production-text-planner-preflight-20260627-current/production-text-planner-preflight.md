# Production Text Planner Preflight

Created: 2026-06-27T00:27:55.388Z
Status: blocked
Promotion ready: no
Run allowed: no
Base URL: http://127.0.0.1:5003/v1
Requested model: koboldcpp/gemma-4-31B-it-Q4_K_M
Active model: koboldcpp/gemma-4-31B-it-Q4_K_M
Classification: production-suitable

## Runtime Contract

- Minimum planner class: 14B+ dense/open-weight planner or stronger hosted model
- Minimum context tokens: 8192
- Reported context tokens: 8192
- Minimum output tokens: 3200
- Max output tokens: 3200

## Blockers

- Planner /models preflight failed: fetch failed

## Warnings

- none

## Next Steps

- Start or point to an OpenAI-compatible planner endpoint before collecting production evidence.
- Keep the full creative planner contract; use -AllowSmallPlanner only for smoke/failure evidence.
