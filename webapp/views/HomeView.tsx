import {
  ArrowRight,
  CalendarPlus,
  CalendarSearch,
  ChevronDown,
  Eye,
  HandHeart,
  ShieldCheck,
  Store,
  WandSparkles
} from "lucide-react";
import { useMemo, useState } from "react";
import { generateCardDraft, type CardDraft, type CardDraftInput } from "../../src/freeMvp";
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

const howItWorksSteps = [
  {
    icon: <CalendarPlus size={18} />,
    title: "Pick a moment",
    body: "Choose an occasion, paste an invite, or connect your calendar so birthdays and anniversaries find you."
  },
  {
    icon: <HandHeart size={18} />,
    title: "Add relationship context",
    body: "Who it's for, how you know them, and one real detail — messy notes are fine."
  },
  {
    icon: <WandSparkles size={18} />,
    title: "AI drafts",
    body: "AI drafts the words and artwork for a real 5 × 7 folded card. Every word stays editable."
  },
  {
    icon: <Eye size={18} />,
    title: "You review",
    body: "Check all four panels and approve the print proof before anything is printed."
  },
  {
    icon: <Store size={18} />,
    title: "Continue to Walgreens",
    body: "Walgreens handles the store, the price, and the payment. Pick the card up the same day."
  }
];

const trustPoints = [
  "Free to create. Pay Walgreens only if you print.",
  "Walgreens handles payment and final checkout.",
  "Account required for AI generation — designing and printing work without one.",
  "Email and calendar connections are optional and separate from your account.",
  "You review every word before checkout.",
  "Saved personal details are yours to edit or delete at any time."
];

const exampleInputs: Array<{ label: string; input: Partial<CardDraftInput> }> = [
  { label: "Birthday", input: { occasion: "birthday", recipient: "Maya", tone: "playful", style: "bold-type" } },
  { label: "Graduation", input: { occasion: "graduation", recipient: "Sami", tone: "warm", style: "bold-type" } },
  { label: "Wedding", input: { occasion: "wedding", recipient: "Lena & Tom", tone: "elegant", style: "botanical" } },
  { label: "Thank you", input: { occasion: "thank-you", recipient: "Coach Reyes", tone: "warm", style: "minimal" } },
  { label: "Sympathy", input: { occasion: "sympathy", recipient: "The Khans", tone: "reverent", style: "minimal" } },
  { label: "Anniversary", input: { occasion: "anniversary", recipient: "Mom & Dad", tone: "sentimental", style: "botanical" } }
];

const exampleBaseInput: CardDraftInput = {
  recipient: "Someone important",
  sender: "You",
  relationship: "Friends",
  occasion: "card",
  tone: "warm",
  style: "botanical",
  language: "English",
  personalNote: "",
  useMemory: false
};

export function HomeView({
  draft,
  hasProgress,
  importProps,
  onCreate,
  onFindMoments,
  onOccasion,
  onResume
}: {
  draft: CardDraft;
  hasProgress: boolean;
  importProps: ImportSectionProps;
  onCreate: () => void;
  onFindMoments: () => void;
  onOccasion: (occasion: string) => void;
  onResume: () => void;
}) {
  // Auto-expand when an invite is already pasted (e.g. returning from a calendar redirect).
  const [importOpen, setImportOpen] = useState(() => importProps.inviteText.trim().length > 0);
  const exampleDrafts = useMemo(
    () =>
      exampleInputs.map((example) => ({
        label: example.label,
        draft: generateCardDraft({ ...exampleBaseInput, ...example.input }, [])
      })),
    []
  );

  return (
    <>
      <section className="hero landingHero reveal">
        <div className="landingHeroCopy">
          <span className="eyebrow">Cards that feel hand-made</span>
          <h1>
            Never miss the <em>card-worthy</em> moment.
          </h1>
          <p>
            CustomCard turns birthdays, graduations, weddings, sympathy moments, thank-yous, and real relationship
            context into personal 5 × 7 cards you can review and print through Walgreens.
          </p>
          <div className="landingHeroActions">
            <button className="btn btn-primary" onClick={onCreate} type="button">
              Create a card
              <ArrowRight size={16} />
            </button>
            <button className="btn btn-ghost" onClick={onFindMoments} type="button">
              <CalendarSearch size={16} />
              Find moments from email or calendar
            </button>
            <a className="textlink" href="#examples">
              See examples
            </a>
          </div>
        </div>
        <div className="landingHeroVisual" aria-label="Example 5 by 7 card preview">
          <PanelArt className="landingHeroCard" panel={draft.panels[0]} />
          <span className="landingHeroCaption">5 × 7 folded card · print-ready at 300 DPI</span>
        </div>
      </section>

      <p className="occasionsLead reveal reveal-1">Pick the occasion — we&rsquo;ll start the card, you make it theirs.</p>
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

      <section className="howitworks reveal reveal-3" aria-label="How CustomCard works">
        <h2>How it works</h2>
        <div className="howitworksGrid">
          {howItWorksSteps.map((step, index) => (
            <article className="howstep" key={step.title}>
              <span className="howstepIcon">{step.icon}</span>
              <span className="howstepNum">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="examples reveal reveal-3" aria-label="Example cards" id="examples">
        <h2>Made for real moments</h2>
        <p className="examplesLead">Every example below is a real print panel rendered by CustomCard.</p>
        <div className="examplesGrid">
          {exampleDrafts.map((example) => (
            <button
              className="examplecard"
              key={example.label}
              onClick={() => onOccasion(example.label.toLowerCase().replace(/\s+/g, "-"))}
              type="button"
            >
              <PanelArt panel={example.draft.panels[0]} />
              <span>{example.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="trustnotes reveal reveal-3" aria-label="Pricing and privacy promises">
        <div className="trustnotesHead">
          <ShieldCheck size={18} />
          <h2>Free to create. Private by default.</h2>
        </div>
        <ul>
          {trustPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <section className="finalcta reveal reveal-3" aria-label="Start a card">
        <h2>Someone's moment is coming up.</h2>
        <button className="btn btn-primary" onClick={onCreate} type="button">
          Create a card
          <ArrowRight size={16} />
        </button>
      </section>
    </>
  );
}
