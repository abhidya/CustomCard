#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultApiRoot = resolve(dirname(scriptPath), "..", "api");
const service = "customcard-vercel-api-prune";
const routeFilesToKeep = new Set(["api/[...path].js", "api/robots.js"]);

export function isVercelCloudBuild(env = process.env, cwd = process.cwd()) {
  if (env.CUSTOMCARD_PRUNE_VERCEL_API_SHIMS === "enabled") {
    return true;
  }
  if (env.CUSTOMCARD_PRUNE_VERCEL_API_SHIMS === "disabled") {
    return false;
  }

  const normalizedCwd = cwd.replace(/\\/g, "/");
  return env.VERCEL === "1" && (Boolean(env.VERCEL_GIT_COMMIT_SHA) || normalizedCwd.startsWith("/vercel/path"));
}

export function pruneVercelApiShims({ apiRoot = defaultApiRoot, cwd = process.cwd(), dryRun = false, env = process.env } = {}) {
  const resolvedApiRoot = resolve(apiRoot);

  if (!isVercelCloudBuild(env, cwd)) {
    return {
      service,
      status: "skipped",
      reason: "not-vercel-cloud-build",
      apiRoot: resolvedApiRoot
    };
  }

  if (!existsSync(resolvedApiRoot)) {
    return {
      service,
      status: "skipped",
      reason: "api-root-missing",
      apiRoot: resolvedApiRoot
    };
  }

  const kept = [];
  const pruned = [];

  for (const filePath of collectJavaScriptFiles(resolvedApiRoot)) {
    const routePath = toRoutePath(resolvedApiRoot, filePath);
    if (routeFilesToKeep.has(routePath)) {
      kept.push(routePath);
      continue;
    }

    const source = readFileSync(filePath, "utf8");
    if (!source.includes("handleApiRequest")) {
      kept.push(routePath);
      continue;
    }

    pruned.push(routePath);
    if (!dryRun) {
      rmSync(filePath, { force: true });
    }
  }

  if (!dryRun) {
    removeEmptyDirectories(resolvedApiRoot);
  }

  return {
    service,
    status: "pruned",
    dryRun,
    apiRoot: resolvedApiRoot,
    kept,
    pruned,
    prunedCount: pruned.length
  };
}

function collectJavaScriptFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJavaScriptFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(entryPath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function removeEmptyDirectories(directory, root = directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      removeEmptyDirectories(join(directory, entry.name), root);
    }
  }

  if (directory !== root && readdirSync(directory).length === 0) {
    rmSync(directory, { recursive: true, force: true });
  }
}

function toRoutePath(apiRoot, filePath) {
  return `api/${relative(apiRoot, filePath).split(sep).join("/")}`;
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  console.log(JSON.stringify(pruneVercelApiShims(), null, 2));
}
