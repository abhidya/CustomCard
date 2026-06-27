import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import ts from "typescript";

const repoRoot = resolve(import.meta.dirname, "..");
const storyThemesPath = resolve(repoRoot, "webapp/storyThemes.ts");
const tempModulePath = resolve(repoRoot, ".codex/tmp/storyThemes.generated.mjs");
const outputRoot = resolve(repoRoot, "public/generated/story-proofs");
const panelIds = ["front", "inside-left", "inside-right", "back"];
const panelAssetKeys = {
  front: "front",
  "inside-left": "insideLeft",
  "inside-right": "insideRight",
  back: "back"
};

if (isCliEntrypoint()) {
  await main();
}

async function main() {
  const stories = await loadStoryThemeCards();
  const results = [];
  for (const story of stories) {
    const storyDir = resolve(outputRoot, story.id);
    mkdirSync(storyDir, { recursive: true });
    const background = await readPublicAsset(story.imageUrl);
    const panelBuffers = {};

    for (const panelId of panelIds) {
      const svg = buildProofPanelSvg(story, panelId, background.dataUri);
      const outputPath = resolve(repoRoot, `public${story.proof.assets[panelAssetKeys[panelId]]}`);
      const buffer = await sharp(Buffer.from(svg)).resize(900, 1260, { fit: "cover" }).webp({ quality: 88, effort: 4 }).toBuffer();
      writeBinary(outputPath, buffer);
      panelBuffers[panelId] = buffer;
      results.push({ storyId: story.id, panelId, outputPath: relativePath(outputPath), bytes: buffer.length });
    }

    const contactSheet = await buildContactSheet(story, panelBuffers);
    const contactSheetPath = resolve(repoRoot, `public${story.proof.assets.contactSheet}`);
    writeBinary(contactSheetPath, contactSheet);
    results.push({ storyId: story.id, panelId: "contact-sheet", outputPath: relativePath(contactSheetPath), bytes: contactSheet.length });
  }

  const manifestPath = resolve(outputRoot, "manifest.json");
  writeJson(manifestPath, {
    service: "customcard-story-proof-assets",
    status: "generated",
    storyCount: stories.length,
    panelCount: results.length,
    results
  });
  console.log(JSON.stringify({ status: "ok", storyCount: stories.length, panelCount: results.length }, null, 2));
}

async function loadStoryThemeCards() {
  const source = readFileSync(storyThemesPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove
    }
  }).outputText;
  mkdirSync(dirname(tempModulePath), { recursive: true });
  writeFileSync(tempModulePath, output, "utf8");
  const module = await import(`${pathToFileURL(tempModulePath).href}?cache=${Date.now()}`);
  return module.storyThemeCards;
}

function buildProofPanelSvg(story, panelId, imageDataUri) {
  const panel = story.proof.panels[panelId];
  if (!panel) throw new Error(`Story ${story.id} is missing proof panel ${panelId}`);
  if (panelId === "front") return buildFrontSvg(story, panel, imageDataUri);
  if (panelId === "back") return buildBackSvg(story, panel, imageDataUri);
  return buildInsideSvg(story, panel, panelId, imageDataUri);
}

function buildFrontSvg(story, panel, imageDataUri) {
  const accent = accentFor(story);
  const headlineLines = wrapText(panel.headline, story.styleId === "bold-type" ? 18 : 20).slice(0, 4);
  const bodyLines = wrapText(panel.body, 36).slice(0, 4);
  const headlineSize = story.styleId === "bold-type" ? 92 : 104;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100" viewBox="0 0 1500 2100">
  <rect width="1500" height="2100" fill="#f8f2e7"/>
  <image href="${imageDataUri}" x="0" y="0" width="1500" height="2100" preserveAspectRatio="xMidYMid slice"/>
  <rect width="1500" height="2100" fill="#101713" opacity="0.12"/>
  <rect x="150" y="520" width="1200" height="940" rx="64" fill="#fff7e8" opacity="0.93"/>
  <rect x="178" y="548" width="1144" height="884" rx="46" fill="none" stroke="${accent}" stroke-width="8" opacity="0.36"/>
  <text x="750" y="748" text-anchor="middle" fill="#111a16" font-family="Georgia, Times New Roman, serif" font-size="${headlineSize}" font-weight="700">
${headlineLines.map((line, index) => `    <tspan x="750" dy="${index === 0 ? 0 : Math.round(headlineSize * 1.08)}">${escapeXml(line)}</tspan>`).join("\n")}
  </text>
  <text x="750" y="${headlineLines.length > 2 ? 1190 : 1080}" text-anchor="middle" fill="#274134" font-family="Arial, sans-serif" font-size="52" font-weight="600">
${bodyLines.map((line, index) => `    <tspan x="750" dy="${index === 0 ? 0 : 68}">${escapeXml(line)}</tspan>`).join("\n")}
  </text>
  <text x="750" y="1324" text-anchor="middle" fill="${accent}" font-family="Arial, sans-serif" font-size="30" font-weight="800" letter-spacing="4">${escapeXml(story.tag.toUpperCase())}</text>
</svg>`;
}

function buildInsideSvg(story, panel, panelId, imageDataUri) {
  const accent = accentFor(story);
  const artX = panelId === "inside-left" ? 0 : 1010;
  const textX = panelId === "inside-left" ? 900 : 600;
  const align = panelId === "inside-left" ? "end" : "start";
  const headlineLines = wrapText(panel.headline, 20).slice(0, 3);
  const bodyLines = wrapText(panel.body, 40).slice(0, 9);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100" viewBox="0 0 1500 2100">
  <rect width="1500" height="2100" fill="#fbf7ef"/>
  <rect x="82" y="82" width="1336" height="1936" rx="44" fill="none" stroke="#ded2c2" stroke-width="5"/>
  <clipPath id="art-strip"><rect x="${artX}" y="0" width="490" height="2100" rx="0"/></clipPath>
  <image href="${imageDataUri}" x="${artX - 500}" y="0" width="1500" height="2100" preserveAspectRatio="xMidYMid slice" clip-path="url(#art-strip)" opacity="0.9"/>
  <rect x="${artX}" y="0" width="490" height="2100" fill="${accent}" opacity="0.14"/>
  <path d="${panelId === "inside-left" ? "M504 0 C420 540 566 960 474 1510 C448 1666 430 1860 510 2100" : "M996 0 C1080 540 934 960 1026 1510 C1052 1666 1070 1860 990 2100"}" fill="none" stroke="${accent}" stroke-width="18" opacity="0.28"/>
  <text x="${textX}" y="388" text-anchor="${align}" fill="${accent}" font-family="Arial, sans-serif" font-size="32" font-weight="800" letter-spacing="4">${escapeXml(story.occasion.toUpperCase())}</text>
  <text x="${textX}" y="560" text-anchor="${align}" fill="#131916" font-family="Georgia, Times New Roman, serif" font-size="82" font-weight="700">
${headlineLines.map((line, index) => `    <tspan x="${textX}" dy="${index === 0 ? 0 : 92}">${escapeXml(line)}</tspan>`).join("\n")}
  </text>
  <text x="${textX}" y="${760 + headlineLines.length * 70}" text-anchor="${align}" fill="#263b33" font-family="Arial, sans-serif" font-size="48" font-weight="500">
${bodyLines.map((line, index) => `    <tspan x="${textX}" dy="${index === 0 ? 0 : 66}">${escapeXml(line)}</tspan>`).join("\n")}
  </text>
</svg>`;
}

function buildBackSvg(story, panel, imageDataUri) {
  const accent = accentFor(story);
  const bodyLines = wrapText(panel.body, 34).slice(0, 5);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100" viewBox="0 0 1500 2100">
  <rect width="1500" height="2100" fill="#f2efe8"/>
  <image href="${imageDataUri}" x="930" y="1280" width="430" height="602" preserveAspectRatio="xMidYMid slice" opacity="0.48"/>
  <rect x="930" y="1280" width="430" height="602" rx="22" fill="none" stroke="#ffffff" stroke-width="20" opacity="0.8"/>
  <circle cx="750" cy="550" r="92" fill="${accent}" opacity="0.14"/>
  <circle cx="750" cy="550" r="48" fill="${accent}" opacity="0.8"/>
  <text x="750" y="780" text-anchor="middle" fill="#121916" font-family="Georgia, Times New Roman, serif" font-size="72" font-weight="700">${escapeXml(panel.headline)}</text>
  <text x="750" y="910" text-anchor="middle" fill="#33463e" font-family="Arial, sans-serif" font-size="42" font-weight="500">
${bodyLines.map((line, index) => `    <tspan x="750" dy="${index === 0 ? 0 : 58}">${escapeXml(line)}</tspan>`).join("\n")}
  </text>
  <text x="750" y="1778" text-anchor="middle" fill="${accent}" font-family="Arial, sans-serif" font-size="34" font-weight="800" letter-spacing="5">CUSTOMCARD</text>
  <text x="750" y="1840" text-anchor="middle" fill="#5d675f" font-family="Arial, sans-serif" font-size="26" font-weight="500">reviewed words, print-ready panels</text>
</svg>`;
}

async function buildContactSheet(story, panelBuffers) {
  const width = 1600;
  const height = 1120;
  const thumbWidth = 330;
  const thumbHeight = 462;
  const labels = {
    front: "Front",
    "inside-left": "Inside left",
    "inside-right": "Inside right",
    back: "Back"
  };
  const composites = [];
  const positions = {
    front: { left: 140, top: 170 },
    "inside-left": { left: 510, top: 170 },
    "inside-right": { left: 880, top: 170 },
    back: { left: 1250, top: 170 }
  };

  for (const panelId of panelIds) {
    const image = await sharp(panelBuffers[panelId]).resize(thumbWidth, thumbHeight, { fit: "cover" }).png().toBuffer();
    const { left, top } = positions[panelId];
    composites.push({ input: image, left, top });
    composites.push({ input: Buffer.from(labelSvg(labels[panelId], thumbWidth)), left, top: top + thumbHeight + 28 });
  }

  const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f7f2e9"/>
  <rect x="58" y="58" width="${width - 116}" height="${height - 116}" rx="42" fill="#fffaf1" stroke="#ded2c2" stroke-width="4"/>
  <text x="92" y="118" fill="#13704c" font-family="Arial, sans-serif" font-size="28" font-weight="800" letter-spacing="4">${escapeXml(story.tag.toUpperCase())}</text>
  <text x="92" y="976" fill="#121916" font-family="Georgia, Times New Roman, serif" font-size="54" font-weight="700">${escapeXml(story.title)}</text>
  <text x="92" y="1036" fill="#4c5b53" font-family="Arial, sans-serif" font-size="28" font-weight="500">${escapeXml(story.memoryObject)}</text>
</svg>`;

  return sharp(Buffer.from(baseSvg))
    .composite(composites)
    .webp({ quality: 88, effort: 4 })
    .toBuffer();
}

function labelSvg(label, width) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="42" viewBox="0 0 ${width} 42">
  <text x="${width / 2}" y="30" text-anchor="middle" fill="#415149" font-family="Arial, sans-serif" font-size="26" font-weight="800">${escapeXml(label)}</text>
</svg>`;
}

async function readPublicAsset(url) {
  if (!url.startsWith("/generated/")) throw new Error(`Expected generated asset URL, got ${url}`);
  const filePath = resolve(repoRoot, `public${url}`);
  const buffer = readFileSync(filePath);
  const pngBuffer = await sharp(buffer).resize(1500, 2100, { fit: "cover" }).png().toBuffer();
  return { buffer: pngBuffer, dataUri: `data:image/png;base64,${pngBuffer.toString("base64")}` };
}

function wrapText(value, maxChars) {
  const words = String(value || "").split(/\s+/).filter(Boolean);
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
  return lines.length ? lines : [String(value || "")];
}

function accentFor(story) {
  if (story.styleId === "bold-type") return "#dc5f45";
  if (story.category === "business") return "#0f6b64";
  if (story.category === "graduation") return "#3457a8";
  if (story.category === "anniversary") return "#8f3d4f";
  if (story.category === "congratulations") return "#9a6a2b";
  if (story.category === "thank-you") return "#1d7a5c";
  return "#13704c";
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function writeBinary(filePath, buffer) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, buffer);
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function relativePath(filePath) {
  return relative(repoRoot, filePath).replaceAll("\\", "/");
}

function isCliEntrypoint() {
  return Boolean(process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href);
}
