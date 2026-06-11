import { ClipboardList, Download, ExternalLink, FileDown, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { CardPanel } from "../../src/customerWorkflow";
import type { PrinterPriceEstimate, PrinterPricingComparison } from "../../src/printerPricing";
import type { PrintExportPackage } from "../../src/printExport";
import {
  buildCheckoutCustomer,
  mergeCheckoutCustomerDefaults,
  updateCheckoutCustomerField,
  type CheckoutCustomerDefaults,
  type CheckoutCustomerField
} from "../checkoutModel";
import { createWalgreensCheckoutSession } from "../walgreensCheckoutAdapter";

const speedLabels: Record<string, string> = {
  "same-day": "Same-day pickup",
  "24-hour": "Ready in 24 hours",
  "ships-in-days": "Ships in a few days",
  "manual-confirm": "Ask in store"
};

export function PrintView({
  panels,
  checkoutCustomerDefaults,
  getCustomerApiToken,
  pricingComparison,
  printPackage,
  onDownloadPackage,
  onDownloadPanels,
  onCopyChecklist
}: {
  panels: CardPanel[];
  checkoutCustomerDefaults?: CheckoutCustomerDefaults;
  getCustomerApiToken?: () => Promise<string | undefined>;
  pricingComparison: PrinterPricingComparison;
  printPackage: PrintExportPackage;
  onDownloadPackage: () => void;
  onDownloadPanels: () => void;
  onCopyChecklist: () => void;
}) {
  const [checkoutCustomer, setCheckoutCustomer] = useState(() => buildCheckoutCustomer(checkoutCustomerDefaults));
  const [checkoutStatus, setCheckoutStatus] = useState<{
    tone: "ok" | "warn";
    title: string;
    detail: string;
    checkoutUrl?: string;
  } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
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
    if (!canUseWalgreensCheckout || checkoutLoading) return;
    setCheckoutLoading(true);
    setCheckoutStatus({
      tone: "warn",
      title: "Preparing Walgreens checkout",
      detail: "Converting your approved panels and asking CustomCard API for a hosted Walgreens checkout."
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
    } catch (error) {
      setCheckoutStatus({
        tone: "warn",
        title: "Hosted checkout unavailable",
        detail: error instanceof Error ? error.message : "Download the print package and upload it manually."
      });
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <>
      <header className="pagehead reveal">
        <h1>Checkout at Walgreens</h1>
        <p>Your approved card is ready for Walgreens crop review, pickup selection, and payment.</p>
      </header>

      <div className="print">
        <div className="printpane reveal reveal-1">
          <section className="panelcard printsection">
            <h2>Walgreens partner checkout</h2>
            <div className="partnercheckout">
              <div>
                <span>Partner</span>
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

          <section className="panelcard printsection">
            <h2>Save your card files</h2>
            <div className="downloadrow">
              <button
                className="btn btn-primary"
                disabled={!printPackage.manifest.passed}
                onClick={onDownloadPackage}
                type="button"
              >
                <Download size={16} />
                Save print package
              </button>
              <button className="btn btn-ghost" onClick={onDownloadPanels} type="button">
                <FileDown size={16} />
                Panels only
              </button>
              <button className="btn btn-ghost" onClick={onCopyChecklist} type="button">
                <ClipboardList size={16} />
                Copy checklist
              </button>
            </div>
            <span className="filemeta">
              {panels.length} print panels + combined PDF, sized for 5 × 7.
            </span>
          </section>
        </div>

        <div className="printpane reveal reveal-2">
          <section className="panelcard printsection">
            <h2>Walgreens checkout</h2>
            <div className="checkoutbox">
              <p>
                We send your approved card to Walgreens. You review the crop, choose the pickup store, confirm the total,
                and pay with Walgreens.
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
              <button
                className="btn btn-primary"
                disabled={!canUseWalgreensCheckout || checkoutLoading}
                onClick={openWalgreensCheckout}
                type="button"
              >
                {checkoutLoading ? "Preparing..." : "Continue to Walgreens"}
                <ExternalLink size={16} />
              </button>
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
