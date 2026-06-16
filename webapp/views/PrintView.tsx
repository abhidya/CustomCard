import { CheckCircle2, ClipboardList, Download, ExternalLink, FileDown, Pencil, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { CardPanel } from "../../src/customerWorkflow";
import { PanelArt } from "../ui";
import type { PrinterPricingComparison } from "../../src/printerPricing";
import type { PrintExportPackage } from "../../src/printExport";
import {
  emptyProofChecklistState,
  isProofApproved,
  proofApprovalProgressLabel,
  proofChecklistItems,
  toggleProofChecklistItem,
  type ProofChecklistState
} from "../proofApproval";

const speedLabels: Record<string, string> = {
  "same-day": "Same-day pickup",
  "24-hour": "Ready in 24 hours",
  "ships-in-days": "Ships in a few days",
  "manual-confirm": "Ask in store"
};

export function PrintView({
  panels,
  proofSignature,
  pricingComparison,
  printPackage,
  onCardEvent,
  onBackToDesign,
  onDownloadPackage,
  onDownloadPanels,
  onCopyChecklist,
  manualUploadSteps
}: {
  panels: CardPanel[];
  /** Signature of everything that would print (text, art, layout, image, fit); any change resets approval. */
  proofSignature: string;
  pricingComparison: PrinterPricingComparison;
  printPackage: PrintExportPackage;
  onCardEvent?: (status: "ready-to-print") => void;
  onBackToDesign?: () => void;
  onDownloadPackage: () => void | Promise<void>;
  onDownloadPanels: () => void | Promise<void>;
  onCopyChecklist: () => void;
  manualUploadSteps: string[];
}) {
  const [proofChecklist, setProofChecklist] = useState<ProofChecklistState>(emptyProofChecklistState);
  const [showTrimGuides, setShowTrimGuides] = useState(false);
  const [emittedReadyProofSignature, setEmittedReadyProofSignature] = useState("");
  const overflowPanels = panels.filter((candidate) => candidate.overflowRisk);
  const rtlReview = panels.some((candidate) => candidate.rtl);
  const approvalBlocked = overflowPanels.length > 0 || panels.length < 4;
  const proofApproved = isProofApproved(proofChecklist) && !approvalBlocked;
  // The four per-panel review checks live on the panels themselves (review next to
  // its object); names / crop / final approval are the closing gate below.
  const finalApprovalItems = proofChecklistItems.filter((item) => !item.id.startsWith("panel-"));
  useEffect(() => {
    setProofChecklist(emptyProofChecklistState);
  }, [proofSignature]);
  // Real lifecycle events: status history is driven by what actually happened.
  useEffect(() => {
    if (!proofApproved) {
      setEmittedReadyProofSignature((current) => (current ? "" : current));
      return;
    }
    if (emittedReadyProofSignature === proofSignature) return;
    onCardEvent?.("ready-to-print");
    setEmittedReadyProofSignature(proofSignature);
  }, [emittedReadyProofSignature, onCardEvent, proofApproved, proofSignature]);
  const recommendedEstimate = pricingComparison.rankedKnownPrices[0];
  const recommendedOption = pricingComparison.selectedVendorOptions.find(
    (option) => option.observation.vendorId === recommendedEstimate?.observation.vendorId
  );
  const selectedCoupon =
    recommendedOption &&
    (recommendedOption.couponApplication.status === "applied" ||
      recommendedOption.couponApplication.status === "portal-evidence-required")
      ? recommendedOption.couponApplication.offer
      : undefined;
  const recommendedVendorName = recommendedEstimate?.observation.vendorName ?? "Your print shop";
  const recommendedUploadUrl = recommendedEstimate?.observation.source.url;
  const recommendedPickupLabel = recommendedEstimate
    ? speedLabels[recommendedEstimate.observation.speed] ?? recommendedEstimate.observation.speed
    : "Confirm with the print shop";

  return (
    <>
      <header className="pagehead reveal">
        <h1>Finish at a print shop</h1>
        <p>Approve your proof, then download the print package and upload it to your preferred print shop.</p>
        {onBackToDesign ? (
          <button className="backlink" onClick={onBackToDesign} type="button">
            ← Back to design
          </button>
        ) : null}
      </header>

      <div className="print">
        <div className="printpane reveal reveal-2">
          <section className="panelcard printsection">
            <h2>Print-shop details</h2>
            <img
              alt="Printed card panels and print-shop package preview"
              className="printHandoffFulfillmentImage"
              decoding="async"
              loading="lazy"
              src="/generated/print-handoff-fulfillment.webp"
            />
            <div className="partnercheckout">
              <div>
                <span>Best available option</span>
                <strong>{recommendedVendorName}</strong>
              </div>
              <div>
                <span>Card</span>
                <strong>5 × 7 folded</strong>
              </div>
              <div>
                <span>Estimated price</span>
                <strong>{recommendedEstimate?.effectiveSubtotalLabel ?? "Confirmed by print shop"}</strong>
              </div>
              <div>
                <span>Pickup</span>
                <strong>{recommendedPickupLabel}</strong>
              </div>
            </div>
            {selectedCoupon && recommendedOption ? (
              <div className="coupon">
                <span className="couponcode">{selectedCoupon.code}</span>
                <div>
                  <strong>{selectedCoupon.discountPercent}% off card products</strong>
                  <small>
                    Enter it at {recommendedVendorName} by {selectedCoupon.endsAtIso.slice(0, 10)} — the shop applies the final discount.
                  </small>
                </div>
              </div>
            ) : null}
            <p>{recommendedVendorName} confirms the final total, crop, pickup details, and payment before you place an order.</p>
          </section>

          <details className="panelcard printsection printsection-manual moreoptions">
            <summary>Download print files</summary>
            <h2>Print file package</h2>
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
              {recommendedUploadUrl ? (
                <a className="btn btn-ghost" href={recommendedUploadUrl} rel="noreferrer" target="_blank">
                  Open print shop
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
              <div className="proofgridHeadActions">
                {onBackToDesign ? (
                  <button className="btn btn-ghost btn-sm" onClick={onBackToDesign} type="button">
                    <Pencil size={14} />
                    Edit card
                  </button>
                ) : null}
                <button
                  aria-pressed={showTrimGuides}
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowTrimGuides((current) => !current)}
                  type="button"
                >
                  Show trim / safe area
                </button>
              </div>
            </div>
            <p>All four panels of your 5 × 7 folded card, exactly as they print. Confirm each one as you review it.</p>
            <div className="proofpanels" data-trim={showTrimGuides}>
              {panels.map((panel) => {
                const reviewItem = proofChecklistItems.find((item) => item.id === `panel-${panel.id}`);
                const reviewed = reviewItem ? proofChecklist[reviewItem.id] === true : false;
                return (
                  <figure className="proofpanel" data-overflow={panel.overflowRisk} data-reviewed={reviewed} key={panel.id}>
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
                    {reviewItem ? (
                      <label className="proofcheck proofcheck-panel" data-on={reviewed}>
                        <input
                          aria-label={reviewItem.label}
                          checked={reviewed}
                          onChange={() => setProofChecklist((current) => toggleProofChecklistItem(current, reviewItem.id))}
                          type="checkbox"
                        />
                        <span>{reviewItem.label}</span>
                      </label>
                    ) : null}
                  </figure>
                );
              })}
            </div>
            {showTrimGuides ? (
              <small className="filemeta">Guides are preview-only — they never appear in the printed card or the saved files.</small>
            ) : null}
          </section>

          <section className="panelcard printsection proofapproval" data-approved={proofApproved} aria-label="Proof approval">
            <div className="proofapprovalHead">
              <h2>Approve your proof</h2>
              <span className="proofprogress" data-approved={proofApproved} aria-live="polite">
                <CheckCircle2 size={16} />
                {proofApprovalProgressLabel(proofChecklist)}
              </span>
            </div>
            <p>What you see in the panels above is exactly what prints. Confirm the last details, then approve.</p>
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
              {finalApprovalItems.map((item) => (
                <label
                  className="proofcheck"
                  data-approve={item.id === "approve" ? true : undefined}
                  data-on={proofChecklist[item.id] === true}
                  key={item.id}
                >
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
          </section>

          <section className="panelcard printsection">
            <h2>Print-shop package</h2>
            <div className="checkoutbox">
              <p>
                CustomCard prepares your approved files. You choose the print shop, confirm the final price, and place the order yourself.
              </p>
              <button
                className="btn btn-primary"
                disabled={!printPackage.manifest.passed || !proofApproved}
                onClick={() => void onDownloadPackage()}
                type="button"
              >
                Download print package
                <Download size={16} />
              </button>
              {!proofApproved ? (
                <span className="checkouthint">Finish the proof approval checklist to unlock the print-shop package.</span>
              ) : null}
            </div>
            <div className="trustline" aria-label="Print-shop payment status">
              <ShieldCheck size={16} />
              You pay the print shop directly. CustomCard does not collect card details.
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
