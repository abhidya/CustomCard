# Production Text Planner GPU Feasibility

Created: 2026-06-27T05:57:15.000Z
Status: blocked
GPU-only ready: no
Base URL: http://127.0.0.1:5013/v1
Requested model: koboldcpp/Magistral-Small-2509-Q4_K_M

## Active Planner

- PID: 46488
- Model path: D:\models\lmstudio-community\Magistral-Small-2509-GGUF\Magistral-Small-2509-Q4_K_M.gguf
- Model size: 13670 MiB
- Assigned GPU ids: 1
- PID listed by nvidia-smi: yes
- Assigned GPU model fit: no
- Assigned GPU estimated fit: no

## GPUs

| GPU | Name | Used MiB | Total MiB | Utilization |
| ---:| --- | ---:| ---:| ---:|
| 0 | NVIDIA GeForce GTX 1080 Ti | 7713 | 11264 | 0% |
| 1 | NVIDIA GeForce GTX 1080 | 7926 | 8192 | 100% |

## Production Planner Candidates

| Candidate | Installed | GPU-only candidate | Hardware blocked | Best file | Fit |
| --- | ---:| ---:| ---:| --- | --- |
| gemma-4-31b-it | yes | no | yes | `D:\models\lmstudio-community\gemma-4-31B-it-QAT-GGUF\gemma-4-31B-it-QAT-Q4_0.gguf` | 16834/11264 MiB model/gpu |
| magistral-small-2509 | yes | no | yes | `D:\models\lmstudio-community\Magistral-Small-2509-GGUF\Magistral-Small-2509-Q4_K_M.gguf` | 13670/11264 MiB model/gpu |
| deepseek-v4-flash | yes | no | yes | `D:\models\DeepSeekV4-Flash-158B-Q4_K_M.gguf` | 14265/11264 MiB model/gpu |
| qwen3-14b-instruct | no | no | no | n/a | n/a |

## Blockers

- Planner model alone is 13670 MiB, larger than assigned GPU capacity 8192 MiB; this implies partial CPU offload under the current local runtime.

## Next Steps

- Use a hosted/self-hosted production planner or a production-floor local model that fully fits a single assigned GPU; do not collect promotion evidence from partial CPU offload.
