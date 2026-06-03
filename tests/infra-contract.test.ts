import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("production infrastructure contract", () => {
  it("defines durable tables for users, providers, memory, orders, consent, and audit", () => {
    const migration = read("infra/migrations/001_initial_schema.sql");
    const requiredTables = [
      "users",
      "provider_connections",
      "imported_events",
      "card_opportunities",
      "relationship_memories",
      "card_projects",
      "render_packets",
      "orders",
      "order_events",
      "vendor_quotes",
      "consent_records",
      "data_requests",
      "audit_log"
    ];

    for (const table of requiredTables) {
      expect(migration).toContain(`CREATE TABLE ${table}`);
    }
    expect(migration).toContain("raw_content_stored BOOLEAN NOT NULL DEFAULT FALSE");
    expect(migration).toContain("CHECK (raw_content_stored = FALSE)");
    expect(migration).toContain("adapter_version TEXT NOT NULL");
    expect(migration).toContain("metadata_schema JSONB NOT NULL");
    expect(migration).toContain("status IN (");
    expect(migration).toContain("width INTEGER NOT NULL CHECK (width = 1500)");
    expect(migration).toContain("dpi INTEGER NOT NULL CHECK (dpi = 300)");
    expect(migration).toContain("checksum TEXT NOT NULL CHECK");
    expect(migration).toContain("forgotten_at TIMESTAMPTZ");
    expect(migration).toContain("recovery_actions JSONB");
  });

  it("ships local dev and cheap droplet manifests with app, worker, database, queue, and storage", () => {
    const devCompose = read("infra/docker-compose.dev.yml");
    const dropletCompose = read("infra/docker-compose.droplet.yml");
    const dockerfile = read("Dockerfile");

    for (const manifest of [devCompose, dropletCompose]) {
      expect(manifest).toContain("app:");
      expect(manifest).toContain("worker:");
      expect(manifest).toContain("postgres:");
      expect(manifest).toContain("redis:");
      expect(manifest).toContain("REAL_ORDER_KILL_SWITCH");
    }
    expect(devCompose).toContain("minio:");
    expect(dropletCompose).toContain("customcard_prod");
    expect(dropletCompose).toContain("${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}");
    expect(dropletCompose).toContain("SECRET_PROVIDER: managed_secret_store");
    expect(dropletCompose).not.toContain("SECRET_PROVIDER: local_env");
    expect(dockerfile).toContain("node\", \"scripts/serve-dist.mjs");
    expect(dockerfile).toContain("COPY infra ./infra");
    expect(dockerfile).not.toContain("vite preview");
  });

  it("defines cloud-native web and worker deployments", () => {
    const k8s = read("infra/k8s/app.yaml");

    expect(k8s).toContain("kind: ConfigMap");
    expect(k8s).toContain("kind: Secret");
    expect(k8s).toContain('customcard.io/provisioning: "pre-created-by-secret-manager"');
    expect(k8s).toContain("data: {}");
    expect(k8s).toContain("kind: Job");
    expect(k8s).toContain("name: customcard-migrate");
    expect(k8s).toContain("kind: Deployment");
    expect(k8s).toContain("name: customcard-web");
    expect(k8s).toContain("name: customcard-worker");
    expect(k8s).toContain("secretRef:");
    expect(k8s).toContain("configMapRef:");
    expect(k8s).toContain("REAL_ORDER_KILL_SWITCH");
    expect(k8s).toContain("runtime:doctor");
    expect(k8s).toContain("readinessProbe:");
    expect(k8s).toContain("livenessProbe:");
    expect(k8s).not.toContain("replace-me");
    expect(k8s).not.toContain("ghcr.io/example");
    expect(k8s).not.toContain(":latest");
  });

  it("documents required secret and kill-switch environment variables", () => {
    const env = read("infra/env/.env.example");

    expect(env).toContain("DATABASE_URL=");
    expect(env).toContain("POSTGRES_PASSWORD=");
    expect(env).toContain("QUEUE_URL=");
    expect(env).toContain("OBJECT_STORE_URL=");
    expect(env).toContain("GOOGLE_OAUTH_CLIENT_ID=");
    expect(env).toContain("GOOGLE_OAUTH_CLIENT_SECRET=");
    expect(env).toContain("MICROSOFT_CLIENT_ID=");
    expect(env).toContain("MICROSOFT_CLIENT_SECRET=");
    expect(env).toContain("OPENAI_API_KEY=");
    expect(env).toContain("ANTHROPIC_API_KEY=");
    expect(env).toContain("GOOGLE_GENERATIVE_AI_API_KEY=");
    expect(env).toContain("STABILITY_API_KEY=");
    expect(env).toContain("HUGGINGFACE_API_TOKEN=");
    expect(env).toContain("REPLICATE_API_TOKEN=");
    expect(env).toContain("SELF_HOSTED_LLM_BASE_URL=");
    expect(env).toContain("TRANSACTIONAL_EMAIL_API_KEY=");
    expect(env).toContain("REAL_ORDER_KILL_SWITCH=disabled");
    expect(env).toContain("WALGREENS_VENDOR_MODE=disabled_until_certified");
    expect(env).toContain("CVS_VENDOR_MODE=disabled_until_certified");
    expect(env).toContain("FEDEX_VENDOR_MODE=disabled_until_certified");
  });

  it("keeps mobile iOS/Android as a real app-shell package boundary", () => {
    const mobilePackage = read("apps/mobile/package.json");
    const appConfig = read("apps/mobile/app.config.js");
    const mobileApp = read("apps/mobile/src/App.tsx");

    expect(mobilePackage).toContain("\"expo\"");
    expect(mobilePackage).toContain("\"react-native\"");
    expect(appConfig).toContain('platforms: ["ios", "android"]');
    expect(appConfig).toContain("process.env.CUSTOMCARD_API_BASE_URL");
    expect(appConfig).not.toContain("${CUSTOMCARD_API_BASE_URL}");
    expect(appConfig).toContain("realOrderKillSwitch");
    expect(mobileApp).toContain("CustomCard");
    expect(mobileApp).toContain("Customer mobile panel");
    expect(mobileApp).toContain("Local scripted assistant");
    expect(mobileApp).toContain("Manual");
    expect(() =>
      execFileSync("node", ["apps/mobile/scripts/doctor.mjs"], {
        env: { ...process.env, CUSTOMCARD_API_BASE_URL: "http://127.0.0.1:5173", REAL_ORDER_KILL_SWITCH: "disabled" },
        stdio: "pipe"
      })
    ).not.toThrow();
  });
});
