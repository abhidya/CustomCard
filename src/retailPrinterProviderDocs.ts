import { getRetailPrinterProductLinkByProvider } from "./retailPrinterContracts";

export interface RetailPrinterProviderDocsAdapter {
  id: string;
  docsUrl?: string;
}

export function retailPrinterProviderDocsUrl(providerAdapterId: string): string {
  const productLink = getRetailPrinterProductLinkByProvider(providerAdapterId);
  if (!productLink) throw new Error(`Missing retail printer product link for provider adapter: ${providerAdapterId}`);
  return productLink.productUrl;
}

export function validateRetailPrinterProviderDocsUrls(adapters: RetailPrinterProviderDocsAdapter[]): string[] {
  const errors: string[] = [];

  for (const adapter of adapters) {
    const productLink = getRetailPrinterProductLinkByProvider(adapter.id);
    if (!productLink) continue;
    if (adapter.docsUrl !== productLink.productUrl) {
      errors.push(`Retail printer adapter ${adapter.id} must use its canonical product URL as docsUrl.`);
    }
    if (adapter.docsUrl && isPlaceholderRetailPrinterDocsUrl(adapter.docsUrl)) {
      errors.push(`Retail printer adapter ${adapter.id} docsUrl must not be placeholder, demo, localhost, or example content.`);
    }
  }

  return errors;
}

function isPlaceholderRetailPrinterDocsUrl(url: string): boolean {
  const normalized = safeDecodeUrlText(url).toLowerCase();
  if (/\b(example\.com|localhost|127\.0\.0\.1|placeholder|dummy|todo|mock)\b/.test(normalized)) return true;
  return /(^|[/?#&=._-])demo($|[/?#&=._-])/.test(normalized);
}

function safeDecodeUrlText(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}
