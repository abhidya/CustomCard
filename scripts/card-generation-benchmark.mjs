import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { createAiCardGenerationService, loadLocalAiEnvFiles } from "./ai-card-generator.mjs";
import { createObjectStoreRuntime } from "./object-store-runtime.mjs";
import { resolveAiFlowConfigs } from "../src/aiFlowConfigData.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const outputRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");
const competitorManifestPath = resolve(repoRoot, "docs/evidence/competitor-card-examples/manifest.json");
const panelIds = ["front", "inside-left", "inside-right", "back"];
const defaultFixtureIds = ["small-business-thank-you", "medical-graduation", "dad-fix-anything"];

const fixtures = {
  "small-business-thank-you": {
    id: "small-business-thank-you",
    category: "Small business thank-you AI card",
    competitorCategory: "Small business thank-you AI card",
    competitorPrompt: "thanks for supporting our small business",
    request: {
      sender: "CustomCard",
      recipient: "loyal customers",
      relationship: "small business to repeat customer",
      occasion: "thank-you for supporting a small business",
      tone: "warm, sincere, polished, grateful, not salesy",
      style:
        "premium small-business editorial stationery: warm citrus, cream, deep teal, soft gold, handmade local-shop texture",
      language: "English",
      personal_note:
        "Make this feel like a real small business owner thanking a customer after a purchase, without implying an order was placed inside CustomCard.",
      memory_notes: [
        "The customer chose an independent small business instead of a large marketplace.",
        "The owner wants the message to feel handmade, specific, and grateful rather than promotional.",
        "CustomCard needs editable copy overlays, print-safe margins, persistence, and human review before external sharing."
      ]
    }
  },
  "medical-graduation": {
    id: "medical-graduation",
    category: "Medical school graduation folded card",
    competitorCategory: "Photo-card print product",
    competitorPrompt: "graduation milestone card",
    request: {
      sender: "Manny",
      recipient: "my brother",
      relationship: "brother",
      occasion: "medical school graduation",
      tone: "proud, emotional, premium, warm family pride, not cheesy",
      style: "deep navy, white, soft gold, elegant medical graduation stationery",
      language: "English",
      personal_note:
        "He is graduating med school. Design a theme called From Dream to Doctor for the card front, back, inside-left, and inside-right.",
      memory_notes: [
        "He pushed through years of exams, late nights, long shifts, and sacrifices.",
        "The family is proud of his discipline, patience, heart, and dedication.",
        "Use medical-school graduation symbols such as a white coat, stethoscope, anatomy sketch lines, ECG line, and graduation cap."
      ]
    }
  },
  "dad-fix-anything": {
    id: "dad-fix-anything",
    category: "Father's Day repair-themed card",
    competitorCategory: "Free template card maker",
    competitorPrompt: "dad who can fix anything",
    request: {
      sender: "Manny",
      recipient: "Dad",
      relationship: "child to father",
      occasion: "Father's Day",
      tone: "warm, funny, sincere, practical love",
      style: "clean printable workshop illustration, blueprint details, golden yellow and green accents",
      language: "English",
      personal_note:
        "Make a card for a dad who fixes everything around the house. Avoid copying competitor jokes; make it about steady presence and practical love.",
      memory_notes: [
        "Dad shows love by fixing the small things before anyone asks.",
        "The card should feel printable, cheerful, and original.",
        "Use tools as symbols, not a cluttered hardware-store scene."
      ]
    }
  },
  "botanical-birthday": {
    id: "botanical-birthday",
    category: "Personalized botanical birthday card",
    competitorCategory: "Personalized physical card catalog",
    competitorPrompt: "custom birthday card",
    request: {
      sender: "Manny",
      recipient: "Sara",
      relationship: "friend",
      occasion: "birthday",
      tone: "warm, grateful, relaxed, quietly joyful",
      style: "botanical watercolor, morning light, cream paper, deep green accents",
      language: "English",
      personal_note: "She loves morning hikes, coffee, and the fern by her kitchen window.",
      memory_notes: [
        "She keeps a fern by the kitchen window.",
        "She loves morning hikes and tiny trail flowers.",
        "The birthday card should feel personal without feeling overly sentimental."
      ]
    }
  }
};

if (isMainModule()) {
  await main();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const selectedFixtureIds = (args.fixtures || defaultFixtureIds.join(",")).split(",").map((value) => value.trim()).filter(Boolean);
  const env = loadBenchmarkEnv();
  if (!isLiveBenchmarkEnabled(args, env)) {
    throw new Error("Live benchmark calls are disabled. Re-run with --live or CUSTOMCARD_BENCHMARK_LIVE=enabled.");
  }
  const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runId = `card-gen-benchmark-${runStamp}`;
  const runDir = resolve(outputRoot, runId);
  mkdirSync(runDir, { recursive: true });
  env.CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED = "true";
  env.CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED = "true";

  const providerHttp = [];
  const fetchImpl = createLoggingFetch(providerHttp, env);
  const service = createAiCardGenerationService({ env, fetchImpl });
  const objectStoreRuntime = createObjectStoreRuntime({ env, fetchImpl });
  const manifest = readCompetitorManifest();
  const summary = {
    runId,
    createdAtIso: new Date().toISOString(),
    fixtureIds: selectedFixtureIds,
    outputDir: relativePath(runDir),
    envRouting: {
      aiEnvSources: [".env.local", "infra/env/.env"].filter((filePath) => existsSync(resolve(repoRoot, filePath))),
      configuredProviderKeys: Object.keys(env).filter((key) => isSafeConfiguredKey(key)).sort(),
      secretsRedacted: true
    },
    resolvedFlowsBeforeRun: summarizeFlows(resolveAiFlowConfigs(env)),
    objectStore: objectStoreRuntime.describe(),
    fixtures: []
  };

  for (const fixtureId of selectedFixtureIds) {
    const fixture = fixtures[fixtureId];
    if (!fixture) throw new Error(`Unknown benchmark fixture: ${fixtureId}`);
    const fixtureResult = await runFixture({ fixture, manifest, service, objectStoreRuntime, providerHttp, runDir, runStamp, env });
    summary.fixtures.push(fixtureResult);
  }

  summary.providerHttp = providerHttp;
  writeJson(resolve(runDir, "debug-log.json"), summary);
  writeMarkdown(resolve(runDir, "README.md"), buildRunReadme(summary));
  console.log(JSON.stringify({ runId, outputDir: relativePath(runDir), fixtures: summary.fixtures.map((fixture) => fixture.id) }, null, 2));
}

async function runFixture({ fixture, manifest, service, objectStoreRuntime, providerHttp, runDir, runStamp, env }) {
  const fixtureDir = resolve(runDir, fixture.id);
  mkdirSync(fixtureDir, { recursive: true });
  const competitor = competitorForFixture(fixture, manifest);
  const providerStartIndex = providerHttp.length;
  const response = await service.generateCard(fixture.request, { rateKey: `benchmark-${fixture.id}-${runStamp}` });
  const payload = response.payload;
  const panelFiles = [];
  const imagesByPanel = new Map((payload.images || []).map((image) => [image.panel_id, image]));

  for (const panelId of panelIds) {
    const image = imagesByPanel.get(panelId);
    if (!image?.image_url) continue;
    const decoded = decodeDataUrl(image.image_url);
    const providerFile = resolve(fixtureDir, `provider-${panelId}${decoded.ext}`);
    writeFileSync(providerFile, decoded.buffer);

    const panelCopy = (payload.card_copy?.panels || []).find((panel) => panel.id === panelId) || {};
    const previewBuffer = await renderPanelPreview({ imageBuffer: decoded.buffer, panelId, panelCopy });
    const previewFile = resolve(fixtureDir, `preview-${panelId}.png`);
    writeFileSync(previewFile, previewBuffer);
    panelFiles.push({
      panelId,
      providerFile: relativePath(providerFile),
      previewFile: relativePath(previewFile),
      prompt: image.revised_prompt,
      width: image.width,
      height: image.height
    });
  }

  const fixtureProviderCalls = providerHttp.slice(providerStartIndex);
  const effectivePrompts = {
    fixture: fixture.id,
    category: fixture.category,
    competitor: competitor ? safeCompetitor(competitor) : undefined,
    requestBody: fixture.request,
    cardCopyModel: payload.ai_flow?.card_copy?.model,
    imageModel: payload.ai_flow?.card_image?.model,
    panelPrompts: panelFiles.map((file) => ({
      panelId: file.panelId,
      prompt: file.prompt,
      negativePrompt: findImageCallNegativePrompt(fixtureProviderCalls, file.panelId)
    }))
  };
  const sanitizedOutput = sanitizeForLog(payload, env);
  writeJson(resolve(fixtureDir, "customcard-ai-output.json"), sanitizedOutput);
  writeJson(resolve(fixtureDir, "effective-prompts.json"), effectivePrompts);
  writeJson(resolve(fixtureDir, "provider-http.json"), fixtureProviderCalls);

  const contactSheetFile = await renderContactSheet({ fixtureDir, fixture, competitor, panelFiles });
  const comparisonMarkdown = buildFixtureComparison({ fixture, competitor, payload, panelFiles, contactSheetFile });
  writeMarkdown(resolve(fixtureDir, "comparison.md"), comparisonMarkdown);

  const persistence = await persistFixtureArtifacts({
    objectStoreRuntime,
    fixture,
    fixtureDir,
    panelFiles,
    payload: sanitizedOutput,
    effectivePrompts,
    runStamp,
    env
  });

  return {
    id: fixture.id,
    category: fixture.category,
    competitor: competitor ? safeCompetitor(competitor) : undefined,
    statusCode: response.statusCode,
    generatedBy: payload.generated_by,
    outputDir: relativePath(fixtureDir),
    panelCount: panelFiles.length,
    contactSheet: contactSheetFile ? relativePath(contactSheetFile) : undefined,
    prompts: effectivePrompts.panelPrompts,
    persistence
  };
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

function isLiveBenchmarkEnabled(args, env) {
  return args.live === true || args.live === "true" || String(env.CUSTOMCARD_BENCHMARK_LIVE || "").toLowerCase() === "enabled";
}

function loadBenchmarkEnv() {
  const target = { ...process.env };
  for (const filePath of [".env.local", "infra/env/.env"]) {
    const absolutePath = resolve(repoRoot, filePath);
    if (!existsSync(absolutePath)) continue;
    const parsed = parseDotenv(readFileSync(absolutePath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (!target[key]) target[key] = value;
    }
  }
  loadLocalAiEnvFiles({ cwd: repoRoot, target });
  return target;
}

function createLoggingFetch(logs, env) {
  return async function loggingFetch(url, options = {}) {
    const started = Date.now();
    const response = await fetch(url, options);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "";
    try {
      logs.push({
        url: redactUrl(String(url), env),
        method: options.method || "GET",
        request: {
          headers: redactHeaders(options.headers || {}, env),
          body: sanitizeForLog(parseBody(options.body), env)
        },
        response: {
          status: response.status,
          ok: response.ok,
          contentType,
          contentLength: response.headers.get("content-length"),
          byteLength: buffer.length,
          body: contentType.includes("application/json") ? sanitizeForLog(parseJson(buffer.toString("utf8")), env) : undefined
        },
        durationMs: Date.now() - started
      });
    } catch (error) {
      logs.push({
        url: redactUrl(String(url), env),
        method: options.method || "GET",
        response: {
          status: response.status,
          ok: response.ok,
          contentType,
          byteLength: buffer.length
        },
        logError: error instanceof Error ? error.message : "benchmark logging failed"
      });
    }
    return new Response(buffer, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  };
}

function parseBody(body) {
  if (!body) return undefined;
  if (typeof body !== "string") return "<non-string-body>";
  return parseJson(body) ?? body;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function renderPanelPreview({ imageBuffer, panelId, panelCopy }) {
  const layout = panelLayout(panelId);
  const headline = wrapText(panelCopy.headline || "", layout.headlineChars).slice(0, 3);
  const body = wrapText(panelCopy.body || "", layout.bodyChars).slice(0, layout.bodyLines);
  const overlay = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100" viewBox="0 0 1500 2100">
      <rect x="88" y="88" width="1324" height="1924" rx="32" fill="none" stroke="#fffaf0" stroke-width="8" opacity="0.9"/>
      <rect x="${layout.box.x}" y="${layout.box.y}" width="${layout.box.width}" height="${layout.box.height}" rx="28" fill="${layout.box.fill}" opacity="${layout.box.opacity}"/>
      <text x="750" y="${layout.headlineY}" text-anchor="middle" font-family="Georgia, Times New Roman, serif" fill="${layout.headlineColor}" font-size="${layout.headlineSize}" font-weight="700">
        ${headline.map((line, index) => `<tspan x="750" dy="${index === 0 ? 0 : layout.headlineSize * 1.08}">${escapeXml(line)}</tspan>`).join("")}
      </text>
      <text x="750" y="${layout.bodyY}" text-anchor="middle" font-family="Inter, Arial, sans-serif" fill="${layout.bodyColor}" font-size="${layout.bodySize}" font-weight="600">
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

function panelLayout(panelId) {
  if (panelId === "front") {
    return {
      box: { x: 142, y: 1328, width: 1216, height: 506, fill: "#fffaf0", opacity: 0.9 },
      headlineY: 1460,
      bodyY: 1628,
      headlineSize: 82,
      bodySize: 40,
      headlineChars: 24,
      bodyChars: 43,
      bodyLines: 4,
      headlineColor: "#202824",
      bodyColor: "#2d3733"
    };
  }
  if (panelId === "back") {
    return {
      box: { x: 190, y: 1520, width: 1120, height: 300, fill: "#fffaf0", opacity: 0.86 },
      headlineY: 1635,
      bodyY: 1738,
      headlineSize: 58,
      bodySize: 34,
      headlineChars: 30,
      bodyChars: 46,
      bodyLines: 2,
      headlineColor: "#25302b",
      bodyColor: "#56645d"
    };
  }
  return {
    box: { x: 150, y: 360, width: 1200, height: 1360, fill: "#fffdf7", opacity: 0.88 },
    headlineY: 560,
    bodyY: 740,
    headlineSize: 68,
    bodySize: 38,
    headlineChars: 28,
    bodyChars: 44,
    bodyLines: 10,
    headlineColor: "#25302b",
    bodyColor: "#3f4c45"
  };
}

async function renderContactSheet({ fixtureDir, fixture, competitor, panelFiles }) {
  const entries = [];
  for (const file of panelFiles) entries.push({ label: `CustomCard ${file.panelId}`, path: resolve(repoRoot, file.previewFile) });
  if (entries.length === 0) return undefined;

  const thumbWidth = 300;
  const thumbHeight = 420;
  const labelHeight = 54;
  const gap = 24;
  const width = gap + entries.length * (thumbWidth + gap);
  const height = labelHeight + thumbHeight + gap * 2;
  const base = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: "#f7f3ea"
    }
  });
  const composites = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const left = gap + index * (thumbWidth + gap);
    const thumb = await sharp(entry.path)
      .resize(thumbWidth, thumbHeight, { fit: "contain", background: "#ffffff" })
      .png()
      .toBuffer();
    const label = Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${thumbWidth}" height="${labelHeight}">
        <text x="${thumbWidth / 2}" y="34" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#24302b">${escapeXml(entry.label)}</text>
      </svg>
    `);
    composites.push({ input: label, left, top: gap });
    composites.push({ input: thumb, left, top: gap + labelHeight });
  }
  const output = resolve(fixtureDir, "contact-sheet.png");
  writeFileSync(output, await base.composite(composites).png().toBuffer());
  return output;
}

async function persistFixtureArtifacts({ objectStoreRuntime, fixture, fixtureDir, panelFiles, payload, effectivePrompts, runStamp, env }) {
  const artifactFiles = [
    ...panelFiles.map((file) => resolve(repoRoot, file.providerFile)),
    writeJson(resolve(fixtureDir, "persisted-customcard-ai-output.json"), payload),
    writeJson(resolve(fixtureDir, "persisted-effective-prompts.json"), effectivePrompts)
  ].filter(Boolean).slice(0, 12);
  const record = {
    id: `rp-${fixture.id}-${runStamp}`,
    projectId: `benchmark-${fixture.id}`,
    checksum: `sha256-${sha256(JSON.stringify({ fixture: fixture.id, panelFiles, effectivePrompts }))}`,
    storageProvider: "s3-compatible",
    artifactManifest: { persistenceStatus: "pending", blockers: [] },
    locale: fixture.request.language === "English" ? "en-US" : "und",
    direction: "ltr",
    safeZonePassed: true,
    textOverflow: false
  };
  try {
    const result = await objectStoreRuntime.persistRenderPacketArtifacts({
      record,
      bodyText: JSON.stringify({
        artifacts: artifactFiles.map((filePath) => ({
          fileName: basename(filePath),
          mimeType: mimeTypeFor(filePath),
          kind: kindFor(filePath),
          panelId: panelIdForFile(filePath),
          base64: readFileSync(filePath).toString("base64")
        }))
      })
    });
    return sanitizeForLog(
      {
        artifactPersistence: result.payload.artifactPersistence,
        artifactUri: result.record.artifactUri,
        signedUrlExpiresAt: result.record.signedUrlExpiresAt
      },
      env
    );
  } catch (error) {
    return {
      artifactPersistence: {
        status: "blocked",
        blockers: [error instanceof Error ? error.message : "Artifact persistence failed."],
        debugStack: error instanceof Error ? sanitizeForLog(error.stack || "", {}) : undefined
      }
    };
  }
}

function buildFixtureComparison({ fixture, competitor, payload, panelFiles, contactSheetFile }) {
  const lines = [
    `# ${fixture.category}`,
    "",
    `- Competitor: ${competitor?.competitor || "n/a"}`,
    `- Source: ${competitor?.sourcePage || "n/a"}`,
    `- Competitor prompt/category: ${fixture.competitorPrompt}`,
    `- CustomCard generated by: ${payload.generated_by}`,
    `- Card copy model: ${payload.ai_flow?.card_copy?.model || "n/a"}`,
    `- Image model: ${payload.ai_flow?.card_image?.model || "n/a"}`,
    `- Panel count: ${panelFiles.length}`,
    ""
  ];
  if (contactSheetFile) {
    lines.push(`![Contact sheet](./${basename(contactSheetFile)})`, "");
  }
  lines.push("## Panel Prompts", "");
  for (const file of panelFiles) {
    lines.push(`### ${file.panelId}`, "", file.prompt, "", `Preview: [${basename(file.previewFile)}](./${basename(file.previewFile)})`, "");
  }
  return `${lines.join("\n")}\n`;
}

function buildRunReadme(summary) {
  const lines = [
    `# ${summary.runId}`,
    "",
    "Live benchmark run for CustomCard card generation against research-only competitor fixtures.",
    "",
    "| Fixture | Category | Panels | Contact sheet | Persistence |",
    "|---|---|---:|---|---|"
  ];
  for (const fixture of summary.fixtures) {
    lines.push(
      `| ${fixture.id} | ${fixture.category} | ${fixture.panelCount} | ${fixture.contactSheet ? `[open](${fixture.id}/contact-sheet.png)` : "n/a"} | ${fixture.persistence?.artifactPersistence?.status || "n/a"} |`
    );
  }
  lines.push("");
  lines.push("Secrets are redacted in `debug-log.json`; provider image data URLs are stored as files instead of inline payloads.");
  return `${lines.join("\n")}\n`;
}

function readCompetitorManifest() {
  if (!existsSync(competitorManifestPath)) return [];
  return JSON.parse(readFileSync(competitorManifestPath, "utf8"));
}

function competitorForFixture(fixture, manifest) {
  return manifest.find((entry) => entry.category === fixture.competitorCategory);
}

function safeCompetitor(competitor) {
  return {
    competitor: competitor.competitor,
    category: competitor.category,
    sourcePage: competitor.sourcePage,
    localFile: competitor.localFile,
    sha256: competitor.sha256
  };
}

function findImageCallNegativePrompt(calls, panelId) {
  return calls.find((call) => call.request?.body?.metadata?.customcard?.panel_id === panelId)?.request?.body?.negative_prompt;
}

function summarizeFlows(flows) {
  return flows.map((flow) => ({
    flowId: flow.flowId,
    primaryAdapterId: flow.primaryAdapterId,
    fallbackAdapterId: flow.fallbackAdapterId,
    model: flow.model,
    liveProviderCallsEnabled: flow.liveProviderCallsEnabled,
    readyForLiveCalls: flow.readyForLiveCalls,
    queueEnabled: flow.queueEnabled,
    fallbackQueueEnabled: flow.fallbackQueueEnabled,
    configuredAdapterIds: flow.configuredAdapterIds,
    blockedReasons: flow.blockedReasons
  }));
}

function decodeDataUrl(value) {
  const match = String(value).match(/^data:([^;,]+);base64,(.*)$/s);
  if (!match) throw new Error("Expected image data URL.");
  const mimeType = match[1];
  return {
    mimeType,
    ext: mimeType.includes("jpeg") || mimeType.includes("jpg") ? ".jpg" : mimeType.includes("webp") ? ".webp" : ".png",
    buffer: Buffer.from(match[2], "base64")
  };
}

function writeJson(filePath, value) {
  mkdirSync(resolve(filePath, ".."), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
  return filePath;
}

function writeMarkdown(filePath, value) {
  mkdirSync(resolve(filePath, ".."), { recursive: true });
  writeFileSync(filePath, value);
  return filePath;
}

function parseDotenv(text) {
  const parsed = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (key) parsed[key] = value;
  }
  return parsed;
}

export function redactHeaders(headers, env = {}) {
  const entries = headers instanceof Headers ? Array.from(headers.entries()) : Object.entries(headers);
  return Object.fromEntries(
    entries.map(([key, value]) => [
      key,
      /authorization|token|secret|key|cookie/i.test(key) ? "<redacted>" : redactUrl(String(value), env)
    ])
  );
}

export function redactUrl(value, env = {}) {
  let text = value;
  const accountId = String(env.CLOUDFLARE_ACCOUNT_ID || "");
  if (accountId) text = text.split(accountId).join("<redacted-account>");
  text = text.replace(/accounts\/[^/]+/g, "accounts/<redacted-account>");
  text = text.replace(/https:\/\/[^./]+\.r2\.cloudflarestorage\.com/g, "https://<redacted-account>.r2.cloudflarestorage.com");
  return text;
}

function isMainModule() {
  return import.meta.url === pathToFileURL(process.argv[1] || "").href;
}

export function sanitizeForLog(value, env) {
  if (Array.isArray(value)) return value.map((item) => sanitizeForLog(item, env));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        isSecretKey(key) ? "<redacted>" : sanitizeForLog(item, env)
      ])
    );
  }
  if (typeof value !== "string") return value;
  if (value.startsWith("data:")) return `<data-url ${value.length} chars>`;
  let text = value;
  for (const secretKey of Object.keys(env)) {
    if (!isSecretKey(secretKey)) continue;
    const secret = String(env[secretKey] || "");
    if (secret.length >= 8) text = text.split(secret).join("<redacted>");
  }
  text = redactUrl(text, env);
  return text.length > 5000 ? `${text.slice(0, 5000)}...<truncated ${text.length} chars>` : text;
}

function isSecretKey(key) {
  return /TOKEN|SECRET|PASSWORD|PRIVATE|ACCESS_KEY|API_KEY|SIGNATURE|AUTHORIZATION|COOKIE/i.test(key);
}

function isSafeConfiguredKey(key) {
  return /^(CUSTOMCARD_AI_|CLOUDFLARE_|OBJECT_STORE_|ARTIFACT_|CUSTOMCARD_ARTIFACT_)/.test(key);
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

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;"
  })[char]);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function relativePath(filePath) {
  return filePath.replace(`${repoRoot}/`, "");
}

function mimeTypeFor(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".json") return "application/json";
  return "application/octet-stream";
}

function kindFor(filePath) {
  const name = basename(filePath);
  if (name.endsWith(".json")) return "manifest-json";
  if (name.startsWith("provider-")) return "generated-image";
  return "panel-png";
}

function panelIdForFile(filePath) {
  return panelIds.find((panelId) => basename(filePath).includes(panelId));
}
