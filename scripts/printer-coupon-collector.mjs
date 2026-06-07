import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const userAgent = "CustomCard coupon research collector/0.1 (+local operator run; no checkout automation)";
const renderPrintLinks = isEnabled(process.env.CUSTOMCARD_COUPON_RENDER_PRINT_LINKS);
const renderedEvidenceOutputPath = process.env.CUSTOMCARD_COUPON_RENDER_EVIDENCE_OUT?.trim();

const vite = await createServer({
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true }
});

try {
  const {
    extractPrinterCouponCodes,
    extractPrinterCouponOffers,
    printerCouponCollectionTargets,
    printerCouponSources
  } = await vite.ssrLoadModule("/src/printerPricing.ts");
  const fmtcApiToken = process.env.FMTC_API_TOKEN?.trim();
  const operatorBrowserEvidencePath = process.env.CUSTOMCARD_COUPON_BROWSER_EVIDENCE?.trim();
  const allowedTargets = printerCouponCollectionTargets.filter(
    (target) => target.sourceProvider === "retailer" && target.readiness === "ready-public-page"
  );
  const renderedBrowserCollector = renderPrintLinks
    ? await collectRenderedBrowserEvidence(allowedTargets.filter((target) => target.browserRenderProofRequired))
    : { enabled: false, status: "disabled", evidence: null, targetCount: 0, attachedTargetCount: 0 };
  if (renderedBrowserCollector.evidence && renderedEvidenceOutputPath) {
    writeFileSync(renderedEvidenceOutputPath, `${JSON.stringify(renderedBrowserCollector.evidence, null, 2)}\n`);
  }
  const operatorBrowserEvidence = combineOperatorBrowserEvidence(
    loadOperatorBrowserEvidence(operatorBrowserEvidencePath),
    renderedBrowserCollector.evidence
  );
  const providerFeedTargets = [];

  for (const target of printerCouponCollectionTargets.filter((candidate) => candidate.role === "provider-feed")) {
    const baseTarget = {
      id: target.id,
      vendorIds: target.vendorIds,
      collectionMethod: target.collectionMethod,
      readiness: target.readiness,
      url: target.url,
      credentialEnvKeys: target.credentialEnvKeys,
      verificationSignals: target.verificationSignals,
      legalReviewRequired: target.legalReviewRequired,
      fetched: false
    };

    if (!fmtcApiToken) {
      providerFeedTargets.push({
        ...baseTarget,
        provider: "FMTC Deal Feed",
        reason: "Credential-gated provider feed; set FMTC_API_TOKEN only in an approved server/operator environment."
      });
      continue;
    }

    const providerUrl = new URL("https://s3.fmtc.co/api/4.2.0/deals");
    providerUrl.searchParams.set("api_token", fmtcApiToken);
    providerUrl.searchParams.set("format", "json");
    providerUrl.searchParams.set("codesonly", "1");
    providerUrl.searchParams.set("active", "1");
    providerUrl.searchParams.set("country", "US");
    providerUrl.searchParams.set("page_size", "500");

    const response = await fetch(providerUrl, { headers: { "user-agent": userAgent } });
    const providerBody = await response.text();
    const parsed = safeParseJson(providerBody);
    const deals = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.deals) ? parsed.deals : Array.isArray(parsed?.data) ? parsed.data : [];
    const relevantDeals = deals
      .filter((deal) => /walgreens|cvs/i.test(`${deal.merchant_name ?? ""} ${deal.label ?? ""} ${deal.direct_link ?? ""}`))
      .map((deal) => ({
        id: deal.id,
        merchantName: deal.merchant_name,
        label: deal.label,
        code: deal.code,
        status: deal.status,
        startDate: deal.start_date,
        endDate: deal.end_date,
        codeVerifiedAt: deal.code_verified_at,
        linkVerifiedAt: deal.link_verified_at,
        couponCodeOnPage: deal.coupon_code_on_page
      }));

    providerFeedTargets.push({
      ...baseTarget,
      provider: "FMTC Deal Feed",
      fetched: true,
      status: response.status,
      ok: response.ok,
      endpoint: "https://s3.fmtc.co/api/4.2.0/deals",
      requestShape: {
        format: "json",
        codesonly: 1,
        active: 1,
        country: "US",
        page_size: 500
      },
      returnedDealCount: deals.length,
      relevantDealCount: relevantDeals.length,
      relevantDeals,
      tokenRedacted: true,
      reason:
        relevantDeals.length > 0
          ? "Provider-feed coupons are discovery evidence; official retailer source or provider-portal application proof is still required before discounting."
          : "Provider feed returned no Walgreens/CVS code candidates in the fetched page."
    });
  }

  const fetchedTargets = [];
  const sourceOffers = [];

  for (const target of allowedTargets) {
    const response = await fetch(target.url, { headers: { "user-agent": userAgent } });
    const body = await response.text();
    const matchedCodes = extractPrinterCouponCodes(body);
    const matchedVerificationSignals = target.verificationSignals.filter((signal) => body.toLowerCase().includes(signal.toLowerCase()));
    const missingVerificationSignals = target.verificationSignals.filter((signal) => !matchedVerificationSignals.includes(signal));
    const staticHtmlExpectedCodeVisible = target.expectedOfferCodes.length > 0 && target.expectedOfferCodes.every((code) => matchedCodes.includes(code));
    const browserEvidence = summarizeOperatorBrowserEvidence(findOperatorBrowserEvidence(operatorBrowserEvidence, target), target);

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
      renderedBrowserEvidenceStatus: renderedBrowserEvidenceStatus(target, staticHtmlExpectedCodeVisible, browserEvidence),
      bytes: body.length
    });

    if (!response.ok || target.role !== "coupon-source" || target.collectionMethod !== "server-fetch-html") continue;

    for (const vendorId of target.vendorIds) {
      const source = vendorId === "walgreens" ? printerCouponSources.walgreensPhotoDeals : printerCouponSources.cvsPhotoCoupons;
      const extraction = extractPrinterCouponOffers({
        vendorId,
        source,
        documentText: body,
        observedAtIso: new Date().toISOString()
      });
      sourceOffers.push(
        ...extraction.offers.map((offer) => ({
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
          requiresLoggedInAccount: offer.requiresLoggedInAccount
        }))
      );
    }
  }

  const codesByVendor = new Map(sourceOffers.map((offer) => [offer.vendorId, offer.code]));
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
        generatedAtIso: new Date().toISOString(),
        networkRuntime: "operator-script-only",
        fetchedTargetCount: fetchedTargets.length,
        couponSourceOfferCount: sourceOffers.length,
        collectionMethods: [...new Set(fetchedTargets.map((target) => target.collectionMethod))],
        renderedBrowserReadTargetCount: fetchedTargets.filter((target) => target.renderedBrowserReadRequired).length,
        renderedBrowserCollector,
        renderedBrowserEvidenceOutputPath: renderedEvidenceOutputPath ? "CUSTOMCARD_COUPON_RENDER_EVIDENCE_OUT" : null,
        operatorBrowserEvidencePath: operatorBrowserEvidencePath ? "CUSTOMCARD_COUPON_BROWSER_EVIDENCE" : null,
        operatorBrowserEvidenceLoaded: Boolean(operatorBrowserEvidence),
        operatorBrowserEvidenceAttachedCount: fetchedTargets.filter((target) => target.browserEvidence?.attached).length,
        credentialGatedProviderTargetCount: providerFeedTargets.length,
        providerFeedTargets,
        providerPortalApplicationProof: false,
        providerPortalCartTermsEvidenceRequired: true,
        bestPriceDiscountingAllowed: false,
        bestPriceDiscountingRule:
          "A coupon can affect ranking only after structured provider-portal evidence proves the same product, quantity, fulfillment mode, account state, and subtotal math.",
        fetchedTargets,
        sourceOffers,
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

function loadOperatorBrowserEvidence(path) {
  if (!path) return null;
  const parsed = safeParseJson(readFileSync(path, "utf8"));
  if (!parsed || typeof parsed !== "object") return null;
  return parsed;
}

function combineOperatorBrowserEvidence(...evidenceSources) {
  const targets = evidenceSources
    .flatMap((evidence) => (Array.isArray(evidence?.targets) ? evidence.targets : []))
    .filter(Boolean);
  if (targets.length === 0) return null;

  return {
    service: "customcard-printer-coupon-browser-evidence",
    generatedAtIso: new Date().toISOString(),
    runtime: "combined-operator-browser-evidence",
    targets
  };
}

function findOperatorBrowserEvidence(evidence, target) {
  const targets = Array.isArray(evidence?.targets) ? evidence.targets : [];
  return targets.find((candidate) => {
    const targetId = candidate.targetId ?? candidate.id;
    return targetId === target.id && (!candidate.url || candidate.url === target.url);
  });
}

function summarizeOperatorBrowserEvidence(evidence, target) {
  if (!evidence) return null;

  const visibleTextSignals = normalizeSignalList(evidence.visibleTextSignals ?? evidence.visibleSignals);
  const pageHtmlSignals = normalizeSignalList(evidence.pageHtmlSignals ?? evidence.htmlSignals);
  const allSignals = [...visibleTextSignals, ...pageHtmlSignals];
  const matchedVisibleExpectedCodes = target.expectedOfferCodes.filter((code) => signalListIncludes(visibleTextSignals, code));
  const matchedHtmlExpectedCodes = target.expectedOfferCodes.filter((code) => signalListIncludes(pageHtmlSignals, code));
  const matchedVerificationSignals = target.verificationSignals.filter((signal) => signalListIncludes(allSignals, signal));
  const visibleTextExpectedCodeVisible =
    target.expectedOfferCodes.length > 0 && target.expectedOfferCodes.every((code) => matchedVisibleExpectedCodes.includes(code));
  const pageHtmlExpectedCodeVisible =
    target.expectedOfferCodes.length > 0 && target.expectedOfferCodes.every((code) => matchedHtmlExpectedCodes.includes(code));
  const noCheckoutAction = evidence.noCheckoutAction === true && evidence.noUploadAction !== false && evidence.noOrderPlaced !== false;

  return {
    attached: true,
    observedAtIso: evidence.observedAtIso,
    targetId: evidence.targetId ?? evidence.id,
    url: evidence.url,
    renderedTitle: evidence.renderedTitle ?? evidence.title,
    visibleTextExpectedCodeVisible,
    pageHtmlExpectedCodeVisible,
    matchedVisibleExpectedCodes,
    matchedHtmlExpectedCodes,
    matchedVerificationSignals,
    noCheckoutAction,
    validForRenderedProof: visibleTextExpectedCodeVisible && noCheckoutAction
  };
}

function renderedBrowserEvidenceStatus(target, staticHtmlExpectedCodeVisible, browserEvidence) {
  if (!target.browserRenderProofRequired) return "not-required";
  if (browserEvidence?.validForRenderedProof) return "operator-browser-proof-attached";
  if (browserEvidence?.pageHtmlExpectedCodeVisible && browserEvidence.noCheckoutAction) {
    return "operator-browser-html-signal-attached-visible-proof-still-required";
  }
  if (staticHtmlExpectedCodeVisible) return "static-html-signal-only-browser-proof-required";
  return "operator-browser-or-provider-portal-proof-required";
}

function normalizeSignalList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((signal) => `${signal ?? ""}`.trim()).filter(Boolean);
}

function signalListIncludes(signals, expected) {
  const normalizedExpected = expected.toLowerCase();
  return signals.some((signal) => signal.toLowerCase().includes(normalizedExpected));
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
      const includesSignal = (text, signal) => text.toLowerCase().includes(signal.toLowerCase());
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
