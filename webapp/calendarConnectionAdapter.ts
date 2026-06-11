import type { CalendarConnectionStartPacket } from "../src/onboardingCalendar";

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
}

export interface CalendarConnectionResult {
  status: CalendarConnectionStatus;
  providerRequestUrl?: string;
}

export interface StartGoogleCalendarConnectionInput {
  getCustomerApiToken?: () => Promise<string | undefined>;
  returnTo: string;
}

export async function startGoogleCalendarConnection({
  getCustomerApiToken,
  returnTo
}: StartGoogleCalendarConnectionInput): Promise<CalendarConnectionResult> {
  try {
    const token = await getCustomerApiToken?.();
    const response = await fetch("/api/calendar/connections/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Idempotency-Key": `calendar-google-${Date.now()}`,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        calendarChoiceId: "google-calendar-events",
        returnTo
      })
    });
    const payload = await response.json().catch(() => undefined) as CalendarConnectionStartPayload | undefined;
    return resolveCalendarConnectionResult(response.ok, response.status, payload);
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
  payload: CalendarConnectionStartPayload | undefined
): CalendarConnectionResult {
  if (!ok) {
    return {
      status: {
        tone: "warn",
        title: statusCode === 401 ? "Sign in required" : "Connection not ready",
        detail:
          payload?.detail ??
          (statusCode === 401
            ? "Sign in before connecting Google Calendar."
            : "The calendar connection route is not ready yet.")
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
        detail: `The next server route is ${payload.nextApiRoute}.`
      }
    };
  }

  return {
    status: {
      tone: "warn",
      title: "Google Calendar needs setup",
      detail:
        (payload?.missingEnv?.length ? `Missing env: ${payload.missingEnv.join(", ")}.` : undefined) ??
        payload?.startPacket?.blockedReason ??
        payload?.blockers?.join(", ") ??
        "OAuth scope review, redirect URI, token storage, and revocation proof are required before live connection."
    }
  };
}
