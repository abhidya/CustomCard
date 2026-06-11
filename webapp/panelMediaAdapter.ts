import { buildPanelSvg, type CardPanel } from "../src/customerWorkflow";

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
    return canvas.toDataURL("image/jpeg", 0.92);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not render the card image for Walgreens."));
    image.src = src;
  });
}
