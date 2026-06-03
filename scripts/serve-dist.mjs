import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve("dist");
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? "0.0.0.0";

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".webp", "image/webp"]
]);

if (!existsSync(join(root, "index.html"))) {
  console.error("dist/index.html is missing. Run npm run build before serving.");
  process.exit(1);
}

createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  const normalizedPath = normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const requestedFile = resolve(join(root, normalizedPath === "/" ? "index.html" : normalizedPath));
  const file = requestedFile.startsWith(root) && existsSync(requestedFile) && statSync(requestedFile).isFile()
    ? requestedFile
    : join(root, "index.html");

  response.setHeader("Content-Type", contentTypes.get(extname(file)) ?? "application/octet-stream");
  response.setHeader("X-Content-Type-Options", "nosniff");
  createReadStream(file).pipe(response);
}).listen(port, host, () => {
  console.log(`CustomCard static server listening on http://${host}:${port}`);
});
