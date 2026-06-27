# Production Text Planner Throughput Probe

Created: 2026-06-27T05:34:18.357Z
Status: blocked
Throughput ready: no
Base URL: http://127.0.0.1:5013/v1
Model: koboldcpp/Magistral-Small-2509-Q4_K_M
Fixture: aquarium-lover-birthday
Duration: 300056ms
Request timeout: 300000ms
Finish reason: n/a
Local GPU residency: proven

## Contract Checks

- Full prompt chars: 15313
- Response status: n/a
- Response text chars: 0
- JSON parse: blocked
- Schema: blocked
- Missing must_include: Nina, birthday, aquarium
- must_avoid failures: none

## Blockers

- Planner throughput request timed out after 300000ms.
- Planner output is not a JSON object.
- Planner output is missing theme_guide.
- Expected 4 panels, got 0.
- Missing panel front.
- Missing panel inside-left.
- Missing panel inside-right.
- Missing panel back.
- Missing required term: Nina
- Missing required term: birthday
- Missing required term: aquarium

## Next Steps

- Use a faster production-class planner endpoint; do not reduce the full creative card-copy contract.
- Keep the runtime class but retry/repair planner output before spending Comfy image work.
