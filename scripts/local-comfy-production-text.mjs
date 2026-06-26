const unusableEnvValues = new Set(["disabled", "example", "replace-me", "changeme", "dummy", "fake"]);

export function localComfyTypographyVariables({ panelId, panelCopy = {}, width, height }) {
  const layout = panelCopy.text_layout || panelCopy.textLayout || {};
  const imageWidth = Math.max(1, Number(width || 960));
  const imageHeight = Math.max(1, Number(height || 1344));
  const scale = layout.scale === "large" ? 1.1 : layout.scale === "compact" ? 0.9 : 1;
  const fontPairing = layout.font_pairing || layout.fontPairing || "classic-serif";
  const lightInk = layout.color_mode === "light-ink" || layout.colorMode === "light-ink" || layout.color_mode === "high-contrast";
  const headlineBase = panelId === "front" ? 72 : panelId === "back" ? 42 : 54;
  const bodyBase = panelId === "front" ? 28 : panelId === "back" ? 22 : 26;
  const alignment = localComfyTextAlignment(layout.alignment);
  const headlineZone = layout.headline_zone || layout.headlineZone || (panelId === "front" ? "center" : "upper");
  const bodyZone = layout.body_zone || layout.bodyZone || (panelId === "front" ? "lower" : "center");
  const headlineBox = localComfyTextBox({ zone: headlineZone, role: "headline", width: imageWidth, height: imageHeight });
  const bodyBox = localComfyTextBox({ zone: bodyZone, role: "body", width: imageWidth, height: imageHeight });
  const textBoxBackgroundColor = localComfyTextBoxBackgroundColor({ panelId, lightInk });
  const textBoxBackgroundPadding = Math.max(16, Math.round(imageWidth * 0.025));
  const textBoxBackgroundRadius = Math.max(24, Math.round(imageWidth * 0.035));
  const textBoxBackgroundOpacity = 0.96;
  const textBoxBackgroundStyle = "text-hug";
  const artworkGuard = localComfyArtworkGuard({ panelId, lightInk, width: imageWidth, height: imageHeight });
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
    bodyBoxBackgroundOpacity: panelCopy.body ? textBoxBackgroundOpacity : 0,
    bodyBoxBackgroundStyle: panelCopy.body ? textBoxBackgroundStyle : "box",
    bodyFillColor: lightInk ? "#f4d77d" : "#4f432a",
    bodyFont: localComfyFontForPairing(fontPairing, "body"),
    bodyFontSize: Math.round(bodyBase * scale),
    bodyHorizontalAlignment: alignment,
    bodyLineSpacing: 6,
    bodyPadding: Math.max(32, Math.round(imageWidth * 0.08)),
    bodyStrokeColor: lightInk ? "#111715" : "#fff6df",
    bodyStrokeThickness: lightInk ? 0.06 : 0.02,
    bodyStrokeWidth: lightInk ? 2 : 1,
    bodyText: cleanComfyText(panelCopy.body || ""),
    bodyVerticalAlignment: localComfyBoxVerticalAlignment(bodyZone),
    bodyXShift: 0,
    bodyYShift: localComfyYShift(bodyZone, "body"),
    headlineBoxHeight: headlineBox.height,
    headlineBoxWidth: headlineBox.width,
    headlineBoxX: headlineBox.x,
    headlineBoxY: headlineBox.y,
    headlineBoxBackgroundColor: panelCopy.headline ? textBoxBackgroundColor : "",
    headlineBoxBackgroundPadding: panelCopy.headline ? textBoxBackgroundPadding : 0,
    headlineBoxBackgroundRadius: panelCopy.headline ? textBoxBackgroundRadius : 0,
    headlineBoxBackgroundOpacity: panelCopy.headline ? textBoxBackgroundOpacity : 0,
    headlineBoxBackgroundStyle: panelCopy.headline ? textBoxBackgroundStyle : "box",
    headlineFillColor: lightInk ? "#fff7df" : "#282923",
    headlineFont: localComfyFontForPairing(fontPairing, "headline"),
    headlineFontSize: Math.round(headlineBase * scale),
    headlineHorizontalAlignment: alignment,
    headlineLineSpacing: 8,
    headlinePadding: Math.max(32, Math.round(imageWidth * 0.08)),
    headlineStrokeColor: lightInk ? "#111715" : "#fff6df",
    headlineStrokeThickness: lightInk ? 0.08 : 0.03,
    headlineStrokeWidth: lightInk ? 2 : 1,
    headlineText: cleanComfyText(panelCopy.headline || ""),
    headlineVerticalAlignment: localComfyBoxVerticalAlignment(headlineZone),
    headlineXShift: 0,
    headlineYShift: localComfyYShift(headlineZone, "headline"),
    minFontSize: panelId === "back" ? 14 : 16,
    panelText: [cleanComfyText(panelCopy.headline || ""), cleanComfyText(panelCopy.body || "")].filter(Boolean).join("\n\n"),
    textAlignment: alignment,
    textCanvasHeight: imageHeight,
    textDebugBoxes: layout.debug_boxes === true || layout.debugBoxes === true
  };
}

export function localComfyWorkflowInputSummary(variables) {
  return {
    workflow_id: variables.workflowId || "",
    panel_id: variables.panelId,
    checkpoint: variables.checkpoint,
    width: variables.width,
    height: variables.height,
    steps: variables.steps,
    cfg: variables.cfg,
    sampler: variables.sampler,
    scheduler: variables.scheduler,
    seed: variables.seed,
    prompt: variables.prompt,
    negative_prompt: variables.negativePrompt || "",
    artwork_guard: {
      x: variables.artworkGuardX,
      y: variables.artworkGuardY,
      width: variables.artworkGuardWidth,
      height: variables.artworkGuardHeight
    },
    artwork_guard_color: variables.artworkGuardColor || "",
    artwork_guard_opacity: variables.artworkGuardOpacity || 0,
    artwork_guard_radius: variables.artworkGuardRadius || 0,
    artwork_guard_style: variables.artworkGuardStyle || "none",
    headline_text: variables.headlineText || "",
    body_text: variables.bodyText || "",
    headline_font_size: variables.headlineFontSize,
    body_font_size: variables.bodyFontSize,
    headline_box: {
      x: variables.headlineBoxX,
      y: variables.headlineBoxY,
      width: variables.headlineBoxWidth,
      height: variables.headlineBoxHeight
    },
    headline_box_background_color: variables.headlineBoxBackgroundColor || "",
    headline_box_background_padding: variables.headlineBoxBackgroundPadding || 0,
    headline_box_background_radius: variables.headlineBoxBackgroundRadius || 0,
    headline_box_background_opacity: variables.headlineBoxBackgroundOpacity ?? 1,
    headline_box_background_style: variables.headlineBoxBackgroundStyle || "box",
    body_box: {
      x: variables.bodyBoxX,
      y: variables.bodyBoxY,
      width: variables.bodyBoxWidth,
      height: variables.bodyBoxHeight
    },
    body_box_background_color: variables.bodyBoxBackgroundColor || "",
    body_box_background_padding: variables.bodyBoxBackgroundPadding || 0,
    body_box_background_radius: variables.bodyBoxBackgroundRadius || 0,
    body_box_background_opacity: variables.bodyBoxBackgroundOpacity ?? 1,
    body_box_background_style: variables.bodyBoxBackgroundStyle || "box",
    text_alignment: variables.textAlignment,
    min_font_size: variables.minFontSize
  };
}

export function localComfyWorkflowInputsForMetadata(env, variables) {
  const defaults = localComfyWorkflowInputSummary(variables);
  const configured = localComfyConfiguredWorkflowInputs(env, variables);
  if (!configured || Array.isArray(configured) || typeof configured !== "object") return defaults;
  return {
    ...defaults,
    ...configured
  };
}

export function localComfyConfiguredWorkflowInputs(env, variables) {
  const rawInputs = firstUsableEnv(env, ["CUSTOMCARD_COMFYUI_WORKFLOW_INPUTS_JSON", "COMFYUI_WORKFLOW_INPUTS_JSON"]);
  if (!rawInputs) return undefined;
  try {
    return interpolateLocalComfyTemplate(JSON.parse(rawInputs), variables);
  } catch {
    return undefined;
  }
}

export function interpolateLocalComfyTemplate(value, variables) {
  if (Array.isArray(value)) return value.map((item) => interpolateLocalComfyTemplate(item, variables));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, interpolateLocalComfyTemplate(nested, variables)]));
  }
  if (typeof value !== "string") return value;
  const exactMatch = value.match(/^\{\{\s*([a-zA-Z0-9_]+)\s*\}\}$/);
  if (exactMatch) {
    const exactValue = localComfyTemplateVariable(exactMatch[1], variables);
    if (exactValue !== undefined) return exactValue;
  }
  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const replacement = localComfyTemplateVariable(key, variables);
    return replacement === undefined ? "" : String(replacement);
  });
}

export function localComfyTemplateVariable(key, variables) {
  const values = {
    cfg: variables.cfg,
    checkpoint: variables.checkpoint,
    height: variables.height,
    negative_prompt: variables.negativePrompt || "",
    negativePrompt: variables.negativePrompt || "",
    panel_id: variables.panelId,
    panelId: variables.panelId,
    prompt: variables.prompt,
    sampler: variables.sampler,
    scheduler: variables.scheduler,
    seed: variables.seed,
    steps: variables.steps,
    width: variables.width,
    artwork_guard_x: variables.artworkGuardX || 0,
    artwork_guard_y: variables.artworkGuardY || 0,
    artwork_guard_width: variables.artworkGuardWidth || 1,
    artwork_guard_height: variables.artworkGuardHeight || 1,
    artwork_guard_color: variables.artworkGuardColor || "",
    artwork_guard_opacity: variables.artworkGuardOpacity || 0,
    artwork_guard_radius: variables.artworkGuardRadius || 0,
    artwork_guard_style: variables.artworkGuardStyle || "none",
    body_box_height: variables.bodyBoxHeight,
    body_box_width: variables.bodyBoxWidth,
    body_box_x: variables.bodyBoxX,
    body_box_y: variables.bodyBoxY,
    body_box_background_color: variables.bodyBoxBackgroundColor || "",
    body_box_background_padding: variables.bodyBoxBackgroundPadding || 0,
    body_box_background_radius: variables.bodyBoxBackgroundRadius || 0,
    body_box_background_opacity: variables.bodyBoxBackgroundOpacity ?? 1,
    body_box_background_style: variables.bodyBoxBackgroundStyle || "box",
    body_fill_color: variables.bodyFillColor,
    body_font: variables.bodyFont,
    body_font_size: variables.bodyFontSize,
    body_horizontal_alignment: variables.bodyHorizontalAlignment,
    body_line_spacing: variables.bodyLineSpacing,
    body_padding: variables.bodyPadding,
    body_stroke_color: variables.bodyStrokeColor,
    body_stroke_thickness: variables.bodyStrokeThickness,
    body_stroke_width: variables.bodyStrokeWidth,
    body_text: variables.bodyText || "",
    body_vertical_alignment: variables.bodyVerticalAlignment,
    body_x_shift: variables.bodyXShift,
    body_y_shift: variables.bodyYShift,
    headline_box_height: variables.headlineBoxHeight,
    headline_box_width: variables.headlineBoxWidth,
    headline_box_x: variables.headlineBoxX,
    headline_box_y: variables.headlineBoxY,
    headline_box_background_color: variables.headlineBoxBackgroundColor || "",
    headline_box_background_padding: variables.headlineBoxBackgroundPadding || 0,
    headline_box_background_radius: variables.headlineBoxBackgroundRadius || 0,
    headline_box_background_opacity: variables.headlineBoxBackgroundOpacity ?? 1,
    headline_box_background_style: variables.headlineBoxBackgroundStyle || "box",
    headline_fill_color: variables.headlineFillColor,
    headline_font: variables.headlineFont,
    headline_font_size: variables.headlineFontSize,
    headline_horizontal_alignment: variables.headlineHorizontalAlignment,
    headline_line_spacing: variables.headlineLineSpacing,
    headline_padding: variables.headlinePadding,
    headline_stroke_color: variables.headlineStrokeColor,
    headline_stroke_thickness: variables.headlineStrokeThickness,
    headline_stroke_width: variables.headlineStrokeWidth,
    headline_text: variables.headlineText || "",
    headline_vertical_alignment: variables.headlineVerticalAlignment,
    headline_x_shift: variables.headlineXShift,
    headline_y_shift: variables.headlineYShift,
    min_font_size: variables.minFontSize,
    panel_text: variables.panelText || "",
    text_alignment: variables.textAlignment,
    text_canvas_height: variables.textCanvasHeight,
    text_debug_boxes: variables.textDebugBoxes,
    workflow_id: variables.workflowId || "",
    workflowId: variables.workflowId || ""
  };
  return values[key];
}

function localComfyTextBoxBackgroundColor({ panelId, lightInk }) {
  if (panelId === "back") return "";
  return lightInk ? "#111715" : "#fff6df";
}

function localComfyArtworkGuard({ panelId, lightInk, width, height }) {
  const imageWidth = Math.max(1, Number(width || 960));
  const imageHeight = Math.max(1, Number(height || 1344));
  if (panelId === "back") {
    return {
      x: 0,
      y: 0,
      width: imageWidth,
      height: imageHeight,
      color: "#111715",
      opacity: 0.94,
      radius: 0,
      style: "box"
    };
  }
  if (panelId === "front") {
    return {
      x: Math.round(imageWidth * 0.08),
      y: Math.round(imageHeight * 0.2),
      width: Math.round(imageWidth * 0.84),
      height: Math.round(imageHeight * 0.64),
      color: lightInk ? "#111715" : "#fff6df",
      opacity: 0.66,
      radius: Math.round(imageWidth * 0.045),
      style: "box"
    };
  }
  return {
    x: Math.round(imageWidth * 0.09),
    y: Math.round(imageHeight * 0.14),
    width: Math.round(imageWidth * 0.82),
    height: Math.round(imageHeight * 0.72),
    color: "#fff6df",
    opacity: 0.74,
    radius: Math.round(imageWidth * 0.055),
    style: "box"
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

function localComfyTextAlignment(value) {
  return ["left", "center", "right"].includes(value) ? value : "center";
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

function cleanComfyText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function firstUsableEnv(env, keys) {
  for (const key of keys) {
    const value = env[key];
    if (!value) continue;
    const normalized = String(value).trim();
    if (!normalized || unusableEnvValues.has(normalized.toLowerCase())) continue;
    return normalized;
  }
  return "";
}
