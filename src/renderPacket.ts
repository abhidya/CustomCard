import { renderPacketFileName, renderPacketTarget } from "./renderPacketContract";
import type { CardPanel } from "./cardDraft";

export function buildPanelSvg(panel: CardPanel): string {
  const background = panel.id === "front" ? "#f8f3e8" : panel.id === "back" ? "#eef4f0" : "#f7f8fa";
  const accent = panel.id === "inside-right" ? "#c8553d" : panel.id === "inside-left" ? "#258477" : "#315b7d";
  const bodyLines = wrapSvgText(panel.body, 34).slice(0, 8);
  const headlineLines = wrapSvgText(panel.headline, 24).slice(0, 3);
  const direction = panel.rtl ? "rtl" : "ltr";
  const anchor = panel.rtl ? "end" : "start";
  const x = panel.rtl ? 1240 : 260;

  const decorativeLayer = panel.imageUrl
    ? buildArtworkLayer(panel.imageUrl)
    : `  <circle cx="1210" cy="330" r="96" fill="${accent}" opacity="0.15"/>
  <path d="M210 1710 C480 1580, 720 1890, 1260 1670" fill="none" stroke="${accent}" stroke-width="18" opacity="0.22"/>`;
  const textFill = panel.imageUrl ? "#ffffff" : "#1d2429";
  const bodyFill = panel.imageUrl ? "rgba(255,255,255,0.92)" : "#27343a";
  const artFill = panel.imageUrl ? "rgba(255,255,255,0.7)" : "#59656b";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${renderPacketTarget.widthPixels}" height="${renderPacketTarget.heightPixels}" viewBox="0 0 ${renderPacketTarget.widthPixels} ${renderPacketTarget.heightPixels}" role="img" aria-label="${escapeXml(panel.label)} panel" direction="${direction}">
  <rect width="${renderPacketTarget.widthPixels}" height="${renderPacketTarget.heightPixels}" fill="${background}"/>
  <rect x="120" y="120" width="1260" height="1860" rx="42" fill="none" stroke="${accent}" stroke-width="12"/>
${decorativeLayer}
  <text x="${x}" y="470" fill="${textFill}" font-family="Georgia, serif" font-size="92" font-weight="700" text-anchor="${anchor}">
${headlineLines.map((line, index) => `    <tspan x="${x}" dy="${index === 0 ? 0 : 108}">${escapeXml(line)}</tspan>`).join("\n")}
  </text>
  <text x="${x}" y="880" fill="${bodyFill}" font-family="Arial, sans-serif" font-size="54" text-anchor="${anchor}">
${bodyLines.map((line, index) => `    <tspan x="${x}" dy="${index === 0 ? 0 : 74}">${escapeXml(line)}</tspan>`).join("\n")}
  </text>
  <text x="${x}" y="1840" fill="${artFill}" font-family="Arial, sans-serif" font-size="34" text-anchor="${anchor}">${escapeXml(panel.artDirection)}</text>
</svg>`;
}

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
