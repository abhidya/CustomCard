import { readFileSync } from "node:fs";
import { checkAbsent, checkIncludes } from "./doctor-harness.mjs";

const files = {
  devCompose: "infra/docker-compose.dev.yml",
  dockerfile: "Dockerfile",
  dropletCompose: "infra/docker-compose.droplet.yml",
  envExample: "infra/env/.env.example",
  vercel: "vercel.json",
  vercelApiHandler: "api/[...path].mjs",
  apiServer: "scripts/api-server.mjs",
  apiRuntime: "scripts/api-runtime.mjs",
  cloudArtifactMain: "infra/aws/artifact-store/main.tf",
  cloudArtifactVariables: "infra/aws/artifact-store/variables.tf",
  cloudArtifactOutputs: "infra/aws/artifact-store/outputs.tf",
  k8s: "infra/k8s/app.yaml",
  migration: "infra/migrations/001_initial_schema.sql"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const checks = [
  checkIncludes("local-dev", "dev-compose-app", contents.devCompose, ["app:", "npm run dev", "5173:5173"]),
  checkIncludes("local-dev", "dev-compose-worker", contents.devCompose, ["worker:", "npm run worker"]),
  checkIncludes("local-dev", "dev-compose-services", contents.devCompose, ["postgres:", "redis:", "minio:"]),
  checkIncludes("local-dev", "dev-compose-minio-artifact-credentials", contents.devCompose, [
    "MINIO_ROOT_USER: customcard",
    "MINIO_ROOT_PASSWORD: customcard-dev-only",
    "OBJECT_STORE_ACCESS_KEY_ID: customcard",
    "OBJECT_STORE_SECRET_ACCESS_KEY: customcard-dev-only",
    "OBJECT_STORE_REGION: us-east-1"
  ]),
  checkIncludes("local-dev", "dev-compose-kill-switch", contents.devCompose, [
    "REAL_ORDER_KILL_SWITCH: disabled",
    "WALGREENS_VENDOR_MODE: disabled_until_certified",
    "CVS_VENDOR_MODE: disabled_until_certified",
    "FEDEX_VENDOR_MODE: disabled_until_certified",
    "WALMART_VENDOR_MODE: disabled_until_certified",
    "STAPLES_VENDOR_MODE: disabled_until_certified",
    "OFFICE_DEPOT_VENDOR_MODE: disabled_until_certified"
  ]),
  checkIncludes("cheap-droplet", "droplet-runtime-target", contents.dropletCompose, [
    "target: runtime",
    'restart: unless-stopped',
    "80:4173"
  ]),
  checkIncludes("cheap-droplet", "droplet-managed-secrets", contents.dropletCompose, [
    "SECRET_PROVIDER: managed_secret_store",
    "${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}",
    "REAL_ORDER_KILL_SWITCH: disabled",
    "WALGREENS_VENDOR_MODE: disabled_until_certified",
    "CVS_VENDOR_MODE: disabled_until_certified",
    "FEDEX_VENDOR_MODE: disabled_until_certified",
    "WALMART_VENDOR_MODE: disabled_until_certified",
    "STAPLES_VENDOR_MODE: disabled_until_certified",
    "OFFICE_DEPOT_VENDOR_MODE: disabled_until_certified"
  ]),
  checkIncludes("cheap-droplet", "droplet-stateful-services", contents.dropletCompose, [
    "postgres:",
    "redis:",
    "redis-server --appendonly yes",
    "customcard-postgres:",
    "customcard-redis:",
    "customcard-objects:"
  ]),
  checkIncludes("cheap-droplet", "droplet-object-store-mounted-by-app-and-worker", contents.dropletCompose, [
    "app:",
    "worker:",
    "OBJECT_STORE_URL: file:///data/objects",
    "OBJECT_STORE_SIGNING_SECRET:",
    "customcard-objects:/data/objects"
  ]),
  checkIncludes("cloud-native", "k8s-secret-manager-boundary", contents.k8s, [
    "kind: Secret",
    'customcard.io/provisioning: "pre-created-by-secret-manager"',
    "data: {}"
  ]),
  checkIncludes("cloud-native", "k8s-migration-before-rollout", contents.k8s, [
    "kind: Job",
    "name: customcard-migrate",
    "npm run runtime:doctor && npm run migrate"
  ]),
  checkIncludes("cloud-native", "k8s-web-worker-deployments", contents.k8s, [
    "name: customcard-web",
    "name: customcard-worker",
    "replicas: 3",
    "replicas: 2"
  ]),
  checkIncludes("cloud-native", "k8s-runtime-env-gates", contents.k8s, [
    "secretRef:",
    "configMapRef:",
    "OBJECT_STORE_ACCESS_KEY_ID",
    "OBJECT_STORE_SECRET_ACCESS_KEY",
    "OBJECT_STORE_SIGNING_SECRET",
    "ARTIFACT_SIGNED_URL_TTL_MINUTES",
    "REAL_ORDER_KILL_SWITCH",
    "WALGREENS_VENDOR_MODE",
    "CVS_VENDOR_MODE",
    "FEDEX_VENDOR_MODE",
    "WALMART_VENDOR_MODE",
    "STAPLES_VENDOR_MODE",
    "OFFICE_DEPOT_VENDOR_MODE",
    "runtime:doctor"
  ]),
  checkIncludes("cloud-native", "k8s-probes-and-resources", contents.k8s, [
    "readinessProbe:",
    "livenessProbe:",
    "/api/health",
    "resources:",
    "requests:",
    "limits:"
  ]),
  checkAbsent("cloud-native", "k8s-no-placeholder-or-latest-image", contents.k8s, [
    "replace-me",
    "ghcr.io/example",
    ":latest"
  ]),
  checkIncludes("vercel", "vercel-static-api-routing", contents.vercel, [
    '"buildCommand": "npm run build"',
    '"outputDirectory": "dist"',
    '"source": "/api/(.*)"',
    '"destination": "/api/$1"',
    '"destination": "/index.html"'
  ]),
  checkIncludes("vercel", "vercel-serverless-api-handler", `${contents.vercelApiHandler}\n${contents.apiServer}\n${contents.apiRuntime}`, [
    "handleApiRequest",
    "export async function handleApiRequest",
    "CUSTOMCARD_API_RUNTIME",
    "DATABASE_URL"
  ]),
  checkIncludes("cloud-storage", "aws-artifact-bucket-policy", contents.cloudArtifactMain, [
    'resource "aws_s3_bucket" "artifacts"',
    'resource "aws_s3_bucket_public_access_block" "artifacts"',
    'resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts"',
    'resource "aws_s3_bucket_versioning" "artifacts"',
    'resource "aws_s3_bucket_lifecycle_configuration" "artifacts"',
    'sid    = "DenyInsecureTransport"',
    'sid    = "DenyUnencryptedObjectUploads"'
  ]),
  checkIncludes("cloud-storage", "aws-artifact-writer-iam", contents.cloudArtifactMain, [
    'data "aws_iam_policy_document" "artifact_writer"',
    '"s3:PutObject"',
    '"s3:GetObject"',
    '"s3:DeleteObject"',
    'values   = ["projects/*"]',
    'resource "aws_iam_role_policy_attachment" "app_artifact_writer"',
    'resource "aws_iam_role_policy_attachment" "worker_artifact_writer"'
  ]),
  checkIncludes("cloud-storage", "aws-artifact-safe-inputs-and-env-outputs", `${contents.cloudArtifactVariables}\n${contents.cloudArtifactOutputs}`, [
    "artifact_retention_days >= 7",
    "artifact_retention_days <= 365",
    "noncurrent_artifact_retention_days >= 1",
    "default     = false",
    "OBJECT_STORE_URL",
    "OBJECT_STORE_BUCKET",
    "OBJECT_STORE_REGION",
    "OBJECT_STORE_SIGNING_SECRET",
    "REAL_ORDER_KILL_SWITCH"
  ]),
  checkIncludes("runtime", "dockerfile-production-server", contents.dockerfile, [
    "FROM node:25-slim AS runtime",
    "npm ci --omit=dev",
    "COPY --from=build /app/dist ./dist",
    "COPY src ./src",
    "COPY apps/mobile/App.tsx ./apps/mobile/App.tsx",
    "COPY apps/mobile/src ./apps/mobile/src",
    'CMD ["node", "scripts/api-server.mjs"]'
  ]),
  checkIncludes("runtime", "runtime-env-example", contents.envExample, [
    "DATABASE_URL=",
    "QUEUE_URL=",
    "OBJECT_STORE_URL=",
    "OBJECT_STORE_BUCKET=",
    "OBJECT_STORE_ACCESS_KEY_ID=",
    "OBJECT_STORE_SECRET_ACCESS_KEY=",
    "OBJECT_STORE_REGION=",
    "OBJECT_STORE_SIGNING_SECRET=",
    "ARTIFACT_SIGNED_URL_TTL_MINUTES=",
    "CUSTOMCARD_API_RUNTIME=contract",
    "AUTH_SESSION_SECRET=",
    "CUSTOMCARD_CUSTOMER_SESSION_TOKEN=",
    "CUSTOMCARD_ADMIN_SESSION_TOKEN=",
    "CUSTOMCARD_AUTH_CALLBACK_URL=",
    "IDEMPOTENCY_KEY_TTL_HOURS=",
    "AUTH0_DOMAIN=",
    "AUTH0_CLIENT_ID=",
    "AUTH0_CLIENT_SECRET=",
    "AUTH0_AUDIENCE=",
    "CLERK_SECRET_KEY=",
    "CLERK_JWT_KEY=",
    "CLERK_AUTHORIZED_PARTIES=",
    "SUPABASE_URL=",
    "SUPABASE_ANON_KEY=",
    "SUPABASE_SERVICE_ROLE_KEY=",
    "FIREBASE_API_KEY=",
    "FIREBASE_PROJECT_ID=",
    "FIREBASE_SERVICE_ACCOUNT_JSON=",
    "COGNITO_DOMAIN=",
    "COGNITO_USER_POOL_ID=",
    "COGNITO_APP_CLIENT_ID=",
    "CARDDAV_BASE_URL=",
    "CARDDAV_USERNAME=",
    "CARDDAV_APP_PASSWORD=",
    "CARDDAV_ADDRESSBOOK_PATH=",
    "SALESFORCE_INSTANCE_URL=",
    "SALESFORCE_CLIENT_ID=",
    "SALESFORCE_CLIENT_SECRET=",
    "SALESFORCE_REFRESH_TOKEN=",
    "HUBSPOT_PRIVATE_APP_TOKEN=",
    "HUBSPOT_PORTAL_ID=",
    "ZOHO_ACCOUNTS_DOMAIN=",
    "ZOHO_API_DOMAIN=",
    "ZOHO_CLIENT_ID=",
    "ZOHO_CLIENT_SECRET=",
    "ZOHO_REFRESH_TOKEN=",
    "PIPEDRIVE_COMPANY_DOMAIN=",
    "PIPEDRIVE_API_TOKEN=",
    "DYNAMICS_RESOURCE_URL=",
    "DYNAMICS_TENANT_ID=",
    "DYNAMICS_CLIENT_ID=",
    "DYNAMICS_CLIENT_SECRET=",
    "SHOPIFY_SHOP_DOMAIN=",
    "SHOPIFY_ADMIN_ACCESS_TOKEN=",
    "REAL_ORDER_KILL_SWITCH=disabled",
    "WALGREENS_VENDOR_MODE=disabled_until_certified",
    "CVS_VENDOR_MODE=disabled_until_certified",
    "FEDEX_VENDOR_MODE=disabled_until_certified",
    "WALMART_VENDOR_MODE=disabled_until_certified",
    "STAPLES_VENDOR_MODE=disabled_until_certified",
    "OFFICE_DEPOT_VENDOR_MODE=disabled_until_certified",
    "OPENAI_API_KEY=",
    "AZURE_OPENAI_ENDPOINT=",
    "AZURE_OPENAI_API_KEY=",
    "AZURE_OPENAI_CHAT_DEPLOYMENT=",
    "AZURE_OPENAI_IMAGE_DEPLOYMENT=",
    "AWS_ACCESS_KEY_ID=",
    "AWS_SECRET_ACCESS_KEY=",
    "AWS_REGION=",
    "BEDROCK_TEXT_MODEL_ID=",
    "BEDROCK_IMAGE_MODEL_ID=",
    "CLOUDFLARE_ACCOUNT_ID=",
    "CLOUDFLARE_API_TOKEN=",
    "CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN=",
    "CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN=",
    "CLOUDFLARE_WORKERS_AI_TEXT_MODEL=",
    "CLOUDFLARE_WORKERS_AI_IMAGE_MODEL=",
    "MISTRAL_API_KEY=",
    "TOGETHER_API_KEY=",
    "GROQ_API_KEY=",
    "DEEPSEEK_API_KEY=",
    "DEEPAI_API_KEY=",
    "FIREWORKS_API_KEY=",
    "IDEOGRAM_API_KEY=",
    "LEONARDO_API_KEY=",
    "REPLICATE_API_TOKEN=",
    "FAL_KEY=",
    "BFL_API_KEY=",
    "RESEND_API_KEY=",
    "SENDGRID_API_KEY=",
    "POSTMARK_SERVER_TOKEN=",
    "MAILGUN_API_KEY=",
    "MAILGUN_DOMAIN=",
    "TWILIO_ACCOUNT_SID=",
    "TWILIO_AUTH_TOKEN=",
    "TWILIO_MESSAGING_SERVICE_SID=",
    "WHATSAPP_ACCESS_TOKEN=",
    "WHATSAPP_PHONE_NUMBER_ID=",
    "EXPO_ACCESS_TOKEN=",
    "STRIPE_SECRET_KEY=",
    "STRIPE_WEBHOOK_SECRET=",
    "CUSTOMCARD_PAYMENT_SUCCESS_URL=",
    "CUSTOMCARD_PAYMENT_CANCEL_URL=",
    "PAYPAL_CLIENT_ID=",
    "PAYPAL_CLIENT_SECRET=",
    "PAYPAL_WEBHOOK_ID=",
    "SQUARE_ACCESS_TOKEN=",
    "SQUARE_LOCATION_ID=",
    "SQUARE_WEBHOOK_SIGNATURE_KEY=",
    "ADYEN_API_KEY=",
    "ADYEN_MERCHANT_ACCOUNT=",
    "ADYEN_HMAC_KEY=",
    "SENTRY_DSN=",
    "SENTRY_PROJECT_ID=",
    "SENTRY_ENVIRONMENT=",
    "POSTHOG_PROJECT_API_KEY=",
    "POSTHOG_HOST=",
    "OTEL_EXPORTER_OTLP_ENDPOINT=",
    "OTEL_EXPORTER_OTLP_HEADERS=",
    "GRAFANA_OTLP_ENDPOINT=",
    "GRAFANA_OTLP_INSTANCE_ID=",
    "GRAFANA_OTLP_API_KEY=",
    "DATADOG_API_KEY=",
    "DATADOG_SITE=",
    "BETTERSTACK_SOURCE_TOKEN=",
    "BETTERSTACK_INGESTING_HOST="
  ]),
  checkIncludes("data", "migration-critical-tables", contents.migration, [
    "CREATE TABLE users",
    "CREATE TABLE auth_sessions",
    "CREATE TABLE provider_connections",
    "CREATE TABLE render_packets",
    "CREATE TABLE orders",
    "CREATE TABLE idempotency_keys",
    "CREATE TABLE api_jobs",
    "CREATE TABLE audit_log"
  ]),
  checkIncludes("data", "migration-safety-constraints", contents.migration, [
    "CHECK (raw_content_stored = FALSE)",
    "CHECK (width = 1500)",
    "CHECK (dpi = 300)",
    "checksum TEXT NOT NULL",
    "artifact_manifest JSONB NOT NULL",
    "signed_url_expires_at TIMESTAMPTZ NOT NULL",
    "CHECK (real_orders_enabled = FALSE)",
    "UNIQUE (user_id, route_id, idempotency_key)",
    "CREATE UNIQUE INDEX idx_auth_sessions_hash"
  ])
];

const lanes = Array.from(new Set(checks.map((item) => item.lane))).map((lane) => {
  const laneChecks = checks.filter((item) => item.lane === lane);
  return {
    lane,
    passed: laneChecks.filter((item) => item.passed).length,
    total: laneChecks.length,
    status: laneChecks.every((item) => item.passed) ? "ready" : "blocked"
  };
});

const failed = checks.filter((item) => !item.passed);
const report = {
  service: "customcard-deployment-readiness",
  status: failed.length === 0 ? "ready" : "blocked",
  lanes,
  checks,
  blockers: failed.map((item) => ({ id: item.id, lane: item.lane, detail: item.detail }))
};

console.log(JSON.stringify(report, null, 2));

if (failed.length > 0) {
  process.exit(1);
}

