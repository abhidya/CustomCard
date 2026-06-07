import { describe, expect, it } from "vitest";
import { providerCatalog } from "./providerCatalog";
import {
  buildCalendarOnboardingChoices,
  buildOnboardingPlan,
  calendarAdapterReadinessContracts,
  evaluateCalendarAdapterReadiness,
  onboardingStages,
  onboardingUserStories
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
});
