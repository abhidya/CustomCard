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
export const cardGenerationBenchmarkDefaultFixtureIds = ["small-business-thank-you", "medical-graduation", "dad-fix-anything"];
const defaultFixtureIds = cardGenerationBenchmarkDefaultFixtureIds;

export const cardGenerationBenchmarkFixtures = {
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
    },
    qualityTarget: {
      passScore: 82,
      referenceBar:
        "Premium editorial thank-you stationery: restrained citrus corner hierarchy, large calm text fields, specific customer gratitude, and no promotional filler.",
      copy: {
        minUniqueHeadlines: 3,
        requiredTermsByPanel: {
          front: ["support", "independent"],
          "inside-left": ["independent", "choice"],
          "inside-right": ["community", "trust"],
          back: ["gratitude", "choose small"]
        },
        forbiddenPatterns: [
          "\\bfor you\\b",
          "you'?re the best",
          "thanks again",
          "The CustomCard Team",
          "continued success",
          "all your endeavors",
          "loyalty means the world",
          "opportunity to serve",
          "customers like you",
          "thank you for supporting our small business",
          "CustomCard needs"
        ]
      },
      image: {
        requiredPromptTerms: [
          "controlled citrus-and-leaf corner",
          "editorial negative space",
          "not busy repeated fruit",
          "no text box",
          "text-safe"
        ],
        forbiddenPromptPatterns: [
          "recipient['’]?s? name",
          "main message",
          "thank[- ]you note",
          "hand-drawn thank-you note",
          "owner holding",
          "customers"
        ],
        requiredSvgTheme: "citrus",
        requiredHeroByPanel: {
          front: "citrus",
          "inside-left": "citrus",
          "inside-right": "citrus",
          back: "citrus"
        },
        requiredBackgroundByPanel: {
          "inside-left": "#fffaf0",
          "inside-right": "#fffaf0"
        },
        forbiddenSvgPatterns: [
          "x=\"240\" y=\"430\" width=\"1020\" height=\"1240\"",
          "y=\"1180\" width=\"1500\" height=\"520\""
        ]
      }
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
    },
    qualityTarget: {
      passScore: 86,
      referenceBar:
        "Reference medical cards: deep navy/soft gold, one cinematic white-coat hero or sparse ECG line, ivory note-sheet interiors, no scattered icon wallpaper, and direct family-pride copy.",
      copy: {
        minUniqueHeadlines: 3,
        requiredTermsByPanel: {
          front: ["Dream", "Doctor"],
          "inside-left": ["You", "late nights", "sacrifices"],
          "inside-right": ["you", "patience", "heart", "dedication"],
          back: ["Dream", "Doctor"]
        },
        forbiddenPatterns: [
          "Congratulations, Doctor",
          "\\bHe pushed\\b",
          "\\bHis dedication\\b",
          "doctor he has become",
          "you are now a doctor",
          "as you begin this new chapter",
          "lifetime of healing"
        ]
      },
      image: {
        requiredPromptTerms: [
          "one white coat",
          "graduation cap",
          "stethoscope",
          "ivory note-sheet",
          "never dense repeated medical icons",
          "no caption plaque",
          "text-safe"
        ],
        forbiddenPromptPatterns: [
          "recipient['’]?s? name",
          "main message",
          "foreground"
        ],
        requiredSvgTheme: "medical",
        requiredHeroByPanel: {
          front: "medical-front",
          "inside-left": "medical-interior",
          "inside-right": "medical-interior",
          back: "medical-back"
        },
        requiredBackgroundByPanel: {
          "inside-left": "#fffdf7",
          "inside-right": "#fffdf7"
        },
        forbiddenSvgPatterns: [
          "x=\"190\" y=\"300\" width=\"1120\" height=\"1500\"",
          "y=\"1180\" width=\"1500\" height=\"520\""
        ]
      }
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
    },
    qualityTarget: {
      passScore: 82,
      referenceBar:
        "Warm workshop stationery: blueprint field, a few organized tool marks, calm message panels, and specific practical-love copy without generic best-dad slogans.",
      copy: {
        minUniqueHeadlines: 3,
        requiredTermsByPanel: {
          front: ["quiet fix", "small rescue"],
          "inside-left": ["tightened screw", "fixed hinge"],
          "inside-right": ["quiet repairs", "looked after"],
          back: ["fixes", "small things"]
        },
        forbiddenPatterns: [
          "best dad",
          "amazing dad",
          "glue that holds",
          "thanks for being a rock",
          "love is in the details"
        ]
      },
      image: {
        requiredPromptTerms: [
          "blueprint",
          "lower-corner tool cluster",
          "measured pencil lines",
          "sparse enough",
          "no text box",
          "text-safe"
        ],
        forbiddenPromptPatterns: [
          "hardware-store",
          "cluttered",
          "main message"
        ],
        requiredSvgTheme: "tools",
        requiredHeroByPanel: {
          front: "tools",
          "inside-left": "tools",
          "inside-right": "tools",
          back: "tools"
        },
        requiredBackgroundByPanel: {
          "inside-left": "#fbf5e8",
          "inside-right": "#fbf5e8"
        },
        forbiddenSvgPatterns: [
          "x=\"240\" y=\"430\" width=\"1020\" height=\"1240\"",
          "y=\"1180\" width=\"1500\" height=\"520\""
        ]
      }
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
    },
    qualityTarget: {
      passScore: 80,
      referenceBar:
        "Elegant botanical stationery: side/corner foliage, quiet cream field, personal birthday copy, and no dense confetti or generic greeting-card filler.",
      copy: {
        minUniqueHeadlines: 3,
        requiredTermsByPanel: {
          front: ["Birthday", "Sara"],
          "inside-left": ["coffee", "green trails"],
          "inside-right": ["hikes", "laughter"],
          back: ["green paths", "coffee"]
        },
        forbiddenPatterns: ["A card made with care", "For this moment", "From the heart"]
      },
      image: {
        requiredPromptTerms: ["botanical", "corner border", "generous blank field", "text-safe"],
        forbiddenPromptPatterns: ["dense confetti", "recipient['’]?s? name", "main message"],
        requiredSvgTheme: "botanical",
        requiredHeroByPanel: {
          front: "botanical",
          "inside-left": "botanical",
          "inside-right": "botanical",
          back: "botanical"
        }
      }
    }
  }
};
const fixtures = cardGenerationBenchmarkFixtures;

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
  if (args["image-adapter"]) env.CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID = args["image-adapter"];

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
  const quality = evaluateBenchmarkQuality({ fixture, payload: sanitizedOutput, panelFiles });
  writeJson(resolve(fixtureDir, "qa-scorecard.json"), quality);
  writeMarkdown(resolve(fixtureDir, "qa-scorecard.md"), buildQualityScorecardMarkdown({ fixture, quality }));
  const comparisonMarkdown = buildFixtureComparison({ fixture, competitor, payload, panelFiles, contactSheetFile, quality });
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
    quality: {
      status: quality.status,
      score: quality.score,
      passed: quality.passed,
      total: quality.total,
      scorecard: relativePath(resolve(fixtureDir, "qa-scorecard.md"))
    },
    prompts: effectivePrompts.panelPrompts,
    persistence
  };
}

export function evaluateBenchmarkQuality({ fixture, payload, panelFiles }) {
  const target = fixture.qualityTarget || {};
  const checks = [];
  const panels = new Map((payload.card_copy?.panels || []).map((panel) => [panel.id, panel]));
  const files = new Map(panelFiles.map((file) => [file.panelId, file]));

  addCheck(checks, {
    id: "panels.count",
    category: "render",
    description: "All four folded-card panels rendered.",
    passed: panelFiles.length === panelIds.length,
    evidence: `${panelFiles.length}/${panelIds.length} panels`,
    critical: true
  });

  for (const panelId of panelIds) {
    const panel = panels.get(panelId);
    const file = files.get(panelId);
    addCheck(checks, {
      id: `panel.${panelId}.copy-present`,
      category: "copy",
      description: `${panelId} has headline and body copy.`,
      passed: Boolean(panel?.headline && panel?.body),
      evidence: panel ? `${panel.headline || "<no headline>"} / ${truncateEvidence(panel.body || "<no body>")}` : "missing panel copy",
      critical: true
    });
    addCheck(checks, {
      id: `panel.${panelId}.prompt-present`,
      category: "prompt",
      description: `${panelId} has an image prompt and generated asset.`,
      passed: Boolean(file?.prompt && file?.providerFile && file?.previewFile),
      evidence: file?.prompt ? truncateEvidence(file.prompt, 180) : "missing image prompt",
      critical: true
    });
  }

  const allCopy = panelIds.map((panelId) => {
    const panel = panels.get(panelId) || {};
    return `${panelId}: ${panel.headline || ""} ${panel.body || ""}`;
  }).join("\n");
  const uniqueHeadlines = new Set(panelIds.map((panelId) => panels.get(panelId)?.headline).filter(Boolean).map((value) => value.toLowerCase()));
  if (target.copy?.minUniqueHeadlines) {
    addCheck(checks, {
      id: "copy.unique-headlines",
      category: "copy",
      description: `At least ${target.copy.minUniqueHeadlines} distinct panel headlines.`,
      passed: uniqueHeadlines.size >= target.copy.minUniqueHeadlines,
      evidence: `${uniqueHeadlines.size} distinct headlines`
    });
  }

  for (const [panelId, terms] of Object.entries(target.copy?.requiredTermsByPanel || {})) {
    const panel = panels.get(panelId) || {};
    const panelText = `${panel.headline || ""} ${panel.body || ""}`;
    const missing = terms.filter((term) => !textIncludesTerm(panelText, term));
    addCheck(checks, {
      id: `copy.${panelId}.required-terms`,
      category: "copy",
      description: `${panelId} copy includes target-specific anchors.`,
      passed: missing.length === 0,
      evidence: missing.length ? `missing: ${missing.join(", ")}` : `matched: ${terms.join(", ")}`,
      critical: true
    });
  }

  for (const pattern of target.copy?.forbiddenPatterns || []) {
    const match = regexMatch(allCopy, pattern);
    addCheck(checks, {
      id: `copy.forbidden.${slugify(pattern)}`,
      category: "copy",
      description: `Copy avoids forbidden pattern: ${pattern}`,
      passed: !match,
      evidence: match ? truncateEvidence(match[0]) : "not found",
      critical: true
    });
  }

  const allPrompts = panelFiles.map((file) => `${file.panelId}: ${file.prompt || ""}`).join("\n");
  for (const term of target.image?.requiredPromptTerms || []) {
    addCheck(checks, {
      id: `prompt.required.${slugify(term)}`,
      category: "prompt",
      description: `Image prompts include target term: ${term}`,
      passed: textIncludesTerm(allPrompts, term),
      evidence: textIncludesTerm(allPrompts, term) ? "found" : "missing",
      critical: true
    });
  }
  for (const pattern of target.image?.forbiddenPromptPatterns || []) {
    const match = regexMatch(allPrompts, pattern);
    addCheck(checks, {
      id: `prompt.forbidden.${slugify(pattern)}`,
      category: "prompt",
      description: `Image prompts avoid forbidden pattern: ${pattern}`,
      passed: !match,
      evidence: match ? truncateEvidence(match[0]) : "not found",
      critical: true
    });
  }

  for (const file of panelFiles) {
    const svg = file.providerFile?.endsWith(".svg") && existsSync(resolve(repoRoot, file.providerFile))
      ? readFileSync(resolve(repoRoot, file.providerFile), "utf8")
      : "";
    if (!svg) continue;
    addCheck(checks, {
      id: `svg.${file.panelId}.no-text`,
      category: "visual",
      description: `${file.panelId} SVG artwork layer contains no rendered text nodes.`,
      passed: !/<text\b/i.test(svg),
      evidence: /<text\b/i.test(svg) ? "contains <text>" : "no <text>",
      critical: true
    });
    if (target.image?.requiredSvgTheme) {
      addCheck(checks, {
        id: `svg.${file.panelId}.theme`,
        category: "visual",
        description: `${file.panelId} SVG uses target theme marker.`,
        passed: svg.includes(`data-customcard-theme="${target.image.requiredSvgTheme}"`),
        evidence: svg.match(/data-customcard-theme="([^"]+)"/)?.[1] || "missing theme marker",
        critical: true
      });
    }
    const requiredHero = target.image?.requiredHeroByPanel?.[file.panelId];
    if (requiredHero) {
      addCheck(checks, {
        id: `svg.${file.panelId}.hero`,
        category: "visual",
        description: `${file.panelId} SVG uses target hero/composition marker.`,
        passed: svg.includes(`data-customcard-hero="${requiredHero}"`),
        evidence: svg.match(/data-customcard-hero="([^"]+)"/)?.[1] || "missing hero marker",
        critical: true
      });
    }
    const requiredBackground = target.image?.requiredBackgroundByPanel?.[file.panelId];
    if (requiredBackground) {
      addCheck(checks, {
        id: `svg.${file.panelId}.background`,
        category: "visual",
        description: `${file.panelId} SVG uses target background field.`,
        passed: svg.includes(`<rect width="1500" height="2100" fill="${requiredBackground}"`),
        evidence: svg.match(/<rect width="1500" height="2100" fill="([^"]+)"/)?.[1] || "missing background rect",
        critical: true
      });
    }
    for (const pattern of target.image?.forbiddenSvgPatterns || []) {
      const match = regexMatch(svg, pattern);
      addCheck(checks, {
        id: `svg.${file.panelId}.forbidden.${slugify(pattern)}`,
        category: "visual",
        description: `${file.panelId} SVG avoids forbidden renderer pattern: ${pattern}`,
        passed: !match,
        evidence: match ? truncateEvidence(match[0]) : "not found",
        critical: true
      });
    }
  }

  const passed = checks.filter((check) => check.passed).length;
  const total = checks.length;
  const score = total ? Math.round((passed / total) * 100) : 0;
  const passScore = Number(target.passScore) || 80;
  const criticalFailures = checks.filter((check) => check.critical && !check.passed);
  return {
    fixtureId: fixture.id,
    scorer: {
      type: "deterministic-rule-rubric",
      implementation: "scripts/card-generation-benchmark.mjs:evaluateBenchmarkQuality",
      humanVisualReviewRequired: true,
      limitations: [
        "Keyword and marker checks catch regressions but do not fully judge taste, composition balance, or emotional quality.",
        "Contact sheets still need human visual review against the reference bar.",
        "A future vision-model judge should be calibrated against human ratings before replacing manual review."
      ]
    },
    referenceBar: target.referenceBar || "No explicit quality target defined.",
    passScore,
    score,
    status: score >= passScore && criticalFailures.length === 0 ? "pass" : "needs-improvement",
    passed,
    total,
    criticalFailures: criticalFailures.map((check) => check.id),
    checks
  };
}

function addCheck(checks, check) {
  checks.push({
    id: check.id,
    category: check.category,
    description: check.description,
    passed: Boolean(check.passed),
    evidence: check.evidence || "",
    critical: Boolean(check.critical)
  });
}

function textIncludesTerm(value, term) {
  return String(value || "").toLowerCase().includes(String(term || "").toLowerCase());
}

function regexMatch(value, pattern) {
  return String(value || "").match(new RegExp(pattern, "i"));
}

function slugify(value) {
  return String(value || "check").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "check";
}

function truncateEvidence(value, maxLength = 140) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
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
  if (typeof body === "string") return parseJson(body) ?? body;
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) return Object.fromEntries(body.entries());
  if (isFormDataLike(body)) return serializeFormData(body);
  return "<non-string-body>";
}

function isFormDataLike(body) {
  return Boolean(body && typeof body.entries === "function" && typeof body.get === "function" && typeof body.append === "function");
}

function serializeFormData(formData) {
  const fields = {};
  for (const [key, value] of formData.entries()) {
    fields[key] = serializeFormDataValue(value);
  }
  return {
    body_type: "form-data",
    fields
  };
}

function serializeFormDataValue(value) {
  if (typeof value === "string") return value;
  return {
    type: value?.type || undefined,
    name: value?.name || undefined,
    size: Number.isFinite(value?.size) ? value.size : undefined
  };
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function renderPanelPreview({ imageBuffer, panelId, panelCopy }) {
  const layout = panelLayout(panelId, previewThemeForPanelCopy(panelCopy), panelCopy.text_layout || panelCopy.textLayout);
  const headline = wrapText(panelCopy.headline || "", layout.headlineChars).slice(0, 3);
  const body = wrapText(panelCopy.body || "", layout.bodyChars).slice(0, layout.bodyLines);
  const box = layout.box.opacity > 0
    ? `<rect x="${layout.box.x}" y="${layout.box.y}" width="${layout.box.width}" height="${layout.box.height}" rx="28" fill="${layout.box.fill}" opacity="${layout.box.opacity}"/>`
    : "";
  const overlay = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100" viewBox="0 0 1500 2100">
      <rect x="88" y="88" width="1324" height="1924" rx="32" fill="none" stroke="${layout.frameColor}" stroke-width="8" opacity="${layout.frameOpacity}"/>
      ${box}
      <text x="${layout.x}" y="${layout.headlineY}" text-anchor="${layout.anchor}" font-family="${layout.headlineFont}" fill="${layout.headlineColor}" font-size="${layout.headlineSize}" font-weight="700">
        ${headline.map((line, index) => `<tspan x="${layout.x}" dy="${index === 0 ? 0 : layout.headlineSize * 1.08}">${escapeXml(line)}</tspan>`).join("")}
      </text>
      <text x="${layout.x}" y="${layout.bodyY}" text-anchor="${layout.anchor}" font-family="${layout.bodyFont}" fill="${layout.bodyColor}" font-size="${layout.bodySize}" font-weight="500">
        ${body.map((line, index) => `<tspan x="${layout.x}" dy="${index === 0 ? 0 : layout.bodySize * 1.25}">${escapeXml(line)}</tspan>`).join("")}
      </text>
    </svg>
  `);
  return sharp(imageBuffer)
    .resize(1500, 2100, { fit: "cover" })
    .composite([{ input: overlay }])
    .png()
    .toBuffer();
}

function previewThemeForPanelCopy(panelCopy = {}) {
  const source = `${panelCopy.image_prompt || ""} ${panelCopy.art_direction || ""} ${panelCopy.headline || ""} ${panelCopy.body || ""}`.toLowerCase();
  if (/\b(medical|doctor|stethoscope|white[- ]coat|ecg|dream to doctor)\b/.test(source)) return "medical";
  if (/\b(bold[- ]type|editorial|poster|sprint|project-management|project management)\b/.test(source)) return "bold-type";
  if (/\b(photo[- ]note|sympathy|condolence|grieving|quiet support)\b/.test(source)) return "photo-note";
  if (/\b(minimal|plain thanks|watering the plants|watered the plants|neighbor)\b/.test(source)) return "minimal";
  if (/\b(citrus|small-business|small business|choose small|independent)\b/.test(source)) return "citrus";
  if (/\b(father|dad|fix|repair|tool|workshop|blueprint|hinge)\b/.test(source)) return "tools";
  if (/\b(botanical|birthday|fern|flower|hike|coffee)\b/.test(source)) return "botanical";
  return "stationery";
}

function panelLayout(panelId, theme = "stationery", rawTextLayout) {
  const darkCover = ["medical", "citrus", "tools", "bold-type"].includes(theme);
  const frameColor = panelId.startsWith("inside")
    ? theme === "tools"
      ? "#0f6b5f"
      : theme === "citrus"
        ? "#c79531"
        : "#c49b42"
    : darkCover
      ? "#fffaf0"
      : "#31584e";
  if (panelId === "front") {
    return applyPanelTextLayout({
      box: { x: 142, y: 1328, width: 1216, height: 506, fill: "#fffaf0", opacity: 0 },
      headlineY: 1410,
      bodyY: 1580,
      headlineSize: 88,
      bodySize: 39,
      headlineChars: 24,
      bodyChars: 43,
      bodyLines: 4,
      headlineColor: darkCover ? "#fff8dc" : "#202824",
      bodyColor: darkCover ? "#f4e6b0" : "#2d3733",
      frameColor,
      frameOpacity: darkCover ? 0.86 : 0.74
    }, rawTextLayout);
  }
  if (panelId === "back") {
    return applyPanelTextLayout({
      box: { x: 190, y: 1520, width: 1120, height: 300, fill: "#fffaf0", opacity: 0 },
      headlineY: 1588,
      bodyY: 1694,
      headlineSize: 58,
      bodySize: 32,
      headlineChars: 30,
      bodyChars: 46,
      bodyLines: 2,
      headlineColor: darkCover ? "#fff8dc" : "#25302b",
      bodyColor: darkCover ? "#f4e6b0" : "#56645d",
      frameColor,
      frameOpacity: darkCover ? 0.82 : 0.7
    }, rawTextLayout);
  }
  return applyPanelTextLayout({
    box: { x: 150, y: 360, width: 1200, height: 1360, fill: "#fffdf7", opacity: 0 },
    headlineY: 560,
    bodyY: 740,
    headlineSize: 68,
    bodySize: 38,
    headlineChars: 28,
    bodyChars: 44,
    bodyLines: 10,
    headlineColor: "#25302b",
    bodyColor: "#3f4c45",
    frameColor,
    frameOpacity: 0.64
  }, rawTextLayout);
}

function applyPanelTextLayout(base, rawTextLayout) {
  const shared = {
    ...base,
    x: 750,
    anchor: "middle",
    headlineFont: "Georgia, Times New Roman, serif",
    bodyFont: "Inter, Arial, sans-serif"
  };
  const layout = normalizePreviewTextLayout(rawTextLayout);
  if (!layout) return shared;
  const scale = layout.scale === "compact" ? 0.86 : layout.scale === "large" ? 1.14 : 1;
  const font = layout.font_pairing === "bold-editorial"
    ? { headlineFont: "Inter, Arial, sans-serif", bodyFont: "Inter, Arial, sans-serif", headlineSize: 116, bodySize: 42, headlineChars: 16, bodyChars: 34 }
    : layout.font_pairing === "minimal-sans"
      ? { headlineFont: "Inter, Arial, sans-serif", bodyFont: "Inter, Arial, sans-serif", headlineSize: 70, bodySize: 34, headlineChars: 28, bodyChars: 48 }
      : layout.font_pairing === "soft-serif"
        ? { headlineFont: "Georgia, Times New Roman, serif", bodyFont: "Georgia, Times New Roman, serif", headlineSize: 76, bodySize: 36, headlineChars: 26, bodyChars: 42 }
        : { headlineFont: "Georgia, Times New Roman, serif", bodyFont: "Inter, Arial, sans-serif", headlineSize: 82, bodySize: 38, headlineChars: 24, bodyChars: 44 };
  return {
    ...shared,
    x: layout.alignment === "left" ? 260 : layout.alignment === "right" ? 1240 : 750,
    anchor: layout.alignment === "left" ? "start" : layout.alignment === "right" ? "end" : "middle",
    headlineY: { top: 290, upper: 470, center: 860, lower: 1280 }[layout.headline_zone],
    bodyY: { upper: 650, center: 930, lower: 1320, bottom: 1660 }[layout.body_zone],
    headlineSize: Math.round(font.headlineSize * scale),
    bodySize: Math.round(font.bodySize * scale),
    headlineChars: layout.scale === "large" ? Math.max(12, font.headlineChars - 5) : layout.scale === "compact" ? font.headlineChars + 6 : font.headlineChars,
    bodyChars: layout.scale === "large" ? Math.max(28, font.bodyChars - 6) : layout.scale === "compact" ? font.bodyChars + 6 : font.bodyChars,
    headlineFont: font.headlineFont,
    bodyFont: font.bodyFont,
    headlineColor: layout.color_mode === "light-ink" || layout.color_mode === "high-contrast" ? "#fff8dc" : layout.color_mode === "accent-ink" ? base.frameColor : base.headlineColor,
    bodyColor: layout.color_mode === "light-ink" || layout.color_mode === "high-contrast" ? "#f4e6b0" : base.bodyColor
  };
}

function normalizePreviewTextLayout(value) {
  if (!value || typeof value !== "object") return undefined;
  const layout = {
    headline_zone: cleanLayoutEnum(value.headline_zone || value.headlineZone, ["top", "upper", "center", "lower"]),
    body_zone: cleanLayoutEnum(value.body_zone || value.bodyZone, ["upper", "center", "lower", "bottom"]),
    alignment: cleanLayoutEnum(value.alignment, ["left", "center", "right"]),
    font_pairing: cleanLayoutEnum(value.font_pairing || value.fontPairing, ["serif-sans", "bold-editorial", "minimal-sans", "soft-serif"]),
    color_mode: cleanLayoutEnum(value.color_mode || value.colorMode, ["dark-ink", "light-ink", "accent-ink", "high-contrast"]),
    scale: cleanLayoutEnum(value.scale, ["compact", "standard", "large"])
  };
  return Object.values(layout).every(Boolean) ? layout : undefined;
}

function cleanLayoutEnum(value, allowed) {
  const normalized = String(value || "").trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : undefined;
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
        blockers: [error instanceof Error ? error.message : "Artifact persistence failed."]
      }
    };
  }
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

function buildFixtureComparison({ fixture, competitor, payload, panelFiles, contactSheetFile, quality }) {
  const lines = [
    `# ${fixture.category}`,
    "",
    `- Competitor: ${competitor?.competitor || "n/a"}`,
    `- Source: ${competitor?.sourcePage || "n/a"}`,
    `- Competitor prompt/category: ${fixture.competitorPrompt}`,
    `- Target bar: ${fixture.qualityTarget?.referenceBar || "n/a"}`,
    `- QA score: ${quality?.score ?? "n/a"}/100 (${quality?.status || "n/a"})`,
    `- QA scorecard: [qa-scorecard.md](./qa-scorecard.md)`,
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
    "| Fixture | Category | QA | Panels | Contact sheet | Scorecard | Persistence |",
    "|---|---|---:|---:|---|---|---|"
  ];
  for (const fixture of summary.fixtures) {
    lines.push(
      `| ${fixture.id} | ${fixture.category} | ${fixture.quality ? `${fixture.quality.score}/100 ${fixture.quality.status}` : "n/a"} | ${fixture.panelCount} | ${fixture.contactSheet ? `[open](${fixture.id}/contact-sheet.png)` : "n/a"} | ${fixture.quality?.scorecard ? `[open](${fixture.id}/qa-scorecard.md)` : "n/a"} | ${fixture.persistence?.artifactPersistence?.status || "n/a"} |`
    );
  }
  lines.push("");
  lines.push("Each fixture now includes an explicit target bar plus `qa-scorecard.json` / `qa-scorecard.md` checks for copy, prompts, and deterministic SVG visual markers.");
  lines.push("Secrets are redacted in `debug-log.json`; provider image data URLs are stored as files instead of inline payloads.");
  return `${lines.join("\n")}\n`;
}

function escapeMarkdownTable(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, "<br>");
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
    ext: mimeType.includes("svg") ? ".svg" : mimeType.includes("jpeg") || mimeType.includes("jpg") ? ".jpg" : mimeType.includes("webp") ? ".webp" : ".png",
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
  if (ext === ".svg") return "image/svg+xml";
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
