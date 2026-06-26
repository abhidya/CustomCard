import { createWriteStream, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { get as httpsGet } from "node:https";
import { dirname, join, resolve } from "node:path";
import { URL } from "node:url";

const defaultComfyRoot = String.raw`D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI`;
const modelEntries = [
  {
    id: "sdxl-base-1.0",
    tier: "local",
    selectedByDefault: true,
    directory: "checkpoints",
    filename: "sd_xl_base_1.0.safetensors",
    url: "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors"
  },
  {
    id: "sdxl-turbo-fp16",
    tier: "local",
    selectedByDefault: true,
    directory: "checkpoints",
    filename: "sd_xl_turbo_1.0_fp16.safetensors",
    url: "https://huggingface.co/stabilityai/sdxl-turbo/resolve/main/sd_xl_turbo_1.0_fp16.safetensors"
  },
  {
    id: "sdxl-lightning-4step-lora",
    tier: "local",
    selectedByDefault: true,
    directory: "loras",
    filename: "sdxl_lightning_4step_lora.safetensors",
    url: "https://huggingface.co/ByteDance/SDXL-Lightning/resolve/main/sdxl_lightning_4step_lora.safetensors"
  },
  {
    id: "z-image-turbo-bf16",
    tier: "research-lite",
    selectedByDefault: true,
    directory: "diffusion_models",
    filename: "z_image_turbo_bf16.safetensors",
    url: "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/diffusion_models/z_image_turbo_bf16.safetensors"
  },
  {
    id: "z-image-qwen3-4b-encoder",
    tier: "research-lite",
    selectedByDefault: true,
    directory: "text_encoders",
    filename: "qwen_3_4b.safetensors",
    url: "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors"
  },
  {
    id: "flux-ae-vae",
    tier: "research-lite",
    selectedByDefault: true,
    directory: "vae",
    filename: "ae.safetensors",
    url: "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors"
  },
  {
    id: "flux2-klein-4b",
    tier: "quality",
    selectedByDefault: true,
    directory: "diffusion_models",
    filename: "flux-2-klein-4b.safetensors",
    url: "https://huggingface.co/Comfy-Org/flux2-klein/resolve/main/split_files/diffusion_models/flux-2-klein-4b.safetensors"
  },
  {
    id: "flux2-klein-base-4b",
    tier: "quality",
    selectedByDefault: true,
    directory: "diffusion_models",
    filename: "flux-2-klein-base-4b.safetensors",
    url: "https://huggingface.co/Comfy-Org/flux2-klein/resolve/main/split_files/diffusion_models/flux-2-klein-base-4b.safetensors"
  },
  {
    id: "flux2-klein-vae",
    tier: "quality",
    selectedByDefault: true,
    directory: "vae",
    filename: "flux2-vae.safetensors",
    url: "https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/vae/flux2-vae.safetensors"
  },
  {
    id: "qwen-image-distill-fp8",
    tier: "qwen",
    selectedByDefault: false,
    directory: "diffusion_models",
    filename: "qwen_image_distill_full_fp8_e4m3fn.safetensors",
    url: "https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/non_official/diffusion_models/qwen_image_distill_full_fp8_e4m3fn.safetensors"
  },
  {
    id: "qwen-image-text-encoder-fp8",
    tier: "qwen",
    selectedByDefault: false,
    directory: "text_encoders",
    filename: "qwen_2.5_vl_7b_fp8_scaled.safetensors",
    url: "https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors"
  },
  {
    id: "qwen-image-vae",
    tier: "qwen",
    selectedByDefault: false,
    directory: "vae",
    filename: "qwen_image_vae.safetensors",
    url: "https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors"
  },
  {
    id: "qwen-image-edit-2511-fp8mixed",
    tier: "qwen",
    selectedByDefault: false,
    directory: "diffusion_models",
    filename: "qwen_image_edit_2511_fp8mixed.safetensors",
    note: "Research-only edit model. Use the official Comfy Qwen Image Edit template because the product worker does not pass source images yet.",
    url: "https://huggingface.co/Comfy-Org/Qwen-Image-Edit_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_edit_2511_fp8mixed.safetensors"
  },
  {
    id: "qwen-image-edit-2511-lightning-lora",
    tier: "qwen",
    selectedByDefault: false,
    directory: "loras",
    filename: "Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors",
    note: "Optional acceleration LoRA for manual/cloud Qwen Image Edit research workflows.",
    url: "https://huggingface.co/lightx2v/Qwen-Image-Edit-2511-Lightning/resolve/main/Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors"
  },
  {
    id: "flux1-schnell",
    tier: "gated",
    selectedByDefault: false,
    directory: "diffusion_models",
    filename: "flux1-schnell.safetensors",
    gated: true,
    url: "https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors"
  },
  {
    id: "flux1-clip-l",
    tier: "gated",
    selectedByDefault: false,
    directory: "text_encoders",
    filename: "clip_l.safetensors",
    gated: true,
    url: "https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/text_encoder/model.safetensors"
  },
  {
    id: "flux1-t5xxl-fp8",
    tier: "gated",
    selectedByDefault: false,
    directory: "text_encoders",
    filename: "t5xxl_fp8_e4m3fn.safetensors",
    note: "Use an existing Comfy-compatible T5XXL fp8 encoder if this URL is unavailable.",
    url: "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors"
  }
];

const args = parseArgs(process.argv.slice(2));
const comfyRoot = resolve(args.comfyRoot || process.env.CUSTOMCARD_COMFYUI_ROOT || process.env.COMFYUI_ROOT || defaultComfyRoot);
const selectedEntries = modelEntries.filter((entry) => isSelected(entry, args));

if (selectedEntries.length === 0) {
  console.log("No model entries selected.");
  process.exit(0);
}

console.log(`ComfyUI root: ${comfyRoot}`);
console.log(`Selected model entries: ${selectedEntries.map((entry) => entry.id).join(", ")}`);

for (const entry of selectedEntries) {
  await ensureModel(entry, comfyRoot, args);
}

function parseArgs(argv) {
  const parsed = {
    dryRun: false,
    includeGated: false,
    includeQwen: false,
    ids: new Set(),
    comfyRoot: ""
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--all") {
      parsed.includeGated = true;
      parsed.includeQwen = true;
    } else if (arg === "--include-gated") parsed.includeGated = true;
    else if (arg === "--include-qwen") parsed.includeQwen = true;
    else if (arg === "--id") parsed.ids.add(argv[++index]);
    else if (arg?.startsWith("--id=")) parsed.ids.add(arg.slice("--id=".length));
    else if (arg === "--comfy-root") parsed.comfyRoot = argv[++index];
    else if (arg?.startsWith("--comfy-root=")) parsed.comfyRoot = arg.slice("--comfy-root=".length);
  }
  return parsed;
}

function isSelected(entry, args) {
  if (args.ids.size > 0) return args.ids.has(entry.id);
  if (entry.tier === "gated") return args.includeGated;
  if (entry.tier === "qwen") return args.includeQwen;
  return entry.selectedByDefault === true;
}

async function ensureModel(entry, comfyRoot, args) {
  const destination = join(comfyRoot, "models", entry.directory, entry.filename);
  if (existsSync(destination) && statSync(destination).size > 1024 * 1024) {
    console.log(`skip ${entry.id}: ${destination}`);
    return;
  }
  if (entry.gated && !huggingFaceToken()) {
    console.log(`blocked ${entry.id}: gated download requires HF_TOKEN after accepting the model terms.`);
    return;
  }
  console.log(`${args.dryRun ? "would download" : "download"} ${entry.id}: ${destination}`);
  if (entry.note) console.log(`note ${entry.id}: ${entry.note}`);
  if (args.dryRun) return;
  mkdirSync(dirname(destination), { recursive: true });
  await downloadWithResume(entry.url, destination, huggingFaceToken());
}

function huggingFaceToken() {
  return process.env.HF_TOKEN || process.env.HUGGINGFACE_HUB_TOKEN || process.env.HUGGINGFACE_TOKEN || "";
}

async function downloadWithResume(url, destination, token) {
  const partial = `${destination}.partial`;
  let offset = existsSync(partial) ? statSync(partial).size : 0;
  let response = await requestDownload(url, {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(offset > 0 ? { Range: `bytes=${offset}-` } : {})
  });

  if (offset > 0 && response.statusCode === 200) {
    response.resume();
    unlinkSync(partial);
    offset = 0;
    response = await requestDownload(url, token ? { Authorization: `Bearer ${token}` } : {});
  }

  if (![200, 206].includes(response.statusCode ?? 0)) {
    const detail = await readSmallResponse(response);
    throw new Error(`Download failed with ${response.statusCode}: ${detail}`);
  }

  const totalBytes = Number(response.headers["content-length"] || 0) + offset;
  let written = offset;
  let nextLogAt = Date.now() + 15000;
  await new Promise((resolvePromise, rejectPromise) => {
    const file = createWriteStream(partial, { flags: offset > 0 ? "a" : "w" });
    response.on("data", (chunk) => {
      written += chunk.length;
      const now = Date.now();
      if (now >= nextLogAt) {
        console.log(`  ${formatBytes(written)}${totalBytes > 0 ? ` / ${formatBytes(totalBytes)}` : ""}`);
        nextLogAt = now + 15000;
      }
    });
    response.on("error", rejectPromise);
    file.on("error", rejectPromise);
    file.on("finish", resolvePromise);
    response.pipe(file);
  });
  renameSync(partial, destination);
  console.log(`done ${destination} (${formatBytes(written)})`);
}

function requestDownload(url, headers = {}, redirects = 0) {
  if (redirects > 8) throw new Error(`Too many redirects for ${url}`);
  return new Promise((resolvePromise, rejectPromise) => {
    const request = httpsGet(url, { headers }, (response) => {
      const location = response.headers.location;
      if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0) && location) {
        response.resume();
        resolvePromise(requestDownload(new URL(location, url).toString(), headers, redirects + 1));
        return;
      }
      resolvePromise(response);
    });
    request.on("error", rejectPromise);
  });
}

function readSmallResponse(response) {
  return new Promise((resolvePromise) => {
    let text = "";
    response.setEncoding("utf8");
    response.on("data", (chunk) => {
      text += chunk;
      if (text.length > 500) response.destroy();
    });
    response.on("end", () => resolvePromise(text.slice(0, 500)));
    response.on("error", () => resolvePromise(text.slice(0, 500)));
  });
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 1) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`;
}
