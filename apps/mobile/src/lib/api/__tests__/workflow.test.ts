/**
 * End-to-end customer workflow at the API-client level, against a scripted
 * server: import an event -> approve a memory -> create the card project ->
 * build the render packet -> manual vendor handoff. Verifies auth headers,
 * idempotency keys, and that ids chain correctly between steps.
 */
import { createCustomCardApi } from "../endpoints";
import { createHttpClient } from "../httpClient";

interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

function scriptedFetch(calls: RecordedCall[]) {
  return (async (url: RequestInfo | URL, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ url: String(url), method: init?.method ?? "GET", headers, body });

    const path = new URL(String(url)).pathname;
    const respond = (payload: unknown) =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    switch (path) {
      case "/api/import-preview":
        return respond({
          status: "accepted",
          route: "import-preview",
          realOrdersEnabled: false,
          rawContentStored: false,
          warnings: [],
          opportunities: [
            {
              opportunityId: "opp-1",
              eventId: "evt-1",
              recipientName: "Maya",
              title: "Birthday dinner for Maya",
              startsAt: "2026-07-01T18:00:00.000Z",
              timezone: "UTC",
              confidence: 0.92,
              decision: "generate"
            }
          ]
        });
      case "/api/memories/review":
        return respond({
          status: "accepted",
          route: "relationship-memories",
          realOrdersEnabled: false,
          memoryId: "mem-1",
          recipientName: "Maya",
          approved: true,
          forgottenAt: null,
          memoryUseAllowed: true
        });
      case "/api/card-projects":
        return respond({
          status: "accepted",
          route: "card-projects",
          realOrdersEnabled: false,
          projectId: "proj-1",
          renderStatus: "ready-for-render",
          requiresRtlLayout: false,
          category: "birthday"
        });
      case "/api/render-packets":
        return respond({
          status: "accepted",
          route: "render-packets",
          realOrdersEnabled: false,
          renderPacketId: "packet-1",
          checksum: "cc_1",
          artifactManifest: {
            renderPacketId: "packet-1",
            projectId: "proj-1",
            storageProvider: "filesystem",
            artifactCount: 6,
            width: 1500,
            height: 2100,
            dpi: 300,
            locale: "en-US",
            direction: "ltr",
            safeZonePassed: true,
            textOverflow: false
          },
          signedArtifactUrls: []
        });
      case "/api/vendor-handoff/manual":
        return respond({
          status: "accepted",
          route: "manual-vendor-handoff",
          realOrdersEnabled: false,
          orderId: "order-1",
          handoffStatus: "vendor_handoff_ready",
          handoffChecklist: ["Download signed artifacts"],
          signedArtifactUrls: [],
          disabledReasons: []
        });
      default:
        return new Response("{}", { status: 404 });
    }
  }) as typeof fetch;
}

describe("main customer workflow", () => {
  it("walks import -> memory -> project -> render packet -> handoff with auth and idempotency", async () => {
    const calls: RecordedCall[] = [];
    let keyCounter = 0;
    const api = createCustomCardApi(
      createHttpClient({
        baseUrl: "https://api.example.test",
        getToken: async () => "customer-session-token",
        fetchFn: scriptedFetch(calls),
        generateIdempotencyKey: () => `key-${++keyCounter}`
      })
    );

    const preview = await api.importPreview({
      sourceKind: "manual-paste",
      metadataOnlyPayload: {
        title: "Birthday dinner for Maya",
        recipientName: "Maya",
        startsAt: "2026-07-01T18:00:00.000Z"
      }
    });
    const opportunity = preview.opportunities[0];
    expect(opportunity.opportunityId).toBe("opp-1");

    const memory = await api.reviewMemory({
      recipientName: opportunity.recipientName,
      text: "Loves hiking in autumn",
      decision: "approve"
    });
    expect(memory.approved).toBe(true);

    const project = await api.createCardProject({
      opportunityId: opportunity.opportunityId,
      recipientName: opportunity.recipientName,
      approvedMemoryIds: [memory.memoryId]
    });
    expect(project.projectId).toBe("proj-1");

    const packet = await api.createRenderPacket(project.projectId);
    expect(packet.artifactManifest.projectId).toBe(project.projectId);
    expect(packet.artifactManifest.safeZonePassed).toBe(true);

    const handoff = await api.manualVendorHandoff({
      projectId: project.projectId,
      renderPacketId: packet.renderPacketId,
      vendorId: "walgreens",
      externalShareApproval: true
    });
    expect(handoff.handoffStatus).toBe("vendor_handoff_ready");

    // Every call carried the customer session and a unique idempotency key.
    expect(calls).toHaveLength(5);
    const seenKeys = new Set<string>();
    for (const call of calls) {
      expect(call.headers.Authorization).toBe("Bearer customer-session-token");
      expect(call.method).toBe("POST");
      const key = call.headers["X-Idempotency-Key"];
      expect(key).toBeTruthy();
      expect(seenKeys.has(key)).toBe(false);
      seenKeys.add(key);
    }

    // The render packet request referenced the created project.
    const packetCall = calls.find((call) => call.url.endsWith("/api/render-packets"));
    expect((packetCall?.body as { projectId: string }).projectId).toBe("proj-1");
  });
});
