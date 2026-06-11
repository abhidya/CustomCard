import type { CardPanel } from "../src/customerWorkflow";
import type { PrintExportPackage } from "../src/printExport";
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
  blockers?: string[];
  imageUrl?: string;
}

interface SessionPayload {
  ok?: boolean;
  error?: string;
  detail?: string;
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
  const token = await getCustomerApiToken?.();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const images: string[] = [];

  for (const panel of panels) {
    const imageBase64 = await renderPanel(panel);
    const uploadResponse = await fetchImpl("/api/walgreens/checkout/upload", {
      method: "POST",
      headers,
      body: JSON.stringify({ imageBase64 })
    });
    const uploadPayload = await uploadResponse.json().catch(() => undefined) as UploadPayload | undefined;

    if (!uploadResponse.ok || !uploadPayload?.ok || !uploadPayload.imageUrl) {
      throw new Error(getWalgreensCheckoutError(uploadPayload, "Walgreens image upload is not ready."));
    }
    images.push(uploadPayload.imageUrl);
  }

  const sessionResponse = await fetchImpl("/api/walgreens/checkout/session", {
    method: "POST",
    headers,
    body: JSON.stringify({
      customer: checkoutCustomer,
      images,
      affNotes: `CustomCard ${printPackage.draftId}`
    })
  });
  const sessionPayload = await sessionResponse.json().catch(() => undefined) as SessionPayload | undefined;

  if (!sessionResponse.ok || !sessionPayload?.ok || !sessionPayload.checkoutUrl) {
    throw new Error(getWalgreensCheckoutError(sessionPayload, "Walgreens checkout is not ready."));
  }

  return {
    checkoutUrl: sessionPayload.checkoutUrl,
    window: sessionPayload.window
  };
}

function getWalgreensCheckoutError(
  payload: UploadPayload | SessionPayload | undefined,
  fallback: string
): string {
  return payload?.detail ?? payload?.error ?? payload?.blockers?.join(" ") ?? fallback;
}
