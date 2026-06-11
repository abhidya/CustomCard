import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  FileJson2,
  LockKeyhole,
  ShieldCheck,
  Workflow
} from "lucide-react";
import type { CardDraft } from "../../src/freeMvp";
import { businessEngagementReadinessItems, summarizeBusinessEngagementReadiness } from "../../src/businessEngagementReadiness";
import { PanelArt } from "../ui";

const businessSummary = summarizeBusinessEngagementReadiness();

const lifecycleMoments = [
  {
    label: "Birthday",
    detail: "Personal card review before any customer message is sent."
  },
  {
    label: "Purchase anniversary",
    detail: "Thank-you cards tied to customer history and suppression checks."
  },
  {
    label: "Warranty anniversary",
    detail: "Useful follow-up moments routed through approval first."
  }
];

const neededFeatures = [
  {
    icon: <CalendarCheck2 size={18} />,
    title: "Lifecycle source",
    body: "CSV now; CRM OAuth later. The buyer needs to see where birthday, purchase, and warranty dates enter the system."
  },
  {
    icon: <ClipboardCheck size={18} />,
    title: "Human approval queue",
    body: "B2B cannot imply automatic outreach. Review, edit, approve, snooze, and suppress must be first-class actions."
  },
  {
    icon: <ShieldCheck size={18} />,
    title: "Consent and suppression",
    body: "Show opt-in, no-contact, data deletion, and legal review gates before message or workflow delivery."
  },
  {
    icon: <Workflow size={18} />,
    title: "Workflow handoff",
    body: "Export payloads for Zapier, Make, Slack, Sheets, and other systems while live webhooks remain evidence-gated."
  },
  {
    icon: <FileJson2 size={18} />,
    title: "Print-ready packet",
    body: "Each opportunity should end with approved copy, a 5x7 proof, fulfillment estimates, and downloadable files."
  },
  {
    icon: <BarChart3 size={18} />,
    title: "Campaign feedback",
    body: "Analytics must be framed as future evidence until live delivery, engagement, retention, and writeback proofs exist."
  }
];

const readinessCards = businessEngagementReadinessItems.map((item) => ({
  label: item.label,
  status: item.status,
  blocker: item.blocker
}));

export function BusinessLandingView({
  draft,
  onCreate,
  onReview
}: {
  draft: CardDraft;
  onCreate: () => void;
  onReview: () => void;
}) {
  return (
    <section className="businessLanding reveal" aria-label="CustomCard for business">
      <section className="businessHero" aria-label="Business landing hero">
        <div className="businessHeroCopy">
          <p className="eyebrow">For customer lifecycle teams</p>
          <h1>Send the right card on time.</h1>
          <p>
            CustomCard turns customer dates into reviewed, print-ready greeting cards with consent gates, workflow
            handoffs, and fulfillment estimates before anything leaves your business.
          </p>
          <div className="businessHeroActions">
            <button className="btn btn-primary" onClick={onReview} type="button">
              Review lifecycle queue
              <ArrowRight size={16} />
            </button>
            <button className="btn btn-ghost" onClick={onCreate} type="button">
              Create sample card
            </button>
          </div>
          <div className="businessTrustStrip" aria-label="Business safety boundaries">
            <span>
              <LockKeyhole size={14} />
              No live CRM writes
            </span>
            <span>
              <ShieldCheck size={14} />
              Human approval required
            </span>
            <span>
              <CheckCircle2 size={14} />
              Real orders disabled
            </span>
          </div>
        </div>

        <div className="businessHeroVisual" aria-label="Lifecycle card workflow preview">
          <div className="businessPipeline">
            <span>CRM date</span>
            <span>Review</span>
            <span>Print proof</span>
          </div>
          <div className="businessPreviewGrid">
            <div className="businessQueueCard">
              <span>Next opportunity</span>
              <strong>Warranty thank-you for Priya N.</strong>
              <small>Needs approval · suppression checked · same-day pickup estimate ready</small>
            </div>
            <PanelArt className="businessPanelPreview" panel={draft.panels[0]} />
          </div>
        </div>
      </section>

      <section className="businessMetricGrid" aria-label="Business readiness summary">
        <BusinessMetric label="Lifecycle triggers" value={`${businessSummary.lifecycleTriggerKinds}`} />
        <BusinessMetric label="CRM contracts" value={`${businessSummary.crmAdapterContracts}`} />
        <BusinessMetric label="Workflow contracts" value={`${businessSummary.workflowAdapterContracts}`} />
        <BusinessMetric label="Live sends enabled" value={`${businessSummary.liveMessagesEnabled}`} />
      </section>

      <section className="businessSection" aria-label="Lifecycle card moments">
        <div className="businessSectionHead">
          <p className="eyebrow">Lifecycle campaigns</p>
          <h2>Moments B2B buyers expect</h2>
          <p>These are the card-worthy customer events the landing page should demonstrate without promising automation prematurely.</p>
        </div>
        <div className="businessMomentGrid">
          {lifecycleMoments.map((moment) => (
            <article className="businessMomentCard" key={moment.label}>
              <span>{moment.label}</span>
              <p>{moment.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="businessSection" aria-label="B2B landing page feature checklist">
        <div className="businessSectionHead">
          <p className="eyebrow">What this page needs</p>
          <h2>Features that make the B2B offer credible</h2>
          <p>
            The page should sell an approval-safe lifecycle card workflow, not a generic card maker or a production CRM
            integration claim.
          </p>
        </div>
        <div className="businessFeatureGrid">
          {neededFeatures.map((feature) => (
            <article className="businessFeatureCard" key={feature.title}>
              <span className="businessFeatureIcon">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="businessSection businessReadinessSection" aria-label="Business readiness boundaries">
        <div className="businessSectionHead">
          <p className="eyebrow">Evidence honest</p>
          <h2>Ready locally, gated for production</h2>
          <p>Each public claim should map to a readiness item, and every blocked production action should say why.</p>
        </div>
        <div className="businessReadinessList">
          {readinessCards.map((card) => (
            <article className="businessReadinessCard" data-status={card.status} key={card.label}>
              <span>{card.status.replace(/-/g, " ")}</span>
              <strong>{card.label}</strong>
              <p>{card.blocker}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="businessFinalCta" aria-label="Business final call to action">
        <div>
          <p className="eyebrow">Private review flow</p>
          <h2>Start with one approved lifecycle card.</h2>
          <p>
            Import or paste a customer moment, approve the card, and export the proof before connecting live CRM,
            messaging, or payment systems.
          </p>
        </div>
        <button className="btn btn-primary" onClick={onReview} type="button">
          Open review flow
          <ArrowRight size={16} />
        </button>
      </section>
    </section>
  );
}

function BusinessMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="businessMetric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
