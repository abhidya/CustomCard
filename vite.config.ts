import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { isApiRouteAdapterPath } from "./scripts/api-route-adapter-contract.mjs";
import { handleApiRequest } from "./scripts/api-server.mjs";

export default defineConfig(() => ({
  plugins: [react(), customCardCoreApiPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Clerk is the largest dependency and only needs to load for auth UI.
          if (id.includes("node_modules/@clerk/")) return "clerk";
          return undefined;
        }
      }
    }
  },
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
        "src/mobileBootstrapData.mjs",
        "src/hostedApiReadiness.ts",
        "src/hostedApiReadinessData.mjs",
        "src/legalCompliance.ts",
        "src/legalComplianceData.mjs",
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
        "src/browserGatePolicy.ts",
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
      provider: "v8" as const,
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

function customCardCoreApiPlugin(): Plugin {
  return {
    name: "customcard-core-api",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        if (!isApiRouteAdapterPath(url.pathname)) {
          next();
          return;
        }
        await handleApiRequest(request, response);
      });
    }
  };
}
