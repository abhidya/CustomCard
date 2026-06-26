import { execFileSync, type ExecFileSyncOptionsWithStringEncoding } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { capacityProfiles, summarizeCapacityPlan, validateCapacityProfiles } from "../src/capacityPlan";

function read(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

function listFiles(path: string, root = path): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(path, entry.name);
    if (entry.isDirectory()) return listFiles(entryPath, root);
    if (entry.isFile()) return [relative(root, entryPath).replace(/\\/g, "/")];
    return [];
  });
}

const shellDoctorTimeoutMs = 60_000;
const nodeBinary = process.execPath;
const npmExecPath = process.env.npm_execpath;

function execNpm(args: string[], options: ExecFileSyncOptionsWithStringEncoding): string {
  if (npmExecPath) return execFileSync(nodeBinary, [npmExecPath, ...args], options);
  return execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", args, options);
}

const validMobileDoctorEnv = {
  CUSTOMCARD_API_BASE_URL: "https://api.customcard.test",
  CUSTOMCARD_APP_ENV: "qa",
  CUSTOMCARD_OAUTH_REDIRECT_URL: "customcard://sso-callback",
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_customcard",
  REAL_ORDER_KILL_SWITCH: "disabled"
};

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
      "provider_call_events",
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
    expect(migration).toContain("CREATE TABLE provider_call_events");
    expect(migration).toContain("tenant_id TEXT NOT NULL");
    expect(migration).toContain("month_bucket TEXT NOT NULL");
    expect(migration).toContain("estimated_cost_cents INTEGER NOT NULL");
    expect(migration).toContain("pii_free BOOLEAN NOT NULL DEFAULT TRUE CHECK (pii_free = TRUE)");
    expect(migration).toContain("live_network_call BOOLEAN NOT NULL DEFAULT FALSE");
    expect(migration).toContain("CREATE INDEX idx_provider_call_events_tenant_month");
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
    expect(dropletCompose).toContain("CUSTOMCARD_API_RUNTIME: postgres");
    expect(dropletCompose).toContain("AUTH_SESSION_SECRET: ${AUTH_SESSION_SECRET:?set AUTH_SESSION_SECRET}");
    expect(dropletCompose).toContain("${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}");
    expect(dropletCompose).toContain("SECRET_PROVIDER: managed_secret_store");
    expect(dropletCompose).not.toContain("SECRET_PROVIDER: local_env");
    expect(dropletCompose).toContain("reverse-proxy:");
    expect(dropletCompose).toContain("caddy:2-alpine");
    expect(dropletCompose).toContain('"80:80"');
    expect(dropletCompose).toContain('"443:443"');
    expect(dropletCompose).toContain("expose:");
    expect(dropletCompose).toContain('"4173"');
    expect(dropletCompose).not.toContain('"80:4173"');
    expect(dropletCompose).toContain("OBJECT_STORE_URL: https://${OBJECT_STORE_HOST:?set OBJECT_STORE_HOST}");
    expect(dropletCompose).toContain("OBJECT_STORE_PUBLIC_BASE_URL: https://${CADDY_DOMAIN:?set CADDY_DOMAIN}/api/artifacts");
    const caddyfile = read("infra/Caddyfile");
    expect(caddyfile).toContain("reverse_proxy app:4173");
    expect(caddyfile).toContain("Strict-Transport-Security");
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
    expect(k8s).toContain('CUSTOMCARD_API_RUNTIME: "postgres"');
    expect(k8s).toContain("AUTH_SESSION_SECRET");
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
    const output = execNpm(["run", "cloud:artifact:proof:doctor", "--silent"], {
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
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-cloud-artifact-proof-readiness-doctor",
      status: "repo-consistent",
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
      registerIssues: []
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
    expect(env).toContain("CADDY_DOMAIN=");
    expect(env).toContain("CADDY_ACME_EMAIL=");
    expect(env).toContain("OBJECT_STORE_URL=");
    expect(env).toContain("OBJECT_STORE_HOST=");
    expect(env).toContain("OBJECT_STORE_BUCKET=");
    expect(env).toContain("OBJECT_STORE_ACCESS_KEY_ID=");
    expect(env).toContain("OBJECT_STORE_SECRET_ACCESS_KEY=");
    expect(env).toContain("OBJECT_STORE_REGION=");
    expect(env).toContain("CUSTOMCARD_API_RUNTIME=contract");
    expect(env).toContain("OBJECT_STORE_SIGNING_SECRET=");
    expect(env).toContain("ARTIFACT_SIGNED_URL_TTL_MINUTES=");
    expect(env).toContain("AUTH_SESSION_SECRET=");
    expect(env).toContain("CUSTOMCARD_ENABLE_LOCAL_AUTH_FALLBACKS=disabled");
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
    expect(env).toContain("CLERK_ISSUER=");
    expect(env).toContain("CLERK_AUDIENCE=");
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
    expect(env).toContain("GOOGLE_OAUTH_REDIRECT_URI=");
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
    expect(env).toContain("CLOUDFLARE_ACCOUNT_ID=");
    expect(env).toContain("CLOUDFLARE_API_TOKEN=");
    expect(env).toContain("CLOUDFLARE_WORKERS_AI_TEXT_MODEL=");
    expect(env).toContain("CLOUDFLARE_WORKERS_AI_IMAGE_MODEL=");
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
    expect(env).toContain("DEEPAI_API_KEY=");
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
    expect(packageJson).toContain("\"mobile:web:preview\": \"vite --host 127.0.0.1 --open /?view=mobile\"");
    expect(packageJson).not.toContain("mobile:web:demo");
    expect(packageJson).toContain("\"demo:doctor\": \"node scripts/demo-reset.mjs\"");
    expect(packageJson).toContain("\"api:doctor:postgres:http\": \"CUSTOMCARD_POSTGRES_API_HTTP_DOCTOR=enabled node scripts/postgres-api-http-doctor.mjs\"");
    expect(packageJson).toContain("\"artifact:doctor:s3:live\": \"CUSTOMCARD_S3_ARTIFACT_DOCTOR=enabled node scripts/artifact-store-s3-live-doctor.mjs\"");
    expect(packageJson).toContain("\"cloud:doctor\": \"node scripts/cloud-artifact-iac-doctor.mjs\"");
    expect(packageJson).toContain("\"cloud:artifact:proof:doctor\": \"node scripts/cloud-artifact-proof-readiness-doctor.mjs\"");
    expect(packageJson).toContain("\"localization:doctor\": \"node scripts/localization-doctor.mjs\"");
    expect(packageJson).toContain("\"security:doctor\": \"node scripts/security-privacy-accessibility-doctor.mjs\"");
    expect(packageJson).toContain("\"customer:accessibility:doctor\": \"node scripts/customer-accessibility-evidence-doctor.mjs\"");
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
    expect(packageJson).toContain("\"retail:entrypoints:collect\": \"node scripts/retail-printer-entrypoint-collector.mjs\"");
    expect(packageJson).toContain("\"provider:governance:doctor\": \"node scripts/provider-governance-doctor.mjs\"");
    expect(packageJson).toContain("\"provider:operations:doctor\": \"node scripts/provider-operations-doctor.mjs\"");
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
    expect(viteConfig).toContain("src/providerOperations.ts");
    expect(viteConfig).toContain("src/providerRuntime.ts");
    expect(viteConfig).toContain("src/serviceKernel.ts");
    expect(viteConfig).toContain("statements: 90");
    expect(viteConfig).toContain("branches: 80");
    expect(viteConfig).toContain("functions: 90");
    expect(viteConfig).toContain("lines: 90");
  });

  it("keeps customer app bootstrap naming out of demo-only contracts", () => {
    const webAppSource = read("webapp/App.tsx");
    const appStateSource = read("src/appStateOrchestrator.ts");
    const reviewerBootstrap = read("src/reviewerBootstrap.ts");

    expect(webAppSource).toContain("../src/appStateOrchestrator");
    expect(appStateSource).toContain("reviewerDraftOptions");
    expect(appStateSource).toContain("reviewerWorkspaceKey");
    expect(webAppSource).not.toContain("./demoBootstrap");
    expect(appStateSource).not.toContain("./demoBootstrap");
    expect(appStateSource).not.toContain("demoInitialAuthForm");
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
    expect(workflow).toContain("npm run provider:operations:doctor");
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
    const output = execNpm(["run", "capacity:doctor", "--silent"], {
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
      registerIssues: unknown[];
    };
    const app = read("src/App.tsx");
    const apiContracts = read("src/apiContracts.ts");
    const apiServer = read("scripts/api-server.mjs");
    const readinessSummaryData = read("src/readinessSummaryData.mjs");
    const summary = summarizeCapacityPlan();

    expect(report).toMatchObject({
      service: "customcard-capacity-plan-doctor",
      status: "repo-consistent",
      profiles: 4,
      maxDailyCards: 12000,
      maxDailyImageGenerations: 1000,
      liveProviderCalls: false,
      realOrdersEnabled: false,
      registerIssues: []
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
    expect(`${app}\n${apiContracts}\n${apiServer}\n${readinessSummaryData}`).toContain("Capacity profiles");
    expect(`${app}\n${apiContracts}\n${apiServer}\n${readinessSummaryData}`).toContain("summarizeCapacityPlan");
  }, shellDoctorTimeoutMs);

  it("defines a Vercel static plus serverless API deployment contract", () => {
    const vercel = JSON.parse(read("vercel.json")) as {
      buildCommand: string;
      functions: Record<string, { excludeFiles: string }>;
      outputDirectory: string;
      rewrites: Array<{ source: string; destination: string }>;
    };
    const handler = read("api/[...path].js");
    const robotsHandler = read("api/robots.js");
    const apiServer = read("scripts/api-server.mjs");
    const apiRuntime = read("scripts/api-runtime.mjs");
    const vercelApiFiles = listFiles("api").map((path) => `api/${path}`).sort();

    expect(vercel).toMatchObject({
      buildCommand: "npm run build",
      outputDirectory: "dist"
    });
    expect(vercel.functions["api/**/*.js"].excludeFiles).toContain("docs/evidence/generated-card-comparisons/**");
    expect(vercel.functions["api/**/*.js"].excludeFiles).toContain("node_modules/puppeteer/**");
    expect(vercel.functions["api/**/*.js"].excludeFiles).toContain("node_modules/wrangler/**");
    expect(vercel.rewrites).toEqual([
      { source: "/robots.txt", destination: "/api/robots" },
      { source: "/api/artifacts/(.*)", destination: "/api/artifacts?objectKey=$1" },
      { source: "/api/(.*)", destination: "/api/$1" },
      { source: "/oauth/callback", destination: "/api/oauth/callback" },
      { source: "/((?!api/).*)", destination: "/index.html" }
    ]);
    expect(vercelApiFiles).toEqual(["api/[...path].js", "api/robots.js"]);
    expect(handler).toContain("handleApiRequest");
    expect(robotsHandler).toContain("PRODUCTION_ROBOTS");
    expect(apiServer).toContain("export async function handleApiRequest");
    expect(apiRuntime).toContain("CUSTOMCARD_API_RUNTIME");
    expect(apiRuntime).toContain("DATABASE_URL");
  });

  it("keeps retail operation starts on the shared server-safe Module", () => {
    const apiServer = read("scripts/api-server.mjs");
    const retailStart = read("src/retailPrinterOperationStart.ts");
    const retailStartData = read("src/retailPrinterOperationStartData.mjs");
    const retailRegistryData = read("src/retailPrinterRegistryData.mjs");

    expect(apiServer).toContain("../src/retailPrinterOperationStartData.mjs");
    expect(apiServer).toContain("buildRetailPrinterOperationStartPackets");
    expect(apiServer).toContain("buildRetailPrinterOperationStartResponse");
    expect(apiServer).not.toContain("const retailPrinterProductLinks");
    expect(apiServer).not.toContain("function buildRetailPrinterOperationStartPacket");
    expect(retailStart).toContain("./retailPrinterOperationStartData.mjs");
    expect(retailStartData).toContain("./retailPrinterRegistryData.mjs");
    expect(retailStartData).not.toContain("const retailPrinterProductLinks = {");
    expect(retailStartData).not.toContain("export const retailPrinterProductLinks = {");
    expect(retailRegistryData).toContain("retailPrinterRegistryProductLinks");
    expect(retailRegistryData).toContain("CRISPCARD");
    expect(retailRegistryData).toContain("JUNESW");
    expect(retailRegistryData).toContain("photos3.walmart.com");
  });

  it("ships a reviewer demo reset contract doctor", () => {
    const output = execNpm(["run", "demo:doctor", "--silent"], {
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
      rows: 18,
      signedArtifactUrls: true,
      realOrdersEnabled: false
    });
  }, shellDoctorTimeoutMs);

  it("exercises the Postgres API runtime contract without external database credentials", () => {
    const doctor = read("scripts/postgres-runtime-doctor.mjs");
    const output = execNpm(["run", "api:doctor:postgres", "--silent"], {
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
        idempotencyRecords: 7,
        auditRecords: 7,
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
    const output = execNpm(["run", "cloud:doctor", "--silent"], {
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
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-cloud-artifact-iac-doctor",
      status: "repo-consistent",
      module: "infra/aws/artifact-store",
      liveCloudCalls: false,
      realOrdersEnabled: false,
      registerIssues: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "bucket", status: "repo-consistent" }),
        expect.objectContaining({ lane: "policy", status: "repo-consistent" }),
        expect.objectContaining({ lane: "iam", status: "repo-consistent" }),
        expect.objectContaining({ lane: "inputs", status: "repo-consistent" }),
        expect.objectContaining({ lane: "outputs", status: "repo-consistent" }),
        expect.objectContaining({ lane: "safety", status: "repo-consistent" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a security privacy accessibility baseline report", () => {
    const output = execNpm(["run", "security:doctor", "--silent"], {
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
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-security-privacy-accessibility-doctor",
      status: "repo-consistent",
      externalAudit: false,
      legalReview: false,
      liveProviderCalls: false,
      realOrdersEnabled: false,
      registerIssues: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "security", status: "repo-consistent" }),
        expect.objectContaining({ lane: "privacy", status: "repo-consistent" }),
        expect.objectContaining({ lane: "accessibility", status: "repo-consistent" }),
        expect.objectContaining({ lane: "ci", status: "repo-consistent" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits an end-to-end coverage readiness report", () => {
    const output = execNpm(["run", "e2e:coverage:doctor", "--silent"], {
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
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-e2e-coverage-doctor",
      status: "repo-consistent",
      journeys: 29,
      repoLocalCoveragePercent: 100,
      ciGated: 29,
      liveProductionProofs: 0,
      realOrdersEnabled: 0,
      externalNetworkCalls: 0,
      registerIssues: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "matrix", status: "repo-consistent" }),
        expect.objectContaining({ lane: "surfaces", status: "repo-consistent" }),
        expect.objectContaining({ lane: "tests", status: "repo-consistent" }),
        expect.objectContaining({ lane: "docs", status: "repo-consistent" }),
        expect.objectContaining({ lane: "ci", status: "repo-consistent" }),
        expect.objectContaining({ lane: "safety", status: "repo-consistent" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits an AI provider readiness report", () => {
    const output = execNpm(["run", "ai:doctor", "--silent"], {
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
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-ai-provider-readiness-doctor",
      status: "repo-consistent",
      items: 8,
      textProviderContracts: 17,
      imageProviderContracts: 19,
      localFallbacks: 0,
      promptAuditRequired: 6,
      humanReviewRequired: 5,
      liveProviderCallsEnabled: 0,
      externalNetworkCalls: 0,
      productionTrafficEnabled: 0,
      registerIssues: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "repo-consistent" }),
        expect.objectContaining({ lane: "provider-contracts", status: "repo-consistent" }),
        expect.objectContaining({ lane: "surfaces", status: "repo-consistent" }),
        expect.objectContaining({ lane: "docs", status: "repo-consistent" }),
        expect.objectContaining({ lane: "ci", status: "repo-consistent" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits an observability readiness report", () => {
    const output = execNpm(["run", "observability:doctor", "--silent"], {
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
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-observability-readiness-doctor",
      status: "repo-consistent",
      items: 7,
      providerContracts: 6,
      alertRoutesRequired: 4,
      liveIngestionEnabled: 0,
      externalNetworkCalls: 0,
      productionAlertsEnabled: 0,
      registerIssues: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "repo-consistent" }),
        expect.objectContaining({ lane: "provider-runtime", status: "repo-consistent" }),
        expect.objectContaining({ lane: "surfaces", status: "repo-consistent" }),
        expect.objectContaining({ lane: "docs", status: "repo-consistent" }),
        expect.objectContaining({ lane: "ci", status: "repo-consistent" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a retail fulfillment readiness report", () => {
    const output = execNpm(["run", "retail:doctor", "--silent"], {
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
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-retail-fulfillment-readiness-doctor",
      status: "repo-consistent",
      items: 8,
      liveVendorAdapterContracts: 6,
      manualFallbacks: 2,
      recoveryDrillEvents: 21,
      liveQuoteEnabled: 0,
      directOrderEnabled: 0,
      externalNetworkCalls: 0,
      realPaymentsEnabled: 0,
      physicalCertificationAttached: 0,
      registerIssues: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "repo-consistent" }),
        expect.objectContaining({ lane: "provider-contracts", status: "repo-consistent" }),
        expect.objectContaining({ lane: "surfaces", status: "repo-consistent" }),
        expect.objectContaining({ lane: "docs", status: "repo-consistent" }),
        expect.objectContaining({ lane: "ci", status: "repo-consistent" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a payment readiness report", () => {
    const output = execNpm(["run", "payment:doctor", "--silent"], {
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
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-payment-readiness-doctor",
      status: "repo-consistent",
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
      registerIssues: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "repo-consistent" }),
        expect.objectContaining({ lane: "provider-contracts", status: "repo-consistent" }),
        expect.objectContaining({ lane: "surfaces", status: "repo-consistent" }),
        expect.objectContaining({ lane: "docs", status: "repo-consistent" }),
        expect.objectContaining({ lane: "ci", status: "repo-consistent" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a mobile render readiness report", () => {
    const output = execNpm(["run", "mobile:render:doctor", "--silent"], {
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
      evidenceArtifacts: number;
      emulatorSmokeEvidenceArtifacts: number;
      emulatorRenderProofs: number;
      signedArtifacts: number;
      externalNetworkCalls: number;
      realOrdersEnabled: number;
      liveProviderCalls: number;
      lanes: Array<{ lane: string; status: string }>;
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-mobile-render-readiness-doctor",
      status: "repo-consistent",
      items: 8,
      repoLocalReady: 5,
      evidenceMissing: 2,
      artifactBlocked: 1,
      screenSections: 21,
      viewportProfiles: 4,
      nativeBuildProfiles: 3,
      evidenceArtifacts: 11,
      emulatorSmokeEvidenceArtifacts: 11,
      emulatorRenderProofs: 0,
      signedArtifacts: 0,
      externalNetworkCalls: 0,
      realOrdersEnabled: 0,
      liveProviderCalls: 0,
      registerIssues: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "repo-consistent" }),
        expect.objectContaining({ lane: "mobile-source", status: "repo-consistent" }),
        expect.objectContaining({ lane: "native-profiles", status: "repo-consistent" }),
        expect.objectContaining({ lane: "surfaces", status: "repo-consistent" }),
        expect.objectContaining({ lane: "docs", status: "repo-consistent" }),
        expect.objectContaining({ lane: "ci", status: "repo-consistent" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a hosted API proof readiness report", () => {
    const output = execNpm(["run", "hosted:api:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      items: number;
      repoLocalReady: number;
      evidenceMissing: number;
      liveProofAttached: number;
      partialLiveProof: number;
      protectionBlocked: number;
      routeContracts: number;
      requiredEnvVars: number;
      liveHostedProofAttached: number;
      partialLiveHostedProofs: number;
      envSyncProofs: number;
      hostedDbProofs: number;
      publicRouteProofs: number;
      hostedTokenVerificationProofs: number;
      backupPolicies: number;
      deploymentProtectionBypasses: number;
      evidenceArtifacts: number;
      externalNetworkCalls: number;
      realOrdersEnabled: number;
      liveProviderCalls: number;
      lanes: Array<{ lane: string; status: string }>;
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-hosted-api-readiness-doctor",
      status: "repo-consistent",
      items: 8,
      repoLocalReady: 2,
      evidenceMissing: 2,
      liveProofAttached: 2,
      partialLiveProof: 2,
      protectionBlocked: 0,
      routeContracts: 5,
      requiredEnvVars: 13,
      liveHostedProofAttached: 2,
      partialLiveHostedProofs: 2,
      envSyncProofs: 0,
      hostedDbProofs: 2,
      publicRouteProofs: 2,
      hostedTokenVerificationProofs: 0,
      backupPolicies: 0,
      deploymentProtectionBypasses: 1,
      evidenceArtifacts: 10,
      externalNetworkCalls: 0,
      realOrdersEnabled: 0,
      liveProviderCalls: 0,
      registerIssues: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "repo-consistent" }),
        expect.objectContaining({ lane: "vercel-source", status: "repo-consistent" }),
        expect.objectContaining({ lane: "hosted-env", status: "repo-consistent" }),
        expect.objectContaining({ lane: "surfaces", status: "repo-consistent" }),
        expect.objectContaining({ lane: "docs", status: "repo-consistent" }),
        expect.objectContaining({ lane: "ci", status: "repo-consistent" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a reviewer DB seed readiness report", () => {
    const output = execNpm(["run", "reviewer:db:seed:doctor", "--silent"], {
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
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-reviewer-db-seed-readiness-doctor",
      status: "repo-consistent",
      items: 8,
      repoLocalReady: 3,
      evidenceMissing: 5,
      hostedDatabaseRequired: 5,
      hostedSeedExecutionRequired: 3,
      hostedTokenProbeRequired: 4,
      vercelEnvSyncRequired: 5,
      tableContracts: 15,
      routeContracts: 5,
      requiredEnvVars: 7,
      hostedSeedProofs: 0,
      hostedTokenProbeProofs: 0,
      vercelEnvSyncProofs: 0,
      destructiveLiveMutations: 0,
      externalNetworkCalls: 0,
      liveProviderCalls: 0,
      realOrdersEnabled: 0,
      registerIssues: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "repo-consistent" }),
        expect.objectContaining({ lane: "seed-contract", status: "repo-consistent" }),
        expect.objectContaining({ lane: "token-contract", status: "repo-consistent" }),
        expect.objectContaining({ lane: "hosted-proof-boundary", status: "repo-consistent" }),
        expect.objectContaining({ lane: "surfaces", status: "repo-consistent" }),
        expect.objectContaining({ lane: "docs", status: "repo-consistent" }),
        expect.objectContaining({ lane: "ci", status: "repo-consistent" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a business engagement readiness report", () => {
    const output = execNpm(["run", "business:engagement:doctor", "--silent"], {
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
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-business-engagement-readiness-doctor",
      status: "repo-consistent",
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
      registerIssues: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "repo-consistent" }),
        expect.objectContaining({ lane: "provider-catalog", status: "repo-consistent" }),
        expect.objectContaining({ lane: "provider-runtime", status: "repo-consistent" }),
        expect.objectContaining({ lane: "surfaces", status: "repo-consistent" }),
        expect.objectContaining({ lane: "docs", status: "repo-consistent" }),
        expect.objectContaining({ lane: "ci", status: "repo-consistent" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits an external audit evidence readiness report", () => {
    const output = execNpm(["run", "external:audit:doctor", "--silent"], {
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
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-external-audit-readiness-doctor",
      status: "repo-consistent",
      items: 15,
      productionBlocked: 15,
      publicClaimsAllowed: 0,
      externalArtifactsAttached: 0,
      registerIssues: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "repo-consistent" }),
        expect.objectContaining({ lane: "launch-gates", status: "repo-consistent" }),
        expect.objectContaining({ lane: "surfaces", status: "repo-consistent" }),
        expect.objectContaining({ lane: "docs", status: "repo-consistent" }),
        expect.objectContaining({ lane: "ci", status: "repo-consistent" }),
        expect.objectContaining({ lane: "safety", status: "repo-consistent" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a provider cost governance readiness report", () => {
    const output = execNpm(["run", "provider:governance:doctor", "--silent"], {
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
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-provider-governance-doctor",
      status: "repo-consistent",
      adapterCount: expect.any(Number),
      usageBasedCount: expect.any(Number),
      blockedCount: 6,
      liveProviderCalls: false,
      realOrdersEnabled: false,
      registerIssues: []
    });
    expect(report.adapterCount).toBeGreaterThanOrEqual(121);
    expect(report.usageBasedCount).toBeGreaterThanOrEqual(57);
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "catalog", status: "repo-consistent" }),
        expect.objectContaining({ lane: "governance", status: "repo-consistent" }),
        expect.objectContaining({ lane: "surfaces", status: "repo-consistent" }),
        expect.objectContaining({ lane: "ci", status: "repo-consistent" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a provider operations failover readiness report", () => {
    const output = execNpm(["run", "provider:operations:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      ledgerTable: string;
      fallbackReasons: number;
      liveProviderCalls: boolean;
      realOrdersEnabled: boolean;
      lanes: Array<{ lane: string; status: string }>;
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-provider-operations-doctor",
      status: "repo-consistent",
      ledgerTable: "provider_call_events",
      fallbackReasons: 9,
      liveProviderCalls: false,
      realOrdersEnabled: false,
      registerIssues: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "router", status: "repo-consistent" }),
        expect.objectContaining({ lane: "ledger", status: "repo-consistent" }),
        expect.objectContaining({ lane: "runtime", status: "repo-consistent" }),
        expect.objectContaining({ lane: "docs", status: "repo-consistent" }),
        expect.objectContaining({ lane: "ci", status: "repo-consistent" }),
        expect.objectContaining({ lane: "safety", status: "repo-consistent" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a localization readiness report", () => {
    const output = execNpm(["run", "localization:doctor", "--silent"], {
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
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-localization-doctor",
      status: "repo-consistent",
      localeCount: 4,
      rtlCount: 2,
      reviewRequiredCount: expect.any(Number),
      mobileLocaleCount: 4,
      liveTranslationProvider: false,
      realOrdersEnabled: false,
      registerIssues: []
    });
    expect(report.reviewRequiredCount).toBeGreaterThanOrEqual(3);
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "catalog", status: "repo-consistent" }),
        expect.objectContaining({ lane: "mobile", status: "repo-consistent" }),
        expect.objectContaining({ lane: "surfaces", status: "repo-consistent" }),
        expect.objectContaining({ lane: "ci", status: "repo-consistent" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("emits a printer pricing research readiness report", () => {
    const output = execNpm(["run", "printer:pricing:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const pricingResearch = read("docs/printer-pricing-research.md");
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
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-printer-pricing-doctor",
      status: "repo-consistent",
      observationCount: 12,
      officialSourceCount: expect.any(Number),
      collectionRuleCount: expect.any(Number),
      manualConfirmationCount: 12,
      liveQuote: false,
      liveOrdersEnabled: false,
      registerIssues: []
    });
    expect(report.officialSourceCount).toBeGreaterThanOrEqual(9);
    expect(report.collectionRuleCount).toBeGreaterThanOrEqual(8);
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "catalog", status: "repo-consistent" }),
        expect.objectContaining({ lane: "collection", status: "repo-consistent" }),
        expect.objectContaining({ lane: "surfaces", status: "repo-consistent" }),
        expect.objectContaining({ lane: "ci", status: "repo-consistent" })
      ])
    );
    expect(pricingResearch).toContain("FMTC Deal Feed");
    expect(pricingResearch).toContain("Rakuten Advertising Coupon Feed API");
    expect(pricingResearch).toMatch(/official Walgreens Photo\s+deals page/);
    expect(pricingResearch).toMatch(/official CVS Photo coupons page/);
    expect(pricingResearch).toMatch(/keep The Coupon Bureau out of this\s+retailer photo-card promo-code flow/);
    expect(pricingResearch).toContain("02:47 UTC `operator-chromium-rendered-read`");
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
    expect(mobilePackage).toContain("\"ios\": \"expo run:ios\"");
    expect(mobilePackage).toContain("\"ios:review\": \"EXPO_UNSTABLE_HEADLESS=1 expo start --localhost --ios\"");
    expect(mobilePackage).toContain("\"android\": \"expo run:android\"");
    expect(mobilePackage).toContain("\"android:review\": \"EXPO_UNSTABLE_HEADLESS=1 expo start --localhost --android\"");
    expect(mobilePackage).toContain("\"release:doctor\": \"node ./scripts/release-doctor.mjs\"");
    expect(mobileRootApp.trim()).toBe('export { default } from "./src/App";');
    expect(appConfig).toContain('platforms: ["ios", "android"]');
    expect(appConfig).toContain("env.CUSTOMCARD_API_BASE_URL");
    expect(appConfig).toContain("env.CUSTOMCARD_QA_API_BASE_URL");
    expect(appConfig).toContain("env.CUSTOMCARD_PRODUCTION_API_BASE_URL");
    expect(appConfig).not.toContain("${CUSTOMCARD_API_BASE_URL}");
    expect(appConfig).toContain("realOrderKillSwitch");
    expect(easConfig).toContain("\"developmentClient\": true");
    expect(easConfig).toContain("\"channel\": \"production\"");
    expect(easConfig).toContain("\"autoIncrement\": true");
    expect(easConfig).toContain("\"REAL_ORDER_KILL_SWITCH\": \"disabled\"");
    expect(easConfig).not.toContain("CUSTOMCARD_API_BASE_URL");
    expect(easConfig).not.toContain("CUSTOMCARD_QA_API_BASE_URL");
    expect(easConfig).not.toContain("CUSTOMCARD_PRODUCTION_API_BASE_URL");
    expect(releaseDoctor).toContain("customcard-mobile-release-doctor");
    expect(releaseDoctor).toContain("signedArtifactBuilt: false");
    expect(releaseDoctor).toContain("nativeBuildProfiles");
    expect(mobileApp).toContain("mobileRenderSnapshot");
    expect(mobileApp).toContain("Pressable");
    expect(mobileApp).toContain("accessibilityRole=\"button\"");
    expect(mobileApp).toContain("ActionSurface");
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
    expect(mobileExperience).toContain("secondaryActions");
    expect(mobileExperience).toContain("tappableActionCount");
    expect(mobileExperience).toContain("disabledActionCount");
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
    expect(mobileExperience).toContain("automatic orders stay off");
    const doctorOutput = execFileSync("node", ["apps/mobile/scripts/doctor.mjs"], {
      encoding: "utf8",
      env: { ...process.env, ...validMobileDoctorEnv },
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
      registerIssues: unknown[];
    };

    expect(report.status).toBe("repo-consistent");
    expect(report.registerIssues).toEqual([]);
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "local-dev", status: "repo-consistent" }),
        expect.objectContaining({ lane: "cheap-droplet", status: "repo-consistent" }),
        expect.objectContaining({ lane: "cloud-native", status: "repo-consistent" }),
        expect.objectContaining({ lane: "cloud-storage", status: "repo-consistent" }),
        expect.objectContaining({ lane: "runtime", status: "repo-consistent" }),
        expect.objectContaining({ lane: "data", status: "repo-consistent" })
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
          providerUsageLedger: boolean;
          queueJobs: boolean;
        };
        api: { statefulRoutes: number; idempotentMutations: number };
        localBrowserState: {
          auditItems: number;
          dbRequiredItems: number;
          objectStoreRequiredItems: number;
          browserOnlyItems: number;
          workspaceKey: string;
          browserOnlyKeys: string[];
        };
        safety: { rawContentStored: boolean; liveExternalCalls: boolean; realOrdersEnabled: boolean };
      };
      registerIssues: unknown[];
    };

    expect(report.status).toBe("repo-consistent");
    expect(report.registerIssues).toEqual([]);
    expect(report.readiness.tables).toMatchObject({
      total: 21,
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
      providerUsageLedger: true,
      queueJobs: true
    });
    expect(report.readiness.api).toMatchObject({ statefulRoutes: 37, idempotentMutations: 21 });
    expect(report.readiness.localBrowserState).toMatchObject({
      auditItems: 6,
      dbRequiredItems: 0,
      objectStoreRequiredItems: 0,
      browserOnlyItems: 0
    });
    expect(report.readiness.safety).toMatchObject({
      rawContentStored: false,
      liveExternalCalls: false,
      realOrdersEnabled: false
    });
  }, shellDoctorTimeoutMs);
});
