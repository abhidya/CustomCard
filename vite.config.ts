import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      include: [
        "apps/mobile/src/customerExperience.ts",
        "src/accountAuth.ts",
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
        "src/businessEngagementReadiness.ts",
        "src/businessEngagementReadinessData.mjs",
        "src/agentContracts.ts",
        "src/artifactHandoff.ts",
        "src/artifactStore.ts",
        "src/demoSeed.ts",
        "src/domain.ts",
        "src/freeMvp.ts",
        "src/localization.ts",
        "src/persistenceContracts.ts",
        "src/printerPricing.ts",
        "src/printExport.ts",
        "src/productionReadiness.ts",
        "src/providerCatalog.ts",
        "src/providerGovernance.ts",
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
});
