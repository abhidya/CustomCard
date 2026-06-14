import { describe, expect, it } from "vitest";
import {
  metricsPlatformContract,
  metricsPlatformItems,
  renderMetricsExpositionContract,
  summarizeMetricsPlatform,
  validateMetricsPlatform,
  type MetricsPlatformItem
} from "./metricsPlatform";

describe("metrics platform", () => {
  it("tracks ORR critical/non-critical dependencies and business metrics without live scrape claims", () => {
    const summary = summarizeMetricsPlatform();

    expect(validateMetricsPlatform()).toEqual([]);
    expect(summary).toMatchObject({
      total: 23,
      critical: 5,
      nonCritical: 6,
      business: 12,
      seoMetrics: 3,
      acquisitionMetrics: 3,
      demographicsMetrics: 2,
      siteUsageMetrics: 4,
      counters: 8,
      gauges: 14,
      histograms: 1,
      alertRoutesRequired: 11,
      criticalAlerts: 5,
      warningAlerts: 6,
      piiSafe: 23,
      dashboards: 2,
      liveScrapeEnabled: 0,
      externalNetworkCalls: 0,
      blockers: []
    });
    expect(summary.requiredEvidence).toEqual(
      expect.arrayContaining([
        "Live Prometheus scrape sample",
        "Alertmanager critical-route delivery drill",
        "Grafana SEO panel screenshot"
      ])
    );
  });

  it("covers every required dependency and business category", () => {
    const dependencies = metricsPlatformItems.map((item) => item.dependency);
    for (const dependency of metricsPlatformContract.requiredCriticalDependencies) {
      expect(dependencies).toContain(dependency);
    }
    for (const dependency of metricsPlatformContract.requiredNonCriticalDependencies) {
      expect(dependencies).toContain(dependency);
    }
    const categories = new Set(
      metricsPlatformItems.filter((item) => item.tier === "business").map((item) => item.category)
    );
    expect([...categories].sort()).toEqual(["acquisition", "demographics", "seo", "site-usage"]);

    const critical = metricsPlatformItems.filter((item) => item.tier === "critical");
    expect(critical.every((item) => item.alertSeverity === "critical" && item.alertRouteRequired)).toBe(true);
    const nonCritical = metricsPlatformItems.filter((item) => item.tier === "non-critical");
    expect(nonCritical.every((item) => item.alertSeverity === "warning" && item.alertRouteRequired)).toBe(true);
    const business = metricsPlatformItems.filter((item) => item.tier === "business");
    expect(business.every((item) => item.alertSeverity === "none" && !item.alertRouteRequired)).toBe(true);
  });

  it("renders a well-formed Prometheus exposition whose series match the catalog", () => {
    const exposition = renderMetricsExpositionContract();

    expect(exposition).toContain("# TYPE customcard_dependency_up gauge");
    expect(exposition).toContain('customcard_dependency_up{dependency="postgres",tier="critical"} 0');
    expect(exposition).toContain('customcard_dependency_up{dependency="ai_text",tier="non-critical"} 0');
    expect(exposition).toContain("# TYPE customcard_site_page_load_seconds histogram");
    expect(exposition).toContain("customcard_site_page_load_seconds_bucket");
    expect(exposition).toContain("customcard_site_page_load_seconds_count");
    expect(exposition).toContain("# TYPE customcard_seo_organic_impressions_total counter");

    // Every catalog metric name appears in the exposition body.
    for (const metricName of summarizeMetricsPlatform().metricNames) {
      expect(exposition).toContain(metricName);
    }
    // No forbidden PII label key leaks into the exposition.
    for (const forbidden of metricsPlatformContract.forbiddenLabelKeys) {
      expect(exposition).not.toContain(`${forbidden}="`);
    }
  });

  it("flags unsafe metric claims before they reach the doctor or dashboards", () => {
    const unsafeItems: MetricsPlatformItem[] = [
      {
        ...metricsPlatformItems[0],
        metricName: "BadName",
        metricType: "counter",
        unit: "ratio",
        labelKeys: ["email", "Bad-Key"],
        alertRouteRequired: false,
        alertSeverity: "none",
        sloObjective: "",
        piiSafe: false,
        liveScrapeEnabled: true,
        externalNetworkCalls: true,
        currentEvidence: [],
        requiredEvidence: ["one"],
        blocker: ""
      } as unknown as MetricsPlatformItem,
      {
        ...metricsPlatformItems[0]
      }
    ];

    expect(validateMetricsPlatform(unsafeItems)).toEqual(
      expect.arrayContaining([
        "Duplicate metrics platform readiness item: orr-postgres-primary.",
        "Metrics platform item orr-postgres-primary metric name must be snake_case and customcard_-prefixed.",
        "Metrics platform item orr-postgres-primary counter metric name must end with _total.",
        "Metrics platform item orr-postgres-primary label key email risks PII and is not allowed.",
        "Metrics platform item orr-postgres-primary label key Bad-Key must be snake_case.",
        "Metrics platform item orr-postgres-primary must keep piiSafe=true.",
        "Metrics platform item orr-postgres-primary must keep liveScrapeEnabled=false.",
        "Metrics platform item orr-postgres-primary must not require live external network calls.",
        "Metrics platform item orr-postgres-primary ORR dependency must require an alert route.",
        "Metrics platform item orr-postgres-primary ORR dependency must declare an SLO objective.",
        "Metrics platform item orr-postgres-primary critical dependency must use critical alert severity.",
        "Metrics platform item orr-postgres-primary must list current repo-local evidence.",
        "Metrics platform item orr-postgres-primary must list at least two required evidence items.",
        "Metrics platform item orr-postgres-primary must explain its blocker."
      ])
    );

    const missingDependency = metricsPlatformItems.filter((item) => item.dependency !== "redis");
    expect(validateMetricsPlatform(missingDependency)).toEqual(
      expect.arrayContaining(["Metrics platform must track critical dependency: redis."])
    );

    const missingNonCritical = metricsPlatformItems.filter((item) => item.dependency !== "crm");
    expect(validateMetricsPlatform(missingNonCritical)).toEqual(
      expect.arrayContaining(["Metrics platform must track non-critical dependency: crm."])
    );
  });

  it("flags a missing business category and a duplicate series signature", () => {
    const withoutSeo = metricsPlatformItems.filter((item) => item.category !== "seo");
    expect(validateMetricsPlatform(withoutSeo)).toEqual(
      expect.arrayContaining(["Metrics platform must cover business category: seo."])
    );

    const duplicateSignature: MetricsPlatformItem[] = [
      ...metricsPlatformItems,
      {
        ...metricsPlatformItems.find((item) => item.id === "site-usage-pageviews")!,
        id: "site-usage-pageviews-dupe"
      }
    ];
    expect(validateMetricsPlatform(duplicateSignature)).toEqual(
      expect.arrayContaining([
        "Metrics platform has a duplicate series signature: customcard_site_pageviews_total::site-usage."
      ])
    );
  });
});
