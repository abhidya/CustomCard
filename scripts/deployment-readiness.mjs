import { readFileSync } from "node:fs";

const files = {
  devCompose: "infra/docker-compose.dev.yml",
  dockerfile: "Dockerfile",
  dropletCompose: "infra/docker-compose.droplet.yml",
  envExample: "infra/env/.env.example",
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
  checkIncludes("runtime", "dockerfile-production-server", contents.dockerfile, [
    "FROM node:25-slim AS runtime",
    "npm ci --omit=dev",
    "COPY --from=build /app/dist ./dist",
    "COPY src ./src",
    "COPY apps/mobile/src ./apps/mobile/src",
    'CMD ["node", "scripts/api-server.mjs"]'
  ]),
  checkIncludes("runtime", "runtime-env-example", contents.envExample, [
    "DATABASE_URL=",
    "QUEUE_URL=",
    "OBJECT_STORE_URL=",
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
    "MISTRAL_API_KEY=",
    "TOGETHER_API_KEY=",
    "GROQ_API_KEY=",
    "DEEPSEEK_API_KEY=",
    "FIREWORKS_API_KEY=",
    "IDEOGRAM_API_KEY=",
    "LEONARDO_API_KEY=",
    "REPLICATE_API_TOKEN=",
    "FAL_KEY=",
    "BFL_API_KEY="
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

function checkIncludes(lane, id, text, required) {
  const missing = required.filter((needle) => !text.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Found ${required.length} required deployment signals.`
        : `Missing required deployment signals: ${missing.join(", ")}`
  };
}

function checkAbsent(lane, id, text, forbidden) {
  const present = forbidden.filter((needle) => text.includes(needle));
  return {
    id,
    lane,
    passed: present.length === 0,
    detail:
      present.length === 0
        ? `No forbidden deployment placeholders found.`
        : `Forbidden deployment placeholders present: ${present.join(", ")}`
  };
}
