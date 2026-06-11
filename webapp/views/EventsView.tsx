import { CalendarCheck, CalendarDays, FileText, Inbox, LockKeyhole } from "lucide-react";
import { useState } from "react";
import type { CardOpportunity, FreeImportSignal } from "../../src/freeMvp";
import type { CalendarConnectionStartPacket } from "../../src/onboardingCalendar";
import { sampleInviteText } from "../../src/freeMvp";
import {
  startGoogleCalendarConnection,
  type CalendarConnectionStatus
} from "../calendarConnectionAdapter";

const urgencyLabels: Record<CardOpportunity["urgency"], { label: string; tone: "warn" | "ok" | "soft" }> = {
  "same-day": { label: "Needs same-day printing", tone: "warn" },
  "this-week": { label: "Coming up this week", tone: "ok" },
  planned: { label: "Plenty of time", tone: "soft" },
  "needs-date": { label: "Date needed", tone: "warn" }
};

export interface ImportSectionProps {
  calendarConnectionStartPackets: CalendarConnectionStartPacket[];
  getCustomerApiToken?: () => Promise<string | undefined>;
  inviteText: string;
  signal: FreeImportSignal;
  opportunity: CardOpportunity;
  onInviteText: (text: string) => void;
  onAccept: () => void;
  onDismiss: () => void;
}

/** Invite/calendar import: source choices, paste box, and the parsed occasion. */
export function ImportSection({
  calendarConnectionStartPackets,
  getCustomerApiToken,
  inviteText,
  signal,
  opportunity,
  onInviteText,
  onAccept,
  onDismiss
}: ImportSectionProps) {
  const hasImport = inviteText.trim().length > 0;
  const urgency = urgencyLabels[opportunity.urgency];
  const googlePacket = calendarConnectionStartPackets.find((packet) => packet.id === "google-calendar-events");
  const [connectionStatus, setConnectionStatus] = useState<CalendarConnectionStatus | null>(null);

  function focusImportBox() {
    document.querySelector<HTMLTextAreaElement>(".importcard textarea")?.focus();
  }

  async function startCalendarConnection() {
    setConnectionStatus({ tone: "warn", title: "Checking Google Calendar", detail: "Asking the server what is ready for this account." });
    const result = await startGoogleCalendarConnection({
      getCustomerApiToken,
      returnTo: typeof window === "undefined" ? "/" : window.location.href
    });
    setConnectionStatus(result.status);
    if (result.providerRequestUrl) {
      window.location.assign(result.providerRequestUrl);
    }
  }

  return (
    <>
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

/** Standalone route (?view=opportunities) — kept for deep links and calendar redirects. */
export function EventsView(props: ImportSectionProps) {
  return (
    <>
      <header className="pagehead reveal">
        <h1>Never miss a moment</h1>
        <p>Paste an invite, calendar event, or a quick note — we&rsquo;ll turn it into a card to send.</p>
      </header>
      <ImportSection {...props} />
    </>
  );
}
