import { ArrowRight, CalendarPlus, NotebookPen, Printer } from "lucide-react";
import type { CardDraft } from "../../src/freeMvp";
import { PanelArt } from "../ui";

const occasions: Array<{ label: string; value: string; color: string }> = [
  { label: "Birthday", value: "birthday", color: "#d9a514" },
  { label: "Anniversary", value: "anniversary", color: "#c2484f" },
  { label: "Wedding", value: "wedding", color: "#8a63b8" },
  { label: "Thank you", value: "thank-you", color: "#33685a" },
  { label: "Graduation", value: "graduation", color: "#3e5fc4" },
  { label: "Sympathy", value: "sympathy", color: "#6b7280" }
];

export function HomeView({
  draft,
  canPrint,
  hasProgress,
  onOccasion,
  onImport,
  onNote,
  onPrint,
  onResume,
  printPriceLabel
}: {
  draft: CardDraft;
  canPrint: boolean;
  hasProgress: boolean;
  onOccasion: (occasion: string) => void;
  onImport: () => void;
  onNote: () => void;
  onPrint: () => void;
  onResume: () => void;
  printPriceLabel?: string;
}) {
  return (
    <>
      <section className="hero reveal">
        <span className="eyebrow">Cards that feel hand-made</span>
        <h1>
          Make someone&rsquo;s <em>day</em>.
        </h1>
        <p>Pick the occasion — we&rsquo;ll start the card, you make it theirs.</p>
      </section>

      <div className="occasions reveal reveal-1">
        {occasions.map((occasion) => (
          <button
            className="occasion"
            key={occasion.value}
            onClick={() => onOccasion(occasion.value)}
            type="button"
          >
            <span className="occasion-dot" style={{ background: occasion.color }} />
            {occasion.label}
          </button>
        ))}
      </div>

      <section className="homeActions reveal reveal-2" aria-label="Card actions">
        <button className="homeAction homeAction-primary" onClick={onImport} type="button">
          <span className="homeActionIcon">
            <CalendarPlus size={18} />
          </span>
          <span>
            <strong>Paste invite or calendar event</strong>
            <small>Use an email, ICS export, or quick note to start from real details.</small>
          </span>
        </button>
        <button className="homeAction" onClick={onNote} type="button">
          <span className="homeActionIcon">
            <NotebookPen size={18} />
          </span>
          <span>
            <strong>Add a personal detail</strong>
            <small>Save a memory, inside joke, or preference for this card.</small>
          </span>
        </button>
        <button className="homeAction" disabled={!canPrint} onClick={onPrint} type="button">
          <span className="homeActionIcon">
            <Printer size={18} />
          </span>
          <span>
            <strong>Print this card</strong>
            <small>{canPrint ? `${printPriceLabel ? `${printPriceLabel} estimate. ` : ""}Review files and pickup.` : "Available after you start the card."}</small>
          </span>
        </button>
      </section>

      {hasProgress ? (
        <button className="resume reveal reveal-3" onClick={onResume} type="button">
          <PanelArt panel={draft.panels[0]} />
          <span>
            <span className="resume-kicker">In progress</span>
            <strong>{draft.panels[0].headline}</strong>
            <span>Pick up where you left off</span>
          </span>
          <ArrowRight className="resume-arrow" size={20} />
        </button>
      ) : null}
    </>
  );
}
