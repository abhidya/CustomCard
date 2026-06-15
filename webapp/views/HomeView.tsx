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
import { useEffect, useState } from "react";
import { getBrowserJson } from "../../src/browserRequestAdapter";
import type { CardDraft } from "../../src/customerWorkflow";
import { cardImageByCategory } from "../cardTemplates";
import { normalizeBrowserImageUrl } from "../browserImageUrl";
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
  { label: "Graduation", value: "graduation", color: "#3e5fc4" },
  { label: "Wedding", value: "wedding", color: "#8a63b8" },
  { label: "Anniversary", value: "anniversary", color: "#c2484f" },
  { label: "Thank you", value: "thank-you", color: "#33685a" },
  { label: "Sympathy", value: "sympathy", color: "#6b7280" },
  { label: "I’m late", value: "belated card", color: "#b4654a" },
  { label: "Not sure what to say", value: "", color: "#7d7a72" }
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
    title: "Finish at a print shop",
    body: "Download print-ready files, choose your preferred print shop, and confirm the final price before ordering."
  }
];

const trustPoints = [
  "Free to create. Pay the print shop only if you print.",
  "You choose the printer and confirm payment directly with them.",
  "Designing and saving a print package can start without an account.",
  "AI generation, saved history, and Google Calendar require an account.",
  "Calendar connections are optional and separate from creating an account.",
  "You review every word before creating the print-shop package.",
  "Saved personal details are yours to edit or delete at any time."
];

// One example per distinct artwork. Wedding and anniversary share the same art asset,
// so they're shown as a single honest example rather than the identical card twice.
const exampleCards = [
  { label: "Birthday", category: "birthday", imageUrl: cardImageByCategory.birthday },
  { label: "Graduation", category: "graduation", imageUrl: cardImageByCategory.graduation },
  { label: "Wedding & anniversary", category: "wedding", imageUrl: cardImageByCategory.wedding },
  { label: "Thank you", category: "thank-you", imageUrl: cardImageByCategory["thank-you"] },
  { label: "Sympathy", category: "sympathy", imageUrl: cardImageByCategory.sympathy },
  { label: "Friendship", category: "friendship", imageUrl: cardImageByCategory.friendship }
];

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
  // Admin-featured real cards replace the built-in examples when available.
  const [featuredCategories, setFeaturedCategories] = useState<FeaturedCategory[]>([]);
  useEffect(() => {
    let cancelled = false;
    getBrowserJson<{ categories?: FeaturedCategory[] }>("/api/public/featured-cards")
      .then((payload) => {
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
          <span className="eyebrow">Thoughtful cards, without the blank page.</span>
          <h1>
            Make the card you <em>meant</em> to send.
          </h1>
          <p>
            Start with a name, occasion, messy note, invite, or calendar event. CustomCard helps turn it into a
            personal 5 × 7 card you can edit, review, and print through your preferred print shop.
          </p>
          <div className="landingHeroActions">
            <button className="btn btn-primary" onClick={onCreate} type="button">
              Make my card now
              <ArrowRight size={16} />
            </button>
            <button className="btn btn-ghost" onClick={onFindMoments} type="button">
              <CalendarSearch size={16} />
              Start from invite or calendar
            </button>
            <a className="textlink" href="#examples">
              See example cards
            </a>
          </div>
          <p className="landingHeroTrust">
            No auto-sending. No surprise checkout. You approve every word before printing.
          </p>
        </div>
        <div className="landingHeroVisual" aria-label="Example 5 by 7 card preview">
          <div className="landingHeroStage">
            <img
              alt=""
              aria-hidden="true"
              className="landingHeroPeek"
              decoding="async"
              loading="lazy"
              src={cardImageByCategory.birthday}
            />
            <img
              alt="Premium folded greeting card and envelope"
              className="landingHeroCard landingHeroProductImage"
              decoding="async"
              src="/generated/landing-hero-product.webp"
            />
          </div>
          <span className="landingHeroCaption">5 × 7 folded card · print-ready at 300 DPI</span>
        </div>
      </section>

      <section className="pathchooser reveal reveal-1" aria-label="What do you need today?">
        <h2>What do you need today?</h2>
        <div className="pathchooserGrid">
          <article className="pathcard">
            <h3>I need a card now</h3>
            <p>Make a birthday, graduation, wedding, sympathy, thank-you, or anniversary card in minutes.</p>
            <button className="btn btn-primary" onClick={onCreate} type="button">
              Start a card
            </button>
            <small>No account needed to begin.</small>
          </article>
          <article className="pathcard">
            <h3>Help me catch future cards</h3>
            <p>
              Paste an invite or connect Google Calendar so birthdays, dinners, graduations, and anniversaries become
              reviewable card moments.
            </p>
            <button className="btn btn-ghost" onClick={onFindMoments} type="button">
              Find moments
            </button>
            <small>Calendar is optional. Event titles and dates only.</small>
          </article>
        </div>
      </section>

      <p className="occasionsLead reveal reveal-1">
        Pick the occasion — we&rsquo;ll start the card, you make it theirs. You can change the tone, message,
        language, and design later.
      </p>
      <div className="occasions reveal reveal-1">
        {occasions.map((occasion) => (
          <button
            className="occasion"
            key={occasion.label}
            onClick={() => (occasion.value ? onOccasion(occasion.value) : onCreate())}
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
          Paste an invite, event, or messy note
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
              <span className="howstepNum" aria-hidden="true">{index + 1}</span>
              <h3>
                <span className="howstepIcon" aria-hidden="true">{step.icon}</span>
                {step.title}
              </h3>
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
              {exampleCards.map((example) => (
                <button
                  className="examplecard"
                  key={example.label}
                  onClick={() => onOccasion(example.category)}
                  type="button"
                >
                  <img alt={`${example.label} card example`} decoding="async" loading="lazy" src={example.imageUrl} />
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
        <h2>Someone is worth the extra minute.</h2>
        <p>
          Start with a name, an occasion, an invite, or a messy note. CustomCard will help you turn it into a card
          they can actually keep.
        </p>
        <button className="btn btn-primary" onClick={onCreate} type="button">
          Make my card now
          <ArrowRight size={16} />
        </button>
        <small>You can edit everything before printing.</small>
      </section>
    </>
  );
}

function FeaturedCardFace({ card, category }: { card: FeaturedCard; category: string }) {
  if (card.frontSvg) {
    return (
      <img
        alt={`${card.title} card front`}
        src={`data:image/svg+xml;utf8,${encodeURIComponent(card.frontSvg)}`}
      />
    );
  }
  const imageUrl =
    normalizeBrowserImageUrl(card.thumbnailUrl) ??
    normalizeBrowserImageUrl(card.frontImageUrl) ??
    cardImageByCategory[category] ??
    cardImageByCategory.custom;
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
        <FeaturedCardFace card={card} category={category.category} />
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
