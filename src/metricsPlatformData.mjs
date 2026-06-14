import { defineReadinessRegister } from "./readinessRegister.mjs";

/**
 * Metrics platform register — the executable catalog behind the self-hosted
 * Prometheus + Grafana ORR (operational readiness review) and business-metrics
 * stack under `infra/observability/`.
 *
 * It declares every metric series the stack scrapes, alerts on, and charts:
 *  - ORR critical dependencies (Postgres, Redis, object store, API ingress,
 *    auth-session store) — page-worthy, alert-routed.
 *  - ORR non-critical dependencies (AI text/image, notifications, payments,
 *    observability export, CRM sync) — degrade gracefully, warn-routed.
 *  - Business metrics — SEO, customer acquisition, demographics, and site-usage
 *    metadata, all aggregated and PII-free.
 *
 * Like every CustomCard register it fails closed: it refuses to claim live
 * scraping, refuses PII-bearing label keys, and forces ORR dependencies to
 * carry an SLO and an alert route. Passing the doctor means the committed
 * Prometheus/Grafana contract is internally consistent — not that a live
 * Prometheus has scraped a real endpoint yet.
 */

const requiredMetricIds = [
  // ORR critical
  "orr-postgres-primary",
  "orr-redis-queue",
  "orr-object-store-artifacts",
  "orr-api-ingress",
  "orr-auth-session-store",
  // ORR non-critical
  "orr-ai-text-provider",
  "orr-ai-image-provider",
  "orr-notification-provider",
  "orr-payment-sandbox",
  "orr-observability-export",
  "orr-crm-sync",
  // business
  "seo-organic-impressions",
  "seo-organic-clicks",
  "seo-average-position",
  "acquisition-signups",
  "acquisition-activation-ratio",
  "acquisition-conversion-funnel",
  "demographics-region-sessions",
  "demographics-locale-device",
  "site-usage-pageviews",
  "site-usage-active-sessions",
  "site-usage-card-generations",
  "site-usage-page-load"
];

const requiredCriticalDependencies = ["postgres", "redis", "object_store", "api", "auth_session_store"];
const requiredNonCriticalDependencies = ["ai_text", "ai_image", "notification", "payment", "observability_export", "crm"];
const requiredBusinessCategories = ["seo", "acquisition", "demographics", "site-usage"];

const allowedTiers = new Set(["critical", "non-critical", "business"]);
const allowedMetricTypes = new Set(["counter", "gauge", "histogram"]);
const allowedUnits = new Set(["ratio", "seconds", "bytes", "count", "info"]);
const allowedSeverities = new Set(["critical", "warning", "none"]);

const orrDashboardUid = "customcard-orr-dependencies";
const businessDashboardUid = "customcard-business-metrics";

const tierToLane = {
  critical: "critical-dependency",
  "non-critical": "non-critical-dependency",
  business: "business"
};

// Label keys are aggregated dimensions only. Anything that could re-identify a
// person is forbidden so the exposition stays safe to scrape and chart.
const forbiddenLabelKeys = new Set([
  "email",
  "name",
  "full_name",
  "first_name",
  "last_name",
  "phone",
  "phone_number",
  "ip",
  "ip_address",
  "address",
  "street",
  "user_id",
  "customer_id",
  "account_id",
  "ssn",
  "dob",
  "date_of_birth",
  "birthday",
  "geo_lat",
  "geo_lng",
  "gps",
  "device_id"
]);

const metricNamePattern = /^customcard_[a-z][a-z0-9_]*[a-z0-9]$/;
const labelKeyPattern = /^[a-z][a-z0-9_]*$/;

function orrCritical(id, dependency, label, metricName, metricType, unit, fields) {
  return {
    id,
    label,
    lane: tierToLane.critical,
    tier: "critical",
    dependency,
    category: "orr",
    metricName,
    metricType,
    unit,
    labelKeys: ["dependency", "tier"],
    alertRouteRequired: true,
    alertSeverity: "critical",
    dashboardUid: orrDashboardUid,
    piiSafe: true,
    liveScrapeEnabled: false,
    externalNetworkCalls: false,
    ...fields
  };
}

function orrNonCritical(id, dependency, label, metricName, metricType, unit, fields) {
  return {
    id,
    label,
    lane: tierToLane["non-critical"],
    tier: "non-critical",
    dependency,
    category: "orr",
    metricName,
    metricType,
    unit,
    labelKeys: ["dependency", "tier"],
    alertRouteRequired: true,
    alertSeverity: "warning",
    dashboardUid: orrDashboardUid,
    piiSafe: true,
    liveScrapeEnabled: false,
    externalNetworkCalls: false,
    ...fields
  };
}

function business(id, category, label, metricName, metricType, unit, labelKeys, fields) {
  return {
    id,
    label,
    lane: tierToLane.business,
    tier: "business",
    dependency: null,
    category,
    metricName,
    metricType,
    unit,
    labelKeys,
    alertRouteRequired: false,
    alertSeverity: "none",
    dashboardUid: businessDashboardUid,
    sloObjective: null,
    piiSafe: true,
    liveScrapeEnabled: false,
    externalNetworkCalls: false,
    ...fields
  };
}

export const metricsPlatformItems = [
  orrCritical(
    "orr-postgres-primary",
    "postgres",
    "Postgres primary availability",
    "customcard_dependency_up",
    "gauge",
    "ratio",
    {
      sloObjective: "availability >= 99.9% rolling 30d; read/write p95 < 150ms",
      currentEvidence: ["docker-compose.droplet.yml postgres service", "persistence-doctor durable tables"],
      requiredEvidence: ["Live Prometheus scrape sample", "Alertmanager critical-route delivery drill"],
      blocker: "Postgres up/latency series is wired in the committed config but no live scrape sample is attached."
    }
  ),
  orrCritical(
    "orr-redis-queue",
    "redis",
    "Redis queue availability",
    "customcard_dependency_up",
    "gauge",
    "ratio",
    {
      sloObjective: "availability >= 99.9% rolling 30d; queue oldest-job age < 300s",
      currentEvidence: ["docker-compose redis service", "worker queue-job contract"],
      requiredEvidence: ["Live Prometheus scrape sample", "Queue-age alert drill"],
      blocker: "Redis up/queue-age series is wired but no live scrape sample is attached."
    }
  ),
  orrCritical(
    "orr-object-store-artifacts",
    "object_store",
    "Artifact object store availability",
    "customcard_dependency_up",
    "gauge",
    "ratio",
    {
      sloObjective: "availability >= 99.9% rolling 30d; signed-url write success >= 99.5%",
      currentEvidence: ["artifact-store doctor", "R2/S3 IaC contract"],
      requiredEvidence: ["Live Prometheus scrape sample", "Object-store write-failure alert drill"],
      blocker: "Object-store availability series is wired but no live scrape sample is attached."
    }
  ),
  orrCritical(
    "orr-api-ingress",
    "api",
    "API ingress error ratio",
    "customcard_http_request_error_ratio",
    "gauge",
    "ratio",
    {
      sloObjective: "5xx error ratio < 0.5% rolling 1h; p95 latency < 800ms",
      currentEvidence: ["api-server route catalog", "/api/health probe contract"],
      requiredEvidence: ["Live Prometheus scrape sample", "Error-budget burn alert drill"],
      blocker: "API ingress error-ratio series is wired but no live scrape sample is attached."
    }
  ),
  orrCritical(
    "orr-auth-session-store",
    "auth_session_store",
    "Auth session store availability",
    "customcard_dependency_up",
    "gauge",
    "ratio",
    {
      sloObjective: "availability >= 99.9% rolling 30d; session lookup p95 < 100ms",
      currentEvidence: ["auth-session persistence contract", "runtime:doctor fail-closed posture"],
      requiredEvidence: ["Live Prometheus scrape sample", "Session-store outage alert drill"],
      blocker: "Auth session store availability series is wired but no live scrape sample is attached."
    }
  ),
  orrNonCritical(
    "orr-ai-text-provider",
    "ai_text",
    "AI text provider reachability",
    "customcard_dependency_up",
    "gauge",
    "ratio",
    {
      sloObjective: "reachability >= 99% rolling 30d; falls back to repo-local copy on outage",
      currentEvidence: ["AI provider readiness register", "provider failover ledger"],
      requiredEvidence: ["Live Prometheus scrape sample", "Fallback warn-route drill"],
      blocker: "AI text provider series is wired but no live scrape sample is attached."
    }
  ),
  orrNonCritical(
    "orr-ai-image-provider",
    "ai_image",
    "AI image provider reachability",
    "customcard_dependency_up",
    "gauge",
    "ratio",
    {
      sloObjective: "reachability >= 99% rolling 30d; degrades to manual art on outage",
      currentEvidence: ["AI provider readiness register", "provider failover ledger"],
      requiredEvidence: ["Live Prometheus scrape sample", "Fallback warn-route drill"],
      blocker: "AI image provider series is wired but no live scrape sample is attached."
    }
  ),
  orrNonCritical(
    "orr-notification-provider",
    "notification",
    "Notification provider reachability",
    "customcard_dependency_up",
    "gauge",
    "ratio",
    {
      sloObjective: "reachability >= 99% rolling 30d; queues for retry on outage",
      currentEvidence: ["business engagement notification contracts", "consent/suppression gate"],
      requiredEvidence: ["Live Prometheus scrape sample", "Notification backlog warn-route drill"],
      blocker: "Notification provider series is wired but no live scrape sample is attached."
    }
  ),
  orrNonCritical(
    "orr-payment-sandbox",
    "payment",
    "Payment sandbox reachability",
    "customcard_dependency_up",
    "gauge",
    "ratio",
    {
      sloObjective: "reachability >= 99% rolling 30d; checkout falls back to no-payment flow",
      currentEvidence: ["payment readiness register", "webhook signature contracts"],
      requiredEvidence: ["Live Prometheus scrape sample", "Payment-provider warn-route drill"],
      blocker: "Payment sandbox series is wired but no live scrape sample is attached."
    }
  ),
  orrNonCritical(
    "orr-observability-export",
    "observability_export",
    "Observability export reachability",
    "customcard_dependency_up",
    "gauge",
    "ratio",
    {
      sloObjective: "export success >= 99% rolling 30d; buffers locally on outage",
      currentEvidence: ["observability readiness provider contracts", "Grafana/OTLP/Sentry/PostHog adapters"],
      requiredEvidence: ["Live Prometheus scrape sample", "Export-failure warn-route drill"],
      blocker: "Observability export series is wired but no live scrape sample is attached."
    }
  ),
  orrNonCritical(
    "orr-crm-sync",
    "crm",
    "CRM sync reachability",
    "customcard_dependency_up",
    "gauge",
    "ratio",
    {
      sloObjective: "reachability >= 99% rolling 30d; lifecycle sync retries on outage",
      currentEvidence: ["business engagement CRM contracts", "provider failover ledger"],
      requiredEvidence: ["Live Prometheus scrape sample", "CRM sync warn-route drill"],
      blocker: "CRM sync series is wired but no live scrape sample is attached."
    }
  ),
  business(
    "seo-organic-impressions",
    "seo",
    "SEO organic impressions",
    "customcard_seo_organic_impressions_total",
    "counter",
    "count",
    ["search_engine", "landing_route", "country"],
    {
      currentEvidence: ["Search Console import contract", "PII-free landing-route taxonomy"],
      requiredEvidence: ["Live Search Console export sample", "Grafana SEO panel screenshot"],
      blocker: "Organic-impression series is charted but no live Search Console export is attached."
    }
  ),
  business(
    "seo-organic-clicks",
    "seo",
    "SEO organic clicks",
    "customcard_seo_organic_clicks_total",
    "counter",
    "count",
    ["search_engine", "landing_route", "country"],
    {
      currentEvidence: ["Search Console import contract", "PII-free landing-route taxonomy"],
      requiredEvidence: ["Live Search Console export sample", "Click-through-rate panel screenshot"],
      blocker: "Organic-click series is charted but no live Search Console export is attached."
    }
  ),
  business(
    "seo-average-position",
    "seo",
    "SEO average position",
    "customcard_seo_average_position",
    "gauge",
    "info",
    ["search_engine", "query_group"],
    {
      currentEvidence: ["Search Console import contract", "query-group aggregation (no raw queries stored)"],
      requiredEvidence: ["Live Search Console export sample", "Ranking-trend panel screenshot"],
      blocker: "Average-position series is charted but no live Search Console export is attached."
    }
  ),
  business(
    "acquisition-signups",
    "acquisition",
    "Customer acquisition signups",
    "customcard_acquisition_signups_total",
    "counter",
    "count",
    ["channel", "utm_source", "plan"],
    {
      currentEvidence: ["account-auth signup contract", "consented UTM attribution taxonomy"],
      requiredEvidence: ["Live signup event sample", "Acquisition funnel panel screenshot"],
      blocker: "Signup series is charted but no live signup events have been scraped."
    }
  ),
  business(
    "acquisition-activation-ratio",
    "acquisition",
    "Acquisition activation ratio",
    "customcard_acquisition_activation_ratio",
    "gauge",
    "ratio",
    ["channel", "cohort_week"],
    {
      currentEvidence: ["first-card activation milestone contract", "cohort-week bucketing"],
      requiredEvidence: ["Live activation cohort sample", "Activation-ratio panel screenshot"],
      blocker: "Activation-ratio series is charted but no live activation cohort is attached."
    }
  ),
  business(
    "acquisition-conversion-funnel",
    "acquisition",
    "Acquisition conversion funnel",
    "customcard_acquisition_funnel_step_total",
    "counter",
    "count",
    ["funnel_step", "channel"],
    {
      currentEvidence: ["visit→signup→first-card→order funnel contract", "channel taxonomy"],
      requiredEvidence: ["Live funnel-step event sample", "Funnel conversion panel screenshot"],
      blocker: "Conversion-funnel series is charted but no live funnel events have been scraped."
    }
  ),
  business(
    "demographics-region-sessions",
    "demographics",
    "Demographics by region",
    "customcard_demographics_region_sessions_total",
    "counter",
    "count",
    ["country", "region", "metro_class"],
    {
      currentEvidence: ["coarse geo bucketing (no lat/long, no IP stored)", "region taxonomy"],
      requiredEvidence: ["Live geo-aggregated session sample", "Region heatmap panel screenshot"],
      blocker: "Region demographics series is charted but no live aggregated geo sample is attached."
    }
  ),
  business(
    "demographics-locale-device",
    "demographics",
    "Demographics by locale and device",
    "customcard_demographics_locale_device_sessions_total",
    "counter",
    "count",
    ["locale", "device_type", "platform"],
    {
      currentEvidence: ["localization locale catalog", "device-class taxonomy (no device ids)"],
      requiredEvidence: ["Live locale/device aggregated sample", "Locale/device panel screenshot"],
      blocker: "Locale/device demographics series is charted but no live aggregated sample is attached."
    }
  ),
  business(
    "site-usage-pageviews",
    "site-usage",
    "Site usage pageviews",
    "customcard_site_pageviews_total",
    "counter",
    "count",
    ["route", "referrer_class"],
    {
      currentEvidence: ["route taxonomy", "referrer classed to direct/organic/social/referral"],
      requiredEvidence: ["Live pageview event sample", "Top-routes panel screenshot"],
      blocker: "Pageview series is charted but no live pageview events have been scraped."
    }
  ),
  business(
    "site-usage-active-sessions",
    "site-usage",
    "Site usage active sessions",
    "customcard_site_active_sessions",
    "gauge",
    "count",
    ["surface"],
    {
      currentEvidence: ["session lifecycle contract", "web/mobile surface split"],
      requiredEvidence: ["Live active-session gauge sample", "Concurrency panel screenshot"],
      blocker: "Active-session gauge is charted but no live session sample is attached."
    }
  ),
  business(
    "site-usage-card-generations",
    "site-usage",
    "Site usage card generations",
    "customcard_site_card_generations_total",
    "counter",
    "count",
    ["surface", "template_family"],
    {
      currentEvidence: ["card.generated telemetry event schema", "template-family taxonomy"],
      requiredEvidence: ["Live card-generation event sample", "Generation-volume panel screenshot"],
      blocker: "Card-generation series is charted but no live generation events have been scraped."
    }
  ),
  business(
    "site-usage-page-load",
    "site-usage",
    "Site usage page-load latency",
    "customcard_site_page_load_seconds",
    "histogram",
    "seconds",
    ["route", "device_type"],
    {
      currentEvidence: ["web-vitals capture contract", "route/device bucketing"],
      requiredEvidence: ["Live page-load histogram sample", "Web-vitals panel screenshot"],
      blocker: "Page-load histogram is charted but no live web-vitals sample has been scraped."
    }
  )
];

const metricsPlatformRegister = defineReadinessRegister({
  domainLabel: "metrics platform",
  items: metricsPlatformItems,
  requiredIds: requiredMetricIds,
  itemRules(item) {
    const issues = [];
    const prefix = `Metrics platform item ${item.id}`;

    if (!allowedTiers.has(item.tier)) issues.push(`${prefix} has unsupported tier.`);
    if (item.lane !== tierToLane[item.tier]) issues.push(`${prefix} lane must match its tier.`);
    if (!allowedMetricTypes.has(item.metricType)) issues.push(`${prefix} has unsupported metric type.`);
    if (!allowedUnits.has(item.unit)) issues.push(`${prefix} has unsupported unit.`);
    if (!allowedSeverities.has(item.alertSeverity)) issues.push(`${prefix} has unsupported alert severity.`);

    if (!metricNamePattern.test(item.metricName)) {
      issues.push(`${prefix} metric name must be snake_case and customcard_-prefixed.`);
    }
    if (item.metricType === "counter" && !item.metricName.endsWith("_total")) {
      issues.push(`${prefix} counter metric name must end with _total.`);
    }
    if (item.metricType === "histogram" && item.unit !== "seconds") {
      issues.push(`${prefix} histogram metric must measure seconds.`);
    }

    if (!Array.isArray(item.labelKeys) || item.labelKeys.length < 1) {
      issues.push(`${prefix} must declare at least one label key.`);
    } else {
      for (const key of item.labelKeys) {
        if (!labelKeyPattern.test(key)) issues.push(`${prefix} label key ${key} must be snake_case.`);
        if (forbiddenLabelKeys.has(key)) issues.push(`${prefix} label key ${key} risks PII and is not allowed.`);
      }
    }

    if (item.piiSafe !== true) issues.push(`${prefix} must keep piiSafe=true.`);
    if (item.liveScrapeEnabled !== false) issues.push(`${prefix} must keep liveScrapeEnabled=false.`);
    if (item.externalNetworkCalls !== false) issues.push(`${prefix} must not require live external network calls.`);

    const isOrr = item.tier === "critical" || item.tier === "non-critical";
    if (isOrr) {
      if (item.alertRouteRequired !== true) issues.push(`${prefix} ORR dependency must require an alert route.`);
      if (!item.sloObjective || item.sloObjective.length < 10) {
        issues.push(`${prefix} ORR dependency must declare an SLO objective.`);
      }
      if (item.tier === "critical" && item.alertSeverity !== "critical") {
        issues.push(`${prefix} critical dependency must use critical alert severity.`);
      }
      if (item.tier === "non-critical" && item.alertSeverity !== "warning") {
        issues.push(`${prefix} non-critical dependency must use warning alert severity.`);
      }
      if (item.dashboardUid !== orrDashboardUid) issues.push(`${prefix} ORR dependency must chart on the ORR dashboard.`);
      if (!item.dependency) issues.push(`${prefix} ORR dependency must name its dependency.`);
    } else {
      if (item.alertRouteRequired !== false) issues.push(`${prefix} business metric must not require an alert route.`);
      if (item.alertSeverity !== "none") issues.push(`${prefix} business metric must use alert severity none.`);
      if (item.dashboardUid !== businessDashboardUid) issues.push(`${prefix} business metric must chart on the business dashboard.`);
      if (!requiredBusinessCategories.includes(item.category)) {
        issues.push(`${prefix} business metric must use a known business category.`);
      }
    }

    if (item.currentEvidence.length < 1) issues.push(`${prefix} must list current repo-local evidence.`);
    if (item.requiredEvidence.length < 2) issues.push(`${prefix} must list at least two required evidence items.`);
    if (!item.blocker) issues.push(`${prefix} must explain its blocker.`);

    return issues;
  },
  crossRules(itemsById, items) {
    const issues = [];

    const dependenciesFor = (tier) =>
      items.filter((item) => item.tier === tier).map((item) => item.dependency);
    const critical = dependenciesFor("critical");
    const nonCritical = dependenciesFor("non-critical");

    for (const dependency of requiredCriticalDependencies) {
      if (!critical.includes(dependency)) issues.push(`Metrics platform must track critical dependency: ${dependency}.`);
    }
    for (const dependency of requiredNonCriticalDependencies) {
      if (!nonCritical.includes(dependency)) issues.push(`Metrics platform must track non-critical dependency: ${dependency}.`);
    }
    const categories = new Set(items.filter((item) => item.tier === "business").map((item) => item.category));
    for (const category of requiredBusinessCategories) {
      if (!categories.has(category)) issues.push(`Metrics platform must cover business category: ${category}.`);
    }

    // A (metricName, dependency|category) tuple must be unique so each series is
    // distinguishable in Prometheus.
    const signatures = new Set();
    for (const item of items) {
      const signature = `${item.metricName}::${item.dependency ?? item.category}`;
      if (signatures.has(signature)) issues.push(`Metrics platform has a duplicate series signature: ${signature}.`);
      signatures.add(signature);
    }

    return issues;
  },
  summarize(items) {
    const counters = items.filter((item) => item.metricType === "counter").length;
    const gauges = items.filter((item) => item.metricType === "gauge").length;
    const histograms = items.filter((item) => item.metricType === "histogram").length;
    const business = items.filter((item) => item.tier === "business");
    return {
      critical: items.filter((item) => item.tier === "critical").length,
      nonCritical: items.filter((item) => item.tier === "non-critical").length,
      business: business.length,
      seoMetrics: business.filter((item) => item.category === "seo").length,
      acquisitionMetrics: business.filter((item) => item.category === "acquisition").length,
      demographicsMetrics: business.filter((item) => item.category === "demographics").length,
      siteUsageMetrics: business.filter((item) => item.category === "site-usage").length,
      counters,
      gauges,
      histograms,
      alertRoutesRequired: items.filter((item) => item.alertRouteRequired).length,
      criticalAlerts: items.filter((item) => item.alertSeverity === "critical").length,
      warningAlerts: items.filter((item) => item.alertSeverity === "warning").length,
      piiSafe: items.filter((item) => item.piiSafe).length,
      dashboards: new Set(items.map((item) => item.dashboardUid)).size,
      metricNames: Array.from(new Set(items.map((item) => item.metricName))).sort(),
      liveScrapeEnabled: items.filter((item) => item.liveScrapeEnabled).length,
      externalNetworkCalls: items.filter((item) => item.externalNetworkCalls).length,
      requiredEvidence: Array.from(new Set(items.flatMap((item) => item.requiredEvidence))).sort()
    };
  }
});

export function summarizeMetricsPlatform(items = metricsPlatformItems) {
  return metricsPlatformRegister.summarize(items);
}

export function validateMetricsPlatform(items = metricsPlatformItems) {
  return metricsPlatformRegister.validate(items);
}

/**
 * Render the register to Prometheus text exposition format. This is the
 * executable, no-network proof that the catalog produces a well-formed
 * `/metrics` body whose series names match the scrape config, alert rules, and
 * dashboards. Sample values are placeholders (0); the real values arrive when a
 * live Prometheus scrapes the running app.
 */
export function renderMetricsExpositionContract(items = metricsPlatformItems) {
  const byName = new Map();
  for (const item of items) {
    if (!byName.has(item.metricName)) byName.set(item.metricName, []);
    byName.get(item.metricName).push(item);
  }

  const lines = [];
  for (const [metricName, group] of byName) {
    const first = group[0];
    lines.push(`# HELP ${metricName} ${first.label} (${first.tier}).`);
    lines.push(`# TYPE ${metricName} ${first.metricType}`);
    for (const item of group) {
      const labels = item.labelKeys.map((key) => `${key}="${exampleLabelValue(item, key)}"`).join(",");
      if (item.metricType === "histogram") {
        lines.push(`${metricName}_bucket{${labels},le="+Inf"} 0`);
        lines.push(`${metricName}_sum{${labels}} 0`);
        lines.push(`${metricName}_count{${labels}} 0`);
      } else {
        lines.push(`${metricName}{${labels}} 0`);
      }
    }
  }
  return `${lines.join("\n")}\n`;
}

function exampleLabelValue(item, key) {
  if (key === "dependency") return item.dependency ?? "unknown";
  if (key === "tier") return item.tier;
  return "example";
}

export const metricsPlatformContract = Object.freeze({
  requiredMetricIds,
  requiredCriticalDependencies,
  requiredNonCriticalDependencies,
  requiredBusinessCategories,
  orrDashboardUid,
  businessDashboardUid,
  forbiddenLabelKeys: Array.from(forbiddenLabelKeys)
});
