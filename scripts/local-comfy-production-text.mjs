import { buildLocalComfyTypographyPlan } from "../src/panelTextLayoutPlanData.mjs";

const unusableEnvValues = new Set(["disabled", "example", "replace-me", "changeme", "dummy", "fake"]);

export function localComfyTypographyVariables({ panelId, panelCopy = {}, width, height }) {
  return buildLocalComfyTypographyPlan({ panelId, panelCopy, width, height });
}

export function localComfyWorkflowInputSummary(variables) {
  const artworkGuard = localComfySafeArtworkGuard(variables);
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
      x: artworkGuard.x,
      y: artworkGuard.y,
      width: artworkGuard.width,
      height: artworkGuard.height
    },
    artwork_guard_color: artworkGuard.color,
    artwork_guard_opacity: artworkGuard.opacity,
    artwork_guard_radius: artworkGuard.radius,
    artwork_guard_style: artworkGuard.style,
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

export function localComfyWorkflowInputsForMetadata(env, variables, configuredInputsJson = "") {
  const defaults = localComfyWorkflowInputSummary(variables);
  const configured = localComfyConfiguredWorkflowInputs(env, variables, configuredInputsJson);
  if (!configured || Array.isArray(configured) || typeof configured !== "object") return defaults;
  return localComfyWorkflowInputsWithSafeGuard({
    ...defaults,
    ...configured
  }, defaults);
}

export function localComfyConfiguredWorkflowInputs(env, variables, configuredInputsJson = "") {
  const rawInputs = firstUsableConfigValue(configuredInputsJson);
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
  const artworkGuard = localComfySafeArtworkGuard(variables);
  const values = {
    cfg: variables.cfg,
    checkpoint: variables.checkpoint,
    client_id: variables.clientId || "",
    clientId: variables.clientId || "",
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
    artwork_guard_x: artworkGuard.x,
    artwork_guard_y: artworkGuard.y,
    artwork_guard_width: artworkGuard.width,
    artwork_guard_height: artworkGuard.height,
    artwork_guard_color: artworkGuard.color,
    artwork_guard_opacity: artworkGuard.opacity,
    artwork_guard_radius: artworkGuard.radius,
    artwork_guard_style: artworkGuard.style,
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

export function localComfySafeArtworkGuard(variables = {}) {
  const imageWidth = boundedDimension(variables.width, 960);
  const imageHeight = boundedDimension(variables.height, 1344);
  const guard = {
    x: boundedCoordinate(variables.artworkGuardX, 0, imageWidth - 1, 0),
    y: boundedCoordinate(variables.artworkGuardY, 0, imageHeight - 1, 0),
    width: boundedCoordinate(variables.artworkGuardWidth, 1, imageWidth, 1),
    height: boundedCoordinate(variables.artworkGuardHeight, 1, imageHeight, 1),
    color: variables.artworkGuardColor || "",
    opacity: boundedNumber(variables.artworkGuardOpacity, 0, 1, 0),
    radius: boundedCoordinate(variables.artworkGuardRadius, 0, Math.max(imageWidth, imageHeight), 0),
    style: variables.artworkGuardStyle || "none"
  };
  guard.width = Math.min(guard.width, imageWidth - guard.x);
  guard.height = Math.min(guard.height, imageHeight - guard.y);

  const areaRatio = (guard.width * guard.height) / Math.max(1, imageWidth * imageHeight);
  const touchesAllEdges = guard.x <= 0 && guard.y <= 0 && guard.x + guard.width >= imageWidth && guard.y + guard.height >= imageHeight;
  if (guard.opacity < 0.5 || (!touchesAllEdges && areaRatio < 0.9)) return guard;

  const recovered = localComfyGuardFromTextBoxes(variables, imageWidth, imageHeight);
  return {
    ...guard,
    ...recovered,
    opacity: 0.74,
    radius: guard.radius || Math.max(20, Math.round(imageWidth * 0.035))
  };
}

function localComfyGuardFromTextBoxes(variables, imageWidth, imageHeight) {
  const boxes = [
    variables.headlineText ? boxFromVariables(variables, "headline") : undefined,
    variables.bodyText ? boxFromVariables(variables, "body") : undefined
  ].filter(Boolean);
  const insetX = Math.max(24, Math.round(imageWidth * 0.08));
  if (boxes.length === 0) {
    return {
      x: insetX,
      y: Math.max(24, Math.round(imageHeight * 0.12)),
      width: Math.max(1, imageWidth - insetX * 2),
      height: Math.max(1, Math.round(imageHeight * 0.5))
    };
  }
  const padY = Math.max(24, Math.round(imageHeight * 0.04));
  const top = Math.min(...boxes.map((box) => box.y));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  const y = Math.max(0, top - padY);
  return {
    x: insetX,
    y,
    width: Math.max(1, imageWidth - insetX * 2),
    height: Math.max(1, Math.min(Math.round(imageHeight * 0.7), bottom + Math.round(padY * 0.5) - y))
  };
}

function boxFromVariables(variables, prefix) {
  const key = (suffix) => `${prefix}Box${suffix}`;
  const x = Number(variables[key("X")]);
  const y = Number(variables[key("Y")]);
  const width = Number(variables[key("Width")]);
  const height = Number(variables[key("Height")]);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return undefined;
  return { x, y, width, height };
}

function boundedDimension(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.max(1, Math.round(numeric));
}

function boundedCoordinate(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(Math.round(numeric), min), max);
}

function boundedNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(numeric, min), max);
}

function localComfyWorkflowInputsWithSafeGuard(inputs, defaults) {
  const guard = inputs.artwork_guard && typeof inputs.artwork_guard === "object" && !Array.isArray(inputs.artwork_guard)
    ? inputs.artwork_guard
    : undefined;
  if (!guard) return inputs;
  const imageWidth = boundedDimension(inputs.width, boundedDimension(defaults.width, 960));
  const imageHeight = boundedDimension(inputs.height, boundedDimension(defaults.height, 1344));
  const x = boundedCoordinate(guard.x, 0, imageWidth - 1, 0);
  const y = boundedCoordinate(guard.y, 0, imageHeight - 1, 0);
  const width = Math.min(boundedCoordinate(guard.width, 1, imageWidth, 1), imageWidth - x);
  const height = Math.min(boundedCoordinate(guard.height, 1, imageHeight, 1), imageHeight - y);
  const opacity = boundedNumber(inputs.artwork_guard_opacity, 0, 1, 0);
  const areaRatio = (width * height) / Math.max(1, imageWidth * imageHeight);
  const touchesAllEdges = x <= 0 && y <= 0 && x + width >= imageWidth && y + height >= imageHeight;
  if (opacity < 0.5 || (!touchesAllEdges && areaRatio < 0.9)) return inputs;

  return {
    ...inputs,
    artwork_guard: defaults.artwork_guard,
    artwork_guard_opacity: Math.min(boundedNumber(defaults.artwork_guard_opacity, 0, 1, 0.74), 0.74),
    artwork_guard_radius: defaults.artwork_guard_radius,
    artwork_guard_style: defaults.artwork_guard_style
  };
}

function firstUsableConfigValue(value) {
  if (!value) return "";
  const normalized = String(value).trim();
  if (!normalized || unusableEnvValues.has(normalized.toLowerCase())) return "";
  return normalized;
}
