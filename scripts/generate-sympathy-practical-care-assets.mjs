import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const width = 1500;
const height = 2100;
const outputDir = resolve("public/generated");

function defs({ dark = false } = {}) {
  return `
    <defs>
      <filter id="paperNoise" x="-8%" y="-8%" width="116%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018 0.052" numOctaves="5" seed="${dark ? 421 : 557}"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.18"/>
        </feComponentTransfer>
      </filter>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="28" stdDeviation="24" flood-color="#06100d" flood-opacity="${dark ? 0.42 : 0.16}"/>
      </filter>
      <filter id="softBlur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="26"/>
      </filter>
      <linearGradient id="doorLight" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#fbefd0" stop-opacity="${dark ? 0.62 : 0.34}"/>
        <stop offset="0.42" stop-color="#d7bd7f" stop-opacity="${dark ? 0.24 : 0.16}"/>
        <stop offset="1" stop-color="${dark ? "#0b1714" : "#f8f0df"}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="mossPaper" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#8b9d8e"/>
        <stop offset="1" stop-color="#253f36"/>
      </linearGradient>
      <linearGradient id="warmPaper" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#fff8e8"/>
        <stop offset="1" stop-color="#d8bf88"/>
      </linearGradient>
      <radialGradient id="quietPool" cx="${dark ? "40%" : "52%"}" cy="${dark ? "32%" : "44%"}" r="72%">
        <stop offset="0" stop-color="#f6e8c8" stop-opacity="${dark ? 0.28 : 0.32}"/>
        <stop offset="0.64" stop-color="#d7bd7f" stop-opacity="${dark ? 0.08 : 0.1}"/>
        <stop offset="1" stop-color="${dark ? "#0b1714" : "#f8f0df"}" stop-opacity="0"/>
      </radialGradient>
    </defs>
  `;
}

function botanicalCorner({ mirrored = false, dark = false, opacity = 1, x = 0, y = 0, scale = 1 }) {
  const transform = `translate(${x} ${y}) scale(${mirrored ? -scale : scale} ${scale})`;
  const leaf = dark ? "#6f8174" : "#9daa98";
  const stem = dark ? "#a99362" : "#8b866f";
  return `
    <g transform="${transform}" opacity="${opacity}">
      <path d="M0 450 C170 320 320 226 540 64" fill="none" stroke="${stem}" stroke-width="8" stroke-linecap="round" opacity="0.46"/>
      ${[90, 170, 260, 350, 455].map((px, index) => {
        const py = 410 - index * 74;
        return `
          <path d="M${px} ${py} C${px + 92} ${py - 72} ${px + 190} ${py - 54} ${px + 238} ${py + 18} C${px + 126} ${py + 62} ${px + 44} ${py + 38} ${px} ${py}Z" fill="${leaf}" opacity="${0.28 - index * 0.018}"/>
          <path d="M${px + 18} ${py + 2} C${px + 86} ${py - 28} ${px + 152} ${py - 24} ${px + 222} ${py + 14}" fill="none" stroke="${dark ? "#d7bd7f" : "#6f7d70"}" stroke-width="3" opacity="0.24"/>
        `;
      }).join("")}
      ${[0, 1, 2, 3, 4, 5].map((index) => {
        const cx = 420 + index * 28;
        const cy = 126 - index * 17;
        return `<circle cx="${cx}" cy="${cy}" r="${index % 2 ? 10 : 7}" fill="#f5edda" opacity="${dark ? 0.34 : 0.52}"/>`;
      }).join("")}
    </g>
  `;
}

function doorstepCareTableau({ dark = false, x = 210, y = 1260, scale = 1, opacity = 1, mirrored = false }) {
  const tx = `translate(${x} ${y}) scale(${mirrored ? -scale : scale} ${scale})`;
  const shadow = dark ? "#06100d" : "#b9ab8d";
  const paper = dark ? "url(#warmPaper)" : "#fff8e8";
  const moss = dark ? "url(#mossPaper)" : "#738676";
  const line = dark ? "#efe1bc" : "#4d6258";
  const muted = dark ? "#d7bd7f" : "#b29358";
  return `
    <g transform="${tx}" opacity="${opacity}">
      <path d="M-70 598 C118 500 324 550 524 454 C706 366 880 390 1066 498 L1018 790 C800 884 618 820 402 904 C198 984 40 910 -110 998 Z" fill="${shadow}" opacity="${dark ? 0.34 : 0.16}" filter="url(#softBlur)"/>
      <path d="M28 346 C228 248 414 286 630 190 C818 106 982 136 1118 244 L1080 518 C858 600 678 558 476 638 C286 714 142 656 -10 748 Z" fill="${paper}" opacity="${dark ? 0.74 : 0.88}" filter="url(#softShadow)"/>
      <path d="M72 404 C264 318 426 350 628 268 C800 200 940 214 1050 288" fill="none" stroke="${line}" stroke-width="8" stroke-linecap="round" opacity="${dark ? 0.24 : 0.16}"/>
      <path d="M78 514 C280 436 452 478 660 390 C828 320 956 344 1068 410" fill="none" stroke="${muted}" stroke-width="12" stroke-linecap="round" opacity="${dark ? 0.28 : 0.24}"/>
      <path d="M158 462 C294 384 448 410 606 346 C744 290 852 310 936 366 L904 534 C756 586 618 570 462 626 C308 682 204 636 116 696 Z" fill="${moss}" opacity="${dark ? 0.4 : 0.24}"/>
      <path d="M202 492 C332 446 456 464 604 416 C728 376 824 390 900 430" fill="none" stroke="#fff8e8" stroke-width="6" stroke-linecap="round" opacity="${dark ? 0.48 : 0.34}"/>
      <path d="M224 610 C370 560 510 590 670 536 C804 492 910 506 1004 556" fill="none" stroke="${line}" stroke-width="7" stroke-linecap="round" opacity="${dark ? 0.32 : 0.22}"/>

      <g transform="translate(232 292)">
        <path d="M42 134 C54 56 130 20 226 32 C316 42 374 92 384 166 C292 206 160 202 42 134Z" fill="#f4e7c7" opacity="${dark ? 0.76 : 0.88}" filter="url(#softShadow)"/>
        <path d="M78 128 C122 82 280 82 348 146" fill="none" stroke="${muted}" stroke-width="9" stroke-linecap="round" opacity="0.34"/>
        <path d="M166 52 C190 28 236 28 260 54" fill="none" stroke="${line}" stroke-width="7" stroke-linecap="round" opacity="0.28"/>
      </g>

      <g transform="translate(612 320) rotate(-5)">
        <path d="M0 44 C82 10 184 20 260 74 L244 176 C156 206 70 184 -16 214 Z" fill="#f7f0dd" opacity="${dark ? 0.7 : 0.84}" filter="url(#softShadow)"/>
        <path d="M36 74 C106 48 176 58 230 92" fill="none" stroke="${muted}" stroke-width="6" stroke-linecap="round" opacity="0.3"/>
        <path d="M28 128 C92 104 164 116 222 146" fill="none" stroke="${line}" stroke-width="4" stroke-linecap="round" opacity="0.22"/>
      </g>

      <g transform="translate(826 400)">
        <rect x="0" y="0" width="142" height="214" rx="42" fill="#31483f" opacity="${dark ? 0.5 : 0.28}" filter="url(#softShadow)"/>
        <path d="M34 42 H108" stroke="#f8edcf" stroke-width="5" stroke-linecap="round" opacity="0.34"/>
        <path d="M46 150 H96" stroke="#f8edcf" stroke-width="4" stroke-linecap="round" opacity="0.22"/>
      </g>

      <path d="M-42 806 C156 718 352 760 550 686 C730 620 892 638 1088 706" fill="none" stroke="${dark ? "#efe1bc" : "#8b866f"}" stroke-width="5" stroke-linecap="round" opacity="${dark ? 0.2 : 0.12}"/>
    </g>
  `;
}

function basePanel({ dark = false, panelId }) {
  const fill = dark ? "#0a1714" : "#fbf3e4";
  return `
    <rect width="${width}" height="${height}" fill="${fill}"/>
    <rect width="${width}" height="${height}" fill="${dark ? "#e8d6a8" : "#637365"}" filter="url(#paperNoise)" opacity="${dark ? 0.2 : 0.09}"/>
    <ellipse cx="${dark ? 620 : 780}" cy="${dark ? 520 : 720}" rx="${dark ? 780 : 640}" ry="${dark ? 520 : 430}" fill="url(#quietPool)"/>
    <path d="M-180 ${dark ? 188 : 136} C260 ${dark ? 76 : 220} 554 ${dark ? 210 : 146} 888 ${dark ? 126 : 220} C1120 ${dark ? 72 : 150} 1340 ${dark ? 130 : 170} 1660 ${dark ? 54 : 112} V${dark ? 760 : 560} C1248 ${dark ? 702 : 530} 980 ${dark ? 790 : 636} 648 ${dark ? 870 : 724} C344 ${dark ? 944 : 786} 120 ${dark ? 884 : 742} -180 ${dark ? 1018 : 842} Z" fill="url(#doorLight)" opacity="${dark ? 0.76 : 0.42}"/>
    ${panelId === "front" ? botanicalCorner({ x: 1248, y: 92, scale: 0.46, mirrored: false, dark, opacity: 0.5 }) : ""}
    ${panelId === "back" ? botanicalCorner({ x: 1320, y: 98, scale: 0.42, mirrored: true, dark, opacity: 0.42 }) : ""}
  `;
}

function panelSvg(panelId) {
  const dark = panelId === "front" || panelId === "back";
  const interior = panelId.startsWith("inside");
  const mirrored = panelId === "inside-right" || panelId === "back";
  const tableau = panelId === "front"
    ? doorstepCareTableau({ dark, x: 126, y: 1130, scale: 1.08, opacity: 0.9 })
    : panelId === "back"
      ? doorstepCareTableau({ dark, x: 292, y: 1330, scale: 0.68, mirrored: true, opacity: 0.68 })
      : doorstepCareTableau({ dark, x: mirrored ? 1192 : 306, y: 1440, scale: 0.48, mirrored, opacity: 0.46 });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${defs({ dark })}
  ${basePanel({ dark, panelId })}
  ${interior ? botanicalCorner({ x: mirrored ? 1460 : 40, y: 1490, scale: 0.58, mirrored, dark, opacity: 0.34 }) : ""}
  ${tableau}
  ${interior ? `<path d="M244 236 C456 190 654 234 866 192 C1050 156 1192 178 1294 132" fill="none" stroke="#b9a26e" stroke-width="3" stroke-linecap="round" opacity="0.13"/>` : ""}
  ${dark ? `<rect width="${width}" height="${height}" fill="#0a1714" opacity="0.18"/>` : ""}
</svg>`;
}

mkdirSync(outputDir, { recursive: true });

for (const panelId of ["front", "inside-left", "inside-right", "back"]) {
  const file = resolve(outputDir, `sympathy-practical-care-${panelId}.png`);
  const svg = panelSvg(panelId);
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  writeFileSync(file, buffer);
  console.log(file);
}
