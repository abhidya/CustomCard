import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { isVercelCloudBuild, pruneVercelApiShims } from "../scripts/prune-vercel-api-shims.mjs";

const tempRoots: string[] = [];

describe("pruneVercelApiShims", () => {
  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("leaves the checkout untouched outside Vercel cloud builds", () => {
    const { apiRoot } = createApiFixture();

    const result = pruneVercelApiShims({ apiRoot, cwd: "D:/work/CustomCard", env: {} });

    expect(result).toMatchObject({
      status: "skipped",
      reason: "not-vercel-cloud-build"
    });
    expect(existsSync(join(apiRoot, "ai/card/generate.js"))).toBe(true);
  });

  it("prunes duplicate backend route shims during Vercel cloud builds", () => {
    const { apiRoot } = createApiFixture();

    const result = pruneVercelApiShims({ apiRoot, cwd: "/vercel/path0", env: { VERCEL: "1" } });

    expect(result).toMatchObject({
      status: "pruned",
      prunedCount: 2
    });
    expect(result.pruned).toEqual(["api/ai/card/generate.js", "api/provider/jobs/status.js"]);
    expect(existsSync(join(apiRoot, "[...path].js"))).toBe(true);
    expect(existsSync(join(apiRoot, "robots.js"))).toBe(true);
    expect(existsSync(join(apiRoot, "notes.js"))).toBe(true);
    expect(existsSync(join(apiRoot, "ai/card/generate.js"))).toBe(false);
    expect(existsSync(join(apiRoot, "provider/jobs/status.js"))).toBe(false);
  });

  it("detects Vercel cloud builds from system environment variables", () => {
    expect(isVercelCloudBuild({ VERCEL: "1", VERCEL_GIT_COMMIT_SHA: "abc123" }, "D:/work/CustomCard")).toBe(true);
    expect(isVercelCloudBuild({ VERCEL: "1" }, "D:/work/CustomCard")).toBe(false);
    expect(isVercelCloudBuild({ CUSTOMCARD_PRUNE_VERCEL_API_SHIMS: "disabled", VERCEL: "1" }, "/vercel/path0")).toBe(false);
  });
});

function createApiFixture() {
  const root = mkdtempSync(join(tmpdir(), "customcard-vercel-api-prune-"));
  tempRoots.push(root);
  const apiRoot = join(root, "api");

  writeRoute(apiRoot, "[...path].js", "../scripts/api-server.mjs");
  writeFileSync(join(apiRoot, "robots.js"), "export default function handler() {}\n", "utf8");
  writeFileSync(join(apiRoot, "notes.js"), "export const untouched = true;\n", "utf8");
  writeRoute(apiRoot, "ai/card/generate.js", "../../../scripts/api-server.mjs");
  writeRoute(apiRoot, "provider/jobs/status.js", "../../../scripts/api-server.mjs");

  return { apiRoot };
}

function writeRoute(apiRoot: string, routePath: string, importPath: string) {
  const filePath = join(apiRoot, routePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(
    filePath,
    `import { handleApiRequest } from "${importPath}";

export default async function handler(request, response) {
  await handleApiRequest(request, response);
}
`,
    "utf8"
  );
}
