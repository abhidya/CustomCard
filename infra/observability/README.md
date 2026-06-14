# CustomCard Metrics Platform (Prometheus + Grafana)

Self-hosted observability stack for ORR (operational readiness review)
dependency metrics and business metrics. The executable catalog lives in
`src/metricsPlatform.ts`; this directory is the deployable infrastructure that
scrapes, alerts on, and charts those series. Validate the whole contract with
`npm run metrics:doctor`.

## Layout

- `docker-compose.observability.yml` — Prometheus, Alertmanager,
  blackbox-exporter, and Grafana.
- `prometheus/prometheus.yml` — scrape config (app `/metrics`, blackbox probes
  for critical and non-critical dependencies) and rule-file wiring.
- `prometheus/rules/orr-dependencies.rules.yml` — recording + alerting rules for
  critical (page) and non-critical (warn) dependencies.
- `prometheus/rules/business-metrics.rules.yml` — recording rules for SEO,
  acquisition, demographics, and site-usage metrics.
- `blackbox/blackbox.yml` — `http_2xx` and `tcp_connect` probe modules.
- `alertmanager/alertmanager.yml` — critical→pager, warning→ops-chat routing.
- `grafana/provisioning/` — Prometheus datasource + dashboard provider.
- `grafana/dashboards/` — `customcard-orr-dependencies` and
  `customcard-business-metrics` dashboards.

## Run it

Bring the stack up alongside the app so Prometheus can resolve the `app`,
`worker`, `postgres`, and `redis` service names:

```sh
docker compose \
  -f infra/docker-compose.droplet.yml \
  -f infra/observability/docker-compose.observability.yml up -d
```

Required environment (set in your deployment `.env`, never committed):

- `GRAFANA_ADMIN_USER`, `GRAFANA_ADMIN_PASSWORD` — Grafana admin login.
- `PROMETHEUS_RETENTION` — TSDB retention window (default `30d`).
- `ALERTMANAGER_PAGER_ROUTING_KEY` — PagerDuty routing key for critical alerts.
- `ALERTMANAGER_SLACK_WEBHOOK_URL` — Slack webhook for warning alerts.

Grafana, Prometheus, and Alertmanager are only `expose`d on the internal Docker
network; publish them behind the Caddy reverse proxy or an SSO tunnel rather
than binding host ports directly.

## Application wiring

The app and worker must serve a Prometheus exposition at `/metrics`. The series
names, types, and PII-safe label keys are defined in
`src/metricsPlatformData.mjs`; `renderMetricsExpositionContract()` shows the
exact exposition shape the scrape config, alert rules, and dashboards expect.
Wiring the live `/metrics` handler and attaching a real scrape sample is the
remaining production-evidence step tracked by the metrics platform register.

This stack scrapes in-cluster targets only. Exporting to Grafana Cloud / OTLP /
Datadog remains a separate, evidence-gated step tracked by the observability
readiness register (`src/observabilityReadiness.ts`).
