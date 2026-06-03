const requiredEnv = ["CUSTOMCARD_ENV", "DATABASE_URL", "QUEUE_URL", "OBJECT_STORE_URL", "REAL_ORDER_KILL_SWITCH"];
const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`CustomCard worker missing env: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify({
      service: "customcard-worker",
      env: process.env.CUSTOMCARD_ENV,
      queue: "ready",
      jobs: ["provider-sync", "render-review", "vendor-handoff"],
      idempotency: "required"
    })
  );
}
