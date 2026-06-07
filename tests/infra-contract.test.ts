import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { capacityProfiles, summarizeCapacityPlan, validateCapacityProfiles } from "../src/capacityPlan";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const shellDoctorTimeoutMs = 15_000;

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
    expect(devCompose).toContain("MINIO_ROOT_USER: customcard");
    expect(devCompose).toContain("MINIO_ROOT_PASSWORD: customcard-dev-only");
    expect(devCompose).toContain("OBJECT_STORE_ACCESS_KEY_ID: customcard");
    expect(devCompose).toContain("OBJECT_STORE_SECRET_ACCESS_KEY: customcard-dev-only");
    expect(dropletCompose).toContain("customcard_prod");
    expect(dropletCompose).toContain("${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}");
    expect(dropletCompose).toContain("SECRET_PROVIDER: managed_secret_store");
    expect(dropletCompose).not.toContain("SECRET_PROVIDER: local_env");
    expect(dropletCompose.match(/customcard-objects:\/data\/objects/g)?.length).toBe(2);
    expect(dockerfile).toContain("node\", \"scripts/api-server.mjs");
    expect(dockerfile).toContain("COPY src ./src");
    expect(dockerfile).toContain("COPY apps/mobile/App.tsx ./apps/mobile/App.tsx");
    expect(dockerfile).toContain("COPY apps/mobile/src ./apps/mobile/src");
    expect(dockerfile).toContain("COPY infra ./infra");
    expect(dockerfile).toContain("USER node");
    expect(dockerfile).not.toContain("vite preview");
  });

  it("defines cloud-native web and worker deployments", () => {
    const k8s = read("infra/k8s/app.yaml");

    expect(k8s).toContain("kind: ConfigMap");
    expect(k8s).toContain("kind: Secret");
    expect(k8s).toContain('customcard.io/provisioning: "pre-created-by-secret-manager"');
    expect(k8s).toContain("OBJECT_STORE_ACCESS_KEY_ID,OBJECT_STORE_SECRET_ACCESS_KEY");
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
    expect(k8s).toContain("seccompProfile:");
    expect(k8s).toContain("type: RuntimeDefault");
    expect(k8s).toContain("allowPrivilegeEscalation: false");
    expect(k8s).toContain('drop: ["ALL"]');
    expect(k8s).toContain("runAsGroup: 1000");
    expect(k8s).toContain("runAsNonRoot: true");
    expect(k8s).toContain("runAsUser: 1000");
    expect(k8s).not.toContain("replace-me");
    expect(k8s).not.toContain("ghcr.io/example");
    expect(k8s).not.toContain(":latest");
  });

  it("ships testable cloud artifact bucket and IAM IaC", () => {
    const main = read("infra/aws/artifact-store/main.tf");
    const variables = read("infra/aws/artifact-store/variables.tf");
    const outputs = read("infra/aws/artifact-store/outputs.tf");

    expect(main).toContain('resource "aws_s3_bucket" "artifacts"');
    expect(main).toContain('resource "aws_s3_bucket_public_access_block" "artifacts"');
    expect(main).toContain("block_public_acls       = true");
    expect(main).toContain("block_public_policy     = true");
    expect(main).toContain("ignore_public_acls      = true");
    expect(main).toContain("restrict_public_buckets = true");
    expect(main).toContain('object_ownership = "BucketOwnerEnforced"');
    expect(main).toContain('resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts"');
    expect(main).toContain('sse_algorithm = "AES256"');
    expect(main).toContain('resource "aws_s3_bucket_versioning" "artifacts"');
    expect(main).toContain('resource "aws_s3_bucket_lifecycle_configuration" "artifacts"');
    expect(main).toContain("days_after_initiation = 1");
    expect(main).toContain('sid    = "DenyInsecureTransport"');
    expect(main).toContain('variable = "aws:SecureTransport"');
    expect(main).toContain('sid    = "DenyUnencryptedObjectUploads"');
    expect(main).toContain('variable = "s3:x-amz-server-side-encryption"');
    expect(main).toContain('data "aws_iam_policy_document" "artifact_writer"');
    expect(main).toContain('values   = ["projects/*"]');
    expect(main).toContain('"s3:PutObject"');
    expect(main).toContain('"s3:GetObject"');
    expect(main).toContain('"s3:DeleteObject"');
    expect(main).toContain('resource "aws_iam_role_policy_attachment" "app_artifact_writer"');
    expect(main).toContain('resource "aws_iam_role_policy_attachment" "worker_artifact_writer"');
    expect(main).not.toContain("public-read");
    expect(main).not.toContain("force_destroy = true");

    expect(variables).toContain("artifact_retention_days >= 7");
    expect(variables).toContain("artifact_retention_days <= 365");
    expect(variables).toContain("noncurrent_artifact_retention_days >= 1");
    expect(variables).toContain("default     = false");

    expect(outputs).toContain('OBJECT_STORE_URL                = "s3://${aws_s3_bucket.artifacts.bucket}"');
    expect(outputs).toContain("OBJECT_STORE_BUCKET             = aws_s3_bucket.artifacts.bucket");
    expect(outputs).toContain("OBJECT_STORE_REGION             = data.aws_region.current.name");
    expect(outputs).toContain('OBJECT_STORE_SIGNING_SECRET     = "set-in-secret-manager"');
    expect(outputs).toContain('REAL_ORDER_KILL_SWITCH          = "disabled"');
  });

  it("ships a cloud artifact proof readiness doctor without claiming applied cloud proof", () => {
    const output = execFileSync("npm", ["run", "cloud:artifact:proof:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      items: number;
      repoLocalReady: number;
      evidenceMissing: number;
      appliedCloudRequired: number;
      terraformFileContracts: number;
      envOutputContracts: number;
      terraformApplyExecutions: number;
      appliedBucketArnProofs: number;
      iamPolicyOutputProofs: number;
      signedUrlProbeProofs: number;
      accessLogProofs: number;
      secretSyncProofs: number;
      restoreDrillProofs: number;
      externalNetworkCalls: number;
      realOrdersEnabled: number;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-cloud-artifact-proof-readiness-doctor",
      status: "ready",
      items: 8,
      repoLocalReady: 2,
      evidenceMissing: 6,
      appliedCloudRequired: 6,
      terraformFileContracts: 3,
      envOutputContracts: 6,
      terraformApplyExecutions: 0,
      appliedBucketArnProofs: 0,
      iamPolicyOutputProofs: 0,
      signedUrlProbeProofs: 0,
      accessLogProofs: 0,
      secretSyncProofs: 0,
      restoreDrillProofs: 0,
      externalNetworkCalls: 0,
      realOrdersEnabled: 0,
      blockers: []
    });
    expect(report.lanes.map((lane) => lane.lane)).toEqual(
      expect.arrayContaining(["register", "terraform", "object-store", "surfaces", "docs", "ci"])
    );
  }, shellDoctorTimeoutMs);

  it("documents required secret and kill-switch environment variables", () => {
    const env = read("infra/env/.env.example");

    expect(env).toContain("DATABASE_URL=");
    expect(env).toContain("POSTGRES_PASSWORD=");
    expect(env).toContain("QUEUE_URL=");
    expect(env).toContain("OBJECT_STORE_URL=");
    expect(env).toContain("OBJECT_STORE_BUCKET=");
    expect(env).toContain("OBJECT_STORE_ACCESS_KEY_ID=");
    expect(env).toContain("OBJECT_STORE_SECRET_ACCESS_KEY=");
    expect(env).toContain("OBJECT_STORE_REGION=");
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
    expect(packageJson).toContain("\"mobile:web:demo\": \"vite --host 127.0.0.1 --open /?view=mobile\"");
    expect(packageJson).toContain("\"demo:doctor\": \"node scripts/demo-reset.mjs\"");
    expect(packageJson).toContain("\"api:doctor:postgres:http\": \"CUSTOMCARD_POSTGRES_API_HTTP_DOCTOR=enabled node scripts/postgres-api-http-doctor.mjs\"");
    expect(packageJson).toContain("\"artifact:doctor:s3:live\": \"CUSTOMCARD_S3_ARTIFACT_DOCTOR=enabled node scripts/artifact-store-s3-live-doctor.mjs\"");
    expect(packageJson).toContain("\"cloud:doctor\": \"node scripts/cloud-artifact-iac-doctor.mjs\"");
    expect(packageJson).toContain("\"cloud:artifact:proof:doctor\": \"node scripts/cloud-artifact-proof-readiness-doctor.mjs\"");
    expect(packageJson).toContain("\"localization:doctor\": \"node scripts/localization-doctor.mjs\"");
    expect(packageJson).toContain("\"security:doctor\": \"node scripts/security-privacy-accessibility-doctor.mjs\"");
    expect(packageJson).toContain("\"external:audit:doctor\": \"node scripts/external-audit-readiness-doctor.mjs\"");
    expect(packageJson).toContain("\"e2e:coverage:doctor\": \"node scripts/e2e-coverage-doctor.mjs\"");
    expect(packageJson).toContain("\"ai:doctor\": \"node scripts/ai-provider-readiness-doctor.mjs\"");
    expect(packageJson).toContain("\"observability:doctor\": \"node scripts/observability-readiness-doctor.mjs\"");
    expect(packageJson).toContain("\"retail:doctor\": \"node scripts/retail-fulfillment-readiness-doctor.mjs\"");
    expect(packageJson).toContain("\"payment:doctor\": \"node scripts/payment-readiness-doctor.mjs\"");
    expect(packageJson).toContain("\"mobile:render:doctor\": \"node scripts/mobile-render-readiness-doctor.mjs\"");
    expect(packageJson).toContain("\"hosted:api:doctor\": \"node scripts/hosted-api-readiness-doctor.mjs\"");
    expect(packageJson).toContain("\"reviewer:db:seed:doctor\": \"node scripts/reviewer-db-seed-readiness-doctor.mjs\"");
    expect(packageJson).toContain("\"business:engagement:doctor\": \"node scripts/business-engagement-readiness-doctor.mjs\"");
    expect(packageJson).toContain("\"printer:pricing:doctor\": \"node scripts/printer-pricing-doctor.mjs\"");
    expect(packageJson).toContain("\"provider:governance:doctor\": \"node scripts/provider-governance-doctor.mjs\"");
    expect(packageJson).toContain("\"capacity:doctor\": \"node scripts/capacity-plan-doctor.mjs\"");
    expect(viteConfig).toContain("src/capacityPlan.ts");
    expect(viteConfig).toContain("src/e2eCoverage.ts");
    expect(viteConfig).toContain("src/e2eCoverageData.mjs");
    expect(viteConfig).toContain("src/externalAuditReadiness.ts");
    expect(viteConfig).toContain("src/externalAuditReadinessData.mjs");
    expect(viteConfig).toContain("src/aiProviderReadiness.ts");
    expect(viteConfig).toContain("src/aiProviderReadinessData.mjs");
    expect(viteConfig).toContain("src/observabilityReadiness.ts");
    expect(viteConfig).toContain("src/observabilityReadinessData.mjs");
    expect(viteConfig).toContain("src/retailFulfillmentReadiness.ts");
    expect(viteConfig).toContain("src/retailFulfillmentReadinessData.mjs");
    expect(viteConfig).toContain("src/paymentReadiness.ts");
    expect(viteConfig).toContain("src/paymentReadinessData.mjs");
    expect(viteConfig).toContain("src/mobileRenderReadiness.ts");
    expect(viteConfig).toContain("src/mobileRenderReadinessData.mjs");
    expect(viteConfig).toContain("src/hostedApiReadiness.ts");
    expect(viteConfig).toContain("src/hostedApiReadinessData.mjs");
    expect(viteConfig).toContain("src/reviewerDbSeedReadiness.ts");
    expect(viteConfig).toContain("src/reviewerDbSeedReadinessData.mjs");
    expect(viteConfig).toContain("src/reviewerBootstrap.ts");
    expect(viteConfig).toContain("src/cloudArtifactProofReadiness.ts");
    expect(viteConfig).toContain("src/cloudArtifactProofReadinessData.mjs");
    expect(viteConfig).toContain("src/businessEngagementReadiness.ts");
    expect(viteConfig).toContain("src/businessEngagementReadinessData.mjs");
    expect(packageJson).toContain("\"mobile:release:doctor\": \"npm --prefix apps/mobile run release:doctor\"");
    expect(viteConfig).toContain("apps/mobile/src/customerExperience.ts");
    expect(viteConfig).toContain("src/agentContracts.ts");
    expect(viteConfig).toContain("src/artifactHandoff.ts");
    expect(viteConfig).toContain("src/demoSeed.ts");
    expect(viteConfig).toContain("src/domain.ts");
    expect(viteConfig).toContain("src/freeMvp.ts");
    expect(viteConfig).toContain("src/localization.ts");
    expect(viteConfig).toContain("src/persistenceContracts.ts");
    expect(viteConfig).toContain("src/printerPricing.ts");
    expect(viteConfig).toContain("src/printExport.ts");
    expect(viteConfig).toContain("src/providerCatalog.ts");
    expect(viteConfig).toContain("src/providerGovernance.ts");
    expect(viteConfig).toContain("src/providerRuntime.ts");
    expect(viteConfig).toContain("src/serviceKernel.ts");
    expect(viteConfig).toContain("statements: 90");
    expect(viteConfig).toContain("branches: 80");
    expect(viteConfig).toContain("functions: 90");
    expect(viteConfig).toContain("lines: 90");
  });

  it("keeps customer app bootstrap naming out of demo-only contracts", () => {
    const appSource = read("src/App.tsx");
    const reviewerBootstrap = read("src/reviewerBootstrap.ts");

    expect(appSource).toContain("./reviewerBootstrap");
    expect(appSource).toContain("reviewerInitialAuthForm");
    expect(appSource).toContain("reviewerReferenceDate");
    expect(appSource).not.toContain("./demoBootstrap");
    expect(appSource).not.toContain("demoInitialAuthForm");
    expect(reviewerBootstrap).toContain("ReviewerAuthForm");
    expect(reviewerBootstrap).toContain("reviewerDraftOptions");
    expect(reviewerBootstrap).not.toContain("DemoAuthForm");
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
    expect(workflow).toContain("npm run cloud:doctor");
    expect(workflow).toContain("Validate cloud artifact proof readiness");
    expect(workflow).toContain("npm run cloud:artifact:proof:doctor");
    expect(workflow).toContain("npm run api:doctor");
    expect(workflow).toContain("npm run security:doctor");
    expect(workflow).toContain("npm run external:audit:doctor");
    expect(workflow).toContain("npm run e2e:coverage:doctor");
    expect(workflow).toContain("npm run ai:doctor");
    expect(workflow).toContain("npm run observability:doctor");
    expect(workflow).toContain("npm run retail:doctor");
    expect(workflow).toContain("npm run payment:doctor");
    expect(workflow).toContain("npm run mobile:render:doctor");
    expect(workflow).toContain("npm run hosted:api:doctor");
    expect(workflow).toContain("npm run reviewer:db:seed:doctor");
    expect(workflow).toContain("npm run business:engagement:doctor");
    expect(workflow).toContain("npm run localization:doctor");
    expect(workflow).toContain("npm run provider:governance:doctor");
    expect(workflow).toContain("npm run capacity:doctor");
    expect(workflow).toContain("npm run printer:pricing:doctor");
    expect(workflow).toContain("npm run api:doctor:memory");
    expect(workflow).toContain("npm run api:doctor:postgres");
    expect(workflow).toContain("npm run api:doctor:postgres:live");
    expect(workflow).toContain("npm run api:doctor:postgres:http");
    expect(workflow).toContain("npm run account:doctor:live");
    expect(workflow).toContain("Account auth doctor failed on attempt ${attempt}; retrying after a short service settle delay.");
    expect(workflow).toContain("npm run artifact:doctor");
    expect(workflow).toContain("quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z-cpuv1 server /data");
    expect(workflow).toContain("http://127.0.0.1:9000/minio/health/live");
    expect(workflow).toContain("npm run artifact:doctor:s3:live");
    expect(workflow).toContain("OBJECT_STORE_ACCESS_KEY_ID: customcard");
    expect(workflow).toContain("OBJECT_STORE_SECRET_ACCESS_KEY: customcard-dev-only");
    expect(workflow).toContain("npm run persistence:doctor");
    expect(workflow).toContain("npm run demo:doctor");
    expect(workflow).toContain("npm run worker");
    expect(workflow).toContain("npm --prefix apps/mobile run doctor");
    expect(workflow).toContain("npm run mobile:release:doctor");
    expect(workflow).toContain("REAL_ORDER_KILL_SWITCH: disabled");
    expect(workflow).toContain("OBJECT_STORE_SIGNING_SECRET: test-object-store-signing-secret-32");
    expect(workflow).toContain("ARTIFACT_SIGNED_URL_TTL_MINUTES: 15");
    expect(workflow).toContain("CUSTOMCARD_API_BASE_URL: http://127.0.0.1:5173");
  });

  it("ships executable capacity profiles and a CI-gated doctor", () => {
    const output = execFileSync("npm", ["run", "capacity:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      profiles: number;
      maxDailyCards: number;
      maxDailyImageGenerations: number;
      liveProviderCalls: boolean;
      realOrdersEnabled: boolean;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };
    const app = read("src/App.tsx");
    const apiContracts = read("src/apiContracts.ts");
    const apiServer = read("scripts/api-server.mjs");
    const summary = summarizeCapacityPlan();

    expect(report).toMatchObject({
      service: "customcard-capacity-plan-doctor",
      status: "ready",
      profiles: 4,
      maxDailyCards: 12000,
      maxDailyImageGenerations: 1000,
      liveProviderCalls: false,
      realOrdersEnabled: false,
      blockers: []
    });
    expect(report.lanes.map((lane) => lane.lane)).toEqual(
      expect.arrayContaining(["profiles", "surfaces", "ci", "safety"])
    );
    expect(validateCapacityProfiles()).toEqual([]);
    expect(capacityProfiles.map((profile) => profile.id)).toEqual([
      "local-dev",
      "cheap-droplet",
      "cloud-native",
      "saas-scale"
    ]);
    expect(summary).toMatchObject({
      total: 4,
      maxDailyCards: 12000,
      maxDailyImageGenerations: 1000,
      liveProviderCalls: 0,
      realOrdersEnabled: 0
    });
    expect(`${app}\n${apiContracts}\n${apiServer}`).toContain("Capacity profiles");
    expect(`${app}\n${apiContracts}\n${apiServer}`).toContain("summarizeCapacityPlan");
  }, shellDoctorTimeoutMs);

  it("defines a Vercel static plus serverless API deployment contract", () => {
    const vercel = JSON.parse(read("vercel.json")) as {
      buildCommand: string;
      outputDirectory: string;
      rewrites: Array<{ source: string; destination: string }>;
    };
    const handler = read("api/[...path].mjs");
    const apiServer = read("scripts/api-server.mjs");
    const apiRuntime = read("scripts/api-runtime.mjs");

    expect(vercel).toMatchObject({
      buildCommand: "npm run build",
      outputDirectory: "dist"
    });
    expect(vercel.rewrites).toEqual(
      expect.arrayContaining([
        { source: "/api/(.*)", destination: "/api/$1" },
        { source: "/(.*)", destination: "/index.html" }
      ])
    );
    expect(handler).toContain("handleApiRequest");
    expect(apiServer).toContain("export async function handleApiRequest");
    expect(apiRuntime).toContain("CUSTOMCARD_API_RUNTIME");
    expect(apiRuntime).toContain("DATABASE_URL");
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
  }, shellDoctorTimeoutMs);

  it("exercises the Postgres API runtime contract without external database credentials", () => {
    const doctor = read("scripts/postgres-runtime-doctor.mjs");
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
    expect(doctor).toContain("blocks import preview mutations with missing metadata");
    expect(doctor).toContain("blocks non-import mutations with missing required fields");
    expect(doctor).toContain("invalid-import-preview-payload");
    expect(doctor).toContain("invalid-render-packets-payload");
    expect(doctor).toContain("invalid-manual-vendor-handoff-payload");
  }, shellDoctorTimeoutMs);

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

  it("keeps the Postgres API HTTP doctor verifying process-level route persistence", () => {
    const doctor = read("scripts/postgres-api-http-doctor.mjs");

    expect(doctor).toContain("customcard-postgres-api-http-doctor");
    expect(doctor).toContain("CUSTOMCARD_POSTGRES_API_HTTP_DOCTOR");
    expect(doctor).toContain("spawn(\"node\", [\"scripts/api-server.mjs\"]");
    expect(doctor).toContain("serves public Postgres health and route catalog over HTTP");
    expect(doctor).toContain("enforces Postgres HTTP auth on admin and customer routes");
    expect(doctor).toContain("blocks missing HTTP idempotency key before repository mutation");
    expect(doctor).toContain("persists Postgres HTTP import-preview mutation");
    expect(doctor).toContain("persists Postgres HTTP relationship-memories mutation");
    expect(doctor).toContain("persists Postgres HTTP card-projects mutation");
    expect(doctor).toContain("persists Postgres HTTP render-packets mutation");
    expect(doctor).toContain("persists Postgres HTTP manual-vendor-handoff mutation");
    expect(doctor).toContain("persists Postgres HTTP data-requests mutation");
    expect(doctor).toContain("replays and conflicts Postgres HTTP idempotency");
    expect(doctor).toContain("customerHttpRoutes");
    expect(doctor).toContain("missingAuthBlocked");
    expect(doctor).toContain("missingIdempotencyBlocked");
    expect(doctor).toContain("SELECT COUNT(*)::int AS count FROM idempotency_keys");
    expect(doctor).toContain("SELECT COUNT(*)::int AS count FROM audit_log");
    expect(doctor).toContain("SELECT COUNT(*)::int AS count FROM api_jobs");
  });

  it("keeps the live S3-compatible artifact doctor verifying MinIO/S3 writes", () => {
    const doctor = read("scripts/artifact-store-s3-live-doctor.mjs");

    expect(doctor).toContain("customcard-artifact-store-s3-live-doctor");
    expect(doctor).toContain("CUSTOMCARD_S3_ARTIFACT_DOCTOR");
    expect(doctor).toContain("OBJECT_STORE_ACCESS_KEY_ID");
    expect(doctor).toContain("OBJECT_STORE_SECRET_ACCESS_KEY");
    expect(doctor).toContain("AWS4-HMAC-SHA256");
    expect(doctor).toContain("x-amz-content-sha256");
    expect(doctor).toContain("createBucket");
    expect(doctor).toContain("writeS3CompatibleArtifactStore");
    expect(doctor).toContain("putObject");
    expect(doctor).toContain("getObjectText");
    expect(doctor).toContain("deleteBucket");
    expect(doctor).toContain("cloudWritesVerified");
    expect(doctor).toContain("liveNetworkCalls: true");
    expect(doctor).toContain("externalVendorCalls: false");
    expect(doctor).toContain("realOrdersEnabled: false");
  });

  it("emits a cloud artifact IaC readiness report", () => {
    const output = execFileSync("npm", ["run", "cloud:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      module: string;
      liveCloudCalls: boolean;
      realOrdersEnabled: boolean;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-cloud-artifact-iac-doctor",
      status: "ready",
      module: "infra/aws/artifact-store",
      liveCloudCalls: false,
      realOrdersEnabled: false,
      blockers: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "bucket", status: "ready" }),
        expect.objectContaining({ lane: "policy", status: "ready" }),
        expect.objectContaining({ lane: "iam", status: "ready" }),
        expect.objectContaining({ lane: "inputs", status: "ready" }),
        expect.objectContaining({ lane: "outputs", status: "ready" }),
        expect.objectContaining({ lane: "safety", status: "ready" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a security privacy accessibility baseline report", () => {
    const output = execFileSync("npm", ["run", "security:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      externalAudit: boolean;
      legalReview: boolean;
      liveProviderCalls: boolean;
      realOrdersEnabled: boolean;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-security-privacy-accessibility-doctor",
      status: "ready",
      externalAudit: false,
      legalReview: false,
      liveProviderCalls: false,
      realOrdersEnabled: false,
      blockers: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "security", status: "ready" }),
        expect.objectContaining({ lane: "privacy", status: "ready" }),
        expect.objectContaining({ lane: "accessibility", status: "ready" }),
        expect.objectContaining({ lane: "ci", status: "ready" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits an end-to-end coverage readiness report", () => {
    const output = execFileSync("npm", ["run", "e2e:coverage:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      journeys: number;
      repoLocalCoveragePercent: number;
      ciGated: number;
      liveProductionProofs: number;
      realOrdersEnabled: number;
      externalNetworkCalls: number;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-e2e-coverage-doctor",
      status: "ready",
      journeys: 29,
      repoLocalCoveragePercent: 100,
      ciGated: 29,
      liveProductionProofs: 0,
      realOrdersEnabled: 0,
      externalNetworkCalls: 0,
      blockers: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "matrix", status: "ready" }),
        expect.objectContaining({ lane: "surfaces", status: "ready" }),
        expect.objectContaining({ lane: "tests", status: "ready" }),
        expect.objectContaining({ lane: "docs", status: "ready" }),
        expect.objectContaining({ lane: "ci", status: "ready" }),
        expect.objectContaining({ lane: "safety", status: "ready" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits an AI provider readiness report", () => {
    const output = execFileSync("npm", ["run", "ai:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      items: number;
      textProviderContracts: number;
      imageProviderContracts: number;
      localFallbacks: number;
      promptAuditRequired: number;
      humanReviewRequired: number;
      liveProviderCallsEnabled: number;
      externalNetworkCalls: number;
      productionTrafficEnabled: number;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-ai-provider-readiness-doctor",
      status: "ready",
      items: 8,
      textProviderContracts: 15,
      imageProviderContracts: 15,
      localFallbacks: 2,
      promptAuditRequired: 6,
      humanReviewRequired: 5,
      liveProviderCallsEnabled: 0,
      externalNetworkCalls: 0,
      productionTrafficEnabled: 0,
      blockers: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "ready" }),
        expect.objectContaining({ lane: "provider-contracts", status: "ready" }),
        expect.objectContaining({ lane: "surfaces", status: "ready" }),
        expect.objectContaining({ lane: "docs", status: "ready" }),
        expect.objectContaining({ lane: "ci", status: "ready" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits an observability readiness report", () => {
    const output = execFileSync("npm", ["run", "observability:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      items: number;
      providerContracts: number;
      alertRoutesRequired: number;
      liveIngestionEnabled: number;
      externalNetworkCalls: number;
      productionAlertsEnabled: number;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-observability-readiness-doctor",
      status: "ready",
      items: 7,
      providerContracts: 6,
      alertRoutesRequired: 4,
      liveIngestionEnabled: 0,
      externalNetworkCalls: 0,
      productionAlertsEnabled: 0,
      blockers: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "ready" }),
        expect.objectContaining({ lane: "provider-runtime", status: "ready" }),
        expect.objectContaining({ lane: "surfaces", status: "ready" }),
        expect.objectContaining({ lane: "docs", status: "ready" }),
        expect.objectContaining({ lane: "ci", status: "ready" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a retail fulfillment readiness report", () => {
    const output = execFileSync("npm", ["run", "retail:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      items: number;
      liveVendorAdapterContracts: number;
      manualFallbacks: number;
      recoveryDrillEvents: number;
      liveQuoteEnabled: number;
      directOrderEnabled: number;
      externalNetworkCalls: number;
      realPaymentsEnabled: number;
      physicalCertificationAttached: number;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-retail-fulfillment-readiness-doctor",
      status: "ready",
      items: 8,
      liveVendorAdapterContracts: 6,
      manualFallbacks: 2,
      recoveryDrillEvents: 21,
      liveQuoteEnabled: 0,
      directOrderEnabled: 0,
      externalNetworkCalls: 0,
      realPaymentsEnabled: 0,
      physicalCertificationAttached: 0,
      blockers: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "ready" }),
        expect.objectContaining({ lane: "provider-contracts", status: "ready" }),
        expect.objectContaining({ lane: "surfaces", status: "ready" }),
        expect.objectContaining({ lane: "docs", status: "ready" }),
        expect.objectContaining({ lane: "ci", status: "ready" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a payment readiness report", () => {
    const output = execFileSync("npm", ["run", "payment:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      items: number;
      paymentProviderContracts: number;
      localFallbacks: number;
      ledgerEvents: number;
      webhookSignatureRequired: number;
      liveChargesEnabled: number;
      liveRefundsEnabled: number;
      liveCaptureEnabled: number;
      externalNetworkCalls: number;
      cardDataStored: number;
      pciScopeApproved: number;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-payment-readiness-doctor",
      status: "ready",
      items: 8,
      paymentProviderContracts: 4,
      localFallbacks: 1,
      ledgerEvents: 23,
      webhookSignatureRequired: 5,
      liveChargesEnabled: 0,
      liveRefundsEnabled: 0,
      liveCaptureEnabled: 0,
      externalNetworkCalls: 0,
      cardDataStored: 0,
      pciScopeApproved: 0,
      blockers: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "ready" }),
        expect.objectContaining({ lane: "provider-contracts", status: "ready" }),
        expect.objectContaining({ lane: "surfaces", status: "ready" }),
        expect.objectContaining({ lane: "docs", status: "ready" }),
        expect.objectContaining({ lane: "ci", status: "ready" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a mobile render readiness report", () => {
    const output = execFileSync("npm", ["run", "mobile:render:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      items: number;
      repoLocalReady: number;
      evidenceMissing: number;
      artifactBlocked: number;
      screenSections: number;
      viewportProfiles: number;
      nativeBuildProfiles: number;
      emulatorRenderProofs: number;
      signedArtifacts: number;
      externalNetworkCalls: number;
      realOrdersEnabled: number;
      liveProviderCalls: number;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-mobile-render-readiness-doctor",
      status: "ready",
      items: 8,
      repoLocalReady: 5,
      evidenceMissing: 2,
      artifactBlocked: 1,
      screenSections: 21,
      viewportProfiles: 4,
      nativeBuildProfiles: 3,
      emulatorRenderProofs: 0,
      signedArtifacts: 0,
      externalNetworkCalls: 0,
      realOrdersEnabled: 0,
      liveProviderCalls: 0,
      blockers: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "ready" }),
        expect.objectContaining({ lane: "mobile-source", status: "ready" }),
        expect.objectContaining({ lane: "native-profiles", status: "ready" }),
        expect.objectContaining({ lane: "surfaces", status: "ready" }),
        expect.objectContaining({ lane: "docs", status: "ready" }),
        expect.objectContaining({ lane: "ci", status: "ready" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a hosted API proof readiness report", () => {
    const output = execFileSync("npm", ["run", "hosted:api:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      items: number;
      repoLocalReady: number;
      evidenceMissing: number;
      protectionBlocked: number;
      routeContracts: number;
      requiredEnvVars: number;
      envSyncProofs: number;
      hostedDbProofs: number;
      publicRouteProofs: number;
      hostedTokenVerificationProofs: number;
      backupPolicies: number;
      deploymentProtectionBypasses: number;
      externalNetworkCalls: number;
      realOrdersEnabled: number;
      liveProviderCalls: number;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-hosted-api-readiness-doctor",
      status: "ready",
      items: 8,
      repoLocalReady: 2,
      evidenceMissing: 5,
      protectionBlocked: 1,
      routeContracts: 5,
      requiredEnvVars: 6,
      envSyncProofs: 0,
      hostedDbProofs: 0,
      publicRouteProofs: 0,
      hostedTokenVerificationProofs: 0,
      backupPolicies: 0,
      deploymentProtectionBypasses: 0,
      externalNetworkCalls: 0,
      realOrdersEnabled: 0,
      liveProviderCalls: 0,
      blockers: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "ready" }),
        expect.objectContaining({ lane: "vercel-source", status: "ready" }),
        expect.objectContaining({ lane: "hosted-env", status: "ready" }),
        expect.objectContaining({ lane: "surfaces", status: "ready" }),
        expect.objectContaining({ lane: "docs", status: "ready" }),
        expect.objectContaining({ lane: "ci", status: "ready" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a reviewer DB seed readiness report", () => {
    const output = execFileSync("npm", ["run", "reviewer:db:seed:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      items: number;
      repoLocalReady: number;
      evidenceMissing: number;
      hostedDatabaseRequired: number;
      hostedSeedExecutionRequired: number;
      hostedTokenProbeRequired: number;
      vercelEnvSyncRequired: number;
      tableContracts: number;
      routeContracts: number;
      requiredEnvVars: number;
      hostedSeedProofs: number;
      hostedTokenProbeProofs: number;
      vercelEnvSyncProofs: number;
      destructiveLiveMutations: number;
      externalNetworkCalls: number;
      liveProviderCalls: number;
      realOrdersEnabled: number;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-reviewer-db-seed-readiness-doctor",
      status: "ready",
      items: 8,
      repoLocalReady: 3,
      evidenceMissing: 5,
      hostedDatabaseRequired: 5,
      hostedSeedExecutionRequired: 3,
      hostedTokenProbeRequired: 4,
      vercelEnvSyncRequired: 5,
      tableContracts: 14,
      routeContracts: 5,
      requiredEnvVars: 6,
      hostedSeedProofs: 0,
      hostedTokenProbeProofs: 0,
      vercelEnvSyncProofs: 0,
      destructiveLiveMutations: 0,
      externalNetworkCalls: 0,
      liveProviderCalls: 0,
      realOrdersEnabled: 0,
      blockers: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "ready" }),
        expect.objectContaining({ lane: "seed-contract", status: "ready" }),
        expect.objectContaining({ lane: "token-contract", status: "ready" }),
        expect.objectContaining({ lane: "hosted-proof-boundary", status: "ready" }),
        expect.objectContaining({ lane: "surfaces", status: "ready" }),
        expect.objectContaining({ lane: "docs", status: "ready" }),
        expect.objectContaining({ lane: "ci", status: "ready" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a business engagement readiness report", () => {
    const output = execFileSync("npm", ["run", "business:engagement:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      items: number;
      repoLocalReady: number;
      evidenceMissing: number;
      approvalBlocked: number;
      crmAdapterContracts: number;
      workflowAdapterContracts: number;
      notificationAdapterContracts: number;
      lifecycleTriggerKinds: number;
      liveMessagesEnabled: number;
      crmWritesEnabled: number;
      externalNetworkCalls: number;
      realOrdersEnabled: number;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-business-engagement-readiness-doctor",
      status: "ready",
      items: 8,
      repoLocalReady: 4,
      evidenceMissing: 3,
      approvalBlocked: 1,
      crmAdapterContracts: 14,
      workflowAdapterContracts: 11,
      notificationAdapterContracts: 16,
      lifecycleTriggerKinds: 3,
      liveMessagesEnabled: 0,
      crmWritesEnabled: 0,
      externalNetworkCalls: 0,
      realOrdersEnabled: 0,
      blockers: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "ready" }),
        expect.objectContaining({ lane: "provider-catalog", status: "ready" }),
        expect.objectContaining({ lane: "provider-runtime", status: "ready" }),
        expect.objectContaining({ lane: "surfaces", status: "ready" }),
        expect.objectContaining({ lane: "docs", status: "ready" }),
        expect.objectContaining({ lane: "ci", status: "ready" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits an external audit evidence readiness report", () => {
    const output = execFileSync("npm", ["run", "external:audit:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      items: number;
      productionBlocked: number;
      publicClaimsAllowed: number;
      externalArtifactsAttached: number;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-external-audit-readiness-doctor",
      status: "ready",
      items: 15,
      productionBlocked: 15,
      publicClaimsAllowed: 0,
      externalArtifactsAttached: 0,
      blockers: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "ready" }),
        expect.objectContaining({ lane: "launch-gates", status: "ready" }),
        expect.objectContaining({ lane: "surfaces", status: "ready" }),
        expect.objectContaining({ lane: "docs", status: "ready" }),
        expect.objectContaining({ lane: "ci", status: "ready" }),
        expect.objectContaining({ lane: "safety", status: "ready" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a provider cost governance readiness report", () => {
    const output = execFileSync("npm", ["run", "provider:governance:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      adapterCount: number;
      usageBasedCount: number;
      blockedCount: number;
      liveProviderCalls: boolean;
      realOrdersEnabled: boolean;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-provider-governance-doctor",
      status: "ready",
      adapterCount: 121,
      usageBasedCount: expect.any(Number),
      blockedCount: 6,
      liveProviderCalls: false,
      realOrdersEnabled: false,
      blockers: []
    });
    expect(report.usageBasedCount).toBeGreaterThanOrEqual(57);
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "catalog", status: "ready" }),
        expect.objectContaining({ lane: "governance", status: "ready" }),
        expect.objectContaining({ lane: "surfaces", status: "ready" }),
        expect.objectContaining({ lane: "ci", status: "ready" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a localization readiness report", () => {
    const output = execFileSync("npm", ["run", "localization:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      localeCount: number;
      rtlCount: number;
      reviewRequiredCount: number;
      mobileLocaleCount: number;
      liveTranslationProvider: boolean;
      realOrdersEnabled: boolean;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-localization-doctor",
      status: "ready",
      localeCount: 4,
      rtlCount: 2,
      reviewRequiredCount: expect.any(Number),
      mobileLocaleCount: 4,
      liveTranslationProvider: false,
      realOrdersEnabled: false,
      blockers: []
    });
    expect(report.reviewRequiredCount).toBeGreaterThanOrEqual(3);
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "catalog", status: "ready" }),
        expect.objectContaining({ lane: "mobile", status: "ready" }),
        expect.objectContaining({ lane: "surfaces", status: "ready" }),
        expect.objectContaining({ lane: "ci", status: "ready" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a printer pricing research readiness report", () => {
    const output = execFileSync("npm", ["run", "printer:pricing:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      observationCount: number;
      officialSourceCount: number;
      collectionRuleCount: number;
      manualConfirmationCount: number;
      liveQuote: boolean;
      liveOrdersEnabled: boolean;
      lanes: Array<{ lane: string; status: string }>;
      blockers: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-printer-pricing-doctor",
      status: "ready",
      observationCount: 12,
      officialSourceCount: expect.any(Number),
      collectionRuleCount: expect.any(Number),
      manualConfirmationCount: 12,
      liveQuote: false,
      liveOrdersEnabled: false,
      blockers: []
    });
    expect(report.officialSourceCount).toBeGreaterThanOrEqual(9);
    expect(report.collectionRuleCount).toBeGreaterThanOrEqual(8);
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "catalog", status: "ready" }),
        expect.objectContaining({ lane: "collection", status: "ready" }),
        expect.objectContaining({ lane: "surfaces", status: "ready" }),
        expect.objectContaining({ lane: "ci", status: "ready" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("keeps mobile iOS/Android as a real app-shell package boundary", () => {
    const mobilePackage = read("apps/mobile/package.json");
    const appConfig = read("apps/mobile/app.config.js");
    const easConfig = read("apps/mobile/eas.json");
    const releaseDoctor = read("apps/mobile/scripts/release-doctor.mjs");
    const mobileRootApp = read("apps/mobile/App.tsx");
    const mobileApp = read("apps/mobile/src/App.tsx");
    const mobileExperience = read("apps/mobile/src/customerExperience.ts");

    expect(mobilePackage).toContain("\"expo\"");
    expect(mobilePackage).toContain("\"react-native\"");
    expect(mobilePackage).toContain("\"start\": \"expo start\"");
    expect(mobilePackage).toContain("\"ios\": \"expo start --ios\"");
    expect(mobilePackage).toContain("\"android\": \"expo start --android\"");
    expect(mobilePackage).toContain("\"release:doctor\": \"node ./scripts/release-doctor.mjs\"");
    expect(mobileRootApp.trim()).toBe('export { default } from "./src/App";');
    expect(appConfig).toContain('platforms: ["ios", "android"]');
    expect(appConfig).toContain("process.env.CUSTOMCARD_API_BASE_URL");
    expect(appConfig).not.toContain("${CUSTOMCARD_API_BASE_URL}");
    expect(appConfig).toContain("realOrderKillSwitch");
    expect(easConfig).toContain("\"developmentClient\": true");
    expect(easConfig).toContain("\"channel\": \"production\"");
    expect(easConfig).toContain("\"autoIncrement\": true");
    expect(easConfig).toContain("\"REAL_ORDER_KILL_SWITCH\": \"disabled\"");
    expect(easConfig).not.toContain("CUSTOMCARD_API_BASE_URL");
    expect(releaseDoctor).toContain("customcard-mobile-release-doctor");
    expect(releaseDoctor).toContain("signedArtifactBuilt: false");
    expect(releaseDoctor).toContain("nativeBuildProfiles");
    expect(mobileApp).toContain("mobileRenderSnapshot");
    expect(mobileApp).toContain("MobileRenderSection");
    expect(mobileApp).toContain("NextActionSection");
    expect(mobileApp).toContain("StandardSection");
    expect(mobileApp).toContain("SectionRow");
    expect(mobileApp).not.toContain("Proof boundary");
    expect(mobileApp).not.toContain("Workflow coverage");
    expect(mobileApp).not.toContain("Locale readiness");
    expect(mobileExperience).toContain("mobileRenderSnapshot");
    expect(mobileExperience).toContain("buildMobileRenderSnapshot");
    expect(mobileExperience).toContain("validateMobileRenderSnapshot");
    expect(mobileExperience).toContain("collectMobileCustomerCopy");
    expect(mobileExperience).toContain("Card assistant");
    expect(mobileExperience).toContain("Start with an event");
    expect(mobileExperience).toContain("Printing options");
    expect(mobileExperience).toContain("mobileChatTranscript");
    expect(mobileExperience).toContain("mobileRenderChoices");
    expect(mobileExperience).toContain("mobileAccountOptions");
    expect(mobileExperience).toContain("mobileImportActions");
    expect(mobileExperience).toContain("mobileFulfillmentRecommendations");
    expect(mobileExperience).toContain("mobileHandoffSteps");
    expect(mobileExperience).toContain("requiredMobileCapabilities");
    expect(mobileExperience).toContain("validateMobileExperience");
    expect(mobileExperience).toContain("Live AI and automatic orders stay off");
    const doctorOutput = execFileSync("node", ["apps/mobile/scripts/doctor.mjs"], {
      encoding: "utf8",
      env: { ...process.env, CUSTOMCARD_API_BASE_URL: "http://127.0.0.1:5173", REAL_ORDER_KILL_SWITCH: "disabled" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    expect(doctorOutput).toContain("customer experience contract");
  }, shellDoctorTimeoutMs);

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
        expect.objectContaining({ lane: "cloud-storage", status: "ready" }),
        expect.objectContaining({ lane: "runtime", status: "ready" }),
        expect.objectContaining({ lane: "data", status: "ready" })
      ])
    );
  }, shellDoctorTimeoutMs);

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
    expect(report.readiness.api).toMatchObject({ statefulRoutes: 13, idempotentMutations: 7 });
    expect(report.readiness.safety).toMatchObject({
      rawContentStored: false,
      liveExternalCalls: false,
      realOrdersEnabled: false
    });
  }, shellDoctorTimeoutMs);
});
