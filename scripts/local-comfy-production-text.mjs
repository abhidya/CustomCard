import { buildLocalComfyTypographyPlan } from "../src/panelTextLayoutPlanData.mjs";

const unusableEnvValues = new Set(["disabled", "example", "replace-me", "changeme", "dummy", "fake"]);

export function localComfyTypographyVariables({ panelId, panelCopy = {}, width, height }) {
  return buildLocalComfyTypographyPlan({ panelId, panelCopy, width, height });
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

export function localComfyWorkflowInputsForMetadata(env, variables, configuredInputsJson = "") {
  const defaults = localComfyWorkflowInputSummary(variables);
  const configured = localComfyConfiguredWorkflowInputs(env, variables, configuredInputsJson);
  if (!configured || Array.isArray(configured) || typeof configured !== "object") return defaults;
  return {
    ...defaults,
    ...configured
  };
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

function firstUsableConfigValue(value) {
  if (!value) return "";
  const normalized = String(value).trim();
  if (!normalized || unusableEnvValues.has(normalized.toLowerCase())) return "";
  return normalized;
}
