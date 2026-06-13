/**
 * Live contract test: runs the REAL typed API client (un-mocked fetch) against
 * a running CustomCard API to prove the client's request/response models match
 * the server. Skipped unless CUSTOMCARD_LIVE_API_URL is set, so the default
 * suite stays hermetic.
 *
 * Run it against the in-memory runtime:
 *   # terminal 1 (repo root)
 *   CUSTOMCARD_API_RUNTIME=memory AUTH_SESSION_SECRET=test-auth-session-secret-32-chars \
 *   CUSTOMCARD_CUSTOMER_SESSION_TOKEN=test-customer-session-token \
 *   CUSTOMCARD_ADMIN_SESSION_TOKEN=test-admin-session-token PORT=8787 node scripts/api-server.mjs
 *   # terminal 2 (apps/mobile)
 *   CUSTOMCARD_LIVE_API_URL=http://127.0.0.1:8787 \
 *   CUSTOMCARD_LIVE_API_TOKEN=test-customer-session-token npx jest liveApi
 */
import { createCustomCardApi } from "../endpoints";
import { createHttpClient } from "../httpClient";

const baseUrl = process.env.CUSTOMCARD_LIVE_API_URL;
const token = process.env.CUSTOMCARD_LIVE_API_TOKEN ?? "test-customer-session-token";

const maybe = baseUrl ? describe : describe.skip;

maybe("live API contract", () => {
  const api = createCustomCardApi(
    createHttpClient({
      baseUrl: baseUrl as string,
      getToken: async () => token
    })
  );

  it("returns a healthy service from /api/health", async () => {
    const health = await api.getHealth();
    expect(health.service).toBe("customcard-api");
    expect(typeof health.realOrdersEnabled).toBe("boolean");
  });

  it("loads the mobile bootstrap with the fields the app renders", async () => {
    const data = await api.getMobileBootstrap("ios");
    expect(data.safetyBanner.label).toBeTruthy();
    expect(Array.isArray(data.queueItems)).toBe(true);
    expect(Array.isArray(data.printProofChecks)).toBe(true);
    expect(Array.isArray(data.localeOptions)).toBe(true);
    expect(data.proofBoundary).toMatchObject({ proofApproved: expect.any(Boolean) });
  });

  it("walks import -> memory -> project -> render packet against the real server", async () => {
    const preview = await api.importPreview({
      sourceKind: "manual-paste",
      metadataOnlyPayload: {
        title: "Live test dinner",
        recipientName: "Live Tester",
        startsAt: "2026-08-01T18:00:00.000Z"
      }
    });
    expect(preview.opportunities.length).toBeGreaterThan(0);
    const opportunity = preview.opportunities[0];

    const memory = await api.reviewMemory({
      recipientName: opportunity.recipientName,
      text: "Enjoys long-distance trail running",
      decision: "approve"
    });
    expect(memory.approved).toBe(true);

    const project = await api.createCardProject({
      opportunityId: opportunity.opportunityId,
      recipientName: opportunity.recipientName,
      approvedMemoryIds: [memory.memoryId]
    });
    expect(project.projectId).toBeTruthy();

    const packet = await api.createRenderPacket(project.projectId);
    expect(packet.renderPacketId).toBeTruthy();
    expect(packet.artifactManifest.projectId).toBe(project.projectId);
  });

  it("returns featured cards from the public route", async () => {
    const featured = await api.getFeaturedCards();
    expect(featured.service).toBe("customcard-api");
    expect(Array.isArray(featured.categories)).toBe(true);
  });
});
