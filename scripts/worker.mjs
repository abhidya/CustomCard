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
const productionEnvNames = new Set(["prod", "production"]);
const missing = requiredEnv.filter((key) => !process.env[key]);
const customCardEnv = String(process.env.CUSTOMCARD_ENV ?? "").trim().toLowerCase();
const productionRuntime = productionEnvNames.has(customCardEnv) || process.env.NODE_ENV === "production";

if (missing.length > 0) {
  console.error(`CustomCard worker missing env: ${missing.join(", ")}`);
  process.exitCode = 1;
} else if (productionRuntime && process.env.CUSTOMCARD_API_RUNTIME !== "postgres") {
  console.error("CustomCard worker production runtime requires CUSTOMCARD_API_RUNTIME=postgres.");
  process.exitCode = 1;
} else if ((process.env.AUTH_SESSION_SECRET ?? "").length < 32) {
  console.error("CustomCard worker requires AUTH_SESSION_SECRET to be at least 32 characters.");
  process.exitCode = 1;
} else if ((process.env.OBJECT_STORE_SIGNING_SECRET ?? "").length < 32) {
  console.error("CustomCard worker requires OBJECT_STORE_SIGNING_SECRET to be at least 32 characters.");
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify({
      service: "customcard-worker",
      env: process.env.CUSTOMCARD_ENV,
      queue: "ready",
      jobs: ["provider-sync", "render-review", "artifact-signing", "vendor-handoff"],
      idempotency: "required"
    })
  );
}
