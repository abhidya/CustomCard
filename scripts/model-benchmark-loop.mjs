import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import sharp from "sharp";
import { createAiCardGenerationService, loadLocalAiEnvFiles } from "./ai-card-generator.mjs";
import { resolveAiFlowConfigs } from "../src/aiFlowConfigData.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const defaultOutputDir = resolve(
  repoRoot,
  "docs/evidence/generated-card-comparisons/model-benchmark-20260612-011913"
);
const panelIds = ["front", "inside-left", "inside-right", "back"];

const stories = {
  "first-time-user-birthday": {
    id: "first-time-user-birthday",
    customer_type: "first-time consumer",
    occasion: "birthday",
    memory_load: "low",
    request: {
      sender: "Jordan",
      recipient: "Maya",
      relationship: "friend",
      occasion: "birthday",
      tone: "warm, helpful, lightly dry humor, not romantic",
      style: "soft houseplant stationery, airy pastel palette, polished first-try card design",
      language: "English",
      personal_note:
        "Make a warm birthday card for Maya from Jordan. She likes houseplants, soft colors, and dry humor, but Jordan does not know what to write.",
      memory_notes: [
        "Maya likes houseplants.",
        "Maya likes soft colors.",
        "The card should use light humor without inventing memories."
      ]
    },
    must_include: ["Maya", "Jordan", "birthday", "plant", "humor"],
    must_avoid: ["romantic", "fake memories", "crowded text", "stock balloons"]
  },
  "long-time-user-get-well-friend": {
    id: "long-time-user-get-well-friend",
    customer_type: "returning consumer",
    occasion: "get well card",
    memory_load: "high",
    request: {
      sender: "Jordan",
      recipient: "Sam",
      relationship: "close friend",
      occasion: "get well after surgery",
      tone: "heartfelt, tender, funny, emotionally specific, not maudlin",
      style: "calm recovery stationery with basil green, soup-warm ivory, tiny walking path details",
      language: "English",
      personal_note:
        "Use saved memories for Sam recovering from surgery: the soup rating spreadsheet, terrible hospital socks, basil-only garden, and the running joke that Sam is the mayor of taking tiny walks.",
      memory_notes: [
        "Sam is recovering from surgery.",
        "Inside joke: the soup rating spreadsheet.",
        "Inside joke: terrible hospital socks.",
        "Sam has a garden that only grows basil.",
        "Sam is jokingly the mayor of taking tiny walks."
      ]
    },
    must_include: ["Sam", "surgery", "tiny walks", "basil", "soup"],
    must_avoid: ["medical advice", "miracle cure", "pity", "diagnosis"]
  },
  "b2b-crm-warranty-renewal": {
    id: "b2b-crm-warranty-renewal",
    customer_type: "B2B CRM/customer success",
    occasion: "purchase anniversary and warranty renewal CTA",
    memory_load: "medium",
    request: {
      sender: "Northstar Dental Supply",
      recipient: "Avery at BrightSmile Clinic",
      relationship: "customer success team to clinic operations contact",
      occasion: "one-year purchase anniversary and extended warranty renewal reminder",
      tone: "professional, warm, trust-building, useful, not pushy",
      style: "premium dental supply customer-success stationery, clean white, deep teal, soft metallic accent",
      language: "English",
      personal_note:
        "Thank Avery at BrightSmile Clinic for one year since purchase of their sterilizer system and gently remind them their extended warranty renewal window closes July 31. CTA: Scan the enclosed QR code or contact their account manager.",
      memory_notes: [
        "BrightSmile Clinic purchased a sterilizer system one year ago.",
        "The extended warranty renewal window closes July 31.",
        "Leave a clean area for an app-rendered QR code and account-manager CTA."
      ]
    },
    must_include: ["one year", "BrightSmile Clinic", "July 31", "QR", "account manager"],
    must_avoid: ["discount", "legal terms", "birthday", "aggressive sales"]
  },
  "distant-relative-wedding": {
    id: "distant-relative-wedding",
    customer_type: "family/occasional sender",
    occasion: "wedding",
    memory_load: "low",
    request: {
      sender: "Jordan",
      recipient: "Lina and Omar",
      relationship: "distant cousin",
      occasion: "wedding",
      tone: "respectful, warm, elegant, not over-familiar",
      style: "elegant wedding stationery, soft ivory, sage, restrained gold, generous handwriting space",
      language: "English",
      personal_note:
        "Make a wedding card for distant cousin Lina and her fiance Omar. It should feel respectful and warm even though we are not close. Include a short blessing and leave room for a handwritten note.",
      memory_notes: [
        "Lina and Omar are getting married.",
        "The sender is not close to them and wants restraint.",
        "The inside should leave space for a handwritten note."
      ]
    },
    must_include: ["Lina", "Omar", "wedding", "blessing", "handwrite"],
    must_avoid: ["religion", "close family memories", "illegible script"]
  },
  "medical-school-graduation": {
    id: "medical-school-graduation",
    customer_type: "family/friend",
    occasion: "medical graduation",
    memory_load: "medium",
    request: {
      sender: "Family",
      recipient: "Noura",
      relationship: "family",
      occasion: "medical school graduation",
      tone: "proud, refined, celebratory, warm, not clinical",
      style: "elegant navy and gold medical graduation stationery with subtle heartbeat or stethoscope symbolism",
      language: "English",
      personal_note:
        "Create a card for Noura graduating medical school. She loves navy and gold, wants something elegant, and her family is proud of how hard she worked. Include stethoscope or heartbeat symbolism without making it look like a hospital ad.",
      memory_notes: [
        "Noura is graduating medical school.",
        "Noura loves navy and gold.",
        "Her family is proud of how hard she worked."
      ]
    },
    must_include: ["Noura", "graduation", "navy", "gold", "stethoscope"],
    must_avoid: ["fake diploma", "hospital room", "patients", "anatomy gore"]
  }
};

const textCandidates = [
  {
    id: "text-cloudflare-baseline",
    label: "Current Cloudflare text baseline",
    adapterId: "cloudflare-workers-ai-chat",
    modelFromEnv: "CLOUDFLARE_WORKERS_AI_TEXT_MODEL",
    requiredEnv: ["CLOUDFLARE_ACCOUNT_ID", ["CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN", "CLOUDFLARE_API_TOKEN"]]
  },
  {
    id: "text-hf-qwen3-235b-a22b",
    label: "Hugging Face Qwen3 235B A22B Instruct 2507",
    adapterId: "huggingface-chat",
    model: "Qwen/Qwen3-235B-A22B-Instruct-2507",
    requiredEnv: ["HUGGINGFACE_API_TOKEN"]
  },
  {
    id: "text-hf-deepseek-v4-flash",
    label: "Hugging Face DeepSeek V4 Flash",
    adapterId: "huggingface-chat",
    model: "deepseek-ai/DeepSeek-V4-Flash",
    requiredEnv: ["HUGGINGFACE_API_TOKEN"]
  },
  {
    id: "text-hf-gpt-oss-20b",
    label: "Hugging Face gpt-oss-20b",
    adapterId: "huggingface-chat",
    model: "openai/gpt-oss-20b",
    requiredEnv: ["HUGGINGFACE_API_TOKEN"]
  },
  {
    id: "text-openai-baseline",
    label: "OpenAI local premium baseline",
    adapterId: "openai-responses-chat",
    model: "gpt-4o-mini",
    requiredEnv: ["OPENAI_API_KEY"]
  },
  {
    id: "text-gemini-baseline",
    label: "Gemini local premium baseline",
    adapterId: "google-gemini-chat",
    model: "gemini-1.5-flash",
    requiredEnv: ["GOOGLE_GENERATIVE_AI_API_KEY"]
  },
  {
    id: "text-claude-baseline",
    label: "Claude local premium baseline",
    adapterId: "anthropic-messages-chat",
    model: "claude-3-5-haiku-latest",
    requiredEnv: ["ANTHROPIC_API_KEY"]
  }
];

const imageCandidates = [
  {
    id: "image-cloudflare-sdxl-lightning",
    label: "Current Cloudflare SDXL Lightning baseline",
    adapterId: "cloudflare-workers-ai-image",
    modelFromEnv: "CLOUDFLARE_WORKERS_AI_IMAGE_MODEL",
    requiredEnv: ["CLOUDFLARE_ACCOUNT_ID", ["CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN", "CLOUDFLARE_API_TOKEN"]]
  },
  {
    id: "image-cloudflare-flux-schnell",
    label: "Cloudflare FLUX.1 Schnell",
    adapterId: "cloudflare-workers-ai-image",
    model: "@cf/black-forest-labs/flux-1-schnell",
    requiredEnv: ["CLOUDFLARE_ACCOUNT_ID", ["CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN", "CLOUDFLARE_API_TOKEN"]]
  },
  {
    id: "image-deepai-hd",
    label: "DeepAI HD",
    adapterId: "deepai-text2img-image",
    model: "hd",
    requiredEnv: ["DEEPAI_API_KEY"]
  },
  {
    id: "image-openai-gpt-image-2",
    label: "OpenAI image model currently supported",
    adapterId: "openai-images",
    model: "gpt-image-2",
    requiredEnv: ["OPENAI_API_KEY"]
  },
  {
    id: "image-gemini-supported",
    label: "Gemini image model currently supported",
    adapterId: "google-gemini-image",
    model: "gemini-3.1-flash-image",
    requiredEnv: ["GOOGLE_GENERATIVE_AI_API_KEY"]
  }
];

const blockedImageCandidates = [
  ["image-hf-flux-schnell", "huggingface-image", "black-forest-labs/FLUX.1-schnell", "Repo catalog has credentials but scripts/ai-card-generator.mjs has no Hugging Face image executor."],
  ["image-hf-qwen-image", "huggingface-image", "Qwen/Qwen-Image", "Repo catalog has credentials but scripts/ai-card-generator.mjs has no Hugging Face image executor."],
  ["image-hf-qwen-image-2512", "huggingface-image", "Qwen/Qwen-Image-2512", "Repo catalog has credentials but scripts/ai-card-generator.mjs has no Hugging Face image executor."],
  ["image-hf-z-image-turbo", "huggingface-image", "Tongyi-MAI/Z-Image-Turbo", "Repo catalog has credentials but scripts/ai-card-generator.mjs has no Hugging Face image executor."],
  ["image-fal-flux", "fal-image", "fal-ai/flux/schnell", "FAL_KEY missing and generator has no fal-image executor."],
  ["image-together-flux", "together-image", "black-forest-labs/FLUX.1-schnell-Free", "TOGETHER_API_KEY missing and generator has no together-image executor."],
  ["image-replicate-flux", "replicate-image", "black-forest-labs/flux-schnell", "REPLICATE_API_TOKEN missing and generator has no replicate-image executor."]
].map(([id, adapterId, model, reason]) => ({ id, adapterId, model, blockedReason: reason }));

if (isMainModule()) {
  await main();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = resolve(args["output-dir"] || defaultOutputDir);
  const phase = args.phase || "smoke";
  const phaseDirName = args["phase-dir"] || phase;
  const live = args.live === true || args.live === "true" || String(process.env.CUSTOMCARD_BENCHMARK_LIVE || "").toLowerCase() === "enabled";
  const env = loadBenchmarkEnv();
  mkdirSync(outputDir, { recursive: true });

  const candidates = buildCandidateCatalog(env);
  writeJson(resolve(outputDir, "candidate-catalog.json"), candidates);
  writeMarkdown(resolve(outputDir, "candidate-catalog.md"), buildCandidateCatalogMarkdown(candidates));
  writeJson(resolve(outputDir, "resolved-flows-before-benchmark.json"), sanitize(resolveAiFlowConfigs(env), env));

  if (!live) {
    const plannedRuns = applyRunFilters(plannedRunsForPhase(phase, candidates), args);
    writeJson(resolve(outputDir, `${phaseDirName}-dry-run.json`), {
      phase,
      liveProviderCallsEnabled: false,
      plannedRuns: plannedRuns.map(plannedRunSummary)
    });
    console.log(JSON.stringify({ outputDir: relativePath(outputDir), phase, dryRun: true }, null, 2));
    return;
  }

  const providerHttp = [];
  const fetchImpl = createLoggingFetch(providerHttp, env);
  const service = createAiCardGenerationService({ env, fetchImpl });
  const phaseDir = resolve(outputDir, phaseDirName);
  mkdirSync(phaseDir, { recursive: true });
  const plannedRuns = applyRunFilters(plannedRunsForPhase(phase, candidates), args);
  const summary = {
    phase,
    phaseDir: phaseDirName,
    createdAtIso: new Date().toISOString(),
    liveProviderCallsEnabled: true,
    outputDir: relativePath(outputDir),
    envRouting: {
      aiEnvSources: [".env.local", "infra/env/.env"].filter((filePath) => existsSync(resolve(repoRoot, filePath))),
      configuredProviderKeys: Object.keys(env).filter(isSafeConfiguredKey).sort(),
      secretsRedacted: true
    },
    plannedRuns: plannedRuns.map(plannedRunSummary),
    runs: [],
    providerHttp
  };

  for (const run of plannedRuns) {
    summary.runs.push(await runBenchmarkCard({ run, phaseDir, service, providerHttp, env, fetchImpl }));
    writeJson(resolve(outputDir, `${phaseDirName}-summary.json`), sanitize(summary, env));
  }

  writeJson(resolve(outputDir, `${phaseDirName}-provider-http.json`), sanitize(providerHttp, env));
  writeJson(resolve(outputDir, `${phaseDirName}-summary.json`), sanitize(summary, env));
  writeMarkdown(resolve(outputDir, `${phaseDirName}-README.md`), buildPhaseReadme(summary));
  console.log(JSON.stringify({ outputDir: relativePath(outputDir), phase, runCount: summary.runs.length }, null, 2));
}

function buildCandidateCatalog(env) {
  const text = textCandidates.map((candidate) => withAvailability(candidate, env));
  const image = imageCandidates.map((candidate) => withAvailability(candidate, env));
  return {
    text,
    image,
    blockedImageCandidates,
    executableAdapters: {
      text: text.filter((candidate) => candidate.configured).map((candidate) => candidate.adapterId),
      image: image.filter((candidate) => candidate.configured).map((candidate) => candidate.adapterId)
    }
  };
}

function withAvailability(candidate, env) {
  const missingEnv = missingEnvGroups(candidate.requiredEnv || [], env);
  return {
    ...candidate,
    model: candidate.model || env[candidate.modelFromEnv] || "",
    configured: missingEnv.length === 0,
    missingEnv
  };
}

function plannedRunsForPhase(phase, candidates) {
  if (phase === "smoke") return smokeRuns(candidates);
  if (phase === "full") return fullRuns(candidates);
  if (phase === "all") return [...smokeRuns(candidates), ...fullRuns(candidates)];
  throw new Error(`Unknown benchmark phase: ${phase}`);
}

function applyRunFilters(runs, args) {
  return runs.filter((run) => {
    if (args.story && run.storyId !== args.story) return false;
    if (args.text && run.text.id !== args.text) return false;
    if (args.image && run.image.id !== args.image) return false;
    if (args.focus && run.focus !== args.focus) return false;
    return true;
  });
}

function smokeRuns(candidates) {
  const story = stories["first-time-user-birthday"];
  const baselineText = firstConfigured(candidates.text, "text-cloudflare-baseline");
  const baselineImage = firstConfigured(candidates.image, "image-cloudflare-sdxl-lightning");
  const textRuns = candidates.text
    .filter((candidate) => candidate.configured)
    .map((text) => ({
      phase: "smoke",
      storyId: story.id,
      story,
      text,
      image: {
        id: "image-browser-svg-renderer",
        label: "Browser SVG renderer for text-only smoke",
        adapterId: "browser-svg-renderer",
        model: "",
        configured: true,
        missingEnv: []
      },
      focus: "text"
    }));
  const imageRuns = candidates.image
    .filter((candidate) => candidate.configured)
    .map((image) => ({
      phase: "smoke",
      storyId: story.id,
      story,
      text: baselineText,
      image,
      focus: "image"
    }));
  return uniqueRuns([...textRuns, ...imageRuns].filter((run) => run.text && run.image));
}

function fullRuns(candidates) {
  const textIds = new Set(["text-cloudflare-baseline", "text-hf-qwen3-235b-a22b", "text-hf-deepseek-v4-flash"]);
  const imageIds = new Set(["image-deepai-hd", "image-cloudflare-flux-schnell"]);
  const texts = candidates.text.filter((candidate) => candidate.configured && textIds.has(candidate.id));
  const images = candidates.image.filter((candidate) => candidate.configured && imageIds.has(candidate.id));
  return Object.values(stories).flatMap((story) =>
    texts.flatMap((text) =>
      images.map((image) => ({
        phase: "full",
        storyId: story.id,
        story,
        text,
        image,
        focus: "combo"
      }))
    )
  );
}

function firstConfigured(candidates, preferredId) {
  return candidates.find((candidate) => candidate.id === preferredId && candidate.configured) || candidates.find((candidate) => candidate.configured);
}

function uniqueRuns(runs) {
  const seen = new Set();
  return runs.filter((run) => {
    const key = `${run.phase}:${run.storyId}:${run.text.id}:${run.image.id}:${run.focus}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function runBenchmarkCard({ run, phaseDir, service, providerHttp, env, fetchImpl }) {
  const runId = `${run.storyId}__${run.text.id}__${run.image.id}`;
  const runDir = resolve(phaseDir, runId);
  mkdirSync(runDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const providerStartIndex = providerHttp.length;
  const aiFlowConfig = buildRunAiFlowConfig(run);
  const request = {
    ...run.story.request,
    aiFlowConfig
  };
  writeJson(resolve(runDir, "request.json"), sanitize(request, env));
  writeJson(resolve(runDir, "run-config.json"), sanitize({ ...plannedRunSummary(run), aiFlowConfig }, env));

  try {
    const response = await service.generateCard(request, {
      rateKey: `model-benchmark-${runId}-${Date.now()}`,
      trustRequestAiFlowConfig: true
    });
    const providerCalls = providerHttp.slice(providerStartIndex);
    const payload = sanitize(response.payload, env);
    writeJson(resolve(runDir, "payload.json"), payload);
    writeJson(resolve(runDir, "provider-http.json"), sanitize(providerCalls, env));
    const panelFiles = await materializePanels({ runDir, payload, fetchImpl, env });
    const contactSheet = await renderContactSheet({ runDir, run, panelFiles });
    const autoChecks = autoGrade({ run, payload, panelFiles, providerCalls });
    const runResult = {
      ...plannedRunSummary(run),
      runDir: relativePath(runDir),
      startedAt,
      finishedAt: new Date().toISOString(),
      statusCode: response.statusCode,
      generatedBy: payload.generated_by,
      cardCopyModel: payload.ai_flow?.card_copy?.model,
      imageModel: payload.ai_flow?.card_image?.model,
      providerFailures: {
        text: payload.ai_flow?.card_copy?.provider_failure,
        image: payload.ai_flow?.card_image?.provider_failure
      },
      panelCount: panelFiles.length,
      panelFiles: panelFiles.map((file) => ({ ...file, path: relativePath(file.path), previewPath: relativePath(file.previewPath) })),
      contactSheet: contactSheet ? relativePath(contactSheet) : undefined,
      providerCallCount: providerCalls.length,
      autoChecks
    };
    writeJson(resolve(runDir, "auto-checks.json"), autoChecks);
    writeJson(resolve(runDir, "run-result.json"), sanitize(runResult, env));
    writeMarkdown(resolve(runDir, "manual-grade-template.md"), buildManualGradeTemplate(runResult, run));
    return sanitize(runResult, env);
  } catch (error) {
    const providerCalls = providerHttp.slice(providerStartIndex);
    const failure = {
      ...plannedRunSummary(run),
      runDir: relativePath(runDir),
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      providerCallCount: providerCalls.length
    };
    writeJson(resolve(runDir, "provider-http.json"), sanitize(providerCalls, env));
    writeJson(resolve(runDir, "error.json"), sanitize(failure, env));
    return sanitize(failure, env);
  }
}

function buildRunAiFlowConfig(run) {
  return [
    {
      flowId: "customer-chat",
      primaryAdapterId: "deterministic-customer-chat",
      fallbackAdapterId: "deterministic-customer-chat",
      liveProviderCallsEnabled: false,
      queueEnabled: false,
      fallbackQueueEnabled: true
    },
    {
      flowId: "card-copy",
      primaryAdapterId: run.text.adapterId,
      fallbackAdapterId: "deterministic-customer-chat",
      model: run.text.model,
      liveProviderCallsEnabled: run.text.adapterId !== "deterministic-customer-chat",
      queueEnabled: false,
      fallbackQueueEnabled: true,
      rateLimitPerMinute: 4,
      monthlyBudgetCents: 5000,
      perRequestBudgetCents: 5,
      maxRetries: 1,
      maxTokens: 2200,
      temperature: 0.62
    },
    {
      flowId: "card-image",
      primaryAdapterId: run.image.adapterId,
      fallbackAdapterId: "browser-svg-renderer",
      model: run.image.model,
      liveProviderCallsEnabled: run.image.adapterId !== "browser-svg-renderer",
      queueEnabled: false,
      fallbackQueueEnabled: true,
      rateLimitPerMinute: 4,
      monthlyBudgetCents: 4000,
      perRequestBudgetCents: 1,
      maxRetries: 1,
      maxTokens: 0,
      temperature: 0
    }
  ];
}

async function materializePanels({ runDir, payload, fetchImpl, env }) {
  const imagesByPanel = new Map((payload.images || []).map((image) => [image.panel_id, image]));
  const panelFiles = [];
  for (const panelId of panelIds) {
    const image = imagesByPanel.get(panelId);
    if (!image?.image_url) continue;
    const decoded = await decodeImageUrl(image.image_url, fetchImpl, env);
    const file = resolve(runDir, `provider-${panelId}${decoded.ext}`);
    writeFileSync(file, decoded.buffer);
    const panelCopy = (payload.card_copy?.panels || []).find((panel) => panel.id === panelId) || {};
    const previewBuffer = await renderPanelPreview({ imageBuffer: decoded.buffer, panelId, panelCopy });
    const previewFile = resolve(runDir, `preview-${panelId}.png`);
    writeFileSync(previewFile, previewBuffer);
    panelFiles.push({
      panelId,
      path: file,
      previewPath: previewFile,
      width: image.width,
      height: image.height,
      prompt: image.revised_prompt || "",
      sourceKind: decoded.sourceKind,
      contentType: decoded.contentType
    });
  }
  return panelFiles;
}

async function decodeImageUrl(imageUrl, fetchImpl, env) {
  if (String(imageUrl).startsWith("data:")) return decodeDataUrl(imageUrl);
  if (/^https?:\/\//i.test(String(imageUrl))) {
    const response = await fetchImpl(imageUrl, { method: "GET" });
    if (!response.ok) throw new Error(`Generated image URL fetch failed with ${response.status}: ${redactUrl(imageUrl, env)}`);
    const contentType = response.headers?.get?.("content-type") || "image/png";
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      ext: extForContentType(contentType),
      sourceKind: "hosted-url",
      contentType
    };
  }
  return { buffer: Buffer.from(String(imageUrl), "base64"), ext: ".png", sourceKind: "base64", contentType: "image/png" };
}

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.*)$/s);
  if (!match) throw new Error("Generated image was not a base64 data URL.");
  const contentType = match[1] || "image/png";
  return {
    buffer: Buffer.from(match[2], "base64"),
    ext: extForContentType(contentType),
    sourceKind: "data-url",
    contentType
  };
}

function extForContentType(contentType) {
  if (/svg/i.test(contentType)) return ".svg";
  if (/jpe?g/i.test(contentType)) return ".jpg";
  if (/webp/i.test(contentType)) return ".webp";
  return ".png";
}

async function renderPanelPreview({ imageBuffer, panelId, panelCopy }) {
  const headline = wrapText(panelCopy.headline || "", panelId === "front" ? 24 : 30).slice(0, 3);
  const body = wrapText(panelCopy.body || "", 44).slice(0, panelId.startsWith("inside") ? 8 : 4);
  const layout = previewLayout(panelId);
  const overlay = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100" viewBox="0 0 1500 2100">
      <rect x="88" y="88" width="1324" height="1924" rx="32" fill="none" stroke="${layout.frameColor}" stroke-width="8" opacity="0.72"/>
      <text x="750" y="${layout.headlineY}" text-anchor="middle" font-family="Georgia, Times New Roman, serif" fill="${layout.headlineColor}" font-size="${layout.headlineSize}" font-weight="700">
        ${headline.map((line, index) => `<tspan x="750" dy="${index === 0 ? 0 : layout.headlineSize * 1.08}">${escapeXml(line)}</tspan>`).join("")}
      </text>
      <text x="750" y="${layout.bodyY}" text-anchor="middle" font-family="Inter, Arial, sans-serif" fill="${layout.bodyColor}" font-size="${layout.bodySize}" font-weight="500">
        ${body.map((line, index) => `<tspan x="750" dy="${index === 0 ? 0 : layout.bodySize * 1.25}">${escapeXml(line)}</tspan>`).join("")}
      </text>
    </svg>
  `);
  return sharp(imageBuffer)
    .resize(1500, 2100, { fit: "cover" })
    .composite([{ input: overlay }])
    .png()
    .toBuffer();
}

function previewLayout(panelId) {
  if (panelId === "front") {
    return {
      headlineY: 1360,
      bodyY: 1535,
      headlineSize: 82,
      bodySize: 38,
      headlineColor: "#202824",
      bodyColor: "#2d3733",
      frameColor: "#31584e"
    };
  }
  if (panelId === "back") {
    return {
      headlineY: 1588,
      bodyY: 1694,
      headlineSize: 56,
      bodySize: 31,
      headlineColor: "#25302b",
      bodyColor: "#56645d",
      frameColor: "#31584e"
    };
  }
  return {
    headlineY: 560,
    bodyY: 740,
    headlineSize: 66,
    bodySize: 37,
    headlineColor: "#25302b",
    bodyColor: "#3f4c45",
    frameColor: "#c49b42"
  };
}

async function renderContactSheet({ runDir, run, panelFiles }) {
  if (panelFiles.length === 0) return undefined;
  const thumbWidth = 300;
  const thumbHeight = 420;
  const labelHeight = 84;
  const gap = 24;
  const width = gap + panelFiles.length * (thumbWidth + gap);
  const height = labelHeight + thumbHeight + gap * 2;
  const base = sharp({ create: { width, height, channels: 4, background: "#f7f3ea" } });
  const composites = [];
  for (let index = 0; index < panelFiles.length; index += 1) {
    const file = panelFiles[index];
    const left = gap + index * (thumbWidth + gap);
    const thumb = await sharp(file.previewPath).resize(thumbWidth, thumbHeight, { fit: "contain", background: "#ffffff" }).png().toBuffer();
    const label = Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${thumbWidth}" height="${labelHeight}">
        <text x="${thumbWidth / 2}" y="28" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#24302b">${escapeXml(file.panelId)}</text>
        <text x="${thumbWidth / 2}" y="56" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#56645d">${escapeXml(run.image.id)}</text>
      </svg>
    `);
    composites.push({ input: label, left, top: gap });
    composites.push({ input: thumb, left, top: gap + labelHeight });
  }
  const output = resolve(runDir, "contact-sheet.png");
  writeFileSync(output, await base.composite(composites).png().toBuffer());
  return output;
}

function autoGrade({ run, payload, panelFiles, providerCalls }) {
  const panels = Array.isArray(payload.card_copy?.panels) ? payload.card_copy.panels : [];
  const allText = panels.map((panel) => `${panel.headline || ""} ${panel.body || ""}`).join("\n");
  const allPrompts = panelFiles.map((panel) => panel.prompt || "").join("\n");
  const missingMustInclude = run.story.must_include.filter((term) => !textContains(allText, term) && !textContains(allPrompts, term));
  const avoidedFailures = run.story.must_avoid.filter((term) => textContains(allText, term) || textContains(allPrompts, term));
  const checks = {
    fourPanels: panelFiles.length === 4 && panels.length === 4,
    noProviderFailure: !payload.ai_flow?.card_copy?.provider_failure && !payload.ai_flow?.card_image?.provider_failure,
    mustIncludeCovered: missingMustInclude.length === 0,
    mustAvoidClean: avoidedFailures.length === 0,
    providerCalls: providerCalls.length
  };
  return {
    advisoryOnly: true,
    checks,
    missingMustInclude,
    avoidedFailures,
    note: "Automated checks are scaffolding only. Final visual/design grades must be assigned by the agent using the rubric."
  };
}

function plannedRunSummary(run) {
  return {
    phase: run.phase,
    focus: run.focus,
    storyId: run.storyId,
    textCandidateId: run.text.id,
    textAdapterId: run.text.adapterId,
    textModel: run.text.model,
    imageCandidateId: run.image.id,
    imageAdapterId: run.image.adapterId,
    imageModel: run.image.model
  };
}

function buildManualGradeTemplate(result, run) {
  return [
    `# Manual Grade: ${run.storyId}`,
    "",
    `- Text: ${run.text.label} (${run.text.model || run.text.adapterId})`,
    `- Image: ${run.image.label} (${run.image.model || run.image.adapterId})`,
    `- Contact sheet: ${result.contactSheet ? `[open](./${basename(result.contactSheet)})` : "missing"}`,
    "",
    "## Rubric",
    "",
    "- Total score /100:",
    "- Tier:",
    "- Dimension scores:",
    "- Hard failure caps triggered:",
    "- Best panel:",
    "- Worst panel:",
    "- Blocking failures:",
    "- Smallest prompt/config fix:",
    "- Prompt-side or model-capability-side:",
    "- Estimated cost per 4-panel card:",
    "",
    "## Notes",
    ""
  ].join("\n");
}

function buildCandidateCatalogMarkdown(catalog) {
  const lines = ["# Model Benchmark Candidate Catalog", "", "## Text Candidates", ""];
  lines.push("| Candidate | Adapter | Model | Configured | Missing env |", "| --- | --- | --- | --- | --- |");
  for (const candidate of catalog.text) {
    lines.push(`| \`${candidate.id}\` | \`${candidate.adapterId}\` | \`${candidate.model || ""}\` | ${candidate.configured ? "yes" : "no"} | ${candidate.missingEnv.join(", ") || "none"} |`);
  }
  lines.push("", "## Image Candidates", "");
  lines.push("| Candidate | Adapter | Model | Configured | Missing env |", "| --- | --- | --- | --- | --- |");
  for (const candidate of catalog.image) {
    lines.push(`| \`${candidate.id}\` | \`${candidate.adapterId}\` | \`${candidate.model || ""}\` | ${candidate.configured ? "yes" : "no"} | ${candidate.missingEnv.join(", ") || "none"} |`);
  }
  lines.push("", "## Blocked Image Candidates", "");
  lines.push("| Candidate | Adapter | Model | Reason |", "| --- | --- | --- | --- |");
  for (const candidate of catalog.blockedImageCandidates) {
    lines.push(`| \`${candidate.id}\` | \`${candidate.adapterId}\` | \`${candidate.model}\` | ${candidate.blockedReason} |`);
  }
  lines.push("");
  return lines.join("\n");
}

function buildPhaseReadme(summary) {
  const lines = [`# Model Benchmark ${summary.phase}`, "", `Created: ${summary.createdAtIso}`, "", "| Run | Status | Panels | Contact sheet |", "| --- | --- | --- | --- |"];
  for (const run of summary.runs) {
    const status = run.status || (run.statusCode === 200 ? "ok" : `status ${run.statusCode}`);
    const contact = run.contactSheet ? `[open](${run.contactSheet.replace(`${summary.phase}/`, "")})` : "n/a";
    lines.push(`| ${run.storyId} / ${run.textCandidateId} / ${run.imageCandidateId} | ${status} | ${run.panelCount || 0} | ${contact} |`);
  }
  lines.push("");
  return lines.join("\n");
}

function loadBenchmarkEnv() {
  const target = { ...process.env };
  for (const filePath of [".env.local", "infra/env/.env"]) {
    const absolutePath = resolve(repoRoot, filePath);
    if (!existsSync(absolutePath)) continue;
    const parsed = parseDotenv(readFileSync(absolutePath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) if (!target[key]) target[key] = value;
  }
  loadLocalAiEnvFiles({ cwd: repoRoot, target });
  target.CUSTOMCARD_AI_ALLOW_REQUEST_CONFIG = "true";
  target.CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED = "true";
  target.CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED = "true";
  return target;
}

function createLoggingFetch(logs, env) {
  return async function loggingFetch(url, options = {}) {
    const started = Date.now();
    const response = await fetch(url, options);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers?.get?.("content-type") || "";
    logs.push({
      url: redactUrl(String(url), env),
      method: options.method || "GET",
      request: {
        headers: redactHeaders(options.headers || {}, env),
        body: sanitize(parseBody(options.body), env)
      },
      response: {
        status: response.status,
        ok: response.ok,
        contentType,
        byteLength: buffer.length,
        body: contentType.includes("application/json") ? sanitize(parseJson(buffer.toString("utf8")), env) : undefined
      },
      durationMs: Date.now() - started
    });
    return new Response(buffer, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
}

function missingEnvGroups(groups, env) {
  return groups.flatMap((group) => {
    const keys = Array.isArray(group) ? group : [group];
    return keys.some((key) => hasEnv(env[key])) ? [] : [keys.join(" or ")];
  });
}

function hasEnv(value) {
  const text = String(value || "").trim().toLowerCase();
  return Boolean(text && !["changeme", "replace-me", "dummy", "fake", "sample", "test", "unset"].includes(text));
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const [key, inlineValue] = value.slice(2).split("=");
    if (inlineValue !== undefined) parsed[key] = inlineValue;
    else if (values[index + 1] && !values[index + 1].startsWith("--")) parsed[key] = values[++index];
    else parsed[key] = true;
  }
  return parsed;
}

function parseDotenv(text) {
  const result = {};
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    result[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return result;
}

function parseBody(body) {
  if (!body) return undefined;
  if (typeof body === "string") return parseJson(body) || body;
  return "<non-string-body>";
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function sanitize(value, env) {
  if (value === undefined) return undefined;
  let serialized = JSON.stringify(value, null, 2);
  if (serialized === undefined) return undefined;
  for (const secret of Object.values(env || {})) {
    if (typeof secret !== "string" || secret.length < 8) continue;
    serialized = serialized.split(secret).join("[redacted]");
  }
  return JSON.parse(serialized);
}

function redactHeaders(headers, env) {
  const entries = headers instanceof Headers ? Array.from(headers.entries()) : Object.entries(headers || {});
  return Object.fromEntries(entries.map(([key, value]) => [
    key,
    /authorization|api-key|x-api-key|token|key/i.test(key) ? "[redacted]" : redactValue(String(value), env)
  ]));
}

function redactUrl(url, env) {
  return redactValue(url, env);
}

function redactValue(value, env) {
  let redacted = String(value || "");
  for (const secret of Object.values(env || {})) {
    if (typeof secret === "string" && secret.length >= 8) redacted = redacted.split(secret).join("[redacted]");
  }
  return redacted;
}

function isSafeConfiguredKey(key) {
  return /^(CUSTOMCARD_AI_|CLOUDFLARE_|GOOGLE_|GEMINI_|HUGGINGFACE_|DEEPAI_|OPENAI_|ANTHROPIC_)/.test(key);
}

function textContains(value, term) {
  return String(value || "").toLowerCase().includes(String(term || "").toLowerCase());
}

function wrapText(value, maxChars) {
  const words = String(value || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function escapeXml(value) {
  return String(value || "").replace(/[<>&'"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;"
  })[char]);
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
  return filePath;
}

function writeMarkdown(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, value);
  return filePath;
}

function relativePath(filePath) {
  return filePath.replace(`${repoRoot}/`, "");
}

function isMainModule() {
  return process.argv[1] && resolve(process.argv[1]) === import.meta.filename;
}
