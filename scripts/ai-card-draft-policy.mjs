export function createAiCardDraftPolicy({ buildDraftId }) {
  function buildCardGenerationPayload({
    draftInput,
    cardCopy,
    images,
    copyFlow,
    copyProvider,
    imageFlow,
    imageProvider,
    imageProviderFailure,
    providerCallEvents,
    fallbackQueued = false
  }) {
    return {
      statusCode: 200,
      payload: {
        status: imageProviderFailure ? "partial" : "succeeded",
        draft_id: buildDraftId(draftInput),
        card_copy: cardCopy,
        images,
        generated_by: images.length > 0 ? "ai-text-and-image" : "ai-text-only",
        user_content_only: false,
        ai_flow: {
          card_copy: publicFlowState(copyFlow, copyProvider || copyFlow.primaryAdapterId, ""),
          card_image: publicFlowState(imageFlow, imageProvider, imageProviderFailure)
        },
        provider_call_events: publicProviderCallEvents(providerCallEvents),
        ai_cost_gate: publicCostGateSummary(providerCallEvents),
        fallback_queued: fallbackQueued
      }
    };
  }

  function providerUnavailableResponse({
    statusCode,
    flowKey,
    flow,
    adapterId,
    providerFailure,
    providerCallEvents,
    fallbackQueued = false,
    extraPayload = {}
  }) {
    const { ai_flow: extraAiFlow, ...payloadRest } = extraPayload ?? {};
    const mergedAiFlow = extraAiFlow && typeof extraAiFlow === "object" && !Array.isArray(extraAiFlow)
      ? extraAiFlow
      : {};
    return {
      statusCode,
      payload: {
        ...payloadRest,
        status: "provider-unavailable",
        detail: providerFailure,
        error: providerFailure,
        user_content_only: false,
        ai_flow: {
          ...mergedAiFlow,
          [flowKey]: publicFlowState(flow, adapterId ?? (flow.readyForLiveCalls ? flow.primaryAdapterId : ""), providerFailure)
        },
        provider_call_events: publicProviderCallEvents(providerCallEvents),
        ai_cost_gate: publicCostGateSummary(providerCallEvents),
        fallback_queued: fallbackQueued
      }
    };
  }

  function publicFlowState(flow, adapterId, providerFailure) {
    return {
      flow_id: flow.flowId,
      adapter_id: adapterId,
      primary_adapter_id: flow.primaryAdapterId,
      fallback_adapter_id: flow.fallbackAdapterId,
      model: flow.model,
      rate_limit_per_minute: flow.rateLimitPerMinute,
      monthly_budget_cents: flow.monthlyBudgetCents,
      per_request_budget_cents: flow.perRequestBudgetCents,
      queue_enabled: flow.queueEnabled,
      fallback_queue_enabled: flow.fallbackQueueEnabled,
      ready_for_live_calls: flow.readyForLiveCalls,
      blocked_reasons: flow.blockedReasons,
      provider_failure: providerFailure || undefined
    };
  }

  function publicProviderCallEvents(events) {
    return events
      .filter(Boolean)
      .map((event) => ({
        id: event.id,
        tenant_id: event.tenantId,
        route_id: event.routeId,
        flow_id: event.flowId,
        adapter_id: event.adapterId,
        provider: event.provider,
        capability: event.capability,
        status: event.status,
        fallback_from_adapter_id: event.fallbackFromAdapterId ?? undefined,
        fallback_reason: event.fallbackReason ?? undefined,
        month_bucket: event.monthBucket,
        request_units: event.requestUnits,
        estimated_cost_cents: event.estimatedCostCents,
        actual_cost_cents: event.actualCostCents ?? undefined,
        rate_limit_window_start: event.rateLimitWindowStartIso,
        live_network_call: event.liveNetworkCall,
        metadata: event.metadata
      }));
  }

  function publicCostGateSummary(events) {
    const publicEvents = publicProviderCallEvents(events);
    const reservedEvents = publicEvents.filter((event) => event.status === "reserved");
    return {
      event_count: publicEvents.length,
      reserved_or_spent_cents: reservedEvents
        .reduce((total, event) => total + event.estimated_cost_cents, 0),
      actual_spend_cents: publicEvents.reduce((total, event) => total + (event.actual_cost_cents ?? 0), 0),
      request_units: reservedEvents.reduce((total, event) => total + event.request_units, 0),
      live_network_calls: publicEvents.some((event) => event.live_network_call),
      blocked_reasons: publicEvents
        .filter((event) => event.status === "blocked" && event.fallback_reason)
        .map((event) => event.fallback_reason)
    };
  }

  function hasLiveProviderEvent(events) {
    return publicProviderCallEvents(events).some((event) => event.status !== "blocked");
  }

  function hasExternalNetworkEvent(events) {
    return publicProviderCallEvents(events).some((event) => event.live_network_call && event.status !== "blocked");
  }

  return {
    buildCardGenerationPayload,
    hasExternalNetworkEvent,
    hasLiveProviderEvent,
    providerUnavailableResponse,
    publicCostGateSummary,
    publicFlowState,
    publicProviderCallEvents
  };
}
