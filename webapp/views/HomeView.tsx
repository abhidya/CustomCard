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
  { label: "Get well", value: "get-well", color: "#50856f" },
  { label: "New baby", value: "new-baby", color: "#6d8ec7" },
  { label: "Congrats", value: "congratulations", color: "#c28b2c" },
  { label: "For work", value: "business customer anniversary", color: "#2f6c6a" },
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
  "AI generation, saved history, Google Calendar, and Walgreens checkout require an account.",
  "Calendar connections are optional and separate from creating an account.",
  "You review every word before creating the print-shop package.",
  "Saved personal details are yours to edit or delete at any time."
];

interface ThemeInventoryCard {
  title: string;
  category: string;
  imageUrl: string;
  relationship: string;
  memoryObject: string;
  artBrief: string;
  avoid: string;
  tag: string;
}

const themeInventoryCards: ThemeInventoryCard[] = [
  {
    title: "Dad's tomato garden",
    category: "birthday",
    imageUrl: cardImageByCategory.birthday,
    relationship: "Birthday card for the parent who texts harvest photos before saying hello.",
    memoryObject: "sun-warmed tomatoes, twine knots, seed packet dates",
    artBrief: "A letterpress tomato trellis wraps a clean center, with late-July light and hand-cut paper texture.",
    avoid: "balloons, cake clipart, generic party confetti",
    tag: "memory object"
  },
  {
    title: "Lena watered the basil",
    category: "thank-you",
    imageUrl: cardImageByCategory["thank-you"],
    relationship: "Thank-you card for the neighbor who kept the apartment alive while you were gone.",
    memoryObject: "windowsill basil, chipped ceramic watering can, one orange on the counter",
    artBrief: "Controlled citrus and herb illustration in two corners, leaving a quiet proof-safe middle.",
    avoid: "big THANK YOU lettering, gift bows, generic gratitude florals",
    tag: "specific thanks"
  },
  {
    title: "Maya's blue-pencil thesis",
    category: "graduation",
    imageUrl: cardImageByCategory.graduation,
    relationship: "Graduation card from a sibling who saw the edits, the doubts, and the last push.",
    memoryObject: "blue pencil marks, library receipt, coffee ring on a draft",
    artBrief: "Navy editorial paper, one gold margin line, annotated-page rhythm without readable text.",
    avoid: "caps as the whole concept, diplomas, school seals",
    tag: "earned detail"
  },
  {
    title: "The foil-covered casserole",
    category: "sympathy",
    imageUrl: cardImageByCategory.sympathy,
    relationship: "Sympathy card for showing up with practical care when words are thin.",
    memoryObject: "foil-covered casserole, house key, quiet porch light",
    artBrief: "Low-saturation still life cropped like a small act of service, with generous breathing room.",
    avoid: "lilies, crosses, sunset silhouettes, dramatic sorrow",
    tag: "quiet care"
  },
  {
    title: "Two coffee rings apart",
    category: "friendship",
    imageUrl: cardImageByCategory.friendship,
    relationship: "Long-distance friendship card for the person who still knows the old joke.",
    memoryObject: "two coffee rings, transit-line curve, folded note corner",
    artBrief: "Warm paper field with map-line motion between two small table marks, intimate and unposed.",
    avoid: "best-friend slogans, stars, cartoon mugs",
    tag: "shared ritual"
  },
  {
    title: "Recovery window tea",
    category: "get-well",
    imageUrl: cardImageByCategory["get-well"],
    relationship: "Get-well card that says steady support instead of forced cheer.",
    memoryObject: "tea steam, folded blanket, rectangle of morning window light",
    artBrief: "Soft blue-green sunlight, abstract cup shape, and a calm unfilled center for exact copy.",
    avoid: "medical icons, smiley faces, peppy slogans",
    tag: "tone boundary"
  },
  {
    title: "Client sample swatches",
    category: "business customer anniversary",
    imageUrl: cardImageByCategory.business,
    relationship: "Customer anniversary card that feels like a human account memory, not a CRM blast.",
    memoryObject: "sample swatches, package insert, date stamp, tiny product token",
    artBrief: "Editorial stationery composition with tactile samples and a disciplined professional palette.",
    avoid: "handshake icons, corporate swooshes, dashboards, logos",
    tag: "business memory"
  },
  {
    title: "The ordinary beautiful yes",
    category: "anniversary",
    imageUrl: cardImageByCategory.anniversary,
    relationship: "Anniversary card for the couple whose life is built from small routines.",
    memoryObject: "two mugs in the sink, receipt from the first place, ribbon from saved wrapping",
    artBrief: "Two quiet paper ribbons loop around ordinary keepsakes, romantic without being bridal.",
    avoid: "hearts, rings, champagne flutes, scripted love quotes",
    tag: "emotional truth"
  },
  {
    title: "Tiny sock, no baby face",
    category: "new-baby",
    imageUrl: cardImageByCategory["new-baby"],
    relationship: "New-baby card that centers the parents' tenderness and privacy.",
    memoryObject: "tiny sock, folded blanket edge, moon-shaped night light",
    artBrief: "Soft edge motifs with a protected blank field, tender but not invasive.",
    avoid: "baby faces, bodies, cartoon animals, gendered cliches",
    tag: "privacy"
  },
  {
    title: "Late, but not careless",
    category: "belated card",
    imageUrl: cardImageByCategory.belated,
    relationship: "Belated birthday repair note that owns the miss without turning it into a joke.",
    memoryObject: "open note, calendar corner, one pencil mark",
    artBrief: "Sparse clock-hand arc and folded paper shape, sincere with a little human warmth.",
    avoid: "alarm clocks with numbers, apology cartoons, fake handwriting",
    tag: "repair"
  }
];

const heroMorphCards = themeInventoryCards.map((card) => ({
  label: card.title,
  imageUrl: card.imageUrl,
  proofLine: card.memoryObject.split(",")[0]
}));

const heroRackCards = themeInventoryCards.map((card) => ({
  label: card.title,
  imageUrl: card.imageUrl
}));

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
          <span className="eyebrow">Story-first custom art cards.</span>
          <h1>
            Make a card only <em>they</em> would recognize.
          </h1>
          <p>
            Start with a name, an occasion, and the one detail that proves you know them. CustomCard turns that
            into a personal 5 x 7 proof you can edit, review, and print through your preferred print shop.
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
        <div
          aria-label="Custom art card studies morphing between relationship-specific ideas"
          className="landingHeroVisual"
          role="img"
        >
          <div className="landingHeroStage">
            <div className="heroRack" aria-hidden="true">
              {heroRackCards.map((card, index) => (
                <img
                  alt=""
                  className={`heroRackCard heroRackCard-${index + 1}`}
                  decoding="async"
                  key={`rack-${card.label}`}
                  loading="lazy"
                  src={card.imageUrl}
                />
              ))}
            </div>
            <div className="heroStack" aria-hidden="true">
              {heroMorphCards.slice(1, 4).map((card, index) => (
                <img
                  alt=""
                  className={`heroStackCard heroStackCard-${index + 1}`}
                  decoding="async"
                  key={card.label}
                  loading="lazy"
                  src={card.imageUrl}
                />
              ))}
            </div>
            <div className="heroMorphCard" aria-hidden="true">
              {heroMorphCards.map((card, index) => (
                <img
                  alt=""
                  className="heroMorphImage"
                  decoding="async"
                  key={card.label}
                  style={{ animationDelay: `${index * 4}s` }}
                  src={card.imageUrl}
                />
              ))}
              <div className="heroProofCopy">
                {heroMorphCards.map((card, index) => (
                  <span key={`proof-${card.label}`} style={{ animationDelay: `${index * 4}s` }}>
                    <b>{card.label}</b>
                    <small>{card.proofLine}</small>
                  </span>
                ))}
              </div>
            </div>
            <div className="heroMorphRail" aria-hidden="true">
              {heroMorphCards.map((card, index) => (
                <span key={card.label} style={{ animationDelay: `${index * 4}s` }}>{card.label}</span>
              ))}
            </div>
            <div className="heroProofTicker" aria-hidden="true">
              <span>memory object locked</span>
              <span>cliche check passed</span>
              <span>print-safe copy zone</span>
            </div>
          </div>
          <span className="landingHeroCaption">Generated card studies briefed around real details, ready for exact app text</span>
        </div>
      </section>

      <section className="inventoryStrip reveal reveal-1" aria-label="Custom art card contract examples">
        <div className="inventoryStripHead">
          <span>Art-card contract</span>
          <strong>{themeInventoryCards.length} story studies</strong>
          <small>Relationship, remembered object, emotional truth, art move, and forbidden cliches.</small>
        </div>
        <div className="inventoryRail" aria-label="Browse story-led card studies">
          {themeInventoryCards.slice(0, 18).map((card) => (
            <button
              className="inventoryRailCard"
              key={`${card.title}-${card.category}`}
              onClick={() => onOccasion(card.category)}
              type="button"
            >
              <img alt="" decoding="async" loading="lazy" src={card.imageUrl} />
              <span>
                <strong>{card.title}</strong>
                <small>{card.tag}</small>
              </span>
            </button>
          ))}
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
        Pick the occasion, then add the detail. You can change the tone, message, language, and design later.
      </p>
      <div className="occasions reveal reveal-1">
        {occasions.map((occasion) => (
          <button
            className="occasion"
            key={occasion.label}
            onClick={() => (occasion.value ? onOccasion(occasion.value) : onCreate())}
            type="button"
          >
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
        <div className="examplesHead">
          <div>
            <h2>What a great custom card starts with</h2>
            <p className="examplesLead">
              Not templates in costumes. Each study starts with one remembered detail, one emotional job, and a list
              of cliches the card is not allowed to use.
            </p>
          </div>
          <div className="examplesScore" aria-hidden="true">
            <strong>{themeInventoryCards.length}</strong>
            <span>studies</span>
          </div>
        </div>
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
          <p className="examplesLead">Shared customer cards will appear here after review; these story-led studies are ready now.</p>
        )}
        <ThemeInventoryGrid onOccasion={onOccasion} />
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

function ThemeInventoryGrid({ onOccasion }: { onOccasion: (occasion: string) => void }) {
  return (
    <div className="themeInventoryGrid">
      {themeInventoryCards.map((card) => (
        <button
          className="themeInventoryCard"
          key={`${card.title}-${card.category}`}
          onClick={() => onOccasion(card.category)}
          type="button"
        >
          <img alt="" decoding="async" loading="lazy" src={card.imageUrl} />
          <span className="themeInventoryCardBody">
            <span className="themeInventoryTag">{card.tag}</span>
            <strong>{card.title}</strong>
            <small>{card.relationship}</small>
            <span className="themeInventoryFacts">
              <span>
                <b>Memory</b>
                {card.memoryObject}
              </span>
              <span>
                <b>Art move</b>
                {card.artBrief}
              </span>
              <span>
                <b>Avoid</b>
                {card.avoid}
              </span>
            </span>
          </span>
        </button>
      ))}
    </div>
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
    normalizeBrowserImageUrl(card.frontImageUrl);
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
