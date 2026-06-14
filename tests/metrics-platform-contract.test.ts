import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const shellDoctorTimeoutMs = 15_000;

describe("metrics platform contract", () => {
  it("emits a metrics platform readiness report", () => {
    const output = execFileSync("npm", ["run", "metrics:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      items: number;
      critical: number;
      nonCritical: number;
      business: number;
      dashboards: number;
      alertRoutesRequired: number;
      liveScrapeEnabled: number;
      externalNetworkCalls: number;
      lanes: Array<{ lane: string; status: string }>;
      registerIssues: unknown[];
    };

    expect(report).toMatchObject({
      service: "customcard-metrics-platform-doctor",
      status: "repo-consistent",
      items: 23,
      critical: 5,
      nonCritical: 6,
      business: 12,
      dashboards: 2,
      alertRoutesRequired: 11,
      liveScrapeEnabled: 0,
      externalNetworkCalls: 0,
      registerIssues: []
    });
    expect(report.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "register", status: "repo-consistent" }),
        expect.objectContaining({ lane: "exposition", status: "repo-consistent" }),
        expect.objectContaining({ lane: "infra", status: "repo-consistent" }),
        expect.objectContaining({ lane: "tests", status: "repo-consistent" }),
        expect.objectContaining({ lane: "docs", status: "repo-consistent" }),
        expect.objectContaining({ lane: "ci", status: "repo-consistent" }),
        expect.objectContaining({ lane: "safety", status: "repo-consistent" })
      ])
    );
  }, shellDoctorTimeoutMs);

  it("ships the deployable Prometheus and Grafana metrics platform", () => {
    const compose = read("infra/observability/docker-compose.observability.yml");
    const prometheus = read("infra/observability/prometheus/prometheus.yml");
    const orrRules = read("infra/observability/prometheus/rules/orr-dependencies.rules.yml");
    const businessRules = read("infra/observability/prometheus/rules/business-metrics.rules.yml");
    const alertmanager = read("infra/observability/alertmanager/alertmanager.yml");
    const orrDashboard = read("infra/observability/grafana/dashboards/orr-dependencies.json");
    const businessDashboard = read("infra/observability/grafana/dashboards/business-metrics.json");
    const infraReadme = read("infra/observability/README.md");

    for (const image of ["prom/prometheus", "prom/alertmanager", "prom/blackbox-exporter", "grafana/grafana"]) {
      expect(compose).toContain(image);
    }
    expect(prometheus).toContain("job_name: customcard-app");
    expect(prometheus).toContain("metrics_path: /metrics");
    expect(prometheus).toContain("orr-dependencies.rules.yml");
    expect(prometheus).toContain("business-metrics.rules.yml");
    expect(orrRules).toContain("customcard_dependency_up");
    expect(orrRules).toContain("customcard_http_request_error_ratio");
    expect(orrRules).toContain("severity: critical");
    expect(orrRules).toContain("severity: warning");
    expect(businessRules).toContain("customcard_seo_organic_clicks_total");
    expect(businessRules).toContain("customcard_acquisition_signups_total");
    expect(businessRules).toContain("customcard_demographics_region_sessions_total");
    expect(businessRules).toContain("customcard_site_page_load_seconds_bucket");
    expect(alertmanager).toContain("name: pager");
    expect(alertmanager).toContain("receiver: ops-chat");
    expect(orrDashboard).toContain('"uid": "customcard-orr-dependencies"');
    expect(businessDashboard).toContain('"uid": "customcard-business-metrics"');
    expect(infraReadme).toContain("GRAFANA_ADMIN_PASSWORD");
    expect(infraReadme).toContain("ALERTMANAGER_PAGER_ROUTING_KEY");
  });

  it("wires the metrics doctor into npm scripts, CI, and coverage instrumentation", () => {
    const packageJson = read("package.json");
    const workflow = read(".github/workflows/verify.yml");
    const viteConfig = read("vite.config.ts");

    expect(packageJson).toContain('"metrics:doctor": "node scripts/metrics-platform-doctor.mjs"');
    expect(workflow).toContain("Validate metrics platform readiness");
    expect(workflow).toContain("npm run metrics:doctor");
    expect(viteConfig).toContain("src/metricsPlatform.ts");
    expect(viteConfig).toContain("src/metricsPlatformData.mjs");
  });
});
