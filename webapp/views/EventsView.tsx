import { CalendarCheck, CalendarDays, FileText, Inbox, LockKeyhole } from "lucide-react";
import { useState } from "react";
import type { CardOpportunity, FreeImportSignal } from "../../src/freeMvp";
import type { CalendarConnectionStartPacket } from "../../src/onboardingCalendar";
import { sampleInviteText } from "../../src/freeMvp";

const urgencyLabels: Record<CardOpportunity["urgency"], { label: string; tone: "warn" | "ok" | "soft" }> = {
  "same-day": { label: "Needs same-day printing", tone: "warn" },
  "this-week": { label: "Coming up this week", tone: "ok" },
  planned: { label: "Plenty of time", tone: "soft" },
  "needs-date": { label: "Date needed", tone: "warn" }
};

export function EventsView({
  calendarConnectionStartPackets,
  getCustomerApiToken,
  inviteText,
  signal,
  opportunity,
  onInviteText,
  onAccept,
  onDismiss
}: {
  calendarConnectionStartPackets: CalendarConnectionStartPacket[];
  getCustomerApiToken?: () => Promise<string | undefined>;
  inviteText: string;
  signal: FreeImportSignal;
  opportunity: CardOpportunity;
  onInviteText: (text: string) => void;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const hasImport = inviteText.trim().length > 0;
  const urgency = urgencyLabels[opportunity.urgency];
  const googlePacket = calendarConnectionStartPackets.find((packet) => packet.id === "google-calendar-events");
  const [connectionStatus, setConnectionStatus] = useState<{
    tone: "ok" | "warn";
    title: string;
    detail: string;
  } | null>(null);

  function focusImportBox() {
    document.querySelector<HTMLTextAreaElement>(".importcard textarea")?.focus();
  }

  async function startCalendarConnection() {
    setConnectionStatus({ tone: "warn", title: "Checking Google Calendar", detail: "Asking the server what is ready for this account." });
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
          returnTo: typeof window === "undefined" ? "/" : window.location.href
        })
      });
      const payload = await response.json().catch(() => undefined) as {
        status?: string;
        detail?: string;
        blockers?: string[];
        missingEnv?: string[];
        nextApiRoute?: string | null;
        providerRequestUrl?: string | null;
        startPacket?: CalendarConnectionStartPacket;
      } | undefined;

      if (!response.ok) {
        setConnectionStatus({
          tone: "warn",
          title: response.status === 401 ? "Sign in required" : "Connection not ready",
          detail:
            payload?.detail ??
            (response.status === 401
              ? "Sign in before connecting Google Calendar."
              : "The calendar connection route is not ready yet.")
        });
        return;
      }

      if (payload?.providerRequestUrl) {
        setConnectionStatus({
          tone: "ok",
          title: "Opening Google Calendar",
          detail: "Redirecting to Google for read-only calendar consent."
        });
        window.location.assign(payload.providerRequestUrl);
        return;
      }

      const packet = payload?.startPacket;
      if (payload?.status === "ready-local" && payload.nextApiRoute) {
        setConnectionStatus({
          tone: "ok",
          title: "Ready to import",
          detail: `The next server route is ${payload.nextApiRoute}.`
        });
        return;
      }

      setConnectionStatus({
        tone: "warn",
        title: "Google Calendar needs setup",
        detail:
          (payload?.missingEnv?.length ? `Missing env: ${payload.missingEnv.join(", ")}.` : undefined) ??
          packet?.blockedReason ??
          payload?.blockers?.join(", ") ??
          "OAuth scope review, redirect URI, token storage, and revocation proof are required before live connection."
      });
    } catch {
      setConnectionStatus({
        tone: "warn",
        title: "Connection check failed",
        detail: "The calendar connection route could not be reached. Paste an invite or ICS for now."
      });
    }
  }

  return (
    <>
      <header className="pagehead reveal">
        <h1>Never miss a moment</h1>
        <p>Paste an invite, calendar event, or a quick note — we&rsquo;ll turn it into a card to send.</p>
      </header>

      <section className="sourcechoices reveal reveal-1" aria-label="Calendar source choices">
        <button className="sourcechoice sourcechoice-ready" onClick={focusImportBox} type="button">
          <span className="sourceicon">
            <FileText size={18} />
          </span>
          <span>
            <strong>Paste invite or ICS</strong>
            <small>Ready now. No account sign-in needed.</small>
          </span>
        </button>
        <button className="sourcechoice" onClick={startCalendarConnection} type="button">
          <span className="sourceicon">
            <CalendarCheck size={18} />
          </span>
          <span>
            <strong>Google Calendar</strong>
            <small>{googlePacket?.requiredScopes[0] ?? "calendar.events.readonly"} only. We check server readiness first.</small>
          </span>
        </button>
        <button className="sourcechoice" onClick={focusImportBox} type="button">
          <span className="sourceicon">
            <LockKeyhole size={18} />
          </span>
          <span>
            <strong>Apple Calendar export</strong>
            <small>Export an ICS file, then paste the event here.</small>
          </span>
        </button>
      </section>

      {connectionStatus ? (
        <section className={`sourceStatus sourceStatus-${connectionStatus.tone} reveal`} aria-live="polite">
          <strong>{connectionStatus.title}</strong>
          <span>{connectionStatus.detail}</span>
        </section>
      ) : null}

      <div className="events">
        <section className="panelcard importcard reveal reveal-2">
          <h2>Add an occasion</h2>
          <textarea
            onChange={(event) => onInviteText(event.target.value)}
            placeholder={'Paste an invite email or calendar event — or just type "Mom\'s birthday dinner on July 24".'}
            value={inviteText}
          />
          <div className="importactions">
            <button className="textlink" onClick={() => onInviteText(sampleInviteText)} type="button">
              Try an example
            </button>
            {hasImport ? (
              <button className="textlink" onClick={() => onInviteText("")} type="button">
                Clear
              </button>
            ) : null}
          </div>
          <p className="importhint">Works with email invites, .ics calendar exports, and plain notes.</p>
        </section>

        {hasImport ? (
          <section className="panelcard oppcard reveal reveal-3">
            <div className="opp-tags">
              <span className={`tag tag-${urgency.tone}`}>{urgency.label}</span>
              {opportunity.status === "needs-more-detail" ? (
                <span className="tag tag-soft">A few details missing</span>
              ) : null}
            </div>
            <h2>{opportunity.title}</h2>
            <div className="opp-date">
              <CalendarDays size={17} />
              {opportunity.dateLabel}
              {signal.location ? ` · ${signal.location}` : ""}
            </div>
            <details className="opp-evidence">
              <summary>What we picked up</summary>
              <ul>
                {opportunity.evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
            <div className="opp-actions">
              <button className="btn btn-primary" onClick={onAccept} type="button">
                Start this card
              </button>
              <button className="btn btn-ghost" onClick={onDismiss} type="button">
                Not now
              </button>
            </div>
          </section>
        ) : (
          <section className="panelcard emptyopp reveal reveal-3">
            <Inbox size={28} />
            <strong>Nothing here yet</strong>
            <span>Paste something on the left and the occasion appears here, ready to become a card.</span>
          </section>
        )}
      </div>
    </>
  );
}
