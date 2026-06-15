import { describe, expect, it } from "vitest";
import { normalizeBrowserImageUrl } from "./browserImageUrl";

describe("browser image URL normalization", () => {
  it("keeps signed artifact URLs on the current origin", () => {
    expect(
      normalizeBrowserImageUrl(
        "https://customcard-three-git-main.vercel.app/api/artifacts/projects/p/render-packets/r/front.webp?expires=1770000000&signature=abc"
      )
    ).toBe("/api/artifacts/projects/p/render-packets/r/front.webp?expires=1770000000&signature=abc");
  });

  it("rejects raw storage URIs that browsers cannot render directly", () => {
    expect(normalizeBrowserImageUrl("s3://customcard-prod/projects/p/front.webp")).toBeUndefined();
    expect(normalizeBrowserImageUrl("memory://cloudflare-r2/customcard-prod/projects/p/front.webp")).toBeUndefined();
  });
});
