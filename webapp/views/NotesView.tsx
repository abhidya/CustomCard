import { ArrowRight, Eye, Pencil } from "lucide-react";
import type { CardDraft, CardHistoryEntry, CardLifecycleStatus } from "../../src/customerWorkflow";
import type { DraftProgressStatus } from "../draftProgress";
import { PanelArt } from "../ui";

const draftStatusLabels: Record<DraftProgressStatus, string> = {
  draft: "Draft",
  "in-progress": "In progress",
  "ready-for-review": "Ready to review"
};

const lifecycleStatusLabels: Record<CardLifecycleStatus, string> = {
  draft: "Draft",
  "ready-to-print": "Ready to print",
  "walgreens-checkout-started": "Walgreens checkout started",
  "returned-from-walgreens": "Back from Walgreens",
  downloaded: "Downloaded"
};

/** "My cards" hub: the card in progress plus account-backed card history. */
export function NotesView({
  draft,
  draftStatus,
  hasProgress,
  history,
  isSignedIn,
  onMakeAnother,
  onResume,
  onReviewProof,
  onStartCard
}: {
  draft: CardDraft;
  draftStatus: DraftProgressStatus;
  hasProgress: boolean;
  history: CardHistoryEntry[];
  isSignedIn: boolean;
  onMakeAnother: (recipient: string) => void;
  onResume: () => void;
  onReviewProof: () => void;
  onStartCard: () => void;
}) {
  const isEmpty = !hasProgress && history.length === 0;

  if (isEmpty) {
    return (
      <>
        <header className="pagehead reveal">
          <h1>Your cards</h1>
        </header>
        <section className="panelcard emptyhub reveal reveal-1">
          <p>No cards yet. Start with a card, an invite, or a saved person.</p>
          <div className="opp-actions">
            <button className="btn btn-primary" onClick={onStartCard} type="button">
              Start a card
              <ArrowRight size={15} />
            </button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <header className="pagehead reveal">
        <h1>Your cards</h1>
        <p>
          Cards in progress and cards you&rsquo;ve finished.
          {isSignedIn ? "" : " As a guest, your work lasts until you close or refresh this tab — sign in to keep it."}
        </p>
      </header>

      <div className="cardlist reveal reveal-1">
        {hasProgress ? (
          <article className="panelcard carditem">
            <PanelArt panel={draft.panels[0]} />
            <div className="carditem-body">
              <span className="statusTag" data-status={draftStatus}>
                {draftStatusLabels[draftStatus]}
              </span>
              <strong>{draft.panels[0].headline}</strong>
              <small>
                {draft.input.occasion === "card" ? "Any occasion" : draft.input.occasion}
                {draft.input.recipient !== "Someone important" ? ` · for ${draft.input.recipient}` : ""}
              </small>
            </div>
            <div className="carditem-actions">
              {draftStatus === "ready-for-review" ? (
                <>
                  <button className="btn btn-primary btn-sm" onClick={onReviewProof} type="button">
                    <Eye size={14} />
                    Review proof
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={onResume} type="button">
                    <Pencil size={14} />
                    Edit card
                  </button>
                </>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={onResume} type="button">
                  <Pencil size={14} />
                  Continue editing
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </article>
        ) : null}

        {history.map((entry) => (
          <article className="panelcard carditem" key={entry.id}>
            {entry.frontSvg ? (
              <img alt={`${entry.title} front panel`} src={`data:image/svg+xml;utf8,${encodeURIComponent(entry.frontSvg)}`} />
            ) : (
              <span className="carditem-thumbfallback" aria-hidden="true" />
            )}
            <div className="carditem-body">
              <span className="statusTag" data-status={entry.status ?? "downloaded"}>
                {lifecycleStatusLabels[entry.status ?? "downloaded"]}
              </span>
              <strong>{entry.title}</strong>
              <small>
                {entry.occasion} · for {entry.recipient} · saved {entry.exportedAtIso.slice(0, 10)}
              </small>
            </div>
            <div className="carditem-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => onMakeAnother(entry.recipient)} type="button">
                Make another for {entry.recipient}
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
