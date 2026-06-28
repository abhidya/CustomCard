import { describe, expect, it } from "vitest";
import { materializeBrowserImageUrlForSvg } from "./browserImageMaterialization";
import { buildPanelSvg } from "./renderPacket";
import type { CardPanel } from "./cardDraft";

describe("materializeBrowserImageUrlForSvg", () => {
  it("keeps existing image data URLs unchanged", async () => {
    await expect(materializeBrowserImageUrlForSvg("data:image/png;base64,AAAA")).resolves.toBe("data:image/png;base64,AAAA");
  });

  it("turns signed artifact URLs into embeddable data URLs for SVG proofs", async () => {
    const dataUrl = await materializeBrowserImageUrlForSvg(
      "/api/artifacts/projects/p/render-packets/r/provider-01-front.webp?expires=1770000000&signature=abc",
      async (url) => {
        expect(url).toBe("/api/artifacts/projects/p/render-packets/r/provider-01-front.webp?expires=1770000000&signature=abc");
        return new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "image/webp" },
          status: 200
        });
      }
    );

    expect(dataUrl).toBe("data:image/webp;base64,AQID");

    const svg = buildPanelSvg({ ...panel, imageUrl: dataUrl });
    expect(svg).toContain('<image href="data:image/webp;base64,AQID"');
    expect(svg).not.toContain("/api/artifacts/");
  });

  it("rejects non-image artifact responses", async () => {
    await expect(
      materializeBrowserImageUrlForSvg("/api/artifacts/not-image", async () =>
        new Response("{}", {
          headers: { "content-type": "application/json" },
          status: 200
        })
      )
    ).rejects.toThrow("unsupported content type");
  });
});

const panel: CardPanel = {
  id: "front",
  label: "Front",
  headline: "For Sara",
  body: "A warm note.",
  artDirection: "Soft botanical artwork.",
  width: 1500,
  height: 2100,
  dpi: 300,
  rtl: false,
  overflowRisk: false
};
