import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { loadEnv, type Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  aiCardGenerateRoute,
  aiChatRespondRoute,
  createAiCardGenerationService,
  loadLocalAiEnvFiles
} from "./scripts/ai-card-generator.mjs";
import { handleApiRequest } from "./scripts/api-server.mjs";

export default defineConfig(({ mode }) => ({
  plugins: [react(), customCardCalendarApiPlugin(), customCardAiApiPlugin(mode)],
  test: {
    coverage: {
      include: [
        "apps/mobile/src/customerExperience.ts",
        "src/accountAuth.ts",
        "src/adminOperations.ts",
        "src/adminOperationsData.mjs",
        "src/apiContracts.ts",
        "src/capacityPlan.ts",
        "src/capacityPlanData.mjs",
        "src/e2eCoverage.ts",
        "src/e2eCoverageData.mjs",
        "src/externalAuditReadiness.ts",
        "src/externalAuditReadinessData.mjs",
        "src/aiProviderReadiness.ts",
        "src/aiProviderReadinessData.mjs",
        "src/observabilityReadiness.ts",
        "src/observabilityReadinessData.mjs",
        "src/retailFulfillmentReadiness.ts",
        "src/retailFulfillmentReadinessData.mjs",
        "src/paymentReadiness.ts",
        "src/paymentReadinessData.mjs",
        "src/mobileRenderReadiness.ts",
        "src/mobileRenderReadinessData.mjs",
        "src/hostedApiReadiness.ts",
        "src/hostedApiReadinessData.mjs",
        "src/reviewerBootstrap.ts",
        "src/reviewerDbSeedReadiness.ts",
        "src/reviewerDbSeedReadinessData.mjs",
        "src/businessEngagementReadiness.ts",
        "src/businessEngagementReadinessData.mjs",
        "src/cloudArtifactProofReadiness.ts",
        "src/cloudArtifactProofReadinessData.mjs",
        "src/customerChat.ts",
        "src/agentContracts.ts",
        "src/artifactHandoff.ts",
        "src/artifactStore.ts",
        "src/demoSeed.ts",
        "src/domain.ts",
        "src/freeMvp.ts",
        "src/localization.ts",
        "src/persistenceContracts.ts",
        "src/printerPricing.ts",
        "src/printerCouponCartTerms.ts",
        "src/printExport.ts",
        "src/productionReadiness.ts",
        "src/readinessRegister.mjs",
        "src/providerCatalog.ts",
        "src/providerGovernance.ts",
        "src/providerOperations.ts",
        "src/retailPrinterAdapters.ts",
        "src/providerRuntime.ts",
        "src/serviceKernel.ts"
      ],
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "coverage",
      thresholds: {
        branches: 80,
        functions: 90,
        lines: 90,
        statements: 90
      }
    },
    environment: "node",
    globals: true
  }
}));

function customCardCalendarApiPlugin(): Plugin {
  return {
    name: "customcard-calendar-api",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        if (url.pathname !== "/api/calendar/connections/start") {
          next();
          return;
        }
        await handleApiRequest(request, response);
      });
    }
  };
}

function customCardAiApiPlugin(mode: string): Plugin {
  const env = {
    ...process.env,
    ...loadEnv(mode, process.cwd(), "")
  };
  loadLocalAiEnvFiles({ target: env });
  const service = createAiCardGenerationService({
    env,
    fetchImpl: (...args) => fetch(...args)
  });

  return {
    name: "customcard-ai-api",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        if (url.pathname !== aiCardGenerateRoute && url.pathname !== aiChatRespondRoute) {
          next();
          return;
        }
        if (request.method !== "POST") {
          sendJson(response, 405, { service: "customcard-api", status: "method-not-allowed", path: url.pathname });
          return;
        }
        if (!request.headers["x-idempotency-key"]) {
          sendJson(response, 400, { service: "customcard-api", status: "missing-idempotency-key", path: url.pathname });
          return;
        }
        let body: Record<string, unknown>;
        try {
          const rawBody = await readRequestBody(request, 128_000);
          body = rawBody ? JSON.parse(rawBody) as Record<string, unknown> : {};
        } catch {
          sendJson(response, 400, { service: "customcard-api", status: "invalid-json", path: url.pathname });
          return;
        }
        const rateKey = String(request.headers["x-forwarded-for"] ?? request.socket.remoteAddress ?? "unknown")
          .split(",")[0]
          .trim();
        const result =
          url.pathname === aiCardGenerateRoute
            ? await service.generateCard(body, { rateKey })
            : await service.respondChat(body, { rateKey });
        sendJson(response, result.statusCode, { service: "customcard-api", ...(result.payload as Record<string, unknown>) });
      });
    }
  };
}

function readRequestBody(request: IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
      if (body.length > limit) reject(new Error("request body too large"));
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}
