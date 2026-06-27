import { existsSync, readFileSync } from "node:fs";

const files = [
  "webapp/cardTemplates.ts",
  "webapp/views/HomeView.tsx"
];

const references = new Set();
for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/["'](\/generated\/[^"']+)["']/g)) {
    references.add(match[1]);
  }
}

const missing = [...references]
  .map((url) => ({ url, path: `public${url}` }))
  .filter((item) => !existsSync(item.path));

const report = {
  service: "customcard-website-asset-reference-doctor",
  status: missing.length === 0 ? "ok" : "missing-assets",
  checked: references.size,
  missing
};

console.log(JSON.stringify(report, null, 2));
if (missing.length > 0) process.exit(1);
