import { describe, expect, it } from "vitest";
import { providerCatalog } from "./providerCatalog";
import {
  buildCalendarConnectionStartPackets,
  buildCalendarConnectionStartResponse,
  buildCalendarOnboardingActionPackets,
  buildCalendarOnboardingChoices,
  buildOnboardingPlan,
  calendarAdapterReadinessContracts,
  evaluateCalendarAdapterReadiness,
  onboardingStages,
  onboardingUserStories,
  summarizeCalendarOnboardingEvidence,
  validateCalendarConnectionStartPackets,
  validateCalendarOnboardingActionPackets
} from "./onboardingCalendar";

describe("onboarding and calendar integration contracts", () => {
  it("defines production-shaped user stories for onboarding and popular calendars", () => {
    expect(onboardingUserStories.map((story) => story.id)).toEqual(
      expect.arrayContaining([
        "story-google-calendar-proactive-card",
        "story-icloud-export-user",
        "story-last-minute-pickup",
        "story-privacy-first-onboarding",
        "story-recurring-memory"
      ])
    );

    for (const story of onboardingUserStories) {
      expect(story.story).toContain("As ");
      expect(story.acceptanceCriteria.length).toBeGreaterThanOrEqual(3);
      expect(story.nonGoals.length).toBeGreaterThan(0);
      expect(story.onboardingStageIds.length).toBeGreaterThan(0);
      expect(story.onboardingStageIds.every((stageId) => onboardingStages.some((stage) => stage.id === stageId))).toBe(
        true
      );
    }
  });

  it("orders onboarding around consent, review, memory approval, and handoff gates", () => {
    const plan = buildOnboardingPlan();
    const stageIds = plan.stages.map((stage) => stage.id);

    expect(stageIds.indexOf("calendar-choice")).toBeLessThan(stageIds.indexOf("consent-preview"));
    expect(stageIds.indexOf("consent-preview")).toBeLessThan(stageIds.indexOf("import-preview"));
    expect(stageIds.indexOf("import-preview")).toBeLessThan(stageIds.indexOf("opportunity-review"));
    expect(stageIds.indexOf("opportunity-review")).toBeLessThan(stageIds.indexOf("card-setup"));
    expect(stageIds).toContain("memory-consent");
    expect(stageIds).toContain("handoff-readiness");
    expect(plan.productionGuardrails).toEqual(
      expect.arrayContaining([
        "No fake live OAuth URLs or provider callbacks are exposed by the onboarding contracts.",
        "Manual invite and ICS paste remain the free fallback for every onboarding path."
      ])
    );

    expect(onboardingStages.find((stage) => stage.id === "account-baseline")?.productionNotes.join(" ")).not.toContain(
      "MVP"
    );
    expect(onboardingStages.find((stage) => stage.id === "handoff-readiness")).toMatchObject({
      title: "Review print options",
      requiredDecision: "Choose manual download, local printer, or future certified retail checkout."
    });
  });

  it("keeps Google Calendar and iCloud contracts aligned to the provider catalog", () => {
    for (const contract of calendarAdapterReadinessContracts) {
      const catalogAdapter = providerCatalog.find((adapter) => adapter.id === contract.catalogAdapterId);

      expect(catalogAdapter, contract.id).toBeDefined();
      expect(catalogAdapter?.capability).toBe("event-import");
      expect(catalogAdapter?.status).toBe(contract.launchStatus);
      expect(contract.rawContentAllowed).toBe(false);
      expect(contract.liveOAuthEnabled).toBe(false);
      expect(contract.storesProviderCredentials).toBe(false);
      expect(contract.networkRequestFactory).toBe("not-implemented");
    }
  });

  it("guards Google Calendar as credential-gated OAuth readiness without a live OAuth implementation", () => {
    const google = calendarAdapterReadinessContracts.find((adapter) => adapter.id === "google-calendar-events");
    expect(google).toBeDefined();
    expect(google?.mode).toBe("oauth-readiness-contract");
    expect(google?.requiredEnv).toEqual(["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"]);
    expect(google?.requiredScopes).toEqual(["calendar.events.readonly"]);
    expect(google?.officialScopeUris).toEqual(["https://www.googleapis.com/auth/calendar.events.readonly"]);

    const readiness = evaluateCalendarAdapterReadiness(google!, ["Metadata schema validation", "Revocation handling"]);

    expect(readiness.readyForLiveUse).toBe(false);
    expect(readiness.contractReady).toBe(true);
    expect(readiness.missingGates).toEqual(
      expect.arrayContaining(["OAuth consent required", "Calendar scope consent", "No raw content storage"])
    );
    expect(readiness.blockedReasons).toContain("No live OAuth consent flow is implemented in this repository state.");
  });

  it("keeps iCloud as manual ICS export without Apple credential storage or fake OAuth", () => {
    const icloud = calendarAdapterReadinessContracts.find((adapter) => adapter.id === "icloud-ics-fallback");
    expect(icloud).toBeDefined();
    expect(icloud?.mode).toBe("manual-export-contract");
    expect(icloud?.requiredEnv).toEqual([]);
    expect(icloud?.requiredScopes).toEqual([]);
    expect(icloud?.officialScopeUris).toEqual([]);
    expect(icloud?.fallbackImportPath).toContain("ICS");

    const readiness = evaluateCalendarAdapterReadiness(icloud!, icloud!.safetyGates);

    expect(readiness.readyForLiveUse).toBe(false);
    expect(readiness.contractReady).toBe(true);
    expect(readiness.missingGates).toEqual([]);
    expect(readiness.blockedReasons).toContain("Live iCloud CalDAV/native sync is intentionally not implemented.");
  });

  it("builds customer-safe onboarding choices with local paste first and provider integrations gated", () => {
    const choices = buildCalendarOnboardingChoices();

    expect(choices.map((choice) => choice.id)).toEqual([
      "manual-invite-or-ics",
      "google-calendar-events",
      "icloud-ics-fallback"
    ]);
    expect(choices[0]).toMatchObject({
      label: "Paste invite or ICS",
      status: "ready-local",
      canStartNow: true,
      liveOAuthEnabled: false,
      sourceMode: "local-paste",
      requiredScopes: [],
      officialScopeUris: []
    });
    expect(choices[1]).toMatchObject({
      label: "Google Calendar connection",
      status: "credential-gated",
      canStartNow: false,
      liveOAuthEnabled: false,
      sourceMode: "oauth-readiness",
      actionLabel: "Requires OAuth setup",
      officialScopeUris: ["https://www.googleapis.com/auth/calendar.events.readonly"]
    });
    expect(choices[2]).toMatchObject({
      label: "Apple Calendar ICS export",
      status: "manual-export",
      canStartNow: true,
      liveOAuthEnabled: false,
      sourceMode: "manual-export",
      actionLabel: "Export ICS, then paste"
    });
    expect(choices.every((choice) => choice.credentialBoundary.length > 0 && choice.dataBoundary.length > 0)).toBe(true);
    expect(choices.filter((choice) => choice.liveOAuthEnabled).length).toBe(0);
  });

  it("builds explicit action packets for local, Google, and Apple calendar onboarding", () => {
    const packets = buildCalendarOnboardingActionPackets();

    expect(packets.map((packet) => packet.id)).toEqual([
      "manual-invite-or-ics",
      "google-calendar-events",
      "icloud-ics-fallback"
    ]);
    expect(packets.every((packet) => packet.networkRequestPrepared === false)).toBe(true);
    expect(packets.every((packet) => packet.credentialStorageEnabled === false)).toBe(true);
    expect(packets.every((packet) => packet.providerRequestUrl === null)).toBe(true);
    expect(validateCalendarOnboardingActionPackets(packets)).toEqual([]);

    const manual = packets.find((packet) => packet.id === "manual-invite-or-ics");
    expect(manual).toMatchObject({
      canStartNow: true,
      sourceMode: "local-paste",
      requiredEnv: [],
      requiredScopes: [],
      officialDocs: [],
      successSignal: "A metadata-only import preview is visible without provider credentials."
    });
    expect(manual?.safetyChecks).toEqual(
      expect.arrayContaining([
        "Treat pasted invite and ICS text as untrusted input.",
        "Require opportunity approval before card creation."
      ])
    );
    expect(manual?.evidenceRequirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "manual-import-preview-visible",
          kind: "import-preview",
          requiredBefore: "opportunity-creation",
          satisfiedInRepo: true,
          blocksLiveConnection: false
        }),
        expect.objectContaining({
          id: "manual-input-parser-untrusted",
          kind: "metadata-schema",
          satisfiedInRepo: true,
          blocksLiveConnection: false
        })
      ])
    );

    const google = packets.find((packet) => packet.id === "google-calendar-events");
    expect(google).toMatchObject({
      canStartNow: false,
      sourceMode: "oauth-readiness",
      requiredEnv: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
      requiredScopes: ["calendar.events.readonly"],
      officialScopeUris: ["https://www.googleapis.com/auth/calendar.events.readonly"],
      officialDocs: ["https://developers.google.com/workspace/calendar/api/auth"],
      fallbackChoiceId: "manual-invite-or-ics",
      blockedReason: "No live OAuth consent flow is implemented in this repository state."
    });
    expect(google?.operatorSteps.map((step) => step.title)).toEqual([
      "Register OAuth app",
      "Prove revocation and token boundary"
    ]);
    expect(google?.evidenceRequirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "google-scope-review",
          owner: "operator",
          kind: "scope-review",
          officialSourceUrl: "https://developers.google.com/workspace/calendar/api/auth",
          satisfiedInRepo: false,
          blocksLiveConnection: true
        }),
        expect.objectContaining({
          id: "google-revocation-proof",
          kind: "revocation",
          satisfiedInRepo: false,
          blocksLiveConnection: true
        }),
        expect.objectContaining({
          id: "google-manual-fallback-visible",
          owner: "customer",
          kind: "fallback",
          satisfiedInRepo: true,
          blocksLiveConnection: false
        })
      ])
    );

    const icloud = packets.find((packet) => packet.id === "icloud-ics-fallback");
    expect(icloud).toMatchObject({
      canStartNow: true,
      sourceMode: "manual-export",
      requiredEnv: [],
      requiredScopes: [],
      officialDocs: [
        "https://support.apple.com/guide/calendar/import-or-export-calendars-icl1023/mac",
        "https://support.apple.com/en-gb/108306"
      ],
      fallbackChoiceId: "manual-invite-or-ics",
      blockedReason: "Live iCloud CalDAV/native sync is intentionally not implemented."
    });
    expect(icloud?.credentialBoundary).toContain("No Apple ID");
    expect(icloud?.operatorSteps[0].evidenceRequired).toEqual(
      expect.arrayContaining(["Credential collection is absent.", "Manual ICS parser tests pass."])
    );
    expect(icloud?.evidenceRequirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "icloud-export-instructions-visible",
          kind: "manual-export",
          officialSourceUrl: "https://support.apple.com/guide/calendar/import-or-export-calendars-icl1023/mac",
          satisfiedInRepo: true,
          blocksLiveConnection: false
        }),
        expect.objectContaining({
          id: "icloud-no-credential-collection",
          kind: "credential-boundary",
          officialSourceUrl: "https://support.apple.com/en-gb/108306",
          satisfiedInRepo: true,
          blocksLiveConnection: false
        })
      ])
    );
  });

  it("summarizes calendar onboarding evidence without claiming live Google readiness", () => {
    const summary = summarizeCalendarOnboardingEvidence();

    expect(summary).toMatchObject({
      total: 10,
      repoSatisfied: 6,
      blocksLiveConnection: 4,
      customerOwned: 2,
      operatorOwned: 3,
      systemOwned: 5,
      providerConnectionRequired: 4,
      opportunityCreationRequired: 4,
      officialSourceCount: 3
    });
    expect(summary.missingRepoEvidenceIds).toEqual([
      "google-scope-review",
      "google-oauth-env-and-redirect",
      "google-revocation-proof",
      "google-metadata-schema-fixture"
    ]);
  });

  it("builds server-owned calendar connection start packets without client provider side effects", () => {
    const startPackets = buildCalendarConnectionStartPackets();

    expect(startPackets.map((packet) => packet.id)).toEqual([
      "manual-invite-or-ics",
      "google-calendar-events",
      "icloud-ics-fallback"
    ]);
    expect(validateCalendarConnectionStartPackets(startPackets)).toEqual([]);
    expect(startPackets.every((packet) => packet.apiRoute === "/api/calendar/connections/start")).toBe(true);
    expect(startPackets.every((packet) => packet.serverOwned)).toBe(true);
    expect(startPackets.every((packet) => packet.clientMayPrepareProviderRequest === false)).toBe(true);
    expect(startPackets.every((packet) => packet.networkRequestPrepared === false)).toBe(true);
    expect(startPackets.every((packet) => packet.credentialStorageEnabled === false)).toBe(true);
    expect(startPackets.every((packet) => packet.providerRequestUrl === null)).toBe(true);
    expect(startPackets.every((packet) => packet.externalNetworkCalls === false && packet.realOrdersEnabled === false)).toBe(true);

    const manual = startPackets.find((packet) => packet.id === "manual-invite-or-ics");
    expect(manual).toMatchObject({
      startMode: "metadata-import",
      canStartNow: true,
      nextApiRoute: "/api/import-preview",
      blockingEvidenceIds: [],
      missingRepoEvidenceIds: []
    });

    const google = startPackets.find((packet) => packet.id === "google-calendar-events");
    expect(google).toMatchObject({
      startMode: "oauth-evidence-required",
      canStartNow: false,
      nextApiRoute: null,
      requiredEnv: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
      requiredScopes: ["calendar.events.readonly"],
      officialScopeUris: ["https://www.googleapis.com/auth/calendar.events.readonly"],
      blockingEvidenceIds: [
        "google-scope-review",
        "google-oauth-env-and-redirect",
        "google-revocation-proof",
        "google-metadata-schema-fixture"
      ],
      missingRepoEvidenceIds: [
        "google-scope-review",
        "google-oauth-env-and-redirect",
        "google-revocation-proof",
        "google-metadata-schema-fixture"
      ]
    });

    const icloud = startPackets.find((packet) => packet.id === "icloud-ics-fallback");
    expect(icloud).toMatchObject({
      startMode: "manual-export-guide",
      canStartNow: true,
      nextApiRoute: "/api/import-preview",
      blockingEvidenceIds: [],
      missingRepoEvidenceIds: []
    });
    expect(icloud?.operatorSteps.map((step) => step.detail).join(" ")).toContain("Apple ID");
  });

  it("returns a safe server response for calendar connection start requests", () => {
    expect(buildCalendarConnectionStartResponse("google-calendar-events")).toMatchObject({
      service: "customcard-api",
      status: "blocked",
      route: "calendar-connection-start",
      requestedChoiceId: "google-calendar-events",
      providerRequestUrl: null,
      networkRequestPrepared: false,
      credentialStorageEnabled: false,
      externalNetworkCalls: false,
      realOrdersEnabled: false,
      rawContentStored: false,
      nextApiRoute: null,
      blockers: [
        "google-scope-review",
        "google-oauth-env-and-redirect",
        "google-revocation-proof",
        "google-metadata-schema-fixture"
      ],
      startPacket: expect.objectContaining({
        id: "google-calendar-events",
        startMode: "oauth-evidence-required",
        serverOwned: true,
        clientMayPrepareProviderRequest: false
      })
    });

    expect(buildCalendarConnectionStartResponse("icloud-ics-fallback")).toMatchObject({
      status: "ready-local",
      nextApiRoute: "/api/import-preview",
      blockers: [],
      startPacket: expect.objectContaining({
        id: "icloud-ics-fallback",
        startMode: "manual-export-guide"
      })
    });
  });

  it("rejects unsafe or under-specified calendar onboarding packets", () => {
    const [manual, google, icloud] = buildCalendarOnboardingActionPackets();

    expect(validateCalendarOnboardingActionPackets([{ ...manual, evidenceRequirements: [] }])).toEqual(
      expect.arrayContaining(["manual-invite-or-ics must define calendar connection evidence requirements."])
    );
    expect(
      validateCalendarOnboardingActionPackets([
        {
          ...google,
          networkRequestPrepared: true as never,
          evidenceRequirements: google.evidenceRequirements.map((requirement) =>
            requirement.id === "google-scope-review" ? { ...requirement, satisfiedInRepo: true } : requirement
          )
        }
      ])
    ).toEqual(
      expect.arrayContaining([
        "google-calendar-events must not prepare live calendar connection side effects.",
        "Google Calendar blocking live-connection requirements must not be marked satisfied in repo."
      ])
    );
    expect(
      validateCalendarOnboardingActionPackets([
        {
          ...icloud,
          evidenceRequirements: icloud.evidenceRequirements.map((requirement) => ({
            ...requirement,
            blocksLiveConnection: true
          }))
        }
      ])
    ).toEqual(expect.arrayContaining(["iCloud manual export path must not block on fake live connection evidence."]));

    expect(
      validateCalendarConnectionStartPackets([
        {
          ...buildCalendarConnectionStartPackets()[1],
          canStartNow: true as never,
          nextApiRoute: "/api/import-preview" as never,
          missingRepoEvidenceIds: []
        }
      ])
    ).toEqual(
      expect.arrayContaining([
        "Google Calendar start packet must stay blocked until OAuth evidence exists.",
        "Google Calendar start packet must expose missing repo evidence before live connection."
      ])
    );
  });

  it("fails fast when a calendar readiness contract is missing instead of hiding a fallback", () => {
    const googleOnly = calendarAdapterReadinessContracts.filter((adapter) => adapter.id === "google-calendar-events");
    const icloudOnly = calendarAdapterReadinessContracts.filter((adapter) => adapter.id === "icloud-ics-fallback");

    expect(() => buildCalendarOnboardingChoices(googleOnly)).toThrow(
      "Missing calendar readiness contract for icloud-ics-fallback."
    );
    expect(() => buildCalendarOnboardingActionPackets(icloudOnly)).toThrow(
      "Missing calendar readiness contract for google-calendar-events."
    );
  });
});
