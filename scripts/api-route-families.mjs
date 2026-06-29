import {
  buildAdminModelBenchmarkCatalog,
  runAdminModelBenchmark,
  saveAdminModelBenchmarkGrade
} from "./model-benchmark-admin.mjs";
import { runAdminLocalAiLoop } from "./local-ai-loop-admin.mjs";

export function createApiRouteFamilies(deps) {
  const {
    aiCardGenerateRoute,
    aiChatRespondRoute,
    aiGenerationService,
    apiRuntime,
    buildMutationContractPayload,
    buildRetailPrinterOperationStartPackets,
    buildWalgreensCallbackHtml,
    calendarConnectionLifecycle,
    calendarConnectionStartPackets,
    clientRateLimitKey,
    decodeArtifactObjectKey,
    formatWalgreensCheckoutUpstreamError,
    mobileBootstrap,
    readRequestBody,
    readiness,
    retailPrinterCouponPortalEvidenceRoute,
    routes,
    sendArtifact,
    sendHtml,
    sendJson,
    walgreensCheckout,
    walgreensCheckoutCallbackRoute,
    walgreensCheckoutSessionRoute,
    walgreensCheckoutStatusRoute,
    walgreensCheckoutUploadRoute,
    walgreensRateLimited,
    walgreensUploadBodyLimit
  } = deps;

  return {
    async handlePreAuthRoute({ path, request, requestUrl, response }) {
      const artifactObjectKey = readArtifactObjectKey(path, requestUrl);
      if (!artifactObjectKey) return false;
      if (request.method !== "GET") {
        sendJson(response, 405, { service: "customcard-api", status: "method-not-allowed", path });
        return true;
      }
      const artifact = await apiRuntime.readArtifact({ objectKey: artifactObjectKey, query: requestUrl.searchParams });
      if (artifact.body) {
        sendArtifact(response, artifact);
      } else {
        sendJson(response, artifact.statusCode ?? 500, { service: "customcard-api", ...(artifact.payload ?? {}) });
      }
      return true;
    },

    async handlePostAuthRoute({ authContext, path, request, requestUrl, response, route }) {
      if (handleStaticContractRoute({ path, response })) return true;
      if (handlePublicGalleryRoute && (await handlePublicGalleryRoute({ path, request, response }))) return true;
      if (await handleProviderJobRoute({ authContext, path, request, requestUrl, response })) return true;
      if (await handleAdminRoute({ authContext, path, request, requestUrl, response, route })) return true;
      if (handleBootstrapRoute({ path, response })) return true;
      if (await handleCustomerStateRoute({ authContext, path, response })) return true;
      if (handleWalgreensCallbackRoute({ path, response })) return true;
      if (await handleWalgreensHostedCheckoutRoute({ path, request, response })) return true;
      if (await handleAiRoute({ authContext, path, request, requestUrl, response, route })) return true;

      const bodyText = await readRequestBody(request);
      if (route.id === "calendar-connection-start" && calendarConnectionLifecycle) {
        const handled = await calendarConnectionLifecycle({ authContext, bodyText, response, requestUrl });
        if (handled) return true;
      }
      const persistedMutation = await apiRuntime.persistMutation({
        route,
        request,
        authContext,
        bodyText,
        responsePayload: buildMutationContractPayload(route, bodyText, {
          authContext,
          env: process.env,
          requestUrl
        })
      });
      sendJson(response, persistedMutation.statusCode, persistedMutation.payload);
      return true;
    }
  };

  function readArtifactObjectKey(path, requestUrl) {
    if (path.startsWith("/api/artifacts/")) return decodeArtifactObjectKey(path);
    if (path === "/api/artifacts") return String(requestUrl.searchParams.get("objectKey") ?? "");
    return "";
  }

  function providerJobStatusRouteIds(requestUrl) {
    return String(requestUrl?.searchParams?.get("routes") ?? "")
      .split(/[,\s]+/)
      .map((routeId) => routeId.trim())
      .filter(Boolean);
  }

  function adminProviderJobStatusRouteIds(requestUrl) {
    const requested = providerJobStatusRouteIds(requestUrl);
    const adminVisibleQueueRoutes = new Set(
      routes
        .filter((route) => route.id === "ai-card-generate" || route.runtimeMode === "queue-backed")
        .map((route) => route.id)
    );
    const selected = requested.length > 0 ? requested : ["ai-card-generate"];
    return selected.filter((routeId) => adminVisibleQueueRoutes.has(routeId));
  }

  async function handlePublicGalleryRoute({ path, request, response }) {
    if (path !== "/api/public/featured-cards" || request.method !== "GET") return false;
    const payload = await apiRuntime.readFeaturedCards();
    sendJson(response, 200, payload);
    return true;
  }

  function handleStaticContractRoute({ path, response }) {
    if (path === "/api/health") {
      const blockers = apiRuntime.validate();
      sendJson(response, blockers.length === 0 ? 200 : 503, {
        service: "customcard-api",
        status: blockers.length === 0 ? "ready" : "blocked",
        realOrdersEnabled: false,
        runtime: apiRuntime.describe(),
        blockers
      });
      return true;
    }

    if (path === "/api/routes") {
      sendJson(response, 200, routes);
      return true;
    }

    return false;
  }

  async function handleProviderJobRoute({ authContext, path, request, requestUrl, response }) {
    if (path === "/api/provider/jobs/status") {
      const routeIds = providerJobStatusRouteIds(requestUrl);
      const result = await apiRuntime.readProviderJobStatus({
        authContext,
        routeIds: routeIds.length > 0 ? routeIds : undefined
      });
      sendJson(response, result.statusCode, result.payload);
      return true;
    }

    if (path === "/api/provider/jobs/lease") {
      let body;
      try {
        body = parseStrictJsonBody(await readRequestBody(request, 64_000));
      } catch {
        sendJson(response, 400, { service: "customcard-api", status: "invalid-json", path });
        return true;
      }
      const result = await apiRuntime.leaseProviderJobs({
        authContext,
        workerId: body.worker_id ?? body.workerId,
        routeIds: body.routes ?? body.route_ids ?? body.routeIds,
        limit: body.limit
      });
      sendJson(response, result.statusCode, result.payload);
      return true;
    }

    const completeMatch = path.match(/^\/api\/provider\/jobs\/([^/]+)\/complete$/);
    if (!completeMatch) return false;
    let body;
    try {
      body = parseStrictJsonBody(await readRequestBody(request, providerCompleteBodyLimit()));
    } catch {
      sendJson(response, 400, { service: "customcard-api", status: "invalid-json", path });
      return true;
    }
    const result = await apiRuntime.completeProviderJob({
      authContext,
      jobId: decodeURIComponent(completeMatch[1]),
      body
    });
    sendJson(response, result.statusCode, result.payload);
    return true;
  }

  async function handleAdminRoute({ authContext, path, request, requestUrl, response, route }) {
    if (path === "/api/admin/card-gallery" && request?.method === "GET") {
      const payload = await apiRuntime.readCardGallery({ authContext });
      sendJson(response, 200, payload);
      return true;
    }

    if (path === "/api/admin/card-gallery/regenerate") {
      if (!requireIdempotencyKey({ request, response, path })) return true;
      const body = await readJsonBody({ request, response, path });
      if (!body.ok) return true;
      const validation = validateAdminGalleryRegenerationBody(body.value);
      if (validation.missingFields.length > 0) {
        sendJson(response, 400, {
          service: "customcard-api",
          status: "invalid-admin-card-gallery-regenerate-payload",
          route: "admin-card-gallery-regenerate",
          requiredFields: validation.requiredFields,
          missingFields: validation.missingFields,
          detail:
            "Card gallery regeneration requires explicit public-safe gallery metadata and current card copy before AI generation can run.",
          rawContentStored: false
        });
        return true;
      }
      const result = await regenerateAdminCardGalleryCopy({
        authContext,
        body: body.value,
        idempotencyKey: readRequestHeader(request, "x-idempotency-key")
      });
      sendJson(response, result.statusCode, result.payload);
      return true;
    }

    if (path === "/api/admin/readiness") {
      sendJson(response, 200, {
        ...readiness,
        runtime: apiRuntime.describe()
      });
      return true;
    }

    if (path === "/api/admin/provider-catalog") {
      sendJson(response, 200, {
        service: "customcard-api",
        providers: readiness.providers,
        providerGovernance: readiness.providerGovernance,
        externalNetworkCalls: false,
        runtime: apiRuntime.describe()
      });
      return true;
    }

    if (path === "/api/admin/provider-governance") {
      sendJson(response, 200, {
        service: "customcard-api",
        status: "ready",
        providerGovernance: readiness.providerGovernance,
        externalNetworkCalls: false,
        realOrdersEnabled: false,
        runtime: apiRuntime.describe()
      });
      return true;
    }

    if (path === "/api/admin/provider/jobs/status") {
      const routeIds = adminProviderJobStatusRouteIds(requestUrl);
      const result = await apiRuntime.readProviderJobStatus({
        authContext: { ...authContext, providerRouteIds: routeIds },
        routeIds
      });
      sendJson(response, result.statusCode, result.payload);
      return true;
    }

    if (path === "/api/admin/ai-flow-configs" && request?.method === "GET") {
      sendJson(response, 200, await apiRuntime.readAdminAiFlowConfig());
      return true;
    }

    if (path === "/api/admin/ai-flow-configs" && request?.method === "POST") {
      if (!requireIdempotencyKey({ request, response, path })) return true;
      const bodyText = await readValidatedJsonBodyText({ request, response, path });
      if (!bodyText.ok) return true;
      const result = await apiRuntime.persistMutation({
        route,
        request,
        authContext,
        bodyText: bodyText.value,
        responsePayload: {
          service: "customcard-api",
          status: "admin-ai-flow-configs-save-accepted"
        }
      });
      sendJson(response, result.statusCode, result.payload);
      return true;
    }

    if (path === "/api/admin/safety-controls" && request?.method === "GET") {
      sendJson(response, 200, await apiRuntime.readAdminSafetyControls());
      return true;
    }

    if (path === "/api/admin/safety-controls" && request?.method === "POST") {
      if (!requireIdempotencyKey({ request, response, path })) return true;
      const bodyText = await readValidatedJsonBodyText({ request, response, path });
      if (!bodyText.ok) return true;
      const result = await apiRuntime.persistMutation({
        route,
        request,
        authContext,
        bodyText: bodyText.value,
        responsePayload: {
          service: "customcard-api",
          status: "admin-safety-controls-save-accepted"
        }
      });
      sendJson(response, result.statusCode, result.payload);
      return true;
    }

    if (path === "/api/admin/persistence-readiness") {
      sendJson(response, 200, {
        service: "customcard-api",
        status: "ready",
        persistence: readiness.persistence,
        runtime: apiRuntime.describe(),
        safety: readiness.safety,
        blockers: []
      });
      return true;
    }

    if (path === "/api/admin/artifacts/bucket") {
      const result = await apiRuntime.listArtifacts({ query: requestUrl.searchParams, authContext });
      sendJson(response, result.statusCode, { service: "customcard-api", ...result.payload });
      return true;
    }

    if (path === "/api/admin/model-benchmarks") {
      sendJson(response, 200, buildAdminModelBenchmarkCatalog());
      return true;
    }

    if (path === "/api/admin/model-benchmarks/run") {
      if (!requireIdempotencyKey({ request, response, path })) return true;
      const body = await readJsonBody({ request, response, path });
      if (!body.ok) return true;
      const result = await runAdminModelBenchmark({ body: body.value });
      sendJson(response, result.statusCode, result.payload);
      return true;
    }

    if (path === "/api/admin/model-benchmarks/grade") {
      if (!requireIdempotencyKey({ request, response, path })) return true;
      const body = await readJsonBody({ request, response, path });
      if (!body.ok) return true;
      const result = saveAdminModelBenchmarkGrade({ body: body.value });
      sendJson(response, result.statusCode, result.payload);
      return true;
    }

    if (path === "/api/admin/local-ai-loop/run") {
      if (!requireIdempotencyKey({ request, response, path })) return true;
      const body = await readJsonBody({ request, response, path });
      if (!body.ok) return true;
      const result = await runAdminLocalAiLoop({
        body: body.value,
        writeReport: shouldWriteAdminLocalAiLoopReport()
      });
      sendJson(response, result.statusCode, result.payload);
      return true;
    }

    return false;
  }

  function validateAdminGalleryRegenerationBody(body) {
    const requiredFields = ["action", "category", "cardCopy"];
    const missingFields = [];
    const action = String(body?.action ?? "").trim();
    if (!["card-text", "gallery-copy"].includes(action)) missingFields.push("action");
    if (!safeRouteText(body?.category, "", 80)) missingFields.push("category");
    if (!body?.cardCopy || typeof body.cardCopy !== "object" || Array.isArray(body.cardCopy)) {
      missingFields.push("cardCopy");
    }
    return { requiredFields, missingFields };
  }

  async function regenerateAdminCardGalleryCopy({ authContext, body, idempotencyKey }) {
    const action = String(body?.action ?? "").trim();
    if (!aiGenerationService || typeof aiGenerationService.generateCard !== "function") {
      return {
        statusCode: 503,
        payload: {
          service: "customcard-api",
          status: "admin-card-gallery-regenerate-blocked",
          action,
          error: "AI generation service is unavailable for gallery regeneration.",
          rawContentStored: false
        }
      };
    }
    const generationInput = buildAdminGalleryGenerationInput(body, action);
    const result = await aiGenerationService.generateCard(generationInput, {
      rateKey: authContext.userId,
      idempotencyKey,
      authContext,
      aiFlowAdminConfig: [
        {
          flowId: "card-image",
          liveProviderCallsEnabled: false,
          queueEnabled: false,
          fallbackQueueEnabled: false
        }
      ]
    });
    await recordAiProviderEvents({ authContext, result });

    const payload = result?.payload ?? {};
    if (result?.statusCode !== 200 || payload.status === "provider-unavailable" || payload.user_content_only) {
      return {
        statusCode: result?.statusCode ?? 503,
        payload: {
          service: "customcard-api",
          status: "admin-card-gallery-regenerate-blocked",
          action,
          error: payload.error ?? payload.detail ?? "AI provider is unavailable for gallery regeneration.",
          detail: payload.detail ?? payload.error,
          ai_flow: payload.ai_flow,
          ai_cost_gate: payload.ai_cost_gate,
          provider_call_events: payload.provider_call_events,
          fallback_queued: Boolean(payload.fallback_queued),
          rawContentStored: false
        }
      };
    }

    const cardCopy = frontCardCopyFromAiPayload(payload.card_copy);
    if (!cardCopy) {
      return {
        statusCode: 502,
        payload: {
          service: "customcard-api",
          status: "admin-card-gallery-regenerate-invalid-provider-output",
          action,
          error: "AI provider response did not include usable front-panel copy.",
          generated_by: payload.generated_by,
          ai_flow: payload.ai_flow,
          ai_cost_gate: payload.ai_cost_gate,
          provider_call_events: payload.provider_call_events,
          fallback_queued: Boolean(payload.fallback_queued),
          rawContentStored: false
        }
      };
    }

    return {
      statusCode: 200,
      payload: {
        service: "customcard-api",
        status: "admin-card-gallery-regenerated",
        action,
        cardCopy,
        galleryCopy: galleryCopyFromAiPayload(payload.card_copy, cardCopy, body),
        generated_by: payload.generated_by,
        ai_flow: payload.ai_flow,
        ai_cost_gate: payload.ai_cost_gate,
        provider_call_events: payload.provider_call_events,
        fallback_queued: Boolean(payload.fallback_queued),
        rawContentStored: false
      }
    };
  }

  function buildAdminGalleryGenerationInput(body, action) {
    const category = safeRouteText(body?.category, "", 80);
    const title = safeRouteText(body?.title, "", 120);
    const publicCaption = safeRouteText(body?.publicCaption, "", 220);
    const currentCopy = body?.cardCopy && typeof body.cardCopy === "object" ? body.cardCopy : {};
    const headline = safeRouteText(currentCopy.headline, "", 120);
    const currentBody = safeRouteText(currentCopy.body, "", 420);
    const artDirection = safeRouteText(currentCopy.artDirection, "", 240);
    const label = galleryCategoryLabel(category);

    return {
      sender: "CustomCard gallery curator",
      recipient: "Public gallery audience",
      relationship: "public gallery example",
      occasion: label,
      tone: action === "gallery-copy" ? "concise, public-safe, landing-page-ready" : "warm, polished, public-safe",
      style: artDirection || `premium ${label.toLowerCase()} greeting card`,
      language: "English",
      personal_note: [
        `Regenerate ${action === "gallery-copy" ? "public gallery title and caption" : "front-card text"} for an admin-curated public gallery card.`,
        `Current public title: ${title}.`,
        publicCaption ? `Current public caption: ${publicCaption}.` : "",
        headline ? `Current front headline: ${headline}.` : "",
        currentBody ? `Current front body: ${currentBody}.` : "",
        "Return public-safe copy only. Do not use customer names, private memories, contact details, dates, locations, or claims that a real customer made this card."
      ].filter(Boolean).join(" "),
      memory_notes: [],
      must_include: [label],
      must_avoid: [
        "private names",
        "private memories",
        "email addresses",
        "phone numbers",
        "mailing addresses",
        "payment details",
        "unreviewed customer details"
      ]
    };
  }

  function frontCardCopyFromAiPayload(cardCopy) {
    const panels = Array.isArray(cardCopy?.panels) ? cardCopy.panels : [];
    const front = panels.find((panel) => String(panel?.id ?? "").toLowerCase() === "front") ?? panels[0];
    if (!front) return undefined;
    const headline = safeRouteText(front.headline, "", 120);
    const body = safeRouteText(front.body, "", 420);
    const artDirection = safeRouteText(
      front.artDirection ?? front.art_direction ?? front.image_prompt ?? front.imagePrompt,
      "",
      360
    );
    if (!headline || !body) return undefined;
    return { headline, body, artDirection };
  }

  function galleryCopyFromAiPayload(cardCopy, cardCopyState, body) {
    const category = safeRouteText(body?.category, "", 80);
    const themeGuide = cardCopy?.theme_guide ?? cardCopy?.themeGuide ?? {};
    const themeTitle = safeRouteText(themeGuide.theme_title ?? themeGuide.themeTitle, "", 90);
    return {
      title: safeRouteText(themeTitle || cardCopyState.headline, "", 80),
      publicCaption: safeRouteText(cardCopyState.body, "", 120)
    };
  }

  function galleryCategoryLabel(category) {
    return String(category || "custom")
      .split("-")
      .map((part, index) => (index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
      .join(" ");
  }

  function safeRouteText(value, fallback, maxLength) {
    const text = String(value ?? "")
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
      .replace(/\b(?:\d[ -]*?){13,16}\b/g, "[redacted-payment]")
      .replace(/\+?\d[\d\s().-]{7,}\d/g, "[redacted-phone]")
      .replace(/\s+/g, " ")
      .trim();
    return (text || fallback).slice(0, Math.max(1, maxLength));
  }

  function requireIdempotencyKey({ request, response, path }) {
    if (readRequestHeader(request, "x-idempotency-key")) return true;
    sendJson(response, 400, {
      service: "customcard-api",
      status: "idempotency-key-required",
      path
    });
    return false;
  }

  async function readJsonBody({ request, response, path }) {
    try {
      const rawBody = await readRequestBody(request, 128_000);
      return { ok: true, value: rawBody ? JSON.parse(rawBody) : {} };
    } catch {
      sendJson(response, 400, { service: "customcard-api", status: "invalid-json", path });
      return { ok: false };
    }
  }

  async function readValidatedJsonBodyText({ request, response, path }) {
    try {
      const rawBody = await readRequestBody(request, 128_000);
      if (rawBody) JSON.parse(rawBody);
      return { ok: true, value: rawBody || "{}" };
    } catch {
      sendJson(response, 400, { service: "customcard-api", status: "invalid-json", path });
      return { ok: false, value: "{}" };
    }
  }

  function handleBootstrapRoute({ path, response }) {
    if (path === "/api/mobile/bootstrap") {
      sendJson(response, 200, {
        ...mobileBootstrap,
        localization: readiness.localization,
        runtime: apiRuntime.describe()
      });
      return true;
    }

    if (path === "/api/customer/bootstrap") {
      sendJson(response, 200, {
        service: "customcard-api",
        primaryActions: ["event-import", "text-chat", "image-generation", "render-export", "vendor-handoff"],
        readyFallbacks: ["ICS / invite paste", "Local customer chat", "Browser SVG renderer", "Manual print checklist"],
        draftStateRoute: "/api/customer/draft-state/current",
        localization: readiness.localization,
        printerPricing: {
          selectedVendorId: "walgreens",
          liveQuote: false,
          knownPriceCount: 12,
          sourceCount: 8,
          couponSourceCount: 4,
          couponCollectionTargetCount: 6,
          couponProviderTargetCount: 2,
          retailerCouponCollectionTargetCount: 4,
          couponOfferCount: 2,
          activeCouponOfferCount: 2,
          portalAppliedCouponOfferCount: 0,
          couponPortalApplicationPacketCount: 2,
          couponPortalApplicationTargetCount: 5,
          couponsIncludedInShownPrices: "only-after-provider-portal-application",
          liveCouponLookup: "operator-script-or-credential-gated-provider",
          couponProviderFeedAllowed: true,
          retailerCouponScrapeAllowed: true,
          providerPortalApplicationRequired: true,
          bestAvailablePriceRequiresCouponPortalEvidence: true,
          couponPolicy: "apply-during-provider-portal-collection",
          couponPortalEvidenceRoute: retailPrinterCouponPortalEvidenceRoute,
          couponPortalEvidenceRouteAudience: "admin",
          clientMaySubmitCouponEvidence: false,
          maxAgeDays: 30,
          freshnessPolicy: "Use src/printerPricing.ts refresh report before showing prices as current.",
          externalNetworkCalls: false
        },
        calendarConnections: {
          startRoute: "/api/calendar/connections/start",
          startPackets: calendarConnectionStartPackets(),
          blockers: []
        },
        retailOperations: {
          startRoute: "/api/retail-printers/operations/start",
          startPackets: buildRetailPrinterOperationStartPackets(),
          blockers: []
        },
        realOrdersEnabled: false,
        runtime: apiRuntime.describe()
      });
      return true;
    }

    return false;
  }

  async function handleCustomerStateRoute({ authContext, path, response }) {
    if (path === "/api/customer/connections") {
      sendJson(response, 200, await apiRuntime.readCustomerConnections({ authContext }));
      return true;
    }
    if (path !== "/api/customer/draft-state/current") return false;
    sendJson(response, 200, await apiRuntime.readDraftState({ authContext }));
    return true;
  }

  function handleWalgreensCallbackRoute({ path, response }) {
    if (path !== walgreensCheckoutCallbackRoute) return false;
    sendHtml(response, 200, buildWalgreensCallbackHtml(walgreensCheckout.config.appOrigin));
    return true;
  }

  async function handleWalgreensHostedCheckoutRoute({ path, request, response }) {
    if (
      path !== walgreensCheckoutStatusRoute &&
      path !== walgreensCheckoutUploadRoute &&
      path !== walgreensCheckoutSessionRoute
    ) {
      return false;
    }
    if (walgreensRateLimited(request)) {
      sendJson(response, 429, {
        service: "customcard-api",
        status: "rate-limited",
        path,
        error: "Too many Walgreens checkout attempts. Wait a minute and try again."
      });
      return true;
    }

    if (path === walgreensCheckoutStatusRoute) {
      const result = await walgreensCheckout.checkReadiness();
      const { statusCode, ...payload } = result;
      sendJson(response, statusCode, { service: "customcard-api", ...payload });
      return true;
    }

    let parsedBody;
    try {
      const rawBody = await readRequestBody(
        request,
        path === walgreensCheckoutUploadRoute ? walgreensUploadBodyLimit : 256_000
      );
      parsedBody = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      sendJson(response, 400, {
        service: "customcard-api",
        status: "invalid-json",
        path,
        error:
          path === walgreensCheckoutUploadRoute
            ? "Walgreens image upload request was malformed or exceeded the upload body limit."
            : "Walgreens checkout request body must be valid JSON."
      });
      return true;
    }

    try {
      const result =
        path === walgreensCheckoutUploadRoute
          ? await walgreensCheckout.uploadCardImage(parsedBody.imageBase64)
          : await walgreensCheckout.createCheckoutSession(parsedBody);
      const { statusCode, ...payload } = result;
      sendJson(response, statusCode, { service: "customcard-api", ...payload });
    } catch (error) {
      const upstream = formatWalgreensCheckoutUpstreamError(error);
      sendJson(response, upstream.statusCode, {
        service: "customcard-api",
        ...upstream.payload
      });
    }
    return true;
  }

  async function handleAiRoute({ authContext, path, request, requestUrl, response, route }) {
    if (path === "/api/ai/jobs/status") {
      const result = await apiRuntime.readQueuedJob({
        authContext,
        jobId: requestUrl.searchParams.get("job_id") ?? requestUrl.searchParams.get("jobId") ?? ""
      });
      sendJson(response, result.statusCode, result.payload);
      return true;
    }

    if (path !== aiCardGenerateRoute && path !== aiChatRespondRoute) return false;
    if (!readRequestHeader(request, "x-idempotency-key")) {
      sendJson(response, 400, {
        service: "customcard-api",
        status: "missing-idempotency-key",
        path
      });
      return true;
    }

    let rawBody;
    try {
      rawBody = await readRequestBody(request, 128_000);
      if (rawBody) JSON.parse(rawBody);
    } catch {
      sendJson(response, 400, { service: "customcard-api", status: "invalid-json", path });
      return true;
    }

    const result = await apiRuntime.persistMutation({
      route,
      request,
      authContext,
      bodyText: rawBody,
      responsePayload: {
        service: "customcard-api",
        status: "queued",
        route: route.id,
        queue_admission: {
          accepted_at: new Date().toISOString(),
          execution: "worker",
          payload_minimized: true,
          client_ai_flow_config_accepted: false
        }
      }
    });
    sendJson(response, result.statusCode, result.payload);
    return true;
  }

  function providerCompleteBodyLimit() {
    const parsed = Number.parseInt(String(process.env.CUSTOMCARD_PROVIDER_COMPLETE_BODY_LIMIT_BYTES ?? "12000000"), 10);
    return Number.isFinite(parsed) ? Math.min(24_000_000, Math.max(256_000, parsed)) : 12_000_000;
  }

  function parseStrictJsonBody(bodyText) {
    if (!bodyText) return {};
    return JSON.parse(bodyText);
  }

  async function persistAiGeneratedImages({ authContext, result }) {
    if (result?.statusCode !== 200 || !apiRuntime.persistGeneratedImageArtifacts) return undefined;
    try {
      return await apiRuntime.persistGeneratedImageArtifacts({ authContext, payload: result.payload });
    } catch (error) {
      return {
        payload: {
          ...result.payload,
          generated_image_persistence: {
            status: "blocked",
            blockers: [error instanceof Error ? error.message.slice(0, 180) : "Generated image persistence failed."],
            inlineImageBytesPersisted: false,
            liveNetworkCalls: false
          }
        }
      };
    }
  }

  async function recordAiProviderEvents({ authContext, result }) {
    const events = result?.payload?.provider_call_events;
    if (!Array.isArray(events) || events.length === 0 || !apiRuntime.recordProviderCallEvents) return undefined;
    try {
      return await apiRuntime.recordProviderCallEvents({ authContext, events });
    } catch (error) {
      return {
        persisted: false,
        count: 0,
        runtimeMode: apiRuntime.mode ?? "unknown",
        error: error instanceof Error ? error.message.slice(0, 180) : "provider-call-ledger-unavailable"
      };
    }
  }

  function readRequestHeader(request, name) {
    const headers = request?.headers;
    if (!headers) return "";
    const direct =
      headers[name] ??
      headers[name.toLowerCase()] ??
      headers[name.toUpperCase()] ??
      headers[name.replace(/(^|-)([a-z])/g, (_match, dash, char) => `${dash}${char.toUpperCase()}`)];
    if (direct !== undefined) return Array.isArray(direct) ? direct[0] ?? "" : String(direct);
    if (typeof headers.get === "function") return headers.get(name) ?? headers.get(name.toLowerCase()) ?? "";
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === name.toLowerCase()) return Array.isArray(value) ? value[0] ?? "" : String(value);
    }
    return "";
  }

  function shouldWriteAdminLocalAiLoopReport() {
    return !process.env.VERCEL;
  }
}
