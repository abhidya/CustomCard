import { describe, expect, it } from "vitest";
import { printerCouponCollectionTargets } from "./printerPricing";
import {
  buildFmtcDealFeedRequest,
  buildRakutenCouponFeedRequest,
  collectFmtcProviderFeedTarget,
  collectRakutenCouponFeedTarget,
  extractRakutenRelevantDeals,
  parseFmtcDealFeed,
  summarizeFmtcRelevantDeals,
  type CouponProviderFetch
} from "./printerCouponProviderFeeds";

const fmtcTarget = printerCouponCollectionTargets.find((target) => target.id === "fmtc-deal-feed")!;
const rakutenTarget = printerCouponCollectionTargets.find((target) => target.id === "rakuten-coupon-feed")!;

describe("coupon provider feed collectors", () => {
  it("keeps FMTC and Rakuten credential-gated when provider tokens are absent", async () => {
    await expect(collectFmtcProviderFeedTarget(fmtcTarget, undefined)).resolves.toMatchObject({
      id: "fmtc-deal-feed",
      provider: "FMTC Deal Feed",
      fetched: false,
      credentialEnvKeys: ["FMTC_API_TOKEN"],
      reason: expect.stringContaining("Credential-gated provider feed")
    });

    await expect(collectRakutenCouponFeedTarget(rakutenTarget, undefined)).resolves.toMatchObject({
      id: "rakuten-coupon-feed",
      provider: "Rakuten Advertising Coupon Feed API",
      fetched: false,
      credentialEnvKeys: ["RAKUTEN_ADVERTISING_API_TOKEN"],
      reason: expect.stringContaining("Credential-gated provider feed")
    });
  });

  it("builds FMTC code-only active deal requests without exposing the token in output", async () => {
    const requests: Array<{ url: string; headers?: Record<string, string> }> = [];
    const fetcher: CouponProviderFetch = async (url, init) => {
      requests.push({ url, headers: init?.headers });
      return {
        status: 200,
        ok: true,
        text: async () =>
          JSON.stringify({
            deals: [
              {
                id: 101,
                merchant_name: "Walgreens Photo",
                label: "60% off photo cards",
                code: "CRISPCARD",
                status: "active",
                start_date: "2026-06-07",
                end_date: "2026-06-13",
                code_verified_at: "2026-06-07T12:00:00Z",
                link_verified_at: "2026-06-07T12:01:00Z",
                coupon_code_on_page: true
              },
              {
                id: 202,
                merchant_name: "Unrelated Shop",
                label: "10% off",
                code: "NOPE"
              }
            ]
          })
      };
    };

    const request = buildFmtcDealFeedRequest("secret-fmtc-token");
    expect(request.endpoint).toBe("https://s3.fmtc.co/api/4.2.0/deals");
    expect(request.requestShape).toMatchObject({ format: "json", codesonly: 1, active: 1, country: "US", page_size: 500 });
    expect(request.fetchUrl).toContain("api_token=secret-fmtc-token");

    const result = await collectFmtcProviderFeedTarget(fmtcTarget, "secret-fmtc-token", {
      fetcher,
      userAgent: "CustomCard test"
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain("codesonly=1");
    expect(requests[0].url).toContain("active=1");
    expect(requests[0].headers).toMatchObject({ "user-agent": "CustomCard test" });
    expect(result).toMatchObject({
      provider: "FMTC Deal Feed",
      fetched: true,
      status: 200,
      ok: true,
      tokenRedacted: true,
      returnedDealCount: 2,
      relevantDealCount: 1,
      relevantDeals: [expect.objectContaining({ merchantName: "Walgreens Photo", code: "CRISPCARD" })]
    });
    expect(JSON.stringify(result)).not.toContain("secret-fmtc-token");
  });

  it("parses FMTC array, deals, and data payload shapes for Walgreens/CVS candidates", () => {
    const directArray = parseFmtcDealFeed(JSON.stringify([{ merchant_name: "CVS Photo", code: "JUNESW" }]));
    const dealsObject = parseFmtcDealFeed(JSON.stringify({ deals: [{ merchant_name: "Walgreens", code: "CRISPCARD" }] }));
    const dataObject = parseFmtcDealFeed(JSON.stringify({ data: [{ direct_link: "https://www.cvs.com/photo", code: "PHOTO" }] }));

    expect(summarizeFmtcRelevantDeals(directArray)).toEqual([expect.objectContaining({ merchantName: "CVS Photo", code: "JUNESW" })]);
    expect(summarizeFmtcRelevantDeals(dealsObject)).toEqual([expect.objectContaining({ merchantName: "Walgreens", code: "CRISPCARD" })]);
    expect(summarizeFmtcRelevantDeals(dataObject)).toEqual([expect.objectContaining({ code: "PHOTO" })]);
    expect(parseFmtcDealFeed("{bad json")).toEqual([]);
  });

  it("builds Rakuten XML coupon requests with bearer auth while redacting the token from results", async () => {
    const requests: Array<{ url: string; headers?: Record<string, string> }> = [];
    const fetcher: CouponProviderFetch = async (url, init) => {
      requests.push({ url, headers: init?.headers });
      return {
        status: 200,
        ok: true,
        text: async () => `
          <coupon>
            <advertisername>CVS Photo</advertisername>
            <offerdescription>50% off Sitewide Photo</offerdescription>
            <couponcode>JUNESW</couponcode>
            <offerstartdate>2026-06-07</offerstartdate>
            <offerenddate>2026-06-20</offerenddate>
            <promotiontype>Coupon</promotiontype>
          </coupon>
          <coupon>
            <advertisername>Other Merchant</advertisername>
            <couponcode>IGNORE</couponcode>
          </coupon>`
      };
    };

    const request = buildRakutenCouponFeedRequest("secret-rakuten-token", "CustomCard test");
    expect(request.endpoint).toBe("https://api.linksynergy.com/coupon/1.0");
    expect(request.requestShape).toMatchObject({ resultsperpage: 500, pagenumber: 1, responseFormat: "xml" });
    expect(request.headers.authorization).toBe("Bearer secret-rakuten-token");

    const result = await collectRakutenCouponFeedTarget(rakutenTarget, "secret-rakuten-token", {
      fetcher,
      userAgent: "CustomCard test"
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain("resultsperpage=500");
    expect(requests[0].url).toContain("pagenumber=1");
    expect(requests[0].headers).toMatchObject({
      accept: "application/xml,text/xml,*/*",
      authorization: "Bearer secret-rakuten-token",
      "user-agent": "CustomCard test"
    });
    expect(result).toMatchObject({
      provider: "Rakuten Advertising Coupon Feed API",
      fetched: true,
      status: 200,
      ok: true,
      tokenRedacted: true,
      relevantDealCount: 1,
      relevantDeals: [expect.objectContaining({ advertiser: "CVS Photo", code: "JUNESW" })]
    });
    expect(JSON.stringify(result)).not.toContain("secret-rakuten-token");
  });

  it("extracts Rakuten coupon, item, and link chunks for Walgreens/CVS only", () => {
    const deals = extractRakutenRelevantDeals(`
      <item>
        <merchantname>Walgreens Photo</merchantname>
        <description>60% off photo cards</description>
        <code>CRISPCARD</code>
        <startdate>2026-06-07</startdate>
        <enddate>2026-06-13</enddate>
      </item>
      <link>
        <advertiser>CVS Photo</advertiser>
        <linkname>50% off Sitewide Photo</linkname>
        <couponcode>JUNESW</couponcode>
      </link>
      <coupon>
        <advertisername>Other Merchant</advertisername>
        <couponcode>IGNORE</couponcode>
      </coupon>`);

    expect(deals).toEqual([
      expect.objectContaining({ advertiser: "Walgreens Photo", offerTitle: "60% off photo cards", code: "CRISPCARD" }),
      expect.objectContaining({ advertiser: "CVS Photo", offerTitle: "50% off Sitewide Photo", code: "JUNESW" })
    ]);
  });
});
