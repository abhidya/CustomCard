# Production Text Planner Preflight

Created: 2026-06-26T23:09:30.041Z
Status: blocked
Promotion ready: no
Run allowed: no
Base URL: http://127.0.0.1:5001/v1
Active model: koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S
Classification: smoke-only

## Runtime Contract

- Minimum planner class: 14B+ dense/open-weight planner or stronger hosted model
- Minimum context tokens: 8192
- Reported context tokens: 4096
- Minimum output tokens: 2200
- Max output tokens: 3200

## Blockers

- Planner /models preflight failed: fetch failed
- Planner model 'koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S' is below the production model floor for production text and is smoke-only; use Gemma 31B, Magistral Small, Qwen3 14B+, or a stronger hosted planner.
- Planner context 4096 is below the production minimum 8192; 4096-token local runs are smoke-only.

## Warnings

- none

## Next Steps

- Start or point to an OpenAI-compatible planner endpoint before collecting production evidence.
- Use a production planner such as koboldcpp/gemma-4-31B-it-Q4_K_M, koboldcpp/Magistral-Small-2509-Q4_K_M, koboldcpp/Qwen3-14B-Q4_K_M with 8192+ context tokens.
- Keep the full creative planner contract; use -AllowSmallPlanner only for smoke/failure evidence.
