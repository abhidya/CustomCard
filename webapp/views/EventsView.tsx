import { CalendarCheck, CalendarDays } from "lucide-react";
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

/**
 * Occasion import. Google Calendar is the primary path; pasting an invite is
 * the manual fallback; Apple/iCloud is a footnote with export instructions.
 */
export function ImportSection({
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
  const [connectionStatus, setConnectionStatus] = useState<CalendarConnectionStatus | null>(null);
  const [appleHelpOpen, setAppleHelpOpen] = useState(false);

  async function startCalendarConnection() {
    setConnectionStatus({ tone: "warn", title: "Checking Google Calendar", detail: "One moment — confirming the connection is ready." });
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
    <div className="importFlow">
      <div className="importPrimary reveal reveal-1">
        <button className="btn btn-primary" onClick={startCalendarConnection} type="button">
          <CalendarCheck size={16} />
          Connect Google Calendar
        </button>
        <span className="importPrimaryNote">
          Reads event titles and dates only — birthdays and anniversaries become card reminders.
        </span>
      </div>

      {connectionStatus ? (
        <section className={`sourceStatus sourceStatus-${connectionStatus.tone} reveal`} aria-live="polite">
          <strong>{connectionStatus.title}</strong>
          <span>{connectionStatus.detail}</span>
        </section>
      ) : null}

      <section className="panelcard importcard reveal reveal-2">
        <h2>Or paste it in</h2>
        <textarea
          onChange={(event) => onInviteText(event.target.value)}
          placeholder={'An invite email, a calendar event — or just "Mom\'s birthday dinner on July 24".'}
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
          <button className="textlink" onClick={() => setAppleHelpOpen((open) => !open)} type="button">
            Using Apple Calendar?
          </button>
        </div>
        {appleHelpOpen ? (
          <p className="importhint">
            In Apple Calendar, choose File → Export → Export…, open the saved .ics file in a text editor, and paste its
            contents above. iCloud.com works the same way via the event share menu.
          </p>
        ) : null}

        {hasImport ? (
          <div className="oppInline reveal">
            <div className="opp-tags">
              <span className={`tag tag-${urgency.tone}`}>{urgency.label}</span>
              {opportunity.status === "needs-more-detail" ? (
                <span className="tag tag-soft">A few details missing</span>
              ) : null}
            </div>
            <h3>{opportunity.title}</h3>
            <div className="opp-date">
              <CalendarDays size={17} />
              {opportunity.dateLabel}
              {signal.location ? ` · ${signal.location}` : ""}
            </div>
            <div className="opp-actions">
              <button className="btn btn-primary" onClick={onAccept} type="button">
                Start this card
              </button>
              <button className="btn btn-ghost" onClick={onDismiss} type="button">
                Not now
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

/** Standalone route (?view=opportunities) — kept for deep links and calendar redirects. */
export function EventsView(props: ImportSectionProps) {
  return (
    <>
      <header className="pagehead reveal">
        <h1>Never miss a moment</h1>
        <p>Connect your calendar or paste an invite — we&rsquo;ll turn it into a card to send.</p>
      </header>
      <ImportSection {...props} />
    </>
  );
}
