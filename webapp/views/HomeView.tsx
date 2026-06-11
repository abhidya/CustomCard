import { ArrowRight, CalendarPlus, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { CardDraft } from "../../src/freeMvp";
import { PanelArt } from "../ui";
import { ImportSection, type ImportSectionProps } from "./EventsView";

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
  hasProgress,
  importProps,
  onOccasion,
  onResume
}: {
  draft: CardDraft;
  hasProgress: boolean;
  importProps: ImportSectionProps;
  onOccasion: (occasion: string) => void;
  onResume: () => void;
}) {
  // Auto-expand when an invite is already pasted (e.g. returning from a calendar redirect).
  const [importOpen, setImportOpen] = useState(() => importProps.inviteText.trim().length > 0);

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

      {hasProgress ? (
        <button className="resume reveal reveal-2" onClick={onResume} type="button">
          <PanelArt panel={draft.panels[0]} />
          <span>
            <span className="resume-kicker">In progress</span>
            <strong>{draft.panels[0].headline}</strong>
            <span>Pick up where you left off</span>
          </span>
          <ArrowRight className="resume-arrow" size={20} />
        </button>
      ) : null}

      <section className="importExpander reveal reveal-3" aria-label="Start from an invite">
        <button
          aria-expanded={importOpen}
          className="importExpanderToggle"
          onClick={() => setImportOpen((open) => !open)}
          type="button"
        >
          <CalendarPlus size={16} />
          Start from an invite or calendar event
          <ChevronDown className="importExpanderChevron" data-open={importOpen} size={16} />
        </button>
        {importOpen ? (
          <div className="importExpanderBody">
            <ImportSection {...importProps} />
          </div>
        ) : null}
      </section>
    </>
  );
}
