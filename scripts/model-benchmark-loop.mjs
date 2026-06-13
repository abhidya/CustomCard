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
const commonNonSecretEnvValues = new Set([
  "development",
  "production",
  "staging",
  "test",
  "localhost",
  "127.0.0.1",
  "enabled",
  "disabled"
]);

export const typographyExperimentSpec = {
  id: "folded-card-sunburst-typography",
  panelType: "Front Cover",
  size: "5x7 portrait",
  output: "Flat 2D print artwork",
  style: "Premium greeting card",
  palette: "Deep charcoal, warm gold, ivory accents",
  motif: "Elegant radial sunburst",
  mood: "Respectful, warm, sophisticated",
  headline: "For Moments That Matter",
  body: "Wishing you strength and peace on your day.",
  headlineWordCount: 4,
  bodySentenceCount: 1,
  panels: {
    front: {
      id: "front",
      panelType: "Front Cover",
      role: "primary typography measurement panel",
      headline: "For Moments That Matter",
      body: "Wishing you strength and peace on your day.",
      composition:
        "deep charcoal field, warm gold radial sunburst, ivory accent details, generous margins, front-cover hierarchy",
      modeCHint:
        "Place a broad opaque plain deep-charcoal text-safe field in the central 60% of the panel. Treat this field as a real solid print area, not transparent negative space. Keep all rays, ornaments, bright marks, fake glyphs, and high-contrast details outside it. Put sunburst detail only as edge-only corner or margin ornaments; do not use a centered radial burst, halo, medallion, or rays crossing behind the field."
    },
    "inside-left": {
      id: "inside-left",
      panelType: "Inside Left",
      role: "left half of a coordinated interior spread with opening message text",
      headline: "A Quiet Honor",
      body: "May this space hold steadiness, light, and the care surrounding you today.",
      composition:
        "warm ivory note-sheet field, thin gold border, sparse sunburst echo along outer edge, quiet center, paired with inside-right",
      modeCHint:
        "Make this an interior writing panel, not another cover. Leave a large opaque plain warm-ivory text-safe field through the upper-middle and center. Keep sunburst detail tiny and sparse along the outer-left edge only, outside the field. Do not draw a radial sunburst, halo, medallion, circle, or rays behind the field."
    },
    "inside-right": {
      id: "inside-right",
      panelType: "Inside Right",
      role: "right half of a coordinated interior spread with main message text",
      headline: "With Respect and Warmth",
      body: "For the moments that ask for courage, may you feel supported, seen, and held in peace.",
      composition:
        "matching warm ivory note-sheet field, thin gold border, sparse sunburst echo mirrored from inside-left, quiet center, paired with inside-left",
      modeCHint:
        "Make this the matching interior message panel. Leave a large opaque plain warm-ivory text-safe field through the upper-middle and center. Keep sunburst detail tiny and sparse along the outer-right edge only, outside the field. Do not draw a radial sunburst, halo, medallion, circle, or rays behind the field."
    },
    back: {
      id: "back",
      panelType: "Back Cover",
      role: "coordinating no-text back panel",
      composition:
        "mostly deep charcoal negative space, thin gold border echo, one small gold sunburst mark near lower edge, no card copy",
      modeCHint:
        "Back cover must be at least 85% plain deep charcoal. Use only one tiny warm-gold sun mark near the lower third. Do not create a large radial halo, full-panel burst, centered sunburst, decorative typography, or any text-like marks."
    }
  }
};

const typographyModes = [
  {
    id: "mode-a-current-overlay",
    label: "Mode A - current overlay",
    strategy: "artwork-only-plus-deterministic-overlay"
  },
  {
    id: "mode-b-full-ai-typography",
    label: "Mode B - full AI typography",
    strategy: "single-generation-final-panel"
  },
  {
    id: "mode-c-hybrid-reserved-layout",
    label: "Mode C - hybrid reserved layout",
    strategy: "reserved-layout-plus-deterministic-overlay"
  }
];

const pipelineQualityStoryId = "sympathy-quiet-support";
const typographyPanelOrder = ["front", "inside-left", "inside-right", "back"];
const typographyTextPanels = {
  front: {
    id: "front",
    headline: typographyExperimentSpec.headline,
    body: typographyExperimentSpec.body,
    text_layout: {
      headline_zone: "center",
      body_zone: "lower",
      alignment: "center",
      font_pairing: "bold-editorial",
      color_mode: "light-ink",
      scale: "large"
    }
  },
  "inside-left": {
    id: "inside-left",
    headline: typographyExperimentSpec.panels["inside-left"].headline,
    body: typographyExperimentSpec.panels["inside-left"].body,
    text_layout: {
      headline_zone: "upper",
      body_zone: "center",
      alignment: "center",
      font_pairing: "soft-serif",
      color_mode: "dark-ink",
      scale: "standard"
    }
  },
  "inside-right": {
    id: "inside-right",
    headline: typographyExperimentSpec.panels["inside-right"].headline,
    body: typographyExperimentSpec.panels["inside-right"].body,
    text_layout: {
      headline_zone: "upper",
      body_zone: "center",
      alignment: "center",
      font_pairing: "soft-serif",
      color_mode: "dark-ink",
      scale: "standard"
    }
  },
  back: {
    id: "back",
    headline: "",
    body: "",
    text_layout: {
      headline_zone: "lower",
      body_zone: "bottom",
      alignment: "center",
      font_pairing: "minimal-sans",
      color_mode: "light-ink",
      scale: "compact"
    }
  }
};

export const stories = {
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
  },
  "small-business-thank-you": {
    id: "small-business-thank-you",
    customer_type: "small business / ecommerce retention",
    occasion: "thank-you after purchase",
    memory_load: "medium",
    request: {
      sender: "CustomCard",
      recipient: "loyal customers",
      relationship: "small business to repeat customer",
      occasion: "thank-you for supporting a small business",
      tone: "warm, sincere, polished, grateful, not salesy",
      style:
        "premium small-business editorial stationery with warm citrus, cream, deep teal, soft gold, handmade local-shop texture",
      language: "English",
      personal_note:
        "Make this feel like a real small business owner thanking a customer after a purchase, without implying an order was placed inside CustomCard.",
      memory_notes: [
        "The customer chose an independent small business instead of a large marketplace.",
        "The owner wants the message to feel handmade, specific, and grateful rather than promotional.",
        "CustomCard needs editable copy overlays, print-safe margins, persistence, and human review before external sharing."
      ]
    },
    must_include: ["support", "independent", "customer", "gratitude", "small"],
    must_avoid: ["sales pitch", "discount", "order confirmation", "marketplace", "generic loyalty"]
  },
  "dad-fix-anything": {
    id: "dad-fix-anything",
    customer_type: "family/frequent sender",
    occasion: "Father's Day",
    memory_load: "medium",
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
    must_include: ["Dad", "fixes", "small things", "practical love", "tools"],
    must_avoid: ["best dad", "hardware-store clutter", "copied joke", "mean sarcasm"]
  },
  "botanical-birthday": {
    id: "botanical-birthday",
    customer_type: "returning consumer",
    occasion: "personalized birthday",
    memory_load: "medium",
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
        "Sara keeps a fern by the kitchen window.",
        "Sara loves morning hikes and tiny trail flowers.",
        "The birthday card should feel personal without feeling overly sentimental."
      ]
    },
    must_include: ["Sara", "birthday", "fern", "morning", "coffee"],
    must_avoid: ["generic flowers", "fake travel memories", "romantic tone", "stock balloons"]
  },
  "funny-bold-type-birthday": {
    id: "funny-bold-type-birthday",
    customer_type: "family/frequent sender",
    occasion: "funny birthday",
    memory_load: "medium",
    request: {
      sender: "Manny",
      recipient: "Aisha",
      relationship: "younger sibling to older sister",
      occasion: "birthday",
      tone: "funny, affectionate, sharp, not mean",
      style: "bold editorial typography, crisp color blocking, uncluttered, print-safe",
      language: "English",
      personal_note:
        "Make it witty but affectionate for an older sister who pretends birthdays are project-management milestones. Avoid mean age jokes.",
      memory_notes: [
        "Aisha calls every family plan a sprint.",
        "She loves clean editorial design and hates clutter.",
        "The joke should be affectionate, not sarcastic."
      ]
    },
    must_include: ["Aisha", "birthday", "sprint", "milestone", "affection"],
    must_avoid: ["age joke", "mean sarcasm", "clutter", "illegible novelty type"]
  },
  "simple-minimal-thank-you": {
    id: "simple-minimal-thank-you",
    customer_type: "casual sender",
    occasion: "thank-you",
    memory_load: "low",
    request: {
      sender: "Manny",
      recipient: "Nora",
      relationship: "neighbor",
      occasion: "thank-you",
      tone: "simple, direct, useful, grateful",
      style: "minimal stationery, one small plant mark, quiet whitespace, no floral pattern",
      language: "English",
      personal_note:
        "Thank Nora for watering the plants while I was away. Keep it plain, useful, and not flowery.",
      memory_notes: [
        "Nora watered the plants while Manny was away.",
        "The card should feel direct and grateful.",
        "Use one small plant-related mark, not a floral pattern."
      ]
    },
    must_include: ["Nora", "thank", "plants", "away", "plain"],
    must_avoid: ["flowery", "long poem", "floral pattern", "overly emotional"]
  },
  "sympathy-quiet-support": {
    id: "sympathy-quiet-support",
    customer_type: "returning consumer",
    occasion: "sympathy/support",
    memory_load: "medium",
    request: {
      sender: "Jordan",
      recipient: "Eli",
      relationship: "friend",
      occasion: "sympathy after losing a parent",
      tone: "quiet, grounded, deeply respectful, practical, not cliched",
      style: "restrained sympathy stationery, soft gray, warm ivory, one small line-art branch, generous whitespace",
      language: "English",
      personal_note:
        "A quiet card for Eli after losing his father. Mention that I am here for the practical stuff too: meals, rides, calls, silence. No cliches.",
      memory_notes: [
        "Eli lost his father.",
        "Jordan wants to offer practical support: meals, rides, calls, and silence.",
        "The card should avoid platitudes and religious claims unless requested."
      ]
    },
    must_include: ["Eli", "father", "meals", "rides", "silence"],
    must_avoid: ["religious claims", "platitudes", "bright celebration", "overdesigned ornament"]
  },
  "sentimental-botanical-anniversary": {
    id: "sentimental-botanical-anniversary",
    customer_type: "romantic partner",
    occasion: "anniversary",
    memory_load: "high",
    request: {
      sender: "Manny",
      recipient: "Leah",
      relationship: "spouse",
      occasion: "anniversary",
      tone: "sentimental, tender, specific, not melodramatic",
      style: "botanical anniversary stationery, soft green, cream, restrained gold, intimate but modern",
      language: "English",
      personal_note:
        "Make it tender and specific without sounding like a wedding vow. Mention the small balcony basil plant and Sunday morning walks.",
      memory_notes: [
        "Leah and Manny keep a small balcony basil plant.",
        "They take Sunday morning walks together.",
        "The message should feel intimate but not overly dramatic."
      ]
    },
    must_include: ["Leah", "anniversary", "basil", "Sunday morning walks", "tender"],
    must_avoid: ["wedding vow", "overly dramatic", "generic soulmate", "fake memories"]
  }
};

const textCandidates = [
  {
    id: "text-deterministic-support",
    label: "Deterministic support copy baseline",
    adapterId: "deterministic-customer-chat",
    model: "deterministic-support-copy",
    requiredEnv: []
  },
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
    id: "image-deepai-text2img",
    label: "DeepAI text2img",
    adapterId: "deepai-text2img-image",
    model: "text2img",
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
  },
  {
    id: "image-hf-flux-schnell",
    label: "Hugging Face FLUX.1 Schnell via Inference Providers",
    adapterId: "huggingface-image",
    model: "black-forest-labs/FLUX.1-schnell",
    requiredEnv: ["HUGGINGFACE_API_TOKEN"]
  },
  {
    id: "image-hf-qwen-image",
    label: "Hugging Face Qwen Image via Inference Providers",
    adapterId: "huggingface-image",
    model: "Qwen/Qwen-Image",
    requiredEnv: ["HUGGINGFACE_API_TOKEN"]
  },
  {
    id: "image-hf-qwen-image-2512",
    label: "Hugging Face Qwen Image 2512 via Inference Providers",
    adapterId: "huggingface-image",
    model: "Qwen/Qwen-Image-2512",
    requiredEnv: ["HUGGINGFACE_API_TOKEN"]
  },
  {
    id: "image-hf-z-image-turbo",
    label: "Hugging Face Z-Image Turbo via Inference Providers",
    adapterId: "huggingface-image",
    model: "Tongyi-MAI/Z-Image-Turbo",
    requiredEnv: ["HUGGINGFACE_API_TOKEN"]
  },
  {
    id: "image-browser-svg-renderer",
    label: "Deterministic browser SVG renderer",
    adapterId: "browser-svg-renderer",
    model: "deterministic-svg",
    requiredEnv: []
  }
];

const blockedImageCandidates = [
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
    summary.runs.push(
      run.phase === "typography"
        ? await runTypographyExperimentPanel({ run, phaseDir, providerHttp, env, fetchImpl })
        : await runBenchmarkCard({ run, phaseDir, service, providerHttp, env, fetchImpl })
    );
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
  if (phase === "typography") return typographyExperimentRuns(candidates);
  if (phase === "pipeline-quality" || phase === "quality") return pipelineQualityRuns(candidates);
  if (phase === "all") return [...smokeRuns(candidates), ...fullRuns(candidates)];
  throw new Error(`Unknown benchmark phase: ${phase}`);
}

function applyRunFilters(runs, args) {
  return runs.filter((run) => {
    if (args.story && run.storyId !== args.story) return false;
    if (args.text && run.text.id !== args.text) return false;
    if (args.image && run.image.id !== args.image) return false;
    if (args.focus && run.focus !== args.focus) return false;
    if (args["typography-mode"] && !matchesTypographyMode(run, args["typography-mode"])) return false;
    return true;
  });
}

function matchesTypographyMode(run, value) {
  if (!run.typographyMode) return false;
  const wanted = String(value || "").trim().toLowerCase();
  const aliases = new Set([
    run.typographyMode.id,
    run.typographyMode.label,
    run.typographyMode.strategy,
    run.typographyMode.id.replace(/^mode-/, ""),
    run.typographyMode.id.replace(/^mode-[abc]-/, "")
  ].map((entry) => String(entry || "").trim().toLowerCase()));
  return aliases.has(wanted);
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
  const imageIds = new Set(["image-deepai-text2img", "image-cloudflare-flux-schnell"]);
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

export function typographyExperimentRuns(candidates) {
  const image = firstConfigured(candidates.image, "image-deepai-text2img") || {
    id: "image-browser-svg-renderer",
    label: "Browser SVG renderer",
    adapterId: "browser-svg-renderer",
    model: "",
    configured: true,
    missingEnv: []
  };
  return typographyModes.map((mode) => ({
    phase: "typography",
    focus: "typography",
    storyId: typographyExperimentSpec.id,
    story: {
      id: typographyExperimentSpec.id,
      must_include: [typographyExperimentSpec.headline, typographyExperimentSpec.body],
      must_avoid: ["lorem ipsum", "placeholder", "extra words", "fake lettering", "mockup"]
    },
    text: {
      id: "text-none-direct-image-test",
      label: "Direct image typography test",
      adapterId: "none",
      model: ""
    },
    image,
    typographyMode: mode
  }));
}

export function pipelineQualityRuns(candidates) {
  const story = stories[pipelineQualityStoryId];
  const textIds = new Set(["text-deterministic-support", "text-hf-qwen3-235b-a22b", "text-cloudflare-baseline"]);
  const imageIds = new Set([
    "image-deepai-text2img",
    "image-browser-svg-renderer",
    "image-cloudflare-flux-schnell",
    "image-hf-flux-schnell",
    "image-hf-qwen-image",
    "image-hf-qwen-image-2512",
    "image-hf-z-image-turbo"
  ]);
  const texts = (candidates.text || []).filter((candidate) => candidate.configured && textIds.has(candidate.id));
  const selectedTexts = texts.length > 0 ? texts : [
    {
      id: "text-deterministic-fallback",
      label: "Deterministic fallback copy",
      adapterId: "deterministic-customer-chat",
      model: "",
      configured: true,
      missingEnv: []
    }
  ];
  const images = (candidates.image || []).filter((candidate) => candidate.configured && imageIds.has(candidate.id));
  const selectedImages = images.length > 0 ? images : [
    {
      id: "image-browser-svg-renderer",
      label: "Browser SVG renderer",
      adapterId: "browser-svg-renderer",
      model: "deterministic-svg",
      configured: true,
      missingEnv: []
    }
  ];
  return selectedTexts.flatMap((text) =>
    selectedImages.map((image) => ({
      phase: "pipeline-quality",
      focus: "full-card-quality",
      storyId: story.id,
      story,
      text,
      image
    }))
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

async function runTypographyExperimentPanel({ run, phaseDir, providerHttp, env, fetchImpl }) {
  const runId = `${run.storyId}__${run.typographyMode.id}__${run.image.id}`;
  const runDir = resolve(phaseDir, runId);
  mkdirSync(runDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const providerStartIndex = providerHttp.length;
  const promptPlans = typographyPanelOrder.map((panelId) =>
    buildTypographyExperimentPrompt(run.typographyMode.id, typographyExperimentSpec, panelId)
  );
  writeJson(resolve(runDir, "run-config.json"), sanitize({ ...plannedRunSummary(run), promptPlans }, env));
  for (const promptPlan of promptPlans) {
    writeMarkdown(resolve(runDir, `prompt-${promptPlan.panelId}.md`), promptPlan.prompt);
  }

  try {
    const panelFiles = [];
    const decodedFiles = [];
    for (const promptPlan of promptPlans) {
      const imageUrl = await executeTypographyImageProvider({
        image: run.image,
        panelId: promptPlan.panelId,
        prompt: promptPlan.prompt,
        negativePrompt: promptPlan.negativePrompt,
        env,
        fetchImpl
      });
      const decoded = await decodeImageUrl(imageUrl, fetchImpl, env);
      decodedFiles.push(decoded);
      const providerFile = resolve(runDir, `provider-${promptPlan.panelId}${decoded.ext}`);
      writeFileSync(providerFile, decoded.buffer);
      const previewBuffer = await renderTypographyPreview({
        imageBuffer: decoded.buffer,
        overlayText: promptPlan.renderTextDeterministically,
        panelCopy: typographyTextPanels[promptPlan.panelId],
        modeId: promptPlan.modeId
      });
      const previewFile = resolve(runDir, `preview-${promptPlan.panelId}.png`);
      writeFileSync(previewFile, previewBuffer);
      panelFiles.push({
        panelId: promptPlan.panelId,
        path: providerFile,
        previewPath: previewFile,
        prompt: promptPlan.prompt,
        negativePrompt: promptPlan.negativePrompt,
        renderTextDeterministically: promptPlan.renderTextDeterministically,
        sourceKind: decoded.sourceKind,
        contentType: decoded.contentType
      });
    }
    const providerCalls = providerHttp.slice(providerStartIndex);
    const contactSheet = await renderContactSheet({ runDir, run, panelFiles });
    const autoChecks = typographyAutoChecks({ promptPlans, providerCalls, decodedFiles });
    const runResult = {
      ...plannedRunSummary(run),
      runDir: relativePath(runDir),
      startedAt,
      finishedAt: new Date().toISOString(),
      panelCount: panelFiles.length,
      panelFiles: panelFiles.map((file) => ({
        ...file,
        path: relativePath(file.path),
        previewPath: relativePath(file.previewPath)
      })),
      contactSheet: contactSheet ? relativePath(contactSheet) : undefined,
      providerCallCount: providerCalls.length,
      autoChecks
    };
    writeJson(resolve(runDir, "auto-checks.json"), autoChecks);
    writeJson(resolve(runDir, "provider-http.json"), sanitize(providerCalls, env));
    writeJson(resolve(runDir, "run-result.json"), sanitize(runResult, env));
    writeMarkdown(resolve(runDir, "manual-grade-template.md"), buildTypographyManualGradeTemplate(runResult, run, promptPlans));
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

export function buildTypographyExperimentPrompt(modeId, spec = typographyExperimentSpec, panelId = "front") {
  const panel = spec.panels?.[panelId] ?? spec.panels?.front ?? {
    id: "front",
    panelType: spec.panelType,
    headline: spec.headline,
    body: spec.body,
    composition: `${spec.palette}; ${spec.motif}`
  };
  const hasPanelText = Boolean(panel.headline && panel.body);
  const motif = typographyMotifRequirement(modeId, panel, spec, hasPanelText);
  const palette = typographyPaletteRequirement(modeId, panel, spec, hasPanelText);
  const sharedSpec = [
    `Panel Type: ${panel.panelType || spec.panelType}`,
    `Size: ${spec.size}`,
    `Output: ${spec.output}`,
    `Style: ${spec.style}`,
    `Palette: ${palette}`,
    `Motif: ${motif}`,
    `Mood: ${spec.mood}`,
    `Panel Role: ${panel.role || "single greeting-card panel"}`
  ].join("\n");

  if (modeId === "mode-b-full-ai-typography") {
    if (!hasPanelText) {
      return {
        modeId,
        panelId: panel.id,
        renderTextDeterministically: false,
        prompt: [
          "You are generating a FINAL PRINT-READY GREETING CARD PANEL.",
          "This is NOT an artwork layer.",
          "This is NOT a background layer.",
          "Render the finished panel exactly as it should appear when printed.",
          "",
          "CARD SPECIFICATION",
          sharedSpec,
          "",
          "TEXT TO RENDER",
          "No card copy belongs on this panel.",
          "Do not render typography.",
          "Do not render words.",
          "Do not render letters.",
          "Do not render numbers.",
          "",
          "COMPOSITION REQUIREMENTS",
          panelCompositionRequirement(panel),
          "The panel must visually coordinate with the same deep charcoal, warm gold, ivory sunburst card system.",
          panel.id === "back"
            ? "The back cover should be mostly negative space with one small coordinating sunburst mark or border echo."
            : "Inside-left and inside-right should read as two halves of one opened interior spread.",
          "No labels.",
          "No captions.",
          "No stickers.",
          "No mockups.",
          "No folded card renderings.",
          "No physical paper textures.",
          "No stock-photo appearance.",
          "",
          "OUTPUT",
          "Return a final production-ready greeting card panel with no rendered text."
        ].join("\n"),
        negativePrompt:
          "readable text, words, letters, numbers, typography, handwriting, calligraphy, fake lettering, labels, captions, stickers, mockups, folded card renderings, physical paper texture, stock photo"
      };
    }
    return {
      modeId,
      panelId: panel.id,
      renderTextDeterministically: false,
      prompt: [
        "You are generating a FINAL PRINT-READY GREETING CARD PANEL.",
        "This is NOT an artwork layer.",
        "This is NOT a background layer.",
        "Render the finished panel exactly as it should appear when printed.",
        "All typography must be intentionally designed and correctly integrated into the composition.",
        "All text must be spelled exactly as provided.",
        "Do not invent substitute text.",
        "Do not invent placeholder text.",
        "Do not generate lorem ipsum.",
        "Do not generate extra words.",
        "Do not generate decorative fake lettering.",
        "The provided text is the source of truth.",
        "",
        "CARD SPECIFICATION",
        sharedSpec,
        "",
        "TEXT TO RENDER",
        "Headline:",
        panel.headline,
        "Body:",
        panel.body,
        "",
        "TYPOGRAPHY REQUIREMENTS",
        "The headline must be the primary visual element.",
        "The body must be clearly readable.",
        "Typography should be professionally typeset.",
        "Maintain generous margins.",
        "Avoid text collisions with artwork.",
        "Artwork should support the typography rather than compete with it.",
        "",
        "COMPOSITION REQUIREMENTS",
        "Create a unified composition where typography and illustration are designed together.",
        "The text should feel intentionally placed.",
        panelCompositionRequirement(panel),
        panelPairingInstruction(panel),
        "No separate text boxes.",
        "No labels.",
        "No captions.",
        "No stickers.",
        "No mockups.",
        "No folded card renderings.",
        "No physical paper textures.",
        "No stock-photo appearance.",
        "",
        "OUTPUT",
        "Return a final production-ready front cover design with all typography already rendered into the artwork."
      ].join("\n"),
      negativePrompt:
        "lorem ipsum, placeholder text, extra words, fake lettering, misspelled text, labels, captions, stickers, mockups, folded card renderings, physical paper texture, stock photo"
    };
  }

  const reserveInstruction =
    modeId === "mode-c-hybrid-reserved-layout" && hasPanelText
      ? [
          `Headline length: ${panel.headline.split(/\s+/).filter(Boolean).length} words.`,
          `Body length: ${countSentences(panel.body)} short sentence.`,
          "Reserve visual hierarchy accordingly with a large quiet headline area and a smaller readable body area.",
          "Text-safe field requirement: create one continuous opaque plain field for deterministic app typography.",
          "The field must read as solid matte paper or ink, with edge-only ornaments around it.",
          "Do not place sunburst rays, radial bursts, starbursts, borders, ornaments, bright marks, fake glyphs, circles, halos, medallions, or high-contrast details inside, around, or underneath the text-safe field.",
          "For this text-bearing panel, the center must be quiet and plain. Use only small outer-edge or corner sunburst echoes.",
          panel.modeCHint,
          panelPairingInstruction(panel)
        ].join("\n")
      : modeId === "mode-c-hybrid-reserved-layout"
        ? [
            "No card copy belongs on this panel.",
            "Reserve hierarchy for visual coordination only.",
            panel.id === "back"
              ? "Use mostly negative space plus one small coordinating back mark."
              : "Keep inside-left and inside-right visually paired as a cohesive opened spread.",
            panel.modeCHint || ""
          ].join("\n")
        : hasPanelText
          ? "Reserve calm central negative space for deterministic app-rendered typography."
          : [
              "No card copy belongs on this panel.",
              panel.id === "back"
                ? "Use mostly negative space plus one small coordinating back mark."
                : "Keep inside-left and inside-right visually paired as a cohesive opened spread."
            ].join("\n");

  return {
    modeId,
    panelId: panel.id,
    renderTextDeterministically: hasPanelText,
    prompt: [
      `Create one artwork-only 5x7 portrait ${panel.panelType || "greeting card"} panel for a premium greeting card.`,
      "This is an artwork layer, not a finished panel.",
      sharedSpec,
      reserveInstruction,
      panelCompositionRequirement(panel, modeId),
      modeId === "mode-a-current-overlay" && hasPanelText ? panelPairingInstruction(panel) : "",
      typographySystemInstruction(modeId, panel, hasPanelText),
      "Keep generous safe margins and a clear, uncluttered type-safe area.",
      "Do not render any words, letters, numbers, handwriting, calligraphy, labels, captions, logos, or fake decorative text.",
      "No mockups, no folded card rendering, no physical paper texture, no stock-photo appearance."
    ].join("\n"),
    negativePrompt: typographyNegativePrompt(modeId, panel)
  };
}

function typographyMotifRequirement(modeId, panel, spec, hasPanelText) {
  if (modeId !== "mode-c-hybrid-reserved-layout") return spec.motif;
  if (hasPanelText && panel?.id === "front") {
    return "edge-only warm-gold corner rays and thin border accents; no central radial sunburst, no halo, no medallion, no rays behind copy";
  }
  if (hasPanelText && (panel?.id === "inside-left" || panel?.id === "inside-right")) {
    return "quiet ivory interior stationery with thin gold border and tiny outer-edge sunburst echoes only; no central radial motif, no halo, no medallion";
  }
  if (panel?.id === "back") {
    return "mostly plain deep-charcoal back cover with one tiny lower-edge gold sun mark; no centered or full-panel radial burst";
  }
  return "edge-only warm-gold accents; no centered radial burst";
}

function typographyPaletteRequirement(modeId, panel, spec, hasPanelText) {
  if (modeId !== "mode-c-hybrid-reserved-layout") return spec.palette;
  if (hasPanelText && panel?.id === "front") {
    return "deep charcoal main field with warm gold and ivory accents kept outside the central text field";
  }
  if (hasPanelText && (panel?.id === "inside-left" || panel?.id === "inside-right")) {
    return "warm ivory main sheet with thin warm-gold border and tiny deep-charcoal outer-edge accents only; no full-width dark bands";
  }
  if (panel?.id === "back") {
    return "deep charcoal main field with one tiny warm-gold lower-edge mark only; no ivory panel, no cream wave, no large light area";
  }
  return spec.palette;
}

function typographySystemInstruction(modeId, panel, hasPanelText) {
  if (modeId === "mode-c-hybrid-reserved-layout" && hasPanelText) {
    return "Use the same deep charcoal, warm gold, ivory-accent card system with sunburst echoes only on outer edges or corners; keep every text field plain.";
  }
  if (modeId === "mode-c-hybrid-reserved-layout" && panel?.id === "back") {
    return "Use the same deep charcoal, warm gold, ivory-accent card system with only one small lower-edge sun mark on the back cover.";
  }
  return "Use the same deep charcoal, warm gold, ivory-accent sunburst card system across the folded card.";
}

function typographyNegativePrompt(modeId, panel) {
  const base =
    "readable text, words, letters, numbers, typography, handwriting, calligraphy, fake text, lorem ipsum, logo, watermark, labels, captions, stickers, mockups, folded card renderings, physical paper texture, stock photo";
  if (modeId !== "mode-c-hybrid-reserved-layout") return base;
  const shared =
    "central starburst behind text, sunburst rays behind text, busy center, dense ornament in text area, high contrast marks in text-safe field, full-page radial burst, centered radial burst, halo behind text, medallion behind text, ornament under typography, pattern under text-safe field, rays crossing center";
  if (panel?.id === "back") {
    return `${base}, large sunburst, full radial halo, full-page radial burst, rays across the whole panel, centered halo, busy back cover, ivory wave, cream lower half, large cream area, white panel`;
  }
  if (panel?.id === "inside-left" || panel?.id === "inside-right") {
    return `${base}, ${shared}, circle medallion under body copy, large motif behind headline, black top band, black bottom band, full-width dark band, split color-blocked interior`;
  }
  return `${base}, ${shared}, circle medallion under body copy, large motif behind headline`;
}

function panelCompositionRequirement(panel, modeId) {
  if (modeId === "mode-c-hybrid-reserved-layout") {
    if (panel?.id === "front") {
      return "Panel-specific composition: deep charcoal field, thin warm-gold border, small edge or corner rays only, and a plain central text-safe field; no central radial burst.";
    }
    if (panel?.id === "inside-left") {
      return "Panel-specific composition: warm ivory note-sheet field, thin gold border, tiny outer-left edge accent only, quiet plain center, paired with inside-right.";
    }
    if (panel?.id === "inside-right") {
      return "Panel-specific composition: warm ivory note-sheet field, thin gold border, tiny outer-right edge accent only, quiet plain center, paired with inside-left.";
    }
    if (panel?.id === "back") {
      return "Panel-specific composition: mostly deep charcoal negative space, thin gold border echo, one small lower-edge sun mark, no card copy.";
    }
  }
  return `Panel-specific composition: ${panel.composition || "coordinated premium greeting-card stationery"}.`;
}

function panelPairingInstruction(panel) {
  if (panel.id !== "inside-left" && panel.id !== "inside-right") return "";
  return "Keep inside-left and inside-right visually paired as a cohesive opened spread.";
}

function countSentences(value) {
  return Math.max(1, String(value || "").split(/[.!?]+/).filter((part) => part.trim()).length);
}

async function executeTypographyImageProvider({ image, panelId, prompt, negativePrompt, env, fetchImpl }) {
  if (image.adapterId === "browser-svg-renderer") {
    return buildTypographyPlaceholderSvgDataUrl({
      panelId,
      prompt,
      renderText: !negativePrompt.includes("readable text")
    });
  }

  if (image.adapterId === "deepai-text2img-image") {
    const body = new FormData();
    body.set("text", truncateText(negativePrompt ? `${prompt}\n\nAvoid: ${negativePrompt}.` : prompt, 2048));
    const response = await fetchWithProviderBackoff(
      fetchImpl,
      "https://api.deepai.org/api/text2img",
      {
        method: "POST",
        headers: { "api-key": requiredEnv(env, "DEEPAI_API_KEY") },
        body
      },
      { retries: 1, baseDelayMs: 1500, maxDelayMs: 5000 }
    );
    const contentType = response.headers?.get?.("content-type") ?? "";
    const data = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new Error(`DeepAI image provider returned ${response.status}: ${data?.err || data?.status || "request failed"}.`);
    }
    return materializeGeneratedImageUrl(extractImageUrl(data, contentType || "image/png"), fetchImpl);
  }

  if (image.adapterId === "cloudflare-workers-ai-image") {
    const accountId = requiredEnv(env, "CLOUDFLARE_ACCOUNT_ID");
    const token = env.CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN || requiredEnv(env, "CLOUDFLARE_API_TOKEN");
    const body = isCloudflareFluxModel(image.model)
      ? { prompt: truncateText(prompt, 2048), steps: 8 }
      : {
          prompt,
          negative_prompt: negativePrompt,
          width: 1464,
          height: 2048,
          guidance: 3.5,
          num_steps: 8,
          metadata: {
            customcard: {
              prompt_contract: "typography-experiment-folded-card-v2",
              panel_id: panelId,
              target_width: 1500,
              target_height: 2100,
              target_dpi: 300
            }
          }
        };
    const response = await fetchWithProviderBackoff(
      fetchImpl,
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${image.model}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(body)
      },
      { retries: 1, baseDelayMs: 1500, maxDelayMs: 5000 }
    );
    if (!response.ok) throw new Error(`Cloudflare image provider returned ${response.status}.`);
    const contentType = response.headers?.get?.("content-type") ?? "";
    if (contentType.startsWith("image/")) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return `data:${contentType};base64,${buffer.toString("base64")}`;
    }
    return materializeGeneratedImageUrl(extractImageUrl(await response.json(), contentType), fetchImpl);
  }

  if (image.adapterId === "openai-images") {
    const data = await postJson(fetchImpl, "https://api.openai.com/v1/images/generations", {
      headers: { authorization: `Bearer ${requiredEnv(env, "OPENAI_API_KEY")}` },
      body: { model: image.model, prompt, size: "1024x1536", n: 1 }
    });
    return materializeGeneratedImageUrl(extractImageUrl(data, "image/png"), fetchImpl);
  }

  if (image.adapterId === "google-gemini-image") {
    const model = encodeURIComponent(image.model);
    const data = await postJson(fetchImpl, `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`, {
      headers: { "x-goog-api-key": requiredEnv(env, "GOOGLE_GENERATIVE_AI_API_KEY") },
      body: {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["Image"],
          responseFormat: { image: { aspectRatio: "3:4", imageSize: "2K" } }
        }
      }
    });
    return materializeGeneratedImageUrl(extractImageUrl(data, "image/png"), fetchImpl);
  }

  throw new Error(`Image adapter ${image.adapterId} is configured but not executable in typography experiment yet.`);
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
  const layout = previewLayout(panelId, panelCopy.text_layout || panelCopy.textLayout);
  const frameOpacity = previewFrameOpacity(panelCopy, layout);
  const headline = wrapText(panelCopy.headline || "", layout.headlineChars).slice(0, 3);
  const body = wrapText(panelCopy.body || "", layout.bodyChars).slice(0, panelId.startsWith("inside") ? 8 : 4);
  const overlay = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100" viewBox="0 0 1500 2100">
      <rect x="88" y="88" width="1324" height="1924" rx="32" fill="none" stroke="${layout.frameColor}" stroke-width="8" opacity="${frameOpacity}"/>
      <text x="${layout.x}" y="${layout.headlineY}" text-anchor="${layout.anchor}" font-family="${layout.headlineFont}" fill="${layout.headlineColor}" font-size="${layout.headlineSize}" font-weight="700" paint-order="stroke fill" stroke="${layout.headlineStroke}" stroke-width="${layout.headlineStrokeWidth}">
        ${headline.map((line, index) => `<tspan x="${layout.x}" dy="${index === 0 ? 0 : layout.headlineSize * 1.08}">${escapeXml(line)}</tspan>`).join("")}
      </text>
      <text x="${layout.x}" y="${layout.bodyY}" text-anchor="${layout.anchor}" font-family="${layout.bodyFont}" fill="${layout.bodyColor}" font-size="${layout.bodySize}" font-weight="500" paint-order="stroke fill" stroke="${layout.bodyStroke}" stroke-width="${layout.bodyStrokeWidth}">
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

function previewFrameOpacity(panelCopy, layout) {
  const source = [
    panelCopy?.art_direction,
    panelCopy?.artDirection,
    panelCopy?.visual_cue,
    panelCopy?.visualCue,
    panelCopy?.image_prompt,
    panelCopy?.imagePrompt
  ].join(" ");
  if (/\b(?:sympathy|quiet support|open-edge gallery|flat gallery-style)\b/i.test(source)) return 0;
  return layout.frameOpacity ?? 0.72;
}

async function renderTypographyPreview({ imageBuffer, overlayText, panelCopy, modeId }) {
  const base = sharp(imageBuffer).resize(1500, 2100, { fit: "cover" });
  if (!overlayText) return base.png().toBuffer();
  if (modeId === "mode-c-hybrid-reserved-layout") {
    return base.composite([{ input: buildModeCTypographyOverlay(panelCopy) }]).png().toBuffer();
  }
  return base.composite([{ input: buildDefaultTypographyOverlay(panelCopy) }]).png().toBuffer();
}

function buildDefaultTypographyOverlay(panelCopy) {
  const headline = wrapText(panelCopy.headline, 18).slice(0, 3);
  const body = wrapText(panelCopy.body, 42).slice(0, 3);
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100" viewBox="0 0 1500 2100">
      <rect x="92" y="92" width="1316" height="1916" rx="24" fill="none" stroke="#d6aa45" stroke-width="8" opacity="0.62"/>
      <rect x="170" y="690" width="1160" height="590" rx="0" fill="#171717" opacity="0.18"/>
      <text x="750" y="850" text-anchor="middle" font-family="Georgia, Times New Roman, serif" fill="#f9edcf" font-size="124" font-weight="700">
        ${headline.map((line, index) => `<tspan x="750" dy="${index === 0 ? 0 : 134}">${escapeXml(line)}</tspan>`).join("")}
      </text>
      <text x="750" y="${930 + headline.length * 118}" text-anchor="middle" font-family="Inter, Arial, sans-serif" fill="#f5d889" font-size="42" font-weight="500">
        ${body.map((line, index) => `<tspan x="750" dy="${index === 0 ? 0 : 54}">${escapeXml(line)}</tspan>`).join("")}
      </text>
    </svg>
  `);
}

function buildModeCTypographyOverlay(panelCopy) {
  const layout = modeCTypographyOverlayLayout(panelCopy.id);
  const headline = wrapText(panelCopy.headline, layout.headlineChars).slice(0, layout.headlineLines);
  const body = wrapText(panelCopy.body, layout.bodyChars).slice(0, layout.bodyLines);
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100" viewBox="0 0 1500 2100">
      <rect x="92" y="92" width="1316" height="1916" rx="24" fill="none" stroke="${layout.frameColor}" stroke-width="8" opacity="${layout.frameOpacity}"/>
      <rect x="${layout.fieldX}" y="${layout.fieldY}" width="${layout.fieldWidth}" height="${layout.fieldHeight}" rx="${layout.fieldRadius}" fill="${layout.fieldFill}" opacity="${layout.fieldOpacity}"/>
      <text x="750" y="${layout.headlineY}" text-anchor="middle" font-family="${layout.headlineFont}" fill="${layout.headlineColor}" font-size="${layout.headlineSize}" font-weight="700" paint-order="stroke fill" stroke="${layout.headlineStroke}" stroke-width="${layout.headlineStrokeWidth}">
        ${headline.map((line, index) => `<tspan x="750" dy="${index === 0 ? 0 : layout.headlineDy}">${escapeXml(line)}</tspan>`).join("")}
      </text>
      <text x="750" y="${layout.bodyY}" text-anchor="middle" font-family="${layout.bodyFont}" fill="${layout.bodyColor}" font-size="${layout.bodySize}" font-weight="500" paint-order="stroke fill" stroke="${layout.bodyStroke}" stroke-width="${layout.bodyStrokeWidth}">
        ${body.map((line, index) => `<tspan x="750" dy="${index === 0 ? 0 : layout.bodyDy}">${escapeXml(line)}</tspan>`).join("")}
      </text>
    </svg>
  `);
}

function modeCTypographyOverlayLayout(panelId) {
  if (panelId === "front") {
    return {
      fieldX: 120,
      fieldY: 610,
      fieldWidth: 1260,
      fieldHeight: 690,
      fieldRadius: 0,
      fieldFill: "#111715",
      fieldOpacity: 1,
      frameColor: "#d6aa45",
      frameOpacity: 0.72,
      headlineY: 830,
      headlineSize: 112,
      headlineDy: 124,
      headlineChars: 18,
      headlineLines: 3,
      headlineFont: "Georgia, Times New Roman, serif",
      headlineColor: "#fff7df",
      headlineStroke: "#111715",
      headlineStrokeWidth: 6,
      bodyY: 1080,
      bodySize: 44,
      bodyDy: 58,
      bodyChars: 42,
      bodyLines: 3,
      bodyFont: "Inter, Arial, sans-serif",
      bodyColor: "#f4d77d",
      bodyStroke: "#111715",
      bodyStrokeWidth: 3
    };
  }
  return {
    fieldX: 120,
    fieldY: panelId === "inside-right" ? 390 : 430,
    fieldWidth: 1260,
    fieldHeight: panelId === "inside-right" ? 880 : 800,
    fieldRadius: 0,
    fieldFill: "#fff6df",
    fieldOpacity: 1,
    frameColor: "#d6aa45",
    frameOpacity: 0.68,
    headlineY: panelId === "inside-right" ? 650 : 680,
    headlineSize: panelId === "inside-right" ? 84 : 96,
    headlineDy: panelId === "inside-right" ? 96 : 106,
    headlineChars: panelId === "inside-right" ? 22 : 24,
    headlineLines: 3,
    headlineFont: "Georgia, Times New Roman, serif",
    headlineColor: "#282923",
    headlineStroke: "#fff6df",
    headlineStrokeWidth: 2,
    bodyY: panelId === "inside-right" ? 900 : 900,
    bodySize: panelId === "inside-right" ? 42 : 42,
    bodyDy: 56,
    bodyChars: panelId === "inside-right" ? 48 : 44,
    bodyLines: 4,
    bodyFont: "Inter, Arial, sans-serif",
    bodyColor: "#4f432a",
    bodyStroke: "#fff6df",
    bodyStrokeWidth: 1
  };
}

function previewLayout(panelId, rawTextLayout) {
  const base = (() => {
    if (panelId === "front") {
      return {
      headlineY: 1360,
      bodyY: 1535,
      headlineSize: 82,
      bodySize: 38,
      headlineChars: 24,
      bodyChars: 44,
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
      headlineChars: 30,
      bodyChars: 46,
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
    headlineChars: 30,
    bodyChars: 44,
    headlineColor: "#25302b",
    bodyColor: "#3f4c45",
    frameColor: "#c49b42"
    };
  })();
  return applyPreviewTextLayout(base, rawTextLayout);
}

function applyPreviewTextLayout(base, rawTextLayout) {
  const layout = normalizePreviewTextLayout(rawTextLayout);
  const shared = {
    ...base,
    x: 750,
    anchor: "middle",
    headlineFont: "Georgia, Times New Roman, serif",
    bodyFont: "Inter, Arial, sans-serif",
    headlineStroke: "#f7f3ea",
    bodyStroke: "#f7f3ea",
    headlineStrokeWidth: 0,
    bodyStrokeWidth: 0
  };
  if (!layout) return shared;
  const scale = layout.scale === "compact" ? 0.86 : layout.scale === "large" ? 1.14 : 1;
  const font = layout.font_pairing === "bold-editorial"
    ? { headlineFont: "Inter, Arial, sans-serif", bodyFont: "Inter, Arial, sans-serif", headlineSize: 124, bodySize: 48, headlineChars: 16, bodyChars: 32 }
    : layout.font_pairing === "minimal-sans"
      ? { headlineFont: "Inter, Arial, sans-serif", bodyFont: "Inter, Arial, sans-serif", headlineSize: 78, bodySize: 42, headlineChars: 28, bodyChars: 42 }
      : layout.font_pairing === "soft-serif"
        ? { headlineFont: "Georgia, Times New Roman, serif", bodyFont: "Georgia, Times New Roman, serif", headlineSize: 90, bodySize: 48, headlineChars: 24, bodyChars: 34 }
        : { headlineFont: "Georgia, Times New Roman, serif", bodyFont: "Inter, Arial, sans-serif", headlineSize: 92, bodySize: 46, headlineChars: 24, bodyChars: 36 };
  const headlineColor = layout.color_mode === "light-ink" || layout.color_mode === "high-contrast" ? "#fff8dc" : layout.color_mode === "accent-ink" ? base.frameColor : base.headlineColor;
  const bodyColor = layout.color_mode === "light-ink" || layout.color_mode === "high-contrast" ? "#f4e6b0" : base.bodyColor;
  const lightInk = layout.color_mode === "light-ink" || layout.color_mode === "high-contrast";
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
    headlineColor,
    bodyColor,
    headlineStroke: lightInk ? "#1e2f2a" : "#fffaf0",
    bodyStroke: lightInk ? "#1e2f2a" : "#fffaf0",
    headlineStrokeWidth: lightInk ? 5 : 3,
    bodyStrokeWidth: lightInk ? 3 : 2
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

async function renderContactSheet({ runDir, run, panelFiles }) {
  if (panelFiles.length === 0) return undefined;
  const thumbWidth = 420;
  const thumbHeight = 588;
  const labelHeight = 92;
  const gap = 28;
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

function typographyAutoChecks({ promptPlans, providerCalls, decodedFiles }) {
  const plans = Array.isArray(promptPlans) ? promptPlans : [];
  const decoded = Array.isArray(decodedFiles) ? decodedFiles : [];
  const backPlan = plans.find((plan) => plan.panelId === "back");
  const insideLeftPlan = plans.find((plan) => plan.panelId === "inside-left");
  const insideRightPlan = plans.find((plan) => plan.panelId === "inside-right");
  const copyPlans = plans.filter((plan) => panelHasBenchmarkCopy(plan.panelId));
  const copyPlansExactTextInPrompt = copyPlans.every((plan) => promptContainsPanelCopy(plan));
  const copyPlansSuppressExactText = copyPlans.every((plan) => !promptContainsPanelCopy(plan));
  const backSuppressesAllCopy = Boolean(backPlan) &&
    typographyBenchmarkCopyPanels().every((panel) => !promptContainsCopy(backPlan.prompt, panel)) &&
    /No card copy belongs on this panel/i.test(backPlan.prompt);
  return {
    advisoryOnly: true,
    checks: {
      fourPanels: plans.length === 4 && decoded.length === 4,
      panelIds: plans.map((plan) => plan.panelId),
      providerCalls: providerCalls.length,
      materializedImages: decoded.length,
      allPanelsMaterialized: decoded.length === 4 && decoded.every((file) => Boolean(file?.buffer?.length)),
      deterministicTextOverlayPanels: plans
        .filter((plan) => plan.renderTextDeterministically)
        .map((plan) => plan.panelId),
      copyPanelIds: copyPlans.map((plan) => plan.panelId),
      copyPanelsExactTextInPrompt: copyPlansExactTextInPrompt,
      copyPanelsTextSuppressedInPrompt: copyPlansSuppressExactText,
      backHasNoTextContract: backSuppressesAllCopy,
      insideSpreadCohesionPrompted:
        Boolean(insideLeftPlan && insideRightPlan) &&
        /cohesive opened spread|paired as a cohesive opened spread|two halves of one opened interior spread/i.test(insideLeftPlan.prompt) &&
        /cohesive opened spread|paired as a cohesive opened spread|two halves of one opened interior spread/i.test(insideRightPlan.prompt),
      noTextPanelsSuppressText: [backPlan].filter(Boolean).every((plan) => backSuppressesAllCopy && plan.negativePrompt.includes("readable text"))
    },
    note:
      "Automated checks only prove prompt contract and image materialization. Front/interior typography, back no-text discipline, and inside-spread cohesion require visual inspection."
  };
}

function panelHasBenchmarkCopy(panelId) {
  const panel = typographyExperimentSpec.panels?.[panelId];
  return Boolean(panel?.headline && panel?.body);
}

function typographyBenchmarkCopyPanels() {
  return typographyPanelOrder
    .map((panelId) => typographyExperimentSpec.panels?.[panelId])
    .filter((panel) => panel?.headline && panel?.body);
}

function promptContainsPanelCopy(promptPlan) {
  const panel = typographyExperimentSpec.panels?.[promptPlan.panelId];
  return promptContainsCopy(promptPlan.prompt, panel);
}

function promptContainsCopy(prompt, panel) {
  return Boolean(panel?.headline && panel?.body && prompt.includes(panel.headline) && prompt.includes(panel.body));
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
    imageModel: run.image.model,
    typographyModeId: run.typographyMode?.id,
    typographyModeLabel: run.typographyMode?.label,
    typographyStrategy: run.typographyMode?.strategy
  };
}

function buildManualGradeTemplate(result, run) {
  return [
    `# Manual Grade: ${run.storyId}`,
    "",
    `- Text: ${run.text.label} (${run.text.model || run.text.adapterId})`,
    `- Image: ${run.image.label} (${run.image.model || run.image.adapterId})`,
    `- Pipeline: full card generation service (${run.phase})`,
    `- User story: ${run.story.customer_type}; ${run.story.occasion}; memory load ${run.story.memory_load}`,
    `- Contact sheet: ${result.contactSheet ? `[open](./${basename(result.contactSheet)})` : "missing"}`,
    "",
    "## User Input",
    "",
    `- Sender: ${run.story.request.sender}`,
    `- Recipient: ${run.story.request.recipient}`,
    `- Relationship: ${run.story.request.relationship}`,
    `- Brief: ${run.story.request.personal_note}`,
    `- Must include: ${run.story.must_include.join(", ")}`,
    `- Must avoid: ${run.story.must_avoid.join(", ")}`,
    "",
    "## Rubric",
    "",
    "- Product quality score /100:",
    "- Prompt/pipeline contract score /100:",
    "- Tier:",
    "- Dimension scores:",
    "  - Prompt adherence and panel contract /15:",
    "  - Occasion and user-story fit /15:",
    "  - Copy quality and emotional calibration /15:",
    "  - Visual composition and print readiness /15:",
    "  - Theme coherence across panels /10:",
    "  - Text/name fidelity strategy /10:",
    "  - Domain/cultural sensitivity /10:",
    "  - Commercial usefulness /5:",
    "  - Originality and taste /5:",
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

function buildTypographyManualGradeTemplate(result, run, promptPlans) {
  const deterministicPanels = (Array.isArray(promptPlans) ? promptPlans : [])
    .filter((plan) => plan.renderTextDeterministically)
    .map((plan) => plan.panelId);
  return [
    `# Manual Grade: ${run.typographyMode.label}`,
    "",
    `- Image: ${run.image.label} (${run.image.model || run.image.adapterId})`,
    `- Strategy: ${run.typographyMode.strategy}`,
    `- Panels: ${result.panelCount}`,
    `- Text rendered deterministically on: ${deterministicPanels.join(", ") || "none"}`,
    `- Contact sheet: ${result.contactSheet ? `[open](./${basename(result.contactSheet)})` : "missing"}`,
    "",
    "## Rubric",
    "",
    "- Total score /100:",
    "- Tier:",
    "- Four-panel prompt adherence and panel contract /10:",
    "- Front exact text and typography /20:",
    "- Inside-left/right exact text and readability /20:",
    "- Inside-left/right visual cohesion as an opened spread /15:",
    "- Back no-text discipline and coordinating mark /10:",
    "- Overall folded-card theme coherence /10:",
    "- Print readiness and margins /15:",
    "- Blocking failures:",
    "- Smallest prompt/config fix:",
    "- Production recommendation:",
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

export function buildPhaseReadme(summary) {
  const lines = [`# Model Benchmark ${summary.phase}`, "", `Created: ${summary.createdAtIso}`, "", "| Run | Status | Panels | Contact sheet |", "| --- | --- | --- | --- |"];
  for (const run of summary.runs) {
    const status = benchmarkRunStatus(run);
    const contact = run.contactSheet ? `[open](${relativeEvidenceLink(run.contactSheet, summary.outputDir)})` : "n/a";
    lines.push(`| ${benchmarkRunLabel(run)} | ${status} | ${run.panelCount || 0} | ${contact} |`);
  }
  lines.push("");
  return lines.join("\n");
}

function benchmarkRunStatus(run) {
  if (run.status) return run.status;
  if (run.error) return "failed";
  if (run.statusCode !== undefined) return run.statusCode === 200 ? "ok" : `status ${run.statusCode}`;
  if ((run.panelCount || 0) > 0) return "ok";
  return "unknown";
}

function benchmarkRunLabel(run) {
  if (run.typographyModeLabel) return `${run.storyId} / ${run.typographyModeLabel} / ${run.imageCandidateId}`;
  return `${run.storyId} / ${run.textCandidateId} / ${run.imageCandidateId}`;
}

function relativeEvidenceLink(filePath, outputDir) {
  const normalizedPath = String(filePath || "").replaceAll("\\", "/");
  const normalizedOutputDir = String(outputDir || "").replaceAll("\\", "/").replace(/\/$/, "");
  if (normalizedOutputDir && normalizedPath.startsWith(`${normalizedOutputDir}/`)) {
    return normalizedPath.slice(normalizedOutputDir.length + 1);
  }
  return normalizedPath;
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

async function postJson(fetchImpl, url, { headers = {}, body }) {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}.`);
  const data = await response.json();
  if (data?.success === false) throw new Error(data?.errors?.[0]?.message || "AI provider rejected the request.");
  return data;
}

async function fetchWithProviderBackoff(fetchImpl, url, options, { retries = 0, baseDelayMs = 1000, maxDelayMs = 5000 } = {}) {
  const retryCount = Math.max(0, Number(retries) || 0);
  let response;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    response = await fetchImpl(url, options);
    if (!isRetryableProviderStatus(response.status) || attempt >= retryCount) return response;
    await sleep(providerBackoffDelayMs(response, attempt, baseDelayMs, maxDelayMs));
  }
  return response;
}

function isRetryableProviderStatus(status) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function providerBackoffDelayMs(response, attempt, baseDelayMs, maxDelayMs) {
  const retryAfter = response.headers?.get?.("retry-after");
  const retryAfterSeconds = retryAfter === undefined || retryAfter === null ? NaN : Number(retryAfter);
  const retryAfterMs =
    Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0 ? retryAfterSeconds * 1000 : undefined;
  const fallbackMs = Math.max(0, Number(baseDelayMs) || 0) * 2 ** Math.max(0, attempt);
  return Math.min(Math.max(0, Number(maxDelayMs) || 0), retryAfterMs ?? fallbackMs);
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, Math.max(0, Number(ms) || 0)));
}

function extractImageUrl(data, contentType) {
  const inlineImage = extractInlineImage(data);
  const image =
    data?.result?.image_url ??
    data?.result?.url ??
    data?.output_url ??
    data?.image_url ??
    data?.url ??
    data?.data?.[0]?.url ??
    data?.data?.[0]?.b64_json ??
    data?.output?.[0] ??
    data?.result?.image ??
    data?.image ??
    inlineImage?.data;
  if (!image) throw new Error("AI image provider response did not contain an image.");
  if (String(image).startsWith("http") || String(image).startsWith("data:")) return String(image);
  return `data:${inferImageContentType(image, inlineImage?.mimeType || contentType)};base64,${image}`;
}

async function materializeGeneratedImageUrl(imageUrl, fetchImpl) {
  const value = String(imageUrl);
  if (!/^https?:\/\//i.test(value)) return value;
  const response = await fetchImpl(value, { method: "GET" });
  if (!response.ok) throw new Error(`Generated image URL fetch failed with ${response.status}.`);
  const contentType = response.headers?.get?.("content-type") || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

function extractInlineImage(data) {
  const parts = data?.candidates?.[0]?.content?.parts ?? data?.parts ?? [];
  const part = parts.find((candidate) => candidate?.inlineData?.data || candidate?.inline_data?.data);
  const inline = part?.inlineData ?? part?.inline_data;
  if (!inline?.data) return undefined;
  return {
    data: inline.data,
    mimeType: inline.mimeType || inline.mime_type
  };
}

function inferImageContentType(image, contentType) {
  if (contentType && contentType.startsWith("image/")) return contentType;
  const text = String(image);
  if (text.startsWith("/9j/")) return "image/jpeg";
  if (text.startsWith("iVBOR")) return "image/png";
  if (text.startsWith("UklGR")) return "image/webp";
  return "image/png";
}

function requiredEnv(env, key) {
  const value = env[key];
  if (!value || ["disabled", "example", "replace-me", "changeme", "dummy", "fake"].includes(String(value).trim().toLowerCase())) {
    throw new Error(`Missing required provider env: ${key}`);
  }
  return String(value).trim();
}

function isCloudflareFluxModel(model) {
  return String(model || "").includes("/flux-1-schnell");
}

function buildTypographyPlaceholderSvgDataUrl({ panelId = "front", prompt, renderText }) {
  const showText = panelId === "front" && renderText && prompt.includes(typographyExperimentSpec.headline);
  const text = showText
    ? `<text x="750" y="900" text-anchor="middle" font-family="Georgia" font-size="112" fill="#f9edcf">${escapeXml(typographyExperimentSpec.headline)}</text>
       <text x="750" y="1035" text-anchor="middle" font-family="Arial" font-size="44" fill="#f5d889">${escapeXml(typographyExperimentSpec.body)}</text>`
    : "";
  const background = panelId.startsWith("inside") ? "#fff9ec" : "#171717";
  const borderColor = panelId.startsWith("inside") ? "#caa24f" : "#d6aa45";
  const mark = panelId === "back"
    ? '<g opacity="0.9"><circle cx="750" cy="1570" r="54" fill="#e0aa35"/><path d="M750 1490 V1650 M670 1570 H830 M694 1514 L806 1626 M806 1514 L694 1626" stroke="#fff4d7" stroke-width="8"/></g>'
    : panelId.startsWith("inside")
      ? `<g opacity="0.55"><path d="${panelId === "inside-left" ? "M80 350 C260 460 300 690 120 860" : "M1420 350 C1240 460 1200 690 1380 860"}" fill="none" stroke="#d6aa45" stroke-width="18"/><circle cx="${panelId === "inside-left" ? 160 : 1340}" cy="420" r="46" fill="#e0aa35"/></g>`
      : "";
  const rays = Array.from({ length: 40 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 40;
    const x = 750 + Math.cos(angle) * 760;
    const y = 1050 + Math.sin(angle) * 760;
    return `<line x1="750" y1="1050" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#d6aa45" stroke-width="18" opacity="0.18"/>`;
  }).join("");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100" viewBox="0 0 1500 2100">
      <rect width="1500" height="2100" fill="${background}"/>
      ${panelId === "front" ? rays : ""}
      ${panelId === "front" ? '<circle cx="750" cy="1050" r="560" fill="none" stroke="#d6aa45" stroke-width="10" opacity="0.42"/>' : mark}
      <rect x="92" y="92" width="1316" height="1916" rx="24" fill="none" stroke="${borderColor}" stroke-width="8" opacity="0.62"/>
      ${text}
    </svg>
  `;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
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

export function sanitizeBenchmarkValue(value, env) {
  if (value === undefined) return undefined;
  let serialized = JSON.stringify(value, null, 2);
  if (serialized === undefined) return undefined;
  for (const secret of redactionSecretsFromEnv(env)) {
    serialized = serialized.split(secret).join("[redacted]");
  }
  return JSON.parse(serialized);
}

function sanitize(value, env) {
  return sanitizeBenchmarkValue(value, env);
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
  for (const secret of redactionSecretsFromEnv(env)) {
    redacted = redacted.split(secret).join("[redacted]");
  }
  return redacted;
}

function redactionSecretsFromEnv(env) {
  return Object.entries(env || {})
    .filter(([key, value]) => isRedactableEnvKey(key) && isRedactableEnvValue(value))
    .map(([, value]) => String(value));
}

function isRedactableEnvKey(key) {
  const normalized = String(key || "").toUpperCase();
  return (
    normalized === "CLOUDFLARE_ACCOUNT_ID" ||
    /(API[_-]?KEY|TOKEN|SECRET|PASSWORD|PRIVATE|ACCESS[_-]?KEY|AUTHORIZATION|SESSION|COOKIE|CREDENTIAL|CLIENT_SECRET|WEBHOOK_SECRET|SIGNING_SECRET)$/.test(
      normalized
    )
  );
}

function isRedactableEnvValue(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  if (normalized.length < 8) return false;
  return !commonNonSecretEnvValues.has(normalized.toLowerCase());
}


function isSafeConfiguredKey(key) {
  return /^(CUSTOMCARD_AI_|CLOUDFLARE_|GOOGLE_|GEMINI_|HUGGINGFACE_|DEEPAI_|OPENAI_|ANTHROPIC_)/.test(key);
}

function textContains(value, term) {
  return String(value || "").toLowerCase().includes(String(term || "").toLowerCase());
}

function truncateText(value, maxLength) {
  const text = String(value ?? "");
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength);
  const wordSafe = clipped.replace(/\s+\S*$/, "").trimEnd();
  return wordSafe.length >= Math.floor(maxLength * 0.82) ? wordSafe : clipped;
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
