import type { CalendarConnectionStartPacket } from "../src/onboardingCalendar";
import { getBrowserJson, postBrowserJson } from "../src/browserRequestAdapter";

export interface CalendarConnectionStatus {
  tone: "ok" | "warn";
  title: string;
  detail: string;
}

export interface CalendarConnectionStartPayload {
  status?: string;
  detail?: string;
  blockers?: string[];
  missingEnv?: string[];
  nextApiRoute?: string | null;
  providerRequestUrl?: string | null;
  startPacket?: CalendarConnectionStartPacket;
  alreadyConnected?: boolean;
  scanned?: boolean;
  needsReconnect?: boolean;
  importedEventCount?: number;
  opportunityCount?: number;
  tokenSource?: "clerk";
}

export interface CalendarConnectionResult {
  status: CalendarConnectionStatus;
  providerRequestUrl?: string;
  alreadyConnected?: boolean;
  scanned?: boolean;
  needsReconnect?: boolean;
}

export type CustomerConnectionStatus = "connected" | "needs_reconnect" | "revoked" | "not_connected";

export interface CustomerConnection {
  provider: "google_calendar";
  status: CustomerConnectionStatus;
  scopes: string[];
  connectedAtIso?: string;
  lastImportedAtIso?: string;
  importedEventCount?: number;
  opportunityCount?: number;
  credentialStorageEnabled: boolean;
  credentialSource?: "clerk" | "custom_oauth";
  rawContentStored: false;
  canScanAgain: boolean;
  reconnectReason?: string;
}

export interface ImportedOpportunity {
  opportunityId: string;
  eventId: string;
  recipientName: string;
  title: string;
  startsAt: string;
  timezone: string;
  sourceEvidence?: string;
  confidence: number;
  decision: string;
}

export interface CustomerConnectionsPayload {
  connections?: CustomerConnection[];
  opportunities?: ImportedOpportunity[];
}

export interface StartGoogleCalendarConnectionInput {
  getCustomerApiToken?: () => Promise<string | undefined>;
  returnTo: string;
  isSignedIn?: boolean;
  mode?: "connect" | "scan" | "reconnect";
}

export async function fetchCustomerConnections(
  getCustomerApiToken?: () => Promise<string | undefined>
): Promise<{ connection?: CustomerConnection; opportunities: ImportedOpportunity[] } | undefined> {
  try {
    const payload = await getBrowserJson<CustomerConnectionsPayload>("/api/customer/connections", {
      getToken: getCustomerApiToken,
      requireToken: true
    });
    return {
      connection: payload?.connections?.find((candidate) => candidate.provider === "google_calendar"),
      opportunities: payload?.opportunities ?? []
    };
  } catch {
    return undefined;
  }
}

export async function startGoogleCalendarConnection({
  getCustomerApiToken,
  returnTo,
  isSignedIn,
  mode = "connect"
}: StartGoogleCalendarConnectionInput): Promise<CalendarConnectionResult> {
  try {
    const { payload, response } = await postBrowserJson<CalendarConnectionStartPayload>(
      "/api/calendar/connections/start",
      {
        calendarChoiceId: "google-calendar-events",
        returnTo,
        mode,
        ...(mode === "reconnect" ? { forceReconnect: true } : {})
      },
      {
        getToken: getCustomerApiToken,
        idempotencyKey: `calendar-google-${Date.now()}`
      }
    );
    return resolveCalendarConnectionResult(response.ok, response.status, payload, { isSignedIn });
  } catch {
    return {
      status: {
        tone: "warn",
        title: "Connection check failed",
        detail: "The calendar connection route could not be reached. Paste an invite or ICS for now."
      }
    };
  }
}

export function resolveCalendarConnectionResult(
  ok: boolean,
  statusCode: number,
  payload: CalendarConnectionStartPayload | undefined,
  { isSignedIn }: { isSignedIn?: boolean } = {}
): CalendarConnectionResult {
  if (!ok) {
    if (payload?.status === "clerk-google-calendar-token-unavailable") {
      const calendarScopeMissing = String(payload.detail ?? "")
        .toLowerCase()
        .includes("calendar events readonly scope");
      return {
        status: {
          tone: "warn",
          title: calendarScopeMissing ? "Calendar permission missing" : "Google sign-in token unavailable",
          detail: calendarScopeMissing
            ? "Add the Google Calendar events readonly scope in Clerk, then sign out and back in with Google to grant it."
            : payload?.detail ?? "Clerk could not provide a Google token for Calendar."
        }
      };
    }
    if (statusCode === 401 && isSignedIn) {
      // The browser session is real but the API session is stale — this is not
      // a sign-in problem, so never tell a signed-in person to sign in again.
      return {
        status: {
          tone: "warn",
          title: "Refresh your account session",
          detail:
            payload?.detail ??
            "Your account session needs a quick refresh. Try again in a moment; if it keeps happening, sign out and back in once."
        }
      };
    }
    return {
      status: {
        tone: "warn",
        title: statusCode === 401 ? "Sign in required" : "Connection not ready",
        detail:
          payload?.detail ??
          (statusCode === 401
            ? "Sign in before connecting Google Calendar."
            : "Calendar connection isn't available right now. Paste an invite instead — it works the same way.")
      }
    };
  }

  if (payload?.status === "google-calendar-already-connected" || payload?.alreadyConnected) {
    return {
      alreadyConnected: true,
      status: {
        tone: "ok",
        title: "Google Calendar connected",
        detail: "Your calendar is already connected — no need to connect again."
      }
    };
  }

  if (payload?.status === "google-calendar-scan-complete" || payload?.scanned) {
    const imported = payload?.importedEventCount ?? 0;
    return {
      scanned: true,
      status: {
        tone: "ok",
        title: "Calendar scanned",
        detail:
          imported > 0
            ? `Found ${imported} upcoming event${imported === 1 ? "" : "s"} to review.`
            : "No new card-worthy events found this time."
      }
    };
  }

  if (payload?.status === "google-calendar-connected") {
    const imported = payload?.importedEventCount ?? 0;
    return {
      scanned: true,
      status: {
        tone: "ok",
        title: "Google Calendar connected",
        detail:
          imported > 0
            ? `Found ${imported} upcoming event${imported === 1 ? "" : "s"} to review.`
            : "Connected, but no new card-worthy events were found this time."
      }
    };
  }

  if (payload?.status === "google-calendar-needs-reconnect" || payload?.needsReconnect) {
    return {
      needsReconnect: true,
      status: {
        tone: "warn",
        title: "Reconnect Google Calendar",
        detail: "Your calendar connection needs to be refreshed before scanning again."
      }
    };
  }

  if (payload?.providerRequestUrl) {
    return {
      providerRequestUrl: payload.providerRequestUrl,
      status: {
        tone: "ok",
        title: "Opening Google Calendar",
        detail: "Redirecting to Google for read-only calendar consent."
      }
    };
  }

  if (payload?.status === "ready-local" && payload.nextApiRoute) {
    return {
      status: {
        tone: "ok",
        title: "Ready to import",
        detail: "Scan your calendar to bring in upcoming events."
      }
    };
  }

  return {
    status: {
      tone: "warn",
      title: "Calendar connection unavailable",
      detail: "Calendar connection isn't available right now. Paste an invite instead — it works the same way."
    }
  };
}
