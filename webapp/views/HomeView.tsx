import {
  ArrowRight,
  CalendarPlus,
  CalendarSearch,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  HandHeart,
  ShieldCheck,
  Store,
  WandSparkles
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { generateCardDraft, type CardDraft, type CardDraftInput } from "../../src/freeMvp";
import { PanelArt } from "../ui";
import { ImportSection, type ImportSectionProps } from "./EventsView";

interface FeaturedCard {
  id: string;
  title: string;
  caption: string;
  thumbnailUrl?: string;
  frontSvg?: string;
  frontImageUrl?: string;
  featuredRank: number;
}

interface FeaturedCategory {
  category: string;
  label: string;
  cards: FeaturedCard[];
}

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
  "Designing and saving a manual print package can start without an account.",
  "AI generation, saved history, Google Calendar, and Walgreens checkout require an account.",
  "Calendar connections are optional and separate from creating an account.",
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
  // Admin-featured real cards replace the built-in examples when available.
  const [featuredCategories, setFeaturedCategories] = useState<FeaturedCategory[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/featured-cards")
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload: { categories?: FeaturedCategory[] } | undefined) => {
        if (!cancelled && payload?.categories?.length) setFeaturedCategories(payload.categories);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

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
              Find moments from calendar or invite
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
        {featuredCategories.length > 0 ? (
          <>
            <p className="examplesLead">Real cards people made with CustomCard, shared with permission.</p>
            <div className="examplesGrid">
              {featuredCategories.map((category) => (
                <FeaturedCategoryCard
                  category={category}
                  key={category.category}
                  onOccasion={onOccasion}
                />
              ))}
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
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

function FeaturedCardFace({ card }: { card: FeaturedCard }) {
  if (card.frontSvg) {
    return (
      <img
        alt={`${card.title} card front`}
        src={`data:image/svg+xml;utf8,${encodeURIComponent(card.frontSvg)}`}
      />
    );
  }
  const imageUrl = card.thumbnailUrl ?? card.frontImageUrl;
  if (imageUrl) return <img alt={`${card.title} card front`} src={imageUrl} />;
  return <span aria-hidden="true" className="carditem-thumbfallback" />;
}

/**
 * One landing-gallery tile per category. A single featured card renders as a
 * plain card; two or more render as an accessible, manually advanced carousel
 * (labeled buttons, keyboard focusable, no auto-advance).
 */
function FeaturedCategoryCard({
  category,
  onOccasion
}: {
  category: FeaturedCategory;
  onOccasion: (occasion: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const cards = category.cards;
  const card = cards[Math.min(index, cards.length - 1)];
  if (!card) return null;
  const carousel = cards.length > 1;

  return (
    <div
      aria-label={carousel ? `${category.label} featured cards carousel` : `${category.label} featured card`}
      aria-roledescription={carousel ? "carousel" : undefined}
      className="examplecard featuredcard"
      role="group"
    >
      <button
        aria-label={`Start a ${category.label} card`}
        className="featuredcardFace"
        onClick={() => onOccasion(category.category)}
        type="button"
      >
        <FeaturedCardFace card={card} />
        <span>{category.label}</span>
        <small>{card.caption}</small>
      </button>
      {carousel ? (
        <div className="featuredcardNav">
          <button
            aria-label={`Previous ${category.label} card`}
            className="btn btn-ghost btn-sm"
            onClick={() => setIndex((current) => (current - 1 + cards.length) % cards.length)}
            type="button"
          >
            <ChevronLeft size={14} />
          </button>
          <span aria-live="polite">
            {Math.min(index, cards.length - 1) + 1} of {cards.length}
          </span>
          <button
            aria-label={`Next ${category.label} card`}
            className="btn btn-ghost btn-sm"
            onClick={() => setIndex((current) => (current + 1) % cards.length)}
            type="button"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
