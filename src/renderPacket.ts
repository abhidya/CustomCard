import { renderPacketFileName, renderPacketTarget } from "./renderPacketContract";
import type { CardPanel, VisualStyle } from "./cardDraft";

/**
 * Recipient-facing print artwork. Art direction/design notes never render here —
 * they live in the manifest metadata and admin surfaces only.
 * Each visual style produces a structurally distinct panel layout.
 */
export function buildPanelSvg(panel: CardPanel): string {
  const styleId: VisualStyle = panel.styleId ?? "botanical";
  const accent = panel.id === "inside-right" ? "#c8553d" : panel.id === "inside-left" ? "#258477" : "#315b7d";
  const direction = panel.rtl ? "rtl" : "ltr";
  const anchor = panel.rtl ? "end" : "start";
  const x = panel.rtl ? 1240 : 260;
  const headlineLines = wrapSvgText(panel.headline, styleId === "bold-type" ? 14 : 24).slice(0, 3);
  const bodyLines = wrapSvgText(panel.body, 34).slice(0, 8);
  const layout = styleLayouts[styleId];
  const artworkLayer = panel.imageUrl ? buildArtworkLayer(panel.imageUrl) : layout.decoration(panel, accent);
  const textFill = panel.imageUrl ? "#ffffff" : layout.textFill;
  const bodyFill = panel.imageUrl ? "rgba(255,255,255,0.92)" : layout.bodyFill;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${renderPacketTarget.widthPixels}" height="${renderPacketTarget.heightPixels}" viewBox="0 0 ${renderPacketTarget.widthPixels} ${renderPacketTarget.heightPixels}" role="img" aria-label="${escapeXml(panel.label)} panel" direction="${direction}" data-customcard-style="${styleId}">
  <rect width="${renderPacketTarget.widthPixels}" height="${renderPacketTarget.heightPixels}" fill="${layout.background(panel)}"/>
${layout.frame(accent)}
${artworkLayer}
  <text x="${x}" y="${layout.headlineY}" fill="${textFill}" font-family="${layout.headlineFont}" font-size="${layout.headlineSize}" font-weight="${layout.headlineWeight}" text-anchor="${anchor}">
${headlineLines.map((line, index) => `    <tspan x="${x}" dy="${index === 0 ? 0 : layout.headlineLeading}">${escapeXml(line)}</tspan>`).join("\n")}
  </text>
  <text x="${x}" y="${layout.bodyY}" fill="${bodyFill}" font-family="Arial, sans-serif" font-size="54" text-anchor="${anchor}">
${bodyLines.map((line, index) => `    <tspan x="${x}" dy="${index === 0 ? 0 : 74}">${escapeXml(line)}</tspan>`).join("\n")}
  </text>
${layout.footer(panel, accent, anchor, x)}
</svg>`;
}

interface StyleLayout {
  background: (panel: CardPanel) => string;
  frame: (accent: string) => string;
  decoration: (panel: CardPanel, accent: string) => string;
  footer: (panel: CardPanel, accent: string, anchor: string, x: number) => string;
  headlineFont: string;
  headlineSize: number;
  headlineWeight: number;
  headlineLeading: number;
  headlineY: number;
  bodyY: number;
  textFill: string;
  bodyFill: string;
}

const styleLayouts: Record<VisualStyle, StyleLayout> = {
  botanical: {
    background: (panel) => (panel.id === "front" ? "#f8f3e8" : panel.id === "back" ? "#eef4f0" : "#f7f8fa"),
    frame: (accent) => `  <rect x="120" y="120" width="1260" height="1860" rx="42" fill="none" stroke="${accent}" stroke-width="12"/>`,
    decoration: (_panel, accent) => `  <g data-style-marker="botanical-florals">
    <circle cx="1210" cy="330" r="96" fill="${accent}" opacity="0.15"/>
    <circle cx="1290" cy="262" r="44" fill="${accent}" opacity="0.2"/>
    <circle cx="262" cy="1758" r="58" fill="${accent}" opacity="0.16"/>
    <path d="M210 1710 C480 1580, 720 1890, 1260 1670" fill="none" stroke="${accent}" stroke-width="18" opacity="0.22"/>
    <path d="M204 250 C330 360, 300 470, 214 560" fill="none" stroke="${accent}" stroke-width="12" opacity="0.25"/>
  </g>`,
    footer: () => "",
    headlineFont: "Georgia, serif",
    headlineSize: 92,
    headlineWeight: 700,
    headlineLeading: 108,
    headlineY: 470,
    bodyY: 880,
    textFill: "#1d2429",
    bodyFill: "#27343a"
  },
  "bold-type": {
    background: () => "#16181d",
    frame: () => "",
    decoration: (_panel, accent) => `  <g data-style-marker="bold-type-block">
    <rect x="0" y="0" width="1500" height="720" fill="${accent}"/>
    <rect x="0" y="720" width="1500" height="26" fill="#ffffff" opacity="0.85"/>
  </g>`,
    footer: () => "",
    headlineFont: "Helvetica, Arial, sans-serif",
    headlineSize: 168,
    headlineWeight: 800,
    headlineLeading: 184,
    headlineY: 420,
    bodyY: 1040,
    textFill: "#ffffff",
    bodyFill: "rgba(255,255,255,0.88)"
  },
  "photo-note": {
    background: () => "#fbfaf7",
    frame: () => `  <rect x="100" y="100" width="1300" height="1900" fill="none" stroke="#d8d2c6" stroke-width="6"/>`,
    decoration: (_panel, accent) => `  <g data-style-marker="photo-note-slot">
    <rect x="180" y="200" width="1140" height="920" fill="#edeae2" stroke="${accent}" stroke-width="8" stroke-dasharray="28 20"/>
    <circle cx="750" cy="620" r="84" fill="${accent}" opacity="0.25"/>
    <rect x="180" y="1140" width="1140" height="8" fill="${accent}" opacity="0.4"/>
  </g>`,
    footer: () => "",
    headlineFont: "Georgia, serif",
    headlineSize: 84,
    headlineWeight: 700,
    headlineLeading: 100,
    headlineY: 1320,
    bodyY: 1560,
    textFill: "#1d2429",
    bodyFill: "#27343a"
  },
  minimal: {
    background: () => "#ffffff",
    frame: () => "",
    decoration: (_panel, accent) => `  <g data-style-marker="minimal-rule">
    <rect x="260" y="560" width="280" height="10" fill="${accent}"/>
  </g>`,
    footer: (panel, accent, anchor, x) =>
      panel.id === "front" || panel.id === "back"
        ? ""
        : `  <text x="${x}" y="1880" fill="${accent}" font-family="Georgia, serif" font-size="38" font-style="italic" text-anchor="${anchor}" data-style-marker="minimal-signature">—</text>`,
    headlineFont: "Helvetica, Arial, sans-serif",
    headlineSize: 88,
    headlineWeight: 600,
    headlineLeading: 104,
    headlineY: 470,
    bodyY: 920,
    textFill: "#161a1d",
    bodyFill: "#3a4449"
  }
};

export function exportFileName(panel: CardPanel, draftId: string): string {
  return renderPacketFileName(draftId, panel.id);
}

function wrapSvgText(value: string, maxChars: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
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
  return lines.length ? lines : [value];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildArtworkLayer(imageUrl: string): string {
  const inlineSvg = deterministicArtworkSvg(imageUrl);
  if (inlineSvg) {
    return `  <svg x="120" y="120" width="1260" height="1860" viewBox="0 0 1500 2100" preserveAspectRatio="xMidYMid slice">
${inlineSvg}
  </svg>`;
  }
  return `  <image href="${escapeXml(imageUrl)}" x="120" y="120" width="1260" height="1860" preserveAspectRatio="xMidYMid slice"/>`;
}

function deterministicArtworkSvg(imageUrl: string): string | undefined {
  const svg = decodeSvgDataUrl(imageUrl);
  if (!svg?.includes("data-customcard-theme=")) return undefined;
  return svg
    .replace(/^\uFEFF/, "")
    .replace(/^<\?xml[^>]*>\s*/i, "")
    .trim()
    .replace(/^<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim()
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
}

function decodeSvgDataUrl(imageUrl: string): string | undefined {
  const separatorIndex = imageUrl.indexOf(",");
  if (separatorIndex < 0) return undefined;
  const header = imageUrl.slice(0, separatorIndex);
  if (!/^data:image\/svg\+xml/i.test(header)) return undefined;
  const payload = imageUrl.slice(separatorIndex + 1);
  if (/;base64/i.test(header)) return decodeBase64Utf8(payload);
  try {
    return decodeURIComponent(payload);
  } catch {
    return undefined;
  }
}

function decodeBase64Utf8(value: string): string | undefined {
  if (typeof atob !== "function") return undefined;
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return undefined;
  }
}
