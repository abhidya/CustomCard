import { classifyProductionTextPlanner } from "./production-text-planner-policy.mjs";

if (isMainModule()) {
  const result = await runProductionTextPlannerPreflight(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify({
    status: result.status,
    promotionReady: result.promotionReady,
    runAllowed: result.runAllowed,
    baseUrl: result.baseUrl,
    activeModel: result.activeModel,
    classification: result.classification.classification,
    blockers: result.blockers.length,
    advisory: result.advisory
  }, null, 2));
  if (!result.advisory && !result.runAllowed) process.exitCode = 1;
}

export async function runProductionTextPlannerPreflight(args = {}, options = {}) {
  const advisory = Boolean(args.advisory);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = boundedInteger(args["timeout-ms"], 500, 60_000, 5_000);
  const explicitModel = firstUsableValue(
    args.model,
    process.env.CUSTOMCARD_LOCAL_LLM_MODEL,
    process.env.LMSTUDIO_MODEL,
    process.env.KOBOLDCPP_MODEL
  );
  const apiKey = firstUsableValue(
    args["api-key"],
    process.env.CUSTOMCARD_LOCAL_LLM_API_KEY,
    process.env.LMSTUDIO_API_KEY,
    process.env.KOBOLDCPP_API_KEY
  );
  const baseUrl = firstUsableValue(
    args["base-url"],
    process.env.CUSTOMCARD_LOCAL_LLM_BASE_URL,
    process.env.LMSTUDIO_BASE_URL,
    process.env.KOBOLDCPP_BASE_URL
  );

  const endpoint = baseUrl ? plannerEndpoint(baseUrl) : undefined;
  const probe = endpoint
    ? await probeModels(endpoint.modelsUrl, { fetchImpl, timeoutMs, apiKey })
    : { reachable: false, models: [], error: "Planner base URL was not provided." };
  const activeModel = explicitModel || probe.models[0] || "";
  const classification = classifyProductionTextPlanner(activeModel, {
    allowSmall: args["allow-small"],
    allowUnknownProductionModel: args["allow-unknown-production-model"],
    reportedContextTokens: args["reported-context-tokens"],
    maxOutputTokens: args["max-output-tokens"],
    requireRuntimeBudget: true
  });
  const blockers = [
    ...(!endpoint ? ["Planner base URL is missing."] : []),
    ...(endpoint?.error ? [endpoint.error] : []),
    ...(endpoint && !probe.reachable ? [`Planner /models preflight failed: ${probe.error}`] : []),
    ...classification.blockers
  ];
  const runAllowed = blockers.length === 0 && (classification.productionSuitable || Boolean(args["allow-small"]));
  const promotionReady = blockers.length === 0 && classification.productionSuitable;
  return {
    createdAtIso: new Date().toISOString(),
    status: promotionReady ? "promotion-ready" : "blocked",
    promotionReady,
    runAllowed,
    advisory,
    baseUrl: endpoint?.baseUrl || "",
    modelsUrl: endpoint?.modelsUrl || "",
    reachable: Boolean(probe.reachable),
    activeModel,
    models: probe.models,
    classification,
    blockers,
    warnings: classification.warnings,
    nextSteps: buildNextSteps({ blockers, classification })
  };
}

function plannerEndpoint(value) {
  try {
    const baseUrl = normalizeOpenAiBaseUrl(value);
    const parsed = new URL(baseUrl);
    const localhost = ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(parsed.hostname.toLowerCase());
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && localhost)) {
      return {
        baseUrl,
        modelsUrl: "",
        error: `Planner URL must be HTTPS unless it is localhost HTTP: ${baseUrl}`
      };
    }
    return {
      baseUrl,
      modelsUrl: `${baseUrl.replace(/\/$/, "")}/models`
    };
  } catch (error) {
    return {
      baseUrl: String(value || ""),
      modelsUrl: "",
      error: `Planner base URL is invalid: ${errorMessage(error)}`
    };
  }
}

function normalizeOpenAiBaseUrl(value) {
  const parsed = new URL(String(value));
  let path = parsed.pathname.replace(/\/+$/, "");
  if (path.endsWith("/chat/completions")) path = path.slice(0, -"/chat/completions".length).replace(/\/+$/, "");
  if (!path.endsWith("/v1")) path = `${path}/v1`;
  parsed.pathname = path.replace(/\/{2,}/g, "/");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

async function probeModels(modelsUrl, { fetchImpl, timeoutMs, apiKey }) {
  if (!modelsUrl) return { reachable: false, models: [], error: "Planner /models URL was not available." };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    const response = await fetchImpl(modelsUrl, { headers, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    return {
      reachable: true,
      models: (body?.data || []).map((item) => String(item?.id || "")).filter(Boolean)
    };
  } catch (error) {
    return {
      reachable: false,
      models: [],
      error: errorMessage(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildNextSteps({ blockers, classification }) {
  if (!blockers.length && !classification.smallPlanner) return [];
  const steps = [];
  if (blockers.some((item) => /base URL|\/models|preflight|invalid/i.test(item))) {
    steps.push("Start or point to an OpenAI-compatible planner endpoint before collecting production evidence.");
  }
  if (classification.smallPlanner || blockers.some((item) => /smoke-only|allowlist|context|PlannerMaxTokens/i.test(item))) {
    steps.push(
      `Use a production planner such as ${classification.recommendedModels.slice(0, 3).join(", ")} with ${classification.minContextTokens}+ context tokens.`
    );
  }
  steps.push("Keep the full creative planner contract; use -AllowSmallPlanner only for smoke/failure evidence.");
  return unique(steps);
}

function firstUsableValue(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text && !["__UNSET__", "placeholder", "changeme"].includes(text)) return text;
  }
  return "";
}

function boundedInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
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

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error ?? "unknown error");
}

function isMainModule() {
  return process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replaceAll("\\", "/")}`).href;
}
