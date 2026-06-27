import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const repoRoot = resolve(import.meta.dirname, "..");
const defaultManifestPath = resolve(repoRoot, "docs/website-asset-generation-batch.json");
const defaultWorkflowPath = resolve(repoRoot, "comfyui-workflows/customcard-sdxl-checkpoint.json");
const defaultNegativePrompt = [
  "readable text",
  "letters",
  "words",
  "numbers",
  "fake calligraphy",
  "signature",
  "logo",
  "watermark",
  "QR code",
  "barcode",
  "caption plaque",
  "text box",
  "brand mark",
  "product label",
  "dense wallpaper",
  "low contrast text-safe zone",
  "people",
  "faces",
  "hands",
  "cropped bodies",
  "distorted anatomy"
].join(", ");

if (isCliEntrypoint()) {
  await main();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = resolve(repoRoot, String(args.manifest || defaultManifestPath));
  const manifest = readJson(manifestPath);
  const selected = selectAssets(manifest, args);
  const dryRun = enabled(args["dry-run"]);

  const plan = selected.map(({ batch, asset }, index) => ({
    index,
    batchId: batch.id,
    assetId: asset.id,
    filename: asset.filename,
    generator: batch.recommendedGenerator,
    width: boundedInteger(args.width, 256, 1536, batch.width || dimensionsForAspect(asset.aspectRatio).width),
    height: boundedInteger(args.height, 256, 1536, batch.height || dimensionsForAspect(asset.aspectRatio).height),
    prompt: buildPrompt({ manifest, batch, asset }),
    negativePrompt: String(args["negative-prompt"] || manifest.globalNegativePrompt || defaultNegativePrompt)
  }));

  if (dryRun) {
    console.log(JSON.stringify({ status: "dry-run", count: plan.length, assets: plan }, null, 2));
    return;
  }

  const comfyUrl = normalizeComfyUrl(args["comfy-url"] || process.env.CUSTOMCARD_COMFYUI_URL || process.env.COMFYUI_URL || "http://127.0.0.1:8188");
  const workflowPath = resolve(repoRoot, String(args["workflow-path"] || process.env.CUSTOMCARD_COMFYUI_WORKFLOW_PATH || defaultWorkflowPath));
  const workflowTemplate = readText(workflowPath);
  const checkpoint = String(args.checkpoint || process.env.CUSTOMCARD_COMFYUI_CHECKPOINT || "sd_xl_turbo_1.0_fp16.safetensors");
  const steps = boundedInteger(args.steps, 1, 80, 2);
  const cfg = boundedNumber(args.cfg, 0, 20, 1.5);
  const sampler = String(args.sampler || "euler_ancestral");
  const scheduler = String(args.scheduler || "sgm_uniform");
  const seedBase = boundedInteger(args.seed, 0, 2 ** 32 - 1, Math.floor(Date.now() % 2 ** 32));
  const pollMs = boundedInteger(args["poll-ms"], 250, 10_000, 1500);
  const timeoutMs = boundedInteger(args["timeout-ms"], 10_000, 900_000, 360_000);
  const results = [];

  for (const item of plan) {
    const seed = seedBase + item.index;
    const workflow = renderWorkflowTemplate(workflowTemplate, {
      cfg,
      checkpoint,
      height: item.height,
      negativePrompt: item.negativePrompt,
      panelId: item.assetId,
      prompt: item.prompt,
      sampler,
      scheduler,
      seed,
      steps,
      width: item.width,
      workflowId: `website-assets-${item.batchId}`
    });
    const startedAt = Date.now();
    const promptId = await enqueueWorkflow(comfyUrl, workflow);
    const outputs = await waitForPromptImages(comfyUrl, promptId, { pollMs, timeoutMs });
    const image = outputs[0];
    if (!image) throw new Error(`ComfyUI finished ${item.assetId} without an output image.`);
    const imageBuffer = await fetchComfyImage(comfyUrl, image);
    const outputPath = resolve(repoRoot, item.filename);
    const saved = await saveImage({ imageBuffer, outputPath, width: item.width, height: item.height });
    const sidecarPath = `${outputPath}.json`;
    const record = {
      assetId: item.assetId,
      batchId: item.batchId,
      outputPath: relativePath(outputPath),
      prompt: item.prompt,
      negativePrompt: item.negativePrompt,
      checkpoint,
      steps,
      cfg,
      sampler,
      scheduler,
      seed,
      width: item.width,
      height: item.height,
      promptId,
      comfyUrl,
      workflowPath: relativePath(workflowPath),
      durationMs: Date.now() - startedAt,
      bytes: saved.bytes
    };
    writeJson(sidecarPath, record);
    results.push(record);
    console.log(JSON.stringify({ status: "saved", assetId: item.assetId, outputPath: record.outputPath, promptId }, null, 2));
  }

  console.log(JSON.stringify({ status: "complete", count: results.length, results }, null, 2));
}

function selectAssets(manifest, args) {
  const batchFilter = stringSet(args.batch);
  const assetFilter = stringSet(args.asset);
  const limit = boundedInteger(args.limit, 0, 10_000, 0);
  const selected = [];
  for (const batch of manifest.batches || []) {
    if (batchFilter.size > 0 && !batchFilter.has(batch.id)) continue;
    for (const asset of batch.assets || []) {
      if (!asset.prompt) continue;
      if (assetFilter.size > 0 && !assetFilter.has(asset.id)) continue;
      selected.push({ batch, asset });
      if (limit > 0 && selected.length >= limit) return selected;
    }
  }
  if (selected.length === 0) {
    throw new Error("No prompt-backed assets selected. Use --batch or --asset with ids from the manifest.");
  }
  return selected;
}

function buildPrompt({ manifest, batch, asset }) {
  const rules = [
    ...asArray(manifest.globalCardArtRules),
    ...asArray(manifest.customArtCardContract?.promptRules),
    ...asArray(batch.artCardRules),
    ...formatAssetArtContract(asset.artCardContract)
  ];
  return [...rules, asset.prompt].filter(Boolean).join(" ");
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function formatAssetArtContract(contract) {
  if (!contract) return [];
  const pairs = [
    ["Recipient relationship", contract.relationship],
    ["Remembered object", contract.memoryObject],
    ["Emotional job", contract.emotionalTruth],
    ["Art move", contract.artMove],
    ["Forbidden cliches", Array.isArray(contract.forbiddenCliches) ? contract.forbiddenCliches.join(", ") : contract.forbiddenCliches],
    ["Text-safe composition", contract.textSafeComposition]
  ];
  return pairs
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([label, value]) => `${label}: ${value}.`);
}

function renderWorkflowTemplate(source, variables) {
  const rendered = source
    .replace(/\{\{checkpoint\}\}/g, escapeTemplateValue(variables.checkpoint))
    .replace(/\{\{prompt\}\}/g, escapeTemplateValue(variables.prompt))
    .replace(/\{\{negative_prompt\}\}/g, escapeTemplateValue(variables.negativePrompt))
    .replace(/\{\{height\}\}/g, String(variables.height))
    .replace(/\{\{width\}\}/g, String(variables.width))
    .replace(/\{\{cfg\}\}/g, String(variables.cfg))
    .replace(/\{\{sampler\}\}/g, escapeTemplateValue(variables.sampler))
    .replace(/\{\{scheduler\}\}/g, escapeTemplateValue(variables.scheduler))
    .replace(/\{\{seed\}\}/g, String(variables.seed))
    .replace(/\{\{steps\}\}/g, String(variables.steps))
    .replace(/\{\{workflow_id\}\}/g, escapeTemplateValue(variables.workflowId))
    .replace(/\{\{panel_id\}\}/g, escapeTemplateValue(variables.panelId));
  return JSON.parse(rendered);
}

async function enqueueWorkflow(comfyUrl, workflow) {
  const response = await fetchJson(`${comfyUrl}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: `customcard-website-assets-${randomUUID()}` })
  });
  if (!response.prompt_id) throw new Error(`ComfyUI did not return prompt_id: ${JSON.stringify(response)}`);
  return response.prompt_id;
}

async function waitForPromptImages(comfyUrl, promptId, { pollMs, timeoutMs }) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const history = await fetchJson(`${comfyUrl}/history/${encodeURIComponent(promptId)}`, { method: "GET" });
    const item = history[promptId];
    if (item?.status?.completed === false && item?.status?.status_str === "error") {
      throw new Error(`ComfyUI prompt failed: ${JSON.stringify(item.status)}`);
    }
    const images = Object.values(item?.outputs ?? {}).flatMap((output) => output.images ?? []);
    if (images.length > 0) return images;
    await wait(pollMs);
  }
  throw new Error(`ComfyUI prompt ${promptId} timed out after ${timeoutMs}ms.`);
}

async function fetchComfyImage(comfyUrl, image) {
  const url = new URL(`${comfyUrl}/view`);
  url.searchParams.set("filename", image.filename);
  url.searchParams.set("subfolder", image.subfolder ?? "");
  url.searchParams.set("type", image.type ?? "output");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`ComfyUI image fetch failed: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function saveImage({ imageBuffer, outputPath, width, height }) {
  mkdirSync(dirname(outputPath), { recursive: true });
  const extension = extname(outputPath).toLowerCase();
  let pipeline = sharp(imageBuffer).resize(width, height, { fit: "cover" });
  if (extension === ".webp") {
    pipeline = pipeline.webp({ quality: 86, effort: 4 });
  } else if (extension === ".jpg" || extension === ".jpeg") {
    pipeline = pipeline.jpeg({ quality: 88, mozjpeg: true });
  } else {
    pipeline = pipeline.png({ compressionLevel: 9 });
  }
  const buffer = await pipeline.toBuffer();
  writeFileSync(outputPath, buffer);
  return { bytes: buffer.length };
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Expected JSON from ${url}, got: ${text.slice(0, 500)}`);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}: ${JSON.stringify(payload)}`);
  return payload;
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function readText(filePath) {
  if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  return readFileSync(filePath, "utf8");
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const [rawKey, inlineValue] = value.slice(2).split("=", 2);
    const next = values[index + 1];
    if (inlineValue !== undefined) {
      parsed[rawKey] = inlineValue;
    } else if (next && !next.startsWith("--")) {
      parsed[rawKey] = next;
      index += 1;
    } else {
      parsed[rawKey] = "true";
    }
  }
  return parsed;
}

function stringSet(value) {
  return new Set(String(value || "").split(",").map((item) => item.trim()).filter(Boolean));
}

function dimensionsForAspect(aspectRatio) {
  if (aspectRatio === "16:10") return { width: 1536, height: 960 };
  if (aspectRatio === "4:3") return { width: 1440, height: 1080 };
  if (aspectRatio === "9:11") return { width: 900, height: 1100 };
  return { width: 960, height: 1344 };
}

function boundedInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed === 0) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function boundedNumber(value, min, max, fallback) {
  const parsed = Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function enabled(value) {
  return /^(1|true|yes|enabled|on)$/i.test(String(value ?? ""));
}

function normalizeComfyUrl(value) {
  const parsed = new URL(String(value || "http://127.0.0.1:8188"));
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/+$/, "");
}

function escapeTemplateValue(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n");
}

function wait(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function relativePath(filePath) {
  return resolve(filePath).replace(`${repoRoot}\\`, "").replaceAll("\\", "/");
}

function isCliEntrypoint() {
  return Boolean(process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href);
}
