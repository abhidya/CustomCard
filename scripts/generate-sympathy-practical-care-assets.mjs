import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const width = 1500;
const height = 2100;
const outputDir = resolve("public/generated");
const sourceAssetDir = resolve("public/generated/source-assets");

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

function premiumDefs({ dark = false } = {}) {
  return `
    <defs>
      <filter id="premiumPaperGrain" x="-8%" y="-8%" width="116%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency="0.75 0.95" numOctaves="2" seed="${dark ? 883 : 947}"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.05"/>
        </feComponentTransfer>
      </filter>
      <filter id="premiumSoftShadow" x="-24%" y="-24%" width="148%" height="148%">
        <feDropShadow dx="0" dy="34" stdDeviation="30" flood-color="#06100d" flood-opacity="${dark ? 0.48 : 0.16}"/>
      </filter>
      <filter id="premiumContactShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="34"/>
      </filter>
      <linearGradient id="premiumMoss" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#172a23"/>
        <stop offset="0.55" stop-color="#0c1814"/>
        <stop offset="1" stop-color="#06100d"/>
      </linearGradient>
      <linearGradient id="premiumIvory" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#fff9ea"/>
        <stop offset="0.58" stop-color="#f6ead0"/>
        <stop offset="1" stop-color="#e2c991"/>
      </linearGradient>
      <linearGradient id="premiumLinen" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#f8ecd2"/>
        <stop offset="0.52" stop-color="#d6c18e"/>
        <stop offset="1" stop-color="#99875f"/>
      </linearGradient>
      <linearGradient id="premiumPhone" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#506057"/>
        <stop offset="1" stop-color="#17231f"/>
      </linearGradient>
      <radialGradient id="premiumLight" cx="${dark ? "42%" : "52%"}" cy="${dark ? "31%" : "40%"}" r="72%">
        <stop offset="0" stop-color="#f8e9c6" stop-opacity="${dark ? 0.38 : 0.26}"/>
        <stop offset="0.58" stop-color="#c5a86c" stop-opacity="${dark ? 0.09 : 0.07}"/>
        <stop offset="1" stop-color="${dark ? "#07110e" : "#f7edd8"}" stop-opacity="0"/>
      </radialGradient>
    </defs>
  `;
}

function premiumPanelBackground({ dark = false, panelId }) {
  const fill = dark ? "url(#premiumMoss)" : "#fbf2df";
  const vignette = dark ? "#020604" : "#dfc58e";
  return `
    <rect width="${width}" height="${height}" fill="${fill}"/>
    <rect width="${width}" height="${height}" fill="${dark ? "#d8c28f" : "#846f48"}" filter="url(#premiumPaperGrain)" opacity="${dark ? 0.36 : 0.18}"/>
    <ellipse cx="${dark ? 620 : 762}" cy="${dark ? 520 : 620}" rx="${dark ? 810 : 650}" ry="${dark ? 520 : 430}" fill="url(#premiumLight)"/>
    <path d="M-120 ${dark ? 168 : 152} C170 ${dark ? 66 : 220} 460 ${dark ? 210 : 132} 812 ${dark ? 128 : 206} C1080 ${dark ? 74 : 146} 1306 ${dark ? 118 : 170} 1620 ${dark ? 48 : 102} V${dark ? 660 : 560} C1260 ${dark ? 636 : 532} 996 ${dark ? 710 : 638} 662 ${dark ? 806 : 728} C374 ${dark ? 888 : 806} 120 ${dark ? 836 : 748} -120 ${dark ? 980 : 838} Z" fill="${dark ? "#f0dbac" : "#fff8e7"}" opacity="${dark ? 0.16 : 0.34}"/>
    <rect width="${width}" height="${height}" fill="${vignette}" opacity="${dark ? 0.18 : 0.03}"/>
    ${panelId.startsWith("inside") ? `<path d="M248 238 C486 192 676 232 912 188 C1098 154 1228 176 1300 134" fill="none" stroke="#b09c6c" stroke-width="3" stroke-linecap="round" opacity="0.13"/>` : ""}
  `;
}

function premiumLeafShadow({ x = 0, y = 0, scale = 1, mirrored = false, dark = false, opacity = 1 }) {
  const transform = `translate(${x} ${y}) scale(${mirrored ? -scale : scale} ${scale})`;
  const stroke = dark ? "#d7c08a" : "#7b876f";
  const fill = dark ? "#b8bf9f" : "#7f8d79";
  return `
    <g transform="${transform}" opacity="${opacity}">
      <path d="M0 390 C128 272 282 178 474 44" fill="none" stroke="${stroke}" stroke-width="7" stroke-linecap="round" opacity="${dark ? 0.28 : 0.22}"/>
      ${[0, 1, 2, 3, 4, 5].map((index) => {
        const px = 64 + index * 68;
        const py = 340 - index * 50;
        const side = index % 2 === 0 ? 1 : -1;
        return `<path d="M${px} ${py} C${px + side * 112} ${py - 72} ${px + side * 214} ${py - 38} ${px + side * 248} ${py + 40} C${px + side * 134} ${py + 76} ${px + side * 48} ${py + 46} ${px} ${py}Z" fill="${fill}" opacity="${0.22 - index * 0.012}"/>`;
      }).join("")}
      <circle cx="410" cy="86" r="8" fill="#f1dfb5" opacity="${dark ? 0.34 : 0.28}"/>
      <circle cx="446" cy="62" r="6" fill="#f1dfb5" opacity="${dark ? 0.3 : 0.24}"/>
      <circle cx="470" cy="108" r="7" fill="#f1dfb5" opacity="${dark ? 0.26 : 0.22}"/>
    </g>
  `;
}

function premiumBowl({ x = 0, y = 0, scale = 1, dark = false }) {
  return `
    <g transform="translate(${x} ${y}) scale(${scale})" filter="url(#premiumSoftShadow)">
      <path d="M8 148 C30 52 124 -4 254 14 C370 30 438 96 450 184 C338 236 142 232 8 148Z" fill="#f6e7c7" opacity="${dark ? 0.92 : 0.98}"/>
      <path d="M52 142 C104 82 306 84 398 160" fill="none" stroke="#bba370" stroke-width="11" stroke-linecap="round" opacity="0.34"/>
      <path d="M146 48 C184 22 248 24 286 58" fill="none" stroke="#5d6b5e" stroke-width="8" stroke-linecap="round" opacity="0.22"/>
      <path d="M62 188 C166 222 302 220 408 184" fill="none" stroke="#fff7df" stroke-width="8" stroke-linecap="round" opacity="0.42"/>
    </g>
  `;
}

function premiumFoldedCloth({ x = 0, y = 0, scale = 1, rotate = 0, dark = false }) {
  return `
    <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})" filter="url(#premiumSoftShadow)">
      <path d="M0 54 C120 8 238 18 340 84 L314 254 C202 298 86 270 -34 322 Z" fill="url(#premiumLinen)" opacity="${dark ? 0.78 : 0.86}"/>
      <path d="M44 92 C132 58 228 66 304 116" fill="none" stroke="#fff5dc" stroke-width="7" stroke-linecap="round" opacity="0.46"/>
      <path d="M26 176 C124 134 230 146 294 190" fill="none" stroke="#71684e" stroke-width="4" stroke-linecap="round" opacity="0.2"/>
    </g>
  `;
}

function premiumNote({ x = 0, y = 0, scale = 1, rotate = 0, dark = false }) {
  return `
    <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})" filter="url(#premiumSoftShadow)">
      <path d="M0 0 H246 V174 C176 202 90 190 0 228 Z" fill="#fff8e7" opacity="${dark ? 0.82 : 0.96}"/>
      <path d="M36 54 H204" stroke="#c2aa75" stroke-width="5" stroke-linecap="round" opacity="0.22"/>
      <path d="M36 104 H168" stroke="#5d6b5e" stroke-width="4" stroke-linecap="round" opacity="0.16"/>
    </g>
  `;
}

function premiumPhone({ x = 0, y = 0, scale = 1, rotate = 0, dark = false }) {
  return `
    <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})" filter="url(#premiumSoftShadow)" opacity="${dark ? 0.78 : 0.66}">
      <rect x="0" y="0" width="128" height="206" rx="40" fill="url(#premiumPhone)"/>
      <path d="M34 42 H94" stroke="#f8e7c6" stroke-width="5" stroke-linecap="round" opacity="0.42"/>
      <path d="M46 152 H82" stroke="#f8e7c6" stroke-width="4" stroke-linecap="round" opacity="0.22"/>
    </g>
  `;
}

function premiumCareTableau({ dark = false, x = 0, y = 0, scale = 1, mirrored = false, opacity = 1, compact = false }) {
  const transform = `translate(${x} ${y}) scale(${mirrored ? -scale : scale} ${scale})`;
  const shadow = dark ? "#020604" : "#b4a47e";
  const shelf = dark ? "#e9d8aa" : "#8a9a82";
  const line = dark ? "#f2e1b9" : "#53685f";
  return `
    <g transform="${transform}" opacity="${opacity}">
      <ellipse cx="520" cy="${compact ? 442 : 520}" rx="${compact ? 530 : 650}" ry="${compact ? 130 : 168}" fill="${shadow}" filter="url(#premiumContactShadow)" opacity="${dark ? 0.5 : 0.18}"/>
      <path d="M-60 ${compact ? 330 : 410} C120 ${compact ? 256 : 314} 302 ${compact ? 286 : 356} 498 ${compact ? 220 : 276} C694 ${compact ? 156 : 214} 900 ${compact ? 190 : 242} 1090 ${compact ? 288 : 350} L1040 ${compact ? 478 : 610} C816 ${compact ? 690 : 802} 604 ${compact ? 600 : 718} 386 ${compact ? 704 : 848} C202 ${compact ? 812 : 934} 52 ${compact ? 710 : 826} -92 ${compact ? 862 : 1000} Z" fill="${shelf}" opacity="${dark ? 0.34 : 0.24}"/>
      <path d="M-18 ${compact ? 384 : 470} C180 ${compact ? 312 : 384} 342 ${compact ? 340 : 424} 540 ${compact ? 274 : 342} C720 ${compact ? 222 : 286} 886 ${compact ? 238 : 326} 1028 ${compact ? 320 : 404}" fill="none" stroke="${line}" stroke-width="${compact ? 7 : 9}" stroke-linecap="round" opacity="${dark ? 0.26 : 0.18}"/>
      ${premiumBowl({ x: compact ? 210 : 236, y: compact ? 170 : 242, scale: compact ? 0.72 : 0.86, dark })}
      ${premiumFoldedCloth({ x: compact ? 544 : 596, y: compact ? 210 : 292, scale: compact ? 0.62 : 0.75, rotate: -5, dark })}
      ${premiumNote({ x: compact ? 640 : 730, y: compact ? 116 : 180, scale: compact ? 0.58 : 0.66, rotate: -4, dark })}
      ${premiumPhone({ x: compact ? 808 : 922, y: compact ? 252 : 354, scale: compact ? 0.54 : 0.64, rotate: compact ? -3 : 2, dark })}
      <path d="M-54 ${compact ? 610 : 748} C128 ${compact ? 542 : 680} 332 ${compact ? 580 : 730} 520 ${compact ? 516 : 650} C710 ${compact ? 454 : 580} 888 ${compact ? 494 : 626} 1096 ${compact ? 560 : 710}" fill="none" stroke="${dark ? "#efe1bd" : "#887a57"}" stroke-width="5" stroke-linecap="round" opacity="${dark ? 0.18 : 0.1}"/>
    </g>
  `;
}

function premiumPanelSvg(panelId) {
  const dark = panelId === "front" || panelId === "back";
  const inside = panelId.startsWith("inside");
  const mirrored = panelId === "inside-right" || panelId === "back";
  const tableau = panelId === "front"
    ? premiumCareTableau({ dark, x: 132, y: 1230, scale: 1.1, opacity: 0.94 })
    : panelId === "back"
      ? premiumCareTableau({ dark, x: 390, y: 1438, scale: 0.58, mirrored: true, opacity: 0.64, compact: true })
      : premiumCareTableau({ dark, x: mirrored ? 1160 : 214, y: 1510, scale: 0.52, mirrored, opacity: 0.46, compact: true });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${premiumDefs({ dark })}
  ${premiumPanelBackground({ dark, panelId })}
  ${panelId === "front" ? premiumLeafShadow({ x: 1260, y: 88, scale: 0.46, mirrored: false, dark, opacity: 0.55 }) : ""}
  ${panelId === "back" ? premiumLeafShadow({ x: 1320, y: 98, scale: 0.42, mirrored: true, dark, opacity: 0.42 }) : ""}
  ${inside ? premiumLeafShadow({ x: mirrored ? 1450 : 48, y: 1496, scale: 0.56, mirrored, dark, opacity: 0.28 }) : ""}
  ${tableau}
  ${dark ? `<rect width="${width}" height="${height}" fill="#06100d" opacity="0.1"/>` : ""}
</svg>`;
}

function sourceAssetDataUrl(fileName, contentType = "image/png") {
  const filePath = resolve(sourceAssetDir, fileName);
  if (!existsSync(filePath)) return "";
  return `data:${contentType};base64,${readFileSync(filePath).toString("base64")}`;
}

function licensedPhotoDefs({ dark = false } = {}) {
  return `
    <defs>
      <filter id="licensedPhotoSoft" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="10"/>
      </filter>
      <filter id="licensedPhotoPaper" x="-8%" y="-8%" width="116%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency="0.82 0.9" numOctaves="2" seed="${dark ? 151 : 271}"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.045"/>
        </feComponentTransfer>
      </filter>
      <linearGradient id="licensedPhotoVignette" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="${dark ? "#07100d" : "#fff8e8"}" stop-opacity="${dark ? 0.74 : 0.08}"/>
        <stop offset="0.46" stop-color="${dark ? "#07100d" : "#fff8e8"}" stop-opacity="${dark ? 0.22 : 0.02}"/>
        <stop offset="1" stop-color="${dark ? "#020604" : "#e8d0a1"}" stop-opacity="${dark ? 0.66 : 0.08}"/>
      </linearGradient>
      <radialGradient id="licensedPhotoTitleGlow" cx="${dark ? "45%" : "50%"}" cy="${dark ? "28%" : "38%"}" r="${dark ? "62%" : "54%"}">
        <stop offset="0" stop-color="#fff5dc" stop-opacity="${dark ? 0.38 : 0.22}"/>
        <stop offset="0.7" stop-color="#d6bd82" stop-opacity="${dark ? 0.08 : 0.05}"/>
        <stop offset="1" stop-color="${dark ? "#07100d" : "#fff5dc"}" stop-opacity="0"/>
      </radialGradient>
    </defs>
  `;
}

function licensedPhotoPanelSvg(panelId) {
  const sourceByPanel = {
    front: {
      fileName: "rawpixel-cc0-leaves-note.png",
      fullBleed: true,
      photoX: -820,
      photoOpacity: 0.76
    },
    "inside-left": {
      fileName: "rawpixel-cc0-leaves-note.png",
      photoX: -70,
      photoY: 1210,
      photoHeight: 760,
      photoOpacity: 0.58
    },
    "inside-right": {
      fileName: "commons-cc0-phone-notes-table.jpg",
      contentType: "image/jpeg",
      photoX: 360,
      photoY: 1186,
      photoHeight: 820,
      photoOpacity: 0.5
    },
    back: {
      fileName: "rawpixel-cc0-leaves-note.png",
      fullBleed: true,
      photoX: -820,
      photoOpacity: 0.76
    }
  };
  const source = sourceByPanel[panelId] ?? {};
  const href = sourceAssetDataUrl(source.fileName || "rawpixel-cc0-leaves-note.png", source.contentType || "image/png");
  if (!href) return "";
  const dark = panelId === "front" || panelId === "back";
  const inside = panelId.startsWith("inside");
  const mirrored = panelId === "inside-right" || panelId === "back";
  const photoOpacity = source.photoOpacity ?? (dark ? 0.76 : 0.58);
  const photoY = source.photoY ?? (source.fullBleed ? 0 : 1210);
  const photoHeight = source.photoHeight ?? (source.fullBleed ? height : 760);
  const photoWidth = Math.round(photoHeight * 1.5);
  const photoX = source.photoX ?? (inside ? mirrored ? 430 : -70 : -820);
  const flip = mirrored ? ` transform="translate(1500 0) scale(-1 1)"` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${licensedPhotoDefs({ dark })}
  <rect width="${width}" height="${height}" fill="${dark ? "#07100d" : "#fff7e7"}"/>
  <rect width="${width}" height="${height}" fill="${dark ? "#d7bd80" : "#7a6846"}" filter="url(#licensedPhotoPaper)" opacity="${dark ? 0.34 : 0.16}"/>
  <ellipse cx="${dark ? 660 : 750}" cy="${dark ? 560 : 640}" rx="${dark ? 820 : 660}" ry="${dark ? 520 : 430}" fill="url(#licensedPhotoTitleGlow)"/>
  <g${flip}>
    <image href="${href}" x="${photoX}" y="${photoY}" width="${photoWidth}" height="${photoHeight}" preserveAspectRatio="xMidYMid slice" opacity="${photoOpacity}"/>
  </g>
  ${inside ? `<rect x="138" y="214" width="1224" height="1156" rx="46" fill="#fff9ea" opacity="0.42"/>` : ""}
  ${inside ? `<path d="M238 238 C484 194 680 230 920 186 C1100 154 1234 174 1308 136" stroke="#9d8b63" stroke-width="3" stroke-linecap="round" opacity="0.13" fill="none"/>` : ""}
  <rect width="${width}" height="${height}" fill="url(#licensedPhotoVignette)"/>
  ${dark ? `<rect width="${width}" height="${height}" fill="#07100d" opacity="${panelId === "back" ? 0.26 : 0.18}"/>` : ""}
</svg>`;
}

function bespokeCareDefs({ dark = false } = {}) {
  return `
    <defs>
      <filter id="bespokeCareGrain" x="-8%" y="-8%" width="116%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency="0.46 0.9" numOctaves="3" seed="${dark ? 611 : 719}"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.055"/>
        </feComponentTransfer>
      </filter>
      <filter id="bespokeCareFiber" x="-12%" y="-12%" width="124%" height="124%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018 0.04" numOctaves="5" seed="${dark ? 331 : 467}"/>
        <feDisplacementMap in="SourceGraphic" scale="10"/>
      </filter>
      <filter id="bespokeCareShadow" x="-24%" y="-24%" width="148%" height="148%">
        <feDropShadow dx="0" dy="28" stdDeviation="24" flood-color="#06100d" flood-opacity="${dark ? 0.46 : 0.18}"/>
      </filter>
      <filter id="bespokeCareSoft" x="-24%" y="-24%" width="148%" height="148%">
        <feGaussianBlur stdDeviation="30"/>
      </filter>
      <linearGradient id="bespokeCareDark" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#192e27"/>
        <stop offset="0.56" stop-color="#0a1714"/>
        <stop offset="1" stop-color="#050b09"/>
      </linearGradient>
      <linearGradient id="bespokeCareIvory" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#fff8e8"/>
        <stop offset="0.58" stop-color="#f4e4c4"/>
        <stop offset="1" stop-color="#d8bd84"/>
      </linearGradient>
      <linearGradient id="bespokeCareMoss" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#899a83"/>
        <stop offset="0.55" stop-color="#4f675c"/>
        <stop offset="1" stop-color="#172a24"/>
      </linearGradient>
      <linearGradient id="bespokeCareWarm" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#f8e9c6"/>
        <stop offset="0.62" stop-color="#d7b779"/>
        <stop offset="1" stop-color="#9e7f45"/>
      </linearGradient>
      <linearGradient id="bespokeCarePhone" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#5c6b62"/>
        <stop offset="1" stop-color="#17221f"/>
      </linearGradient>
      <radialGradient id="bespokeCareGlow" cx="${dark ? "42%" : "54%"}" cy="${dark ? "30%" : "38%"}" r="76%">
        <stop offset="0" stop-color="#f9e9c2" stop-opacity="${dark ? 0.38 : 0.32}"/>
        <stop offset="0.58" stop-color="#d0ad69" stop-opacity="${dark ? 0.12 : 0.1}"/>
        <stop offset="1" stop-color="${dark ? "#07100d" : "#fbf1df"}" stop-opacity="0"/>
      </radialGradient>
    </defs>
  `;
}

function bespokeCareBackground(panelId) {
  const dark = panelId === "front" || panelId === "back";
  const base = dark ? "url(#bespokeCareDark)" : "#fbf1df";
  const ink = dark ? "#06100d" : "#52675d";
  const warm = dark ? "#ecd7a5" : "#c6a261";
  const topBand = dark
    ? "M-180 242 C186 70 530 242 846 118 C1118 10 1320 124 1660 46 V820 C1270 720 980 808 624 912 C302 1006 90 904 -180 1102 Z"
    : "M-180 166 C242 250 488 92 834 196 C1100 276 1326 128 1660 202 V620 C1278 584 1020 696 660 740 C332 780 94 702 -180 842 Z";
  return `
    <rect width="${width}" height="${height}" fill="${base}"/>
    <rect width="${width}" height="${height}" fill="${dark ? "#e4cea0" : "#6f6144"}" filter="url(#bespokeCareGrain)" opacity="${dark ? 0.34 : 0.15}"/>
    <ellipse cx="${dark ? 620 : 780}" cy="${dark ? 560 : 650}" rx="${dark ? 810 : 680}" ry="${dark ? 560 : 460}" fill="url(#bespokeCareGlow)"/>
    <path d="${topBand}" fill="${dark ? "#f4e1b7" : "#fff8e8"}" opacity="${dark ? 0.16 : 0.42}" filter="url(#bespokeCareFiber)"/>
    <path d="M-120 1810 C242 1676 542 1760 858 1634 C1134 1526 1332 1560 1624 1434" fill="none" stroke="${warm}" stroke-width="${dark ? 24 : 12}" stroke-linecap="round" opacity="${dark ? 0.13 : 0.1}"/>
    <path d="M-80 1914 C266 1786 584 1870 914 1740 C1170 1640 1366 1674 1600 1578" fill="none" stroke="${ink}" stroke-width="${dark ? 7 : 4}" stroke-linecap="round" opacity="${dark ? 0.2 : 0.11}"/>
  `;
}

function bespokeCoveredMeal({ x = 0, y = 0, scale = 1, rotate = 0, dark = false }) {
  return `
    <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})" filter="url(#bespokeCareShadow)">
      <ellipse cx="226" cy="230" rx="218" ry="74" fill="${dark ? "#020604" : "#b6a073"}" opacity="${dark ? 0.36 : 0.16}" filter="url(#bespokeCareSoft)"/>
      <path d="M26 204 C48 92 150 24 278 38 C390 50 468 122 484 230 C356 298 154 290 26 204Z" fill="#f6e8c8"/>
      <path d="M72 200 C122 128 346 132 438 220" fill="none" stroke="#b89a5d" stroke-width="13" stroke-linecap="round" opacity="0.34"/>
      <path d="M176 70 C210 40 272 42 306 76" fill="none" stroke="#4e675d" stroke-width="9" stroke-linecap="round" opacity="0.28"/>
      <path d="M66 250 C178 292 338 286 452 230" fill="none" stroke="#fff7df" stroke-width="10" stroke-linecap="round" opacity="0.46"/>
    </g>
  `;
}

function bespokeFoldedBag({ x = 0, y = 0, scale = 1, rotate = 0, dark = false }) {
  return `
    <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})" filter="url(#bespokeCareShadow)">
      <path d="M62 100 C116 42 238 40 294 104" fill="none" stroke="#b4955c" stroke-width="18" stroke-linecap="round" opacity="0.5"/>
      <path d="M18 116 L326 82 L378 430 C250 500 122 468 -24 534 Z" fill="url(#bespokeCareIvory)" filter="url(#bespokeCareFiber)" opacity="${dark ? 0.92 : 0.96}"/>
      <path d="M78 142 C154 112 262 104 330 126" fill="none" stroke="#d2b06f" stroke-width="8" stroke-linecap="round" opacity="0.28"/>
      <path d="M42 272 C148 234 266 232 360 260" fill="none" stroke="#52675d" stroke-width="5" stroke-linecap="round" opacity="0.16"/>
      <path d="M28 390 C146 342 266 352 374 398" fill="none" stroke="#d2b06f" stroke-width="6" stroke-linecap="round" opacity="0.18"/>
    </g>
  `;
}

function bespokePhone({ x = 0, y = 0, scale = 1, rotate = 0, opacity = 1 }) {
  return `
    <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})" filter="url(#bespokeCareShadow)" opacity="${opacity}">
      <rect x="0" y="0" width="126" height="216" rx="38" fill="url(#bespokeCarePhone)"/>
      <path d="M34 44 H92" stroke="#f8e7c6" stroke-width="5" stroke-linecap="round" opacity="0.42"/>
      <path d="M44 152 H84" stroke="#f8e7c6" stroke-width="4" stroke-linecap="round" opacity="0.22"/>
    </g>
  `;
}

function bespokeBlankNote({ x = 0, y = 0, scale = 1, rotate = 0, dark = false }) {
  return `
    <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})" filter="url(#bespokeCareShadow)">
      <path d="M0 0 H288 V196 C204 236 98 222 -16 274 Z" fill="#fff9ea" opacity="${dark ? 0.84 : 0.95}" filter="url(#bespokeCareFiber)"/>
      <path d="M42 66 H240" stroke="#c4a76d" stroke-width="5" stroke-linecap="round" opacity="0.18"/>
      <path d="M42 124 H202" stroke="#52675d" stroke-width="4" stroke-linecap="round" opacity="0.12"/>
    </g>
  `;
}

function bespokeRouteThread({ x = 0, y = 0, scale = 1, mirrored = false, dark = false, opacity = 1 }) {
  const sx = mirrored ? -scale : scale;
  return `
    <g transform="translate(${x} ${y}) scale(${sx} ${scale})" opacity="${opacity}">
      <path d="M0 184 C128 86 284 132 426 52 C568 -28 748 14 902 116" fill="none" stroke="${dark ? "#f6e1ad" : "#52675d"}" stroke-width="8" stroke-linecap="round" opacity="${dark ? 0.28 : 0.16}"/>
      <circle cx="34" cy="160" r="12" fill="${dark ? "#f6e1ad" : "#52675d"}" opacity="${dark ? 0.28 : 0.18}"/>
      <circle cx="874" cy="106" r="12" fill="${dark ? "#f6e1ad" : "#52675d"}" opacity="${dark ? 0.24 : 0.16}"/>
    </g>
  `;
}

function bespokeCareTableau({ panelId, x = 0, y = 0, scale = 1, mirrored = false, opacity = 1, compact = false }) {
  const dark = panelId === "front" || panelId === "back";
  const sx = mirrored ? -scale : scale;
  const shelfY = compact ? 460 : 620;
  return `
    <g transform="translate(${x} ${y}) scale(${sx} ${scale})" opacity="${opacity}">
      <ellipse cx="560" cy="${shelfY + 116}" rx="${compact ? 520 : 680}" ry="${compact ? 118 : 170}" fill="${dark ? "#020604" : "#b6a073"}" filter="url(#bespokeCareSoft)" opacity="${dark ? 0.48 : 0.18}"/>
      <path d="M-66 ${compact ? 334 : 454} C126 ${compact ? 250 : 342} 328 ${compact ? 286 : 398} 530 ${compact ? 214 : 306} C736 ${compact ? 126 : 218} 932 ${compact ? 178 : 300} 1104 ${compact ? 292 : 408} L1042 ${compact ? 502 : 690} C814 ${compact ? 720 : 902} 590 ${compact ? 612 : 784} 378 ${compact ? 732 : 958} C196 ${compact ? 836 : 1060} 34 ${compact ? 710 : 910} -112 ${compact ? 874 : 1090} Z" fill="${dark ? "#e8d5a3" : "#7f927f"}" opacity="${dark ? 0.3 : 0.2}" filter="url(#bespokeCareFiber)"/>
      <path d="M-18 ${compact ? 390 : 530} C180 ${compact ? 304 : 424} 356 ${compact ? 346 : 494} 558 ${compact ? 270 : 390} C744 ${compact ? 210 : 314} 906 ${compact ? 244 : 376} 1038 ${compact ? 334 : 490}" fill="none" stroke="${dark ? "#f4e0ae" : "#52675d"}" stroke-width="${compact ? 7 : 10}" stroke-linecap="round" opacity="${dark ? 0.24 : 0.16}"/>
      ${bespokeFoldedBag({ x: compact ? 122 : 132, y: compact ? 214 : 314, scale: compact ? 0.64 : 0.82, rotate: -4, dark })}
      ${bespokeCoveredMeal({ x: compact ? 356 : 410, y: compact ? 186 : 274, scale: compact ? 0.56 : 0.76, rotate: 3, dark })}
      ${bespokeBlankNote({ x: compact ? 658 : 780, y: compact ? 176 : 262, scale: compact ? 0.54 : 0.66, rotate: compact ? -6 : -4, dark })}
      ${bespokePhone({ x: compact ? 858 : 1002, y: compact ? 308 : 446, scale: compact ? 0.48 : 0.58, rotate: compact ? 4 : 2, opacity: dark ? 0.7 : 0.58 })}
      ${bespokeRouteThread({ x: compact ? 100 : 76, y: compact ? 654 : 816, scale: compact ? 0.72 : 0.96, dark, opacity: dark ? 0.46 : 0.34 })}
    </g>
  `;
}

function bespokeCarePanelSvg(panelId) {
  const dark = panelId === "front" || panelId === "back";
  const inside = panelId.startsWith("inside");
  const mirrored = panelId === "inside-right" || panelId === "back";
  const tableau = panelId === "front"
    ? bespokeCareTableau({ panelId, x: 84, y: 1036, scale: 1.16, opacity: 0.98 })
    : panelId === "back"
      ? bespokeCareTableau({ panelId, x: 1228, y: 1194, scale: 0.68, mirrored: true, opacity: 0.72, compact: true })
      : bespokeCareTableau({ panelId, x: mirrored ? 1294 : 168, y: 1328, scale: 0.58, mirrored, opacity: 0.68, compact: true });
  const sideRelief = inside
    ? `<path d="M238 252 C486 204 684 244 926 200 C1104 168 1236 184 1308 150" fill="none" stroke="#8c9a84" stroke-width="4" stroke-linecap="round" opacity="0.09"/>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${bespokeCareDefs({ dark })}
  ${bespokeCareBackground(panelId)}
  ${sideRelief}
  ${tableau}
  ${dark ? `<rect width="${width}" height="${height}" fill="#06100d" opacity="${panelId === "back" ? 0.18 : 0.1}"/>` : ""}
</svg>`;
}

function panelSvg(panelId) {
  if (process.env.CUSTOMCARD_LEGACY_PRACTICAL_CARE_ASSETS === "enabled") {
    return legacyPanelSvg(panelId);
  }
  if (process.env.CUSTOMCARD_LICENSED_PRACTICAL_CARE_ASSETS === "enabled") {
    const licensed = licensedPhotoPanelSvg(panelId);
    if (licensed) return licensed;
  }
  return bespokeCarePanelSvg(panelId) || premiumPanelSvg(panelId);
}

function legacyPanelSvg(panelId) {
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
