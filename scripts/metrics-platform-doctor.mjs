import {
  metricsPlatformContract,
  metricsPlatformItems,
  renderMetricsExpositionContract,
  summarizeMetricsPlatform,
  validateMetricsPlatform
} from "../src/metricsPlatformData.mjs";
import {
  checkArrayIncludes,
  checkExact,
  checkIncludes,
  checkItemsHaveKeys,
  checkMinimum,
  checkNoBlockers,
  runDoctorReport
} from "./doctor-harness.mjs";
import {
  checkDoctorDocs,
  checkDoctorScriptedAndGated,
  checkDoctorSourceSignals,
  defineDoctorManifest,
  readDoctorManifestFiles
} from "./doctor-manifest.mjs";

const doctorManifest = defineDoctorManifest({
  id: "metrics-platform",
  service: "customcard-metrics-platform-doctor",
  npmScript: "metrics:doctor",
  scriptPath: "scripts/metrics-platform-doctor.mjs",
  workflowLabel: "Validate metrics platform readiness",
  docsTitle: "Metrics platform readiness",
  readinessModule: "src/metricsPlatform.ts",
  files: {
    metricsTest: "src/metricsPlatform.test.ts",
    compose: "infra/observability/docker-compose.observability.yml",
    prometheus: "infra/observability/prometheus/prometheus.yml",
    orrRules: "infra/observability/prometheus/rules/orr-dependencies.rules.yml",
    businessRules: "infra/observability/prometheus/rules/business-metrics.rules.yml",
    blackbox: "infra/observability/blackbox/blackbox.yml",
    alertmanager: "infra/observability/alertmanager/alertmanager.yml",
    grafanaDatasource: "infra/observability/grafana/provisioning/datasources/prometheus.yml",
    grafanaDashboardsProvider: "infra/observability/grafana/provisioning/dashboards/dashboards.yml",
    orrDashboard: "infra/observability/grafana/dashboards/orr-dependencies.json",
    businessDashboard: "infra/observability/grafana/dashboards/business-metrics.json",
    infraReadme: "infra/observability/README.md",
    docs: "docs/metrics-platform.md"
  },
  docsKeys: ["docs"]
});

const contents = readDoctorManifestFiles(doctorManifest);

const summary = summarizeMetricsPlatform(metricsPlatformItems);
const validationBlockers = validateMetricsPlatform(metricsPlatformItems);
const itemIds = metricsPlatformItems.map((item) => item.id);
const exposition = renderMetricsExpositionContract(metricsPlatformItems);

const orrMetricNames = Array.from(
  new Set(metricsPlatformItems.filter((item) => item.tier !== "business").map((item) => item.metricName))
);
const businessMetricNames = Array.from(
  new Set(metricsPlatformItems.filter((item) => item.tier === "business").map((item) => item.metricName))
);

const orrRulesContent = contents.orrRules;
const businessRulesContent = contents.businessRules;
const orrDashboardContent = contents.orrDashboard;
const businessDashboardContent = contents.businessDashboard;

const missingExpositionNames = summary.metricNames.filter((name) => !exposition.includes(name));
const missingOrrRuleNames = orrMetricNames.filter((name) => !orrRulesContent.includes(name));
const missingBusinessRuleNames = businessMetricNames.filter((name) => !businessRulesContent.includes(name));
const missingOrrDashboardNames = orrMetricNames.filter((name) => !orrDashboardContent.includes(name));
const missingBusinessDashboardNames = businessMetricNames.filter((name) => !businessDashboardContent.includes(name));
const leakedPiiLabels = metricsPlatformContract.forbiddenLabelKeys.filter((key) => exposition.includes(`${key}="`));

const checks = [
  checkExact("register", "item-count", summary.total, 23),
  checkExact("register", "critical-count", summary.critical, 5),
  checkExact("register", "non-critical-count", summary.nonCritical, 6),
  checkExact("register", "business-count", summary.business, 12),
  checkExact("register", "seo-count", summary.seoMetrics, 3),
  checkExact("register", "acquisition-count", summary.acquisitionMetrics, 3),
  checkExact("register", "demographics-count", summary.demographicsMetrics, 2),
  checkExact("register", "site-usage-count", summary.siteUsageMetrics, 4),
  checkExact("register", "all-pii-safe", summary.piiSafe, summary.total),
  checkExact("register", "dashboard-count", summary.dashboards, 2),
  checkExact("register", "alert-routes-required", summary.alertRoutesRequired, 11),
  checkExact("safety", "no-live-scrape", summary.liveScrapeEnabled, 0),
  checkExact("safety", "no-external-network", summary.externalNetworkCalls, 0),
  checkNoBlockers("register", "executable-summary-and-validation", validationBlockers),
  checkArrayIncludes("register", "required-metric-ids", itemIds, metricsPlatformContract.requiredMetricIds),
  checkItemsHaveKeys("register", "metric-item-shape", metricsPlatformItems, [
    "id",
    "label",
    "lane",
    "tier",
    "dependency",
    "category",
    "metricName",
    "metricType",
    "unit",
    "labelKeys",
    "alertRouteRequired",
    "alertSeverity",
    "dashboardUid",
    "sloObjective",
    "piiSafe",
    "liveScrapeEnabled",
    "externalNetworkCalls",
    "currentEvidence",
    "requiredEvidence",
    "blocker"
  ], {
    readyDetail: `Validated ${metricsPlatformItems.length} executable metric item shapes.`,
    missingPrefix: "Missing metric fields"
  }),
  checkNoBlockers(
    "exposition",
    "exposition-covers-every-series",
    missingExpositionNames.map((name) => `Exposition is missing series ${name}.`),
    "Prometheus exposition renders every catalog series."
  ),
  checkNoBlockers(
    "exposition",
    "exposition-pii-safe",
    leakedPiiLabels.map((key) => `Exposition leaks forbidden label key ${key}.`),
    "Prometheus exposition exposes no forbidden PII label keys."
  ),
  checkIncludes("exposition", "exposition-type-lines", exposition, [
    "# TYPE customcard_dependency_up gauge",
    "# TYPE customcard_http_request_error_ratio gauge",
    "# TYPE customcard_site_page_load_seconds histogram"
  ]),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "infra",
    id: "observability-compose-stack",
    sourceKeys: ["compose"],
    signals: [
      "prom/prometheus",
      "prom/alertmanager",
      "prom/blackbox-exporter",
      "grafana/grafana",
      "CustomCard metrics platform"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "infra",
    id: "prometheus-scrape-and-rules",
    sourceKeys: ["prometheus"],
    signals: [
      "scrape_configs",
      "rule_files",
      "/etc/prometheus/rules/orr-dependencies.rules.yml",
      "/etc/prometheus/rules/business-metrics.rules.yml",
      "job_name: customcard-app",
      "metrics_path: /metrics",
      "alertmanager:9093"
    ]
  }),
  checkNoBlockers(
    "infra",
    "orr-rules-reference-series",
    missingOrrRuleNames.map((name) => `ORR alert rules do not reference ${name}.`),
    "ORR alert rules reference every ORR dependency series."
  ),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "infra",
    id: "orr-alert-severities",
    sourceKeys: ["orrRules"],
    signals: [
      "ORRCriticalDependencyDown",
      "ORRApiIngressErrorBudgetBurn",
      "ORRNonCriticalDependencyDown",
      "severity: critical",
      "severity: warning"
    ]
  }),
  checkNoBlockers(
    "infra",
    "business-rules-reference-series",
    missingBusinessRuleNames.map((name) => `Business recording rules do not reference ${name}.`),
    "Business recording rules reference every business series."
  ),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "infra",
    id: "blackbox-modules",
    sourceKeys: ["blackbox"],
    signals: ["http_2xx", "tcp_connect"]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "infra",
    id: "alertmanager-routing",
    sourceKeys: ["alertmanager"],
    signals: ["receiver: ops-chat", "name: pager", "severity = \"critical\"", "severity = \"warning\""]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "infra",
    id: "grafana-provisioning",
    sourceKeys: ["grafanaDatasource", "grafanaDashboardsProvider"],
    signals: ["uid: customcard-prometheus", "type: prometheus", "path: /var/lib/grafana/dashboards"]
  }),
  checkNoBlockers(
    "infra",
    "orr-dashboard-references-series",
    [
      ...missingOrrDashboardNames.map((name) => `ORR dashboard does not reference ${name}.`),
      ...(orrDashboardContent.includes(`"uid": "${metricsPlatformContract.orrDashboardUid}"`)
        ? []
        : [`ORR dashboard is missing uid ${metricsPlatformContract.orrDashboardUid}.`])
    ],
    "ORR dashboard charts every ORR dependency series."
  ),
  checkNoBlockers(
    "infra",
    "business-dashboard-references-series",
    [
      ...missingBusinessDashboardNames.map((name) => `Business dashboard does not reference ${name}.`),
      ...(businessDashboardContent.includes(`"uid": "${metricsPlatformContract.businessDashboardUid}"`)
        ? []
        : [`Business dashboard is missing uid ${metricsPlatformContract.businessDashboardUid}.`])
    ],
    "Business dashboard charts every business series."
  ),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "tests",
    id: "metrics-platform-tests",
    sourceKeys: ["metricsTest"],
    signals: [
      "tracks ORR critical/non-critical dependencies and business metrics without live scrape claims",
      "renders a well-formed Prometheus exposition whose series match the catalog",
      "flags unsafe metric claims before they reach the doctor or dashboards"
    ]
  }),
  checkDoctorDocs(doctorManifest, contents, ["self-hosted Prometheus", "not live telemetry ingestion"], {
    id: "metrics-platform-docs"
  }),
  checkMinimum("docs", "infra-readme-present", contents.infraReadme.length, 200),
  checkDoctorScriptedAndGated(doctorManifest, contents, { id: "metrics-platform-doctor-scripted-and-gated" }),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "Live Prometheus scrape sample",
    "Alertmanager critical-route delivery drill",
    "Grafana SEO panel screenshot"
  ])
];

runDoctorReport(
  {
    service: doctorManifest.service,
    items: summary.total,
    critical: summary.critical,
    nonCritical: summary.nonCritical,
    business: summary.business,
    dashboards: summary.dashboards,
    alertRoutesRequired: summary.alertRoutesRequired,
    liveScrapeEnabled: summary.liveScrapeEnabled,
    externalNetworkCalls: summary.externalNetworkCalls
  },
  checks
);
