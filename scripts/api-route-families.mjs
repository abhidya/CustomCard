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
    walgreensCheckoutUploadRoute,
    walgreensRateLimited,
    walgreensUploadBodyLimit
  } = deps;

  return {
    async handlePreAuthRoute({ path, request, requestUrl, response }) {
      if (!path.startsWith("/api/artifacts/")) return false;
      if (request.method !== "GET") {
        sendJson(response, 405, { service: "customcard-api", status: "method-not-allowed", path });
        return true;
      }
      const objectKey = decodeArtifactObjectKey(path);
      const artifact = await apiRuntime.readArtifact({ objectKey, query: requestUrl.searchParams });
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
      if (await handleAdminRoute({ authContext, path, request, requestUrl, response })) return true;
      if (handleBootstrapRoute({ path, response })) return true;
      if (await handleCustomerStateRoute({ authContext, path, response })) return true;
      if (handleWalgreensCallbackRoute({ path, response })) return true;
      if (await handleWalgreensHostedCheckoutRoute({ path, request, response })) return true;
      if (await handleAiRoute({ authContext, path, request, response })) return true;

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

  async function handleAdminRoute({ authContext, path, request, requestUrl, response }) {
    if (path === "/api/admin/card-gallery" && request?.method === "GET") {
      const payload = await apiRuntime.readCardGallery({ authContext });
      sendJson(response, 200, payload);
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

    return false;
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
    sendHtml(response, 200, buildWalgreensCallbackHtml(walgreensCheckout.config.appOrigin || "*"));
    return true;
  }

  async function handleWalgreensHostedCheckoutRoute({ path, request, response }) {
    if (path !== walgreensCheckoutUploadRoute && path !== walgreensCheckoutSessionRoute) return false;
    if (walgreensRateLimited(request)) {
      sendJson(response, 429, {
        service: "customcard-api",
        status: "rate-limited",
        path,
        error: "Too many Walgreens checkout attempts. Wait a minute and try again."
      });
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

  async function handleAiRoute({ authContext, path, request, response }) {
    if (path !== aiCardGenerateRoute && path !== aiChatRespondRoute) return false;
    if (!request.headers?.["x-idempotency-key"]) {
      sendJson(response, 400, {
        service: "customcard-api",
        status: "missing-idempotency-key",
        path
      });
      return true;
    }

    let parsedBody;
    try {
      const rawBody = await readRequestBody(request, 128_000);
      parsedBody = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      sendJson(response, 400, { service: "customcard-api", status: "invalid-json", path });
      return true;
    }

    const rateKey = clientRateLimitKey(request);
    const idempotencyKey = request.headers?.["x-idempotency-key"];
    const result =
      path === aiCardGenerateRoute
        ? await aiGenerationService.generateCard(parsedBody, { authContext, idempotencyKey, rateKey })
        : await aiGenerationService.respondChat(parsedBody, { authContext, idempotencyKey, rateKey });
    const ledger = await recordAiProviderEvents({ authContext, result });
    sendJson(response, result.statusCode, { service: "customcard-api", ...result.payload, ...(ledger ? { ai_cost_ledger: ledger } : {}) });
    return true;
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
}
