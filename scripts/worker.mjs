import { loadLocalAiEnvFiles } from "./ai-card-generator.mjs";
import { createWorkerRuntime, describeWorkerReadiness } from "./worker-runtime.mjs";

loadLocalAiEnvFiles();

const args = new Set(process.argv.slice(2));
const describeOnly = args.has("--describe");
const runOnce = args.has("--once") || process.env.CUSTOMCARD_WORKER_PROCESS_ON_START === "true";

if (describeOnly) {
  const readiness = describeWorkerReadiness();
  console.log(JSON.stringify(readiness));
  if (readiness.status !== "ready") process.exitCode = 1;
} else {
  const runtime = createWorkerRuntime();
  try {
    if (runOnce) {
      const report = await runtime.runOnce();
      console.log(JSON.stringify(report));
      if (report.status !== "ready" || report.blockers?.length > 0) process.exitCode = 1;
    } else {
      let stopping = false;
      const stop = () => {
        stopping = true;
      };
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
      const report = await runtime.runLoop({
        shouldContinue: () => !stopping,
        onReport(iteration) {
          console.log(JSON.stringify(iteration));
        }
      });
      if (report.status !== "ready" || report.blockers?.length > 0) process.exitCode = 1;
    }
  } finally {
    await runtime.close();
  }
}
