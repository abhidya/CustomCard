<!-- headroom:learn:start -->
## Headroom Learned Patterns
*Curated from failure-learning notes plus mined Codex thread summaries on 2026-06-26*

### Shell portability
*~400 tokens/session saved*
- The local checkout usually runs under Windows PowerShell. Do not paste bash
  snippets (`printf`, heredocs, `VAR=value command`, `/tmp/...`) into commands.
- Remote macOS notes still apply when handed off there: `timeout` is not on PATH
  on that host, and bare `python` is not on PATH; use `python3`.
- Nested `powershell -Command "..."` repeatedly broke probes/cleanup because
  `$env:` and script variables expanded in the outer shell. Prefer
  `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/*.ps1`.
- If `-Command` is unavoidable, keep it to a short single-quoted one-liner and
  use double quotes inside.

### Read before Edit
*~300 tokens/session saved*
- Read a file in the same turn before edit-style tools that require prior file state; skipping the read causes a full failed tool round-trip.

### File path corrections
*~250 tokens/session saved*
- `/Users/abdulrehmanbhidya/.codex/skills/.system/analyze/SKILL.md` -> actually use `/Users/abdulrehmanbhidya/.codex/skills/analyze/SKILL.md`
- `/Users/abdulrehmanbhidya/.codex/skills/.system/ai-slop-cleaner/SKILL.md` -> actually use `/Users/abdulrehmanbhidya/.codex/skills/ai-slop-cleaner/SKILL.md`
- `/Users/abdulrehmanbhidya/Documents/CodexCustomCard/docs/legal` -> actually use `/Users/abdulrehmanbhidya/Documents/CodexCustomCard/dist/legal`
- `/Users/abdulrehmanbhidya/Documents/CodexCustomCard/docs/legal` -> actually use `/Users/abdulrehmanbhidya/Documents/CodexCustomCard/public/legal/`
- `/Users/abdulrehmanbhidya/Documents/CodexCustomCard/apps/mobile/vite.config.ts` -> actually use `/Users/abdulrehmanbhidya/Documents/CodexCustomCard/vite.config.ts`

### Agent concurrency
*~200 tokens/session saved*
- Claude/Codex subagent bursts have hit transient 429 rate limits here. Reduce concurrent fan-out or retry later when several subagents fail immediately.

### Search scope
*~200 tokens/session saved*
- If a narrow search returns no matches, widen with `rg --files` or search from the repo root before assuming the symbol/file is absent.
- Do not run broad root `rg -uu` without excludes. Exclude `**/node_modules/**`,
  `.codex/runtime/**`, `.codex/comfyui/mcp-runtime/**`,
  `docs/evidence/generated-card-comparisons/**`, and `public/generated/**`.
- On PowerShell, use `-g` globs instead of Unix-style wildcard positional paths
  such as `.codex/comfyui/*.log`.

### Package scripts
*~200 tokens/session saved*
- This workspace may not have global `node`/`npm`. Use the checked-in wrappers:
  `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1`
  and `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1`.
- Treat docs' `npm run ...` examples as logical script names; execute through
  `tools/npm.ps1`, and use `npm run test` instead of raw `vitest`.
- If a package script starts with POSIX env assignment (`NAME=value node ...`),
  run the underlying `.mjs` via `tools/node.ps1` with PowerShell `$env:` values.

### Env and provider gates
- `.env.local` and `infra/env/.env` are ignored operator files; never commit
  real values and do not infer remote Vercel state from a missing pulled secret.
- Vite exposes only `VITE_*` variables to browser code; keep server secrets
  unprefixed and server-side.
- Walgreens hosted checkout ignores legacy `WALGREENS_VENDOR_MODE` for the
  safety gate. Use `/api/admin/safety-controls` and set
  `vendorModes.walgreens` to `sandbox` or `production`.

### Check/test output pattern
- Use the wrapper and a Windows-safe temp path:
  `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run check *> "$env:TEMP\customcard-check.log"`
- Parse result with PowerShell:
  `rtk proxy powershell -NoProfile -Command 'Select-String -Path "$env:TEMP\customcard-check.log" -Pattern "Test Files|Tests |passed|failed|vuln"'`

<!-- headroom:learn:end -->

## Manual Ops Notes

### Updating Vercel environment variables

- Use `rtk vercel env ls` first to confirm the project is linked and the target env exists.
- For existing encrypted/sensitive variables, replace them with an explicit remove + add. Do not rely on `vercel env add --force`; it may not update an existing encrypted value even when it exits successfully.
- Prefer the redacted repo scripts for inventory/repair when possible:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run hosted:env:inventory
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run hosted:env:repair
```

- Do not echo secrets in terminal output. On PowerShell, pipe values through
  stdin without printing them:

```powershell
rtk vercel env rm WALGREENS_VENDOR_MODE production --yes
$env:WALGREENS_VENDOR_MODE | rtk vercel env add WALGREENS_VENDOR_MODE production --yes --sensitive
```

- Repeat for each key and environment (`production`, `preview`, or `development`) intentionally. For production Walgreens hosted checkout, keep `PUBLIC_APP_ORIGIN=https://customcard-three.vercel.app`.
- Verify replacement with metadata, not secret values:

```powershell
rtk vercel env ls | rtk rg "WALGREENS_|PUBLIC_APP_ORIGIN"
```

- `vercel env pull --environment=production` may omit encrypted production values, so do not treat a missing pulled value as proof that the remote variable is absent.
