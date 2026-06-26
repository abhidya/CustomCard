import { describe, expect, it } from "vitest";
import {
  buildCalendarConnectionStartPayload,
  buildImportPreviewContractPayload,
  encryptTokenSecret,
  resolveCalendarConnectionLifecycle
} from "../scripts/opportunity-intake-runtime.mjs";

const googleEnv = {
  GOOGLE_OAUTH_CLIENT_ID: "test-google-calendar-client.apps.googleusercontent.com",
  GOOGLE_OAUTH_CLIENT_SECRET: "test-google-calendar-secret",
  GOOGLE_OAUTH_REDIRECT_URI: "http://localhost:4173/oauth/callback",
  GOOGLE_OAUTH_STATE_SECRET: "test-google-oauth-state-secret-32-chars",
  GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY: "test-google-oauth-token-key-32-chars",
  GOOGLE_OAUTH_TOKEN_ENDPOINT: "https://oauth.test/token",
  GOOGLE_CALENDAR_EVENTS_ENDPOINT: "https://calendar.test/calendar/v3/calendars/primary/events"
};

describe("opportunity intake runtime", () => {
  it("builds import preview payloads from metadata without raw content persistence", () => {
    const payload = buildImportPreviewContractPayload({
      basePayload: { service: "customcard-api", route: "import-preview" },
      requestBody: {
        sourceKind: "manual-invite",
        metadataOnlyPayload: {
          title: "Birthday dinner for Sara",
          recipientName: "Sara",
          startsAt: "2030-03-04T18:30:00.000Z",
          timezone: "America/New_York"
        }
      }
    });

    expect(payload).toMatchObject({
      service: "customcard-api",
      route: "import-preview",
      rawContentStored: false,
      importParser: { rawContentStored: false },
      opportunities: [
        {
          recipientName: "Sara",
          title: "Birthday dinner for Sara",
          startsAt: "2030-03-04T18:30:00.000Z",
          timezone: "America/New_York"
        }
      ],
      repository: {
        tables: ["provider_connections", "imported_events", "card_opportunities"],
        persisted: false,
        rawContentStored: false
      }
    });
  });

  it("prepares Google OAuth start without exposing provider credentials", () => {
    const payload = buildCalendarConnectionStartPayload({
      basePayload: { service: "customcard-api", route: "calendar-connection-start" },
      requestBody: {
        calendarChoiceId: "google-calendar-events",
        returnTo: "/?view=opportunities"
      },
      authContext: { role: "customer", userId: "user-demo", sessionId: "session-demo" },
      env: googleEnv,
      requestUrl: new URL("http://localhost:4173/api/calendar/connections/start")
    });

    expect(payload).toMatchObject({
      status: "oauth-ready",
      requestedChoiceId: "google-calendar-events",
      networkRequestPrepared: true,
      externalNetworkCalls: true,
      credentialStorageEnabled: false,
      oauth: {
        provider: "google-calendar",
        redirectUri: "http://localhost:4173/oauth/callback",
        returnTo: "http://localhost:4173/?view=opportunities",
        scopes: ["https://www.googleapis.com/auth/calendar.events.readonly"],
        credentialStorageEnabled: false,
        rawContentStored: false
      }
    });
    expect(payload.providerRequestUrl).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(payload.providerRequestUrl).toContain("client_id=test-google-calendar-client.apps.googleusercontent.com");
  });

  it("scans connected Google Calendar metadata through one lifecycle interface", async () => {
    const encryptedRefreshToken = encryptTokenSecret("fake-google-refresh-token", googleEnv);
    const persistedRecords: unknown[] = [];
    const fetches: Array<{ url: string; body?: string }> = [];
    const apiRuntime = {
      async readProviderConnection() {
        return {
          status: "connected",
          encryptedRefreshToken,
          scopes: ["https://www.googleapis.com/auth/calendar.events.readonly"]
        };
      },
      async persistGoogleCalendarImport({ record }: { record: unknown }) {
        persistedRecords.push(record);
        return { payload: { repository: { persisted: true, runtimeMode: "postgres" } } };
      }
    };

    const result = await resolveCalendarConnectionLifecycle({
      authContext: { role: "customer", userId: "user-demo", sessionId: "session-demo" },
      bodyText: JSON.stringify({ calendarChoiceId: "google-calendar-events", mode: "scan" }),
      apiRuntime,
      env: googleEnv,
      fetchImpl: async (url: string, init?: { body?: URLSearchParams }) => {
        fetches.push({ url: String(url), body: init?.body?.toString() });
        if (String(url).includes("/token")) {
          return jsonResponse({
            access_token: "fake-google-access-token",
            scope: "https://www.googleapis.com/auth/calendar.events.readonly"
          });
        }
        return jsonResponse({
          items: [
            {
              id: "google-event-1",
              summary: "Sara's birthday dinner",
              start: { dateTime: "2030-03-04T18:30:00-05:00", timeZone: "America/New_York" },
              end: { timeZone: "America/New_York" }
            }
          ]
        });
      }
    });

    expect(result).toMatchObject({
      handled: true,
      statusCode: 200,
      payload: {
        status: "google-calendar-scan-complete",
        importedEventCount: 1,
        opportunityCount: 1,
        credentialStorageEnabled: true,
        rawContentStored: false
      }
    });
    expect(fetches[0].body).toContain("refresh_token=fake-google-refresh-token");
    expect(fetches[1].url).toContain("fields=items");
    expect(JSON.stringify(persistedRecords)).not.toContain("fake-google-refresh-token");
    expect(JSON.stringify(persistedRecords)).toContain("Sara");
  });
});

function jsonResponse(payload: unknown) {
  return {
    ok: true,
    async json() {
      return payload;
    }
  };
}
