import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildCardCopyPrompt, requiredPanelIds } from "./ai-card-draft-policy.mjs";
import { inspectLocalKoboldGpuResidency } from "./local-kobold-gpu-residency.mjs";
import { productionTextRequestFixtures } from "./model-benchmark-loop.mjs";
import { classifyProductionTextPlanner } from "./production-text-planner-policy.mjs";
import { getAiFlowDefinition } from "../src/aiFlowConfigData.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const defaultOutputRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");
const defaultRequestTimeoutMs = 300_000;

if (isMainModule()) {
  const result = await runProductionTextPlannerThroughputProbe(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify({
    status: result.status,
    throughputReady: result.throughputReady,
    baseUrl: result.baseUrl,
    model: result.model,
    fixtureId: result.fixtureId,
    durationMs: result.durationMs,
    finishReason: result.finishReason || "",
    blockers: result.blockers.length
  }, null, 2));
  if (!result.advisory && !result.throughputReady) process.exitCode = 1;
}

export async function runProductionTextPlannerThroughputProbe(args = {}, options = {}) {
  const advisory = Boolean(args.advisory);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const outputRoot = resolve(String(args["output-root"] || defaultOutputRoot));
  const reportDir = resolve(String(args["output-dir"] || `${outputRoot}/production-text-planner-throughput-${timestamp()}`));
  const baseUrl = firstUsableValue(args["base-url"], process.env.CUSTOMCARD_LOCAL_LLM_BASE_URL, process.env.LMSTUDIO_BASE_URL, process.env.KOBOLDCPP_BASE_URL);
  const endpoint = baseUrl ? plannerEndpoint(baseUrl) : undefined;
  const model = firstUsableValue(args.model, process.env.CUSTOMCARD_LOCAL_LLM_MODEL, process.env.LMSTUDIO_MODEL, process.env.KOBOLDCPP_MODEL);
  const apiKey = firstUsableValue(args["api-key"], process.env.CUSTOMCARD_LOCAL_LLM_API_KEY, process.env.LMSTUDIO_API_KEY, process.env.KOBOLDCPP_API_KEY);
  const requestTimeoutMs = boundedInteger(args["request-timeout-ms"], 10_000, 3_600_000, defaultRequestTimeoutMs);
  const reportedContextTokens = boundedInteger(args["reported-context-tokens"], 0, 1_000_000, 0);
  const maxOutputTokens = boundedInteger(args["max-output-tokens"], 1, 64_000, 3200);
  const fixtureId = String(args.fixture || args["fixture-id"] || "aquarium-lover-birthday");
  const fixture = productionTextRequestFixtures.find((item) => item.id === fixtureId) || productionTextRequestFixtures[0];
  const draftInput = {
    ...fixture.request,
    must_include: fixture.must_include,
    must_avoid: fixture.must_avoid
  };
  const prompt = buildCardCopyPrompt(draftInput);
  const flow = getAiFlowDefinition("card-copy");
  const classification = classifyProductionTextPlanner(model, {
    allowSmall: args["allow-small"],
    allowUnknownProductionModel: args["allow-unknown-production-model"],
    reportedContextTokens,
    maxOutputTokens,
    requireRuntimeBudget: true
  });
  const localGpuResidency = endpoint
    ? inspectLocalKoboldGpuResidency(endpoint.baseUrl, { probe: options.gpuResidencyProbe })
    : { required: false, ok: true, status: "not-checked", baseUrl: "" };
  const preflightBlockers = [
    ...(!endpoint ? ["Planner base URL is missing."] : []),
    ...(endpoint?.error ? [endpoint.error] : []),
    ...(!model ? ["Planner model is missing."] : []),
    ...(localGpuResidency.required && !localGpuResidency.ok ? [localGpuResidency.blocker] : [])
  ];

  let providerFailure = "";
  let responseStatus = 0;
  let text = "";
  let finishReason = "";
  let parsedJson;
  let jsonParseError = "";
  const started = Date.now();

  if (!preflightBlockers.length && classification.productionSuitable) {
    try {
      const modelsProbe = await probeModels(endpoint.modelsUrl, { fetchImpl, apiKey, timeoutMs: Math.min(requestTimeoutMs, 60_000) });
      if (!modelsProbe.reachable) {
        preflightBlockers.push(`Planner /models preflight failed: ${modelsProbe.error}`);
      } else if (!modelsProbe.models.some((item) => normalizeModelId(item) === normalizeModelId(model))) {
        preflightBlockers.push(`Planner /models did not report the requested model '${model}'. Loaded models: ${modelsProbe.models.join(", ") || "none"}.`);
      }
    } catch (error) {
      preflightBlockers.push(`Planner /models preflight failed: ${errorMessage(error)}`);
    }
  }

  if (!preflightBlockers.length && classification.productionSuitable) {
    try {
      const response = await fetchJsonWithTimeout(fetchImpl, endpoint.chatUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: flow.promptInstructions },
            { role: "user", content: prompt }
          ],
          temperature: 0.62,
          max_tokens: maxOutputTokens
        })
      }, requestTimeoutMs);
      responseStatus = response.status;
      if (!response.ok) {
        providerFailure = `Planner chat completion returned HTTP ${response.status}.`;
      } else {
        const payload = await response.json();
        finishReason = String(payload?.choices?.[0]?.finish_reason ?? payload?.choices?.[0]?.finishReason ?? payload?.finish_reason ?? "");
        text = extractText(payload);
        try {
          parsedJson = parseJsonFromText(text);
        } catch (error) {
          jsonParseError = errorMessage(error);
        }
      }
    } catch (error) {
      providerFailure = errorMessage(error);
    }
  }

  const durationMs = Date.now() - started;
  const validation = parsedJson
    ? validateProbeOutput(parsedJson, draftInput)
    : {
        schemaOk: false,
        panelIds: [],
        missingMustInclude: [],
        mustAvoidFailures: [],
        issues: []
      };
  const blockers = [
    ...preflightBlockers,
    ...classification.blockers,
    ...(providerFailure ? [providerFailure] : []),
    ...(finishReason.toLowerCase() === "length" ? ["Planner stopped with finish_reason=length before completing the full card-copy JSON."] : []),
    ...(!providerFailure && !text ? ["Planner response did not contain text."] : []),
    ...(jsonParseError ? [`Planner response was not parseable JSON: ${jsonParseError}`] : []),
    ...validation.issues
  ];
  const throughputReady = blockers.length === 0 && Boolean(parsedJson);
  const result = {
    createdAtIso: new Date().toISOString(),
    status: throughputReady ? "throughput-ready" : "blocked",
    throughputReady,
    promotionReady: false,
    advisory,
    baseUrl: endpoint?.baseUrl || "",
    modelsUrl: endpoint?.modelsUrl || "",
    chatUrl: endpoint?.chatUrl || "",
    model,
    fixtureId: fixture.id,
    requestTimeoutMs,
    reportedContextTokens,
    maxOutputTokens,
    promptChars: prompt.length,
    durationMs,
    responseStatus,
    finishReason,
    textChars: text.length,
    localGpuResidency,
    classification,
    providerFailure,
    jsonParseOk: Boolean(parsedJson),
    jsonParseError,
    schemaOk: validation.schemaOk,
    missingMustInclude: validation.missingMustInclude,
    mustAvoidFailures: validation.mustAvoidFailures,
    panelIds: validation.panelIds,
    blockers,
    nextSteps: buildNextSteps({ blockers, throughputReady })
  };

  mkdirSync(reportDir, { recursive: true });
  result.reportDir = relativePath(reportDir);
  writeJson(resolve(reportDir, "production-text-planner-throughput.json"), result);
  writeMarkdown(resolve(reportDir, "production-text-planner-throughput.md"), buildMarkdown(result));
  return result;
}

function plannerEndpoint(value) {
  try {
    const baseUrl = normalizeOpenAiBaseUrl(value);
    const parsed = new URL(baseUrl);
    const local = ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(parsed.hostname.toLowerCase());
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && local)) {
      return { baseUrl, modelsUrl: "", chatUrl: "", error: `Planner URL must be HTTPS unless it is localhost HTTP: ${baseUrl}` };
    }
    const root = baseUrl.replace(/\/$/, "");
    return {
      baseUrl: root,
      modelsUrl: `${root}/models`,
      chatUrl: `${root}/chat/completions`
    };
  } catch (error) {
    return { baseUrl: String(value || ""), modelsUrl: "", chatUrl: "", error: `Planner base URL is invalid: ${errorMessage(error)}` };
  }
}

function normalizeOpenAiBaseUrl(value) {
  const parsed = new URL(String(value));
  let path = parsed.pathname.replace(/\/+$/, "");
  if (path.endsWith("/chat/completions")) path = path.slice(0, -"/chat/completions".length).replace(/\/+$/, "");
  if (path.endsWith("/models")) path = path.slice(0, -"/models".length).replace(/\/+$/, "");
  if (!path.endsWith("/v1")) path = `${path}/v1`;
  parsed.pathname = path.replace(/\/{2,}/g, "/");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

async function probeModels(modelsUrl, { fetchImpl, timeoutMs, apiKey }) {
  if (!modelsUrl) return { reachable: false, models: [], error: "Planner /models URL was not available." };
  const response = await fetchJsonWithTimeout(fetchImpl, modelsUrl, {
    headers: apiKey ? { authorization: `Bearer ${apiKey}` } : {}
  }, timeoutMs);
  if (!response.ok) return { reachable: false, models: [], error: `HTTP ${response.status}` };
  const body = await response.json();
  return {
    reachable: true,
    models: (body?.data || []).map((item) => String(item?.id || "")).filter(Boolean)
  };
}

async function fetchJsonWithTimeout(fetchImpl, url, init, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`Planner throughput request timed out after ${timeoutMs}ms.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function extractText(data) {
  const parsedMessage = data?.choices?.[0]?.message?.parsed;
  if (parsedMessage && typeof parsedMessage === "object") return JSON.stringify(parsedMessage);
  return String(
    data?.choices?.[0]?.message?.content ??
    data?.output_text ??
    data?.response ??
    ""
  );
}

function parseJsonFromText(text) {
  const trimmed = String(text ?? "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("AI text provider did not return parseable JSON.");
  }
}

function validateProbeOutput(payload, input) {
  const issues = [];
  const panels = Array.isArray(payload?.panels) ? payload.panels : [];
  const panelIds = panels.map((panel) => panel?.id).filter(Boolean);
  if (!payload || typeof payload !== "object") issues.push("Planner output is not a JSON object.");
  if (!payload?.theme_guide || typeof payload.theme_guide !== "object") issues.push("Planner output is missing theme_guide.");
  if (panels.length !== requiredPanelIds.length) issues.push(`Expected ${requiredPanelIds.length} panels, got ${panels.length}.`);
  for (const panelId of requiredPanelIds) {
    if (!panelIds.includes(panelId)) issues.push(`Missing panel ${panelId}.`);
  }
  const validationText = cardCopyValidationText(payload);
  const missingMustInclude = (input.must_include || []).filter((term) => !textContains(validationText, term));
  const mustAvoidFailures = (input.must_avoid || []).filter((term) => textContains(validationText, term));
  for (const term of missingMustInclude) issues.push(`Missing required term: ${term}`);
  for (const term of mustAvoidFailures) issues.push(`Forbidden term present: ${term}`);
  return {
    schemaOk: issues.length === missingMustInclude.length + mustAvoidFailures.length,
    panelIds,
    missingMustInclude,
    mustAvoidFailures,
    issues
  };
}

function cardCopyValidationText(cardCopy) {
  return [
    cardCopy?.theme_guide?.theme_title,
    ...(cardCopy?.theme_guide?.palette || []),
    ...(cardCopy?.theme_guide?.motifs || []),
    cardCopy?.theme_guide?.border_style,
    cardCopy?.theme_guide?.front_back_pairing,
    cardCopy?.theme_guide?.interior_pairing,
    ...(cardCopy?.panels || []).flatMap((panel) => [
      panel.headline,
      panel.body,
      panel.art_direction,
      panel.visual_cue,
      panel.image_prompt
    ])
  ].join(" ");
}

function buildNextSteps({ blockers, throughputReady }) {
  if (throughputReady) return ["Run the full production-text matrix with this exact endpoint/model before promotion evidence."];
  const joined = blockers.join("\n");
  const steps = [];
  if (/GPU|nvidia/i.test(joined)) steps.push("Restart the local planner with GPU offload and prove the serving PID appears in nvidia-smi.");
  if (/timed out|finish_reason=length/i.test(joined)) steps.push("Use a faster production-class planner endpoint; do not reduce the full creative card-copy contract.");
  if (/parseable JSON|Missing required term|Forbidden term/i.test(joined)) steps.push("Keep the runtime class but retry/repair planner output before spending Comfy image work.");
  if (!steps.length) steps.push("Fix the planner throughput blockers, then rerun this probe before the full image benchmark.");
  return unique(steps);
}

function buildMarkdown(result) {
  const lines = [
    "# Production Text Planner Throughput Probe",
    "",
    `Created: ${result.createdAtIso}`,
    `Status: ${result.status}`,
    `Throughput ready: ${result.throughputReady ? "yes" : "no"}`,
    `Base URL: ${result.baseUrl || "n/a"}`,
    `Model: ${result.model || "n/a"}`,
    `Fixture: ${result.fixtureId}`,
    `Duration: ${result.durationMs}ms`,
    `Request timeout: ${result.requestTimeoutMs}ms`,
    `Finish reason: ${result.finishReason || "n/a"}`,
    `Local GPU residency: ${result.localGpuResidency.required ? (result.localGpuResidency.ok ? "proven" : "blocked") : "not required"}`,
    "",
    "## Contract Checks",
    "",
    `- Full prompt chars: ${result.promptChars}`,
    `- Response status: ${result.responseStatus || "n/a"}`,
    `- Response text chars: ${result.textChars}`,
    `- JSON parse: ${result.jsonParseOk ? "ok" : "blocked"}`,
    `- Schema: ${result.schemaOk ? "ok" : "blocked"}`,
    `- Missing must_include: ${result.missingMustInclude.join(", ") || "none"}`,
    `- must_avoid failures: ${result.mustAvoidFailures.join(", ") || "none"}`,
    "",
    "## Blockers",
    ""
  ];
  if (result.blockers.length) {
    for (const blocker of result.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push("- none");
  }
  lines.push("", "## Next Steps", "");
  for (const step of result.nextSteps) lines.push(`- ${step}`);
  return `${lines.join("\n")}\n`;
}

function firstUsableValue(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text && !["__UNSET__", "placeholder", "changeme"].includes(text)) return text;
  }
  return "";
}

function textContains(value, term) {
  const haystack = cleanText(value).toLowerCase();
  const needle = cleanText(term).toLowerCase();
  return !needle || haystack.includes(needle);
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeModelId(value) {
  return String(value || "").trim().toLowerCase().replace(/^koboldcpp\//, "").replace(/\.gguf$/, "");
}

function boundedInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, value);
}

function relativePath(filePath) {
  return resolve(filePath).replace(`${repoRoot}\\`, "").replaceAll("\\", "/");
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const [key, inlineValue] = value.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
    } else if (values[index + 1] && !values[index + 1].startsWith("--")) {
      parsed[key] = values[index + 1];
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error ?? "unknown error");
}

function isMainModule() {
  return process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replaceAll("\\", "/")}`).href;
}
