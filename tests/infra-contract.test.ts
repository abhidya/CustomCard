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
      "auth_sessions",
      "account_identities",
      "account_recovery_challenges",
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
      "idempotency_keys",
      "api_jobs",
      "audit_log"
    ];

    for (const table of requiredTables) {
      expect(migration).toContain(`CREATE TABLE ${table}`);
    }
    expect(migration).toContain("raw_content_stored BOOLEAN NOT NULL DEFAULT FALSE");
    expect(migration).toContain("CHECK (raw_content_stored = FALSE)");
    expect(migration).toContain("session_hash TEXT NOT NULL");
    expect(migration).toContain("CHECK (char_length(session_hash) >= 32)");
    expect(migration).toContain("role TEXT NOT NULL CHECK (role IN ('customer', 'admin'))");
    expect(migration).toContain("provider_subject TEXT NOT NULL");
    expect(migration).toContain("raw_profile_stored BOOLEAN NOT NULL DEFAULT FALSE");
    expect(migration).toContain("challenge_hash TEXT NOT NULL CHECK (char_length(challenge_hash) >= 32)");
    expect(migration).toContain("CREATE UNIQUE INDEX idx_account_identities_provider_subject");
    expect(migration).toContain("CREATE UNIQUE INDEX idx_account_recovery_challenge_hash");
    expect(migration).toContain("UNIQUE (user_id, route_id, idempotency_key)");
    expect(migration).toContain("CHECK (char_length(request_hash) >= 12)");
    expect(migration).toContain("idempotency_key_id TEXT REFERENCES idempotency_keys(id)");
    expect(migration).toContain("adapter_version TEXT NOT NULL");
    expect(migration).toContain("metadata_schema JSONB NOT NULL");
    expect(migration).toContain("status IN (");
    expect(migration).toContain("width INTEGER NOT NULL CHECK (width = 1500)");
    expect(migration).toContain("dpi INTEGER NOT NULL CHECK (dpi = 300)");
    expect(migration).toContain("checksum TEXT NOT NULL CHECK");
    expect(migration).toContain("storage_provider TEXT NOT NULL");
    expect(migration).toContain("artifact_manifest JSONB NOT NULL");
    expect(migration).toContain("signed_url_expires_at TIMESTAMPTZ NOT NULL");
    expect(migration).toContain("external_share_approval_required BOOLEAN NOT NULL DEFAULT TRUE");
    expect(migration).toContain("real_orders_enabled BOOLEAN NOT NULL DEFAULT FALSE");
    expect(migration).toContain("CHECK (real_orders_enabled = FALSE)");
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
    expect(dropletCompose.match(/customcard-objects:\/data\/objects/g)?.length).toBe(2);
    expect(dockerfile).toContain("node\", \"scripts/api-server.mjs");
    expect(dockerfile).toContain("COPY src ./src");
    expect(dockerfile).toContain("COPY apps/mobile/src ./apps/mobile/src");
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
    expect(k8s).toContain("OBJECT_STORE_BUCKET");
    expect(k8s).toContain("OBJECT_STORE_SIGNING_SECRET");
    expect(k8s).toContain("ARTIFACT_SIGNED_URL_TTL_MINUTES");
    expect(k8s).toContain("runtime:doctor");
    expect(k8s).toContain("readinessProbe:");
    expect(k8s).toContain("livenessProbe:");
    expect(k8s).toContain("/api/health");
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
    expect(env).toContain("CUSTOMCARD_API_RUNTIME=contract");
    expect(env).toContain("OBJECT_STORE_SIGNING_SECRET=");
    expect(env).toContain("ARTIFACT_SIGNED_URL_TTL_MINUTES=");
    expect(env).toContain("AUTH_SESSION_SECRET=");
    expect(env).toContain("CUSTOMCARD_CUSTOMER_SESSION_TOKEN=");
    expect(env).toContain("CUSTOMCARD_ADMIN_SESSION_TOKEN=");
    expect(env).toContain("CUSTOMCARD_AUTH_CALLBACK_URL=");
    expect(env).toContain("IDEMPOTENCY_KEY_TTL_HOURS=");
    expect(env).toContain("AUTH0_DOMAIN=");
    expect(env).toContain("AUTH0_CLIENT_ID=");
    expect(env).toContain("AUTH0_CLIENT_SECRET=");
    expect(env).toContain("AUTH0_AUDIENCE=");
    expect(env).toContain("CLERK_SECRET_KEY=");
    expect(env).toContain("CLERK_JWT_KEY=");
    expect(env).toContain("CLERK_AUTHORIZED_PARTIES=");
    expect(env).toContain("SUPABASE_URL=");
    expect(env).toContain("SUPABASE_ANON_KEY=");
    expect(env).toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(env).toContain("FIREBASE_API_KEY=");
    expect(env).toContain("FIREBASE_PROJECT_ID=");
    expect(env).toContain("FIREBASE_SERVICE_ACCOUNT_JSON=");
    expect(env).toContain("COGNITO_DOMAIN=");
    expect(env).toContain("COGNITO_USER_POOL_ID=");
    expect(env).toContain("COGNITO_APP_CLIENT_ID=");
    expect(env).toContain("CARDDAV_BASE_URL=");
    expect(env).toContain("CARDDAV_USERNAME=");
    expect(env).toContain("CARDDAV_APP_PASSWORD=");
    expect(env).toContain("CARDDAV_ADDRESSBOOK_PATH=");
    expect(env).toContain("GOOGLE_OAUTH_CLIENT_ID=");
    expect(env).toContain("GOOGLE_OAUTH_CLIENT_SECRET=");
    expect(env).toContain("MICROSOFT_CLIENT_ID=");
    expect(env).toContain("MICROSOFT_CLIENT_SECRET=");
    expect(env).toContain("OPENAI_API_KEY=");
    expect(env).toContain("AZURE_OPENAI_ENDPOINT=");
    expect(env).toContain("AZURE_OPENAI_API_KEY=");
    expect(env).toContain("AZURE_OPENAI_CHAT_DEPLOYMENT=");
    expect(env).toContain("AZURE_OPENAI_IMAGE_DEPLOYMENT=");
    expect(env).toContain("AWS_ACCESS_KEY_ID=");
    expect(env).toContain("AWS_SECRET_ACCESS_KEY=");
    expect(env).toContain("AWS_REGION=");
    expect(env).toContain("BEDROCK_TEXT_MODEL_ID=");
    expect(env).toContain("BEDROCK_IMAGE_MODEL_ID=");
    expect(env).toContain("ANTHROPIC_API_KEY=");
    expect(env).toContain("GOOGLE_GENERATIVE_AI_API_KEY=");
    expect(env).toContain("MISTRAL_API_KEY=");
    expect(env).toContain("COHERE_API_KEY=");
    expect(env).toContain("PERPLEXITY_API_KEY=");
    expect(env).toContain("XAI_API_KEY=");
    expect(env).toContain("TOGETHER_API_KEY=");
    expect(env).toContain("GROQ_API_KEY=");
    expect(env).toContain("DEEPSEEK_API_KEY=");
    expect(env).toContain("FIREWORKS_API_KEY=");
    expect(env).toContain("STABILITY_API_KEY=");
    expect(env).toContain("HUGGINGFACE_API_TOKEN=");
    expect(env).toContain("REPLICATE_API_TOKEN=");
    expect(env).toContain("IDEOGRAM_API_KEY=");
    expect(env).toContain("LEONARDO_API_KEY=");
    expect(env).toContain("FAL_KEY=");
    expect(env).toContain("BFL_API_KEY=");
    expect(env).toContain("SELF_HOSTED_LLM_BASE_URL=");
    expect(env).toContain("RESEND_API_KEY=");
    expect(env).toContain("SENDGRID_API_KEY=");
    expect(env).toContain("POSTMARK_SERVER_TOKEN=");
    expect(env).toContain("MAILGUN_API_KEY=");
    expect(env).toContain("MAILGUN_DOMAIN=");
    expect(env).toContain("TWILIO_ACCOUNT_SID=");
    expect(env).toContain("TWILIO_AUTH_TOKEN=");
    expect(env).toContain("TWILIO_MESSAGING_SERVICE_SID=");
    expect(env).toContain("WHATSAPP_ACCESS_TOKEN=");
    expect(env).toContain("WHATSAPP_PHONE_NUMBER_ID=");
    expect(env).toContain("EXPO_ACCESS_TOKEN=");
    expect(env).toContain("STRIPE_SECRET_KEY=");
    expect(env).toContain("STRIPE_WEBHOOK_SECRET=");
    expect(env).toContain("CUSTOMCARD_PAYMENT_SUCCESS_URL=");
    expect(env).toContain("CUSTOMCARD_PAYMENT_CANCEL_URL=");
    expect(env).toContain("PAYPAL_CLIENT_ID=");
    expect(env).toContain("PAYPAL_CLIENT_SECRET=");
    expect(env).toContain("PAYPAL_WEBHOOK_ID=");
    expect(env).toContain("SQUARE_ACCESS_TOKEN=");
    expect(env).toContain("SQUARE_LOCATION_ID=");
    expect(env).toContain("SQUARE_WEBHOOK_SIGNATURE_KEY=");
    expect(env).toContain("ADYEN_API_KEY=");
    expect(env).toContain("ADYEN_MERCHANT_ACCOUNT=");
    expect(env).toContain("ADYEN_HMAC_KEY=");
    expect(env).toContain("SENTRY_DSN=");
    expect(env).toContain("SENTRY_PROJECT_ID=");
    expect(env).toContain("SENTRY_ENVIRONMENT=");
    expect(env).toContain("POSTHOG_PROJECT_API_KEY=");
    expect(env).toContain("POSTHOG_HOST=");
    expect(env).toContain("OTEL_EXPORTER_OTLP_ENDPOINT=");
    expect(env).toContain("OTEL_EXPORTER_OTLP_HEADERS=");
    expect(env).toContain("GRAFANA_OTLP_ENDPOINT=");
    expect(env).toContain("GRAFANA_OTLP_INSTANCE_ID=");
    expect(env).toContain("GRAFANA_OTLP_API_KEY=");
    expect(env).toContain("DATADOG_API_KEY=");
    expect(env).toContain("DATADOG_SITE=");
    expect(env).toContain("BETTERSTACK_SOURCE_TOKEN=");
    expect(env).toContain("BETTERSTACK_INGESTING_HOST=");
    expect(env).toContain("TRANSACTIONAL_EMAIL_API_KEY=");
    expect(env).toContain("REAL_ORDER_KILL_SWITCH=disabled");
    expect(env).toContain("WALGREENS_VENDOR_MODE=disabled_until_certified");
    expect(env).toContain("CVS_VENDOR_MODE=disabled_until_certified");
    expect(env).toContain("FEDEX_VENDOR_MODE=disabled_until_certified");
    expect(env).toContain("WALMART_VENDOR_MODE=disabled_until_certified");
    expect(env).toContain("STAPLES_VENDOR_MODE=disabled_until_certified");
    expect(env).toContain("OFFICE_DEPOT_VENDOR_MODE=disabled_until_certified");
  });

  it("keeps coverage instrumentation on core, orchestration, and mobile contract modules", () => {
    const packageJson = read("package.json");
    const viteConfig = read("vite.config.ts");

    expect(packageJson).toContain("npm run test:coverage");
    expect(packageJson).toContain("tests/mobile-contract.test.ts");
    expect(packageJson).toContain("\"demo:doctor\": \"node scripts/demo-reset.mjs\"");
    expect(viteConfig).toContain("apps/mobile/src/customerExperience.ts");
    expect(viteConfig).toContain("src/agentContracts.ts");
    expect(viteConfig).toContain("src/artifactHandoff.ts");
    expect(viteConfig).toContain("src/demoSeed.ts");
    expect(viteConfig).toContain("src/domain.ts");
    expect(viteConfig).toContain("src/freeMvp.ts");
    expect(viteConfig).toContain("src/persistenceContracts.ts");
    expect(viteConfig).toContain("src/printerPricing.ts");
    expect(viteConfig).toContain("src/printExport.ts");
    expect(viteConfig).toContain("src/providerCatalog.ts");
    expect(viteConfig).toContain("src/providerRuntime.ts");
    expect(viteConfig).toContain("src/serviceKernel.ts");
    expect(viteConfig).toContain("statements: 90");
    expect(viteConfig).toContain("branches: 80");
    expect(viteConfig).toContain("functions: 90");
    expect(viteConfig).toContain("lines: 90");
  });

  it("defines a CI verification workflow for tests, coverage, build, deployment, worker, and mobile checks", () => {
    const workflow = read(".github/workflows/verify.yml");

    expect(workflow).toContain("Verify CustomCard");
    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("push:");
    expect(workflow).toContain("branches:");
    expect(workflow).toContain("main");
    expect(workflow).toContain(`  repo-check:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    services:
      postgres:
        image: postgres:16
`);
    expect(workflow).toContain("POSTGRES_DB: customcard_ci");
    expect(workflow).toContain("pg_isready -U customcard -d customcard_ci");
    expect(workflow).toContain(`    env:
`);
    expect(workflow).toContain("DATABASE_URL: postgres://customcard:customcard@127.0.0.1:5432/customcard_ci");
    expect(workflow).toContain(`      CUSTOMCARD_API_BASE_URL: http://127.0.0.1:5173
    steps:
`);
    expect(workflow).not.toContain(`      env:
        CUSTOMCARD_ENV: dev
`);
    expect(workflow).toContain("actions/checkout@v4");
    expect(workflow).toContain("actions/setup-node@v4");
    expect(workflow).toContain("node-version: 24");
    expect(workflow).toContain("cache: npm");
    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm run check");
    expect(workflow).toContain("npm run deployment:doctor");
    expect(workflow).toContain("npm run api:doctor");
    expect(workflow).toContain("npm run api:doctor:memory");
    expect(workflow).toContain("npm run api:doctor:postgres");
    expect(workflow).toContain("npm run api:doctor:postgres:live");
    expect(workflow).toContain("npm run account:doctor:live");
    expect(workflow).toContain("npm run artifact:doctor");
    expect(workflow).toContain("npm run persistence:doctor");
    expect(workflow).toContain("npm run demo:doctor");
    expect(workflow).toContain("npm run worker");
    expect(workflow).toContain("npm --prefix apps/mobile run doctor");
    expect(workflow).toContain("REAL_ORDER_KILL_SWITCH: disabled");
    expect(workflow).toContain("OBJECT_STORE_SIGNING_SECRET: test-object-store-signing-secret-32");
    expect(workflow).toContain("ARTIFACT_SIGNED_URL_TTL_MINUTES: 15");
    expect(workflow).toContain("CUSTOMCARD_API_BASE_URL: http://127.0.0.1:5173");
  });

  it("ships a reviewer demo reset contract doctor", () => {
    const output = execFileSync("npm", ["run", "demo:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      route: string;
      rows: number;
      signedArtifactUrls: boolean;
      realOrdersEnabled: boolean;
    };

    expect(report).toMatchObject({
      service: "customcard-demo-reset",
      status: "ready",
      route: "/api/admin/demo-reset",
      rows: 17,
      signedArtifactUrls: true,
      realOrdersEnabled: false
    });
  });

  it("exercises the Postgres API runtime contract without external database credentials", () => {
    const output = execFileSync("npm", ["run", "api:doctor:postgres", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      runtime: { mode: string; authEnforced: boolean; idempotencyEnforced: boolean; postgresConfigured: boolean };
      persistence: {
        idempotencyRecords: number;
        auditRecords: number;
        queuedJobs: number;
        providerConnections: number;
        importedEvents: number;
        cardOpportunities: number;
        relationshipMemories: number;
        cardProjects: number;
        renderPackets: number;
        orders: number;
        orderEvents: number;
        consentRecords: number;
        dataRequests: number;
      };
      blockers: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-postgres-runtime-doctor",
      status: "ready",
      runtime: {
        mode: "postgres",
        authEnforced: true,
        idempotencyEnforced: true,
        postgresConfigured: true
      },
      persistence: {
        idempotencyRecords: 6,
        auditRecords: 6,
        queuedJobs: 2,
        providerConnections: 1,
        importedEvents: 1,
        cardOpportunities: 1,
        relationshipMemories: 1,
        cardProjects: 1,
        renderPackets: 1,
        orders: 1,
        orderEvents: 1,
        consentRecords: 2,
        dataRequests: 1
      },
      blockers: []
    });
  });

  it("keeps the live Postgres integration doctor verifying route-scoped auth", () => {
    const doctor = read("scripts/postgres-integration-doctor.mjs");

    expect(doctor).toContain("repositoryBackedCustomerRouteIds");
    expect(doctor).toContain("authorizes real Postgres customer sessions for every repository-backed route");
    expect(doctor).toContain("authContextForRoute(\"import-preview\")");
    expect(doctor).toContain("authContextForRoute(\"relationship-memories\")");
    expect(doctor).toContain("authContextForRoute(\"card-projects\")");
    expect(doctor).toContain("authContextForRoute(\"render-packets\")");
    expect(doctor).toContain("authContextForRoute(\"manual-vendor-handoff\")");
    expect(doctor).toContain("authContextForRoute(\"data-requests\")");
    expect(doctor).toContain("authVerification");
    expect(doctor).toContain("expectedCustomerRepositoryRoutes");
    expect(doctor).toContain("wrongRoleBlocked");
  });

  it("keeps mobile iOS/Android as a real app-shell package boundary", () => {
    const mobilePackage = read("apps/mobile/package.json");
    const appConfig = read("apps/mobile/app.config.js");
    const mobileApp = read("apps/mobile/src/App.tsx");
    const mobileExperience = read("apps/mobile/src/customerExperience.ts");

    expect(mobilePackage).toContain("\"expo\"");
    expect(mobilePackage).toContain("\"react-native\"");
    expect(appConfig).toContain('platforms: ["ios", "android"]');
    expect(appConfig).toContain("process.env.CUSTOMCARD_API_BASE_URL");
    expect(appConfig).not.toContain("${CUSTOMCARD_API_BASE_URL}");
    expect(appConfig).toContain("realOrderKillSwitch");
    expect(mobileApp).toContain("CustomCard");
    expect(mobileApp).toContain("Customer mobile panel");
    expect(mobileApp).toContain("Text interface");
    expect(mobileApp).toContain("mobileChatTranscript");
    expect(mobileApp).toContain("mobileRenderChoices");
    expect(mobileApp).toContain("mobileHandoffSteps");
    expect(mobileExperience).toContain("requiredMobileCapabilities");
    expect(mobileExperience).toContain("validateMobileExperience");
    expect(mobileExperience).toContain("Live AI and vendor orders stay off");
    const doctorOutput = execFileSync("node", ["apps/mobile/scripts/doctor.mjs"], {
      encoding: "utf8",
      env: { ...process.env, CUSTOMCARD_API_BASE_URL: "http://127.0.0.1:5173", REAL_ORDER_KILL_SWITCH: "disabled" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    expect(doctorOutput).toContain("customer experience contract");
  });

  it("emits a deployment readiness report for local, droplet, and cloud-native paths", () => {
    const output = execFileSync("node", ["scripts/deployment-readiness.mjs"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      status: string;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };

    expect(report.status).toBe("ready");
    expect(report.blockers).toEqual([]);
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "local-dev", status: "ready" }),
        expect.objectContaining({ lane: "cheap-droplet", status: "ready" }),
        expect.objectContaining({ lane: "cloud-native", status: "ready" }),
        expect.objectContaining({ lane: "runtime", status: "ready" }),
        expect.objectContaining({ lane: "data", status: "ready" })
      ])
    );
  });

  it("emits a persistence readiness report for auth sessions and idempotent API state", () => {
    const output = execFileSync("node", ["scripts/persistence-doctor.mjs"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      status: string;
      readiness: {
        tables: {
          total: number;
          authSessions: boolean;
          accountIdentities: boolean;
          accountRecoveryChallenges: boolean;
          relationshipMemoryRepository: boolean;
          renderPacketRepository: boolean;
          importPreviewRepository: boolean;
          cardProjectRepository: boolean;
          manualVendorHandoffRepository: boolean;
          dataRequestRepository: boolean;
          idempotencyReplay: boolean;
          queueJobs: boolean;
        };
        api: { statefulRoutes: number; idempotentMutations: number };
        safety: { rawContentStored: boolean; liveExternalCalls: boolean; realOrdersEnabled: boolean };
      };
      blockers: unknown[];
    };

    expect(report.status).toBe("ready");
    expect(report.blockers).toEqual([]);
    expect(report.readiness.tables).toMatchObject({
      total: 18,
      authSessions: true,
      accountIdentities: true,
      accountRecoveryChallenges: true,
      relationshipMemoryRepository: true,
      renderPacketRepository: true,
      importPreviewRepository: true,
      cardProjectRepository: true,
      manualVendorHandoffRepository: true,
      dataRequestRepository: true,
      idempotencyReplay: true,
      queueJobs: true
    });
    expect(report.readiness.api).toMatchObject({ statefulRoutes: 12, idempotentMutations: 7 });
    expect(report.readiness.safety).toMatchObject({
      rawContentStored: false,
      liveExternalCalls: false,
      realOrdersEnabled: false
    });
  });
});
