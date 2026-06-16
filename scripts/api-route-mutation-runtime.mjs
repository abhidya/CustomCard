export function createRouteMutationRuntime({
  missingRetailPrinterCouponPortalEvidenceFields,
  mutationBodyContractSpecs,
  normalizeJson,
  parseJsonBody,
  persistedTablesForRoute,
  readHeader,
  requestHash,
  resolveImportPreviewMetadata,
  safeBoolean,
  safeId,
  safeLocale,
  stableRuntimeId
}) {
  function prepareIdempotentMutation({ route, request, authContext, bodyText }) {
    const idempotencyKey = readHeader(request, "x-idempotency-key");
    if (!idempotencyKey) {
      return {
        ok: false,
        statusCode: 400,
        payload: {
          service: "customcard-api",
          status: "idempotency-key-required",
          route: route.id
        }
      };
    }
    if (idempotencyKey.length < 12) {
      return {
        ok: false,
        statusCode: 400,
        payload: {
          service: "customcard-api",
          status: "idempotency-key-too-short",
          route: route.id
        }
      };
    }

    const bodyValidation = validateMutationBody(route, bodyText);
    if (bodyValidation) return bodyValidation;

    return {
      ok: true,
      idempotencyKey,
      requestHash: requestHash(route.id, bodyText),
      recordKey: `${authContext.userId}:${route.id}:${idempotencyKey}`
    };
  }

  const mutationBodyContracts = {
    "ai-chat-respond": {
      requiredFields: ["customer_message", "recipient_name"],
      detail: "AI chat jobs require a customer message and recipient before queue admission.",
      missingFields(body) {
        const missingFields = [];
        if (!hasRequiredText(body.customer_message ?? body.customerMessage)) missingFields.push("customer_message");
        if (!hasRequiredText(body.recipient_name ?? body.recipientName)) missingFields.push("recipient_name");
        return missingFields;
      }
    },
    "ai-card-generate": {
      requiredFields: ["sender", "recipient", "occasion"],
      detail: "AI card generation jobs require sender, recipient, and occasion before queue admission.",
      missingFields(body) {
        const missingFields = [];
        if (!hasRequiredText(body.sender)) missingFields.push("sender");
        if (!hasRequiredText(body.recipient)) missingFields.push("recipient");
        if (!hasRequiredText(body.occasion)) missingFields.push("occasion");
        return missingFields;
      }
    },
    "import-preview": {
      ...mutationBodyContractSpecs["import-preview"],
      missingFields(body) {
        return resolveImportPreviewMetadata(body).missingFields;
      }
    },
    "calendar-connection-start": {
      ...mutationBodyContractSpecs["calendar-connection-start"],
      missingFields(body) {
        const calendarChoiceId = String(body.calendarChoiceId ?? body.choiceId ?? body.providerId ?? "").trim();
        return ["manual-invite-or-ics", "google-calendar-events", "icloud-ics-fallback"].includes(calendarChoiceId)
          ? []
          : ["calendarChoiceId"];
      }
    },
    "retail-printer-operation-start": {
      ...mutationBodyContractSpecs["retail-printer-operation-start"],
      missingFields(body) {
        const missingFields = [];
        const vendorId = String(body.vendorId ?? body.providerId ?? body.selectedVendorId ?? "").trim();
        const operation = String(body.operation ?? body.operationKind ?? "").trim();
        if (!["walmart", "fedex", "cvs", "walgreens"].includes(vendorId)) missingFields.push("vendorId");
        if (!["fetch-price", "upload-image", "place-order"].includes(operation)) missingFields.push("operation");
        return missingFields;
      }
    },
    "retail-printer-coupon-portal-evidence": {
      ...mutationBodyContractSpecs["retail-printer-coupon-portal-evidence"],
      missingFields(body) {
        return missingRetailPrinterCouponPortalEvidenceFields(body);
      }
    },
    "customer-draft-state-save": {
      ...mutationBodyContractSpecs["customer-draft-state-save"],
      missingFields(body) {
        const missingFields = [];
        if (!body.draftInput || typeof body.draftInput !== "object" || Array.isArray(body.draftInput)) {
          missingFields.push("draftInput");
        }
        if (!hasValidDraftStatus(body.status)) missingFields.push("status");
        return missingFields;
      }
    },
    "render-packets": {
      ...mutationBodyContractSpecs["render-packets"],
      missingFields(body) {
        return hasRequiredText(body.projectId) ? [] : ["projectId"];
      }
    },
    "card-projects": {
      ...mutationBodyContractSpecs["card-projects"],
      missingFields(body) {
        const missingFields = [];
        if (!hasRequiredText(body.opportunityId)) missingFields.push("opportunityId");
        if (!hasRequiredText(body.recipientName)) missingFields.push("recipientName");
        return missingFields;
      }
    },
    "relationship-memories": {
      ...mutationBodyContractSpecs["relationship-memories"],
      missingFields(body) {
        const missingFields = [];
        if (!hasRequiredText(body.recipientName ?? body.recipient)) missingFields.push("recipientName");
        if (!hasRequiredText(body.text ?? body.note)) missingFields.push("text");
        if (!hasExplicitMemoryDecision(body)) missingFields.push("decision");
        return missingFields;
      }
    },
    "manual-vendor-handoff": {
      ...mutationBodyContractSpecs["manual-vendor-handoff"],
      missingFields(body) {
        const missingFields = [];
        if (!hasRequiredText(body.projectId ?? body.cardProjectId)) missingFields.push("projectId");
        if (!hasRequiredText(body.renderPacketId)) missingFields.push("renderPacketId");
        if (!hasRequiredText(body.vendorId ?? body.storeId ?? body.selectedVendorId)) missingFields.push("vendorId");
        if (!hasExplicitBoolean(body.externalShareApproval ?? body.externalShareApproved ?? body.consentGranted)) {
          missingFields.push("externalShareApproval");
        }
        return missingFields;
      }
    },
    "data-requests": {
      ...mutationBodyContractSpecs["data-requests"],
      missingFields(body) {
        const missingFields = [];
        if (!hasValidDataRequestType(body.requestType ?? body.type)) missingFields.push("requestType");
        if (!hasRequiredText(body.region)) missingFields.push("region");
        if (!hasExplicitBoolean(body.consentGranted ?? body.requestConfirmed)) missingFields.push("consentGranted");
        return missingFields;
      }
    },
    "admin-card-gallery-save": {
      ...mutationBodyContractSpecs["admin-card-gallery-save"],
      missingFields(body) {
        if (safeBoolean(body.remove)) {
          return hasRequiredText(body.entryId ?? body.id) ? [] : ["entryId"];
        }
        const missingFields = [];
        if (!hasRequiredText(body.category ?? body.occasion)) missingFields.push("category");
        if (!hasRequiredText(body.title)) missingFields.push("title");
        if (!hasRequiredText(body.publicCaption ?? body.caption)) missingFields.push("publicCaption");
        return missingFields;
      }
    }
  };

  function validateMutationBody(route, bodyText) {
    const contract = mutationBodyContracts[route.id];
    if (!contract) return undefined;
    const body = parseJsonBody(bodyText);
    const missingFields = contract.missingFields(body);

    if (missingFields.length === 0) return undefined;

    return {
      ok: false,
      statusCode: 400,
      payload: {
        service: "customcard-api",
        status: `invalid-${route.id}-payload`,
        route: route.id,
        detail: contract.detail,
        requiredFields: contract.requiredFields,
        missingFields,
        rawContentStored: false
      }
    };
  }

  function hasRequiredText(value) {
    return String(value ?? "").trim().length > 0;
  }

  function hasExplicitBoolean(value) {
    return value !== undefined && value !== null && String(value).trim().length > 0;
  }

  function hasExplicitMemoryDecision(body) {
    const decision = String(body.decision ?? "").trim().toLowerCase();
    return decision === "approve" || decision === "forget" || hasExplicitBoolean(body.forget);
  }

  function hasValidDataRequestType(value) {
    const requestType = String(value ?? "").trim().toLowerCase().replace(/[^a-z_:-]/g, "_");
    return ["export", "delete", "correct", "revoke_consent", "access"].includes(requestType);
  }

  function hasValidDraftStatus(value) {
    return ["draft", "in-progress", "ready-for-review"].includes(String(value ?? "").trim());
  }

  function replayOrConflict(record, nextRequestHash) {
    if (record.requestHash !== nextRequestHash) {
      return {
        ok: false,
        statusCode: 409,
        payload: {
          service: "customcard-api",
          status: "idempotency-conflict",
          detail: "The same idempotency key was used with a different request body."
        }
      };
    }

    return {
      ok: true,
      statusCode: record.statusCode,
      payload: {
        ...record.responseBody,
        idempotencyReplayed: true
      }
    };
  }

  function decorateMutationPayload({
    route,
    authContext,
    responsePayload,
    runtimeMode,
    idempotencyKey,
    idempotencyReplayed,
    routePersistence,
    queueJob
  }) {
    return {
      ...responsePayload,
      ...publicQueuedJobAcceptance(queueJob),
      ...(routePersistence?.payload ?? {}),
      runtimeMode,
      authenticatedUserId: authContext.userId,
      persistedTables: persistedTablesForRoute(route),
      idempotencyKey,
      idempotencyPersisted: true,
      repositoryPersisted: Boolean(routePersistence?.persisted),
      idempotencyReplayed
    };
  }

  function buildQueuedJobRecord({ route, authContext, idempotencyKey, idempotencyKeyId = null, bodyText }) {
    if (route.runtimeMode !== "queue-backed") return undefined;
    const safeIdempotencyKey = safeId(idempotencyKey, stableRuntimeId("idempotency", authContext.userId, route.id, bodyText || "{}"));
    return {
      id: stableRuntimeId("job", authContext.userId, route.id, safeIdempotencyKey),
      userId: authContext.userId,
      routeId: route.id,
      idempotencyKeyId,
      status: "queued",
      payload: buildQueuedJobPayload({ route, authContext, idempotencyKey: safeIdempotencyKey, bodyText }),
      result: {},
      attemptCount: 0,
      maxAttempts: 3
    };
  }

  function buildQueuedJobPayload({ route, authContext, idempotencyKey, bodyText }) {
    const body = parseJsonBody(bodyText);
    const basePayload = {
      routeId: route.id,
      jobKind: route.id.startsWith("ai-") ? "ai-flow" : "api-route",
      idempotencyKey,
      requestContext: {
        rateKey: authContext.userId,
        idempotencyKey,
        authContext: {
          userId: authContext.userId,
          sessionId: authContext.sessionId,
          role: authContext.role
        }
      },
      security: {
        payloadMinimized: true,
        clientAiFlowConfigAccepted: false,
        credentialsPersisted: false,
        rawProviderContentStored: false
      }
    };
    if (route.id === "ai-chat-respond") {
      return {
        ...basePayload,
        flowId: "customer-chat",
        body: sanitizeAiChatJobBody(body)
      };
    }
    if (route.id === "ai-card-generate") {
      return {
        ...basePayload,
        flowId: "card-generation",
        body: sanitizeAiCardJobBody(body)
      };
    }
    return basePayload;
  }

  function sanitizeAiChatJobBody(body) {
    return {
      customer_message: safeQueuedText(body.customer_message ?? body.customerMessage, 1200),
      recipient_name: safeQueuedText(body.recipient_name ?? body.recipientName, 120),
      approved_memory_notes: safeQueuedTextArray(body.approved_memory_notes ?? body.approvedMemoryNotes, 6, 600),
      locale: safeLocale(body.locale),
      fulfillment_context: safeQueuedText(body.fulfillment_context ?? body.fulfillmentContext, 240)
    };
  }

  function sanitizeAiCardJobBody(body) {
    return {
      sender: safeQueuedText(body.sender, 120),
      recipient: safeQueuedText(body.recipient, 120),
      relationship: safeQueuedText(body.relationship, 80),
      occasion: safeQueuedText(body.occasion, 120),
      tone: safeQueuedText(body.tone, 80),
      style: safeQueuedText(body.style, 160),
      language: safeQueuedText(body.language, 40),
      personal_note: safeQueuedText(body.personal_note ?? body.personalNote, 1200),
      memory_notes: safeQueuedTextArray(body.memory_notes ?? body.memoryNotes, 6, 600)
    };
  }

  function safeQueuedTextArray(value, maxItems, maxLength) {
    return (Array.isArray(value) ? value : [])
      .map((item) => safeQueuedText(item, maxLength))
      .filter(Boolean)
      .slice(0, maxItems);
  }

  function safeQueuedText(value, maxLength) {
    const text = String(value ?? "")
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
      .replace(/\b(?:\d[ -]*?){13,16}\b/g, "[redacted-payment]")
      .replace(/\+?\d[\d\s().-]{7,}\d/g, "[redacted-phone]")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, Math.max(1, maxLength));
  }

  function publicQueuedJobAcceptance(queueJob) {
    if (!queueJob || !queueJob.routeId?.startsWith("ai-")) return {};
    return {
      status: "queued",
      queue_status: queueJob.status,
      job_id: queueJob.id,
      job_status_url: `/api/ai/jobs/status?job_id=${encodeURIComponent(queueJob.id)}`,
      retry_after_seconds: 2,
      result_available: false,
      worker_required: true,
      fallback_queued: true,
      ai_queue: {
        backend: "api_jobs",
        worker: "customcard-worker",
        route_id: queueJob.routeId,
        max_attempts: queueJob.maxAttempts,
        payload_minimized: true,
        client_ai_flow_config_accepted: false,
        credentials_persisted: false,
        raw_provider_content_stored: false
      }
    };
  }

  function buildQueuedJobReadResult({ runtimeMode, authContext, job, statusCode }) {
    if (!job) {
      return {
        statusCode,
        payload: {
          service: "customcard-api",
          status: "job-not-found",
          runtimeMode,
          authenticatedUserId: authContext.userId
        }
      };
    }
    const normalizedResult = normalizeJson(job.result ?? {});
    const result = normalizedResult && typeof normalizedResult === "object" ? normalizedResult : {};
    const resultAvailable = job.status === "succeeded" && Object.keys(result).length > 0;
    return {
      statusCode,
      payload: {
        service: "customcard-api",
        status: resultAvailable ? "job-result-ready" : `job-${job.status}`,
        runtimeMode,
        authenticatedUserId: authContext.userId,
        job_id: job.id,
        route_id: job.routeId,
        queue_status: job.status,
        result_available: resultAvailable,
        attempt_count: Number(job.attemptCount ?? 0),
        max_attempts: Number(job.maxAttempts ?? 3),
        retry_after_seconds: resultAvailable || job.status === "dead_lettered" ? undefined : 2,
        last_error: job.lastError || undefined,
        created_at: job.createdAtIso,
        updated_at: job.updatedAtIso,
        result: resultAvailable ? result : undefined
      }
    };
  }

  return {
    buildQueuedJobReadResult,
    buildQueuedJobRecord,
    decorateMutationPayload,
    prepareIdempotentMutation,
    publicQueuedJobAcceptance,
    replayOrConflict,
    validateMutationBody
  };
}
