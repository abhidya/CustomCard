import { CalendarCheck, CalendarClock, CalendarDays, CheckCircle2, RefreshCw, Settings2 } from "lucide-react";
import { SignInButton } from "@clerk/react";
import { useCallback, useEffect, useState } from "react";
import type { CardOpportunity, FreeImportSignal } from "../../src/freeMvp";
import type { CalendarConnectionStartPacket } from "../../src/onboardingCalendar";
// The example mirrors what a real person would paste — never raw calendar wire format.
const exampleInviteText =
  "Sara and Ahmed's 10-year anniversary dinner on July 12, 2026 in Brooklyn. Sara loves botanical cards.";
import {
  fetchCustomerConnections,
  startGoogleCalendarConnection,
  type CalendarConnectionStatus,
  type CustomerConnection,
  type ImportedOpportunity
} from "../calendarConnectionAdapter";
import { buildCalendarMomentDraftContext } from "../calendarMomentDraft";
import { requestServerImportPreview, type ServerImportPreview } from "../importPreviewAdapter";

const urgencyLabels: Record<CardOpportunity["urgency"], { label: string; tone: "warn" | "ok" | "soft" }> = {
  "same-day": { label: "Print in the next day or two", tone: "warn" },
  "this-week": { label: "Coming up this week", tone: "ok" },
  planned: { label: "Plenty of time", tone: "soft" },
  "needs-date": { label: "Date needed", tone: "warn" }
};

export type MomentDecision = "make-card" | "snooze" | "dismiss" | "handled";

export interface ImportSectionProps {
  calendarConnectionStartPackets: CalendarConnectionStartPacket[];
  getCustomerApiToken?: () => Promise<string | undefined>;
  inviteText: string;
  isSignedIn: boolean;
  signal: FreeImportSignal;
  opportunity: CardOpportunity;
  onInviteText: (text: string) => void;
  onAccept: () => void;
  onDismiss: () => void;
  onMomentDecision?: (moment: ImportedOpportunity, decision: MomentDecision) => void;
}

type ConnectionViewState =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "not-connected" }
  | { kind: "connected"; connection: CustomerConnection }
  | { kind: "needs-reconnect"; connection: CustomerConnection };

function resolveConnectionViewState(
  isSignedIn: boolean,
  loaded: boolean,
  connection: CustomerConnection | undefined
): ConnectionViewState {
  if (!isSignedIn) return { kind: "signed-out" };
  if (!loaded) return { kind: "loading" };
  if (!connection || connection.status === "not_connected") return { kind: "not-connected" };
  if (connection.status === "connected") return { kind: "connected", connection };
  return { kind: "needs-reconnect", connection };
}

/**
 * Occasion import. Pasting an invite/note is the lead path — it works for
 * everyone with no permissions. Google Calendar is the optional follow-up for
 * catching future moments; Apple/iCloud stays a footnote with export steps.
 */
export function ImportSection({
  getCustomerApiToken,
  inviteText,
  isSignedIn,
  signal,
  opportunity,
  onInviteText,
  onAccept,
  onDismiss,
  onMomentDecision
}: ImportSectionProps) {
  const hasImport = inviteText.trim().length > 0;
  const urgency = urgencyLabels[opportunity.urgency];
  const [connectionStatus, setConnectionStatus] = useState<CalendarConnectionStatus | null>(null);
  const [appleHelpOpen, setAppleHelpOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [connectionLoaded, setConnectionLoaded] = useState(false);
  const [connection, setConnection] = useState<CustomerConnection | undefined>(undefined);
  const [moments, setMoments] = useState<ImportedOpportunity[]>([]);
  const [momentDecisions, setMomentDecisions] = useState<Record<string, MomentDecision>>({});
  const [serverPreview, setServerPreview] = useState<ServerImportPreview | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const refreshConnections = useCallback(async () => {
    if (!isSignedIn) {
      setConnectionLoaded(true);
      return;
    }
    const result = await fetchCustomerConnections(getCustomerApiToken);
    setConnection(result?.connection);
    setMoments(result?.opportunities ?? []);
    setConnectionLoaded(true);
  }, [getCustomerApiToken, isSignedIn]);

  useEffect(() => {
    void refreshConnections();
  }, [refreshConnections]);

  // Server-backed import preview is the primary parse path when signed in;
  // the local parser remains the offline fallback rendered from `opportunity`.
  useEffect(() => {
    const text = inviteText.trim();
    if (!isSignedIn || text.length < 8) {
      setServerPreview(undefined);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void requestServerImportPreview(getCustomerApiToken, text).then((preview) => {
        if (!cancelled) setServerPreview(preview);
      });
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [getCustomerApiToken, inviteText, isSignedIn]);

  async function runConnectionAction(mode: "connect" | "scan" | "reconnect") {
    setBusy(true);
    setConnectionStatus({
      tone: "ok",
      title: mode === "scan" ? "Scanning your calendar" : "Checking Google Calendar",
      detail: "One moment…"
    });
    const result = await startGoogleCalendarConnection({
      getCustomerApiToken,
      returnTo: typeof window === "undefined" ? "/" : window.location.href,
      isSignedIn,
      mode
    });
    setConnectionStatus(result.status);
    setBusy(false);
    if (result.providerRequestUrl) {
      window.location.assign(result.providerRequestUrl);
      return;
    }
    if (result.scanned || result.alreadyConnected || result.needsReconnect) {
      await refreshConnections();
    }
  }

  function decideMoment(moment: ImportedOpportunity, decision: MomentDecision) {
    setMomentDecisions((current) => ({ ...current, [moment.opportunityId]: decision }));
    onMomentDecision?.(moment, decision);
  }

  function editMoment(moment: ImportedOpportunity) {
    const context = buildCalendarMomentDraftContext(moment);
    const datePart = context.isoDate ? ` on ${context.isoDate}` : "";
    onInviteText(`${context.title}${context.recipient ? ` for ${context.recipient}` : ""}${datePart}`);
  }

  const viewState = resolveConnectionViewState(isSignedIn, connectionLoaded, connection);
  const visibleMoments = moments.filter((moment) => {
    const decision = momentDecisions[moment.opportunityId];
    return decision !== "dismiss" && decision !== "handled";
  });

  const missingDetails = [
    !opportunity.recipient || opportunity.recipient === "Someone important" ? "Recipient" : "",
    opportunity.dateLabel === "Date needed" ? "Date" : "",
    !opportunity.occasion || opportunity.occasion === "card" ? "Occasion" : "",
    "Relationship"
  ].filter(Boolean);
  const lowConfidence = opportunity.status === "needs-more-detail";

  return (
    <div className="importFlow">
      <section className="panelcard importcard reveal reveal-1">
        <h2>Already have the details somewhere?</h2>
        <p className="importLead">
          Paste an invite, calendar event, or messy note. CustomCard will look for the occasion, date, recipient, and
          what kind of card this might be.
        </p>
        <textarea
          onChange={(event) => onInviteText(event.target.value)}
          placeholder={'An invite email, a calendar event — or just "Mom\'s birthday dinner on July 24".'}
          value={inviteText}
        />
        <div className="importactions">
          <button className="textlink" onClick={() => onInviteText(exampleInviteText)} type="button">
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
              {lowConfidence ? <span className="tag tag-soft">A few details missing</span> : null}
              {serverPreview?.parsedFromRawText ? <span className="tag tag-ok">Checked by CustomCard</span> : null}
            </div>
            <h3>
              {lowConfidence ? "Looks like a card moment — we just need one more detail." : "We found a card moment."}
            </h3>
            <p className="oppTitleLine">{opportunity.title}</p>
            <div className="opp-date">
              <CalendarDays size={17} />
              {opportunity.dateLabel}
              {signal.location ? ` · ${signal.location}` : ""}
            </div>
            {lowConfidence && missingDetails.length > 0 ? (
              <ul className="oppEvidence" aria-label="Details still needed">
                {missingDetails.map((detail) => (
                  <li key={detail}>{detail} needed</li>
                ))}
              </ul>
            ) : null}
            {serverPreview?.warnings.length ? (
              <ul className="oppEvidence" aria-label="Import warnings">
                {serverPreview.warnings.slice(0, 3).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            {opportunity.evidence.length > 0 ? (
              <ul className="oppEvidence" aria-label="Import evidence">
                {opportunity.evidence.slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            <div className="opp-actions">
              <button className="btn btn-primary" onClick={onAccept} type="button">
                {lowConfidence ? "Add missing details" : "Make this card"}
              </button>
              {lowConfidence ? (
                <button className="btn btn-ghost" onClick={onAccept} type="button">
                  Make this card
                </button>
              ) : null}
              <button className="btn btn-ghost" onClick={onDismiss} type="button">
                Not now
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <h2 className="importCalendarHeading reveal reveal-2">Want future moments to find you?</h2>
      <div className="importPrimary reveal reveal-2">
        {viewState.kind === "signed-out" ? (
          <SignInButton>
            <button className="btn btn-primary" type="button">
              <CalendarCheck size={16} />
              Sign in to connect Google Calendar
            </button>
          </SignInButton>
        ) : null}

        {viewState.kind === "loading" ? (
          <span className="importPrimaryNote" role="status">
            Checking your calendar connection…
          </span>
        ) : null}

        {viewState.kind === "not-connected" ? (
          <button className="btn btn-primary" disabled={busy} onClick={() => runConnectionAction("connect")} type="button">
            <CalendarCheck size={16} />
            Connect Google Calendar
          </button>
        ) : null}

        {viewState.kind === "connected" ? (
          <div className="connectedState" data-testid="calendar-connected">
            <p className="connectedHeadline">
              <CheckCircle2 size={16} aria-hidden="true" />
              <strong>Google Calendar connected</strong>
            </p>
            <p className="connectedMeta">
              {viewState.connection.lastImportedAtIso
                ? `Last scan ${viewState.connection.lastImportedAtIso.slice(0, 10)} · ${viewState.connection.importedEventCount ?? 0} event${(viewState.connection.importedEventCount ?? 0) === 1 ? "" : "s"} imported`
                : "Connected and ready to scan for card-worthy moments."}
            </p>
            <div className="opp-actions">
              <button
                aria-label="Scan Google Calendar again"
                className="btn btn-primary btn-sm"
                disabled={busy || !viewState.connection.canScanAgain}
                onClick={() => runConnectionAction("scan")}
                type="button"
              >
                <RefreshCw size={14} />
                Scan again
              </button>
              <button
                aria-expanded={manageOpen}
                aria-label="Manage Google Calendar connection"
                className="btn btn-ghost btn-sm"
                onClick={() => setManageOpen((open) => !open)}
                type="button"
              >
                <Settings2 size={14} />
                Manage connection
              </button>
            </div>
            {manageOpen ? (
              <div className="connectedManage">
                <p>
                  CustomCard reads event titles and dates only — nothing else is stored, and your refresh credential is
                  encrypted.
                </p>
                <button
                  aria-label="Reconnect Google Calendar"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => runConnectionAction("reconnect")}
                  type="button"
                >
                  Reconnect
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {viewState.kind === "needs-reconnect" ? (
          <div className="connectedState" data-testid="calendar-needs-reconnect">
            <p className="connectedHeadline">
              <CalendarClock size={16} aria-hidden="true" />
              <strong>Google Calendar needs reconnecting</strong>
            </p>
            <button
              aria-label="Reconnect Google Calendar"
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() => runConnectionAction("reconnect")}
              type="button"
            >
              Reconnect Google Calendar
            </button>
          </div>
        ) : null}

        {viewState.kind !== "connected" && viewState.kind !== "needs-reconnect" ? (
          <span className="importPrimaryNote">
            Reads event titles and dates only — birthdays and anniversaries become card reminders.
          </span>
        ) : null}
      </div>

      {connectionStatus ? (
        <section className={`sourceStatus sourceStatus-${connectionStatus.tone} reveal`} aria-live="polite">
          <strong>{connectionStatus.title}</strong>
          <span>{connectionStatus.detail}</span>
        </section>
      ) : null}

      {visibleMoments.length > 0 ? (
        <section className="panelcard momentsInbox reveal reveal-1" aria-label="Imported moments">
          <h2>Moments from your calendar</h2>
          <ul className="momentsList">
            {visibleMoments.map((moment) => {
              const decision = momentDecisions[moment.opportunityId];
              const inPast = moment.startsAt ? new Date(moment.startsAt).getTime() < Date.now() : false;
              const context = buildCalendarMomentDraftContext(moment);
              return (
                <li className="momentItem" key={moment.opportunityId}>
                  <div className="momentBody">
                    <strong>{context.title}</strong>
                    <small>
                      {context.recipient ? `For ${context.recipient} · ` : "Recipient needed · "}
                      {context.dateLabel}
                      {` · From ${context.sourceLabel}`}
                    </small>
                    {!context.recipient ? <small className="momentWarn">Confirm who this card is for.</small> : null}
                    {!moment.startsAt ? <small className="momentWarn">Add the date before printing.</small> : null}
                    {inPast ? <small className="momentWarn">This moment already passed — a belated card still counts.</small> : null}
                    {decision === "snooze" ? <small>Snoozed for later.</small> : null}
                  </div>
                  <div className="opp-actions">
                    <button
                      aria-label={context.recipient ? `Make a card for ${context.recipient}` : `Add details for ${context.title}`}
                      className="btn btn-primary btn-sm"
                      onClick={() => (context.recipient ? decideMoment(moment, "make-card") : editMoment(moment))}
                      type="button"
                    >
                      {context.recipient ? "Make card" : "Add details"}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => editMoment(moment)} type="button">
                      Edit details
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => decideMoment(moment, "snooze")} type="button">
                      Snooze
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => decideMoment(moment, "handled")} type="button">
                      Already handled
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => decideMoment(moment, "dismiss")} type="button">
                      Dismiss
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

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
