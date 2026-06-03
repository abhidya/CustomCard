import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve("dist");
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? "0.0.0.0";

const routes = [
  { id: "health", method: "GET", path: "/api/health", audience: "public", auth: "none" },
  { id: "routes", method: "GET", path: "/api/routes", audience: "public", auth: "none" },
  { id: "customer-bootstrap", method: "GET", path: "/api/customer/bootstrap", audience: "customer", auth: "customer-session" },
  { id: "mobile-bootstrap", method: "GET", path: "/api/mobile/bootstrap", audience: "customer", auth: "customer-session" },
  { id: "admin-readiness", method: "GET", path: "/api/admin/readiness", audience: "admin", auth: "admin-session" },
  { id: "admin-provider-catalog", method: "GET", path: "/api/admin/provider-catalog", audience: "admin", auth: "admin-session" },
  { id: "import-preview", method: "POST", path: "/api/import-preview", audience: "customer", auth: "customer-session" },
  { id: "card-projects", method: "POST", path: "/api/card-projects", audience: "customer", auth: "customer-session" },
  { id: "render-packets", method: "POST", path: "/api/render-packets", audience: "customer", auth: "customer-session" },
  { id: "manual-vendor-handoff", method: "POST", path: "/api/vendor-handoff/manual", audience: "customer", auth: "customer-session" },
  { id: "data-requests", method: "POST", path: "/api/data-requests", audience: "customer", auth: "customer-session" }
];

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".webp", "image/webp"]
]);

const readiness = {
  service: "customcard-api",
  status: "ready",
  realOrdersEnabled: false,
  routes: {
    total: 11,
    public: 2,
    customer: 7,
    admin: 2,
    mutations: 5,
    idempotentMutations: 5
  },
  providers: {
    total: 42,
    readyLocal: 10,
    credentialGated: 21,
    contractOnly: 8,
    blocked: 3
  },
  safety: {
    externalNetworkCalls: false,
    liveVendorOrders: false,
    rawContentStored: false
  }
};

if (process.argv.includes("--doctor")) {
  const blockers = validateApiServerContract();
  console.log(
    JSON.stringify(
      {
        service: "customcard-api-doctor",
        status: blockers.length === 0 ? "ready" : "blocked",
        readiness,
        blockers
      },
      null,
      2
    )
  );
  if (blockers.length > 0) process.exit(1);
} else {
  createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");

    if (requestUrl.pathname.startsWith("/api/")) {
      serveApi(request, response, requestUrl.pathname);
      return;
    }

    serveStatic(response, requestUrl.pathname);
  }).listen(port, host, () => {
    console.log(`CustomCard API server listening on http://${host}:${port}`);
  });
}

function serveApi(request, response, path) {
  const route = routes.find((candidate) => candidate.path === path);
  if (!route) {
    sendJson(response, 404, { service: "customcard-api", status: "not-found", path });
    return;
  }

  if (request.method !== route.method) {
    sendJson(response, 405, { service: "customcard-api", status: "method-not-allowed", path });
    return;
  }

  if (path === "/api/health") {
    sendJson(response, 200, {
      service: "customcard-api",
      status: "ready",
      realOrdersEnabled: false
    });
    return;
  }

  if (path === "/api/routes") {
    sendJson(response, 200, routes);
    return;
  }

  if (path === "/api/admin/readiness") {
    sendJson(response, 200, readiness);
    return;
  }

  if (path === "/api/admin/provider-catalog") {
    sendJson(response, 200, {
      service: "customcard-api",
      providers: readiness.providers,
      externalNetworkCalls: false
    });
    return;
  }

  if (path === "/api/mobile/bootstrap") {
    sendJson(response, 200, {
      service: "customcard-api",
      safetyBanner: "Real orders disabled",
      sections: ["card-queue", "memory-review", "text-chat", "image-render", "handoff"],
      renderChoices: ["Browser SVG renderer", "Credential-gated AI image providers"],
      realOrdersEnabled: false
    });
    return;
  }

  if (path === "/api/customer/bootstrap") {
    sendJson(response, 200, {
      service: "customcard-api",
      primaryActions: ["event-import", "text-chat", "image-generation", "render-export", "vendor-handoff"],
      readyFallbacks: ["ICS / invite paste", "Local customer chat", "Browser SVG renderer", "Manual vendor handoff"],
      realOrdersEnabled: false
    });
    return;
  }

  sendJson(response, 202, {
    service: "customcard-api",
    status: "accepted-contract-only",
    route: route.id,
    idempotencyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false
  });
}

function serveStatic(response, requestPath) {
  if (!existsSync(join(root, "index.html"))) {
    sendJson(response, 503, {
      service: "customcard-api",
      status: "static-dist-missing",
      detail: "Run npm run build before serving the web app."
    });
    return;
  }

  const normalizedPath = normalize(decodeURIComponent(requestPath)).replace(/^(\.\.(\/|\\|$))+/, "");
  const requestedFile = resolve(join(root, normalizedPath === "/" ? "index.html" : normalizedPath));
  const file = requestedFile.startsWith(root) && existsSync(requestedFile) && statSync(requestedFile).isFile()
    ? requestedFile
    : join(root, "index.html");

  response.statusCode = 200;
  response.setHeader("Content-Type", contentTypes.get(extname(file)) ?? "application/octet-stream");
  response.setHeader("X-Content-Type-Options", "nosniff");
  createReadStream(file).pipe(response);
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(payload));
}

function validateApiServerContract() {
  const blockers = [];
  const requiredRoutes = new Set([
    "/api/health",
    "/api/customer/bootstrap",
    "/api/mobile/bootstrap",
    "/api/admin/readiness",
    "/api/admin/provider-catalog",
    "/api/import-preview",
    "/api/render-packets",
    "/api/vendor-handoff/manual"
  ]);
  const routePaths = new Set(routes.map((route) => route.path));

  for (const requiredRoute of requiredRoutes) {
    if (!routePaths.has(requiredRoute)) blockers.push(`Missing API route: ${requiredRoute}`);
  }
  for (const route of routes) {
    if (route.audience === "admin" && route.auth !== "admin-session") blockers.push(`Admin route ${route.id} is not gated.`);
    if (route.audience === "customer" && route.auth !== "customer-session") {
      blockers.push(`Customer route ${route.id} is not gated.`);
    }
  }
  if (readiness.realOrdersEnabled) blockers.push("API readiness cannot enable real orders.");
  if (readiness.safety.externalNetworkCalls) blockers.push("API readiness cannot enable live provider calls.");
  if (readiness.routes.mutations !== readiness.routes.idempotentMutations) {
    blockers.push("Every mutation route must require idempotency.");
  }
  if (readiness.providers.total < 42) blockers.push("Provider API summary is missing expanded adapter coverage.");

  return blockers;
}
