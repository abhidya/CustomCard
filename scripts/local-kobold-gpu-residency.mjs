import { execFileSync } from "node:child_process";

export function inspectLocalKoboldGpuResidency(baseUrl, options = {}) {
  const endpoint = localEndpoint(baseUrl);
  if (!endpoint.local || !endpoint.port) {
    return {
      required: false,
      ok: true,
      status: "not-required",
      baseUrl: normalizeBaseUrl(baseUrl),
      reason: "GPU residency can only be inspected for local planner endpoints."
    };
  }

  if (typeof options.probe === "function") {
    return normalizeProbeResult(options.probe({ baseUrl: endpoint.baseUrl, port: endpoint.port }), endpoint);
  }

  try {
    const processes = options.processes || listKoboldProcesses();
    const matchingProcesses = processes.filter((processInfo) =>
      String(processInfo.name || "").toLowerCase() === "koboldcpp.exe" &&
      commandLineHasPort(processInfo.commandLine, endpoint.port)
    );
    const gpuFlaggedProcesses = matchingProcesses.filter((processInfo) =>
      commandLineUsesGpu(processInfo.commandLine)
    );
    const nvidiaProcessIds = options.nvidiaProcessIds || listNvidiaSmiProcessIds();
    const gpuResidentProcesses = gpuFlaggedProcesses.filter((processInfo) =>
      nvidiaProcessIds.includes(Number(processInfo.pid))
    );

    if (!matchingProcesses.length) {
      return blocked(endpoint, "No local KoboldCPP process was found for the planner port.", {
        nvidiaProcessIds
      });
    }
    if (!gpuFlaggedProcesses.length) {
      return blocked(endpoint, "Local KoboldCPP planner process does not declare GPU offload flags.", {
        candidatePids: matchingProcesses.map((item) => item.pid),
        nvidiaProcessIds
      });
    }
    if (!gpuResidentProcesses.length) {
      return blocked(endpoint, "Local KoboldCPP planner has GPU flags but its PID is not listed by nvidia-smi.", {
        candidatePids: gpuFlaggedProcesses.map((item) => item.pid),
        nvidiaProcessIds
      });
    }

    return {
      required: true,
      ok: true,
      status: "gpu-backed",
      baseUrl: endpoint.baseUrl,
      port: endpoint.port,
      pids: gpuResidentProcesses.map((item) => Number(item.pid)),
      candidatePids: gpuFlaggedProcesses.map((item) => Number(item.pid)),
      nvidiaProcessIds
    };
  } catch (error) {
    return blocked(endpoint, `Could not inspect local KoboldCPP GPU residency: ${errorMessage(error)}`);
  }
}

export function missingLocalGpuResidencyEvidence(baseUrl) {
  const endpoint = localEndpoint(baseUrl);
  if (!endpoint.local || !endpoint.port) {
    return {
      required: false,
      ok: true,
      status: "not-required",
      baseUrl: normalizeBaseUrl(baseUrl)
    };
  }
  return blocked(endpoint, "Local planner preflight did not record GPU residency evidence.");
}

function normalizeProbeResult(value, endpoint) {
  if (value === true) {
    return {
      required: true,
      ok: true,
      status: "gpu-backed",
      baseUrl: endpoint.baseUrl,
      port: endpoint.port
    };
  }
  const result = value && typeof value === "object" ? value : {};
  const required = result.required ?? true;
  const ok = Boolean(result.ok);
  return {
    required,
    ok: !required || ok,
    status: result.status || (!required ? "not-required" : ok ? "gpu-backed" : "blocked"),
    baseUrl: result.baseUrl || endpoint.baseUrl,
    port: result.port || endpoint.port,
    pids: Array.isArray(result.pids) ? result.pids.map(Number).filter(Number.isFinite) : [],
    candidatePids: Array.isArray(result.candidatePids) ? result.candidatePids.map(Number).filter(Number.isFinite) : [],
    nvidiaProcessIds: Array.isArray(result.nvidiaProcessIds)
      ? result.nvidiaProcessIds.map(Number).filter(Number.isFinite)
      : [],
    blocker: result.blocker || result.reason || (ok ? "" : "Local KoboldCPP planner GPU residency was not proven.")
  };
}

function localEndpoint(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  try {
    const parsed = new URL(normalized);
    return {
      baseUrl: normalized,
      local: ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(parsed.hostname.toLowerCase()),
      port: Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80))
    };
  } catch {
    return {
      baseUrl: String(baseUrl || ""),
      local: false,
      port: 0
    };
  }
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function blocked(endpoint, blocker, extra = {}) {
  return {
    required: true,
    ok: false,
    status: "blocked",
    baseUrl: endpoint.baseUrl,
    port: endpoint.port,
    blocker,
    ...extra
  };
}

function listKoboldProcesses() {
  if (process.platform !== "win32") {
    throw new Error("local KoboldCPP GPU residency probe currently supports Windows process inspection only");
  }
  const output = execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "Get-CimInstance Win32_Process -Filter \"Name='koboldcpp.exe'\" | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Depth 3"
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  ).trim();
  if (!output) return [];
  const parsed = JSON.parse(output);
  return (Array.isArray(parsed) ? parsed : [parsed]).map((item) => ({
    pid: Number(item.ProcessId),
    name: String(item.Name || ""),
    commandLine: String(item.CommandLine || "")
  })).filter((item) => Number.isFinite(item.pid));
}

function listNvidiaSmiProcessIds() {
  const queried = parseNvidiaSmiPids(runNvidiaSmi(["--query-compute-apps=pid", "--format=csv,noheader,nounits"]));
  if (queried.length) return queried;
  return parseNvidiaSmiPids(runNvidiaSmi([]));
}

function runNvidiaSmi(args) {
  return execFileSync("nvidia-smi", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function parseNvidiaSmiPids(output) {
  const pids = [];
  for (const line of String(output || "").split(/\r?\n/)) {
    const queryMatch = line.match(/^\s*(\d+)\s*$/);
    if (queryMatch) {
      pids.push(Number(queryMatch[1]));
      continue;
    }
    const tableMatch = line.match(/\|\s+\d+\s+N\/A\s+N\/A\s+(\d+)\s+(?:C|G|C\+G)\s+/);
    if (tableMatch) pids.push(Number(tableMatch[1]));
  }
  return Array.from(new Set(pids.filter(Number.isFinite)));
}

function commandLineHasPort(commandLine, port) {
  return new RegExp(`(^|\\s)--port\\s+${escapeRegExp(String(port))}(\\s|$)`).test(String(commandLine || ""));
}

function commandLineUsesGpu(commandLine) {
  const text = String(commandLine || "");
  return /(^|\s)--use(cuda|cublas|hipblas|vulkan)(\s|$)/.test(text) &&
    /(^|\s)--(gpulayers|gpu-layers|n-gpu-layers|ngl)\s+[1-9][0-9]*(\s|$)/.test(text) &&
    !/(^|\s)--usecpu(\s|$)/.test(text) &&
    !/(^|\s)--(gpulayers|gpu-layers|n-gpu-layers|ngl)\s+0(\s|$)/.test(text);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
