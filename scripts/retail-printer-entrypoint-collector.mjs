import { writeFileSync } from "node:fs";
import { createServer } from "vite";

const userAgent = "CustomCard retail entrypoint collector/0.1 (+local operator run; no checkout, upload, payment, or order automation)";
const evidenceOutputPath = process.env.CUSTOMCARD_RETAIL_ENTRYPOINT_EVIDENCE_OUT?.trim();

const vite = await createServer({
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true }
});

try {
  const {
    buildRetailPrinterEntrypointEvidenceTargetDefinitions,
    retailPrinterEntrypointEvidenceServiceName,
    summarizeRetailPrinterEntrypointEvidence,
    validateRetailPrinterEntrypointEvidenceArtifact
  } = await vite.ssrLoadModule("/src/retailPrinterEntrypointEvidence.ts");
  const { matchPrinterCouponSignals } = await vite.ssrLoadModule("/src/printerCouponSignals.ts");
  const { retailPrinterProductLinks } = await vite.ssrLoadModule("/src/retailPrinterContracts.ts");

  const generatedAt = new Date();
  const targetDefinitions = buildRetailPrinterEntrypointEvidenceTargetDefinitions();
  const targets = [];

  for (const target of targetDefinitions) {
    targets.push(await collectTarget(target, generatedAt, matchPrinterCouponSignals));
  }

  const artifact = {
    service: retailPrinterEntrypointEvidenceServiceName,
    generatedAtIso: new Date().toISOString(),
    runtime: "operator-server-fetch-html",
    operatorAction:
      "Fetched exact public Walmart, FedEx, CVS, and Walgreens product links; no login, upload, cart, payment, or order action.",
    targets
  };
  const validation = validateRetailPrinterEntrypointEvidenceArtifact(artifact, retailPrinterProductLinks);
  const summaries = Object.values(retailPrinterProductLinks).map((productLink) =>
    summarizeRetailPrinterEntrypointEvidence(
      targets.find((target) => target.vendorId === productLink.vendorId),
      productLink
    )
  );

  if (evidenceOutputPath) {
    writeFileSync(evidenceOutputPath, `${JSON.stringify(artifact, null, 2)}\n`);
  }

  console.log(
    JSON.stringify(
      {
        service: "customcard-retail-printer-entrypoint-collector",
        generatedAtIso: generatedAt.toISOString(),
        networkRuntime: "operator-script-only",
        targetCount: targets.length,
        status: validation.length === 0 ? "ready" : "needs-review",
        evidenceOutputPath: evidenceOutputPath ? "CUSTOMCARD_RETAIL_ENTRYPOINT_EVIDENCE_OUT" : null,
        noCheckoutAction: true,
        noUploadAction: true,
        noOrderPlaced: true,
        validation,
        summaries,
        artifact,
        blockedFields: [
          "provider API payload",
          "image upload",
          "cart creation",
          "payment submission",
          "live order placement"
        ]
      },
      null,
      2
    )
  );
} finally {
  await vite.close();
}

async function collectTarget(target, generatedAt, matchSignals) {
  try {
    const response = await fetch(target.url, { headers: { "user-agent": userAgent } });
    const body = await response.text();
    return {
      targetId: target.targetId,
      vendorId: target.vendorId,
      observedAtIso: generatedAt.toISOString(),
      url: target.url,
      finalUrl: response.url || target.url,
      expectedUrlTokens: target.expectedUrlTokens,
      expectedPageSignals: target.expectedPageSignals,
      matchedUrlTokens: target.expectedUrlTokens.filter((token) => target.url.includes(token)),
      matchedPageSignals: matchSignals(body, target.expectedPageSignals),
      status: response.status,
      ok: response.ok,
      bytes: body.length,
      noCheckoutAction: true,
      noUploadAction: true,
      noOrderPlaced: true
    };
  } catch (error) {
    return {
      targetId: target.targetId,
      vendorId: target.vendorId,
      observedAtIso: generatedAt.toISOString(),
      url: target.url,
      expectedUrlTokens: target.expectedUrlTokens,
      expectedPageSignals: target.expectedPageSignals,
      matchedUrlTokens: target.expectedUrlTokens.filter((token) => target.url.includes(token)),
      matchedPageSignals: [],
      noCheckoutAction: true,
      noUploadAction: true,
      noOrderPlaced: true,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
