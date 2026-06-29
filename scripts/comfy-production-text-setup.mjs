import { basename, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

export const productionTextWorkflowId = "customcard-production-text-overlay";
export const productionTextWorkflowRelativePath = "comfyui-workflows/customcard-production-text-overlay.json";
export const productionTextNodeSourceRelativePath = "comfyui-custom-nodes/CustomCardTextComposer";
export const productionTextRequiredNodeClass = "CustomCardTextComposer";
export const productionTextRequiredCompositorInputs = [
  "artwork_guard_x",
  "artwork_guard_y",
  "artwork_guard_width",
  "artwork_guard_height",
  "artwork_guard_color",
  "artwork_guard_opacity",
  "artwork_guard_radius",
  "artwork_guard_style",
  "headline_box_background_radius",
  "headline_box_background_opacity",
  "headline_box_background_style",
  "body_box_background_radius",
  "body_box_background_opacity",
  "body_box_background_style"
];
export const productionTextSetupInstructions = [
  "Link comfyui-custom-nodes/CustomCardTextComposer into ComfyUI/custom_nodes.",
  "Restart ComfyUI so /object_info exposes CustomCardTextComposer."
];

export function defaultProductionTextWorkflowPath(root = repoRoot) {
  return resolve(root, productionTextWorkflowRelativePath);
}

export function defaultProductionTextNodeSource(root = repoRoot) {
  return resolve(root, productionTextNodeSourceRelativePath);
}

export function resolveProductionTextComfyUrl({
  explicitValue,
  env = process.env
} = {}) {
  return normalizeComfyUrl(
    explicitValue ||
    env.CUSTOMCARD_COMFYUI_URL ||
    env.COMFYUI_URL ||
    "http://127.0.0.1:8188"
  );
}

export function resolveProductionTextSetup({
  args = {},
  env = process.env,
  root = repoRoot
} = {}) {
  const workflowPath = resolve(String(
    args["workflow-path"] ||
    defaultProductionTextWorkflowPath(root)
  ));
  const nodeSource = resolve(String(args["node-source"] || defaultProductionTextNodeSource(root)));
  const comfyUrl = resolveProductionTextComfyUrl({
    explicitValue: args["comfy-url"],
    env
  });
  return {
    comfyUrl,
    workflowPath,
    nodeSource,
    workflowId: productionTextWorkflowId,
    requiredNodeClass: productionTextRequiredNodeClass,
    requiredComposerInputs: [...productionTextRequiredCompositorInputs],
    setupInstructions: [...productionTextSetupInstructions]
  };
}

export function describeProductionTextSetup({
  args = {},
  env = process.env,
  root = repoRoot
} = {}) {
  const setup = resolveProductionTextSetup({ args, env, root });
  return {
    ...setup,
    workflowPathRelative: relativePath(setup.workflowPath, root),
    nodeSourceRelative: relativePath(setup.nodeSource, root)
  };
}

export function isProductionTextWorkflowConfigured({
  workflowId,
  workflowPath,
  root = repoRoot
} = {}) {
  const normalizedId = String(workflowId || "").trim().toLowerCase();
  if (normalizedId === productionTextWorkflowId) return true;
  const normalizedPath = String(workflowPath || "").trim();
  if (!normalizedPath) return false;
  return resolve(normalizedPath) === defaultProductionTextWorkflowPath(root);
}

export function relativePath(filePath, root = repoRoot) {
  return resolve(filePath).replace(root, "").replace(/^[/\\]/, "").replaceAll("\\", "/") || basename(filePath);
}

export function normalizeComfyUrl(value) {
  const parsed = new URL(String(value || "http://127.0.0.1:8188"));
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/+$/, "");
}
