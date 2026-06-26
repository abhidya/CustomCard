import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const defaultEvidenceRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");
const defaultBaseUrl = "http://127.0.0.1:1234/v1";
const defaultComfyUrl = "http://127.0.0.1:8188";
const defaultComfyOutputRoot = String.raw`D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\output`;
const defaultComfyWorkflowPath = resolve(repoRoot, "comfyui-workflows/customcard-local-visual-quality-gate.json");
const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

if (isMainModule()) {
  await main().catch((error) => {
    console.error(errorMessage(error));
    process.exitCode = 1;
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = resolve(args.input || defaultEvidenceRoot);
  const outputDir = resolve(args["output-dir"] || resolve(inputDir, "local-visual-quality-gate"));
  const requestedBackend = String(args.backend || process.env.CUSTOMCARD_LOCAL_QUALITY_BACKEND || "openai").toLowerCase();
  const { backend, serverKind } = normalizeBackend(requestedBackend);
  const baseUrl = backend === "openai"
    ? normalizeBaseUrl(
    args["base-url"] ||
      process.env.CUSTOMCARD_LOCAL_VISION_BASE_URL ||
      process.env.LMSTUDIO_BASE_URL ||
      process.env.LOCAL_VISION_BASE_URL ||
      defaultBaseUrlForServerKind(serverKind)
      )
    : "";
  const comfyUrl = backend === "comfy"
    ? normalizeLocalHttpUrl(args["comfy-url"] || process.env.CUSTOMCARD_COMFYUI_URL || process.env.COMFYUI_URL || defaultComfyUrl)
    : "";
  const comfyOutputRoot = resolve(args["comfy-output-root"] || process.env.CUSTOMCARD_COMFYUI_OUTPUT_ROOT || defaultComfyOutputRoot);
  const comfyWorkflowPath = resolve(args["comfy-workflow-path"] || process.env.CUSTOMCARD_COMFYUI_REVIEW_WORKFLOW_PATH || defaultComfyWorkflowPath);
  const model =
    args.model ||
    process.env.CUSTOMCARD_COMFYUI_REVIEW_MODEL ||
    process.env.CUSTOMCARD_LOCAL_VISION_MODEL ||
    process.env.LMSTUDIO_VISION_MODEL ||
    process.env.LOCAL_VISION_MODEL ||
    "Qwen3VL-4B-Instruct-Q4_K_M.gguf";
  const apiKey =
    args["api-key"] ||
    process.env.CUSTOMCARD_LOCAL_VISION_API_KEY ||
    process.env.LMSTUDIO_API_KEY ||
    process.env.LOCAL_VISION_API_KEY ||
    "local";
  const minScore = boundedNumber(args["min-score"] || process.env.CUSTOMCARD_LOCAL_QUALITY_MIN_SCORE, 0, 100, 80);
  const limit = boundedInteger(args.limit, 1, 10_000, 10_000);
  const includePanels = args["include-panels"] === true || args["include-panels"] === "true";
  const dryRun = args["dry-run"] === true || args["dry-run"] === "true";
  const advisory = args.advisory === true || args.advisory === "true";
  const preflightOnly = args["preflight-only"] === true || args["preflight-only"] === "true";
  const allowLoadedModel = args["allow-loaded-model"] === true || args["allow-loaded-model"] === "true";
  const allowNonVisionModel = args["allow-nonvision-model"] === true || args["allow-nonvision-model"] === "true";
  const runDirs = collectVisualRunDirs(inputDir).slice(0, limit);

  const preflight =
    !dryRun && backend === "openai"
      ? await preflightOpenAiReviewer({ baseUrl, apiKey, model, allowLoadedModel, allowNonVisionModel })
      : undefined;
  if (preflightOnly) {
    console.log(
      JSON.stringify(
        {
          backend,
          serverKind,
          baseUrl: baseUrl ? redactLocalUrl(baseUrl) : undefined,
          model,
          ready: true,
          loadedModels: preflight?.loadedModels || []
        },
        null,
        2
      )
    );
    return;
  }

  const reviews = [];
  for (const runDir of runDirs) {
    const images = selectReviewImages(runDir, { includePanels });
    const reviewBase = {
      runDir: relativePath(runDir),
      images: images.map(relativePath),
      model,
      minScore
    };
    if (dryRun) {
      reviews.push({
        ...reviewBase,
        status: "dry-run",
        score: undefined,
        passed: false,
        blockingFailures: []
      });
      continue;
    }
    try {
      const result =
        backend === "comfy"
          ? await reviewRunWithComfy({ comfyUrl, comfyOutputRoot, comfyWorkflowPath, model, runDir, images })
          : await reviewRunWithOpenAi({ baseUrl, apiKey, model, runDir, images });
      const normalized = normalizeReview(result, minScore);
      reviews.push({
        ...reviewBase,
        ...normalized
      });
    } catch (error) {
      reviews.push({
        ...reviewBase,
        status: "error",
        score: 0,
        passed: false,
        blockingFailures: [`reviewer-error: ${errorMessage(error)}`],
        raw: undefined
      });
    }
  }

  const aggregate = {
    createdAtIso: new Date().toISOString(),
    inputDir: relativePath(inputDir),
    outputDir: relativePath(outputDir),
    backend,
    serverKind,
    baseUrl: baseUrl ? redactLocalUrl(baseUrl) : undefined,
    comfyUrl: comfyUrl || undefined,
    comfyWorkflowPath: backend === "comfy" ? relativePath(comfyWorkflowPath) : undefined,
    model,
    preflight,
    minScore,
    totalRuns: reviews.length,
    passedRuns: reviews.filter((review) => review.passed).length,
    blockedRuns: reviews.filter((review) => review.status === "block").length,
    reviewRuns: reviews.filter((review) => review.status === "review").length,
    errorRuns: reviews.filter((review) => review.status === "error").length,
    reviews
  };
  mkdirSync(outputDir, { recursive: true });
  writeJson(resolve(outputDir, "local-visual-quality-gate.json"), aggregate);
  writeMarkdown(resolve(outputDir, "local-visual-quality-gate.md"), buildGateMarkdown(aggregate));
  console.log(
    JSON.stringify(
      {
        outputDir: relativePath(outputDir),
        model,
        totalRuns: aggregate.totalRuns,
        passedRuns: aggregate.passedRuns,
        blockedRuns: aggregate.blockedRuns,
        reviewRuns: aggregate.reviewRuns,
        errorRuns: aggregate.errorRuns
      },
      null,
      2
    )
  );
  if (!advisory && !dryRun && aggregate.passedRuns !== aggregate.totalRuns) {
    process.exitCode = 1;
  }
}

function collectVisualRunDirs(root) {
  if (!existsSync(root)) return [];
  const results = [];
  const seen = new Set();
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    const imageNames = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    const hasReviewImage =
      imageNames.includes("contact-sheet.png") ||
      imageNames.some((name) => /^preview-.+\.(png|jpe?g|webp)$/i.test(name));
    if (hasReviewImage && !seen.has(current)) {
      seen.add(current);
      results.push(current);
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (["node_modules", ".git", "local-visual-quality-gate"].includes(entry.name)) continue;
      stack.push(resolve(current, entry.name));
    }
  }
  return results.sort((a, b) => a.localeCompare(b));
}

function selectReviewImages(runDir, { includePanels }) {
  const entries = readdirSync(runDir, { withFileTypes: true }).filter((entry) => entry.isFile());
  const contactSheet = entries.find((entry) => entry.name === "contact-sheet.png");
  const previews = entries
    .filter((entry) => /^preview-.+\.(png|jpe?g|webp)$/i.test(entry.name))
    .map((entry) => resolve(runDir, entry.name))
    .sort((a, b) => panelSortKey(a).localeCompare(panelSortKey(b)));
  const selected = [];
  if (contactSheet) selected.push(resolve(runDir, contactSheet.name));
  if (includePanels || selected.length === 0) selected.push(...previews);
  return selected.filter((filePath) => imageExtensions.has(extname(filePath).toLowerCase()));
}

async function preflightOpenAiReviewer({ baseUrl, apiKey, model, allowLoadedModel, allowNonVisionModel }) {
  const response = await fetchWithTimeout(`${baseUrl}/models`, {
    headers: { authorization: `Bearer ${apiKey}` }
  }, 5000).catch((error) => {
    throw new Error(
      [
        `Local vision reviewer is not reachable at ${redactLocalUrl(baseUrl)}.`,
        "Start LM Studio/KoboldCPP, enable its OpenAI-compatible local server, and load a vision model into memory before running the quality gate.",
        `Original error: ${errorMessage(error)}`
      ].join(" ")
    );
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Local vision reviewer preflight failed at ${redactLocalUrl(baseUrl)}/models with ${response.status}: ${text.slice(0, 500)}`
    );
  }
  const payload = parseJson(text);
  const loadedModels = normalizeLoadedModelIds(payload);
  if (loadedModels.length === 0) {
    throw new Error(
      [
        `Local reviewer server is running at ${redactLocalUrl(baseUrl)}, but it reports no loaded models.`,
        "In LM Studio, load a vision model in the app and start the Local Server.",
        "In KoboldCPP, launch with both --model and --mmproj for a vision-capable GGUF."
      ].join(" ")
    );
  }

  const matchedModels = loadedModels.filter((loadedModel) => modelIdsMatch(loadedModel, model));
  if (!allowLoadedModel && matchedModels.length === 0) {
    throw new Error(
      [
        `Local reviewer server is reachable, but ${model} is not the loaded model.`,
        `Loaded model(s): ${loadedModels.join(", ")}.`,
        "Load the requested model first, pass --model with the loaded model id, or pass --allow-loaded-model while testing."
      ].join(" ")
    );
  }

  const candidateModels = matchedModels.length > 0 ? matchedModels : loadedModels;
  if (!allowNonVisionModel && !candidateModels.some(looksVisionCapableModelId)) {
    throw new Error(
      [
        `Loaded model(s) do not look vision-capable: ${candidateModels.join(", ")}.`,
        "The visual quality gate needs a VL/multimodal model, such as Qwen3VL or LLaVA, not a text-only chat model.",
        "Pass --allow-nonvision-model only for endpoint debugging."
      ].join(" ")
    );
  }

  return {
    loadedModels,
    matchedModels,
    strictModelMatch: !allowLoadedModel,
    visionModelCheck: !allowNonVisionModel
  };
}

async function reviewRunWithOpenAi({ baseUrl, apiKey, model, runDir, images }) {
  if (images.length === 0) throw new Error("No preview or contact-sheet images found.");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a strict local visual quality gate for CustomCard greeting-card benchmark outputs. Return JSON only."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: buildReviewerPrompt(runDir, images)
            },
            ...images.map((imagePath) => ({
              type: "image_url",
              image_url: {
                url: imageDataUrl(imagePath)
              }
            }))
          ]
        }
      ]
    })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Reviewer returned ${response.status}: ${text.slice(0, 500)}`);
  const payload = parseJson(text);
  const content = payload?.choices?.[0]?.message?.content ?? payload?.response ?? text;
  return parseJsonFromText(content);
}

async function reviewRunWithComfy({ comfyUrl, comfyOutputRoot, comfyWorkflowPath, model, runDir, images }) {
  if (images.length === 0) throw new Error("No preview or contact-sheet images found.");
  if (!existsSync(comfyWorkflowPath)) throw new Error(`Comfy reviewer workflow not found: ${comfyWorkflowPath}`);
  const reviewImage = images[0];
  const uploaded = await uploadComfyImage(comfyUrl, reviewImage);
  const workflowTemplate = JSON.parse(readFileSync(comfyWorkflowPath, "utf8"));
  const workflowId = safeWorkflowId(runDir);
  const workflow = interpolateTemplate(workflowTemplate, {
    image: uploaded.name,
    review_model: model,
    review_prompt: buildReviewerPrompt(runDir, [reviewImage]),
    workflow_id: workflowId
  });
  const promptResponse = await postJson(`${comfyUrl}/prompt`, {
    prompt: workflow,
    client_id: "customcard-local-visual-quality-gate"
  });
  const promptId = promptResponse?.prompt_id;
  if (!promptId) throw new Error("ComfyUI did not return prompt_id for reviewer workflow.");
  const historyItem = await waitForComfyHistory(comfyUrl, promptId);
  const text = extractComfyReviewText(historyItem, comfyOutputRoot);
  return parseJsonFromText(text);
}

async function uploadComfyImage(comfyUrl, imagePath) {
  const form = new FormData();
  const bytes = readFileSync(imagePath);
  form.set("image", new Blob([bytes], { type: mimeTypeForPath(imagePath) }), basename(imagePath));
  form.set("type", "input");
  form.set("overwrite", "true");
  const response = await fetch(`${comfyUrl}/upload/image`, {
    method: "POST",
    body: form
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`ComfyUI image upload failed with ${response.status}: ${text.slice(0, 500)}`);
  const payload = parseJson(text);
  if (!payload?.name) throw new Error(`ComfyUI image upload response did not include name: ${text.slice(0, 500)}`);
  return payload;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`POST ${url} failed with ${response.status}: ${text.slice(0, 500)}`);
  return parseJson(text);
}

async function waitForComfyHistory(comfyUrl, promptId) {
  const timeoutMs = 900_000;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const response = await fetch(`${comfyUrl}/history/${encodeURIComponent(promptId)}`);
    const history = await response.json();
    const item = history[promptId];
    if (item?.status?.completed === false && item?.status?.status_str === "error") {
      throw new Error(`ComfyUI reviewer workflow failed: ${JSON.stringify(item.status)}`);
    }
    if (item?.status?.completed) return item;
    await sleep(1500);
  }
  throw new Error(`ComfyUI reviewer workflow timed out after ${timeoutMs}ms.`);
}

function extractComfyReviewText(historyItem, comfyOutputRoot) {
  for (const filePath of collectComfyOutputFiles(historyItem?.outputs, comfyOutputRoot)) {
    if (!existsSync(filePath)) continue;
    const text = readFileSync(filePath, "utf8");
    if (tryParseJsonFromText(text)) return text;
  }
  const strings = collectStrings(historyItem?.outputs);
  for (const value of strings) {
    const maybePath = resolve(comfyOutputRoot, value);
    if (/\.(json|txt)$/i.test(value) && existsSync(maybePath)) {
      const text = readFileSync(maybePath, "utf8");
      if (tryParseJsonFromText(text)) return text;
    }
    if (value.includes("{") && value.includes("score")) return value;
  }
  throw new Error("ComfyUI reviewer workflow did not produce parseable JSON text.");
}

function collectComfyOutputFiles(value, comfyOutputRoot) {
  const files = [];
  function visit(item) {
    if (!item || typeof item !== "object") return;
    if (item.filename) {
      files.push(resolve(comfyOutputRoot, item.subfolder || "", item.filename));
    }
    for (const nested of Object.values(item)) {
      if (Array.isArray(nested)) nested.forEach(visit);
      else if (nested && typeof nested === "object") visit(nested);
    }
  }
  visit(value);
  return files;
}

function collectStrings(value) {
  const results = [];
  function visit(item) {
    if (typeof item === "string") {
      results.push(item);
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (item && typeof item === "object") {
      Object.values(item).forEach(visit);
    }
  }
  visit(value);
  return results;
}

function buildReviewerPrompt(runDir, images) {
  return [
    "Review these CustomCard benchmark images as a production-quality visual gate.",
    "",
    `Run directory: ${relativePath(runDir)}`,
    `Images: ${images.map((image) => basename(image)).join(", ")}`,
    "",
    "Product architecture:",
    "- The image model should create print-ready greeting-card artwork.",
    "- CustomCard overlays final text outside the image model.",
    "- Penalize fake/gibberish text, logos, watermarks, signatures, UI artifacts, faces, hands, folded-card mockups, tabletop scenes, and busy artwork underneath readable text areas.",
    "- Judge the final preview/contact sheet as a 5x7 greeting-card product artifact.",
    "",
    "Return strict JSON with this exact shape:",
    "{",
    '  "score": 0,',
    '  "tier": "pass|review|block",',
    '  "blocking_failures": ["short strings"],',
    '  "dimension_scores": {',
    '    "print_readiness": 0,',
    '    "text_readability_overlay": 0,',
    '    "no_unwanted_text_or_logos": 0,',
    '    "safe_margins_and_composition": 0,',
    '    "theme_coherence": 0',
    "  },",
    '  "best_panel": "front|inside-left|inside-right|back|unknown",',
    '  "worst_panel": "front|inside-left|inside-right|back|unknown",',
    '  "notes": "one concise paragraph",',
    '  "recommended_fix": "one concise action"',
    "}",
    "",
    "Scoring rules:",
    "- 90-100: production strong.",
    "- 80-89: acceptable for internal promotion if there are no blocking failures.",
    "- 65-79: needs human review.",
    "- below 65: block.",
    "- Any unreadable app overlay, obvious fake text outside the overlay, cropped panels, blank/failed image, face/hand/portrait when not requested, or physical-card mockup should be a blocking failure."
  ].join("\n");
}

function normalizeReview(result, minScore) {
  const score = boundedNumber(result?.score, 0, 100, 0);
  const blockingFailures = Array.isArray(result?.blocking_failures)
    ? result.blocking_failures.map((failure) => String(failure).trim()).filter(Boolean)
    : [];
  const modelTier = String(result?.tier || "").toLowerCase();
  const status =
    modelTier === "block" || score < 65 || blockingFailures.length > 0
      ? "block"
      : score >= minScore
        ? "pass"
        : "review";
  return {
    status,
    score,
    passed: status === "pass",
    blockingFailures,
    dimensionScores: normalizeDimensionScores(result?.dimension_scores),
    bestPanel: String(result?.best_panel || "unknown"),
    worstPanel: String(result?.worst_panel || "unknown"),
    notes: String(result?.notes || "").slice(0, 1200),
    recommendedFix: String(result?.recommended_fix || "").slice(0, 800),
    raw: result
  };
}

function normalizeDimensionScores(value) {
  const input = value && typeof value === "object" ? value : {};
  return {
    printReadiness: boundedNumber(input.print_readiness, 0, 20, 0),
    textReadabilityOverlay: boundedNumber(input.text_readability_overlay, 0, 20, 0),
    noUnwantedTextOrLogos: boundedNumber(input.no_unwanted_text_or_logos, 0, 20, 0),
    safeMarginsAndComposition: boundedNumber(input.safe_margins_and_composition, 0, 20, 0),
    themeCoherence: boundedNumber(input.theme_coherence, 0, 20, 0)
  };
}

function imageDataUrl(filePath) {
  const extension = extname(filePath).toLowerCase();
  const mime =
    extension === ".jpg" || extension === ".jpeg"
      ? "image/jpeg"
      : extension === ".webp"
        ? "image/webp"
        : "image/png";
  return `data:${mime};base64,${readFileSync(filePath).toString("base64")}`;
}

function buildGateMarkdown(aggregate) {
  const lines = [
    "# Local Visual Quality Gate",
    "",
    `Created: ${aggregate.createdAtIso}`,
    `Input: \`${aggregate.inputDir}\``,
    `Reviewer model: \`${aggregate.model}\``,
    `Backend: \`${aggregate.backend}\``,
    `Minimum score: ${aggregate.minScore}`,
    "",
    `Passed: ${aggregate.passedRuns}/${aggregate.totalRuns}`,
    `Review: ${aggregate.reviewRuns}`,
    `Blocked: ${aggregate.blockedRuns}`,
    `Errors: ${aggregate.errorRuns}`,
    "",
    "| Status | Score | Run | Worst panel | Blocking failures | Recommended fix |",
    "|---|---:|---|---|---|---|"
  ];
  for (const review of aggregate.reviews) {
    lines.push(
      [
        review.status,
        review.score ?? "n/a",
        `\`${review.runDir}\``,
        review.worstPanel || "unknown",
        markdownCell((review.blockingFailures || []).join("; ") || "none"),
        markdownCell(review.recommendedFix || "")
      ]
        .join(" | ")
        .replace(/^/, "| ")
        .replace(/$/, " |")
    );
  }
  lines.push("");
  lines.push("This is a local advisory/promotion gate. Keep human review for production promotion and edge cases.");
  return `${lines.join("\n")}\n`;
}

function parseJsonFromText(value) {
  const text = String(value || "").trim();
  const direct = parseJson(text);
  if (direct) return direct;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const parsed = parseJson(fenced[1]);
    if (parsed) return parsed;
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const parsed = parseJson(text.slice(start, end + 1));
    if (parsed) return parsed;
  }
  throw new Error("Reviewer response did not contain JSON.");
}

function tryParseJsonFromText(value) {
  try {
    return parseJsonFromText(value);
  } catch {
    return undefined;
  }
}

function parseJson(value) {
  try {
    return JSON.parse(String(value));
  } catch {
    return undefined;
  }
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const [key, inlineValue] = value.slice(2).split("=");
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

function normalizeBackend(value) {
  const normalized = String(value || "openai").toLowerCase();
  if (["openai", "openai-compatible", "local"].includes(normalized)) {
    return { backend: "openai", serverKind: "openai" };
  }
  if (["lmstudio", "lm-studio", "lm_studio"].includes(normalized)) {
    return { backend: "openai", serverKind: "lmstudio" };
  }
  if (["kobold", "koboldcpp", "kobold-cpp"].includes(normalized)) {
    return { backend: "openai", serverKind: "koboldcpp" };
  }
  if (normalized === "comfy" || normalized === "comfyui") {
    return { backend: "comfy", serverKind: "comfy" };
  }
  throw new Error(`Unsupported local quality backend: ${value}`);
}

function defaultBaseUrlForServerKind(serverKind) {
  if (serverKind === "koboldcpp") return "http://127.0.0.1:5002/v1";
  return defaultBaseUrl;
}

function normalizeBaseUrl(value) {
  const url = new URL(String(value || defaultBaseUrl));
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("Local visual quality gate must use a localhost reviewer URL.");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  if (!url.pathname.endsWith("/v1")) url.pathname = `${url.pathname}/v1`.replace(/\/+/g, "/");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeLoadedModelIds(payload) {
  const values = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.models)
      ? payload.models
      : Array.isArray(payload)
        ? payload
        : [];
  return values
    .map((value) => {
      if (typeof value === "string") return value;
      return value?.id || value?.name || value?.model || value?.path || "";
    })
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function modelIdsMatch(loadedModel, requestedModel) {
  const loaded = normalizeModelIdForCompare(loadedModel);
  const requested = normalizeModelIdForCompare(requestedModel);
  return loaded === requested || loaded.includes(requested) || requested.includes(loaded);
}

function normalizeModelIdForCompare(value) {
  return basename(String(value || ""))
    .toLowerCase()
    .replace(/\.(gguf|safetensors|bin)$/i, "")
    .replace(/[^a-z0-9]+/g, "");
}

function looksVisionCapableModelId(value) {
  return /(vl|vision|visual|llava|moondream|pixtral|internvl|minicpm|qwen2\.?5-vl|qwen3.?vl)/i.test(String(value || ""));
}

function normalizeLocalHttpUrl(value) {
  const url = new URL(String(value || defaultComfyUrl));
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("Comfy reviewer backend must use a localhost http URL.");
  }
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function interpolateTemplate(value, variables) {
  if (Array.isArray(value)) return value.map((item) => interpolateTemplate(item, variables));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, interpolateTemplate(nested, variables)]));
  }
  if (typeof value !== "string") return value;
  const exact = value.match(/^\{\{\s*([a-zA-Z0-9_]+)\s*\}\}$/);
  if (exact && variables[exact[1]] !== undefined) return variables[exact[1]];
  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) =>
    variables[key] === undefined ? "" : String(variables[key])
  );
}

function mimeTypeForPath(filePath) {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

function safeWorkflowId(filePath) {
  return relativePath(filePath).replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "review";
}

function redactLocalUrl(value) {
  const url = new URL(value);
  url.username = "";
  url.password = "";
  return url.toString();
}

function boundedNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function boundedInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function panelSortKey(filePath) {
  const name = basename(filePath).toLowerCase();
  const order = ["front", "inside-left", "inside-right", "back"];
  const index = order.findIndex((panelId) => name.includes(panelId));
  return `${index < 0 ? 99 : index}-${name}`;
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, value);
}

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function relativePath(filePath) {
  return relative(repoRoot, resolve(filePath)).replaceAll("\\", "/");
}

function errorMessage(error) {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause instanceof Error ? `: ${error.cause.message}` : "";
  return `${error.message}${cause}`;
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function isMainModule() {
  return process.argv[1] && resolve(process.argv[1]) === import.meta.filename;
}
