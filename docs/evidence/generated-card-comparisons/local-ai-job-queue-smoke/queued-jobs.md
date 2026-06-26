# Local AI Job Queue

- Run: local-ai-loop-2030-01-01T00-00-00-000Z
- Status: dry-run
- Dry run: true
- Local LLM: qwen3-8b-q4_k_m at http://127.0.0.1:1234/v1
- ComfyUI: http://127.0.0.1:8188
- Image checkpoint: DreamShaper_8_pruned.safetensors
- Human review: admin required before promotion

## Jobs

- job_fe7e91c1e8db0113bbf3439c
  - Story: botanical-birthday
  - Route: ai-card-generate
  - Queue payload: api_jobs.payload, sanitized card fields only
  - Review gate: benchmark score, rendered panels, and copy fidelity must be reviewed before model promotion.

## Queue Result

```json
{
  "status": "dry-run",
  "inserted": 0,
  "skipped": 0
}
```
