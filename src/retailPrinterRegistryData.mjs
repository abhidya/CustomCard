export const retailPrinterRegistryLinkObservedAtIso = "2026-06-07T12:00:00.000Z";
export const retailPrinterRegistryRequiredVendorIds = ["walmart", "fedex", "cvs", "walgreens"];
export const retailPrinterRegistryOperationKinds = ["fetch-price", "upload-image", "place-order"];

export const retailPrinterRegistryProductLinks = {
  walmart: {
    vendorId: "walmart",
    providerAdapterId: "walmart-live-print",
    vendorName: "Walmart Photo",
    productName: "5x7 folded card, blank envelope - upload your design",
    productSku: "361-5x7-folded-card-blank-envelope",
    productUrl:
      "https://photos3.walmart.com/category/725-5x7-photo-upload-cards?product=361-5x7-folded-card-blank-envelope&theme=wmcards-WMT.themepack%3Awmt_custom_5x7.card&design_code=standard.custom&selected_delivery_options=2",
    pricingObservationId: "walmart-5x7-same-day-folded-card",
    requiredUrlTokens: [
      "product=361-5x7-folded-card-blank-envelope",
      "theme=wmcards-WMT.themepack%3Awmt_custom_5x7.card",
      "design_code=standard.custom",
      "selected_delivery_options=2"
    ],
    operationEvidence: {
      "fetch-price": operationEvidence(
        "Photo Upload 5x7 Folded Card, Blank Envelope | Walmart Photo",
        [
          "Photo Upload 5x7 Folded Card",
          "$0.56",
          "361-5x7-folded-card-blank-envelope",
          "selected_delivery_options=2"
        ],
        ["current unit price", "selected pickup store or ZIP", "tax and coupon status"]
      ),
      "upload-image": operationEvidence(
        "Photo Upload 5x7 Folded Card, Blank Envelope | Walmart Photo",
        ["Upload Photos", "design_code=standard.custom", "wmcards-WMT.themepack%3Awmt_custom_5x7.card"],
        ["approved print-ready files accepted", "provider preview screenshot", "fold and crop state"]
      ),
      "place-order": operationEvidence(
        "Photo Upload 5x7 Folded Card, Blank Envelope | Walmart Photo",
        ["Photo Cart", "Sign In", "selected_delivery_options=2"],
        ["provider cart id", "final pickup commitment", "customer final approval before order"]
      )
    },
    portalHost: "photos3.walmart.com",
    minimumQuantity: 1,
    quantityIncrement: 1,
    supportedFulfillmentModes: ["pickup"],
    providerAccountMode: "guest-or-customer-account",
    acceptedArtifactKinds: ["combined-pdf-proof", "svg-panel-set", "print-ready-image-files"],
    uploadPreflightChecks: ["approved render packet", "5x7 folded-card design selected", "blank envelope product selected"],
    candidateOfferCodes: [],
    portalApplicationPacketIds: []
  },
  fedex: {
    vendorId: "fedex",
    providerAdapterId: "fedex-live-print",
    vendorName: "FedEx Office",
    productName: "Quick greeting and holiday cards",
    productSku: "fedex-office-quick-greeting-cards",
    productUrl: "https://www.office.fedex.com/default/greeting-cards-quick.html",
    pricingObservationId: "fedex-quick-5x7-single-sided-card",
    requiredUrlTokens: ["/default/greeting-cards-quick.html"],
    operationEvidence: {
      "fetch-price": operationEvidence(
        "Quick Greeting & Holiday Cards | Quick Print & Pickup | FedEx Office",
        ["Quick Greeting & Holiday Cards", "5\" x 7\" flat card", "Ready same day or within 24 hours", "in-store pickup"],
        ["current package price", "pickup or shipping path", "production window"]
      ),
      "upload-image": operationEvidence(
        "Quick Greeting & Holiday Cards | Quick Print & Pickup | FedEx Office",
        ["Upload your design", ".PDF", ".JPG", "Upload a File", "one file per side"],
        ["front/back file mapping", "file acceptance result", "provider preview screenshot"]
      ),
      "place-order": operationEvidence(
        "Quick Greeting & Holiday Cards | Quick Print & Pickup | FedEx Office",
        ["paid for", "Production Time + Shipping", "1-3 business days", "same day"],
        ["provider cart id", "payment authorization reference", "pickup or shipping commitment"]
      )
    },
    portalHost: "www.office.fedex.com",
    minimumQuantity: 10,
    quantityIncrement: 10,
    supportedFulfillmentModes: ["pickup", "shipping"],
    providerAccountMode: "guest-or-customer-account",
    acceptedArtifactKinds: ["combined-pdf-proof", "svg-panel-set", "print-ready-image-files"],
    uploadPreflightChecks: ["approved render packet", "quick greeting-card product selected", "front/back print files mapped"],
    candidateOfferCodes: [],
    portalApplicationPacketIds: []
  },
  cvs: {
    vendorId: "cvs",
    providerAdapterId: "cvs-live-order",
    vendorName: "CVS Photo",
    productName: "Folded greeting card, 5x7",
    productSku: "CommerceProduct_26126",
    productUrl:
      "https://www.cvs.com/photo/design-detail?category=StoreCat_22821&dgId=02d8d8bfa1fd46bb8234635847ec8dfd&designId=1f0682a2d34546bf86cbb799c3811d4e&sku=CommerceProduct_26126&ptype=cards&pcat=erin_condren_3740_1725983028_cvs_us&designName=Erin%20Condren&dgCatId=erin_condren_3740_1725983028_cvs_us&sortCriteria=toppicks#/dgview?productCategory=Card%20%26%20Stationery",
    pricingObservationId: "cvs-5x7-folded-card",
    requiredUrlTokens: [
      "/photo/design-detail",
      "category=StoreCat_22821",
      "designId=1f0682a2d34546bf86cbb799c3811d4e",
      "sku=CommerceProduct_26126",
      "productCategory=Card%20%26%20Stationery"
    ],
    operationEvidence: {
      "fetch-price": operationEvidence(
        "Folded Greeting Card, 5x7 | Cards | Cards & Stationery | CVS Photo",
        ["Folded Greeting Card, 5x7", "8.98", "CommerceProduct_26126", "productCategory=Card%20%26%20Stationery"],
        ["current subtotal", "pickup availability", "coupon and tax status"]
      ),
      "upload-image": operationEvidence(
        "Folded Greeting Card, 5x7 | Cards | Cards & Stationery | CVS Photo",
        ["Folded Greeting Card, 5x7", "CommerceProduct_26126", "dgview", "Cards & Stationery"],
        ["provider project reference", "provider preview screenshot", "crop and fold state"]
      ),
      "place-order": operationEvidence(
        "Folded Greeting Card, 5x7 | Cards | Cards & Stationery | CVS Photo",
        ["CommerceProduct_26126", "JUNESW", "8.98"],
        ["provider cart id", "same-cart coupon recheck", "customer final approval before order"]
      )
    },
    portalHost: "www.cvs.com",
    minimumQuantity: 1,
    quantityIncrement: 1,
    supportedFulfillmentModes: ["pickup"],
    providerAccountMode: "guest-or-customer-account",
    acceptedArtifactKinds: ["combined-pdf-proof", "svg-panel-set", "print-ready-image-files"],
    uploadPreflightChecks: ["approved render packet", "CommerceProduct_26126 selected", "CVS Photo preview captured"],
    candidateOfferCodes: ["JUNESW"],
    portalApplicationPacketIds: ["cvs-junesw-sitewide-photo-2026-06-20-portal-application-packet"]
  },
  walgreens: {
    vendorId: "walgreens",
    providerAdapterId: "walgreens-live-order",
    vendorName: "Walgreens Photo",
    productName: "5x7 folded cards, standard cardstock 85lb",
    productSku: "CommerceProduct_33272",
    productUrl:
      "https://photo.walgreens.com/store/design-detail?category=StoreCat_24955&dgId=40e943c647fe44c5867d74bb91e5feca&designId=0c158c44e2f34d9fabc9e1b3ada2eaa6&sku=CommerceProduct_33272&ptype=cards&pcat=design_your_own_56061_1525293477_walgreens_us&scat=&filters=&searchPhrase=&designName=Upload%20Your%20Design&pcatName=Cards&withSku=N&searchPhrase=&dgCatId=design_your_own_56061_1525293477_walgreens_us#/dgview?productCategory=Card%20%26%20Stationery",
    pricingObservationId: "walgreens-5x7-folded-card",
    requiredUrlTokens: [
      "/store/design-detail",
      "category=StoreCat_24955",
      "designId=0c158c44e2f34d9fabc9e1b3ada2eaa6",
      "sku=CommerceProduct_33272",
      "productCategory=Card%20%26%20Stationery"
    ],
    operationEvidence: {
      "fetch-price": operationEvidence(
        "5x7 Folded Cards, Standard Cardstock 85lb | Folded Cards | Cards & Stationary | Walgreens Photo",
        ["5x7 Folded Cards", "3.49", "CommerceProduct_33272", "productCategory=Card%20%26%20Stationery"],
        ["current subtotal", "logged-in pickup availability", "coupon and tax status"]
      ),
      "upload-image": operationEvidence(
        "5x7 Folded Cards, Standard Cardstock 85lb | Folded Cards | Cards & Stationary | Walgreens Photo",
        ["Upload Your Design", "CommerceProduct_33272", "dgview", "Cards & Stationery"],
        ["provider project reference", "provider preview screenshot", "crop and fold state"]
      ),
      "place-order": operationEvidence(
        "5x7 Folded Cards, Standard Cardstock 85lb | Folded Cards | Cards & Stationary | Walgreens Photo",
        ["CommerceProduct_33272", "CRISPCARD", "3.49"],
        ["provider cart id", "same-cart coupon recheck", "customer final approval before order"]
      )
    },
    portalHost: "photo.walgreens.com",
    minimumQuantity: 1,
    quantityIncrement: 1,
    supportedFulfillmentModes: ["pickup"],
    providerAccountMode: "customer-account-required",
    acceptedArtifactKinds: ["combined-pdf-proof", "svg-panel-set", "print-ready-image-files"],
    uploadPreflightChecks: ["approved render packet", "CommerceProduct_33272 selected", "Walgreens Photo preview captured"],
    candidateOfferCodes: ["CRISPCARD"],
    portalApplicationPacketIds: ["walgreens-crispcard-cards-2026-06-13-portal-application-packet"]
  }
};

function operationEvidence(sourceTitle, pageSignals, requiredOperatorProof) {
  return {
    observedAtIso: retailPrinterRegistryLinkObservedAtIso,
    sourceTitle,
    pageSignals,
    requiredOperatorProof
  };
}
