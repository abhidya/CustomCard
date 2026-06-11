#!/usr/bin/env node
import { createWorkerRuntime, describeWorkerReadiness } from "./worker-runtime.mjs";

const args = new Set(process.argv.slice(2));
const runOnce = args.has("--once") || process.env.CUSTOMCARD_WORKER_PROCESS_ON_START === "true";

if (!runOnce) {
  const readiness = describeWorkerReadiness();
  console.log(JSON.stringify(readiness));
  if (readiness.status !== "ready") process.exitCode = 1;
} else {
  const runtime = createWorkerRuntime();
  try {
    const report = await runtime.runOnce();
    console.log(JSON.stringify(report));
    if (report.status !== "ready" || report.blockers?.length > 0) process.exitCode = 1;
  } finally {
    await runtime.close();
  }
}
