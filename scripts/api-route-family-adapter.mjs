import {
  buildRetailPrinterOperationStartPackets
} from "../src/retailPrinterOperationStartData.mjs";
import { retailPrinterCouponPortalEvidenceRoute } from "../src/retailPrinterCouponPortalEvidenceData.mjs";
import {
  WALGREENS_CHECKOUT_MAX_IMAGE_BYTES,
  buildWalgreensCallbackHtml,
  formatWalgreensCheckoutUpstreamError,
  walgreensCheckoutCallbackRoute,
  walgreensCheckoutSessionRoute,
  walgreensCheckoutStatusRoute,
  walgreensCheckoutUploadRoute
} from "../src/walgreensHostedCheckout.mjs";
import { mobileBootstrap } from "../src/mobileBootstrapData.mjs";
import {
  googleCalendarApiOAuthCallbackRoute,
  googleCalendarOAuthCallbackRoute
} from "./api-route-adapter-contract.mjs";
import { createApiRouteFamilies } from "./api-route-families.mjs";
import { aiCardGenerateRoute, aiChatRespondRoute } from "./ai-card-generator.mjs";

export { googleCalendarApiOAuthCallbackRoute, googleCalendarOAuthCallbackRoute };

export const walgreensUploadBodyLimit = Math.ceil((WALGREENS_CHECKOUT_MAX_IMAGE_BYTES * 4) / 3) + 2_000_000;

export function createApiRouteFamilyAdapter({
  aiGenerationService,
  apiRuntime,
  buildMutationContractPayload,
  calendarConnectionLifecycle,
  calendarConnectionStartPackets,
  clientRateLimitKey,
  decodeArtifactObjectKey,
  readRequestBody,
  readiness,
  routes,
  sendArtifact,
  sendHtml,
  sendJson,
  walgreensCheckout,
  walgreensRateLimited
}) {
  return createApiRouteFamilies({
    aiCardGenerateRoute,
    aiChatRespondRoute,
    aiGenerationService,
    apiRuntime,
    buildMutationContractPayload,
    buildRetailPrinterOperationStartPackets,
    buildWalgreensCallbackHtml,
    calendarConnectionLifecycle,
    calendarConnectionStartPackets,
    clientRateLimitKey,
    decodeArtifactObjectKey,
    formatWalgreensCheckoutUpstreamError,
    mobileBootstrap,
    readRequestBody,
    readiness,
    retailPrinterCouponPortalEvidenceRoute,
    routes,
    sendArtifact,
    sendHtml,
    sendJson,
    walgreensCheckout,
    walgreensCheckoutCallbackRoute,
    walgreensCheckoutSessionRoute,
    walgreensCheckoutStatusRoute,
    walgreensCheckoutUploadRoute,
    walgreensRateLimited,
    walgreensUploadBodyLimit
  });
}
