import type { CSSProperties } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileJson2,
  Inbox,
  LockKeyhole,
  PenLine,
  Printer,
  ShieldCheck,
  Workflow
} from "lucide-react";
import type { BusinessEngagementReadinessLane, BusinessEngagementReadinessStatus } from "../../src/businessEngagementReadiness";
import { businessEngagementReadinessItems, summarizeBusinessEngagementReadiness } from "../../src/businessEngagementReadiness";
import type { CardDraft } from "../../src/customerWorkflow";
import { PanelArt } from "../ui";

const summary = summarizeBusinessEngagementReadiness();
const totalCapabilities = businessEngagementReadinessItems.length;

const STATUS_META: Record<BusinessEngagementReadinessStatus, { label: string; tone: "ready" | "evidence" | "blocked" }> = {
  "repo-local-ready": { label: "Working now", tone: "ready" },
  "evidence-missing": { label: "Needs evidence", tone: "evidence" },
  "approval-blocked": { label: "Approval-blocked", tone: "blocked" }
};

const STATUS_ORDER: BusinessEngagementReadinessStatus[] = ["repo-local-ready", "evidence-missing", "approval-blocked"];

const LANE_LABEL: Record<BusinessEngagementReadinessLane, string> = {
  "crm-source": "CRM source",
  "crm-oauth": "CRM OAuth",
  "campaign-logic": "Campaign logic",
  "approval-queue": "Approval queue",
  "workflow-routing": "Workflow routing",
  "outreach-channels": "Outreach channels",
  compliance: "Compliance",
  "feedback-loop": "Feedback loop"
};

const readinessByStatus = [...businessEngagementReadinessItems].sort(
  (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
);

const pipeline = [
  {
    icon: <CalendarCheck2 size={18} />,
    name: "Customer date",
    detail: "Birthday, purchase, or warranty — from a CSV upload or a single pasted line."
  },
  {
    icon: <PenLine size={18} />,
    name: "Card draft",
    detail: "Deterministic copy and a 5×7 proof, ready to read and edit before anyone signs off."
  },
  {
    icon: <ClipboardCheck size={18} />,
    name: "Human review",
    detail: "Approve, edit, snooze, or suppress. Nothing advances on its own.",
    gate: true
  },
  {
    icon: <Printer size={18} />,
    name: "Print handoff",
    detail: "Approved proof, fulfillment estimate, and downloadable files."
  }
];

const moments = [
  {
    label: "Birthday",
    img: "/generated/card-birthday.webp",
    alt: "Birthday card front: warm candle-glow dots and a soft terracotta ribbon framing an open center.",
    detail: "A dated, personal hello — reviewed every time, never auto-sent."
  },
  {
    label: "Purchase anniversary",
    img: "/generated/card-thank-you.webp",
    alt: "Thank-you card front: a controlled citrus-and-sage corner illustration with open editorial space.",
    detail: "Thank a customer for a year, tied to their real purchase date."
  },
  {
    label: "Warranty anniversary",
    img: "/generated/card-default-botanical.webp",
    alt: "Botanical card front: a loose terracotta and sage branch wrapping a calm blank field.",
    detail: "A useful check-in moment, routed through approval first."
  }
];

const features = [
  {
    icon: <CalendarCheck2 size={18} />,
    title: "Lifecycle source",
    body: "CSV now, CRM OAuth later. See exactly where birthday, purchase, and warranty dates enter the system."
  },
  {
    icon: <ClipboardCheck size={18} />,
    title: "Human approval queue",
    body: "Review, edit, approve, snooze, and suppress are first-class actions — never implied automation."
  },
  {
    icon: <ShieldCheck size={18} />,
    title: "Consent & suppression",
    body: "Opt-in, no-contact, data deletion, and legal-review gates sit ahead of any delivery."
  },
  {
    icon: <Workflow size={18} />,
    title: "Workflow handoff",
    body: "Export payloads for Zapier, Make, Slack, and Sheets while live webhooks stay evidence-gated."
  },
  {
    icon: <FileJson2 size={18} />,
    title: "Print-ready packet",
    body: "Every opportunity ends in approved copy, a 5×7 proof, fulfillment estimates, and downloadable files."
  },
  {
    icon: <BarChart3 size={18} />,
    title: "Campaign feedback",
    body: "Analytics is framed as future evidence until live delivery, engagement, and retention proofs exist."
  }
];

function step(index: number): CSSProperties {
  return { "--i": index } as CSSProperties;
}

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
      <section className="bizHero" aria-label="Business landing hero">
        <div className="bizHeroCopy">
          <p className="bizKicker">
            <span className="bizKickerDot" aria-hidden="true" />
            For customer lifecycle teams
          </p>
          <h1>Send the right card on time.</h1>
          <p className="bizLede">
            CustomCard turns your customers&rsquo; real dates — birthdays, purchase and warranty anniversaries — into
            reviewed, print-ready greeting cards. A person approves every one before it prints. Nothing writes back to
            your CRM, and no card is sent on its own.
          </p>
          <div className="bizHeroActions">
            <button className="btn btn-primary" onClick={onReview} type="button">
              Review lifecycle queue
              <ArrowRight size={16} />
            </button>
            <button className="btn btn-ghost" onClick={onCreate} type="button">
              Create sample card
            </button>
          </div>
          <ul className="bizTrust" aria-label="Safety boundaries">
            <li>
              <LockKeyhole size={14} />
              No live CRM writes
            </li>
            <li>
              <ShieldCheck size={14} />
              Human approval required
            </li>
            <li>
              <CheckCircle2 size={14} />
              Real orders disabled
            </li>
          </ul>
        </div>

        <figure className="bizDevice" aria-label="A lifecycle queue feeding one print-ready proof">
          <figcaption className="bizDeviceTop">
            <span className="bizDeviceTitle">
              <Inbox size={15} />
              Lifecycle queue
            </span>
            <span className="bizDeviceTag">Preview</span>
          </figcaption>
          <ul className="bizQueue">
            <li className="bizQueueRow" data-state="review">
              <span className="bizQueueDot" aria-hidden="true" />
              <span className="bizQueueText">
                <strong>Warranty thank-you</strong>
                <small>Priya N. · suppression checked</small>
              </span>
              <span className="bizQueueState">Needs review</span>
            </li>
            <li className="bizQueueRow" data-state="approved">
              <span className="bizQueueDot" aria-hidden="true" />
              <span className="bizQueueText">
                <strong>Birthday</strong>
                <small>Theo M. · same-day pickup estimate</small>
              </span>
              <span className="bizQueueState">Approved</span>
            </li>
            <li className="bizQueueRow" data-state="snoozed">
              <span className="bizQueueDot" aria-hidden="true" />
              <span className="bizQueueText">
                <strong>Purchase anniversary</strong>
                <small>Dani R. · opt-in pending</small>
              </span>
              <span className="bizQueueState">Snoozed</span>
            </li>
          </ul>
          <div className="bizDeviceProof">
            <PanelArt className="bizProofArt" panel={draft.panels[0]} />
            <div className="bizProofMeta">
              <strong>5×7 proof</strong>
              <span>
                <CheckCircle2 size={13} />
                Approved for print
              </span>
            </div>
          </div>
        </figure>
      </section>

      <section className="bizFlow" aria-label="How a customer date becomes a reviewed card">
        <div className="bizSectionHead">
          <h2>How a date becomes a card.</h2>
          <p>Four steps. One of them is a person — and it can&rsquo;t be skipped.</p>
        </div>
        <ol className="bizFlowSteps">
          {pipeline.map((item, index) => (
            <li className="bizFlowStep" data-gate={item.gate ? "true" : undefined} key={item.name} style={step(index)}>
              <span className="bizFlowIcon">{item.icon}</span>
              <span className="bizFlowName">{item.name}</span>
              <span className="bizFlowDesc">{item.detail}</span>
              {item.gate ? <span className="bizFlowGate">Required gate</span> : null}
            </li>
          ))}
        </ol>
        <p className="bizFlowFoot">
          <Check size={15} />
          Every one of {totalCapabilities} capabilities requires human review. {summary.liveMessagesEnabled} cards are
          sent automatically.
        </p>
      </section>

      <section className="bizMoments" aria-label="Lifecycle moments worth a card">
        <div className="bizSectionHead">
          <h2>The moments worth a real card.</h2>
          <p>Three lifecycle triggers, shown with real CustomCard art — not stock sentiment.</p>
        </div>
        <div className="bizMomentRow">
          {moments.map((moment, index) => (
            <figure className="bizMoment" key={moment.label} style={step(index)}>
              <img
                className="bizMomentArt"
                src={moment.img}
                alt={moment.alt}
                loading="lazy"
                decoding="async"
                width={500}
                height={700}
              />
              <figcaption className="bizMomentCap">
                <strong>{moment.label}</strong>
                <span>{moment.detail}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="bizFeatures" aria-label="What makes the business offer credible">
        <div className="bizSectionHead">
          <h2>What makes the offer credible.</h2>
          <p>An approval-safe lifecycle card workflow — not a generic card maker, and not a production CRM integration claim.</p>
        </div>
        <div className="bizFeatureList">
          {features.map((feature, index) => (
            <article className="bizFeature" key={feature.title} style={step(index)}>
              <span className="bizFeatureIcon">{feature.icon}</span>
              <div className="bizFeatureBody">
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bizLedger" aria-label="Readiness: ready locally, gated for production">
        <div className="bizSectionHead">
          <h2>Ready locally. Gated for production.</h2>
          <p>
            Every public claim maps to a readiness item. Where production still needs proof we haven&rsquo;t gathered, we
            say so — out loud.
          </p>
        </div>
        <div className="bizLedgerLegend">
          <span className="bizLegendItem" data-tone="ready">
            <span className="bizDot" aria-hidden="true" />
            {summary.repoLocalReady} working now
          </span>
          <span className="bizLegendItem" data-tone="evidence">
            <span className="bizDot" aria-hidden="true" />
            {summary.evidenceMissing} need evidence
          </span>
          <span className="bizLegendItem" data-tone="blocked">
            <span className="bizDot" aria-hidden="true" />
            {summary.approvalBlocked} approval-blocked
          </span>
        </div>
        <ul className="bizLedgerRows">
          {readinessByStatus.map((item, index) => {
            const meta = STATUS_META[item.status];
            return (
              <li className="bizLedgerRow" data-tone={meta.tone} key={item.id} style={step(index)}>
                <div className="bizLedgerHead">
                  <span className="bizLedgerStatus" data-tone={meta.tone}>
                    <span className="bizDot" aria-hidden="true" />
                    {meta.label}
                  </span>
                  <strong className="bizLedgerName">{item.label}</strong>
                  <span className="bizLedgerLane">{LANE_LABEL[item.lane]}</span>
                </div>
                <dl className="bizLedgerEvidence">
                  <div className="bizEvidence" data-kind="now">
                    <dt>Working now</dt>
                    <dd>{item.currentEvidence.join(" · ")}</dd>
                  </div>
                  <div className="bizEvidence" data-kind="need">
                    <dt>Still required</dt>
                    <dd>{item.requiredEvidence.join(" · ")}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
        <p className="bizLedgerFoot">
          <ShieldCheck size={15} />
          {summary.humanReviewRequired} of {totalCapabilities} capabilities require human review · {summary.crmAdapterContracts} CRM,{" "}
          {summary.workflowAdapterContracts} workflow, and {summary.notificationAdapterContracts} channel contracts mapped ·{" "}
          {summary.liveMessagesEnabled} live sends
        </p>
      </section>

      <section className="bizFinal" aria-label="Business final call to action">
        <div className="bizFinalCopy">
          <h2>Start with one approved lifecycle card.</h2>
          <p>
            Import or paste a customer moment, approve the card, and export the proof — before connecting live CRM,
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
