import { ClipboardList, Download, ExternalLink, FileDown, ShieldCheck } from "lucide-react";
import type { CardPanel, VendorHandoff, VendorId } from "../../src/freeMvp";
import type { PrinterPriceEstimate, PrinterPricingComparison } from "../../src/printerPricing";
import type { PrintExportPackage } from "../../src/printExport";
import { getRetailPrinterProductLink, type RetailPrinterVendorId } from "../../src/retailPrinterAdapters";
import { buildRetailPrinterOperationStartPackets } from "../../src/retailPrinterOperationStart";

const vendors: VendorId[] = ["walgreens", "cvs", "fedex", "walmart", "staples", "office-depot", "local-print-shop"];

const vendorLabels: Record<VendorId, string> = {
  walgreens: "Walgreens",
  cvs: "CVS",
  fedex: "FedEx Office",
  walmart: "Walmart",
  staples: "Staples",
  "office-depot": "Office Depot",
  "local-print-shop": "Local print shop"
};

const speedLabels: Record<string, string> = {
  "same-day": "Same-day pickup",
  "24-hour": "Ready in 24 hours",
  "ships-in-days": "Ships in a few days",
  "manual-confirm": "Ask in store"
};

const operationCopy: Record<string, { label: string; detail: string }> = {
  "fetch-price": { label: "Check the price", detail: "Confirm price, pickup time, and any discount code in their cart." },
  "upload-image": { label: "Upload your card", detail: "Use the downloaded files and check crop, fold, and preview." },
  "place-order": { label: "Place the order", detail: "Review everything once more, then pay at the store's checkout." }
};

const operationOrder = ["fetch-price", "upload-image", "place-order"];

const startPackets = buildRetailPrinterOperationStartPackets();

function toRetailVendorId(vendorId: VendorId): RetailPrinterVendorId | undefined {
  if (vendorId === "walmart" || vendorId === "fedex" || vendorId === "cvs" || vendorId === "walgreens") return vendorId;
  return undefined;
}

export function PrintView({
  vendorId,
  panels,
  handoff,
  pricingComparison,
  printPackage,
  onVendor,
  onDownloadPackage,
  onDownloadPanels,
  onCopyChecklist
}: {
  vendorId: VendorId;
  panels: CardPanel[];
  handoff: VendorHandoff;
  pricingComparison: PrinterPricingComparison;
  printPackage: PrintExportPackage;
  onVendor: (vendorId: VendorId) => void;
  onDownloadPackage: () => void;
  onDownloadPanels: () => void;
  onCopyChecklist: () => void;
}) {
  const estimateByVendor = new Map<VendorId, PrinterPriceEstimate>();
  for (const estimate of pricingComparison.rankedKnownPrices) {
    if (!estimateByVendor.has(estimate.observation.vendorId)) {
      estimateByVendor.set(estimate.observation.vendorId, estimate);
    }
  }

  const selected = pricingComparison.selectedVendorOptions[0];
  const selectedCoupon =
    selected &&
    (selected.couponApplication.status === "applied" || selected.couponApplication.status === "portal-evidence-required")
      ? selected.couponApplication.offer
      : undefined;

  const retailVendorId = toRetailVendorId(vendorId);
  const storeUrl = retailVendorId ? getRetailPrinterProductLink(retailVendorId).productUrl : undefined;
  const steps = retailVendorId
    ? startPackets
        .filter((packet) => packet.vendorId === retailVendorId)
        .sort((a, b) => operationOrder.indexOf(a.operation) - operationOrder.indexOf(b.operation))
    : [];

  return (
    <>
      <header className="pagehead reveal">
        <h1>Print it nearby</h1>
        <p>Pick a print shop, download your card, and have it in hand today.</p>
      </header>

      <div className="print">
        <div className="printpane reveal reveal-1">
          <section className="panelcard printsection">
            <h2>Choose a print shop</h2>
            <div className="vendorgrid">
              {vendors.map((candidate) => {
                const estimate = estimateByVendor.get(candidate);
                return (
                  <button
                    className="vendor"
                    data-on={candidate === vendorId}
                    key={candidate}
                    onClick={() => onVendor(candidate)}
                    type="button"
                  >
                    <span className="vendor-name">{vendorLabels[candidate]}</span>
                    {estimate ? (
                      <>
                        <span className="vendor-price">{estimate.effectiveSubtotalLabel}</span>
                        <span className="vendor-eta">{speedLabels[estimate.observation.speed] ?? estimate.observation.speed}</span>
                      </>
                    ) : (
                      <span className="vendor-price" data-quote="true">
                        Quote at store
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedCoupon && selected ? (
              <div className="coupon">
                <span className="couponcode">{selectedCoupon.code}</span>
                <div>
                  <strong>{selectedCoupon.discountPercent}% off card products</strong>
                  <small>
                    Enter it at {selected.observation.vendorName} checkout by {selectedCoupon.endsAtIso.slice(0, 10)} — the
                    store applies the final discount.
                  </small>
                </div>
              </div>
            ) : null}
            <p>Estimates from public store pricing — the store confirms the final total at checkout.</p>
          </section>

          <section className="panelcard printsection">
            <h2>Download your card</h2>
            <div className="downloadrow">
              <button
                className="btn btn-primary"
                disabled={!printPackage.manifest.passed}
                onClick={onDownloadPackage}
                type="button"
              >
                <Download size={16} />
                Download print package
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
              {panels.length} print panels + combined PDF, sized for 5 × 7 — exactly what the store upload page expects.
            </span>
          </section>
        </div>

        <div className="printpane reveal reveal-2">
          <section className="panelcard printsection">
            <h2>Print at {handoff.vendorName}</h2>
            {steps.length > 0 ? (
              <div className="storesteps">
                {steps.map((packet, index) => {
                  const copy = operationCopy[packet.operation];
                  return (
                    <a className="storestep" href={packet.providerPortalUrl} key={packet.id} rel="noreferrer" target="_blank">
                      <span className="storestep-num">{index + 1}</span>
                      <span>
                        <strong>{copy?.label ?? packet.operation}</strong>
                        <small>{copy?.detail}</small>
                      </span>
                      <ExternalLink className="storestep-ext" size={15} />
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="storesteps">
                {handoff.checklist.slice(0, 4).map((item, index) => (
                  <div className="storestep" key={item}>
                    <span className="storestep-num">{index + 1}</span>
                    <span>
                      <strong>{item}</strong>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {storeUrl ? (
              <a className="textlink" href={storeUrl} rel="noreferrer" target="_blank">
                Open {handoff.vendorName} card printing
              </a>
            ) : null}
            <div className="trustline">
              <ShieldCheck size={16} />
              You review and pay at the print shop — CustomCard never charges you or places orders.
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
