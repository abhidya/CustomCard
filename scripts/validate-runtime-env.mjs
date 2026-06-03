const requiredEnv = ["DATABASE_URL", "QUEUE_URL", "OBJECT_STORE_URL", "OBJECT_STORE_SIGNING_SECRET", "REAL_ORDER_KILL_SWITCH"];
const placeholderPattern = /replace-me|placeholder|changeme|__set_|example/i;
const missing = requiredEnv.filter((key) => !process.env[key]);
const placeholders = requiredEnv.filter((key) => placeholderPattern.test(process.env[key] ?? ""));

if (missing.length > 0 || placeholders.length > 0) {
  if (missing.length > 0) console.error(`CustomCard runtime missing env: ${missing.join(", ")}`);
  if (placeholders.length > 0) console.error(`CustomCard runtime has placeholder env: ${placeholders.join(", ")}`);
  process.exit(1);
}

if (process.env.REAL_ORDER_KILL_SWITCH !== "disabled") {
  console.error("CustomCard runtime requires REAL_ORDER_KILL_SWITCH=disabled until certification is recorded.");
  process.exit(1);
}

if ((process.env.OBJECT_STORE_SIGNING_SECRET ?? "").length < 32) {
  console.error("CustomCard runtime requires OBJECT_STORE_SIGNING_SECRET to be at least 32 characters.");
  process.exit(1);
}

console.log(JSON.stringify({ service: "customcard-runtime-doctor", status: "ready", signedArtifactUrls: true }));
