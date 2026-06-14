/**
 * Node module-customization hooks that let the MCP server import CustomCard's
 * TypeScript domain (`src/*.ts`) directly, with zero build step and zero
 * dependencies.
 *
 * Node 22.18+ strips type annotations from `.ts` files on its own, but it does
 * not resolve the extensionless, bundler-style relative imports the codebase
 * uses (`import "./renderPacket"`), and it refuses JSON imports that lack an
 * import attribute. These two hooks fill exactly those gaps so the real domain
 * logic runs as-is — no duplication, no transpiler.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TS_CANDIDATES = [".ts", ".tsx", ".mts", "/index.ts", "/index.tsx"];

export async function resolve(specifier, context, nextResolve) {
  const hasKnownExtension = /\.(ts|tsx|mts|cts|js|mjs|cjs|json)$/.test(specifier);
  if (specifier.startsWith(".") && !hasKnownExtension && context.parentURL) {
    const base = fileURLToPath(new URL(specifier, context.parentURL));
    for (const candidate of TS_CANDIDATES) {
      if (existsSync(base + candidate)) {
        return nextResolve(specifier + candidate, context);
      }
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".json")) {
    const source = readFileSync(fileURLToPath(url), "utf8");
    return { format: "json", source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
