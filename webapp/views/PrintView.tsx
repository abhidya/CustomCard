import { CheckCircle2, ClipboardList, Download, ExternalLink, FileDown, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CardPanel } from "../../src/customerWorkflow";
import { PanelArt } from "../ui";
import type { PrinterPriceEstimate, PrinterPricingComparison } from "../../src/printerPricing";
import type { PrintExportPackage } from "../../src/printExport";
import {
  buildCheckoutCustomer,
  mergeCheckoutCustomerDefaults,
  updateCheckoutCustomerField,
  validateCheckoutCustomer,
  type CheckoutCustomerDefaults,
  type CheckoutCustomerField
} from "../checkoutModel";
import {
  emptyProofChecklistState,
  isProofApproved,
  proofApprovalProgressLabel,
  proofChecklistItems,
  toggleProofChecklistItem,
  type ProofChecklistState
} from "../proofApproval";
import { createWalgreensCheckoutSession } from "../walgreensCheckoutAdapter";

const speedLabels: Record<string, string> = {
  "same-day": "Same-day pickup",
  "24-hour": "Ready in 24 hours",
  "ships-in-days": "Ships in a few days",
  "manual-confirm": "Ask in store"
};

export function PrintView({
  panels,
  proofSignature,
  checkoutCustomerDefaults,
  getCustomerApiToken,
  pricingComparison,
  printPackage,
  onCardEvent,
  onDownloadPackage,
  onDownloadPanels,
  onCopyChecklist,
  manualUploadSteps
}: {
  panels: CardPanel[];
  /** Signature of everything that would print (text, art, layout, image, fit); any change resets approval. */
  proofSignature: string;
  checkoutCustomerDefaults?: CheckoutCustomerDefaults;
  getCustomerApiToken?: () => Promise<string | undefined>;
  pricingComparison: PrinterPricingComparison;
  printPackage: PrintExportPackage;
  onCardEvent?: (status: "ready-to-print" | "walgreens-checkout-started" | "returned-from-walgreens") => void;
  onDownloadPackage: () => void | Promise<void>;
  onDownloadPanels: () => void | Promise<void>;
  onCopyChecklist: () => void;
  manualUploadSteps: string[];
}) {
  const [checkoutCustomer, setCheckoutCustomer] = useState(() => buildCheckoutCustomer(checkoutCustomerDefaults));
  const [checkoutStatus, setCheckoutStatus] = useState<{
    tone: "ok" | "warn";
    title: string;
    detail: string;
    checkoutUrl?: string;
  } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [proofChecklist, setProofChecklist] = useState<ProofChecklistState>(emptyProofChecklistState);
  const [showFieldIssues, setShowFieldIssues] = useState(false);
  const [showTrimGuides, setShowTrimGuides] = useState(false);
  const onCardEventRef = useRef(onCardEvent);
  const overflowPanels = panels.filter((candidate) => candidate.overflowRisk);
  const rtlReview = panels.some((candidate) => candidate.rtl);
  const approvalBlocked = overflowPanels.length > 0 || panels.length < 4;
  const proofApproved = isProofApproved(proofChecklist) && !approvalBlocked;
  const fieldIssues = validateCheckoutCustomer(checkoutCustomer);
  useEffect(() => {
    onCardEventRef.current = onCardEvent;
  }, [onCardEvent]);
  useEffect(() => {
    setProofChecklist(emptyProofChecklistState);
  }, [proofSignature]);
  // Real lifecycle events: status history is driven by what actually happened.
  useEffect(() => {
    if (proofApproved) onCardEventRef.current?.("ready-to-print");
  }, [proofApproved]);
  useEffect(() => {
    function onWalgreensReturn(event: MessageEvent) {
      const source = (event.data as { source?: string } | undefined)?.source ?? "";
      if (source === "customcard-walgreens-checkout") {
        onCardEventRef.current?.("returned-from-walgreens");
      }
    }
    window.addEventListener("message", onWalgreensReturn);
    return () => window.removeEventListener("message", onWalgreensReturn);
  }, []);
  const estimateByVendor = new Map<string, PrinterPriceEstimate>();
  for (const estimate of pricingComparison.rankedKnownPrices) {
    if (!estimateByVendor.has(estimate.observation.vendorId)) {
      estimateByVendor.set(estimate.observation.vendorId, estimate);
    }
  }

  const walgreensEstimate = estimateByVendor.get("walgreens");
  const walgreensOption = pricingComparison.selectedVendorOptions.find((option) => option.observation.vendorId === "walgreens");
  const selectedCoupon =
    walgreensOption &&
    (walgreensOption.couponApplication.status === "applied" || walgreensOption.couponApplication.status === "portal-evidence-required")
      ? walgreensOption.couponApplication.offer
      : undefined;
  const canUseWalgreensCheckout = printPackage.manifest.passed;
  const walgreensUploadUrl = walgreensEstimate?.observation.source.url;

  useEffect(() => {
    setCheckoutCustomer((current) => mergeCheckoutCustomerDefaults(current, checkoutCustomerDefaults));
  }, [
    checkoutCustomerDefaults?.email,
    checkoutCustomerDefaults?.firstName,
    checkoutCustomerDefaults?.lastName,
    checkoutCustomerDefaults?.name,
    checkoutCustomerDefaults?.phone
  ]);

  function updateCheckoutCustomer(field: CheckoutCustomerField, value: string) {
    setCheckoutCustomer((current) => updateCheckoutCustomerField(current, field, value));
  }

  async function openWalgreensCheckout() {
    if (!canUseWalgreensCheckout || !proofApproved || checkoutLoading) return;
    if (fieldIssues.length > 0) {
      setShowFieldIssues(true);
      return;
    }
    setCheckoutLoading(true);
    setCheckoutStatus({
      tone: "warn",
      title: "Preparing Walgreens checkout",
      detail: "Getting your card ready for Walgreens…"
    });

    try {
      const session = await createWalgreensCheckoutSession({
        checkoutCustomer,
        getCustomerApiToken,
        panels,
        printPackage
      });

      const popup = window.open(
        session.checkoutUrl,
        "customcard-walgreens-checkout",
        `popup=yes,width=${session.window?.width ?? 540},height=${session.window?.height ?? 620}`
      );
      if (!popup) {
        window.location.assign(session.checkoutUrl);
      }
      setCheckoutStatus({
        tone: "ok",
        title: "Walgreens checkout opened",
        detail: "Review store, price, crop, pickup, terms, and payment inside Walgreens before placing the order.",
        checkoutUrl: session.checkoutUrl
      });
      onCardEvent?.("walgreens-checkout-started");
    } catch (error) {
      setCheckoutStatus({
        tone: "warn",
        title: "Walgreens checkout didn't open",
        detail:
          "We couldn't open Walgreens checkout. Your card is safe — try again, or download the print package below and upload it at walgreens.com."
      });
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <>
      <header className="pagehead reveal">
        <h1>Print at Walgreens</h1>
        <p>Approve your proof, then continue to Walgreens — they handle the store, the payment, and the pickup.</p>
      </header>

      <div className="print">
        <div className="printpane reveal reveal-2">
          <section className="panelcard printsection">
            <h2>Walgreens print details</h2>
            <img
              alt="Printed card panels and Walgreens handoff preview"
              className="printHandoffFulfillmentImage"
              decoding="async"
              loading="lazy"
              src="/generated/print-handoff-fulfillment.webp"
            />
            <div className="partnercheckout">
              <div>
                <span>Printed by</span>
                <strong>Walgreens</strong>
              </div>
              <div>
                <span>Card</span>
                <strong>5 × 7 folded</strong>
              </div>
              <div>
                <span>Estimated price</span>
                <strong>{walgreensEstimate?.effectiveSubtotalLabel ?? "Confirmed at checkout"}</strong>
              </div>
              <div>
                <span>Pickup</span>
                <strong>{walgreensEstimate ? speedLabels[walgreensEstimate.observation.speed] ?? walgreensEstimate.observation.speed : "Choose at Walgreens"}</strong>
              </div>
            </div>
            {selectedCoupon && walgreensOption ? (
              <div className="coupon">
                <span className="couponcode">{selectedCoupon.code}</span>
                <div>
                  <strong>{selectedCoupon.discountPercent}% off card products</strong>
                  <small>
                    Enter it at Walgreens checkout by {selectedCoupon.endsAtIso.slice(0, 10)} — the
                    store applies the final discount.
                  </small>
                </div>
              </div>
            ) : null}
            <p>Walgreens confirms the final total, crop, pickup store, and payment before the order is placed.</p>
          </section>

          <details className="panelcard printsection printsection-manual moreoptions">
            <summary>Having trouble? More options</summary>
            <h2>Manual Walgreens upload</h2>
            <p>Save one package with ready-to-upload images, a PDF proof, and step-by-step upload instructions.</p>
            <div className="downloadrow">
              <button
                className="btn btn-primary"
                disabled={!printPackage.manifest.passed}
                onClick={() => void onDownloadPackage()}
                type="button"
              >
                <Download size={16} />
                Save print package
              </button>
              <button className="btn btn-ghost" onClick={() => void onDownloadPanels()} type="button">
                <FileDown size={16} />
                Save upload panels
              </button>
              {walgreensUploadUrl ? (
                <a className="btn btn-ghost" href={walgreensUploadUrl} rel="noreferrer" target="_blank">
                  Open Walgreens upload
                  <ExternalLink size={16} />
                </a>
              ) : null}
              <button className="btn btn-ghost" onClick={onCopyChecklist} type="button">
                <ClipboardList size={16} />
                Copy steps
              </button>
            </div>
            <ol className="manualsteps">
              {manualUploadSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <span className="filemeta">
              {panels.length} ready-to-upload images + a combined PDF, sized for 5 × 7.
            </span>
          </details>
        </div>

        <div className="printpane printpane-primary reveal reveal-1">
          <section className="panelcard printsection proofgrid" aria-label="Print proof panels">
            <div className="proofgridHead">
              <h2>Your print proof</h2>
              <button
                aria-pressed={showTrimGuides}
                className="btn btn-ghost btn-sm"
                onClick={() => setShowTrimGuides((current) => !current)}
                type="button"
              >
                Show trim / safe area
              </button>
            </div>
            <p>All four panels of your 5 × 7 folded card, exactly as they print.</p>
            <div className="proofpanels" data-trim={showTrimGuides}>
              {panels.map((panel) => (
                <figure className="proofpanel" data-overflow={panel.overflowRisk} key={panel.id}>
                  <div className="proofpanelFrame">
                    <PanelArt panel={panel} />
                    {showTrimGuides ? (
                      <span aria-hidden="true" className="proofTrimOverlay">
                        <i className="proofTrimLine" />
                        <i className="proofSafeLine" />
                      </span>
                    ) : null}
                  </div>
                  <figcaption>
                    <strong>{panel.label}</strong>
                    {panel.overflowRisk ? <small className="proofpanelWarn">Too much text</small> : null}
                  </figcaption>
                </figure>
              ))}
            </div>
            {showTrimGuides ? (
              <small className="filemeta">Guides are preview-only — they never appear in the printed card or the saved files.</small>
            ) : null}
          </section>

          <section className="panelcard printsection proofapproval" aria-label="Proof approval checklist">
            <h2>Approve your proof</h2>
            <p>This page is the print proof — what you see in the panels is exactly what prints. Check every line before checkout.</p>
            {overflowPanels.length > 0 ? (
              <div className="proofwarning" role="alert">
                Text may not fit on: {overflowPanels.map((candidate) => candidate.label).join(", ")}. Shorten it in the
                studio before approving.
              </div>
            ) : null}
            {rtlReview ? (
              <div className="proofwarning proofwarning-info" role="note">
                This card uses right-to-left text. Review every panel carefully before approving.
              </div>
            ) : null}
            <div className="proofchecklist">
              {proofChecklistItems.map((item) => (
                <label className="proofcheck" key={item.id}>
                  <input
                    aria-label={item.label}
                    checked={proofChecklist[item.id] === true}
                    onChange={() => setProofChecklist((current) => toggleProofChecklistItem(current, item.id))}
                    type="checkbox"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <div className="proofprogress" data-approved={proofApproved} aria-live="polite">
              <CheckCircle2 size={16} />
              {proofApprovalProgressLabel(proofChecklist)}
            </div>
          </section>

          <section className="panelcard printsection">
            <h2>Send to Walgreens</h2>
            <div className="checkoutbox">
              <p>
                Walgreens handles product selection, store pickup, terms, payment, and final order. CustomCard prepares
                your approved print files.
              </p>
              <div className="checkoutgrid">
                <label>
                  <span>First name</span>
                  <input
                    autoComplete="given-name"
                    onChange={(event) => updateCheckoutCustomer("firstName", event.target.value)}
                    value={checkoutCustomer.firstName}
                  />
                </label>
                <label>
                  <span>Last name</span>
                  <input
                    autoComplete="family-name"
                    onChange={(event) => updateCheckoutCustomer("lastName", event.target.value)}
                    value={checkoutCustomer.lastName}
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    autoComplete="email"
                    inputMode="email"
                    onChange={(event) => updateCheckoutCustomer("email", event.target.value)}
                    value={checkoutCustomer.email}
                  />
                </label>
                <label>
                  <span>Phone</span>
                  <input
                    autoComplete="tel"
                    inputMode="tel"
                    onChange={(event) => updateCheckoutCustomer("phone", event.target.value)}
                    placeholder="10 digits"
                    value={checkoutCustomer.phone}
                  />
                </label>
              </div>
              {showFieldIssues && fieldIssues.length > 0 ? (
                <ul className="checkoutissues" aria-live="polite">
                  {fieldIssues.map((issue) => (
                    <li key={issue.field}>{issue.message}</li>
                  ))}
                </ul>
              ) : null}
              <button
                className="btn btn-primary"
                disabled={!canUseWalgreensCheckout || !proofApproved || checkoutLoading}
                onClick={openWalgreensCheckout}
                type="button"
              >
                {checkoutLoading ? "Preparing..." : "Continue to Walgreens"}
                <ExternalLink size={16} />
              </button>
              {!proofApproved ? (
                <span className="checkouthint">Finish the proof approval checklist to unlock Walgreens checkout.</span>
              ) : null}
              {checkoutStatus ? (
                <div className={`checkoutstatus checkoutstatus-${checkoutStatus.tone}`} aria-live="polite">
                  <strong>{checkoutStatus.title}</strong>
                  <span>{checkoutStatus.detail}</span>
                  {checkoutStatus.checkoutUrl ? (
                    <a href={checkoutStatus.checkoutUrl} rel="noreferrer" target="_blank">
                      Reopen Walgreens
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="trustline" aria-label="Checkout status">
              <ShieldCheck size={16} />
              Walgreens handles payment. CustomCard does not collect card details.
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
