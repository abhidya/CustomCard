import { buildPanelSvg } from "../src/renderPacket";
import type { CardPanel } from "../src/customerWorkflow";

const walgreensMaxJpegBytes = 3_900_000;
const walgreensJpegQualities = [0.9, 0.84, 0.78, 0.72, 0.66];

export async function panelToJpegBase64(panel: CardPanel): Promise<string> {
  const svg = buildPanelSvg(panel);
  const svgBlob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = panel.width;
    canvas.height = panel.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare card image.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let smallest = "";
    for (const quality of walgreensJpegQualities) {
      const candidate = canvas.toDataURL("image/jpeg", quality);
      if (!smallest || jpegDataUrlByteLength(candidate) < jpegDataUrlByteLength(smallest)) {
        smallest = candidate;
      }
      if (jpegDataUrlByteLength(candidate) <= walgreensMaxJpegBytes) return candidate;
    }
    return smallest;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function jpegDataUrlByteLength(dataUrl: string): number {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",").pop() ?? "" : dataUrl;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function jpegDataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",").pop() ?? "" : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not render the card image for Walgreens."));
    image.src = src;
  });
}
