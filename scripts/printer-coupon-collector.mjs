import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const userAgent = "CustomCard coupon research collector/0.1 (+local operator run; no checkout automation)";
const renderPrintLinks = isEnabled(process.env.CUSTOMCARD_COUPON_RENDER_PRINT_LINKS);
const renderedEvidenceOutputPath = process.env.CUSTOMCARD_COUPON_RENDER_EVIDENCE_OUT?.trim();
let couponProviderFeedCollectors;
let couponPortalEvidenceImporter;
let couponBrowserEvidence;

const vite = await createServer({
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true }
});

try {
  const {
    buildPrinterCouponPortalApplicationPackets,
    extractPrinterCouponCodes,
    extractPrinterCouponOffers,
    isPrinterCouponActive,
    printerCouponOffers,
    printerCouponCollectionPriority,
    printerCouponCollectionTargets,
    printerCouponValidationProviders,
    printerPriceCatalog,
    printerCouponSources
  } = await vite.ssrLoadModule("/src/printerPricing.ts");
  couponProviderFeedCollectors = await vite.ssrLoadModule("/src/printerCouponProviderFeeds.ts");
  couponPortalEvidenceImporter = await vite.ssrLoadModule("/src/printerCouponPortalEvidence.ts");
  couponBrowserEvidence = await vite.ssrLoadModule("/src/printerCouponBrowserEvidence.ts");
  const { matchPrinterCouponSignals } = await vite.ssrLoadModule("/src/printerCouponSignals.ts");
  const {
    combinePrinterCouponBrowserEvidence,
    findPrinterCouponBrowserEvidenceTarget,
    getPrinterCouponRenderedEvidenceStatus,
    summarizePrinterCouponBrowserEvidence,
    validatePrinterCouponBrowserEvidenceArtifact
  } = couponBrowserEvidence;
  const generatedAt = new Date();
  const operatorBrowserEvidencePath = process.env.CUSTOMCARD_COUPON_BROWSER_EVIDENCE?.trim();
  const operatorPortalEvidencePath = process.env.CUSTOMCARD_COUPON_PORTAL_EVIDENCE?.trim();
  const allowedTargets = printerCouponCollectionTargets.filter(
    (target) => target.sourceProvider === "retailer" && target.readiness === "ready-public-page"
  );
  const renderedBrowserCollector = renderPrintLinks
    ? await collectRenderedBrowserEvidence(allowedTargets.filter((target) => target.browserRenderProofRequired))
    : { enabled: false, status: "disabled", evidence: null, targetCount: 0, attachedTargetCount: 0 };
  if (renderedBrowserCollector.evidence && renderedEvidenceOutputPath) {
    writeFileSync(renderedEvidenceOutputPath, `${JSON.stringify(renderedBrowserCollector.evidence, null, 2)}\n`);
  }
  const operatorBrowserEvidence = combinePrinterCouponBrowserEvidence(
    loadOperatorBrowserEvidence(operatorBrowserEvidencePath),
    renderedBrowserCollector.evidence
  );
  const operatorBrowserEvidenceValidation = operatorBrowserEvidence
    ? validatePrinterCouponBrowserEvidenceArtifact(operatorBrowserEvidence, printerCouponCollectionTargets)
    : [];
  const providerFeedTargets = [];

  for (const target of printerCouponCollectionTargets.filter((candidate) => candidate.role === "provider-feed")) {
    providerFeedTargets.push(await collectProviderFeedTarget(target));
  }

  const fetchedTargets = [];
  const sourceOffers = [];
  const sourceEvidenceRecords = [];
  const ignoredCouponSignals = [];

  for (const target of allowedTargets) {
    const response = await fetch(target.url, { headers: { "user-agent": userAgent } });
    const body = await response.text();
    const matchedCodes = extractPrinterCouponCodes(body);
    const matchedVerificationSignals = matchPrinterCouponSignals(body, target.verificationSignals);
    const missingVerificationSignals = target.verificationSignals.filter((signal) => !matchedVerificationSignals.includes(signal));
    const staticHtmlExpectedCodeVisible = target.expectedOfferCodes.length > 0 && target.expectedOfferCodes.every((code) => matchedCodes.includes(code));
    const browserEvidence = summarizePrinterCouponBrowserEvidence(
      findPrinterCouponBrowserEvidenceTarget(operatorBrowserEvidence, target),
      target
    );

    fetchedTargets.push({
      id: target.id,
      role: target.role,
      vendorIds: target.vendorIds,
      collectionMethod: target.collectionMethod,
      staticHtmlSignalAllowed: target.staticHtmlSignalAllowed,
      browserRenderProofRequired: target.browserRenderProofRequired,
      expectedOfferCodes: target.expectedOfferCodes,
      verificationSignals: target.verificationSignals,
      renderedBrowserReadRequired: target.browserRenderProofRequired,
      legalReviewRequired: target.legalReviewRequired,
      status: response.status,
      ok: response.ok,
      url: target.url,
      matchedCodes,
      matchedExpectedCodes: target.expectedOfferCodes.filter((code) => matchedCodes.includes(code)),
      staticHtmlExpectedCodeVisible,
      staticHtmlEvidenceStatus: staticHtmlExpectedCodeVisible ? "static-html-signal-collected" : "static-html-expected-code-missing",
      matchedVerificationSignals,
      missingVerificationSignals,
      browserEvidence,
      renderedBrowserEvidenceStatus: getPrinterCouponRenderedEvidenceStatus(target, staticHtmlExpectedCodeVisible, browserEvidence),
      bytes: body.length
    });

    if (!response.ok || target.role !== "coupon-source" || target.collectionMethod !== "server-fetch-html") continue;

    for (const vendorId of target.vendorIds) {
      const source = vendorId === "walgreens" ? printerCouponSources.walgreensPhotoDeals : printerCouponSources.cvsPhotoCoupons;
      const extraction = extractPrinterCouponOffers({
        vendorId,
        source,
        documentText: body,
        observedAtIso: generatedAt.toISOString()
      });
      sourceEvidenceRecords.push(...extraction.sourceEvidence);
      ignoredCouponSignals.push(...extraction.ignoredSignals);
      sourceOffers.push(
        ...extraction.offers.map((offer) => {
          const activeAtCollection = isPrinterCouponActive(offer, generatedAt);
          const sourceEvidence = extraction.sourceEvidence.find((evidence) => evidence.code === offer.code);
          return {
            id: offer.id,
            vendorId: offer.vendorId,
            code: offer.code,
            label: offer.label,
            discountPercent: offer.discountPercent,
            startsAtIso: offer.startsAtIso,
            endsAtIso: offer.endsAtIso,
            evidenceStatus: offer.evidenceStatus,
            portalApplicationEvidenceAttached: Boolean(offer.portalApplicationEvidence),
            sourceUrl: offer.source.url,
            sourceType: sourceEvidence?.sourceType,
            rawSnippetHash: sourceEvidence?.rawSnippetHash,
            rawSnippet: sourceEvidence?.rawSnippet,
            matchedSourceTerms: sourceEvidence?.matchedTerms ?? [],
            requiresLoggedInAccount: offer.requiresLoggedInAccount,
            activeAtCollection,
            bestPriceEligibleAtCollection: false,
            bestPriceBlocker: activeAtCollection
              ? "provider-portal application evidence required"
              : "coupon expired before provider-portal application"
          };
        })
      );
    }
  }

  const { importPrinterCouponPortalEvidenceArtifact } = couponPortalEvidenceImporter;
  const providerPortalEvidenceImport = importPrinterCouponPortalEvidenceArtifact(
    loadOperatorPortalEvidence(operatorPortalEvidencePath),
    { offers: printerCouponOffers, catalog: printerPriceCatalog, now: generatedAt }
  );
  const providerPortalEvidenceImportSummary = summarizePortalEvidenceImport(providerPortalEvidenceImport);
  const portalAppliedOfferIds = new Set(providerPortalEvidenceImport.acceptedEvidence.map((evidence) => evidence.offerId));
  const sourceOfferSummaries = sourceOffers.map((offer) => {
    const portalApplied = portalAppliedOfferIds.has(offer.id);
    return {
      ...offer,
      evidenceStatus: portalApplied ? "provider-portal-applied" : offer.evidenceStatus,
      portalApplicationEvidenceAttached: portalApplied || offer.portalApplicationEvidenceAttached,
      bestPriceEligibleAtCollection: portalApplied,
      bestPriceBlocker: portalApplied
        ? null
        : offer.activeAtCollection
          ? "provider-portal application evidence required"
          : "coupon expired before provider-portal application"
    };
  });
  const codesByVendor = new Map(sourceOffers.map((offer) => [offer.vendorId, offer.code]));
  const providerPortalApplicationPackets = buildPrinterCouponPortalApplicationPackets({
    quantity: 1,
    now: generatedAt,
    offers: providerPortalEvidenceImport.offers
  });
  const providerPortalApplicationTargetCount = providerPortalApplicationPackets.reduce(
    (total, packet) => total + packet.applicationTargets.length,
    0
  );
  const printEntrypointChecks = fetchedTargets
    .filter((target) => target.role === "print-entrypoint")
    .map((target) => {
      const expectedCodes = target.vendorIds.map((vendorId) => codesByVendor.get(vendorId)).filter(Boolean);
      return {
        id: target.id,
        vendorIds: target.vendorIds,
        collectionMethod: target.collectionMethod,
        ok: target.ok,
        staticHtmlSignalAllowed: target.staticHtmlSignalAllowed,
        browserRenderProofRequired: target.browserRenderProofRequired,
        expectedCodes: target.expectedOfferCodes.length > 0 ? target.expectedOfferCodes : expectedCodes,
        matchedCodes: target.matchedCodes,
        matchedExpectedCodes: target.matchedExpectedCodes,
        staticHtmlExpectedCodeVisible: target.staticHtmlExpectedCodeVisible,
        staticHtmlCodeVisible: target.staticHtmlExpectedCodeVisible,
        staticHtmlEvidenceStatus: target.staticHtmlEvidenceStatus,
        matchedVerificationSignals: target.matchedVerificationSignals,
        missingVerificationSignals: target.missingVerificationSignals,
        renderedBrowserReadRequired: target.renderedBrowserReadRequired,
        renderedBrowserEvidenceStatus: target.renderedBrowserEvidenceStatus,
        browserEvidence: target.browserEvidence,
        verificationSignals: target.verificationSignals
      };
    });

  console.log(
    JSON.stringify(
      {
        service: "customcard-printer-coupon-collector",
        generatedAtIso: generatedAt.toISOString(),
        networkRuntime: "operator-script-only",
        fetchedTargetCount: fetchedTargets.length,
        couponSourceOfferCount: sourceOffers.length,
        couponSourceEvidenceCount: sourceEvidenceRecords.length,
        ignoredCouponSignalCount: ignoredCouponSignals.length,
        collectionMethods: [...new Set([...fetchedTargets, ...providerFeedTargets].map((target) => target.collectionMethod))],
        renderedBrowserReadTargetCount: fetchedTargets.filter((target) => target.renderedBrowserReadRequired).length,
        renderedBrowserCollector,
        renderedBrowserEvidenceOutputPath: renderedEvidenceOutputPath ? "CUSTOMCARD_COUPON_RENDER_EVIDENCE_OUT" : null,
        operatorBrowserEvidencePath: operatorBrowserEvidencePath ? "CUSTOMCARD_COUPON_BROWSER_EVIDENCE" : null,
        operatorBrowserEvidenceLoaded: Boolean(operatorBrowserEvidence),
        operatorBrowserEvidenceValidation,
        operatorBrowserEvidenceAttachedCount: fetchedTargets.filter((target) => target.browserEvidence?.attached).length,
        operatorPortalEvidencePath: operatorPortalEvidencePath ? "CUSTOMCARD_COUPON_PORTAL_EVIDENCE" : null,
        operatorPortalEvidenceLoaded: providerPortalEvidenceImport.status !== "not-provided",
        providerPortalEvidenceImport: providerPortalEvidenceImportSummary,
        credentialGatedProviderTargetCount: providerFeedTargets.length,
        providerFeedTargets,
        couponProviderCollectionPriority: printerCouponCollectionPriority,
        couponProviderCollectionPriorityLabels: printerCouponCollectionPriority.map((step) => step.label),
        couponProviderCandidateCount: providerFeedTargets.length,
        couponValidationProviderCount: printerCouponValidationProviders.length,
        couponValidationProviders: printerCouponValidationProviders,
        couponValidationProviderRule:
          "official coupon-validation API or provider portal cart proof can affect best-price ranking only after certified server-side exact-cart evidence proves the same product details; no client credentials, upload, payment, or order action is allowed.",
        providerPortalApplicationPacketCount: providerPortalApplicationPackets.length,
        providerPortalApplicationTargetCount,
        providerPortalApplicationPackets,
        providerPortalApplicationProof: providerPortalEvidenceImport.providerPortalApplicationProof,
        providerPortalCartTermsEvidenceRequired: true,
        bestPriceDiscountingAllowed: providerPortalEvidenceImport.bestPriceDiscountingAllowed,
        bestPriceDiscountingRule:
          "A coupon can affect ranking only after structured provider-portal evidence proves the same product, quantity, fulfillment mode, account state, and subtotal math.",
        fetchedTargets,
        sourceEvidence: sourceEvidenceRecords,
        sourceOffers: sourceOfferSummaries,
        ignoredCouponSignals,
        printEntrypointChecks,
        blockedFields: ["checkout subtotal", "coupon application proof", "tax", "pickup window", "real order placement"]
      },
      null,
      2
    )
  );
} finally {
  await vite.close();
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isEnabled(value) {
  return /^(1|true|yes|on)$/i.test(`${value ?? ""}`.trim());
}

async function collectProviderFeedTarget(target) {
  const {
    buildCouponProviderBaseTarget,
    collectFmtcProviderFeedTarget,
    collectRakutenCouponFeedTarget
  } = couponProviderFeedCollectors;

  if (target.id === "fmtc-deal-feed") {
    return collectFmtcProviderFeedTarget(target, process.env.FMTC_API_TOKEN?.trim(), { userAgent });
  }
  if (target.id === "rakuten-coupon-feed") {
    return collectRakutenCouponFeedTarget(target, process.env.RAKUTEN_ADVERTISING_API_TOKEN?.trim(), { userAgent });
  }

  return {
    ...buildCouponProviderBaseTarget(target),
    provider: target.label,
    reason: "Credential-gated provider feed is registered, but this collector does not yet have a provider-specific adapter."
  };
}

function loadOperatorBrowserEvidence(path) {
  if (!path) return null;
  const parsed = safeParseJson(readFileSync(path, "utf8"));
  if (!parsed || typeof parsed !== "object") return null;
  return parsed;
}

function loadOperatorPortalEvidence(path) {
  if (!path) return null;
  const parsed = safeParseJson(readFileSync(path, "utf8"));
  if (!parsed || typeof parsed !== "object") return null;
  return parsed;
}

function summarizePortalEvidenceImport(importResult) {
  const { offers, ...summary } = importResult;
  return summary;
}

function normalizeSignalList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((signal) => `${signal ?? ""}`.trim()).filter(Boolean);
}

async function collectRenderedBrowserEvidence(targets) {
  if (targets.length === 0) {
    return { enabled: true, status: "no-render-targets", evidence: null, targetCount: 0, attachedTargetCount: 0 };
  }

  const chromePath = resolveChromePath();
  if (!existsSync(chromePath)) {
    return {
      enabled: true,
      status: "chrome-not-found",
      evidence: null,
      targetCount: targets.length,
      attachedTargetCount: 0,
      error: "Set CHROME_PATH to a local Chrome or Chromium binary to render print entrypoint links."
    };
  }

  let chrome;
  let ws;
  let userDataDir;
  let chromeStartupLog = "";
  const debuggingPort = 9500 + Math.floor(Math.random() * 400);
  const renderedTargets = [];

  try {
    userDataDir = mkdtempSync(join(tmpdir(), "customcard-coupon-render-"));
    chrome = spawn(
      chromePath,
      [
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--remote-debugging-address=127.0.0.1",
        `--remote-debugging-port=${debuggingPort}`,
        `--user-data-dir=${userDataDir}`,
        "--no-first-run",
        "--disable-extensions",
        "about:blank"
      ],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
    chrome.stderr?.on("data", (chunk) => {
      chromeStartupLog = `${chromeStartupLog}${String(chunk)}`.slice(-4000);
    });

    const version = await waitForDebuggingVersion(debuggingPort, chrome, () => chromeStartupLog);
    const controller = await openChromeController(version.webSocketDebuggerUrl);
    ws = controller.ws;

    for (const target of targets) {
      renderedTargets.push(await readRenderedCouponTarget(target, controller));
    }
  } catch (error) {
    return {
      enabled: true,
      status: "failed",
      evidence: renderedTargets.length > 0 ? buildRenderedEvidenceArtifact(renderedTargets) : null,
      targetCount: targets.length,
      attachedTargetCount: renderedTargets.filter((target) => !target.error).length,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    if (ws) ws.close();
    await waitForChromeExit(chrome);
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 });
  }

  const failedTargets = renderedTargets.filter((target) => target.error);
  return {
    enabled: true,
    status: failedTargets.length === 0 ? "ready" : "partial",
    evidence: buildRenderedEvidenceArtifact(renderedTargets),
    targetCount: targets.length,
    attachedTargetCount: renderedTargets.filter((target) => !target.error).length,
    failedTargetCount: failedTargets.length,
    runtime: "operator-chromium-rendered-read",
    noCheckoutAction: true,
    noUploadAction: true,
    noOrderPlaced: true
  };
}

function buildRenderedEvidenceArtifact(targets) {
  return {
    service: "customcard-printer-coupon-browser-evidence",
    generatedAtIso: new Date().toISOString(),
    runtime: "operator-chromium-rendered-read",
    operatorAction:
      "Opened exact Walgreens and CVS 5x7 print links in a headless browser; no login, upload, cart, payment, or order action.",
    targets
  };
}

async function readRenderedCouponTarget(target, controller) {
  let targetId;
  try {
    const created = await controller.send("Target.createTarget", { url: "about:blank" });
    targetId = created.targetId;
    const attached = await controller.send("Target.attachToTarget", { targetId, flatten: true });
    const sessionId = attached.sessionId;

    await controller.send("Page.enable", {}, sessionId);
    await controller.send("Runtime.enable", {}, sessionId);
    const loaded = controller.waitEvent("Page.loadEventFired", sessionId, 45000).catch(() => null);
    await controller.send("Page.navigate", { url: target.url }, sessionId);
    await loaded;
    await delay(Number(process.env.CUSTOMCARD_COUPON_RENDER_SETTLE_MS ?? 5000));

    const signals = [...new Set([...target.expectedOfferCodes, ...target.verificationSignals])];
    const expression = `(() => {
      const signals = ${JSON.stringify(signals)};
      const normalizeSignal = (value) => String(value ?? "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&(?:reg|trade|copy);|&#(?:174|8482|169);/gi, "")
        .replace(/[\\u00ae\\u2122\\u2120\\u00a9]/g, "")
        .replace(/[^\\S\\r\\n]+/g, " ")
        .replace(/\\s+/g, " ")
        .trim()
        .toLowerCase();
      const includesSignal = (text, signal) => {
        const normalizedSignal = normalizeSignal(signal);
        return normalizedSignal.length > 0 && normalizeSignal(text).includes(normalizedSignal);
      };
      const visibleText = document.body?.innerText ?? "";
      const pageHtml = document.documentElement?.outerHTML ?? "";
      return {
        renderedTitle: document.title,
        finalUrl: location.href,
        visibleTextSignals: signals.filter((signal) => includesSignal(visibleText, signal)),
        pageHtmlSignals: signals.filter((signal) => includesSignal(pageHtml, signal))
      };
    })()`;
    const evaluated = await controller.send("Runtime.evaluate", { expression, returnByValue: true }, sessionId);
    const value = evaluated.result?.value ?? {};

    return {
      targetId: target.id,
      observedAtIso: new Date().toISOString(),
      url: target.url,
      finalUrl: value.finalUrl,
      renderedTitle: value.renderedTitle,
      expectedOfferCodes: target.expectedOfferCodes,
      visibleTextSignals: normalizeSignalList(value.visibleTextSignals),
      pageHtmlSignals: normalizeSignalList(value.pageHtmlSignals),
      noCheckoutAction: true,
      noUploadAction: true,
      noOrderPlaced: true
    };
  } catch (error) {
    return {
      targetId: target.id,
      observedAtIso: new Date().toISOString(),
      url: target.url,
      expectedOfferCodes: target.expectedOfferCodes,
      visibleTextSignals: [],
      pageHtmlSignals: [],
      noCheckoutAction: true,
      noUploadAction: true,
      noOrderPlaced: true,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    if (targetId) {
      await controller.send("Target.closeTarget", { targetId }).catch(() => undefined);
    }
  }
}

async function openChromeController(webSocketDebuggerUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();
  const eventWaiters = [];

  ws.onmessage = (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      const command = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) command.reject(new Error(message.error.message));
      else command.resolve(message.result);
    }

    for (let index = eventWaiters.length - 1; index >= 0; index -= 1) {
      const waiter = eventWaiters[index];
      if (waiter.method === message.method && (!waiter.sessionId || waiter.sessionId === message.sessionId)) {
        eventWaiters.splice(index, 1);
        waiter.resolve(message);
      }
    }
  };

  await new Promise((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = () => reject(new Error("Chrome debugging WebSocket failed"));
  });

  return {
    ws,
    send(method, params = {}, sessionId) {
      const id = nextId;
      nextId += 1;
      ws.send(JSON.stringify({ id, method, params, sessionId }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    waitEvent(method, sessionId, timeout = 5000) {
      return new Promise((resolve, reject) => {
        const waiter = {
          method,
          sessionId,
          resolve: (message) => {
            clearTimeout(timer);
            resolve(message);
          }
        };
        const timer = setTimeout(() => {
          const index = eventWaiters.indexOf(waiter);
          if (index !== -1) eventWaiters.splice(index, 1);
          reject(new Error(`Timed out waiting for ${method}`));
        }, timeout);
        eventWaiters.push(waiter);
      });
    }
  };
}

async function waitForDebuggingVersion(port, chrome, getChromeLog = () => "") {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return response.json();
    } catch {
      // Chrome is still starting.
    }
    if (chrome && (chrome.exitCode !== null || chrome.signalCode !== null)) {
      throw new Error(`Chrome exited before debugging port opened.${formatChromeLog(getChromeLog())}`);
    }
    await delay(100);
  }
  throw new Error(`Chrome debugging port did not open.${formatChromeLog(getChromeLog())}`);
}

function resolveChromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    findExecutable("google-chrome"),
    findExecutable("google-chrome-stable"),
    findExecutable("chromium"),
    findExecutable("chromium-browser")
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) ?? "__chrome_not_found__";
}

function findExecutable(command) {
  try {
    return execFileSync("which", [command], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return undefined;
  }
}

async function waitForChromeExit(chrome) {
  if (!chrome || chrome.exitCode !== null || chrome.signalCode !== null) return;

  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      chrome.kill("SIGTERM");
      resolve();
    }, 1500);
    chrome.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function formatChromeLog(log) {
  const trimmed = log.trim();
  return trimmed ? ` Chrome stderr: ${trimmed}` : "";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
