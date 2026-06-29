export const panelTextLayoutEnums = {
  headline_zone: ["top", "upper", "center", "lower"],
  body_zone: ["upper", "center", "lower", "bottom"],
  alignment: ["left", "center", "right"],
  font_pairing: ["serif-sans", "bold-editorial", "minimal-sans", "soft-serif"],
  color_mode: ["dark-ink", "light-ink", "accent-ink", "high-contrast"],
  scale: ["compact", "standard", "large"]
};

export const panelTextLayoutDefaults = {
  front: {
    headline_zone: "upper",
    body_zone: "lower",
    alignment: "center",
    font_pairing: "serif-sans",
    color_mode: "dark-ink",
    scale: "standard"
  },
  "inside-left": {
    headline_zone: "upper",
    body_zone: "center",
    alignment: "center",
    font_pairing: "soft-serif",
    color_mode: "dark-ink",
    scale: "standard"
  },
  "inside-right": {
    headline_zone: "upper",
    body_zone: "center",
    alignment: "center",
    font_pairing: "serif-sans",
    color_mode: "dark-ink",
    scale: "standard"
  },
  back: {
    headline_zone: "lower",
    body_zone: "bottom",
    alignment: "center",
    font_pairing: "minimal-sans",
    color_mode: "dark-ink",
    scale: "compact"
  }
};

const comfyPanelDefaults = {
  front: {
    ...panelTextLayoutDefaults.front,
    headline_zone: "center"
  },
  "inside-left": panelTextLayoutDefaults["inside-left"],
  "inside-right": panelTextLayoutDefaults["inside-right"],
  back: panelTextLayoutDefaults.back
};

const sourceMatchers = {
  boldType: /\b(bold type|bold-type|poster|editorial)\b/,
  photoNote: /\b(photo note|photo-note|scrapbook|caption|polaroid)\b/,
  sympathy: /\b(sympathy|condolence|loss|grieving|grief|quiet support)\b/,
  medical: /\b(med|medical|doctor|physician|md|residen(?:cy|t)|white[- ]coat|stethoscope)\b/
};

const renderFontPairings = {
  "serif-sans": {
    headlineFont: "Georgia, serif",
    bodyFont: "Arial, sans-serif",
    headlineSize: 92,
    bodySize: 54,
    headlineWeight: 700,
    headlineChars: 24,
    bodyChars: 34
  },
  "bold-editorial": {
    headlineFont: "Helvetica, Arial, sans-serif",
    bodyFont: "Helvetica, Arial, sans-serif",
    headlineSize: 132,
    bodySize: 58,
    headlineWeight: 800,
    headlineChars: 15,
    bodyChars: 34
  },
  "minimal-sans": {
    headlineFont: "Helvetica, Arial, sans-serif",
    bodyFont: "Arial, sans-serif",
    headlineSize: 82,
    bodySize: 50,
    headlineWeight: 600,
    headlineChars: 24,
    bodyChars: 34
  },
  "soft-serif": {
    headlineFont: "Georgia, serif",
    bodyFont: "Georgia, serif",
    headlineSize: 86,
    bodySize: 52,
    headlineWeight: 700,
    headlineChars: 24,
    bodyChars: 34
  }
};

const previewFontPairings = {
  "serif-sans": {
    headlineFont: "Georgia, Times New Roman, serif",
    bodyFont: "Inter, Arial, sans-serif",
    headlineSize: 82,
    bodySize: 38,
    headlineWeight: 700,
    headlineChars: 24,
    bodyChars: 44
  },
  "bold-editorial": {
    headlineFont: "Inter, Arial, sans-serif",
    bodyFont: "Inter, Arial, sans-serif",
    headlineSize: 116,
    bodySize: 42,
    headlineWeight: 800,
    headlineChars: 16,
    bodyChars: 34
  },
  "minimal-sans": {
    headlineFont: "Inter, Arial, sans-serif",
    bodyFont: "Inter, Arial, sans-serif",
    headlineSize: 70,
    bodySize: 34,
    headlineWeight: 600,
    headlineChars: 28,
    bodyChars: 48
  },
  "soft-serif": {
    headlineFont: "Georgia, Times New Roman, serif",
    bodyFont: "Georgia, Times New Roman, serif",
    headlineSize: 76,
    bodySize: 36,
    headlineWeight: 700,
    headlineChars: 26,
    bodyChars: 42
  }
};

export function normalizePanelTextLayout(value, { panelId = "front", sourceText = "", fallback } = {}) {
  const raw = value && typeof value === "object" ? value : {};
  const selectedFallback = fallback ?? panelTextLayoutFallbackForSource(panelId, sourceText);
  if (panelTextLayoutTooGenericForSource(raw, panelId, sourceText)) return selectedFallback;
  const layout = {
    headline_zone: enumValue(readLayoutValue(raw, "headline_zone", "headlineZone"), panelTextLayoutEnums.headline_zone, selectedFallback.headline_zone),
    body_zone: enumValue(readLayoutValue(raw, "body_zone", "bodyZone"), panelTextLayoutEnums.body_zone, selectedFallback.body_zone),
    alignment: enumValue(readLayoutValue(raw, "alignment"), panelTextLayoutEnums.alignment, selectedFallback.alignment),
    font_pairing: enumValue(readLayoutValue(raw, "font_pairing", "fontPairing"), panelTextLayoutEnums.font_pairing, selectedFallback.font_pairing),
    color_mode: enumValue(readLayoutValue(raw, "color_mode", "colorMode"), panelTextLayoutEnums.color_mode, selectedFallback.color_mode),
    scale: enumValue(readLayoutValue(raw, "scale"), panelTextLayoutEnums.scale, selectedFallback.scale)
  };

  const source = normalizeSourceText(sourceText);
  if (
    sourceMatchers.medical.test(source) &&
    (panelId === "inside-left" || panelId === "inside-right") &&
    layout.alignment === "center"
  ) {
    return { ...layout, alignment: selectedFallback.alignment };
  }
  if (sourceMatchers.sympathy.test(source)) {
    if (panelId === "inside-left" || panelId === "inside-right") {
      return {
        ...layout,
        headline_zone: selectedFallback.headline_zone,
        body_zone: selectedFallback.body_zone,
        alignment: selectedFallback.alignment,
        font_pairing: selectedFallback.font_pairing,
        color_mode: "dark-ink",
        scale: "large"
      };
    }
    if (panelId === "front") {
      return {
        ...layout,
        headline_zone: selectedFallback.headline_zone,
        body_zone: selectedFallback.body_zone,
        font_pairing: selectedFallback.font_pairing,
        color_mode: selectedFallback.color_mode,
        scale: "large"
      };
    }
    if (panelId === "back") return { ...selectedFallback, scale: "large" };
  }
  return layout;
}

export function panelTextLayoutFallbackForSource(panelId = "front", sourceText = "") {
  const source = normalizeSourceText(sourceText);
  if (!sourceMatchers.sympathy.test(source) && sourceMatchers.boldType.test(source)) {
    return {
      headline_zone: panelId === "back" ? "lower" : "upper",
      body_zone: panelId === "front" ? "lower" : panelId === "back" ? "bottom" : "center",
      alignment: "center",
      font_pairing: "bold-editorial",
      color_mode: "high-contrast",
      scale: panelId === "back" ? "compact" : "large"
    };
  }
  if (sourceMatchers.photoNote.test(source)) {
    return {
      headline_zone: panelId === "front" ? "lower" : "upper",
      body_zone: panelId === "front" ? "bottom" : "lower",
      alignment: "left",
      font_pairing: "soft-serif",
      color_mode: "dark-ink",
      scale: panelId === "back" ? "compact" : "standard"
    };
  }
  if (sourceMatchers.sympathy.test(source)) {
    const layouts = {
      front: {
        headline_zone: "upper",
        body_zone: "upper",
        alignment: "center",
        font_pairing: "soft-serif",
        color_mode: "light-ink",
        scale: "standard"
      },
      "inside-left": {
        headline_zone: "upper",
        body_zone: "center",
        alignment: "center",
        font_pairing: "soft-serif",
        color_mode: "dark-ink",
        scale: "large"
      },
      "inside-right": {
        headline_zone: "upper",
        body_zone: "center",
        alignment: "center",
        font_pairing: "soft-serif",
        color_mode: "dark-ink",
        scale: "large"
      },
      back: {
        headline_zone: "upper",
        body_zone: "center",
        alignment: "center",
        font_pairing: "soft-serif",
        color_mode: "light-ink",
        scale: "standard"
      }
    };
    return layouts[panelId] ?? layouts.front;
  }
  if (sourceMatchers.medical.test(source)) {
    const layouts = {
      front: {
        headline_zone: "upper",
        body_zone: "lower",
        alignment: "center",
        font_pairing: "serif-sans",
        color_mode: "light-ink",
        scale: "standard"
      },
      "inside-left": {
        headline_zone: "upper",
        body_zone: "center",
        alignment: "left",
        font_pairing: "soft-serif",
        color_mode: "dark-ink",
        scale: "standard"
      },
      "inside-right": {
        headline_zone: "upper",
        body_zone: "center",
        alignment: "left",
        font_pairing: "serif-sans",
        color_mode: "dark-ink",
        scale: "standard"
      },
      back: {
        headline_zone: "lower",
        body_zone: "bottom",
        alignment: "center",
        font_pairing: "minimal-sans",
        color_mode: "dark-ink",
        scale: "compact"
      }
    };
    return layouts[panelId] ?? layouts.front;
  }
  return panelTextLayoutDefaults[panelId] ?? panelTextLayoutDefaults.front;
}

export function buildPanelTextLayoutPlan({
  panelId = "front",
  textLayout,
  headlineFormat,
  bodyFormat,
  accent = "#315b7d",
  hasArtwork = false,
  imageFrame = "fill",
  rtl = false,
  styleId = "botanical",
  legacyLayout = {},
  fontSystem = "render"
} = {}) {
  const layout = textLayout ? normalizePanelTextLayout(textLayout, { panelId }) : undefined;
  const headlineBold = Boolean(headlineFormat?.bold);
  const headlineItalic = Boolean(headlineFormat?.italic);
  const headlineAccent = Boolean(headlineFormat?.accent);
  const bodyBold = Boolean(bodyFormat?.bold);
  const bodyItalic = Boolean(bodyFormat?.italic);
  const bodyAccent = Boolean(bodyFormat?.accent);

  if (!layout) {
    const photoWindow = imageFrame === "photo-window";
    const anchor = photoWindow ? "middle" : rtl ? "end" : "start";
    const x = photoWindow ? 750 : rtl ? 1240 : 260;
    const headlineFill = hasArtwork && imageFrame === "fill" ? "#ffffff" : legacyLayout.textFill;
    const bodyFill = hasArtwork && imageFrame === "fill" ? "rgba(255,255,255,0.92)" : legacyLayout.bodyFill;
    return {
      x,
      anchor,
      headlineFont: legacyLayout.headlineFont,
      headlineSize: legacyLayout.headlineSize,
      headlineWeight: headlineBold ? Math.max(legacyLayout.headlineWeight, 800) : legacyLayout.headlineWeight,
      headlineStyle: headlineItalic ? "italic" : "normal",
      headlineLeading: legacyLayout.headlineLeading,
      headlineY: photoWindow ? 1280 : legacyLayout.headlineY,
      headlineFill: headlineAccent ? accent : headlineFill,
      headlineMaxChars: styleId === "bold-type" ? 14 : 24,
      headlineMaxLines: 3,
      bodyFont: fontSystem === "preview" ? "Inter, Arial, sans-serif" : "Arial, sans-serif",
      bodySize: legacyLayout.bodySize ?? 54,
      bodyWeight: bodyBold ? 700 : 400,
      bodyStyle: bodyItalic ? "italic" : "normal",
      bodyLeading: legacyLayout.bodyLeading ?? 74,
      bodyY: photoWindow ? 1520 : legacyLayout.bodyY,
      bodyFill: bodyAccent ? accent : bodyFill,
      bodyMaxChars: legacyLayout.bodyMaxChars ?? 34,
      bodyMaxLines: legacyLayout.bodyMaxLines ?? 8,
      layout: undefined
    };
  }

  const font = fontPairingPreset(layout.font_pairing, fontSystem);
  const scale = scalePreset(layout.scale, fontSystem);
  const headlineSize = Math.round(font.headlineSize * scale);
  const bodySize = Math.round(font.bodySize * scale);
  const colors = colorPreset(layout, legacyLayout, accent, hasArtwork, styleId);
  return {
    x: xForAlignment(layout.alignment),
    anchor: anchorForAlignment(layout.alignment),
    headlineFont: font.headlineFont,
    headlineSize,
    headlineWeight: headlineBold ? Math.max(font.headlineWeight, 800) : font.headlineWeight,
    headlineStyle: headlineItalic ? "italic" : "normal",
    headlineLeading: Math.round(headlineSize * (fontSystem === "preview" ? 1.08 : 1.18)),
    headlineY: yForHeadlineZone(layout.headline_zone),
    headlineFill: headlineAccent ? accent : colors.headline,
    headlineMaxChars: maxCharsForScale(layout.scale, font.headlineChars, "headline", fontSystem),
    headlineMaxLines: layout.scale === "large" ? 2 : 3,
    bodyFont: font.bodyFont,
    bodySize,
    bodyWeight: bodyBold ? 700 : fontSystem === "preview" ? 500 : 400,
    bodyStyle: bodyItalic ? "italic" : "normal",
    bodyLeading: Math.round(bodySize * (fontSystem === "preview" ? 1.25 : 1.38)),
    bodyY: yForBodyZone(layout.body_zone),
    bodyFill: bodyAccent ? accent : colors.body,
    bodyMaxChars: maxCharsForScale(layout.scale, font.bodyChars, "body", fontSystem),
    bodyMaxLines: layout.scale === "large" && fontSystem !== "preview" ? 7 : legacyLayout.bodyMaxLines ?? 8,
    layout
  };
}

export function buildLocalComfyTypographyPlan({ panelId = "front", panelCopy = {}, width, height } = {}) {
  const imageWidth = Math.max(1, Number(width || 960));
  const imageHeight = Math.max(1, Number(height || 1344));
  const layout = normalizePanelTextLayout(panelCopy.text_layout || panelCopy.textLayout, {
    panelId,
    fallback: comfyPanelDefaults[panelId] ?? comfyPanelDefaults.front
  });
  const scale = layout.scale === "large" ? 1.1 : layout.scale === "compact" ? 0.9 : 1;
  const lightInk = layout.color_mode === "light-ink" || layout.color_mode === "high-contrast";
  const headlineBase = panelId === "front" ? 72 : panelId === "back" ? 42 : 54;
  const bodyBase = panelId === "front" ? 28 : panelId === "back" ? 22 : 26;
  const headlineBox = localComfyTextBox({ zone: layout.headline_zone, role: "headline", width: imageWidth, height: imageHeight });
  const bodyBox = localComfyTextBox({ zone: layout.body_zone, role: "body", width: imageWidth, height: imageHeight });
  const textBoxBackgroundColor = localComfyTextBoxBackgroundColor({ panelId, lightInk });
  const textBoxBackgroundPadding = Math.max(16, Math.round(imageWidth * 0.025));
  const textBoxBackgroundRadius = Math.max(24, Math.round(imageWidth * 0.035));
  const artworkGuard = localComfyArtworkGuard({
    panelId,
    lightInk,
    width: imageWidth,
    height: imageHeight,
    headlineBox,
    bodyBox,
    hasHeadline: Boolean(panelCopy.headline),
    hasBody: Boolean(panelCopy.body)
  });
  return {
    artworkGuardColor: artworkGuard.color,
    artworkGuardHeight: artworkGuard.height,
    artworkGuardOpacity: artworkGuard.opacity,
    artworkGuardRadius: artworkGuard.radius,
    artworkGuardStyle: artworkGuard.style,
    artworkGuardWidth: artworkGuard.width,
    artworkGuardX: artworkGuard.x,
    artworkGuardY: artworkGuard.y,
    bodyBoxHeight: bodyBox.height,
    bodyBoxWidth: bodyBox.width,
    bodyBoxX: bodyBox.x,
    bodyBoxY: bodyBox.y,
    bodyBoxBackgroundColor: panelCopy.body ? textBoxBackgroundColor : "",
    bodyBoxBackgroundPadding: panelCopy.body ? textBoxBackgroundPadding : 0,
    bodyBoxBackgroundRadius: panelCopy.body ? textBoxBackgroundRadius : 0,
    bodyBoxBackgroundOpacity: panelCopy.body ? 0.96 : 0,
    bodyBoxBackgroundStyle: panelCopy.body ? "text-hug" : "box",
    bodyFillColor: lightInk ? "#f4d77d" : "#4f432a",
    bodyFont: localComfyFontForPairing(layout.font_pairing, "body"),
    bodyFontSize: Math.round(bodyBase * scale),
    bodyHorizontalAlignment: layout.alignment,
    bodyLineSpacing: 6,
    bodyPadding: Math.max(32, Math.round(imageWidth * 0.08)),
    bodyStrokeColor: lightInk ? "#111715" : "#fff6df",
    bodyStrokeThickness: lightInk ? 0.06 : 0.02,
    bodyStrokeWidth: lightInk ? 2 : 1,
    bodyText: cleanPanelText(panelCopy.body || ""),
    bodyVerticalAlignment: localComfyBoxVerticalAlignment(layout.body_zone),
    bodyXShift: 0,
    bodyYShift: localComfyYShift(layout.body_zone, "body"),
    headlineBoxHeight: headlineBox.height,
    headlineBoxWidth: headlineBox.width,
    headlineBoxX: headlineBox.x,
    headlineBoxY: headlineBox.y,
    headlineBoxBackgroundColor: panelCopy.headline ? textBoxBackgroundColor : "",
    headlineBoxBackgroundPadding: panelCopy.headline ? textBoxBackgroundPadding : 0,
    headlineBoxBackgroundRadius: panelCopy.headline ? textBoxBackgroundRadius : 0,
    headlineBoxBackgroundOpacity: panelCopy.headline ? 0.96 : 0,
    headlineBoxBackgroundStyle: panelCopy.headline ? "text-hug" : "box",
    headlineFillColor: lightInk ? "#fff7df" : "#282923",
    headlineFont: localComfyFontForPairing(layout.font_pairing, "headline"),
    headlineFontSize: Math.round(headlineBase * scale),
    headlineHorizontalAlignment: layout.alignment,
    headlineLineSpacing: 8,
    headlinePadding: Math.max(32, Math.round(imageWidth * 0.08)),
    headlineStrokeColor: lightInk ? "#111715" : "#fff6df",
    headlineStrokeThickness: lightInk ? 0.08 : 0.03,
    headlineStrokeWidth: lightInk ? 2 : 1,
    headlineText: cleanPanelText(panelCopy.headline || ""),
    headlineVerticalAlignment: localComfyBoxVerticalAlignment(layout.headline_zone),
    headlineXShift: 0,
    headlineYShift: localComfyYShift(layout.headline_zone, "headline"),
    minFontSize: panelId === "back" ? 14 : 16,
    panelText: [cleanPanelText(panelCopy.headline || ""), cleanPanelText(panelCopy.body || "")].filter(Boolean).join("\n\n"),
    textAlignment: layout.alignment,
    textCanvasHeight: imageHeight,
    textDebugBoxes: panelCopy.text_layout?.debug_boxes === true || panelCopy.textLayout?.debugBoxes === true
  };
}

export function sourceTextFromCardInput(input = {}) {
  return [
    input.occasion,
    input.tone,
    input.style,
    input.personal_note ?? input.personalNote,
    ...(Array.isArray(input.memory_notes) ? input.memory_notes : Array.isArray(input.memoryNotes) ? input.memoryNotes : [])
  ]
    .filter(Boolean)
    .join(" ");
}

export function cleanPanelText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function panelTextLayoutTooGenericForSource(raw, panelId, sourceText) {
  const source = normalizeSourceText(sourceText);
  if (!sourceMatchers.medical.test(source)) return false;
  const defaults = panelTextLayoutDefaults[panelId] ?? panelTextLayoutDefaults.front;
  return (
    readLayoutValue(raw, "headline_zone", "headlineZone") === defaults.headline_zone &&
    readLayoutValue(raw, "body_zone", "bodyZone") === defaults.body_zone &&
    readLayoutValue(raw, "alignment") === defaults.alignment &&
    readLayoutValue(raw, "font_pairing", "fontPairing") === defaults.font_pairing &&
    readLayoutValue(raw, "color_mode", "colorMode") === defaults.color_mode &&
    readLayoutValue(raw, "scale") === defaults.scale
  );
}

function enumValue(value, allowed, fallback) {
  const normalized = cleanPanelText(value).toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function readLayoutValue(raw, key, camelKey = key) {
  return raw?.[key] ?? raw?.[camelKey];
}

function normalizeSourceText(sourceText) {
  return cleanPanelText(sourceText).toLowerCase();
}

function fontPairingPreset(fontPairing, fontSystem) {
  const presets = fontSystem === "preview" ? previewFontPairings : renderFontPairings;
  return presets[fontPairing] ?? presets["serif-sans"];
}

function scalePreset(scale, fontSystem) {
  if (scale === "compact") return 0.86;
  if (scale === "large") return fontSystem === "preview" ? 1.14 : 1.14;
  return 1;
}

function colorPreset(textLayout, legacyLayout, accent, hasArtwork, styleId) {
  if (textLayout.color_mode === "light-ink") {
    if (hasArtwork || styleId === "bold-type") return { headline: "#ffffff", body: "#f7f1df" };
    return { headline: legacyLayout.textFill, body: legacyLayout.bodyFill };
  }
  if (textLayout.color_mode === "accent-ink") return { headline: accent, body: legacyLayout.bodyFill };
  if (textLayout.color_mode === "high-contrast") {
    if (hasArtwork || styleId === "bold-type") return { headline: "#ffffff", body: "#ffffff" };
    return { headline: "#0e1116", body: "#151a21" };
  }
  return { headline: legacyLayout.textFill, body: legacyLayout.bodyFill };
}

function maxCharsForScale(scale, base, role, fontSystem) {
  if (scale === "compact") return base + 6;
  if (scale !== "large") return base;
  const floor = fontSystem === "preview" && role === "body" ? 28 : 12;
  return Math.max(floor, base - (role === "body" && fontSystem === "preview" ? 6 : 5));
}

function xForAlignment(alignment) {
  if (alignment === "center") return 750;
  if (alignment === "right") return 1240;
  return 260;
}

function anchorForAlignment(alignment) {
  if (alignment === "center") return "middle";
  if (alignment === "right") return "end";
  return "start";
}

function yForHeadlineZone(zone) {
  return { top: 290, upper: 470, center: 860, lower: 1280 }[zone] ?? 470;
}

function yForBodyZone(zone) {
  return { upper: 650, center: 930, lower: 1320, bottom: 1660 }[zone] ?? 930;
}

function localComfyTextBoxBackgroundColor({ panelId, lightInk }) {
  if (panelId === "back") return "";
  return lightInk ? "#111715" : "#fff6df";
}

function localComfyArtworkGuard({ panelId, lightInk, width, height, headlineBox, bodyBox, hasHeadline, hasBody }) {
  const imageWidth = Math.max(1, Number(width || 960));
  const imageHeight = Math.max(1, Number(height || 1344));
  const boxes = [
    hasHeadline ? headlineBox : undefined,
    hasBody ? bodyBox : undefined
  ].filter(Boolean);
  if (boxes.length === 0) return { x: 0, y: 0, width: 1, height: 1, color: "", opacity: 0, radius: 0, style: "none" };

  const insetX = Math.max(24, Math.round(imageWidth * 0.08));
  const padY = Math.max(32, Math.round(imageHeight * 0.08));
  const top = Math.min(...boxes.map((box) => box.y));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  const x = Math.max(0, insetX);
  const y = Math.max(0, top - padY);
  const right = Math.min(imageWidth, imageWidth - insetX);
  const bottomWithPadding = Math.min(imageHeight, bottom + Math.round(padY * 0.5));
  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottomWithPadding - y),
    color: lightInk ? "#111715" : "#fff6df",
    opacity: 0.74,
    radius: Math.max(20, Math.round(imageWidth * 0.035)),
    style: panelId === "back" ? "box" : "panel"
  };
}

function localComfyFontForPairing(pairing, role) {
  if (pairing === "bold-editorial") return role === "headline" ? "arialbd.ttf" : "arial.ttf";
  if (pairing === "minimal-sans") return "arial.ttf";
  return "georgia.ttf";
}

function localComfyTextBox({ zone, role, width, height }) {
  const normalizedZone = ["top", "upper", "center", "lower", "bottom"].includes(zone) ? zone : "center";
  const marginX = Math.max(56, Math.round(Number(width) * (role === "body" ? 0.11 : 0.09)));
  const boxWidth = Math.max(1, Number(width) - marginX * 2);
  const specs =
    role === "headline"
      ? {
          top: { y: 0.07, height: 0.18 },
          upper: { y: 0.1, height: 0.2 },
          center: { y: 0.28, height: 0.22 },
          lower: { y: 0.6, height: 0.2 },
          bottom: { y: 0.72, height: 0.17 }
        }
      : {
          top: { y: 0.2, height: 0.36 },
          upper: { y: 0.24, height: 0.34 },
          center: { y: 0.37, height: 0.36 },
          lower: { y: 0.58, height: 0.3 },
          bottom: { y: 0.68, height: 0.22 }
        };
  const spec = specs[normalizedZone] || specs.center;
  return {
    x: marginX,
    y: Math.max(0, Math.round(Number(height) * spec.y)),
    width: boxWidth,
    height: Math.max(1, Math.round(Number(height) * spec.height))
  };
}

function localComfyBoxVerticalAlignment(zone) {
  if (zone === "top") return "top";
  if (zone === "bottom") return "bottom";
  return "middle";
}

function localComfyYShift(zone, role) {
  if (zone === "top") return 32;
  if (zone === "upper") return role === "headline" ? 92 : 122;
  if (zone === "lower") return role === "headline" ? -122 : -104;
  if (zone === "bottom") return role === "headline" ? -92 : -56;
  return role === "headline" ? -72 : 88;
}
