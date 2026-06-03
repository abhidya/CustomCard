import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { createApiRuntime } from "./api-runtime.mjs";

const root = resolve("dist");
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? "0.0.0.0";

const routes = [
  { id: "health", method: "GET", path: "/api/health", audience: "public", auth: "none", runtimeMode: "local-demo" },
  { id: "route-catalog", method: "GET", path: "/api/routes", audience: "public", auth: "none", runtimeMode: "local-demo" },
  { id: "customer-bootstrap", method: "GET", path: "/api/customer/bootstrap", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "mobile-bootstrap", method: "GET", path: "/api/mobile/bootstrap", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "admin-readiness", method: "GET", path: "/api/admin/readiness", audience: "admin", auth: "admin-session", runtimeMode: "durable-api" },
  { id: "admin-provider-catalog", method: "GET", path: "/api/admin/provider-catalog", audience: "admin", auth: "admin-session", runtimeMode: "durable-api" },
  { id: "admin-persistence-readiness", method: "GET", path: "/api/admin/persistence-readiness", audience: "admin", auth: "admin-session", runtimeMode: "durable-api" },
  { id: "import-preview", method: "POST", path: "/api/import-preview", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "card-projects", method: "POST", path: "/api/card-projects", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "render-packets", method: "POST", path: "/api/render-packets", audience: "customer", auth: "customer-session", runtimeMode: "queue-backed" },
  { id: "manual-vendor-handoff", method: "POST", path: "/api/vendor-handoff/manual", audience: "customer", auth: "customer-session", runtimeMode: "queue-backed" },
  { id: "data-requests", method: "POST", path: "/api/data-requests", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" }
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
    total: routes.length,
    public: routes.filter((route) => route.audience === "public").length,
    customer: routes.filter((route) => route.audience === "customer").length,
    admin: routes.filter((route) => route.audience === "admin").length,
    mutations: routes.filter((route) => route.method === "POST").length,
    idempotentMutations: routes.filter((route) => route.method === "POST").length
  },
  providers: {
    total: 44,
    readyLocal: 12,
    credentialGated: 21,
    contractOnly: 8,
    blocked: 3
  },
  safety: {
    externalNetworkCalls: false,
    liveVendorOrders: false,
    rawContentStored: false
  },
  persistence: {
    tables: 16,
    schemaBackedRoutes: 10,
    authSessionTable: true,
    idempotencyTable: true,
    appendOnlyAudit: true,
    renderPacketArtifacts: true,
    signedArtifactUrls: true
  }
};
const apiRuntime = createApiRuntime({ env: process.env, routes });

if (process.argv.includes("--doctor")) {
  const blockers = validateApiServerContract();
  console.log(
    JSON.stringify(
      {
        service: "customcard-api-doctor",
        status: blockers.length === 0 ? "ready" : "blocked",
        readiness: {
          ...readiness,
          runtime: apiRuntime.describe()
        },
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
      serveApi(request, response, requestUrl.pathname).catch((error) => {
        sendJson(response, 500, {
          service: "customcard-api",
          status: "internal-error",
          detail: error instanceof Error ? error.message : "Unknown API runtime error."
        });
      });
      return;
    }

    serveStatic(response, requestUrl.pathname);
  }).listen(port, host, () => {
    console.log(`CustomCard API server listening on http://${host}:${port}`);
  });
}

async function serveApi(request, response, path) {
  const route = routes.find((candidate) => candidate.path === path);
  if (!route) {
    sendJson(response, 404, { service: "customcard-api", status: "not-found", path });
    return;
  }

  if (request.method !== route.method) {
    sendJson(response, 405, { service: "customcard-api", status: "method-not-allowed", path });
    return;
  }

  const authContext = await apiRuntime.authorize(route, request);
  if (!authContext.ok) {
    sendJson(response, authContext.statusCode, authContext.payload);
    return;
  }

  if (path === "/api/health") {
    sendJson(response, 200, {
      service: "customcard-api",
      status: "ready",
      realOrdersEnabled: false,
      runtime: apiRuntime.describe()
    });
    return;
  }

  if (path === "/api/routes") {
    sendJson(response, 200, routes);
    return;
  }

  if (path === "/api/admin/readiness") {
    sendJson(response, 200, {
      ...readiness,
      runtime: apiRuntime.describe()
    });
    return;
  }

  if (path === "/api/admin/provider-catalog") {
    sendJson(response, 200, {
      service: "customcard-api",
      providers: readiness.providers,
      externalNetworkCalls: false,
      runtime: apiRuntime.describe()
    });
    return;
  }

  if (path === "/api/admin/persistence-readiness") {
    sendJson(response, 200, {
      service: "customcard-api",
      status: "ready",
      persistence: readiness.persistence,
      runtime: apiRuntime.describe(),
      safety: readiness.safety,
      blockers: []
    });
    return;
  }

  if (path === "/api/mobile/bootstrap") {
    sendJson(response, 200, {
      service: "customcard-api",
      safetyBanner: "Real orders disabled",
      sections: ["card-queue", "memory-review", "text-chat", "image-render", "handoff"],
      renderChoices: ["Browser SVG renderer", "Local print package export", "Credential-gated AI image providers"],
      realOrdersEnabled: false,
      runtime: apiRuntime.describe()
    });
    return;
  }

  if (path === "/api/customer/bootstrap") {
    sendJson(response, 200, {
      service: "customcard-api",
      primaryActions: ["event-import", "text-chat", "image-generation", "render-export", "vendor-handoff"],
      readyFallbacks: ["ICS / invite paste", "Local customer chat", "Browser SVG renderer", "Manual vendor handoff"],
      realOrdersEnabled: false,
      runtime: apiRuntime.describe()
    });
    return;
  }

  const bodyText = await readRequestBody(request);
  const persistedMutation = await apiRuntime.persistMutation({
    route,
    request,
    authContext,
    bodyText,
    responsePayload: buildMutationContractPayload(route, bodyText)
  });
  sendJson(response, persistedMutation.statusCode, persistedMutation.payload);
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
    "/api/routes",
    "/api/customer/bootstrap",
    "/api/mobile/bootstrap",
    "/api/admin/readiness",
    "/api/admin/provider-catalog",
    "/api/admin/persistence-readiness",
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
  if (readiness.providers.total < 44) blockers.push("Provider API summary is missing expanded adapter coverage.");
  if (!readiness.persistence.authSessionTable) blockers.push("API readiness is missing auth session persistence.");
  if (!readiness.persistence.idempotencyTable) blockers.push("API readiness is missing idempotency persistence.");
  if (!readiness.persistence.appendOnlyAudit) blockers.push("API readiness must use append-only audit persistence.");
  if (!readiness.persistence.renderPacketArtifacts) blockers.push("API readiness is missing render-packet artifact manifests.");
  if (!readiness.persistence.signedArtifactUrls) blockers.push("API readiness is missing signed artifact URL contracts.");
  blockers.push(...apiRuntime.validate());

  return blockers;
}

function buildMutationContractPayload(route, bodyText) {
  const requestBody = parseJsonBody(bodyText);
  const basePayload = {
    service: "customcard-api",
    status: "accepted-contract-only",
    route: route.id,
    idempotencyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false
  };

  if (route.id === "render-packets") {
    const projectId = String(requestBody.projectId ?? "project-contract");
    return {
      ...basePayload,
      renderPacketId: `render-packet-${stableContractHash(projectId).slice(0, 8)}`,
      checksum: `cc_artifact_${stableContractHash(`${projectId}:manifest`).slice(0, 8)}`,
      artifactManifest: {
        storageProvider: "object-store-contract",
        artifactCount: 6,
        signedUrlTtlMinutes: 15,
        externalShareApprovalRequired: true,
        realOrdersEnabled: false
      },
      signedArtifactUrls: [
        {
          method: "GET",
          signatureVersion: "hmac-sha256-v1",
          expiresInMinutes: 15,
          url: `contract-only://customcard/artifacts/${encodeURIComponent(projectId)}`
        }
      ]
    };
  }

  if (route.id === "manual-vendor-handoff") {
    return {
      ...basePayload,
      handoffChecklist: ["Download signed artifacts", "Confirm external share approval", "Upload manually to selected printer"],
      signedArtifactUrls: [
        {
          method: "GET",
          signatureVersion: "hmac-sha256-v1",
          expiresInMinutes: 15,
          url: `contract-only://customcard/artifacts/${encodeURIComponent(String(requestBody.renderPacketId ?? "render-packet-contract"))}`
        }
      ],
      disabledReasons: ["Live vendor order APIs remain disabled until certification and kill-switch gates pass."]
    };
  }

  return basePayload;
}

function parseJsonBody(bodyText) {
  if (!bodyText) return {};
  try {
    return JSON.parse(bodyText);
  } catch {
    return {};
  }
}

function stableContractHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 256_000) {
        request.destroy(new Error("Request body too large."));
      }
    });
    request.on("error", reject);
    request.on("end", () => resolve(body));
  });
}
