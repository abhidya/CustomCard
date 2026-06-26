import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import sharp from "sharp";
import {
  cardGenerationBenchmarkFixtures,
  evaluateBenchmarkQuality
} from "./card-generation-benchmark.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const outputRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");
const panelIds = ["front", "inside-left", "inside-right", "back"];

if (isMainModule()) {
  await main();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fixtureId = String(args.fixture || "botanical-birthday");
  const fixture = cardGenerationBenchmarkFixtures[fixtureId];
  if (!fixture) throw new Error(`Unknown benchmark fixture: ${fixtureId}`);

  const comfyUrl = String(args["comfy-url"] || process.env.COMFYUI_URL || "http://127.0.0.1:8188").replace(/\/+$/, "");
  const checkpoint = String(args.checkpoint || process.env.CUSTOMCARD_LOCAL_COMFYUI_CHECKPOINT || "DreamShaper_8_pruned.safetensors");
  const width = boundedInteger(args.width, 256, 1536, 512);
  const height = boundedInteger(args.height, 256, 1536, 704);
  const steps = boundedInteger(args.steps, 4, 80, 18);
  const cfg = boundedNumber(args.cfg, 1, 20, 6.5);
  const sampler = String(args.sampler || "euler");
  const scheduler = String(args.scheduler || "normal");
  const seedBase = boundedInteger(args.seed, 0, 2 ** 32 - 1, Math.floor(Date.now() % 2 ** 32));
  const selectedPanels = String(args.panels || panelIds.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  for (const panelId of selectedPanels) {
    if (!panelIds.includes(panelId)) throw new Error(`Unknown panel id: ${panelId}`);
  }

  const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runId = `local-comfyui-benchmark-${runStamp}`;
  const runDir = resolve(outputRoot, runId);
  const fixtureDir = resolve(runDir, fixture.id);
  mkdirSync(fixtureDir, { recursive: true });

  const systemStats = await readJson(`${comfyUrl}/system_stats`);
  const git = readGitState();
  const cardCopy = buildLocalCardCopy(fixture);
  const panelFiles = [];
  const generatedImages = [];
  const panelMetrics = [];

  for (const [index, panelId] of selectedPanels.entries()) {
    const panelStartedAt = Date.now();
    const panel = cardCopy.panels.find((candidate) => candidate.id === panelId);
    const seed = seedBase + index;
    const workflow = buildTxt2ImgWorkflow({
      cfg,
      checkpoint,
      height,
      negativePrompt: panel.image_negative_prompt,
      panelId,
      prompt: panel.image_prompt,
      sampler,
      scheduler,
      seed,
      steps,
      width
    });
    const promptId = await enqueueWorkflow(comfyUrl, workflow);
    const outputs = await waitForPromptImages(comfyUrl, promptId, {
      pollMs: boundedInteger(args["poll-ms"], 250, 10_000, 1500),
      timeoutMs: boundedInteger(args["timeout-ms"], 10_000, 900_000, 360_000)
    });
    const image = outputs[0];
    if (!image) throw new Error(`ComfyUI finished ${panelId} without an output image.`);

    const imageBuffer = await fetchComfyImage(comfyUrl, image);
    const providerFile = resolve(fixtureDir, `provider-${panelId}.png`);
    writeFileSync(providerFile, imageBuffer);
    const previewFile = resolve(fixtureDir, `preview-${panelId}.png`);
    await renderPreview({ imageBuffer, outputFile: previewFile, panel });
    const metadata = await sharp(imageBuffer).metadata();
    const durationMs = Date.now() - panelStartedAt;
    const promptRecord = {
      panelId,
      prompt: panel.image_prompt,
      negativePrompt: panel.image_negative_prompt,
      checkpoint,
      seed,
      steps,
      cfg,
      sampler,
      scheduler,
      width,
      height,
      promptId,
      promptHash: sha256(panel.image_prompt),
      negativePromptHash: sha256(panel.image_negative_prompt),
      workflowHash: sha256(JSON.stringify(workflow)),
      durationMs
    };
    const record = {
      ...promptRecord,
      providerFile: relativePath(providerFile),
      previewFile: relativePath(previewFile),
      width: metadata.width,
      height: metadata.height
    };
    panelFiles.push(record);
    panelMetrics.push({
      panelId,
      promptId,
      durationMs,
      providerBytes: imageBuffer.length,
      previewFile: relativePath(previewFile),
      providerFile: relativePath(providerFile),
      workflowHash: promptRecord.workflowHash
    });
    generatedImages.push({
      panel_id: panelId,
      image_url: relativePath(providerFile),
      revised_prompt: panel.image_prompt,
      width: metadata.width,
      height: metadata.height
    });
    writeJson(resolve(fixtureDir, `workflow-${panelId}.json`), workflow);
  }

  const payload = {
    status: "succeeded",
    generated_by: "local-comfyui",
    draft_id: `local-comfyui-${fixture.id}`,
    card_copy: cardCopy,
    images: generatedImages,
    ai_flow: {
      card_copy: {
        flow_id: "card-copy",
        primary_adapter_id: "deterministic-local-copy",
        model: "fixture-specific-local-copy",
        live_provider_calls_enabled: false
      },
      card_image: {
        flow_id: "card-image",
        primary_adapter_id: "local-comfyui-api",
        model: checkpoint,
        live_provider_calls_enabled: true,
        provider_failure: ""
      }
    }
  };

  const quality = evaluateBenchmarkQuality({ fixture, payload, panelFiles });
  const contactSheet = await renderContactSheet({ fixtureDir, panelFiles });
  writeJson(resolve(fixtureDir, "customcard-ai-output.json"), payload);
  writeJson(resolve(fixtureDir, "effective-prompts.json"), {
    fixture: fixture.id,
    category: fixture.category,
    requestBody: fixture.request,
    imageModel: checkpoint,
    panelPrompts: panelFiles.map(({ panelId, prompt, negativePrompt, seed }) => ({
      panelId,
      prompt,
      negativePrompt,
      seed
    }))
  });
  writeJson(resolve(fixtureDir, "qa-scorecard.json"), quality);
  writeMarkdown(resolve(fixtureDir, "qa-scorecard.md"), buildQualityScorecardMarkdown({ fixture, quality }));
  writeMarkdown(resolve(fixtureDir, "comparison.md"), buildComparisonMarkdown({
    checkpoint,
    contactSheet,
    fixture,
    panelFiles,
    quality,
    systemStats
  }));
  writeJson(resolve(runDir, "debug-log.json"), {
    runId,
    createdAtIso: new Date().toISOString(),
    mode: "local-comfyui",
    comfyUrl,
    checkpoint,
    dimensions: { width, height },
    steps,
    cfg,
    sampler,
    scheduler,
    fixtureIds: [fixture.id],
    systemStats,
    git,
    panelMetrics,
    fixtures: [
      {
        id: fixture.id,
        outputDir: relativePath(fixtureDir),
        panelCount: panelFiles.length,
        contactSheet: relativePath(contactSheet),
        quality: {
          status: quality.status,
          score: quality.score,
          passed: quality.passed,
          total: quality.total,
          scorecard: relativePath(resolve(fixtureDir, "qa-scorecard.md"))
        }
      }
    ]
  });
  writeMarkdown(resolve(runDir, "README.md"), buildRunReadme({ checkpoint, fixture, panelFiles, quality, runId, contactSheet }));

  console.log(JSON.stringify({
    runId,
    outputDir: relativePath(runDir),
    fixture: fixture.id,
    panelCount: panelFiles.length,
    contactSheet: relativePath(contactSheet),
    score: quality.score,
    status: quality.status
  }, null, 2));
}

function buildLocalCardCopy(fixture) {
  if (fixture.id === "botanical-birthday") {
    return {
      theme_guide: {
        theme_title: "Morning Fern Birthday",
        palette: ["cream", "fern green", "soft moss", "coffee brown"],
        motifs: ["fern fronds", "tiny trail flowers", "morning coffee", "quiet path"],
        border_style: "botanical corner border with generous blank field",
        front_back_pairing: "front carries a brighter botanical corner; back echoes it softly",
        interior_pairing: "inside panels keep the field quiet for readable app-set copy"
      },
      panels: [
        panelCopy({
          id: "front",
          headline: "Happy Birthday Sara",
          body: "For green paths, good coffee, and tiny morning wonders.",
          visualCue: "botanical corner border with a generous blank field"
        }),
        panelCopy({
          id: "inside-left",
          headline: "Coffee And Green Trails",
          body: "I hope the day opens gently, with coffee, green trails, and little things worth noticing.",
          visualCue: "soft fern edge detail with open center"
        }),
        panelCopy({
          id: "inside-right",
          headline: "More Hikes, More Laughter",
          body: "Wishing you more hikes, more laughter, and more quiet joy than the year can hold.",
          visualCue: "tiny trail flowers in two corners, text-safe middle"
        }),
        panelCopy({
          id: "back",
          headline: "Green Paths And Coffee",
          body: "Made for a birthday full of green paths, good coffee, and tiny bright things.",
          visualCue: "minimal botanical back mark near the lower corner"
        })
      ],
      memory_citations: ["fixture:botanical-birthday"]
    };
  }
  throw new Error(`Local copy builder only supports ${fixture.id}.`);
}

function panelCopy({ id, headline, body, visualCue }) {
  const prompt = [
    `Premium vertical greeting-card artwork layer for the ${id} panel.`,
    "botanical watercolor stationery, fern fronds, tiny trail flowers, soft morning light.",
    "corner border, generous blank field, text-safe open center, full-bleed printable 2D artwork.",
    `${visualCue}.`,
    "No readable text, no words, no letters, no numbers, no handwriting, no logo, no watermark."
  ].join(" ");
  return {
    id,
    headline,
    body,
    art_direction: `${visualCue}; keep the composition calm enough for app-rendered typography.`,
    visual_cue: visualCue,
    text_layout: {
      headline_zone: id === "front" ? "upper" : "upper",
      body_zone: id === "back" ? "bottom" : "center",
      alignment: "center",
      font_pairing: "soft-serif",
      color_mode: "dark-ink",
      scale: id === "back" ? "compact" : "standard"
    },
    image_prompt: prompt,
    image_negative_prompt: [
      "readable text",
      "misspelled text",
      "logo",
      "watermark",
      "QR code",
      "folded card mockup",
      "tabletop scene",
      "hands",
      "people",
      "face",
      "portrait",
      "dense confetti",
      "recipient name",
      "main message"
    ].join(", ")
  };
}

function buildTxt2ImgWorkflow({ cfg, checkpoint, height, negativePrompt, panelId, prompt, sampler, scheduler, seed, steps, width }) {
  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: checkpoint }
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: { text: prompt, clip: ["1", 1] }
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: { text: negativePrompt, clip: ["1", 1] }
    },
    "4": {
      class_type: "EmptyLatentImage",
      inputs: { width, height, batch_size: 1 }
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps,
        cfg,
        sampler_name: sampler,
        scheduler,
        denoise: 1,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0]
      }
    },
    "6": {
      class_type: "VAEDecode",
      inputs: { samples: ["5", 0], vae: ["1", 2] }
    },
    "7": {
      class_type: "SaveImage",
      inputs: {
        images: ["6", 0],
        filename_prefix: `customcard-local-${panelId}`
      }
    }
  };
}

async function enqueueWorkflow(comfyUrl, workflow) {
  const response = await fetchJson(`${comfyUrl}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: "customcard-local-benchmark" })
  });
  if (!response.prompt_id) throw new Error(`ComfyUI did not return prompt_id: ${JSON.stringify(response)}`);
  return response.prompt_id;
}

async function waitForPromptImages(comfyUrl, promptId, { pollMs, timeoutMs }) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const history = await readJson(`${comfyUrl}/history/${encodeURIComponent(promptId)}`);
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

async function renderPreview({ imageBuffer, outputFile, panel }) {
  const base = await sharp(imageBuffer).resize(750, 1050, { fit: "cover" }).png().toBuffer();
  const overlay = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="750" height="1050">
      <rect x="75" y="710" width="600" height="230" rx="0" fill="#fffaf0" fill-opacity="0.84"/>
      <text x="375" y="780" text-anchor="middle" font-family="Georgia, serif" font-size="42" font-weight="700" fill="#24302b">${escapeXml(panel.headline)}</text>
      ${wrapText(panel.body, 46).slice(0, 4).map((line, index) =>
        `<text x="375" y="${840 + index * 38}" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" fill="#3f4c45">${escapeXml(line)}</text>`
      ).join("")}
    </svg>
  `);
  await sharp(base).composite([{ input: overlay }]).png().toFile(outputFile);
}

async function renderContactSheet({ fixtureDir, panelFiles }) {
  const thumbWidth = 300;
  const thumbHeight = 420;
  const labelHeight = 54;
  const gap = 24;
  const width = gap + panelFiles.length * (thumbWidth + gap);
  const height = labelHeight + thumbHeight + gap * 2;
  const composites = [];
  for (const [index, file] of panelFiles.entries()) {
    const left = gap + index * (thumbWidth + gap);
    const image = await sharp(resolve(repoRoot, file.previewFile))
      .resize(thumbWidth, thumbHeight, { fit: "cover" })
      .png()
      .toBuffer();
    const label = Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${thumbWidth}" height="${labelHeight}">
        <text x="${thumbWidth / 2}" y="34" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#24302b">${escapeXml(file.panelId)}</text>
      </svg>
    `);
    composites.push({ input: label, left, top: gap });
    composites.push({ input: image, left, top: gap + labelHeight });
  }
  const output = resolve(fixtureDir, "contact-sheet.png");
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: "#f7f3ea"
    }
  }).composite(composites).png().toFile(output);
  return output;
}

function buildQualityScorecardMarkdown({ fixture, quality }) {
  const lines = [
    `# QA Scorecard: ${fixture.id}`,
    "",
    `- Status: ${quality.status}`,
    `- Score: ${quality.score}/100`,
    `- Checks: ${quality.passed}/${quality.total}`,
    `- Pass score: ${quality.passScore}`,
    `- Critical failures: ${quality.criticalFailures.length ? quality.criticalFailures.join(", ") : "none"}`,
    `- Reference bar: ${quality.referenceBar}`,
    "",
    "| Result | Gate | Category | Check | Evidence |",
    "|---|---|---|---|---|"
  ];
  for (const check of quality.checks) {
    lines.push(`| ${check.passed ? "Pass" : "Fail"} | ${check.critical ? "Critical" : "Standard"} | ${check.category} | ${escapeMarkdownTable(check.description)} | ${escapeMarkdownTable(check.evidence)} |`);
  }
  return `${lines.join("\n")}\n`;
}

function buildComparisonMarkdown({ checkpoint, contactSheet, fixture, panelFiles, quality, systemStats }) {
  const device = systemStats?.devices?.[0]?.name ?? "unknown GPU";
  const lines = [
    `# ${fixture.category}`,
    "",
    `- Mode: local ComfyUI generation`,
    `- Checkpoint: ${checkpoint}`,
    `- Device: ${device}`,
    `- QA score: ${quality.score}/100 (${quality.status})`,
    `- QA scorecard: [qa-scorecard.md](./qa-scorecard.md)`,
    `- Panel count: ${panelFiles.length}`,
    "",
    `![Contact sheet](./${basename(contactSheet)})`,
    "",
    "## Panel Prompts",
    ""
  ];
  for (const file of panelFiles) {
    lines.push(`### ${file.panelId}`, "", file.prompt, "", `Preview: [${basename(file.previewFile)}](./${basename(file.previewFile)})`, "");
  }
  return `${lines.join("\n")}\n`;
}

function buildRunReadme({ checkpoint, fixture, panelFiles, quality, runId, contactSheet }) {
  return [
    `# ${runId}`,
    "",
    "Local ComfyUI benchmark run for CustomCard card generation.",
    "",
    `- Fixture: ${fixture.id}`,
    `- Checkpoint: ${checkpoint}`,
    `- Panels: ${panelFiles.length}`,
    `- QA: ${quality.score}/100 (${quality.status})`,
    `- Contact sheet: [open](${fixture.id}/${basename(contactSheet)})`,
    `- Scorecard: [open](${fixture.id}/qa-scorecard.md)`,
    "",
    "This run uses deterministic fixture copy plus local ComfyUI image generation. Human visual review is still required."
  ].join("\n") + "\n";
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

async function readJson(url) {
  return fetchJson(url, { method: "GET" });
}

function writeJson(filePath, value) {
  mkdirSync(resolve(filePath, ".."), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(filePath, value) {
  mkdirSync(resolve(filePath, ".."), { recursive: true });
  writeFileSync(filePath, value);
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const [rawKey, inlineValue] = value.slice(2).split("=");
    if (inlineValue !== undefined) {
      parsed[rawKey] = inlineValue;
      continue;
    }
    if (values[index + 1] && !values[index + 1].startsWith("--")) {
      parsed[rawKey] = values[index + 1];
      index += 1;
    } else {
      parsed[rawKey] = true;
    }
  }
  return parsed;
}

function boundedInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function boundedNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function wrapText(text, maxChars) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function escapeMarkdownTable(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function escapeXml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;"
  })[character]);
}

function sha256(value) {
  return createHash("sha256").update(String(value ?? "")).digest("hex");
}

function readGitState() {
  try {
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
    const branch = execFileSync("git", ["branch", "--show-current"], { cwd: repoRoot, encoding: "utf8" }).trim();
    const status = execFileSync("git", ["status", "--short"], { cwd: repoRoot, encoding: "utf8" }).trim();
    return {
      commit,
      branch,
      dirty: Boolean(status),
      statusLineCount: status ? status.split(/\r?\n/).length : 0
    };
  } catch (error) {
    return {
      commit: "unknown",
      branch: "unknown",
      dirty: true,
      error: error instanceof Error ? error.message : "git state unavailable"
    };
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function relativePath(filePath) {
  return filePath.replace(`${repoRoot}\\`, "").replaceAll("\\", "/");
}

function isMainModule() {
  return import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href;
}
