# Production Text Promotion Gate

Created: 2026-06-27T00:28:24.659Z
Status: blocked
Promotion ready: no
Evidence index: docs/evidence/generated-card-comparisons/production-text-evidence-index-20260627-current

## Requirements

| Requirement | Status | Details |
| --- | --- | --- |
| live ComfyUI preflight passed | fail | {"preflight":"docs/evidence/generated-card-comparisons/production-text-preflight-20260627-current/production-text-preflight.json","preflightCreatedAtIso":"2026-06-27T00:13:50.740Z","liveComfyReachable":false,"liveNodeAvailable":false} |
| live ComfyUI proof is current | fail | {"preflight":"docs/evidence/generated-card-comparisons/production-text-preflight-20260627-current/production-text-preflight.json","preflightCreatedAtIso":"2026-06-27T00:13:50.740Z","readiness":"docs/evidence/generated-card-comparisons/production-text-readiness-20260627-current/production-text-readiness.json","readinessCreatedAtIso":"2026-06-27T00:28:10.486Z","preflightLiveComfyReachable":false,"preflightLiveNodeAvailable":false,"readinessComfyReachable":false,"readinessHasTextComposer":false,"staleReason":"latest live Comfy preflight did not pass"} |
| planner preflight is production-ready | fail | {"plannerPreflight":"docs/evidence/generated-card-comparisons/production-text-planner-preflight-20260627-current/production-text-planner-preflight.json","activeModel":"koboldcpp/gemma-4-31B-it-Q4_K_M","classification":"production-suitable","reportedContextTokens":8192,"maxOutputTokens":3200,"blockers":["Planner /models preflight failed: fetch failed"]} |
| readiness doctor is promotion-ready | fail | {"readiness":"docs/evidence/generated-card-comparisons/production-text-readiness-20260627-current/production-text-readiness.json","blockers":["live ComfyUI reachable","live ComfyUI exposes CustomCardTextComposer","latest LLM-planned aggregate is passing","configured production planner endpoint is reachable","configured production planner endpoint is production-suitable"]} |
| local model coverage is tracked | ok | {"modelCoverage":"docs/evidence/generated-card-comparisons/local-model-coverage-20260627-current/local-model-coverage.json","installedModelFiles":47,"recommendedInstalled":9,"recommendedEvaluated":3,"recommendedMissing":1} |
| production planner candidate is available | ok | {"modelCoverage":"docs/evidence/generated-card-comparisons/local-model-coverage-20260627-current/local-model-coverage.json","readiness":"docs/evidence/generated-card-comparisons/production-text-readiness-20260627-current/production-text-readiness.json","productionSuitablePlannerReachable":false,"installedProductionPlanners":["gemma-4-31b-it","magistral-small-2509","deepseek-v4-flash"],"unevaluatedProductionPlanners":["gemma-4-31b-it","magistral-small-2509","deepseek-v4-flash"],"missingProductionPlanners":["qwen3-14b-instruct"]} |
| production-suitable planner endpoint is reachable | fail | {"readiness":"docs/evidence/generated-card-comparisons/production-text-readiness-20260627-current/production-text-readiness.json","activePlannerModels":[]} |
| no small smoke planner is active or used | fail | {"readinessSmallPlannerActive":false,"benchmarkSmallPlannerUsed":true,"textModels":["koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S"]} |
| LLM-planned customer request matrix completed | fail | {"benchmark":"docs/evidence/generated-card-comparisons/production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow-summary.json","requiredFixtures":["aquarium-lover-birthday","koi-fish-lover-encouragement","dog-lover-thank-you"],"fixtures":["aquarium-lover-birthday","koi-fish-lover-encouragement","dog-lover-thank-you"],"completedRuns":2,"failedRuns":1} |
| final images came from Comfy text composer | ok | {"benchmark":"docs/evidence/generated-card-comparisons/production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow-summary.json","finalImagesRenderedByComfy":true,"deterministicTextComposerUsed":true} |
| planner preserved required terms and avoided forbidden terms | fail | {"benchmark":"docs/evidence/generated-card-comparisons/production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow-summary.json","missingMustInclude":["Nina","aquarium","Morgan","dog"],"mustAvoidFailures":["mockup"]} |
| manual grade checklist is promotion-ready | fail | {"manualGradeChecklist":"docs/evidence/generated-card-comparisons/production-text-manual-grade-checklist-20260626-current/production-text-manual-grade-checklist.json","totalRuns":3,"gradableRuns":2,"gradedGeneratedRuns":2,"missingGrades":0,"invalidGrades":0,"failedBeforeImageGeneration":1,"blockers":["3 manual grade(s) are blocked or failed.","1 run(s) failed before image generation.","Automated must_include checks failed for: Nina, aquarium, Morgan, dog.","Automated must_avoid checks failed for: mockup."]} |
| manual aggregate is promotion-ready | fail | {"aggregate":"docs/evidence/generated-card-comparisons/benchmark-aggregate-2026-06-26-production-text-llm-planner-live/benchmark-aggregate.json","totalRuns":3,"statuses":{"blocked":2,"failed":1},"bestScore":38,"blockingFailures":["Planner missed required recipient/name/theme terms: Nina and aquarium are absent.","Artwork and copy drifted into botanical birthday stationery instead of aquarium-lover stationery.","Back panel is too dark, contains visible text, and does not behave as a sparse no-copy back cover.","Planner missed required recipient/name/theme terms: Morgan and dog are absent.","Copy invents plant-watering context and says the plants are grateful, which contradicts the dog-lover thank-you request.","Local Qwen3-4B planner returned invalid JSON.","The LLM response hit the 2200-token completion cap with finish_reason length.","No image panels were generated for the koi encouragement request."]} |

## Next Steps

- Run production-text live preflight with ComfyUI and CustomCardTextComposer loaded.
- Refresh live ComfyUI preflight after the current readiness probe, with CustomCardTextComposer loaded.
- Run production-text planner preflight with a production-suitable model, 8192+ context, and the full output budget.
- Run the planner preflight and readiness doctor after starting a production-suitable planner endpoint with 8192+ context.
- Use Qwen3-4B/8B only for smoke/failure evidence; run promotion evidence with Gemma 31B, Magistral Small, Qwen3-14B+, or a hosted/self-hosted production planner.
- Run the full aquarium/koi/dog production-text matrix to completion.
- Keep the full prompt and correct planner runtime; retry/repair planner output until must_include and must_avoid checks pass before Comfy work.
- Run the manual grade checklist after grading every generated run, then resolve missing/invalid/blocked grades before aggregation.
- Manually grade every run and regenerate the aggregate only after all candidates pass.
