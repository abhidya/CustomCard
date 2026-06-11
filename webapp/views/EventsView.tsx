import { CalendarDays, Inbox } from "lucide-react";
import type { CardOpportunity, FreeImportSignal } from "../../src/freeMvp";
import { sampleInviteText } from "../../src/freeMvp";

const urgencyLabels: Record<CardOpportunity["urgency"], { label: string; tone: "warn" | "ok" | "soft" }> = {
  "same-day": { label: "Needs same-day printing", tone: "warn" },
  "this-week": { label: "Coming up this week", tone: "ok" },
  planned: { label: "Plenty of time", tone: "soft" },
  "needs-date": { label: "Date needed", tone: "warn" }
};

export function EventsView({
  inviteText,
  signal,
  opportunity,
  onInviteText,
  onAccept,
  onDismiss
}: {
  inviteText: string;
  signal: FreeImportSignal;
  opportunity: CardOpportunity;
  onInviteText: (text: string) => void;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const hasImport = inviteText.trim().length > 0;
  const urgency = urgencyLabels[opportunity.urgency];

  return (
    <>
      <header className="pagehead reveal">
        <h1>Never miss a moment</h1>
        <p>Paste an invite, calendar event, or a quick note — we&rsquo;ll turn it into a card to send.</p>
      </header>

      <div className="events">
        <section className="panelcard importcard reveal reveal-1">
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
          <section className="panelcard oppcard reveal reveal-2">
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
          <section className="panelcard emptyopp reveal reveal-2">
            <Inbox size={28} />
            <strong>Nothing here yet</strong>
            <span>Paste something on the left and the occasion appears here, ready to become a card.</span>
          </section>
        )}
      </div>
    </>
  );
}
