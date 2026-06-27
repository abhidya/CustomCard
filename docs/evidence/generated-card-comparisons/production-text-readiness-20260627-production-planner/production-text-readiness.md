# Production Text Readiness

Created: 2026-06-27T03:34:49.522Z
Status: blocked
Promotion ready: no

## Checks

| Check | Required | Status | Details |
| --- | --- | --- | --- |
| production workflow file exists | yes | ok | {"workflowPath":"comfyui-workflows/customcard-production-text-overlay.json"} |
| CustomCardTextComposer source exists | yes | ok | {"nodeSource":"comfyui-custom-nodes/CustomCardTextComposer"} |
| live ComfyUI reachable | yes | ok | {"comfyUrl":"http://127.0.0.1:8188"} |
| live ComfyUI exposes CustomCardTextComposer | yes | ok | {"comfyUrl":"http://127.0.0.1:8188","objectInfoKeys":1889} |
| latest LLM-planned aggregate exists | no | ok | {"aggregatePath":"docs/evidence/generated-card-comparisons/benchmark-aggregate-2026-06-26-production-text-llm-planner-live/benchmark-aggregate.json"} |
| latest LLM-planned aggregate covers three customer requests | no | ok | {"aggregatePath":"docs/evidence/generated-card-comparisons/benchmark-aggregate-2026-06-26-production-text-llm-planner-live/benchmark-aggregate.json","exists":true,"totalRuns":3,"statuses":{"blocked":2,"failed":1},"bestScore":38,"bestRun":"aquarium-lover-birthday","textModels":["koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S"],"promotionReady":false,"blockingFailures":["Planner missed required recipient/name/theme terms: Nina and aquarium are absent.","Artwork and copy drifted into botanical birthday stationery instead of aquarium-lover stationery.","Back panel is too dark, contains visible text, and does not behave as a sparse no-copy back cover.","Planner missed required recipient/name/theme terms: Morgan and dog are absent.","Copy invents plant-watering context and says the plants are grateful, which contradicts the dog-lover thank-you request.","Local Qwen3-4B planner returned invalid JSON.","The LLM response hit the 2200-token completion cap with finish_reason length.","No image panels were generated for the koi encouragement request."]} |
| latest LLM-planned aggregate is passing | no | fail | {"aggregatePath":"docs/evidence/generated-card-comparisons/benchmark-aggregate-2026-06-26-production-text-llm-planner-live/benchmark-aggregate.json","exists":true,"totalRuns":3,"statuses":{"blocked":2,"failed":1},"bestScore":38,"bestRun":"aquarium-lover-birthday","textModels":["koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S"],"promotionReady":false,"blockingFailures":["Planner missed required recipient/name/theme terms: Nina and aquarium are absent.","Artwork and copy drifted into botanical birthday stationery instead of aquarium-lover stationery.","Back panel is too dark, contains visible text, and does not behave as a sparse no-copy back cover.","Planner missed required recipient/name/theme terms: Morgan and dog are absent.","Copy invents plant-watering context and says the plants are grateful, which contradicts the dog-lover thank-you request.","Local Qwen3-4B planner returned invalid JSON.","The LLM response hit the 2200-token completion cap with finish_reason length.","No image panels were generated for the koi encouragement request."]} |
| higher-quality local planner model is installed | yes | ok | {"modelRoot":"D:\\models","installedQualityPlanners":["D:\\models\\DeepSeekV4-Flash-158B-Q4_K_M.gguf","D:\\models\\gemma-4-31B-it-Q4_K_M.gguf","D:\\models\\lmstudio-community\\gemma-4-31B-it-QAT-GGUF\\gemma-4-31B-it-QAT-Q4_0.gguf","D:\\models\\lmstudio-community\\Magistral-Small-2509-GGUF\\Magistral-Small-2509-Q4_K_M.gguf"]} |
| configured production planner endpoint is reachable | yes | fail | {"configuredPlannerUrls":["http://127.0.0.1:5013/v1"],"discoveryMode":false,"activePlannerEndpoints":[{"baseUrl":"http://127.0.0.1:5013/v1","reachable":false,"activeModel":"","models":[],"smallPlanner":false,"productionSuitable":false,"error":"fetch failed"}]} |
| configured production planner endpoint is production-suitable | yes | fail | {"configuredPlannerUrls":["http://127.0.0.1:5013/v1"],"discoveryMode":false,"activePlannerEndpoints":[{"baseUrl":"http://127.0.0.1:5013/v1","reachable":false,"activeModel":"","models":[],"smallPlanner":false,"productionSuitable":false,"error":"fetch failed"}]} |
| configured production planner is not a small smoke model | yes | ok | {"configuredPlannerUrls":["http://127.0.0.1:5013/v1"],"discoveryMode":false,"activePlannerEndpoints":[{"baseUrl":"http://127.0.0.1:5013/v1","reachable":false,"activeModel":"","models":[],"smallPlanner":false,"productionSuitable":false,"error":"fetch failed"}]} |

## Planner Endpoints

| Endpoint | Reachable | Active model | Context | Output cap | Production suitable |
| --- | --- | --- | --- | --- | --- |
| http://127.0.0.1:5013/v1 | no | fetch failed | n/a | n/a | no |
| http://127.0.0.1:5001/v1 | no | fetch failed | n/a | n/a | no |
| http://127.0.0.1:5003/v1 | yes | koboldcpp/Qwen3-8B-Q4_K_M | 8192 | 3200 | no |

## Aggregate Summary

- Runs: 3
- Best score: 38
- Best run: aquarium-lover-birthday
- Text models: koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S
- Blocking failures: 8
  - Planner missed required recipient/name/theme terms: Nina and aquarium are absent.
  - Artwork and copy drifted into botanical birthday stationery instead of aquarium-lover stationery.
  - Back panel is too dark, contains visible text, and does not behave as a sparse no-copy back cover.
  - Planner missed required recipient/name/theme terms: Morgan and dog are absent.
  - Copy invents plant-watering context and says the plants are grateful, which contradicts the dog-lover thank-you request.
  - Local Qwen3-4B planner returned invalid JSON.
  - The LLM response hit the 2200-token completion cap with finish_reason length.
  - No image panels were generated for the koi encouragement request.

## Next Steps

- Start the configured local/hosted OpenAI-compatible planner endpoint before running promotion evidence.
- Run tools/start-local-card-planner.ps1 with 8192+ context and 3200 output tokens, use a hosted/self-hosted production planner, or point -LocalLlmBaseUrl at that endpoint.
- Promotion gate still needs a passing full LLM-planned matrix, manual grades, and aggregate; readiness only proves the runtime can run it.
