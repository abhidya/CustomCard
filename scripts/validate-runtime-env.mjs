const requiredEnv = [
  "CUSTOMCARD_ENV",
  "CUSTOMCARD_API_RUNTIME",
  "DATABASE_URL",
  "QUEUE_URL",
  "OBJECT_STORE_URL",
  "OBJECT_STORE_SIGNING_SECRET",
  "AUTH_SESSION_SECRET",
  "REAL_ORDER_KILL_SWITCH"
];
const runtimeModes = new Set(["contract", "memory", "postgres"]);
const productionEnvNames = new Set(["prod", "production"]);
const placeholderPattern = /replace-me|placeholder|changeme|__set_|example/i;
const missing = requiredEnv.filter((key) => !process.env[key]);
const placeholders = requiredEnv.filter((key) => placeholderPattern.test(process.env[key] ?? ""));
const runtimeMode = String(process.env.CUSTOMCARD_API_RUNTIME ?? "").trim();
const customCardEnv = String(process.env.CUSTOMCARD_ENV ?? "").trim().toLowerCase();
const nodeEnv = String(process.env.NODE_ENV ?? "").trim().toLowerCase();
const productionRuntime = productionEnvNames.has(customCardEnv) || nodeEnv === "production";

if (missing.length > 0 || placeholders.length > 0) {
  if (missing.length > 0) console.error(`CustomCard runtime missing env: ${missing.join(", ")}`);
  if (placeholders.length > 0) console.error(`CustomCard runtime has placeholder env: ${placeholders.join(", ")}`);
  process.exit(1);
}

if (!runtimeModes.has(runtimeMode)) {
  console.error(`CustomCard runtime requires CUSTOMCARD_API_RUNTIME to be one of: ${[...runtimeModes].join(", ")}.`);
  process.exit(1);
}

if (productionRuntime && runtimeMode !== "postgres") {
  console.error("CustomCard production runtime requires CUSTOMCARD_API_RUNTIME=postgres.");
  process.exit(1);
}

if (process.env.REAL_ORDER_KILL_SWITCH !== "disabled") {
  console.error("CustomCard runtime requires REAL_ORDER_KILL_SWITCH=disabled until certification is recorded.");
  process.exit(1);
}

if ((process.env.AUTH_SESSION_SECRET ?? "").length < 32) {
  console.error("CustomCard runtime requires AUTH_SESSION_SECRET to be at least 32 characters.");
  process.exit(1);
}

if ((process.env.OBJECT_STORE_SIGNING_SECRET ?? "").length < 32) {
  console.error("CustomCard runtime requires OBJECT_STORE_SIGNING_SECRET to be at least 32 characters.");
  process.exit(1);
}

console.log(JSON.stringify({ service: "customcard-runtime-doctor", status: "ready", apiRuntime: runtimeMode, signedArtifactUrls: true }));
