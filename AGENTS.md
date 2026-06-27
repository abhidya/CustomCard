<!-- headroom:rtk-instructions -->
# RTK (Rust Token Killer) - Token-Optimized Commands

When running shell commands, **always prefix with `rtk`**. This reduces context
usage by 60-90% with zero behavior change. If rtk has no filter for a command,
it passes through unchanged — so it is always safe to use.

## Key Commands
```bash
# Git (59-80% savings)
rtk git status          rtk git diff            rtk git log

# Files & Search (60-75% savings)
rtk ls <path>           rtk read <file>         rtk grep <pattern>
rtk find <pattern>      rtk diff <file>

# Test (90-99% savings) — shows failures only
rtk pytest tests/       rtk cargo test          rtk test <cmd>

# Build & Lint (80-90% savings) — shows errors only
rtk tsc                 rtk lint                rtk cargo build
rtk prettier --check    rtk mypy                rtk ruff check

# Analysis (70-90% savings)
rtk err <cmd>           rtk log <file>          rtk json <file>
rtk summary <cmd>       rtk deps                rtk env

# GitHub (26-87% savings)
rtk gh pr view <n>      rtk gh run list         rtk gh issue list

# Infrastructure (85% savings)
rtk docker ps           rtk kubectl get         rtk docker logs <c>

# Package managers (70-90% savings)
rtk pip list            rtk pnpm install        rtk npm run <script>
```

## Rules
- In command chains, prefix each segment: `rtk git add . && rtk git commit -m "msg"`
- For debugging, use raw command without rtk prefix
- `rtk proxy <cmd>` runs command without filtering but tracks usage
<!-- /headroom:rtk-instructions -->

## Local Node Runtime

This workspace may not have a global `node` or `npm` on PATH. Use the tracked
wrappers instead:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 --version
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run
```

Treat README/SETUP `npm run ...` examples as logical script names. In this
Windows workspace, run them through the wrapper:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run check
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/modelBenchmarkLoopTypography.test.ts
```

Do not use bare `node`, `npm`, `npx`, or raw `vitest` unless you are
debugging the wrapper itself.

Some `package.json` scripts use POSIX inline env assignments such as
`NAME=value node ...`; Windows npm can fail on those. If that happens, inspect
`package.json` and run the underlying `.mjs` with PowerShell env assignment and
the Node wrapper:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -Command '$env:CUSTOMCARD_POSTGRES_INTEGRATION_DOCTOR="enabled"; & .\tools\node.ps1 scripts/postgres-integration-doctor.mjs'
```

Keep `-Command` to short one-liners. For multiline logic, prefer an existing
`tools/*.ps1` helper, a checked-in script, or `-File` with explicit parameters.

`tools/ensure-node.ps1` installs official Node `v24.18.0` into the ignored
`.codex/runtime/node/` directory and verifies the SHA256 checksum from
nodejs.org. The wrappers call it automatically, so future agents do not need a
system Node install.

## PowerShell Command Hygiene

The default shell for this checkout is PowerShell. Avoid Bash-only syntax in
commands and docs-driven copy/paste:

- Do not use `VAR=value command`, heredocs, `printf`, `/tmp/...`, or Unix
  positional globs like `.codex/comfyui/*.log`.
- Prefer `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File ...`
  over nested `powershell -Command "..."`.
- If `-Command` is unavoidable, single-quote the whole command string and use
  double quotes inside so `$env:` and PowerShell variables are not expanded by
  the outer shell.
- For repo searches, do not run broad `rg -uu` from the root without excludes.
  Start with scoped paths and exclude dependency/runtime/evidence bulk:

```powershell
rtk rg -n "pattern" AGENTS.md CLAUDE.md README.md docs scripts src tests -g "!**/node_modules/**" -g "!.codex/runtime/**" -g "!.codex/comfyui/mcp-runtime/**" -g "!docs/evidence/generated-card-comparisons/**" -g "!public/generated/**"
```

## Environment Gotchas

- `.env.local` and `infra/env/.env` are ignored operator files. Never commit
  real values, and do not treat missing pulled Vercel values as proof that a
  sensitive remote env var is absent.
- Vite only exposes `VITE_*` variables to browser code. Keep server secrets
  unprefixed and server-side.
- Walgreens hosted checkout ignores legacy `WALGREENS_VENDOR_MODE` for the
  safety gate. To exercise sandbox/prod checkout paths, set
  `vendorModes.walgreens` through `/api/admin/safety-controls`; otherwise the
  service remains `disabled_until_certified`.

For the local ComfyUI hybrid typography benchmark, use:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-local-typography-benchmark.ps1
```

For production Comfy-side text rendering, the checked-in custom node lives at
`comfyui-custom-nodes/CustomCardTextComposer`. Link it into a ComfyUI install
with:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/install-comfy-customcard-text-node.ps1 -ComfyRoot C:\path\to\ComfyUI
```

Restart ComfyUI after linking and confirm `/object_info` contains
`CustomCardTextComposer` before using
`comfyui-workflows/customcard-production-text-overlay.json`.

Preflight the production text workflow with:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/comfyui-production-text-preflight.mjs
```

Run the full-card production text benchmark with:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-production-text-benchmark.ps1
```

Use the full-card `local` benchmark phase for this workflow. The
`local-typography` phase is only the older hybrid artwork-plus-app-compositor
experiment and does not prove `panel_copy` reaches Comfy.

<!-- headroom:learn:start -->
## Headroom Learned Patterns
*Curated from failure-learning notes plus mined Codex thread summaries on 2026-06-26*

### Shell portability
*~400 tokens/session saved*
- This checkout is usually driven from Windows PowerShell. Do not paste bash
  snippets (`printf`, heredocs, `VAR=value command`) into PowerShell.
- Remote macOS notes still apply when handed off there: `timeout` is not on PATH
  on that host, and bare `python` is not on PATH; use `python3`.
- Nested `powershell -Command "..."` repeatedly broke probes and cleanup via
  quote/variable expansion. Prefer `-File tools/*.ps1`; if unavoidable, use a
  single-quoted one-liner.

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
- On PowerShell, prefer `-g` globs over Unix-style wildcard positional paths
  such as `.codex/comfyui/*.log`.

### Package scripts
*~200 tokens/session saved*
- Use `tools/npm.ps1` through `rtk proxy powershell ... -File`, not bare `npm`.
- Use `npm run test` instead of raw `vitest`; package binaries are available
  through npm scripts, not necessarily the shell PATH.
- If a package script starts with POSIX env assignment (`NAME=value node ...`),
  run the underlying `.mjs` via `tools/node.ps1` with PowerShell `$env:` values.

### Env and provider gates
- Walgreens hosted checkout is controlled by admin safety controls, not just
  `.env.local`: `WALGREENS_VENDOR_MODE=sandbox` alone is ignored by the hosted
  checkout service.
- For Vercel env work, use redacted inventory/repair scripts when possible and
  never echo secrets. `vercel env pull --environment=production` can omit
  encrypted production values.

### OMX team prompts
- OMX team mode looks for `.codex/prompts/planner.md`, `architect.md`, `critic.md`.
- If these files are missing (19+ `file_not_found` occurrences), create them before running omx team commands.
- Check with: `ls .codex/prompts/ 2>/dev/null || echo 'missing'`

### Tmp session directories
- `/tmp/<project>-team-*/` directories are cleaned up on reboot. Save important outputs to the project tree, not /tmp.

<!-- headroom:learn:end -->
