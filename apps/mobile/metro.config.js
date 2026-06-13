// Monorepo Metro config. The app lives in apps/mobile but shares a small amount
// of deterministic domain logic with the repo root (src/onboardingCalendar via
// src/customerExperience.ts). Without watching the repo root, Metro cannot
// resolve those ../../../src imports and the native bundle fails to build.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Let Metro see shared source under the repo root.
config.watchFolders = [projectRoot, repoRoot];

// Resolve node_modules from both the app and the repo root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(repoRoot, "node_modules")
];

module.exports = config;
