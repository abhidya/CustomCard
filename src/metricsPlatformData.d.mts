export type MetricsTier = "critical" | "non-critical" | "business";
export type MetricsLane = "critical-dependency" | "non-critical-dependency" | "business";
export type MetricsType = "counter" | "gauge" | "histogram";
export type MetricsUnit = "ratio" | "seconds" | "bytes" | "count" | "info";
export type MetricsAlertSeverity = "critical" | "warning" | "none";
export type MetricsBusinessCategory = "seo" | "acquisition" | "demographics" | "site-usage" | "orr";

export interface MetricsPlatformItem {
  id: string;
  label: string;
  lane: MetricsLane;
  tier: MetricsTier;
  dependency: string | null;
  category: MetricsBusinessCategory;
  metricName: string;
  metricType: MetricsType;
  unit: MetricsUnit;
  labelKeys: string[];
  alertRouteRequired: boolean;
  alertSeverity: MetricsAlertSeverity;
  dashboardUid: string;
  sloObjective: string | null;
  piiSafe: true;
  liveScrapeEnabled: false;
  externalNetworkCalls: false;
  currentEvidence: string[];
  requiredEvidence: string[];
  blocker: string;
}

export interface MetricsPlatformSummary {
  total: number;
  critical: number;
  nonCritical: number;
  business: number;
  seoMetrics: number;
  acquisitionMetrics: number;
  demographicsMetrics: number;
  siteUsageMetrics: number;
  counters: number;
  gauges: number;
  histograms: number;
  alertRoutesRequired: number;
  criticalAlerts: number;
  warningAlerts: number;
  piiSafe: number;
  dashboards: number;
  metricNames: string[];
  liveScrapeEnabled: number;
  externalNetworkCalls: number;
  requiredEvidence: string[];
  registerIssues: string[];
  blockers: string[];
}

export interface MetricsPlatformContract {
  requiredMetricIds: string[];
  requiredCriticalDependencies: string[];
  requiredNonCriticalDependencies: string[];
  requiredBusinessCategories: string[];
  orrDashboardUid: string;
  businessDashboardUid: string;
  forbiddenLabelKeys: string[];
}

export const metricsPlatformItems: MetricsPlatformItem[];
export const metricsPlatformContract: MetricsPlatformContract;
export function summarizeMetricsPlatform(items?: MetricsPlatformItem[]): MetricsPlatformSummary;
export function validateMetricsPlatform(items?: MetricsPlatformItem[]): string[];
export function renderMetricsExpositionContract(items?: MetricsPlatformItem[]): string;
