import type { CardPanel } from "../src/customerWorkflow";
import type { PrintExportPackage } from "../src/printExport";
import { requestBrowserJson } from "../src/browserRequestAdapter";
import type { CheckoutCustomer } from "./checkoutModel";
import { panelToJpegBase64 } from "./panelMediaAdapter";

export interface WalgreensCheckoutSession {
  checkoutUrl: string;
  window?: { width: number; height: number };
}

export interface CreateWalgreensCheckoutSessionInput {
  checkoutCustomer: CheckoutCustomer;
  getCustomerApiToken?: () => Promise<string | undefined>;
  panels: CardPanel[];
  printPackage: PrintExportPackage;
  fetchImpl?: typeof fetch;
  renderPanel?: (panel: CardPanel) => Promise<string>;
}

interface UploadPayload {
  ok?: boolean;
  error?: string;
  detail?: string;
  status?: string;
  blockers?: string[];
  imageUrl?: string;
}

interface StatusPayload {
  ok?: boolean;
  error?: string;
  detail?: string;
  status?: string;
  blockers?: string[];
}

interface SessionPayload {
  ok?: boolean;
  error?: string;
  detail?: string;
  status?: string;
  blockers?: string[];
  checkoutUrl?: string;
  window?: { width: number; height: number };
}

export async function createWalgreensCheckoutSession({
  checkoutCustomer,
  getCustomerApiToken,
  panels,
  printPackage,
  fetchImpl = fetch,
  renderPanel = panelToJpegBase64
}: CreateWalgreensCheckoutSessionInput): Promise<WalgreensCheckoutSession> {
  const images: string[] = [];
  const { payload: statusPayload, response: statusResponse } = await requestBrowserJson<StatusPayload>("/api/walgreens/checkout/status", {
    fetchImpl,
    getToken: getCustomerApiToken,
    method: "GET",
  });

  if (!statusResponse.ok || !statusPayload?.ok) {
    throw new Error(getWalgreensCheckoutError(statusPayload, "Walgreens checkout is not ready.", statusResponse.status));
  }

  for (const panel of panels) {
    const imageBase64 = await renderPanel(panel);
    const { payload: uploadPayload, response: uploadResponse } = await requestBrowserJson<UploadPayload>("/api/walgreens/checkout/upload", {
      body: { imageBase64 },
      fetchImpl,
      getToken: getCustomerApiToken,
      method: "POST"
    });

    if (!uploadResponse.ok || !uploadPayload?.ok || !uploadPayload.imageUrl) {
      throw new Error(getWalgreensCheckoutError(uploadPayload, "Walgreens image upload is not ready.", uploadResponse.status));
    }
    images.push(uploadPayload.imageUrl);
  }

  const { payload: sessionPayload, response: sessionResponse } = await requestBrowserJson<SessionPayload>("/api/walgreens/checkout/session", {
    body: {
      customer: checkoutCustomer,
      images,
      affNotes: `CustomCard ${printPackage.draftId}`
    },
    fetchImpl,
    getToken: getCustomerApiToken,
    method: "POST"
  });

  if (!sessionResponse.ok || !sessionPayload?.ok || !sessionPayload.checkoutUrl) {
    throw new Error(getWalgreensCheckoutError(sessionPayload, "Walgreens checkout is not ready.", sessionResponse.status));
  }

  return {
    checkoutUrl: sessionPayload.checkoutUrl,
    window: sessionPayload.window
  };
}

function getWalgreensCheckoutError(
  payload: StatusPayload | UploadPayload | SessionPayload | undefined,
  fallback: string,
  statusCode?: number
): string {
  const status = payload?.status ? ` (${payload.status})` : statusCode ? ` (HTTP ${statusCode})` : "";
  return payload?.error ?? payload?.detail ?? payload?.blockers?.join(" ") ?? `${fallback}${status}`;
}
