import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      include: [
        "src/domain.ts",
        "src/freeMvp.ts",
        "src/providerCatalog.ts",
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
