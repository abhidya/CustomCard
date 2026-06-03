const requiredEnv = [
  "CUSTOMCARD_ENV",
  "DATABASE_URL",
  "QUEUE_URL",
  "OBJECT_STORE_URL",
  "OBJECT_STORE_SIGNING_SECRET",
  "REAL_ORDER_KILL_SWITCH"
];
const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`CustomCard worker missing env: ${missing.join(", ")}`);
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
