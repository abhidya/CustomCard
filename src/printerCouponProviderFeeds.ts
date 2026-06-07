import type { PrinterCouponCollectionTarget } from "./printerPricing";

export interface CouponProviderFetchInit {
  headers?: Record<string, string>;
}

export interface CouponProviderHttpResponse {
  status: number;
  ok: boolean;
  text(): Promise<string>;
}

export type CouponProviderFetch = (url: string, init?: CouponProviderFetchInit) => Promise<CouponProviderHttpResponse>;

export interface CouponProviderFeedBaseTarget {
  id: string;
  vendorIds: PrinterCouponCollectionTarget["vendorIds"];
  collectionMethod: PrinterCouponCollectionTarget["collectionMethod"];
  readiness: PrinterCouponCollectionTarget["readiness"];
  url: string;
  credentialEnvKeys: string[];
  verificationSignals: string[];
  legalReviewRequired: boolean;
  fetched: false;
}

export interface CouponProviderDealSummary {
  id?: string | number;
  merchantName?: string;
  label?: string;
  code?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  codeVerifiedAt?: string;
  linkVerifiedAt?: string;
  couponCodeOnPage?: string | boolean;
  advertiser?: string;
  offerTitle?: string;
  offerStartDate?: string;
  offerEndDate?: string;
  promotionType?: string;
}

export interface CouponProviderFeedCollectionResult extends Omit<CouponProviderFeedBaseTarget, "fetched"> {
  provider: string;
  fetched: boolean;
  reason: string;
  status?: number;
  ok?: boolean;
  endpoint?: string;
  requestShape?: Record<string, string | number>;
  returnedDealCount?: number;
  returnedBodyBytes?: number;
  relevantDealCount?: number;
  relevantDeals?: CouponProviderDealSummary[];
  tokenRedacted?: true;
}

export interface CouponProviderCollectorOptions {
  fetcher?: CouponProviderFetch;
  userAgent?: string;
}

export function buildCouponProviderBaseTarget(target: PrinterCouponCollectionTarget): CouponProviderFeedBaseTarget {
  return {
    id: target.id,
    vendorIds: target.vendorIds,
    collectionMethod: target.collectionMethod,
    readiness: target.readiness,
    url: target.url,
    credentialEnvKeys: target.credentialEnvKeys,
    verificationSignals: target.verificationSignals,
    legalReviewRequired: target.legalReviewRequired,
    fetched: false
  };
}

export function buildFmtcDealFeedRequest(apiToken: string) {
  const providerUrl = new URL("https://s3.fmtc.co/api/4.2.0/deals");
  providerUrl.searchParams.set("api_token", apiToken);
  providerUrl.searchParams.set("format", "json");
  providerUrl.searchParams.set("codesonly", "1");
  providerUrl.searchParams.set("active", "1");
  providerUrl.searchParams.set("country", "US");
  providerUrl.searchParams.set("page_size", "500");

  return {
    fetchUrl: providerUrl.toString(),
    endpoint: "https://s3.fmtc.co/api/4.2.0/deals",
    requestShape: {
      format: "json",
      codesonly: 1,
      active: 1,
      country: "US",
      page_size: 500
    },
    tokenRedacted: true as const
  };
}

export async function collectFmtcProviderFeedTarget(
  target: PrinterCouponCollectionTarget,
  apiToken: string | undefined,
  options: CouponProviderCollectorOptions = {}
): Promise<CouponProviderFeedCollectionResult> {
  const baseTarget = buildCouponProviderBaseTarget(target);

  if (!apiToken) {
    return {
      ...baseTarget,
      provider: "FMTC Deal Feed",
      reason: "Credential-gated provider feed; set FMTC_API_TOKEN only in an approved server/operator environment."
    };
  }

  const fetcher = resolveCouponProviderFetcher(options.fetcher);
  const request = buildFmtcDealFeedRequest(apiToken);
  const response = await fetcher(request.fetchUrl, { headers: buildProviderHeaders(options.userAgent) });
  const providerBody = await response.text();
  const deals = parseFmtcDealFeed(providerBody);
  const relevantDeals = summarizeFmtcRelevantDeals(deals);

  return {
    ...baseTarget,
    provider: "FMTC Deal Feed",
    fetched: true,
    status: response.status,
    ok: response.ok,
    endpoint: request.endpoint,
    requestShape: request.requestShape,
    returnedDealCount: deals.length,
    relevantDealCount: relevantDeals.length,
    relevantDeals,
    tokenRedacted: request.tokenRedacted,
    reason:
      relevantDeals.length > 0
        ? "Provider-feed coupons are discovery evidence; official retailer source or provider-portal application proof is still required before discounting."
        : "Provider feed returned no Walgreens/CVS code candidates in the fetched page."
  };
}

export function buildRakutenCouponFeedRequest(apiToken: string, userAgent?: string) {
  const providerUrl = new URL("https://api.linksynergy.com/coupon/1.0");
  providerUrl.searchParams.set("resultsperpage", "500");
  providerUrl.searchParams.set("pagenumber", "1");

  return {
    fetchUrl: providerUrl.toString(),
    endpoint: "https://api.linksynergy.com/coupon/1.0",
    headers: {
      accept: "application/xml,text/xml,*/*",
      authorization: `Bearer ${apiToken}`,
      ...buildProviderHeaders(userAgent)
    },
    requestShape: {
      resultsperpage: 500,
      pagenumber: 1,
      responseFormat: "xml"
    },
    tokenRedacted: true as const
  };
}

export async function collectRakutenCouponFeedTarget(
  target: PrinterCouponCollectionTarget,
  apiToken: string | undefined,
  options: CouponProviderCollectorOptions = {}
): Promise<CouponProviderFeedCollectionResult> {
  const baseTarget = buildCouponProviderBaseTarget(target);

  if (!apiToken) {
    return {
      ...baseTarget,
      provider: "Rakuten Advertising Coupon Feed API",
      reason:
        "Credential-gated provider feed; set RAKUTEN_ADVERTISING_API_TOKEN only in an approved publisher/operator environment."
    };
  }

  const fetcher = resolveCouponProviderFetcher(options.fetcher);
  const request = buildRakutenCouponFeedRequest(apiToken, options.userAgent);
  const response = await fetcher(request.fetchUrl, { headers: request.headers });
  const providerBody = await response.text();
  const relevantDeals = extractRakutenRelevantDeals(providerBody);

  return {
    ...baseTarget,
    provider: "Rakuten Advertising Coupon Feed API",
    fetched: true,
    status: response.status,
    ok: response.ok,
    endpoint: request.endpoint,
    requestShape: request.requestShape,
    returnedBodyBytes: providerBody.length,
    relevantDealCount: relevantDeals.length,
    relevantDeals,
    tokenRedacted: request.tokenRedacted,
    reason:
      relevantDeals.length > 0
        ? "Provider-feed coupons are discovery evidence; official retailer source or provider-portal application proof is still required before discounting."
        : "Provider feed returned no Walgreens/CVS coupon candidates in the fetched page."
  };
}

export function parseFmtcDealFeed(providerBody: string): Record<string, unknown>[] {
  const parsed = safeParseJson(providerBody);
  const deals = readDealArray(parsed);
  return deals.filter((deal): deal is Record<string, unknown> => Boolean(deal && typeof deal === "object" && !Array.isArray(deal)));
}

export function summarizeFmtcRelevantDeals(deals: Record<string, unknown>[]): CouponProviderDealSummary[] {
  return deals
    .filter((deal) => /walgreens|cvs/i.test(`${deal.merchant_name ?? ""} ${deal.label ?? ""} ${deal.direct_link ?? ""}`))
    .map((deal) => ({
      id: idValue(deal.id),
      merchantName: stringValue(deal.merchant_name),
      label: stringValue(deal.label),
      code: stringValue(deal.code),
      status: stringValue(deal.status),
      startDate: stringValue(deal.start_date),
      endDate: stringValue(deal.end_date),
      codeVerifiedAt: stringValue(deal.code_verified_at),
      linkVerifiedAt: stringValue(deal.link_verified_at),
      couponCodeOnPage: scalarValue(deal.coupon_code_on_page) as string | boolean | undefined
    }));
}

export function extractRakutenRelevantDeals(xmlText: string): CouponProviderDealSummary[] {
  if (!xmlText) return [];
  const chunks = xmlText.match(/<coupon[\s\S]*?<\/coupon>|<item[\s\S]*?<\/item>|<link[\s\S]*?<\/link>/gi) ?? [];
  return chunks
    .filter((chunk) => /walgreens|cvs/i.test(chunk))
    .slice(0, 50)
    .map((chunk) => ({
      advertiser: firstXmlValue(chunk, "advertisername") ?? firstXmlValue(chunk, "advertiser") ?? firstXmlValue(chunk, "merchantname"),
      offerTitle: firstXmlValue(chunk, "offerdescription") ?? firstXmlValue(chunk, "description") ?? firstXmlValue(chunk, "linkname"),
      code: firstXmlValue(chunk, "couponcode") ?? firstXmlValue(chunk, "code"),
      offerStartDate: firstXmlValue(chunk, "offerstartdate") ?? firstXmlValue(chunk, "startdate"),
      offerEndDate: firstXmlValue(chunk, "offerenddate") ?? firstXmlValue(chunk, "enddate"),
      promotionType: firstXmlValue(chunk, "promotiontype") ?? firstXmlValue(chunk, "promocat")
    }));
}

function buildProviderHeaders(userAgent?: string): Record<string, string> {
  return userAgent ? { "user-agent": userAgent } : {};
}

function resolveCouponProviderFetcher(fetcher?: CouponProviderFetch): CouponProviderFetch {
  const resolved = fetcher ?? (globalThis.fetch as CouponProviderFetch | undefined);
  if (!resolved) throw new Error("Coupon provider fetch is unavailable in this runtime.");
  return resolved;
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function readDealArray(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (!isRecord(parsed)) return [];
  if (Array.isArray(parsed.deals)) return parsed.deals;
  if (Array.isArray(parsed.data)) return parsed.data;
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function firstXmlValue(xmlText: string, tagName: string): string | undefined {
  const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = xmlText.match(pattern);
  return match?.[1]?.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function idValue(value: unknown): string | number | undefined {
  if (typeof value === "string" || typeof value === "number") return value;
  return undefined;
}

function scalarValue(value: unknown): string | number | boolean | undefined {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return undefined;
}
