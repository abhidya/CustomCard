import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createAiCardGenerationService, loadLocalAiEnvFiles } from "./ai-card-generator.mjs";
import { resolveAiFlowConfigs } from "../src/aiFlowConfigData.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const outputRoot = resolve(repoRoot, "docs/evidence/card-copy-comparisons");
const panelIds = ["front", "inside-left", "inside-right", "back"];
const defaultFixtureIds = [
  "small-business-thank-you",
  "medical-graduation",
  "dad-fix-anything",
  "botanical-birthday",
  "get-well-friend",
  "b2b-warranty-renewal",
  "distant-relative-wedding",
  "funny-bold-type-birthday",
  "simple-minimal-thank-you",
  "reverent-photo-note-sympathy",
  "sentimental-botanical-anniversary"
];

const referencePrompt = `Create 4 separate print-ready vertical 5x7 inch card images for a folded greeting card set.

Important output requirements:
Generate exactly four separate images:
1. FRONT COVER
2. BACK COVER
3. INSIDE LEFT PANEL
4. INSIDE RIGHT PANEL

Each image must be portrait orientation, 5x7 ratio, flat artwork only, no mockup, no shadows, no table, no background scene, no folds, no labels, no crop marks, no instruction text. Artwork should extend cleanly to the edges with a safe inner margin so nothing important is cut off when printed.

The four panels must look like one coordinated card set. Use matching borders, colors, floral elements, patterns, typography, and decorative spacing. The front cover and back cover should visually match. The inside left and inside right panels should also match each other and feel like the opened interior of the card.

Overall style: Luxury folded greeting card, elegant stationery design, print-ready, high resolution, refined typography, balanced composition, premium paper texture, subtle decorative border, heirloom quality, sophisticated and celebration-appropriate.`;

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
  },
  "get-well-friend": {
    id: "get-well-friend",
    category: "High-memory get-well card",
    competitorCategory: "Get-well card template",
    competitorPrompt: "heartfelt funny get well card",
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
    }
  },
  "b2b-warranty-renewal": {
    id: "b2b-warranty-renewal",
    category: "B2B purchase-anniversary warranty CTA card",
    competitorCategory: "CRM direct-mail renewal card",
    competitorPrompt: "warranty renewal customer anniversary card",
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
    }
  },
  "distant-relative-wedding": {
    id: "distant-relative-wedding",
    category: "Respectful distant-relative wedding card",
    competitorCategory: "Wedding card template",
    competitorPrompt: "elegant wedding blessing card",
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
    }
  },
  "funny-bold-type-birthday": {
    id: "funny-bold-type-birthday",
    category: "Funny bold-type birthday card",
    competitorCategory: "Funny birthday card template",
    competitorPrompt: "funny bold birthday card for older sibling",
    request: {
      sender: "Manny",
      recipient: "Aisha",
      relationship: "younger sibling to older sister",
      occasion: "birthday",
      tone: "funny",
      style: "bold type",
      language: "English",
      personal_note:
        "Make it witty but affectionate for an older sister who pretends birthdays are project-management milestones. Avoid mean age jokes.",
      memory_notes: [
        "Aisha calls every family plan a sprint.",
        "She loves clean editorial design and hates clutter.",
        "The joke should be affectionate, not sarcastic."
      ]
    }
  },
  "simple-minimal-thank-you": {
    id: "simple-minimal-thank-you",
    category: "Simple minimal thank-you card",
    competitorCategory: "Minimal thank-you template",
    competitorPrompt: "simple thank you card",
    request: {
      sender: "Manny",
      recipient: "Nora",
      relationship: "neighbor",
      occasion: "thank-you",
      tone: "simple",
      style: "minimal",
      language: "English",
      personal_note:
        "Thank Nora for watering the plants while I was away. Keep it plain, useful, and not flowery.",
      memory_notes: [
        "Nora watered the plants while Manny was away.",
        "The card should feel direct and grateful.",
        "Use one small plant-related mark, not a floral pattern."
      ]
    }
  },
  "reverent-photo-note-sympathy": {
    id: "reverent-photo-note-sympathy",
    category: "Reverent photo-note sympathy card",
    competitorCategory: "Sympathy photo card",
    competitorPrompt: "quiet sympathy card with photo note style",
    request: {
      sender: "Manny",
      recipient: "Elena",
      relationship: "friend",
      occasion: "sympathy and quiet support",
      tone: "reverent",
      style: "photo note",
      language: "English",
      personal_note:
        "Write a quiet support card for Elena after a family loss. Do not make religious claims. Leave a photo-note style frame but no actual face or portrait.",
      memory_notes: [
        "Elena is grieving a family loss.",
        "The sender wants steady support without cliches.",
        "Use a photo-note style frame as a design motif only; do not invent a photograph."
      ]
    }
  },
  "sentimental-botanical-anniversary": {
    id: "sentimental-botanical-anniversary",
    category: "Sentimental botanical anniversary card",
    competitorCategory: "Anniversary card catalog",
    competitorPrompt: "sentimental botanical anniversary card",
    request: {
      sender: "Manny",
      recipient: "Leah",
      relationship: "spouse",
      occasion: "anniversary",
      tone: "sentimental",
      style: "botanical",
      language: "English",
      personal_note:
        "Make it tender and specific without sounding like a wedding vow. Mention the small balcony basil plant and Sunday morning walks.",
      memory_notes: [
        "Leah and Manny keep a small balcony basil plant.",
        "They take Sunday morning walks together.",
        "The message should feel intimate but not overly dramatic."
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
  const live = isLiveBenchmarkEnabled(args, env);
  if (args["copy-adapter"]) env.CUSTOMCARD_AI_CARD_COPY_ADAPTER_ID = args["copy-adapter"];
  if (args.model) env.CUSTOMCARD_AI_CARD_COPY_MODEL = args.model;
  const aiFlowAdminConfig = buildBenchmarkAiFlowConfig(env, { copyLive: live, imageLive: false });

  const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runId = `card-copy-benchmark-${runStamp}`;
  const runDir = resolve(outputRoot, runId);
  mkdirSync(runDir, { recursive: true });
  writeMarkdown(resolve(runDir, "reference-card-prompt.md"), `# Reference Card Prompt\n\n${referencePrompt}\n`);

  const providerHttp = [];
  const fetchImpl = createLoggingFetch(providerHttp, env);
  const service = createAiCardGenerationService({ env, fetchImpl, aiFlowAdminConfig });
  const summary = {
    runId,
    createdAtIso: new Date().toISOString(),
    liveProviderCallsEnabled: live,
    fixtureIds: selectedFixtureIds,
    outputDir: relativePath(runDir),
    referencePromptSha256: sha256(referencePrompt),
    envRouting: {
      aiEnvSources: [".env.local", "infra/env/.env"].filter((filePath) => existsSync(resolve(repoRoot, filePath))),
      configuredProviderKeys: Object.keys(env).filter((key) => isSafeConfiguredKey(key)).sort(),
      secretsRedacted: true
    },
    resolvedFlowsBeforeRun: summarizeFlows(resolveAiFlowConfigs(env, aiFlowAdminConfig)),
    fixtures: []
  };

  for (const fixtureId of selectedFixtureIds) {
    const fixture = fixtures[fixtureId];
    if (!fixture) throw new Error(`Unknown card-copy benchmark fixture: ${fixtureId}`);
    summary.fixtures.push(await runFixture({ fixture, service, providerHttp, runDir, runStamp, env }));
  }

  summary.providerHttp = providerHttp;
  writeJson(resolve(runDir, "debug-log.json"), sanitizeForLog(summary, env));
  writeMarkdown(resolve(runDir, "README.md"), buildRunReadme(summary));
  const failed = summary.fixtures.filter((fixture) => !fixture.evaluation.passed);
  console.log(JSON.stringify({ runId, outputDir: relativePath(runDir), failed: failed.map((fixture) => fixture.id) }, null, 2));
  if (args["require-pass"] && failed.length > 0) process.exitCode = 1;
}

async function runFixture({ fixture, service, providerHttp, runDir, runStamp, env }) {
  const fixtureDir = resolve(runDir, fixture.id);
  mkdirSync(fixtureDir, { recursive: true });
  const providerStartIndex = providerHttp.length;
  const response = await service.generateCard(fixture.request, { rateKey: `copy-benchmark-${fixture.id}-${runStamp}` });
  const payload = sanitizeForLog(response.payload, env);
  const cardCopy = payload.card_copy || {};
  const evaluation = evaluateCardCopy({ cardCopy, request: fixture.request });
  const fixtureProviderCalls = providerHttp.slice(providerStartIndex);
  writeJson(resolve(fixtureDir, "card-copy-output.json"), payload);
  writeJson(resolve(fixtureDir, "evaluation.json"), evaluation);
  writeJson(resolve(fixtureDir, "provider-http.json"), fixtureProviderCalls);
  writeMarkdown(resolve(fixtureDir, "comparison.md"), buildFixtureComparison({ fixture, payload, evaluation }));

  return {
    id: fixture.id,
    category: fixture.category,
    competitorPrompt: fixture.competitorPrompt,
    statusCode: response.statusCode,
    generatedBy: payload.generated_by,
    outputDir: relativePath(fixtureDir),
    cardCopyModel: payload.ai_flow?.card_copy?.model,
    providerFailure: payload.ai_flow?.card_copy?.provider_failure,
    evaluation
  };
}

export function evaluateCardCopy({ cardCopy, request }) {
  const panels = Array.isArray(cardCopy?.panels) ? cardCopy.panels : [];
  const panelsById = new Map(panels.map((panel) => [panel?.id, panel]));
  const blockers = [];
  const warnings = [];
  const subScores = {
    schema: 0,
    copyRichness: 0,
    layoutDirection: 0,
    imagePrompt: 0,
    safety: 0,
    memoryGrounding: 0,
    coordination: 0
  };

  if (panels.map((panel) => panel?.id).join("|") === panelIds.join("|")) {
    subScores.schema = 15;
  } else {
    blockers.push("Card copy must include exactly four panels in order: front, inside-left, inside-right, back.");
  }

  let copyPoints = 0;
  let layoutPoints = 0;
  let imagePoints = 0;
  let safetyPoints = 10;
  const themeGuide = normalizeThemeGuide(cardCopy?.theme_guide || cardCopy?.themeGuide);
  if (!themeGuide) {
    blockers.push("Card copy must include a theme_guide with palette, motifs, border_style, and front/interior pairing notes.");
  }

  for (const panelId of panelIds) {
    const panel = panelsById.get(panelId) || {};
    const body = cleanText(panel.body);
    const headline = cleanText(panel.headline);
    const artDirection = cleanText(panel.art_direction || panel.artDirection);
    const visualCue = cleanText(panel.visual_cue || panel.visualCue);
    const textLayout = panel.text_layout || panel.textLayout;
    const imagePrompt = cleanText(panel.image_prompt || panel.imagePrompt);
    const negativePrompt = cleanText(panel.image_negative_prompt || panel.imageNegativePrompt).toLowerCase();

    if (!headline) blockers.push(`${panelId}: missing headline.`);
    if (panelId === "inside-left" && body.length >= 120 && wordCount(body) >= 18) copyPoints += 6;
    if (panelId === "inside-right" && body.length >= 180 && wordCount(body) >= 28) copyPoints += 8;
    if (panelId === "front" && body.length <= 180) copyPoints += 2;
    if (panelId === "back" && body.length <= 180) copyPoints += 2;
    if (panelId.startsWith("inside") && body.length < (panelId === "inside-left" ? 120 : 180)) {
      blockers.push(`${panelId}: body is terse (${body.length} chars).`);
    }
    if (containsOrderClaim(`${headline} ${body}`)) {
      blockers.push(`${panelId}: copy makes order/payment/shipping claims.`);
      safetyPoints -= 3;
    }

    const layoutHits = countMatches(
      artDirection,
      /\b(layout|safe|margin|border|ornament|typography|type|text|space|palette|matching|coordinated|front|back|inside|spread)\b/gi
    );
    if (artDirection.length >= 90 && layoutHits >= 3) layoutPoints += 3;
    else warnings.push(`${panelId}: art_direction lacks enough layout/theme detail.`);
    if (visualCue.length >= 70) layoutPoints += 1;
    else blockers.push(`${panelId}: missing panel-specific visual_cue.`);
    if (hasValidTextLayout(textLayout)) layoutPoints += 1;
    else blockers.push(`${panelId}: missing valid text_layout enum plan.`);

    if (imagePrompt.length >= 180) imagePoints += 2;
    if (/\b5x7\b/i.test(imagePrompt)) imagePoints += 1;
    if (/\b(flat|2d|full-bleed|print panel|print-ready)\b/i.test(imagePrompt)) imagePoints += 1;
    if (panelPromptMentionsPanel(imagePrompt, panelId)) imagePoints += 1;
    if (/\b(no readable text|no words|no letters)\b/i.test(imagePrompt)) imagePoints += 1;
    if (containsForbiddenImageScene(imagePrompt)) {
      blockers.push(`${panelId}: image_prompt risks mockup/collage output.`);
      safetyPoints -= 2;
    }
    if (panelId.startsWith("inside") && !hasInteriorBorderTextSpace(`${artDirection} ${imagePrompt}`)) {
      blockers.push(`${panelId}: inside panel must specify decorative border/frame, quiet center, clean text-safe area, and sparse edge/corner motifs.`);
    }
    if (panelId.startsWith("inside") && containsBusyInterior(imagePrompt)) {
      blockers.push(`${panelId}: inside image_prompt is too busy for message text.`);
      safetyPoints -= 1;
    }
    for (const required of ["readable text", "fake text", "letters", "people", "hands", "folded card mockup", "product photo"]) {
      if (!negativePrompt.includes(required)) warnings.push(`${panelId}: negative prompt missing ${required}.`);
    }
  }

  subScores.copyRichness = Math.min(20, copyPoints);
  subScores.layoutDirection = Math.min(20, layoutPoints);
  subScores.imagePrompt = Math.min(20, imagePoints);
  subScores.safety = Math.max(0, Math.min(10, safetyPoints));

  const citations = Array.isArray(cardCopy?.memory_citations) ? cardCopy.memory_citations.map(cleanText).filter(Boolean) : [];
  if (!request.memory_notes?.length || citations.length > 0) subScores.memoryGrounding = 10;
  else warnings.push("No memory citations returned for memory-backed fixture.");

  const combinedDirections = panels
    .map((panel) => `${panel?.art_direction || ""} ${panel?.image_prompt || ""}`)
    .join(" ");
  if (/\b(coordinated|matching|pair|echo|same palette|visual match|opened interior|front and back|inside-left and inside-right)\b/i.test(combinedDirections)) {
    subScores.coordination = 5;
  } else {
    warnings.push("No explicit cross-panel coordination language found.");
  }
  if (themeGuide && !themeTermsUsedAcrossPanels(themeGuide, panels)) {
    blockers.push("Panel art directions and image prompts must reuse theme_guide palette, motifs, and border_style across the set.");
  }

  const score = Object.values(subScores).reduce((sum, value) => sum + value, 0);
  return {
    passed: blockers.length === 0 && score >= 82,
    score,
    subScores,
    blockers,
    warnings,
    panelStats: panelIds.map((panelId) => {
      const panel = panelsById.get(panelId) || {};
      return {
        panelId,
        headlineChars: cleanText(panel.headline).length,
        bodyChars: cleanText(panel.body).length,
        bodyWords: wordCount(panel.body),
        artDirectionChars: cleanText(panel.art_direction || panel.artDirection).length,
        visualCueChars: cleanText(panel.visual_cue || panel.visualCue).length,
        hasValidTextLayout: hasValidTextLayout(panel.text_layout || panel.textLayout),
        imagePromptChars: cleanText(panel.image_prompt || panel.imagePrompt).length
      };
    })
  };
}

function buildFixtureComparison({ fixture, payload, evaluation }) {
  const lines = [
    `# ${fixture.category}`,
    "",
    `- Competitor prompt/category: ${fixture.competitorPrompt}`,
    `- Generated by: ${payload.generated_by}`,
    `- Card copy model: ${payload.ai_flow?.card_copy?.model || "n/a"}`,
    `- Provider failure: ${payload.ai_flow?.card_copy?.provider_failure || "n/a"}`,
    `- Score: ${evaluation.score}/100`,
    `- Passed: ${evaluation.passed ? "yes" : "no"}`,
    ""
  ];
  if (evaluation.blockers.length > 0) {
    lines.push("## Blockers", "", ...evaluation.blockers.map((blocker) => `- ${blocker}`), "");
  }
  if (evaluation.warnings.length > 0) {
    lines.push("## Warnings", "", ...evaluation.warnings.map((warning) => `- ${warning}`), "");
  }
  if (payload.card_copy?.theme_guide) {
    lines.push("## Theme Guide", "", "```json", JSON.stringify(payload.card_copy.theme_guide, null, 2), "```", "");
  }
  lines.push("## Panel Copy", "");
  for (const panel of payload.card_copy?.panels || []) {
    lines.push(
      `### ${panel.id}`,
      "",
      `Headline: ${panel.headline || ""}`,
      "",
      panel.body || "",
      "",
      `Art direction: ${panel.art_direction || ""}`,
      "",
      `Visual cue: ${panel.visual_cue || panel.visualCue || ""}`,
      "",
      "Text layout:",
      "",
      "```json",
      JSON.stringify(panel.text_layout || panel.textLayout || {}, null, 2),
      "```",
      "",
      `Image prompt: ${panel.image_prompt || ""}`,
      ""
    );
  }
  return `${lines.join("\n")}\n`;
}

function buildRunReadme(summary) {
  const lines = [
    `# ${summary.runId}`,
    "",
    "Card-copy benchmark run for theme, layout, and content richness.",
    "",
    `Reference prompt hash: \`${summary.referencePromptSha256}\``,
    "",
    "| Fixture | Category | Score | Passed | Evidence |",
    "|---|---|---:|---|---|"
  ];
  for (const fixture of summary.fixtures) {
    lines.push(
      `| ${fixture.id} | ${fixture.category} | ${fixture.evaluation.score} | ${fixture.evaluation.passed ? "yes" : "no"} | [open](${fixture.id}/comparison.md) |`
    );
  }
  lines.push("");
  lines.push("Provider HTTP is redacted in each fixture folder and in `debug-log.json`.");
  return `${lines.join("\n")}\n`;
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
  return args.live === true || args.live === "true" || String(env.CUSTOMCARD_COPY_BENCHMARK_LIVE || "").toLowerCase() === "enabled";
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
    return new Response(buffer, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  };
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

function buildBenchmarkAiFlowConfig(env, { copyLive, imageLive }) {
  return resolveAiFlowConfigs(env).map((flow) => ({
    flowId: flow.flowId,
    primaryAdapterId: flow.primaryAdapterId,
    fallbackAdapterId: flow.fallbackAdapterId,
    model: flow.model,
    promptInstructions: flow.promptInstructions,
    rateLimitPerMinute: flow.rateLimitPerMinute,
    monthlyBudgetCents: flow.monthlyBudgetCents,
    perRequestBudgetCents: flow.perRequestBudgetCents,
    queueEnabled: flow.queueEnabled,
    fallbackQueueEnabled: flow.fallbackQueueEnabled,
    liveProviderCallsEnabled: flow.flowId === "card-copy" ? copyLive : flow.flowId === "card-image" ? imageLive : flow.liveProviderCallsEnabled,
    maxRetries: flow.maxRetries,
    maxTokens: flow.maxTokens,
    temperature: flow.temperature
  }));
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

function redactHeaders(headers, env = {}) {
  const entries = headers instanceof Headers ? Array.from(headers.entries()) : Object.entries(headers);
  return Object.fromEntries(
    entries.map(([key, value]) => [
      key,
      /authorization|token|secret|key|cookie/i.test(key) ? "<redacted>" : redactUrl(String(value), env)
    ])
  );
}

function redactUrl(value, env = {}) {
  let text = value;
  const accountId = String(env.CLOUDFLARE_ACCOUNT_ID || "");
  if (accountId) text = text.split(accountId).join("<redacted-account>");
  text = text.replace(/accounts\/[^/]+/g, "accounts/<redacted-account>");
  text = text.replace(/https:\/\/[^./]+\.r2\.cloudflarestorage\.com/g, "https://<redacted-account>.r2.cloudflarestorage.com");
  return text;
}

function sanitizeForLog(value, env) {
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
  return /^(CUSTOMCARD_AI_|CLOUDFLARE_)/.test(key);
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

function panelPromptMentionsPanel(prompt, panelId) {
  if (panelId === "inside-left") return /\binside[- ]left\b/i.test(prompt);
  if (panelId === "inside-right") return /\binside[- ]right\b/i.test(prompt);
  return new RegExp(`\\b${panelId}\\b`, "i").test(prompt);
}

function containsForbiddenImageScene(prompt) {
  const withoutNegatedBans = cleanText(prompt)
    .replace(/\bno\s+(?:physical\s+)?(?:card\s+)?mockups?\b/gi, "")
    .replace(/\bnot\s+(?:a\s+)?(?:physical\s+)?(?:card\s+)?mockups?\b/gi, "")
    .replace(/\bno\s+tabletop(?:\s+scene)?\b/gi, "")
    .replace(/\bnot\s+(?:a\s+)?tabletop(?:\s+scene)?\b/gi, "");
  return /\b(?:mockup|tabletop|folded preview|four-panel collage|contact sheet)\b/i.test(withoutNegatedBans);
}

function containsOrderClaim(text) {
  const withoutNegatedClaims = cleanText(text)
    .replace(/\bwithout implying an order was placed\b/gi, "")
    .replace(/\bwithout claiming an order was placed\b/gi, "")
    .replace(/\bdo not (?:imply|claim) (?:an )?order was placed\b/gi, "")
    .replace(/\bno order(?:s)? (?:was|were)? ?placed\b/gi, "");
  return /\b(?:ordered|payment|paid|shipped|delivered|checkout completed)\b/i.test(withoutNegatedClaims) ||
    /\border (?:was|is|has been|will be) placed\b/i.test(withoutNegatedClaims);
}

function hasInteriorBorderTextSpace(value) {
  const text = cleanText(value);
  return /\b(border|frame|framing|edge|corner|ornament)\b/i.test(text) &&
    /\b(quiet|blank|calm|open|negative|low[- ]contrast|subtle)\b/i.test(text) &&
    /\b(center|centre|middle|message area|text area|text-safe|typography area)\b/i.test(text) &&
    /\b(text-safe|app overlay|app-rendered|reserved for text|typography area|message)\b/i.test(text) &&
    /\b(sparse|low-density|gentle|subtle|edge|corner)\b/i.test(text);
}

function containsBusyInterior(value) {
  const text = cleanText(value);
  return /\b(busy|dense|full-surface|all-over|cluttered|packed|maximalist|filled with|covered in)\b/i.test(text) &&
    !/\b(quiet|blank|calm|open|negative|low[- ]contrast|text-safe)\b/i.test(text);
}

function hasValidTextLayout(value) {
  if (!value || typeof value !== "object") return false;
  const headlineZone = cleanText(value.headline_zone || value.headlineZone).toLowerCase();
  const bodyZone = cleanText(value.body_zone || value.bodyZone).toLowerCase();
  const alignment = cleanText(value.alignment).toLowerCase();
  const fontPairing = cleanText(value.font_pairing || value.fontPairing).toLowerCase();
  const colorMode = cleanText(value.color_mode || value.colorMode).toLowerCase();
  const scale = cleanText(value.scale).toLowerCase();
  return ["top", "upper", "center", "lower"].includes(headlineZone) &&
    ["upper", "center", "lower", "bottom"].includes(bodyZone) &&
    ["left", "center", "right"].includes(alignment) &&
    ["serif-sans", "bold-editorial", "minimal-sans", "soft-serif"].includes(fontPairing) &&
    ["dark-ink", "light-ink", "accent-ink", "high-contrast"].includes(colorMode) &&
    ["compact", "standard", "large"].includes(scale);
}

function normalizeThemeGuide(value) {
  if (!value || typeof value !== "object") return undefined;
  const palette = Array.isArray(value.palette) ? value.palette.map(cleanText).filter(Boolean) : [];
  const motifs = Array.isArray(value.motifs) ? value.motifs.map(cleanText).filter(Boolean) : [];
  const borderStyle = cleanText(value.border_style || value.borderStyle);
  const frontBackPairing = cleanText(value.front_back_pairing || value.frontBackPairing);
  const interiorPairing = cleanText(value.interior_pairing || value.interiorPairing);
  if (palette.length < 3 || motifs.length < 3 || !borderStyle || !frontBackPairing || !interiorPairing) return undefined;
  return { palette, motifs, borderStyle, frontBackPairing, interiorPairing };
}

function themeTermsUsedAcrossPanels(themeGuide, panels) {
  const combined = cleanText(panels.map((panel) => `${panel?.art_direction || ""} ${panel?.image_prompt || ""}`).join(" ")).toLowerCase();
  const paletteHits = themeGuide.palette.filter((term) => termHits(combined, term)).length;
  const motifHits = themeGuide.motifs.filter((term) => termHits(combined, term)).length;
  return paletteHits >= 2 && motifHits >= 2 && termHits(combined, themeGuide.borderStyle);
}

function termHits(text, term) {
  return cleanText(term)
    .toLowerCase()
    .split(/\s+/)
    .filter((part) => part.length >= 4)
    .some((part) => text.includes(part));
}

function countMatches(value, regex) {
  return cleanText(value).match(regex)?.length || 0;
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function wordCount(value) {
  return cleanText(value).split(/\s+/).filter(Boolean).length;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function relativePath(filePath) {
  return filePath.replace(`${repoRoot}/`, "");
}

function isMainModule() {
  return import.meta.url === pathToFileURL(process.argv[1] || "").href;
}
