# Production Text Promotion Gate

Created: 2026-06-26T22:21:46.669Z
Status: blocked
Promotion ready: no
Evidence index: docs/evidence/generated-card-comparisons/production-text-evidence-index-20260626-current

## Requirements

| Requirement | Status | Details |
| --- | --- | --- |
| live ComfyUI preflight passed | ok | {"preflight":"docs/evidence/generated-card-comparisons/production-text-preflight-20260626T042126Z/production-text-preflight.json","liveComfyReachable":true,"liveNodeAvailable":true} |
| readiness doctor is promotion-ready | fail | {"readiness":"docs/evidence/generated-card-comparisons/production-text-readiness-20260626-current/production-text-readiness.json","blockers":["latest LLM-planned aggregate is passing","configured production planner endpoint is production-suitable","configured production planner is not a small smoke model"]} |
| production-suitable planner endpoint is reachable | fail | {"readiness":"docs/evidence/generated-card-comparisons/production-text-readiness-20260626-current/production-text-readiness.json","activePlannerModels":["koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S"]} |
| no small smoke planner is active or used | fail | {"readinessSmallPlannerActive":true,"benchmarkSmallPlannerUsed":true,"textModels":["koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S"]} |
| LLM-planned customer request matrix completed | fail | {"benchmark":"docs/evidence/generated-card-comparisons/production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow-summary.json","requiredFixtures":["aquarium-lover-birthday","koi-fish-lover-encouragement","dog-lover-thank-you"],"fixtures":["aquarium-lover-birthday","koi-fish-lover-encouragement","dog-lover-thank-you"],"completedRuns":2,"failedRuns":1} |
| final images came from Comfy text composer | ok | {"benchmark":"docs/evidence/generated-card-comparisons/production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow-summary.json","finalImagesRenderedByComfy":true,"deterministicTextComposerUsed":true} |
| planner preserved required terms and avoided forbidden terms | fail | {"benchmark":"docs/evidence/generated-card-comparisons/production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow-summary.json","missingMustInclude":["Nina","aquarium","Morgan","dog"],"mustAvoidFailures":["mockup"]} |
| manual aggregate is promotion-ready | fail | {"aggregate":"docs/evidence/generated-card-comparisons/benchmark-aggregate-2026-06-26-production-text-llm-planner-live/benchmark-aggregate.json","totalRuns":3,"statuses":{"blocked":2,"failed":1},"bestScore":38,"blockingFailures":["Planner missed required recipient/name/theme terms: Nina and aquarium are absent.","Artwork and copy drifted into botanical birthday stationery instead of aquarium-lover stationery.","Back panel is too dark, contains visible text, and does not behave as a sparse no-copy back cover.","Planner missed required recipient/name/theme terms: Morgan and dog are absent.","Copy invents plant-watering context and says the plants are grateful, which contradicts the dog-lover thank-you request.","Local Qwen3-4B planner returned invalid JSON.","The LLM response hit the 2200-token completion cap with finish_reason length.","No image panels were generated for the koi encouragement request."]} |

## Next Steps

- Run the readiness doctor after starting a production-suitable planner endpoint.
- Use Qwen3-4B only for smoke/failure evidence; run promotion evidence with the larger planner endpoint.
- Run the full aquarium/koi/dog production-text matrix to completion.
- Keep the full prompt and retry/repair planner output until must_include and must_avoid checks pass before Comfy work.
- Manually grade every run and regenerate the aggregate only after all candidates pass.
